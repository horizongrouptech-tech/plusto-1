import { supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const token = req.headers['x-cron-secret'] || req.headers.authorization?.replace('Bearer ', '');
    if (token !== secret) return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();
    const { data: overdueTasks, error } = await supabaseAdmin
      .from('customer_goal')
      .select('id')
      .in('status', ['open', 'in_progress'])
      .lt('due_date', now)
      .not('task_type', 'eq', 'goal');

    if (error) throw new Error(error.message);

    const ids = (overdueTasks || []).map(t => t.id);
    if (ids.length > 0) {
      await supabaseAdmin.from('customer_goal').update({ status: 'delayed' }).in('id', ids);
    }

    return res.status(200).json({ updated: ids.length });
  } catch (e) {
    console.error('[checkDelayedTasks]', e);
    return res.status(500).json({ error: e.message });
  }
}
