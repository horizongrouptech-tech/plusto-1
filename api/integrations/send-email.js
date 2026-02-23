/**
 * POST /api/integrations/send-email
 *
 * ⏸️  DEFERRED — see DEFERRED.md
 *
 * To activate, you need:
 *   1. A Resend account → https://resend.com
 *   2. A verified sending domain in Resend
 *   3. Add RESEND_API_KEY to Vercel environment variables
 *   4. Run: npm install resend
 *   5. Uncomment the implementation below and delete the stub response
 *
 * Expected body:
 *   to      {string}  — recipient email
 *   subject {string}  — email subject
 *   body    {string}  — HTML body
 */

// ----- STUB (remove when activating) -----
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  console.warn('[send-email] Email integration is deferred. See DEFERRED.md.');
  return res.status(200).json({ ok: true, deferred: true });
}

// ----- ACTIVE IMPLEMENTATION (uncomment when ready) -----
/*
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY is not configured.' });

  const { to, subject, body } = req.body ?? {};
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
      to,
      subject,
      html: body,
    });
    return res.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    console.error('[send-email] error:', error);
    return res.status(500).json({ error: error.message });
  }
}
*/
