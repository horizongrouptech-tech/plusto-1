import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email, forecast_type = 'conservative', strategic_goals } = req.body ?? {};
    const email = customer_email || user.email;

    const { data: profile } = await supabaseAdmin
      .from('onboarding_request')
      .select('business_name, business_type, company_size')
      .eq('email', email)
      .single();

    const schema = {
      current_employees: [{ role: 'string', count: 'number', monthly_salary: 'number' }],
      new_hires_planned: [{ role: 'string', count: 'number', monthly_salary: 'number', start_month: 'number' }],
      total_annual_salary_cost: 'number',
      monthly_salary_cost: 'number',
      notes: 'string',
    };

    const result = await invokeLLM({
      prompt: `צור תחזית כוח אדם ל-12 חודשים הקרובים עבור עסק מסוג "${profile?.business_type || 'כללי'}".
גודל חברה: ${profile?.company_size || 'לא ידוע'}. סוג תחזית: ${forecast_type}.
יעדים אסטרטגיים: ${JSON.stringify(strategic_goals || {})}.
החזר רשימת עובדים קיימים ועובדים שתכנון להוסיף, עם עלויות שכר.`,
      response_json_schema: schema,
    });

    return res.status(200).json(result);
  } catch (e) {
    console.error('[generateEmployeeForecastAI]', e);
    return res.status(500).json({ error: e.message });
  }
}
