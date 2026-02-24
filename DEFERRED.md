# Deferred Items

This file tracks integrations and features that are **not yet active** in the Supabase migration.
Each section describes exactly what is needed to activate it.

---

## ⏸️ Email (Resend)

**Status:** Stub — `SendEmail()` calls succeed silently without sending an actual email.

**Used in:**
- `src/components/shared/UnifiedTaskModal.jsx`
- `src/components/shared/EmergencyChat.jsx`
- `src/components/shared/CreateTaskModal.jsx`
- `src/pages/SupplierAnalysis.jsx`

**To activate:**

1. Create a free account at https://resend.com
2. Add and verify your sending domain (e.g. `mail.plusto.co.il`)
3. Generate an API key in the Resend dashboard
4. Add to Vercel environment variables:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```
5. Install the SDK: `npm install resend`
6. In `api/integrations/send-email.js`, delete the stub handler and uncomment the
   full implementation at the bottom of the file.

---

## ⏸️ SMS (Twilio)

**Status:** Stub — `SendSMS()` calls succeed silently without sending an actual SMS.

**Used in:** (search for `SendSMS` in `src/`)

**To activate:**

1. Create an account at https://console.twilio.com
2. Purchase a phone number with SMS capability
3. Add to Vercel environment variables:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_PHONE_NUMBER=+12125551234
   ```
4. Install the SDK: `npm install twilio`
5. In `api/integrations/send-sms.js`, delete the stub handler and uncomment the
   full implementation at the bottom of the file.

---

## ⏸️ Supabase Storage bucket

**Status:** `UploadFile()` is implemented and will fail until the bucket is created.

**To activate:**

1. Open the Supabase dashboard → Storage → New bucket
2. Name: `uploads`
3. Toggle **Public bucket** ON (so that uploaded files get public URLs)
4. Click Create

That's it — no code changes needed.

---

## ⏸️ Vercel environment variables (server-side)

The following variables must be added in the **Vercel project settings**
(not just `.env.local`) for the serverless routes to work in production:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://jvvxtgutemwykhhjhqqf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (anon key) |
| `VITE_OPENROUTER_API_KEY` | Your OpenRouter key (`sk-or-v1-...`) |
| `VITE_SITE_URL` | `https://plusto-1.vercel.app` |
| `VITE_SITE_NAME` | `plusto-1` |
| `OPENROUTER_API_KEY` | Same value as `VITE_OPENROUTER_API_KEY` (for serverless routes) |
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` (for serverless routes) |
| `SUPABASE_ANON_KEY` | Same as `VITE_SUPABASE_ANON_KEY` (for serverless routes) |
| `SITE_URL` | `https://plusto-1.vercel.app` |
| `OPENROUTER_DEFAULT_MODEL` | (optional) default: `openai/gpt-4o-mini` |
| `OPENROUTER_IMAGE_MODEL` | (optional) default: `openai/dall-e-3` |

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

---

## ⏸️ Missing database tables

The following entities are used in the codebase but **their tables were not in the
original Excel schema** and were therefore not created in the initial migration.
They will throw a Supabase error if their code paths are hit.

| Entity | Expected table | Where used |
|---|---|---|
| `MeetingSummary` | `meeting_summary` | `MeetingTranscriptionSystem.jsx` |
| `SupplierPayment` | `supplier_payment` | `SupplierPaymentsManager.jsx` |
| `SupplierOrder` | `supplier_order` | `SupplierPaymentsManager.jsx` |
| `SystemSettings` | `system_settings` | `DefaultTasksManager.jsx` |

**To activate:** Create each missing table in Supabase (SQL editor or MCP) with at
least `id TEXT PRIMARY KEY`, `created_date TIMESTAMPTZ`, and the columns the code
actually writes to.

---

## ⏸️ Auth migration (Step 3)

Supabase Auth (login, session, `useCurrentUser`) is not yet wired up.
The app still uses Base44 Auth for login/logout/session.

See `MIGRATION.md` → Step 3 for the full plan.
Until Step 3 is done, the `Authorization` header sent by `src/api/integrations.js`
will be empty, and `api/integrations/_auth.js` returns an `anonymous` user
(permissive mode) so that LLM/upload calls still work.
