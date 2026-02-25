import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email, forecast_year, financial_data } = req.body ?? {};
    if (!customer_email) return res.status(400).json({ error: 'customer_email is required' });

    const year = forecast_year || new Date().getFullYear() + 1;
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('email', customer_email).single();

    const forecastData = await invokeLLM({
      prompt: `אתה מנתח פיננסי מומחה. צור תחזית עסקית מלאה לשנת ${year} עבור העסק "${profile?.business_name || customer_email}".
סוג עסק: ${profile?.business_type || 'לא צוין'}
מחזור חודשי נוכחי: ${profile?.monthly_revenue ? `₪${profile.monthly_revenue.toLocaleString()}` : 'לא צוין'}
${financial_data ? `נתונים פיננסיים נוספים: ${JSON.stringify(financial_data)}` : ''}
צור תחזית הכוללת: הכנסות חודשיות, הוצאות מרכזיות, רווח גולמי ורווח נקי. הנח צמיחה ריאלית של 10-15%.`,
      response_json_schema: {
        type: 'object',
        properties: {
          forecast_year: { type: 'number' },
          monthly_revenue: { type: 'array', items: { type: 'object', properties: { month: { type: 'number' }, revenue: { type: 'number' }, expenses: { type: 'number' }, profit: { type: 'number' } } } },
          profit_loss_summary: { type: 'object', properties: { total_revenue: { type: 'number' }, total_expenses: { type: 'number' }, gross_profit: { type: 'number' }, net_profit: { type: 'number' } } },
          assumptions: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    // Save forecast to database
    const { data: newForecast, error } = await supabaseAdmin.from('business_forecast').insert({
      customer_email,
      forecast_year: year,
      monthly_revenue: forecastData.monthly_revenue,
      profit_loss_summary: forecastData.profit_loss_summary,
      status: 'draft',
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, forecast_id: newForecast.id, forecast: forecastData, message: 'תחזית עסקית נוצרה בהצלחה' });
  } catch (error) {
    console.error('[orchestrateBusinessForecast]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
