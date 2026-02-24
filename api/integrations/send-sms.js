/**
 * POST /api/integrations/send-sms
 *
 * ⏸️  DEFERRED — see DEFERRED.md
 *
 * To activate, you need:
 *   1. A Twilio account → https://console.twilio.com
 *   2. A Twilio phone number with SMS capability
 *   3. Add these to Vercel environment variables:
 *        TWILIO_ACCOUNT_SID
 *        TWILIO_AUTH_TOKEN
 *        TWILIO_PHONE_NUMBER   (your Twilio sending number, e.g. +12125551234)
 *   4. Run: npm install twilio
 *   5. Uncomment the implementation below and delete the stub response
 *
 * Expected body:
 *   to      {string}  — recipient phone number (E.164 format, e.g. +972501234567)
 *   message {string}  — SMS message text
 */

// ----- STUB (remove when activating) -----
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  console.warn('[send-sms] SMS integration is deferred. See DEFERRED.md.');
  return res.status(200).json({ ok: true, deferred: true });
}

// ----- ACTIVE IMPLEMENTATION (uncomment when ready) -----
/*
import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(500).json({ error: 'Twilio credentials are not configured.' });
  }

  const { to, message } = req.body ?? {};
  if (!to || !message) {
    return res.status(400).json({ error: 'to and message are required' });
  }

  const client = twilio(accountSid, authToken);
  try {
    const msg = await client.messages.create({ body: message, from: fromNumber, to });
    return res.status(200).json({ ok: true, sid: msg.sid });
  } catch (error) {
    console.error('[send-sms] error:', error);
    return res.status(500).json({ error: error.message });
  }
}
*/
