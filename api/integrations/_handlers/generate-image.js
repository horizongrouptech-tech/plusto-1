/**
 * POST /api/integrations/generate-image
 *
 * Body:
 *   prompt {string} — description of the image to generate
 *   size   {string} — (optional) e.g. "1024x1024" (default)
 *   model  {string} — (optional) override the default image model
 *
 * Returns { url: string } with the generated image URL.
 *
 * Note: Image generation via OpenRouter requires the openai package for
 * the images.generate API. Currently not supported with @openrouter/sdk v0.8+.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(501).json({
    error: 'Image generation is not yet supported. The OpenRouter SDK v0.8 does not support the images.generate API.',
  });
}
