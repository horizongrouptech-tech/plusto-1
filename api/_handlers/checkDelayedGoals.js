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
    const { data: overdueGoals, error } = await supabaseAdmin
      .from('customer_goal')
      .select('id, customer_email, title, assigned_to_email')
      .in('status', ['open', 'in_progress'])
      .lt('end_date', now)
      .not('task_type', 'eq', 'daily_checklist');

    if (error) throw new Error(error.message);

    let updated = 0;
    for (const goal of (overdueGoals || [])) {
      await supabaseAdmin.from('customer_goal').update({ status: 'delayed' }).eq('id', goal.id);

      if (goal.assigned_to_email) {
        await supabaseAdmin.from('notification').insert({
          recipient_email: goal.assigned_to_email,
          title: 'יעד באיחור',
          message: `היעד "${goal.title}" עבר את תאריך היעד`,
          type: 'goal_delayed',
          related_id: goal.id,
          created_date: now,
          is_read: false,
        });
      }
      updated++;
    }

    return res.status(200).json({ updated });
  } catch (e) {
    console.error('[checkDelayedGoals]', e);
    return res.status(500).json({ error: e.message });
  }
}
