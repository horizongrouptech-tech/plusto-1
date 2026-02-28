import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin' && user.user_type !== 'financial_manager') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, user_type')
      .in('user_type', ['financial_manager'])
      .neq('is_active', false);
    if (error) throw new Error(error.message);

    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, user_type')
      .eq('role', 'admin');

    return res.status(200).json({ users: [...(data || []), ...(admins || [])] });
  } catch (e) {
    console.error('[getAssignableUsers]', e);
    return res.status(500).json({ error: e.message });
  }
}
