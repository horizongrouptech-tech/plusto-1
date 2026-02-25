import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, file_id, customer_email } = req.body ?? {};
    if (!file_url) return res.status(400).json({ error: 'file_url is required' });

    const result = await invokeLLM({
      prompt: `Analyze this BizIbox/business financial report and extract structured data. Extract: business details, revenue figures, expense breakdown, profit/loss summary, cash flow data, any period-by-period breakdown. Return structured JSON with all financial figures as numbers.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          business_name: { type: 'string' },
          report_period: { type: 'string' },
          revenue: { type: 'number' },
          expenses: { type: 'number' },
          profit: { type: 'number' },
          detailed_data: { type: 'object' },
          monthly_breakdown: { type: 'array', items: { type: 'object' } },
        },
      },
      model: 'openai/gpt-4o',
    });

    if (file_id) {
      await supabaseAdmin.from('file_upload').update({ status: 'analyzed', ai_insights: result, data_category: 'bizibox_report', analysis_notes: 'BizIbox report processed successfully.' }).eq('id', file_id);
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[parseBizIboxFile]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
