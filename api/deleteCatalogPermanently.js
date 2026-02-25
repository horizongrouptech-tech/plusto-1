import { requireAuth, supabaseAdmin } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { catalogId } = req.body ?? {};
    if (!catalogId) return res.status(400).json({ error: 'catalogId is required' });

    await supabaseAdmin.from('product').delete().eq('catalog_id', catalogId);
    await supabaseAdmin.from('catalog').delete().eq('id', catalogId);

    return res.status(200).json({ success: true, message: 'הקטלוג נמחק לצמיתות' });
  } catch (error) {
    console.error('[deleteCatalogPermanently]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
