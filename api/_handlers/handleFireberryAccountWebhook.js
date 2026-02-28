import { supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { accountid, name, email, phone, city, customer_manager } = req.body ?? {};
    if (!accountid) return res.status(400).json({ error: 'accountid required' });

    // Find manager by Fireberry user ID
    let managerEmail = null;
    if (customer_manager) {
      const { data: managers } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('fireberry_user_id', customer_manager);
      managerEmail = managers?.[0]?.email;
    }

    // Check if existing
    const { data: existing } = await supabaseAdmin
      .from('onboarding_request')
      .select('id')
      .eq('fireberry_account_id', accountid)
      .single();

    const payload = {
      business_name: name,
      email,
      phone,
      city,
      fireberry_account_id: accountid,
      status: 'approved',
      onboarding_status: 'idle',
      is_active: true,
      is_approved_by_admin: true,
    };
    if (managerEmail) payload.assigned_financial_manager_email = managerEmail;

    if (existing) {
      await supabaseAdmin.from('onboarding_request').update(payload).eq('id', existing.id);
    } else {
      payload.created_date = new Date().toISOString();
      await supabaseAdmin.from('onboarding_request').insert(payload);
    }

    return res.status(200).json({ success: true, action: existing ? 'updated' : 'created' });
  } catch (e) {
    console.error('[handleFireberryAccountWebhook]', e);
    return res.status(500).json({ error: e.message });
  }
}
