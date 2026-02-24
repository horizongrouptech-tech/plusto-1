import { requireAuth, supabaseAdmin } from './_helpers.js';

async function syncToFireberry(customerData) {
  const createUrl = process.env.FIREBERRY_CREATE_ACCOUNT_URL || process.env.FIREBERRY_WEBHOOK_URL;
  if (!createUrl) return null;
  try {
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_account',
        name: customerData.business_name || customerData.full_name,
        email: customerData.email,
        phone: customerData.phone,
        city: customerData.business_city,
        plasto_id: customerData.id,
      }),
    });
    if (response.ok) {
      const result = await response.json();
      return result.accountid;
    }
  } catch (error) {
    console.error('Error syncing to Fireberry:', error);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  const isAdmin = currentUser.role === 'admin';
  const isFinancialManager = currentUser.role === 'user' && currentUser.user_type === 'financial_manager';
  if (!isAdmin && !isFinancialManager) {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin or Financial Manager access required' });
  }

  let onboardingRequest = null;
  try {
    const { onboardingRequest: rawRequest } = req.body ?? {};
    if (!rawRequest?.id) {
      return res.status(400).json({ success: false, error: 'onboardingRequest ID is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('onboarding_request')
      .select('*')
      .eq('id', rawRequest.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'OnboardingRequest not found.' });
    }
    onboardingRequest = data;

    if (onboardingRequest.status === 'approved') {
      return res.status(200).json({ success: true, message: 'Onboarding request already approved.' });
    }

    // Create CustomerContact record
    await supabaseAdmin.from('customer_contact').insert({
      customer_email: onboardingRequest.email,
      phone: onboardingRequest.phone || '',
      full_name: onboardingRequest.full_name || '',
      business_name: onboardingRequest.business_name || '',
    }).catch((e) => console.error('Failed to create CustomerContact:', e.message));

    // Sync to Fireberry if missing ID
    if (!onboardingRequest.fireberry_account_id) {
      const newFireberryId = await syncToFireberry(onboardingRequest);
      if (newFireberryId) {
        await supabaseAdmin
          .from('onboarding_request')
          .update({ fireberry_account_id: newFireberryId })
          .eq('id', onboardingRequest.id);
      }
    }

    // Approve
    await supabaseAdmin.from('onboarding_request').update({
      status: 'approved',
      onboarding_status: 'running',
    }).eq('id', onboardingRequest.id);

    // Trigger auto-onboarding orchestrator in background (fire-and-forget)
    const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    fetch(`${siteUrl}/api/autoOnboardingOrchestrator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        onboarding_request_id: onboardingRequest.id,
        customer_email: onboardingRequest.email,
      }),
    }).catch((err) =>
      console.error('Failed to trigger autoOnboardingOrchestrator:', err.message),
    );

    return res.status(200).json({
      success: true,
      message: 'Customer approved and onboarding process initiated successfully',
    });
  } catch (error) {
    console.error('[approveOnboardingRequest]', error);

    if (onboardingRequest?.id) {
      await supabaseAdmin.from('onboarding_request').update({
        status: 'pending',
        onboarding_status: 'failed',
        admin_notes: (onboardingRequest.admin_notes || '') + `\nApproval failed: ${error.message}`,
      }).eq('id', onboardingRequest.id).catch(() => {});
    }

    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
