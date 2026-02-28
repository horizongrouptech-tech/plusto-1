import { supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const token = req.headers['x-cron-secret'] || req.headers.authorization?.replace('Bearer ', '');
    if (token !== secret) return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const { data: tasks, error } = await supabaseAdmin
      .from('customer_goal')
      .select('id, title, due_date, due_time, assigned_to_email')
      .eq('status', 'open')
      .not('due_time', 'is', null)
      .lte('due_date', twoHoursLater);

    if (error) throw new Error(error.message);

    let sent = 0;
    const whatsappUrl = process.env.WHATSAPP_API_URL;
    if (!whatsappUrl) {
      return res.status(200).json({ sent: 0, note: 'WHATSAPP_API_URL not configured' });
    }

    for (const task of (tasks || [])) {
      if (!task.assigned_to_email) continue;

      const { data: user } = await supabaseAdmin
        .from('profiles')
        .select('phone')
        .eq('email', task.assigned_to_email)
        .single();

      if (!user?.phone) continue;

      await fetch(whatsappUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user.phone,
          message: `תזכורת: המשימה "${task.title}" מגיעה לתאריך יעד בעוד פחות משעתיים.`,
        }),
      });
      sent++;
    }

    return res.status(200).json({ sent });
  } catch (e) {
    console.error('[sendWhatsAppTaskReminder]', e);
    return res.status(500).json({ error: e.message });
  }
}
