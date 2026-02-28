import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const { customer_email } = req.body ?? {};

    // Get all valid catalog IDs
    const { data: catalogs } = await supabaseAdmin.from('catalog').select('id');
    const validIds = new Set((catalogs || []).map(c => c.id));

    let deleted = 0;
    const batchSize = 500;

    while (true) {
      let q = supabaseAdmin.from('product_catalog').select('id, catalog_id').limit(batchSize);
      if (customer_email) q = q.eq('customer_email', customer_email);

      const { data: batch } = await q;
      if (!batch || batch.length === 0) break;

      const orphanIds = batch.filter(p => !p.catalog_id || !validIds.has(p.catalog_id)).map(p => p.id);
      if (orphanIds.length > 0) {
        await supabaseAdmin.from('product_catalog').delete().in('id', orphanIds);
        deleted += orphanIds.length;
      }
      if (batch.length < batchSize) break;
    }

    return res.status(200).json({ deleted });
  } catch (e) {
    console.error('[deleteOrphanProducts]', e);
    return res.status(500).json({ error: e.message });
  }
}
