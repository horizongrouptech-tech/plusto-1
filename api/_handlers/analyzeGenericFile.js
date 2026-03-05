import { requireAuth, supabaseAdmin, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, file_id, customer_email, analysis_prompt } = req.body ?? {};
    if (!file_url) return res.status(400).json({ error: 'file_url is required' });

    const prompt = analysis_prompt ||
      'Analyze this file and extract all relevant business data. Provide a structured summary including key figures, trends, and any actionable insights. Respond in Hebrew.';

    const result = await openRouterAPI({
      prompt,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          key_figures: { type: 'object' },
          insights: { type: 'array', items: { type: 'string' } },
          data_extracted: { type: 'object' },
        },
      },
      model: 'openai/gpt-4o',
    });

    if (file_id) {
      await supabaseAdmin.from('file_upload').update({ status: 'analyzed', ai_insights: result, analysis_notes: 'File analyzed successfully.' }).eq('id', file_id);
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[analyzeGenericFile]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
