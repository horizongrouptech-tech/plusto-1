import { requireAuth, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { product_name, category, current_supplier, budget, location = 'ישראל' } = req.body ?? {};
    if (!product_name && !category) return res.status(400).json({ error: 'product_name or category required' });

    const schema = {
      suppliers: [{
        name: 'string',
        website: 'string',
        description: 'string',
        estimated_price_range: 'string',
        pros: ['string'],
        cons: ['string'],
        contact_info: 'string',
      }],
      search_notes: 'string',
    };

    const result = await openRouterAPI({
      prompt: `מצא 3-5 ספקים חלופיים ב${location} עבור: ${product_name || category}.
${current_supplier ? `ספק נוכחי: ${current_supplier}.` : ''}
${budget ? `תקציב: ${budget}.` : ''}
כלול ספקים ריאליים עם אתרי אינטרנט. אם אינך בטוח, ציין זאת בגלוי.`,
      response_json_schema: schema,
    });

    return res.status(200).json(result);
  } catch (e) {
    console.error('[findAlternativeSuppliersOnline]', e);
    return res.status(500).json({ error: e.message });
  }
}
