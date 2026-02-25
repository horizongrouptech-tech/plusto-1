import { requireAuth, supabaseAdmin } from '../_helpers.js';

const MEETING_FIREBERRY_WEBHOOK = 'https://hook.eu1.make.com/xd9fz081f7uaxkacgfx3iakvyi2swr9r';
const STATUS_TO_FIREBERRY = { scheduled: 1, completed: 10, cancelled: 12, rescheduled: 1, open: 1, done: 10 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { meetingId } = req.body ?? {};
    if (!meetingId) return res.status(400).json({ error: 'Meeting ID is required' });

    const { data: meeting, error: meetErr } = await supabaseAdmin.from('meeting').select('*').eq('id', meetingId).single();
    if (meetErr || !meeting) return res.status(404).json({ error: 'Meeting not found' });

    const isNewMeeting = !meeting.fireberry_meeting_id;
    let customerName = '';
    let businessName = '';
    let fireberryAccountId = meeting.related_fireberry_account_id || null;

    if (meeting.customer_email) {
      const cleanEmail = meeting.customer_email.trim().toLowerCase();
      const { data: onboarding } = await supabaseAdmin.from('onboarding_request').select('email, full_name, business_name, fireberry_account_id');
      const match = (onboarding || []).find((c) => c.email?.trim().toLowerCase() === cleanEmail);
      if (match) {
        customerName = match.full_name || '';
        businessName = match.business_name || '';
        fireberryAccountId = match.fireberry_account_id || fireberryAccountId;
      } else {
        const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, business_name, fireberry_account_id').eq('email', meeting.customer_email).single();
        if (profile) {
          customerName = profile.full_name || '';
          businessName = profile.business_name || '';
          fireberryAccountId = profile.fireberry_account_id || fireberryAccountId;
        }
      }
    }

    let assigneeFireberryUserId = null;
    if (meeting.manager_email) {
      const { data: mgr } = await supabaseAdmin.from('profiles').select('fireberry_user_id').eq('email', meeting.manager_email).single();
      if (mgr?.fireberry_user_id) assigneeFireberryUserId = mgr.fireberry_user_id;
    }

    const startDate = meeting.start_date || new Date().toISOString().split('T')[0];
    const startDateTime = `${startDate}T${meeting.start_time || '10:00'}:00`;
    const endDateTime = `${meeting.end_date || startDate}T${meeting.end_time || '11:00'}:00`;

    const fireberryPayload = {
      meetingid: meeting.fireberry_meeting_id || null,
      pcfPlastoMeetingId: meeting.id,
      subject: meeting.subject || 'פגישת ניהול כספים',
      description: meeting.notes || meeting.description || '',
      start_datetime: startDateTime,
      end_datetime: endDateTime,
      location: meeting.location || meeting.channel || '',
      channel: meeting.channel || 'zoom',
      statuscode: STATUS_TO_FIREBERRY[meeting.status] || 1,
      pcfsystemfield35: fireberryAccountId,
      customer_name: customerName,
      business_name: businessName,
      ownerid: assigneeFireberryUserId,
      participants: Array.isArray(meeting.participants) ? meeting.participants.join(', ') : (meeting.participants || ''),
      isNewMeeting,
      itemType: 'meeting',
    };

    const response = await fetch(MEETING_FIREBERRY_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fireberryPayload) });
    if (!response.ok) throw new Error(`Fireberry webhook failed: ${response.status}`);

    let responseData;
    try { responseData = await response.json(); } catch { responseData = await response.text(); }

    const updateData = { fireberry_synced_at: new Date().toISOString() };
    const fbId = responseData?.meetingid || responseData?.meeting_id || responseData?.id || responseData?.activityid;
    if (fbId && !meeting.fireberry_meeting_id) updateData.fireberry_meeting_id = fbId;

    await supabaseAdmin.from('meeting').update(updateData).eq('id', meetingId);

    return res.status(200).json({ success: true, message: 'Meeting synced to Fireberry successfully', fireberry_response: responseData });
  } catch (error) {
    console.error('[syncMeetingToFireberry]', error);
    return res.status(500).json({ error: error.message, success: false });
  }
}
