import { requireAuth, supabaseAdmin, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, file_id, customer_email, document_type } = req.body ?? {};
    if (!file_url || !customer_email || !file_id) {
      return res.status(400).json({ error: 'Missing required parameters: file_url, customer_email, file_id' });
    }

    const result = await openRouterAPI({
      prompt: `You are an expert financial document analyzer. Analyze this ${document_type || 'financial'} document and extract all structured data. Respond in Hebrew where text is Hebrew, preserve numbers as-is. Provide: document_type, key_data (object with all extracted fields), summary (string), insights (array of strings).`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          document_type: { type: 'string' },
          key_data: { type: 'object' },
          summary: { type: 'string' },
          insights: { type: 'array', items: { type: 'string' } },
        },
      },
      model: 'openai/gpt-4o',
    });

    await supabaseAdmin.from('file_upload').update({
      status: 'analyzed',
      ai_insights: result,
      data_category: document_type || result.document_type || 'generic',
      analysis_notes: 'Smart document processed successfully.',
    }).eq('id', file_id);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[processSmartDocument]', error);
    await supabaseAdmin.from('file_upload').update({ status: 'failed', analysis_notes: error.message }).eq('id', file_id).catch(() => {});
    return res.status(500).json({ success: false, error: error.message });
  }
}
