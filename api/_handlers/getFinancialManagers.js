import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const isAdmin = user.role === 'admin';
  const isDeptManager = user.department_manager_role === 'department_manager';
  if (!isAdmin && !isDeptManager) return res.status(403).json({ error: 'Forbidden' });

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_type', 'financial_manager')
      .neq('is_active', false);

    if (error) throw new Error(error.message);
    return res.status(200).json({ managers: data });
  } catch (error) {
    console.error('[getFinancialManagers]', error);
    return res.status(500).json({ error: error.message });
  }
}
