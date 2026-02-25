import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { forecastId, strategicInputId } = req.body ?? {};
    if (!forecastId) return res.status(400).json({ error: 'Missing forecastId for text generation' });

    const { data: forecast } = await supabaseAdmin.from('business_forecast').select('*').eq('id', forecastId).single();
    const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('email', forecast?.customer_email).limit(1);
    const customer = profiles?.[0];

    let strategicInput = null;
    if (strategicInputId) {
      const { data } = await supabaseAdmin.from('strategic_plan_input').select('*').eq('id', strategicInputId).single();
      strategicInput = data;
    }

    if (!forecast || !customer) {
      throw new Error('Could not retrieve forecast or customer data for text generation');
    }

    const plannedHiresText = forecast.planned_employee_hires?.map((hire) => {
      let comp = '';
      if (hire.compensation_model) {
        comp = `    - מודל בסיס: ${hire.compensation_model.base?.type} (${hire.compensation_model.base?.amount_nis} ש"ח)`;
      }
      return `\n        - תפקיד: ${hire.role} (${hire.count} עובד/ים)\n        - חודש גיוס: ${hire.month_of_hire}\n        - שכר חודשי משוער: ${hire.estimated_monthly_salary} ש"ח${comp ? '\n' + comp : ''}`;
    }).join('\n') || 'אין גיוסים מתוכננים.';

    const prompt = `אתה יועץ עסקי אסטרטגי ומנהל כספים. עליך לכתוב תוכנית עסקית מקיפה בפורמט Markdown עבור העסק "${customer.business_name}" לשנת ${forecast.forecast_year}.

מידע על העסק:
- שם: ${customer.business_name || 'לא צוין'}
- סוג: ${customer.business_type || 'לא צוין'}
- מחזור חודשי נוכחי: ${customer.monthly_revenue?.toLocaleString() || '0'} ש"ח
- מיקום: ${customer.address?.city || customer.city || 'לא צוין'}
- יעדים עסקיים: ${customer.business_goals || 'לא צוינו'}

תחזית פיננסית:
- סך הכנסות צפויות: ${forecast.profit_loss_summary?.total_revenue?.toLocaleString() || '0'} ש"ח
- סך הוצאות צפויות: ${forecast.profit_loss_summary?.total_expenses?.toLocaleString() || '0'} ש"ח
- רווח נקי צפוי: ${forecast.profit_loss_summary?.net_profit?.toLocaleString() || '0'} ש"ח

תכנון כוח אדם: ${plannedHiresText}

${strategicInput ? `מידע אסטרטגי:
- חזון לשנה: ${strategicInput.vision_for_next_year || 'לא סופק'}
- יעדי 3 שנים: ${strategicInput.three_year_profit_goal || 'לא סופק'}
- אתגרים: ${strategicInput.main_challenges || 'לא סופקו'}` : ''}

כתוב תוכנית עסקית הכוללת: תקציר מנהלים, ניתוח מצב נוכחי, יעדים, אסטרטגיית שיווק, תוכנית כוח אדם, תחזית פיננסית, ניתוח סיכונים, ולוח זמנים. Markdown בלבד.`;

    const generatedText = await invokeLLM({ prompt });

    await supabaseAdmin.from('business_forecast').update({ business_plan_text: generatedText }).eq('id', forecastId);

    return res.status(200).json({ success: true, business_plan_text: generatedText, forecastId });
  } catch (error) {
    console.error('[generateBusinessPlanText]', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to generate business plan text' });
  }
}
