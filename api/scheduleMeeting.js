import { requireAuth, supabaseAdmin } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email, subject, start_date, start_time, end_date, end_time, channel, notes, manager_email, participants } = req.body ?? {};
    if (!customer_email || !subject || !start_date) {
      return res.status(400).json({ error: 'Missing required fields: customer_email, subject, start_date' });
    }

    const { data: meeting, error } = await supabaseAdmin.from('meeting').insert({
      customer_email,
      subject,
      start_date,
      start_time: start_time || '10:00',
      end_date: end_date || start_date,
      end_time: end_time || '11:00',
      channel: channel || 'zoom',
      notes: notes || '',
      manager_email: manager_email || user.email,
      participants: participants || [],
      status: 'scheduled',
      created_by: user.email,
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, meeting_id: meeting.id, message: 'פגישה נקבעה בהצלחה', meeting });
  } catch (error) {
    console.error('[scheduleMeeting]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
