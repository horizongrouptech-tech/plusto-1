import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { catalogId, customer_email } = req.body ?? {};
    if (!catalogId) return res.status(400).json({ error: 'catalogId is required' });

    // Delete all products in the catalog
    const { error: delProductsErr } = await supabaseAdmin.from('product').delete().eq('catalog_id', catalogId);
    if (delProductsErr) throw new Error(`Failed to delete products: ${delProductsErr.message}`);

    // Delete the catalog itself
    const { error: delCatalogErr } = await supabaseAdmin.from('catalog').delete().eq('id', catalogId);
    if (delCatalogErr) throw new Error(`Failed to delete catalog: ${delCatalogErr.message}`);

    return res.status(200).json({ success: true, message: 'הקטלוג נמחק בהצלחה' });
  } catch (error) {
    console.error('[deleteEntireCatalog]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
