import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const {
      business_name, full_name, email, phone, business_type, city,
      assigned_financial_manager_email, customer_group, notes,
    } = req.body ?? {};

    if (!email) return res.status(400).json({ error: 'email required' });

    const { data: existing } = await supabaseAdmin
      .from('onboarding_request')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Customer with this email already exists', id: existing.id });
    }

    const record = {
      business_name: business_name || full_name,
      full_name,
      email,
      phone,
      business_type,
      city,
      assigned_financial_manager_email: assigned_financial_manager_email || user.email,
      customer_group,
      notes,
      status: 'approved',
      onboarding_status: 'idle',
      is_active: true,
      is_approved_by_admin: true,
      created_date: new Date().toISOString(),
    };

    const { data: created, error } = await supabaseAdmin
      .from('onboarding_request')
      .insert(record)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, record: created });
  } catch (e) {
    console.error('[onboardNewCustomer]', e);
    return res.status(500).json({ error: e.message });
  }
}
