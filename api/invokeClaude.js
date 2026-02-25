import { requireAuth, invokeLLM } from './_helpers.js';

/**
 * POST /api/invokeClaude
 * Replaces the Deno invokeClaude function.
 * Now routes through OpenRouter instead of calling Anthropic directly.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { prompt, response_json_schema } = req.body ?? {};
    if (!prompt || !response_json_schema) {
      return res.status(400).json({ error: 'Missing prompt or response_json_schema' });
    }

    const result = await invokeLLM({
      prompt,
      response_json_schema,
      model: 'anthropic/claude-sonnet-4-5',
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[invokeClaude]', error);
    return res.status(500).json({ error: error.message });
  }
}
