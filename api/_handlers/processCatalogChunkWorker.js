import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { catalog_id, chunk_index, products_chunk, enrich_with_ai } = req.body ?? {};
    if (!catalog_id || !products_chunk) return res.status(400).json({ error: 'catalog_id and products_chunk are required' });

    let processedProducts = products_chunk;

    // Optionally enrich with AI (add descriptions, categories, etc.)
    if (enrich_with_ai && products_chunk.length > 0) {
      const productNames = products_chunk.map(p => p.product_name).filter(Boolean);
      const enriched = await invokeLLM({
        prompt: `You are a product catalog expert. Enrich these products with better descriptions and categorization.
Products: ${JSON.stringify(productNames.slice(0, 20))}
For each product, provide: category, subcategory, short_description (max 100 chars in Hebrew).
Return an array in the same order.`,
        response_json_schema: {
          type: 'object',
          properties: {
            enriched: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  subcategory: { type: 'string' },
                  short_description: { type: 'string' },
                },
              },
            },
          },
        },
        model: 'openai/gpt-4o-mini',
      }).catch(() => ({ enriched: [] }));

      if (enriched?.enriched?.length > 0) {
        processedProducts = products_chunk.map((p, i) => ({
          ...p,
          ...( enriched.enriched[i] ? {
            category: p.category || enriched.enriched[i].category,
            short_description: enriched.enriched[i].short_description,
          } : {}),
        }));
      }
    }

    // Insert the chunk
    const toInsert = processedProducts.map(p => ({ ...p, catalog_id, is_active: true }));
    const { error } = await supabaseAdmin.from('product').insert(toInsert);
    if (error) throw new Error(error.message);

    // Update process_status if tracking
    await supabaseAdmin
      .from('process_status')
      .update({ progress: chunk_index, updated_at: new Date().toISOString() })
      .eq('entity_id', catalog_id)
      .eq('process_type', 'catalog_generation')
      .catch(() => {});

    return res.status(200).json({ success: true, chunk_index, products_inserted: toInsert.length });
  } catch (e) {
    console.error('[processCatalogChunkWorker]', e);
    return res.status(500).json({ error: e.message });
  }
}
