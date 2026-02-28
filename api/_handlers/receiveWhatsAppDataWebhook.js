import { supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body ?? {};
    const { from, message, timestamp, message_type, media_url, contact_name } = body;

    if (!from) return res.status(400).json({ error: 'from is required' });

    // Normalize phone number
    const phone = from.replace(/\D/g, '').replace(/^972/, '0').replace(/^0/, '0');

    // Find matching customer/contact by phone
    const { data: contacts } = await supabaseAdmin
      .from('customer_contact')
      .select('id, customer_id, customer_email, full_name')
      .ilike('phone', `%${phone.slice(-9)}%`)
      .limit(1);

    const contact = contacts?.[0];

    // Store the incoming message
    await supabaseAdmin.from('whatsapp_message').insert({
      direction: 'inbound',
      from_number: from,
      phone_normalized: phone,
      message_text: message || '',
      message_type: message_type || 'text',
      media_url: media_url || null,
      contact_name: contact_name || contact?.full_name || null,
      customer_id: contact?.customer_id || null,
      customer_email: contact?.customer_email || null,
      received_at: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
      raw_payload: body,
    }).catch(err => console.error('[receiveWhatsAppDataWebhook] insert error:', err.message));

    // Acknowledge receipt (required by WhatsApp Business API)
    return res.status(200).json({ success: true, received: true });
  } catch (e) {
    console.error('[receiveWhatsAppDataWebhook]', e);
    return res.status(500).json({ error: e.message });
  }
}
