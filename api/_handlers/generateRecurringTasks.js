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
      .select('business_name, business_type')
      .eq('email', email)
      .single();

    const schema = {
      tasks: [{
        title: 'string',
        description: 'string',
        frequency: 'daily | weekly | monthly',
        category: 'string',
        priority: 'high | medium | low',
      }],
    };

    const result = await openRouterAPI({
      prompt: `צור רשימת 8-12 משימות חוזרות (recurring tasks) חשובות לעסק מסוג "${profile?.business_type || 'כללי'}".
כלול משימות יומיות, שבועיות ותחזית חודשיות לניהול עסקי שוטף.
השתמש בעברית.`,
      response_json_schema: schema,
    });

    const tasks = (result?.tasks || []).map(t => ({
      ...t,
      customer_email: email,
      task_type: 'recurring',
      status: 'open',
      created_date: new Date().toISOString(),
    }));

    if (tasks.length > 0) {
      await supabaseAdmin.from('customer_goal').insert(tasks);
    }

    return res.status(200).json({ created: tasks.length, tasks });
  } catch (e) {
    console.error('[generateRecurringTasks]', e);
    return res.status(500).json({ error: e.message });
  }
}
