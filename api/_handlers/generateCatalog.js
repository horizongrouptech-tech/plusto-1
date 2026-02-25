import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const body = req.body ?? {};
    const customer_email = body.customer_email;
    const catalog_id = body.catalog_id || body.selectedCatalogId;
    const business_type = body.business_type;
    const product_count = body.product_count || body.productsCount || 200;
    const generation_metadata = body.generation_metadata || {};

    // If catalog_name provided but no catalog_id, create a new catalog
    if (!catalog_id && body.catalog_name) {
      const { data: newCatalog, error } = await supabaseAdmin.from('catalog').insert({
        customer_email,
        catalog_name: body.catalog_name,
        creation_method: 'ai_generated',
        status: 'generating',
        generation_metadata,
      }).select().single();

      if (error) throw new Error(`Error creating catalog: ${error.message}`);

      const { data: processStatus } = await supabaseAdmin.from('process_status').insert({
        customer_email,
        process_type: 'catalog_generation',
        status: 'running',
        progress: 10,
        current_step: 'מתחיל ביצירת קטלוג...',
        catalog_id: newCatalog.id,
        started_at: new Date().toISOString(),
      }).select().single();

      // Trigger worker in background
      const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      fetch(`${siteUrl}/api/generateCatalogWorker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_email, business_type, product_count, catalog_id: newCatalog.id, process_id: processStatus?.id, generation_metadata }),
      }).catch((e) => console.error('Error triggering generateCatalogWorker:', e.message));

      return res.status(200).json({ success: true, message: 'תהליך יצירת הקטלוג החל ברקע.', process_id: processStatus?.id, catalog_id: newCatalog.id });
    }

    if (!customer_email || !catalog_id) {
      return res.status(400).json({ success: false, error: 'חסרים נתונים נדרשים: customer_email ו-catalog_id' });
    }

    await supabaseAdmin.from('catalog').update({ status: 'generating', last_generated_at: new Date().toISOString() }).eq('id', catalog_id);

    const { data: processStatus } = await supabaseAdmin.from('process_status').insert({
      customer_email, process_type: 'catalog_generation', status: 'running', progress: 10,
      current_step: 'מתחיל ביצירת קטלוג...', catalog_id, started_at: new Date().toISOString(),
    }).select().single();

    const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    fetch(`${siteUrl}/api/generateCatalogWorker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ customer_email, business_type, product_count, catalog_id, process_id: processStatus?.id, generation_metadata }),
    }).catch((e) => console.error('Error triggering generateCatalogWorker:', e.message));

    return res.status(200).json({ success: true, message: 'תהליך יצירת הקטלוג החל ברקע.', process_id: processStatus?.id, catalog_id });
  } catch (error) {
    console.error('[generateCatalog]', error);
    return res.status(500).json({ success: false, error: error.message || 'שגיאה בהתחלת תהליך יצירת הקטלוג' });
  }
}
