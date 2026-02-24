import OpenAI from '@openrouter/sdk';

/**
 * POST /api/integrations/invoke-llm
 *
 * Body:
 *   prompt               {string}  — the user prompt
 *   response_json_schema {object}  — (optional) JSON Schema; when provided the
 *                                    response will be parsed and returned as an object
 *   add_context_from_internet {boolean} — ignored (web search not wired up yet)
 *   model                {string}  — (optional) override the default OpenRouter model
 *
 * Returns the parsed JSON object when response_json_schema is given,
 * or { result: "<text>" } for plain text responses.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server.' });
  }

  const {
    prompt,
    response_json_schema,
    model,
  } = req.body ?? {};

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

  const selectedModel = model || process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';

  try {
    // Build messages — include schema instructions in the system message
    const messages = [];

    if (response_json_schema) {
      messages.push({
        role: 'system',
        content:
          'You must respond with a valid JSON object that conforms to this schema:\n' +
          JSON.stringify(response_json_schema, null, 2) +
          '\nDo not include any text outside the JSON object.',
      });
    }

    messages.push({ role: 'user', content: prompt });

    const requestParams = {
      model: selectedModel,
      messages,
    };

    if (response_json_schema) {
      requestParams.response_format = { type: 'json_object' };
    }

    const completion = await client.chat.completions.create(requestParams);
    const content = completion.choices[0].message.content;

    if (response_json_schema) {
      try {
        return res.status(200).json(JSON.parse(content));
      } catch {
        // Model returned non-JSON despite instructions — return as-is
        return res.status(200).json({ result: content });
      }
    }

    return res.status(200).json({ result: content });
  } catch (error) {
    console.error('[invoke-llm] error:', error);
    return res.status(500).json({ error: error.message });
  }
}
