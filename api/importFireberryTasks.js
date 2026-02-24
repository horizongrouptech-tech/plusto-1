import { supabaseAdmin } from './_helpers.js';

/**
 * POST /api/importFireberryTasks
 * Called by Fireberry webhook — authenticated with a secret token, NOT a user JWT.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Fireberry authenticates with a shared secret token
  const providedToken =
    (req.headers.authorization || '').replace('Bearer ', '') ||
    req.query?.token;
  const expectedToken = process.env.FIREBERRY_WEBHOOK_SECRET;

  if (!expectedToken) return res.status(500).json({ error: 'Server configuration error' });
  if (!providedToken || providedToken !== expectedToken) {
    return res.status(401).json({ error: 'Invalid or missing authentication token' });
  }

  try {
    const body = req.body ?? {};
    let tasks;
    let action = 'import';

    if (body.taskid) {
      tasks = [body];
    } else if (body.tasks && Array.isArray(body.tasks)) {
      tasks = body.tasks;
      action = body.action || 'import';
    } else if (Array.isArray(body)) {
      tasks = body;
    } else {
      return res.status(400).json({ error: 'Invalid request format. Expected task object with taskid or tasks array.' });
    }

    const STATUS_MAP = { 1: 'open', 11: 'in_progress', 10: 'done', 12: 'cancelled' };
    const { data: allOnboarding } = await supabaseAdmin.from('onboarding_request').select('email, fireberry_account_id, assigned_financial_manager_email, business_name, full_name');

    const results = { success: 0, failed: 0, errors: [], imported_tasks: [] };

    for (const fbTask of tasks) {
      try {
        let existingTask = null;
        if (fbTask.pcfPlastoTaskId) {
          const { data } = await supabaseAdmin.from('customer_goal').select('*').eq('id', fbTask.pcfPlastoTaskId).single();
          existingTask = data;
        }

        let customerEmail = null;
        const fireberryAccountId = fbTask.pcfsystemfield35 || fbTask.objectid || fbTask.accountid || fbTask.parentcustomerid;

        if (fireberryAccountId) {
          const matched = (allOnboarding || []).find((c) => c.fireberry_account_id === fireberryAccountId);
          if (matched) customerEmail = matched.email;
        }

        let assigneeEmail = null;
        if (fbTask.ownerid) {
          const { data: assignees } = await supabaseAdmin.from('profiles').select('email').eq('fireberry_user_id', fbTask.ownerid).limit(1);
          if (assignees?.[0]) assigneeEmail = assignees[0].email;
        }

        const taskData = {
          name: fbTask.subject || 'משימה ללא כותרת',
          notes: fbTask.description || null,
          status: STATUS_MAP[fbTask.statuscode] || 'open',
          end_date: fbTask.scheduledend ? fbTask.scheduledend.split('T')[0] : new Date().toISOString().split('T')[0],
          end_date_time: fbTask.scheduledend || null,
          reminder_date: fbTask.reminderdate || null,
          customer_email: customerEmail,
          related_fireberry_account_id: fireberryAccountId || null,
          assignee_email: assigneeEmail,
          task_type: existingTask?.task_type || 'goal',
          is_active: true,
          fireberry_task_id: fbTask.taskid,
          fireberry_synced_at: new Date().toISOString(),
        };

        let finalTask;
        if (existingTask) {
          await supabaseAdmin.from('customer_goal').update({ ...taskData, is_active: existingTask.is_active !== false }).eq('id', existingTask.id);
          finalTask = existingTask;
        } else {
          const { data } = await supabaseAdmin.from('customer_goal').insert({ ...taskData, start_date: new Date().toISOString().split('T')[0], order_index: 0 }).select().single();
          finalTask = data;
        }

        results.success++;
        results.imported_tasks.push({ fireberry_id: fbTask.taskid, plasto_id: finalTask?.id, subject: taskData.name, action: existingTask ? 'updated' : 'created' });
      } catch (err) {
        results.failed++;
        results.errors.push({ fireberry_id: fbTask.taskid, subject: fbTask.subject, error: err.message });
      }
    }

    return res.status(200).json({ message: 'Import completed', total: tasks.length, ...results });
  } catch (error) {
    console.error('[importFireberryTasks]', error);
    return res.status(500).json({ error: error.message });
  }
}
