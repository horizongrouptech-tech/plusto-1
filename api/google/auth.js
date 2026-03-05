/**
 * GET /api/google/auth
 *
 * Starts the Google OAuth2 flow for Calendar access.
 * Requires Supabase auth — passes user email as state param.
 *
 * Returns: { url: "https://accounts.google.com/o/oauth2/auth?..." }
 */
import { requireAuth } from './_google-helpers.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Google OAuth not configured on server' });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',     // נדרש לקבלת refresh_token
    prompt: 'consent',          // מבטיח שנקבל refresh_token גם בחיבור חוזר
    state: user.email,          // נשמור את האימייל כדי לדעת מי התחבר
  });

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  return res.status(200).json({ url });
}
