import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const { query = 'אורו' } = req.body ?? {};
    const q = query.toLowerCase();

    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, business_name, role, user_type');

    const matchedUsers = (users || []).filter(u =>
      (u.business_name || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );

    return res.status(200).json({ users: matchedUsers, count: matchedUsers.length });
  } catch (e) {
    console.error('[deepSearchOro]', e);
    return res.status(500).json({ error: e.message });
  }
}
