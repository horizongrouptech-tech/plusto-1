import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const { customer_email } = req.body ?? {};

    let q = supabaseAdmin.from('customer_goal')
      .select('id, task_type, parent_id, end_date')
      .is('parent_id', null)
      .neq('task_type', 'goal')
      .not('task_type', 'in', '(daily_checklist,recurring)');
    if (customer_email) q = q.eq('customer_email', customer_email);

    const { data: goals, error } = await q;
    if (error) throw new Error(error.message);

    let updated = 0;
    for (let i = 0; i < (goals || []).length; i += 5) {
      const batch = goals.slice(i, i + 5);
      await Promise.all(batch.map(g =>
        supabaseAdmin.from('customer_goal').update({ task_type: 'goal' }).eq('id', g.id)
      ));
      updated += batch.length;
    }

    return res.status(200).json({ updated });
  } catch (e) {
    console.error('[fixGoalsTaskType]', e);
    return res.status(500).json({ error: e.message });
  }
}
