import OpenAI from '@openrouter/sdk';

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
 * Note: Image generation requires a model that supports it via OpenRouter,
 * e.g. "openai/dall-e-3" or "openai/dall-e-2".
 * Set OPENROUTER_IMAGE_MODEL env var to override the default.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server.' });
  }

  const { prompt, size, model } = req.body ?? {};

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://plusto-1.vercel.app',
      'X-Title': process.env.SITE_NAME || process.env.VITE_SITE_NAME || 'Plusto',
    },
  });

  const selectedModel = model || process.env.OPENROUTER_IMAGE_MODEL || 'openai/dall-e-3';

  try {
    const response = await client.images.generate({
      model: selectedModel,
      prompt,
      n: 1,
      size: size || '1024x1024',
    });

    return res.status(200).json({ url: response.data[0].url });
  } catch (error) {
    console.error('[generate-image] error:', error);
    return res.status(500).json({ error: error.message });
  }
}
