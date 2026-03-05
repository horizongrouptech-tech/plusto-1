import { requireAuth, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, customer_email } = req.body ?? {};
    if (!file_url) return res.status(400).json({ error: 'file_url required' });

    const schema = {
      tax_year: 'number',
      total_income: 'number',
      taxable_income: 'number',
      tax_credits: 'number',
      balance: 'number',
      is_refund: 'boolean',
      business_turnover: 'number',
      income_breakdown: { business: 'number', salary: 'number', other: 'number' },
      deductions: { pension: 'number', social_security: 'number', other: 'number' },
      recommendations: ['string'],
    };

    const result = await openRouterAPI({
      prompt: `נתח שומת מס ישראלית (הודעת שומה) וחלץ את הנתונים הבאים. אם היתרה חיובית - זו חוב, אם שלילית - זה החזר. הוסף 2-3 המלצות בעברית.`,
      response_json_schema: schema,
      file_urls: [file_url],
      model: 'openai/gpt-4o',
    });

    return res.status(200).json(result);
  } catch (e) {
    console.error('[processTaxAssessment]', e);
    return res.status(500).json({ error: e.message });
  }
}
