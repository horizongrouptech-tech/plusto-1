import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, file_id, customer_email } = req.body ?? {};
    if (!file_url) return res.status(400).json({ error: 'file_url is required' });

    const result = await invokeLLM({
      prompt: `Analyze this Z-Report (Israeli POS daily report) and extract structured data.
Extract: report date, total sales, VAT amount, net sales, number of transactions, payment methods breakdown (cash/credit/checks), category/department breakdown if available, voids/refunds if present. All amounts in ILS.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          report_date: { type: 'string', format: 'date' },
          total_sales: { type: 'number' },
          vat_amount: { type: 'number' },
          net_sales: { type: 'number' },
          transaction_count: { type: 'number' },
          payment_methods: { type: 'object' },
          department_breakdown: { type: 'array', items: { type: 'object' } },
          voids_total: { type: 'number' },
        },
      },
      model: 'openai/gpt-4o',
    });

    if (file_id) {
      await supabaseAdmin.from('file_upload').update({ status: 'analyzed', ai_insights: result, data_category: 'z_report', analysis_notes: 'Z-Report processed successfully.' }).eq('id', file_id);
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[parseZReport]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
