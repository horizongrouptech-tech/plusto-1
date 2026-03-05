import { requireAuth, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, file_urls, report_type } = req.body ?? {};
    const urls = file_urls || (file_url ? [file_url] : []);
    if (!urls.length) return res.status(400).json({ error: 'file_url required' });

    const schema = {
      report_type: 'string (pl | credit_summary | unknown)',
      period: 'string',
      total_revenue: 'number',
      total_expenses: 'number',
      gross_profit: 'number',
      net_profit: 'number',
      tax_amount: 'number',
      income_breakdown: { business: 'number', salary: 'number', other: 'number' },
      expense_breakdown: { marketing: 'number', admin: 'number', other: 'number' },
      deductions: { pension: 'number', social_security: 'number', other: 'number' },
      confidence_score: 'number (0-100)',
      insights: ['string'],
      raw_notes: 'string',
    };

    const prompt = `אתה מנתח דוחות כספיים. נתח את הדוח הפיננסי הבא והחזר נתונים מובנים בJSON.
סוג דוח משוער: ${report_type || 'לא ידוע'}.
חלץ כל נתון כספי רלוונטי. אם נתון לא קיים, השתמש ב-0.
הוסף insights עיקריים (2-3 משפטים) בעברית.`;

    const result = await openRouterAPI({
      prompt,
      response_json_schema: schema,
      file_urls: urls,
      model: 'openai/gpt-4o',
    });

    return res.status(200).json(result);
  } catch (e) {
    console.error('[analyzeFinancialReport]', e);
    return res.status(500).json({ error: e.message });
  }
}
