/**
 * GET /api/google/callback
 *
 * Google OAuth2 callback — exchanges authorization code for tokens,
 * fetches user's Google email, and stores everything in the profiles table.
 * Redirects to /Calendar?connected=true on success.
 */
import { supabaseAdmin } from './_google-helpers.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state: userEmail, error: oauthError } = req.query;

  if (oauthError) {
    console.error('[google/callback] OAuth error:', oauthError);
    return res.redirect('/Calendar?error=oauth_denied');
  }

  if (!code || !userEmail) {
    return res.redirect('/Calendar?error=missing_params');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[google/callback] Token exchange error:', tokenData);
      return res.redirect('/Calendar?error=token_exchange');
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // 2. Fetch Google user email
    const userinfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userinfo = await userinfoResponse.json();
    const googleEmail = userinfo.email;

    // 3. Save tokens to profiles table
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        google_calendar_access_token: access_token,
        google_calendar_refresh_token: refresh_token,
        google_calendar_token_expires_at: expiresAt,
        google_calendar_email: googleEmail,
      })
      .eq('email', userEmail);

    if (updateError) {
      console.error('[google/callback] DB update error:', updateError);
      return res.redirect('/Calendar?error=db_update');
    }

    // 4. Redirect to Calendar page
    return res.redirect('/Calendar?connected=true');
  } catch (err) {
    console.error('[google/callback] Unexpected error:', err);
    return res.redirect('/Calendar?error=unexpected');
  }
}
