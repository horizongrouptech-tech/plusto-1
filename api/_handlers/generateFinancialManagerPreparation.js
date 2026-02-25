import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email, meeting_date, manager_email } = req.body ?? {};
    if (!customer_email) return res.status(400).json({ error: 'customer_email is required' });

    // Fetch customer data
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('email', customer_email).single();
    const { data: recommendations } = await supabaseAdmin.from('recommendation').select('*').eq('customer_email', customer_email).eq('status', 'pending').limit(5);
    const { data: goals } = await supabaseAdmin.from('customer_goal').select('*').eq('customer_email', customer_email).eq('status', 'open').limit(5);

    const prompt = `אתה מנהל כספים מנוסה המתכונן לפגישה עם לקוח.

פרטי הלקוח:
- שם: ${profile?.full_name || profile?.business_name || customer_email}
- סוג עסק: ${profile?.business_type || 'לא צוין'}
- מחזור חודשי: ${profile?.monthly_revenue ? `₪${profile.monthly_revenue.toLocaleString()}` : 'לא צוין'}

המלצות פתוחות (${recommendations?.length || 0}):
${(recommendations || []).map((r) => `- ${r.title} (${r.category}) - רווח צפוי: ₪${(r.expected_profit || 0).toLocaleString()}`).join('\n') || 'אין המלצות פתוחות'}

יעדים פתוחים (${goals?.length || 0}):
${(goals || []).map((g) => `- ${g.name} (${g.status})`).join('\n') || 'אין יעדים פתוחים'}

תאריך פגישה: ${meeting_date || 'לא צוין'}

הכן סיכום הכנה לפגישה הכולל:
1. נקודות עיקריות לדיון
2. שאלות מפתח לשאול את הלקוח
3. המלצות לדיון
4. יעדים להשיג בפגישה`;

    const preparation = await invokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          discussion_points: { type: 'array', items: { type: 'string' } },
          key_questions: { type: 'array', items: { type: 'string' } },
          recommendations_to_present: { type: 'array', items: { type: 'string' } },
          meeting_goals: { type: 'array', items: { type: 'string' } },
          customer_summary: { type: 'string' },
        },
      },
    });

    return res.status(200).json({ success: true, preparation, customer_name: profile?.full_name || profile?.business_name || customer_email });
  } catch (error) {
    console.error('[generateFinancialManagerPreparation]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
