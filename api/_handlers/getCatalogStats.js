import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { catalog_id, customer_email } = req.body ?? {};
    if (!catalog_id && !customer_email) return res.status(400).json({ error: 'catalog_id or customer_email required' });

    let q = supabaseAdmin.from('product_catalog').select('id, data_quality, cost_price, selling_price, is_recommended, is_suggested_product');
    if (catalog_id) q = q.eq('catalog_id', catalog_id);
    else q = q.eq('customer_email', customer_email);

    const { data: products, error } = await q;
    if (error) throw new Error(error.message);

    const stats = {
      total: products.length,
      complete: products.filter(p => p.data_quality === 'complete').length,
      incomplete: products.filter(p => p.data_quality === 'incomplete').length,
      needsReview: products.filter(p => p.data_quality === 'partial').length,
      recommended: products.filter(p => p.is_recommended).length,
      suggested: products.filter(p => p.is_suggested_product).length,
      missingCost: products.filter(p => !p.cost_price || p.cost_price === 0).length,
    };

    return res.status(200).json(stats);
  } catch (e) {
    console.error('[getCatalogStats]', e);
    return res.status(500).json({ error: e.message });
  }
}
