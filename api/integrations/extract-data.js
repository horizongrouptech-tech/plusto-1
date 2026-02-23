import OpenAI from '@openrouter/sdk';

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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server.' });
  }

  const { file_url, json_schema, model } = req.body ?? {};

  if (!file_url) {
    return res.status(400).json({ error: 'file_url is required' });
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
    // Fetch the file content
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return res.status(400).json({ error: `Could not fetch file from URL: ${fileResponse.statusText}` });
    }

    const contentType = fileResponse.headers.get('content-type') || '';
    const isImage = contentType.startsWith('image/');

    let messages;

    if (isImage) {
      // Vision-capable models can receive the image directly
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: file_url },
            },
            {
              type: 'text',
              text: json_schema
                ? `Extract the data from this image and return a valid JSON object matching this schema:\n${JSON.stringify(json_schema, null, 2)}\nRespond with JSON only.`
                : 'Extract all meaningful data from this image and return it as a JSON object.',
            },
          ],
        },
      ];
    } else {
      // Text / CSV / JSON / Excel-as-text
      const fileText = await fileResponse.text();
      const truncated = fileText.length > 12000 ? fileText.slice(0, 12000) + '\n...[truncated]' : fileText;

      const systemMsg = json_schema
        ? `Extract the data from the provided file content and return a valid JSON object matching this schema:\n${JSON.stringify(json_schema, null, 2)}\nRespond with JSON only. Do not include any text outside the JSON object.`
        : 'Extract all meaningful structured data from the provided file content and return it as a JSON object.';

      messages = [
        { role: 'system', content: systemMsg },
        { role: 'user', content: `File content:\n\n${truncated}` },
      ];
    }

    const completion = await client.chat.completions.create({
      model: selectedModel,
      messages,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;

    try {
      return res.status(200).json(JSON.parse(content));
    } catch {
      return res.status(200).json({ result: content });
    }
  } catch (error) {
    console.error('[extract-data] error:', error);
    return res.status(500).json({ error: error.message });
  }
}
