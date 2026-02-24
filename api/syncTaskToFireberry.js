import { requireAuth, supabaseAdmin } from './_helpers.js';

const STATUS_TO_FIREBERRY = { open: 1, in_progress: 11, done: 10, delayed: 1, cancelled: 12 };
const FIREBERRY_WEBHOOK_URL = 'https://hook.eu1.make.com/skhp75w9syp62m9c8hrcunmnk7aat2fi';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { taskId } = req.body ?? {};
    if (!taskId) return res.status(400).json({ error: 'Task ID is required' });

    const { data: task, error: taskErr } = await supabaseAdmin
      .from('customer_goal')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskErr || !task) return res.status(404).json({ error: 'Task not found' });

    const isNewTask = !task.fireberry_task_id;
    let customerName = '';
    let businessName = '';
    let fireberryAccountId = task.related_fireberry_account_id || null;

    if (task.customer_email) {
      const cleanEmail = task.customer_email.trim().toLowerCase();

      // Search OnboardingRequest
      const { data: onboarding } = await supabaseAdmin
        .from('onboarding_request')
        .select('email, full_name, business_name, fireberry_account_id');

      const match = (onboarding || []).find(
        (c) => c.email && c.email.trim().toLowerCase() === cleanEmail,
      );
      if (match) {
        customerName = match.full_name || '';
        businessName = match.business_name || '';
        fireberryAccountId = match.fireberry_account_id || fireberryAccountId;
      } else {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name, business_name, fireberry_account_id')
          .eq('email', task.customer_email);

        const pm = (profiles || [])[0];
        if (pm) {
          customerName = pm.full_name || '';
          businessName = pm.business_name || '';
          fireberryAccountId = pm.fireberry_account_id || fireberryAccountId;
        }
      }
    }

    // Get assignee fireberry user id
    let assigneeFireberryUserId = null;
    if (task.assignee_email) {
      const { data: assignees } = await supabaseAdmin
        .from('profiles')
        .select('fireberry_user_id')
        .eq('email', task.assignee_email)
        .limit(1);
      if (assignees && assignees[0]?.fireberry_user_id) {
        assigneeFireberryUserId = assignees[0].fireberry_user_id;
      }
    }

    const fireberryPayload = {
      taskid: task.fireberry_task_id || null,
      pcfPlastoTaskId: task.id,
      subject: task.name,
      description: task.notes || '',
      statuscode: STATUS_TO_FIREBERRY[task.status] || 1,
      scheduledend: task.end_date_time || (task.end_date ? new Date(task.end_date).toISOString() : null),
      pcfActualEndDate: task.status === 'done' ? new Date().toISOString() : null,
      pcfsystemfield35: fireberryAccountId,
      customer_name: customerName,
      business_name: businessName,
      ownerid: assigneeFireberryUserId,
      reminderdate: task.reminder_date || null,
      isNewTask,
      itemType: task.task_type === 'goal' ? 'goal' : 'task',
      taskType: task.task_type || 'one_time',
    };

    const response = await fetch(FIREBERRY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fireberryPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fireberry webhook failed: ${response.status} ${errText}`);
    }

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = await response.text();
    }

    const updateData = {
      fireberry_synced_at: new Date().toISOString(),
      is_active: task.is_active !== false,
    };
    if (isNewTask && responseData?.taskid) {
      updateData.fireberry_task_id = responseData.taskid;
    }

    await supabaseAdmin.from('customer_goal').update(updateData).eq('id', taskId);

    return res.status(200).json({ success: true, message: 'Task synced to Fireberry successfully', fireberry_response: responseData });
  } catch (error) {
    console.error('[syncTaskToFireberry]', error);
    return res.status(500).json({ error: error.message, success: false });
  }
}
