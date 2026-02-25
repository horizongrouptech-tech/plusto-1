import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized - Admin access required' });

  try {
    const { customerEmail } = req.body ?? {};
    if (!customerEmail) return res.status(400).json({ error: 'customerEmail is required' });

    const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('email', customerEmail).limit(1);
    const customer = profiles?.[0];

    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!customer.phone) return res.status(400).json({ error: 'Customer phone number not found' });

    const cleanPhone = customer.phone.replace(/[^\d]/g, '');

    const woztellPayload = {
      channelId: '686e4c709ee5dba8fb45e8ba',
      recipientId: cleanPhone,
      redirect: {
        tree: '686cf4459ee5dbb68145defa',
        nodeCompositeId: 'Tf3N1pDep9xEHMVu',
        runPreAction: true,
        sendResponse: true,
        runPostAction: true,
      },
      meta: {
        customer_email: customerEmail,
        customer_name: customer.full_name || customer.business_name,
        initiated_by: user.email,
        timestamp: new Date().toISOString(),
      },
    };

    const woztellResponse = await fetch(
      `https://bot.api.woztell.com/redirectMemberToNode?accessToken=${process.env.WOZTELL_REDIRECT_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(woztellPayload) },
    );

    const woztellResult = await woztellResponse.text();
    if (!woztellResponse.ok) throw new Error(`Woztell API error: ${woztellResponse.status} - ${woztellResult}`);

    await supabaseAdmin.from('customer_action').insert({
      customer_email: customerEmail,
      action_type: 'whatsapp_conversation_initiated',
      item_id: 'conversation_flow',
      item_title: 'התחל שיחה עם הלקוח',
      item_details: { phone_number: cleanPhone, initiated_by: user.email },
    }).catch((e) => console.error('Error logging action:', e));

    return res.status(200).json({ success: true, message: 'שיחת וואטסאפ התחילה בהצלחה', customer_name: customer.full_name || customer.business_name, phone: cleanPhone });
  } catch (error) {
    console.error('[initiateWhatsAppConversation]', error);
    return res.status(500).json({ error: error.message, success: false });
  }
}
