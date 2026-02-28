import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const { catalog_id } = req.body ?? {};

    const { data: catalogs } = await supabaseAdmin
      .from('catalog')
      .select('id')
      .then(r => catalog_id ? supabaseAdmin.from('catalog').select('id').eq('id', catalog_id) : supabaseAdmin.from('catalog').select('id'));

    let updated = 0;
    for (const catalog of (catalogs || [])) {
      const { count } = await supabaseAdmin
        .from('product_catalog')
        .select('id', { count: 'exact', head: true })
        .eq('catalog_id', catalog.id);

      await supabaseAdmin.from('catalog').update({ product_count: count || 0 }).eq('id', catalog.id);
      updated++;
    }

    return res.status(200).json({ updated });
  } catch (e) {
    console.error('[fixCatalogProductCount]', e);
    return res.status(500).json({ error: e.message });
  }
}
