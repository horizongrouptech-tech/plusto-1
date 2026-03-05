/**
 * GET /api/google/calendar-events
 *
 * Fetches events from the user's Google Calendar.
 * Handles automatic token refresh when access_token expires.
 *
 * Query params:
 *   timeMin — ISO start date (e.g. 2026-03-01T00:00:00Z)
 *   timeMax — ISO end date   (e.g. 2026-03-31T23:59:59Z)
 *
 * Returns: { events: [...] }
 */
import { requireAuth, supabaseAdmin } from './_google-helpers.js';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Refresh the access token using the stored refresh_token
 */
async function refreshAccessToken(profile) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: profile.google_calendar_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Update tokens in DB
  await supabaseAdmin
    .from('profiles')
    .update({
      google_calendar_access_token: data.access_token,
      google_calendar_token_expires_at: expiresAt,
    })
    .eq('email', profile.email);

  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  // Check if user has Google Calendar connected
  if (!user.google_calendar_refresh_token) {
    return res.status(400).json({ error: 'Google Calendar not connected' });
  }

  try {
    // Auto-refresh token if expired
    let accessToken = user.google_calendar_access_token;
    const expiresAt = new Date(user.google_calendar_token_expires_at);

    if (expiresAt <= new Date()) {
      accessToken = await refreshAccessToken(user);
    }

    // Fetch events from Google Calendar
    const { timeMin, timeMax } = req.query;
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    const calendarResponse = await fetch(`${GOOGLE_CALENDAR_API}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json();
      console.error('[calendar-events] Google API error:', errorData);

      // אם ה-token לא תקין — ננסה refresh
      if (calendarResponse.status === 401) {
        accessToken = await refreshAccessToken(user);
        const retryResponse = await fetch(`${GOOGLE_CALENDAR_API}?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!retryResponse.ok) {
          return res.status(502).json({ error: 'Failed to fetch calendar events after refresh' });
        }
        const retryData = await retryResponse.json();
        return res.status(200).json({ events: mapEvents(retryData.items || []) });
      }

      return res.status(502).json({ error: 'Failed to fetch calendar events' });
    }

    const data = await calendarResponse.json();
    return res.status(200).json({ events: mapEvents(data.items || []) });
  } catch (err) {
    console.error('[calendar-events] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Map Google Calendar events to a simpler format for the frontend
 */
function mapEvents(items) {
  return items.map(event => ({
    id: event.id,
    title: event.summary || '(ללא כותרת)',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    allDay: !event.start?.dateTime,
    description: event.description || '',
    location: event.location || '',
    htmlLink: event.htmlLink,
    status: event.status,
    color: event.colorId ? getEventColor(event.colorId) : undefined,
  }));
}

/**
 * Google Calendar color IDs → hex colors
 */
function getEventColor(colorId) {
  const colors = {
    '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
    '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
    '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
  };
  return colors[colorId];
}
