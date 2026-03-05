import { supabase } from './supabaseClient';

// ---------------------------------------------------------------------------
// Shared helper — authenticated fetch to a Vercel API route
// ---------------------------------------------------------------------------

async function apiCall(path, params) {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `API call to ${path} failed with status ${response.status}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// OpenRouter AI
// ---------------------------------------------------------------------------

/**
 * openRouterAPI({ prompt, response_json_schema?, file_urls?, model? })
 * When response_json_schema is provided, returns the parsed JSON object directly.
 * Otherwise returns { result: string }.
 */
export const openRouterAPI = (params) => apiCall('/api/integrations/openrouter-api', params);

// ---------------------------------------------------------------------------
// File upload — handled client-side via Supabase Storage to avoid size limits
// ---------------------------------------------------------------------------

const UPLOADS_BUCKET = 'uploads';

/**
 * UploadFile({ file })
 * Uploads a File object to Supabase Storage and returns { file_url }.
 *
 * PREREQUISITE: Create a public bucket named "uploads" in the Supabase dashboard
 * (Storage → New bucket → Name: "uploads" → Public: ✓).
 * See DEFERRED.md for full setup instructions.
 */
export const UploadFile = async ({ file }) => {
  if (!file) throw new Error('UploadFile: file is required');

  const ext = file.name?.split('.').pop() ?? 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
  return { file_url: data.publicUrl };
};

// ---------------------------------------------------------------------------
// Data extraction from uploaded files
// ---------------------------------------------------------------------------

/**
 * ExtractDataFromUploadedFile({ file_url, json_schema })
 * Sends a file URL + schema to the serverless route, which fetches the file
 * and asks the LLM to extract structured data from it.
 */
export const ExtractDataFromUploadedFile = (params) =>
  apiCall('/api/integrations/extract-data', params);

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

/**
 * GenerateImage({ prompt, size?, model? })
 * Returns { url: string } with the generated image URL.
 */
export const GenerateImage = (params) => apiCall('/api/integrations/generate-image', params);

// ---------------------------------------------------------------------------
// Email  (⏸️ DEFERRED — returns silently, see DEFERRED.md)
// ---------------------------------------------------------------------------

/**
 * SendEmail({ to, subject, body })
 * Currently a no-op stub. See DEFERRED.md to activate Resend integration.
 */
export const SendEmail = (params) => apiCall('/api/integrations/send-email', params);

// ---------------------------------------------------------------------------
// SMS  (⏸️ DEFERRED — returns silently, see DEFERRED.md)
// ---------------------------------------------------------------------------

/**
 * SendSMS({ to, message })
 * Currently a no-op stub. See DEFERRED.md to activate Twilio integration.
 */
export const SendSMS = (params) => apiCall('/api/integrations/send-sms', params);

// ---------------------------------------------------------------------------
// Core namespace — Core integration namespace
// ---------------------------------------------------------------------------

export const Core = {
  openRouterAPI,
  UploadFile,
  ExtractDataFromUploadedFile,
  GenerateImage,
  SendEmail,
  SendSMS,
};
