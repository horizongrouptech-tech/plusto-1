import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { catalogId, customer_email } = req.body ?? {};
    if (!catalogId) return res.status(400).json({ error: 'catalogId is required' });

    // Get products that need review
    const { data: products } = await supabaseAdmin.from('product').select('*').eq('catalog_id', catalogId).eq('needs_review', true).limit(200);

    if (!products || products.length === 0) {
      return res.status(200).json({ success: true, message: 'אין מוצרים הדורשים ניקוי', cleaned_count: 0 });
    }

    // Use AI to clean product names and fill missing data
    const productList = products.slice(0, 50).map((p, i) => `${i + 1}. "${p.product_name}" - עלות: ${p.cost_price}, מחיר: ${p.selling_price}, קטגוריה: ${p.category}`).join('\n');

    const cleanedData = await invokeLLM({
      prompt: `אתה מומחה ניהול מלאי ישראלי. נקה ושפר את נתוני המוצרים הבאים:
${productList}

עבור כל מוצר, תקן את שם המוצר (הסר תווים מיוחדים, ייצר שם עברי ברור), ומלא קטגוריה אם חסרה.
החזר JSON עם מערך "cleaned_products" שכל איבר מכיל: index (1-based), product_name (מתוקן), category (מלא אם חסר).`,
      response_json_schema: {
        type: 'object',
        properties: {
          cleaned_products: {
            type: 'array',
            items: {
              type: 'object',
              properties: { index: { type: 'number' }, product_name: { type: 'string' }, category: { type: 'string' } },
            },
          },
        },
      },
    });

    let cleanedCount = 0;
    if (cleanedData?.cleaned_products) {
      for (const cleaned of cleanedData.cleaned_products) {
        const product = products[cleaned.index - 1];
        if (product) {
          await supabaseAdmin.from('product').update({
            product_name: cleaned.product_name || product.product_name,
            category: cleaned.category || product.category,
            needs_review: false,
            data_quality: 'complete',
            missing_fields: [],
          }).eq('id', product.id);
          cleanedCount++;
        }
      }
    }

    return res.status(200).json({ success: true, message: `נוקו ${cleanedCount} מוצרים בהצלחה`, cleaned_count: cleanedCount });
  } catch (error) {
    console.error('[cleanCatalogSmartly]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
