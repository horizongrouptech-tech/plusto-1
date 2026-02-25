/**
 * POST /api/integrations/upload-file
 *
 * File uploads are handled directly on the client side via the Supabase Storage SDK
 * (see src/api/integrations.js → UploadFile).
 *
 * This route is kept as a thin passthrough stub in case a server-side upload
 * path is needed in the future (e.g. for files that must be processed before storage).
 *
 * See DEFERRED.md for notes on Supabase Storage bucket setup.
 */
export default async function handler(req, res) {
  return res.status(501).json({
    error: 'Server-side file upload is not implemented. Use the Supabase Storage client directly from the frontend.',
  });
}
