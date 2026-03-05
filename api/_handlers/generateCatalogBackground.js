import { requireAuth, supabaseAdmin, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { catalog_id, business_description, category, target_count = 50 } = req.body ?? {};
    if (!catalog_id) return res.status(400).json({ error: 'catalog_id is required' });

    // Mark process as started
    await supabaseAdmin.from('process_status').upsert({
      entity_id: catalog_id,
      process_type: 'catalog_generation',
      status: 'running',
      progress: 0,
      started_at: new Date().toISOString(),
    }, { onConflict: 'entity_id,process_type' });

    // Get existing products to avoid duplicates
    const { data: existingProducts } = await supabaseAdmin
      .from('product')
      .select('product_name')
      .eq('catalog_id', catalog_id)
      .limit(100);

    const existingNames = (existingProducts || []).map(p => p.product_name);

    // Generate products in batches
    const batchSize = 20;
    const batches = Math.ceil(target_count / batchSize);
    let totalInserted = 0;

    for (let batch = 0; batch < batches; batch++) {
      const batchCount = Math.min(batchSize, target_count - totalInserted);

      const generated = await openRouterAPI({
        prompt: `Generate ${batchCount} realistic products for a catalog.
Business: ${business_description || 'general retail business'}
Category: ${category || 'general'}
Existing products (avoid duplicates): ${existingNames.slice(0, 20).join(', ')}
Generate products with Israeli market context. Return JSON array.`,
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
                  category: { type: 'string' },
                  cost_price: { type: 'number' },
                  selling_price: { type: 'number' },
                  supplier: { type: 'string' },
                  inventory: { type: 'number' },
                },
                required: ['product_name', 'category', 'cost_price', 'selling_price'],
              },
            },
          },
        },
        model: 'openai/gpt-4o-mini',
      }).catch(() => ({ products: [] }));

      const products = (generated?.products || []).map(p => ({
        ...p,
        catalog_id,
        is_active: true,
        gross_profit: (p.selling_price || 0) - (p.cost_price || 0),
        profit_percentage: p.cost_price > 0
          ? (((p.selling_price - p.cost_price) / p.cost_price) * 100).toFixed(2)
          : 0,
      }));

      if (products.length > 0) {
        const { error } = await supabaseAdmin.from('product').insert(products);
        if (!error) totalInserted += products.length;
      }

      // Update progress
      await supabaseAdmin.from('process_status').update({
        progress: Math.round((totalInserted / target_count) * 100),
      }).eq('entity_id', catalog_id).eq('process_type', 'catalog_generation');
    }

    // Update catalog product count
    await supabaseAdmin.from('catalog').update({ product_count: totalInserted }).eq('id', catalog_id);

    // Mark complete
    await supabaseAdmin.from('process_status').update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
    }).eq('entity_id', catalog_id).eq('process_type', 'catalog_generation');

    return res.status(200).json({ success: true, catalog_id, products_generated: totalInserted });
  } catch (e) {
    console.error('[generateCatalogBackground]', e);
    await supabaseAdmin.from('process_status').update({
      status: 'error',
      error_message: e.message,
    }).eq('entity_id', req.body?.catalog_id).eq('process_type', 'catalog_generation').catch(() => {});
    return res.status(500).json({ error: e.message });
  }
}
