import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, customer_id, customer_email } = req.body ?? {};
    if (!file_url) return res.status(400).json({ error: 'file_url is required' });

    const extracted = await invokeLLM({
      prompt: `You are an Israeli credit report analyst. Analyze this credit report document and extract all relevant financial information.
Extract: credit score, total debt, monthly payments, credit lines, late payments, bankruptcies, financial summary.
Return structured data.`,
      response_json_schema: {
        type: 'object',
        properties: {
          credit_score: { type: 'number' },
          credit_rating: { type: 'string' },
          total_debt: { type: 'number' },
          total_monthly_payments: { type: 'number' },
          number_of_credit_lines: { type: 'number' },
          late_payments_count: { type: 'number' },
          bankruptcies: { type: 'number' },
          financial_summary: { type: 'string' },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          recommendations: { type: 'array', items: { type: 'string' } },
          credit_lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lender: { type: 'string' },
                balance: { type: 'number' },
                limit: { type: 'number' },
                monthly_payment: { type: 'number' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
      file_urls: [file_url],
      model: 'openai/gpt-4o',
    });

    // Save to file_upload table if customer identified
    if (customer_id || customer_email) {
      const { data: existing } = await supabaseAdmin
        .from('file_upload')
        .select('id')
        .eq('file_type', 'credit_report')
        .eq(customer_id ? 'customer_id' : 'customer_email', customer_id || customer_email)
        .single();

      const payload = {
        file_type: 'credit_report',
        file_url,
        extracted_data: extracted,
        created_by: user.id,
        ...(customer_id ? { customer_id } : {}),
        ...(customer_email ? { customer_email } : {}),
      };

      if (existing?.id) {
        await supabaseAdmin.from('file_upload').update(payload).eq('id', existing.id);
      } else {
        await supabaseAdmin.from('file_upload').insert(payload);
      }
    }

    return res.status(200).json({ success: true, extracted_data: extracted });
  } catch (e) {
    console.error('[processCreditReport]', e);
    return res.status(500).json({ error: e.message });
  }
}
