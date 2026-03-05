import { requireAuth, supabaseAdmin, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email, forecast_type = 'conservative', target_revenue } = req.body ?? {};
    const email = customer_email || user.email;

    const { data: profile } = await supabaseAdmin
      .from('onboarding_request')
      .select('business_name, business_type')
      .eq('email', email)
      .single();

    // Get sample products
    const { data: products } = await supabaseAdmin
      .from('product_catalog')
      .select('product_name, selling_price, cost_price, category')
      .eq('customer_email', email)
      .limit(30);

    const schema = {
      monthly_forecast: [{
        month: 'number',
        revenue: 'number',
        units_sold: 'number',
        top_products: ['string'],
      }],
      annual_revenue: 'number',
      growth_rate: 'number',
      notes: 'string',
    };

    const result = await openRouterAPI({
      prompt: `צור תחזית מכירות ל-12 חודשים עבור "${profile?.business_name || email}".
סוג עסק: ${profile?.business_type}. סוג תחזית: ${forecast_type}.
${target_revenue ? `יעד הכנסה שנתי: ${target_revenue} ₪.` : ''}
מוצרים לדוגמה: ${JSON.stringify((products || []).slice(0, 10))}.
כלול חודשיות עם עונתיות ריאלית.`,
      response_json_schema: schema,
    });

    return res.status(200).json(result);
  } catch (e) {
    console.error('[generateSalesForecastAI]', e);
    return res.status(500).json({ error: e.message });
  }
}
