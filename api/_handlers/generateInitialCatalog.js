import { requireAuth, supabaseAdmin, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email } = req.body ?? {};
    const email = customer_email || user.email;

    const { data: profile } = await supabaseAdmin
      .from('onboarding_request')
      .select('business_name, business_type, city')
      .eq('email', email)
      .single();

    // Create catalog record
    const { data: catalog, error: catalogErr } = await supabaseAdmin
      .from('catalog')
      .insert({
        customer_email: email,
        name: `קטלוג ראשוני - ${profile?.business_name || email}`,
        status: 'generating',
        created_date: new Date().toISOString(),
      })
      .select()
      .single();
    if (catalogErr) throw new Error(catalogErr.message);

    const schema = {
      products: [{
        product_name: 'string',
        category: 'string',
        description: 'string',
        selling_price: 'number',
        cost_price: 'number',
        barcode: 'string or null',
      }],
    };

    const result = await openRouterAPI({
      prompt: `צור קטלוג מוצרים ראשוני של 15-20 מוצרים טיפוסיים לעסק מסוג "${profile?.business_type || 'כללי'}".
שם עסק: ${profile?.business_name}. עיר: ${profile?.city || 'ישראל'}.
כלול מחירי עלות ומכירה ריאליים בשקלים.`,
      response_json_schema: schema,
    });

    const products = (result?.products || []).map(p => ({
      ...p,
      catalog_id: catalog.id,
      customer_email: email,
      data_quality: 'complete',
      created_date: new Date().toISOString(),
    }));

    // Bulk insert in batches of 10
    for (let i = 0; i < products.length; i += 10) {
      await supabaseAdmin.from('product_catalog').insert(products.slice(i, i + 10));
    }

    await supabaseAdmin.from('catalog')
      .update({ status: 'ready', product_count: products.length })
      .eq('id', catalog.id);

    return res.status(200).json({ catalog_id: catalog.id, products_created: products.length });
  } catch (e) {
    console.error('[generateInitialCatalog]', e);
    return res.status(500).json({ error: e.message });
  }
}
