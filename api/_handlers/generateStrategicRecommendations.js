import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email, business_type, business_goals, target_audience, main_products_services, monthly_revenue } = req.body ?? {};
    if (!customer_email) return res.status(400).json({ error: 'customer_email is required' });

    const recommendationsData = await invokeLLM({
      prompt: `אתה יועץ עסקי מנוסה בישראל המתמחה במתן המלצות אסטרטגיות מעשיות.
פרטי העסק:
- סוג עסק: ${business_type || 'כללי'}
- יעדים עסקיים: ${business_goals || 'צמיחה ורווחיות'}
- קהל יעד: ${target_audience || 'לקוחות כלליים'}
- מוצרים/שירותים עיקריים: ${main_products_services || 'לא צוין'}
- מחזור חודשי משוער: ${monthly_revenue ? `₪${monthly_revenue}` : 'לא צוין'}
צור 5-8 המלצות אסטרטגיות מעשיות ובנות ביצוע. עבור כל המלצה כלול כותרת, תיאור, קטגוריה, רווח צפוי, אחוז שיפור, רמת מאמץ, שלבי ביצוע, וטווח זמן.`,
      response_json_schema: {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string', enum: ['pricing', 'promotions', 'suppliers', 'inventory', 'strategic_moves'] },
                expected_profit: { type: 'number' },
                profit_percentage: { type: 'number' },
                implementation_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                timeframe: { type: 'string' },
                action_steps: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    if (!recommendationsData?.recommendations?.length) {
      throw new Error('Failed to generate recommendations - empty response from AI');
    }

    const rows = recommendationsData.recommendations.map((rec) => ({
      customer_email,
      title: rec.title,
      description: rec.description,
      category: rec.category || 'strategic_moves',
      expected_profit: rec.expected_profit || 0,
      profit_percentage: rec.profit_percentage || 0,
      implementation_effort: rec.implementation_effort || 'medium',
      timeframe: rec.timeframe || '1-3 חודשים',
      action_steps: rec.action_steps || [],
      status: 'pending',
      priority: (rec.expected_profit || 0) > 5000 ? 'high' : 'medium',
      source: 'admin_generated',
    }));

    // Insert in batches of 5
    let createdCount = 0;
    for (let i = 0; i < rows.length; i += 5) {
      const batch = rows.slice(i, i + 5);
      const { error } = await supabaseAdmin.from('recommendation').insert(batch);
      if (!error) createdCount += batch.length;
    }

    return res.status(200).json({ success: true, message: `Generated ${createdCount} strategic recommendations`, recommendations_count: createdCount });
  } catch (error) {
    console.error('[generateStrategicRecommendations]', error);
    return res.status(500).json({ success: false, error: `Failed to generate strategic recommendations: ${error.message}` });
  }
}
