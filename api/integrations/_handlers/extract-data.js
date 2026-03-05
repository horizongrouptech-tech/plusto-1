import { openRouterAPI } from '../../_helpers.js';

/**
 * POST /api/integrations/extract-data
 *
 * Body:
 *   file_url   {string} — publicly accessible URL of the file to extract from
 *   json_schema {object} — JSON Schema describing the shape of the data to extract
 *   model       {string} — (optional) override the default OpenRouter model
 *
 * Returns the extracted data as a JSON object matching the provided schema.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file_url, json_schema, model } = req.body ?? {};

  if (!file_url) {
    return res.status(400).json({ error: 'file_url is required' });
  }

  try {
    const prompt = json_schema
      ? `Extract the data from this file and return a valid JSON object matching the provided schema. Respond with JSON only.`
      : 'Extract all meaningful structured data from this file and return it as a JSON object.';

    const result = await openRouterAPI({
      prompt,
      file_urls: [file_url],
      response_json_schema: json_schema,
      model,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[extract-data] error:', error);
    return res.status(500).json({ error: error.message });
  }
}
