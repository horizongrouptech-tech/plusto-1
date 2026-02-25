import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

const BATCH_SIZE = 20;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { customer_email, business_type, product_count = 50, catalog_id, process_id, generation_metadata } = req.body ?? {};

  if (!customer_email || !catalog_id) {
    return res.status(400).json({ error: 'customer_email and catalog_id are required' });
  }

  try {
    const totalBatches = Math.ceil(Math.min(product_count, 200) / BATCH_SIZE);
    let totalCreated = 0;

    for (let batch = 0; batch < totalBatches; batch++) {
      if (process_id) {
        const progress = 20 + Math.round((batch / totalBatches) * 70);
        await supabaseAdmin.from('process_status').update({ progress, current_step: `מייצר מוצרים... (${batch * BATCH_SIZE}/${Math.min(product_count, 200)})` }).eq('id', process_id);
      }

      const productsData = await invokeLLM({
        prompt: `אתה מומחה לניהול קטלוגים ישראלי. צור ${BATCH_SIZE} מוצרים מגוונים ואמיתיים עבור עסק מסוג: "${business_type || 'קמעונאות כללית'}".
${generation_metadata ? `פרטים נוספים: ${JSON.stringify(generation_metadata)}` : ''}
עבור כל מוצר, ספק: שם מוצר (עברי), ברקוד (13 ספרות), מחיר עלות, מחיר מכירה, קטגוריה, ספק.
המוצרים צריכים להיות ריאליים לסוג העסק עם מחירים שהגיוניים בשוק הישראלי.`,
        response_json_schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product_name: { type: 'string' },
                  barcode: { type: 'string' },
                  cost_price: { type: 'number' },
                  selling_price: { type: 'number' },
                  category: { type: 'string' },
                  supplier: { type: 'string' },
                },
              },
            },
          },
        },
      });

      if (productsData?.products?.length > 0) {
        const rows = productsData.products.map((p) => ({
          catalog_id,
          customer_email,
          product_name: p.product_name,
          barcode: p.barcode || null,
          cost_price: p.cost_price || 0,
          selling_price: p.selling_price || 0,
          category: p.category || 'כללי',
          supplier: p.supplier || 'לא צוין',
          gross_profit: Math.max(0, (p.selling_price || 0) - (p.cost_price || 0)),
          profit_percentage: p.cost_price > 0 ? Math.round(((p.selling_price - p.cost_price) / p.cost_price) * 100) : 0,
          data_source: 'ai_generated',
          data_quality: 'complete',
          needs_review: false,
          is_active: true,
          last_updated: new Date().toISOString(),
        }));

        const { data } = await supabaseAdmin.from('product').insert(rows).select('id');
        if (data) totalCreated += data.length;
      }
    }

    // Update catalog
    await supabaseAdmin.from('catalog').update({ status: 'ready', product_count: totalCreated, last_generated_at: new Date().toISOString() }).eq('id', catalog_id);

    if (process_id) {
      await supabaseAdmin.from('process_status').update({ status: 'completed', progress: 100, current_step: 'יצירת הקטלוג הושלמה!', completed_at: new Date().toISOString(), result_data: { products_created: totalCreated } }).eq('id', process_id);
    }

    return res.status(200).json({ success: true, products_created: totalCreated, catalog_id });
  } catch (error) {
    console.error('[generateCatalogWorker]', error);
    if (process_id) {
      await supabaseAdmin.from('process_status').update({ status: 'failed', error_message: error.message, completed_at: new Date().toISOString() }).eq('id', process_id).catch(() => {});
    }
    await supabaseAdmin.from('catalog').update({ status: 'failed' }).eq('id', catalog_id).catch(() => {});
    return res.status(500).json({ success: false, error: error.message });
  }
}
