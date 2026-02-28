import { supabaseAdmin } from '../_helpers.js';

const STATUS_MAP = { 1: 'scheduled', 2: 'completed', 3: 'cancelled' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.FIREBERRY_WEBHOOK_SECRET;
  if (secret) {
    const token = req.headers['x-webhook-token'] || req.headers.authorization?.replace('Bearer ', '');
    if (token !== secret) return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body ?? {};
    const meetings = Array.isArray(body) ? body : [body];
    let imported = 0;

    for (const m of meetings) {
      const { accountid, userid, subject, startdate, enddate, status } = m;
      if (!accountid || !subject) continue;

      // Find client by Fireberry account ID
      const { data: clients } = await supabaseAdmin
        .from('onboarding_request')
        .select('email')
        .eq('fireberry_account_id', accountid);

      const customerEmail = clients?.[0]?.email;
      if (!customerEmail) continue;

      // Find manager by Fireberry user ID
      let managerEmail = null;
      if (userid) {
        const { data: managers } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('fireberry_user_id', userid);
        managerEmail = managers?.[0]?.email;
      }

      const meetingData = {
        customer_email: customerEmail,
        manager_email: managerEmail,
        title: subject,
        start_time: startdate ? new Date(startdate).toISOString() : null,
        end_time: enddate ? new Date(enddate).toISOString() : null,
        status: STATUS_MAP[status] || 'scheduled',
        fireberry_meeting_id: m.id || m.meetingid,
        created_date: new Date().toISOString(),
      };

      // Upsert by fireberry_meeting_id if exists
      if (meetingData.fireberry_meeting_id) {
        await supabaseAdmin.from('meeting')
          .upsert(meetingData, { onConflict: 'fireberry_meeting_id' });
      } else {
        await supabaseAdmin.from('meeting').insert(meetingData);
      }
      imported++;
    }

    return res.status(200).json({ imported });
  } catch (e) {
    console.error('[importFireberryMeetings]', e);
    return res.status(500).json({ error: e.message });
  }
}
