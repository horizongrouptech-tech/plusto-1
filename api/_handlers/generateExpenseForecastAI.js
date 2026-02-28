import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email, forecast_type = 'conservative', target_revenue, target_profit_margin } = req.body ?? {};
    const email = customer_email || user.email;

    const { data: profile } = await supabaseAdmin
      .from('onboarding_request')
      .select('business_name, business_type')
      .eq('email', email)
      .single();

    const schema = {
      monthly_expenses: [{
        month: 'number',
        marketing: 'number',
        admin: 'number',
        operations: 'number',
        other: 'number',
        total: 'number',
      }],
      annual_total: 'number',
      tax_rate: 'number',
      notes: 'string',
    };

    const maxExpenses = target_revenue && target_profit_margin
      ? target_revenue * (1 - target_profit_margin / 100)
      : null;

    const result = await invokeLLM({
      prompt: `צור תחזית הוצאות ל-12 חודשים עבור עסק מסוג "${profile?.business_type || 'כללי'}".
סוג תחזית: ${forecast_type}. ${maxExpenses ? `מגבלת הוצאות מרבית: ${maxExpenses} ₪/חודש.` : ''}
שעור מס חברות בישראל: 23%. פרק לשיווק/מכירות ואדמין/כללי.`,
      response_json_schema: schema,
    });

    return res.status(200).json(result);
  } catch (e) {
    console.error('[generateExpenseForecastAI]', e);
    return res.status(500).json({ error: e.message });
  }
}
