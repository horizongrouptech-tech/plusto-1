import { invokeLLM } from '../../_helpers.js';

/**
 * POST /api/integrations/invoke-llm
 *
 * Body:
 *   prompt               {string}  — the user prompt
 *   response_json_schema {object}  — (optional) JSON Schema; triggers JSON response
 *   file_urls            {string[]} — (optional) image/file URLs for vision models
 *   model                {string}  — (optional) override the default OpenRouter model
 *
 * Returns the parsed JSON object when response_json_schema is given,
 * or { result: "<text>" } for plain text responses.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, response_json_schema, model, file_urls } = req.body ?? {};

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    // שימוש ב-invokeLLM המשותף מ-_helpers.js — תומך ב-file_urls, vision, JSON schema
    const result = await invokeLLM({ prompt, response_json_schema, model, file_urls });

    // invokeLLM מחזיר object אם יש schema, או string אם אין
    if (typeof result === 'string') {
      return res.status(200).json({ result });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('[invoke-llm] error:', error);
    return res.status(500).json({ error: error.message });
  }
}
