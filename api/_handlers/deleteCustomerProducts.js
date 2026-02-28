import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin' && user.user_type !== 'financial_manager') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { customer_email, catalog_id } = req.body ?? {};
    if (!customer_email && !catalog_id) return res.status(400).json({ error: 'customer_email or catalog_id required' });

    let deleted = 0;
    const batchSize = 200;

    while (true) {
      let q = supabaseAdmin.from('product_catalog').select('id').limit(batchSize);
      if (catalog_id) q = q.eq('catalog_id', catalog_id);
      else q = q.eq('customer_email', customer_email);

      const { data: batch } = await q;
      if (!batch || batch.length === 0) break;

      const ids = batch.map(r => r.id);
      await supabaseAdmin.from('product_catalog').delete().in('id', ids);
      deleted += ids.length;
      if (ids.length < batchSize) break;
    }

    return res.status(200).json({ deleted });
  } catch (e) {
    console.error('[deleteCustomerProducts]', e);
    return res.status(500).json({ error: e.message });
  }
}
