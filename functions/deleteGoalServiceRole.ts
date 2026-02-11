import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // רק admin או financial_manager יכולים למחוק
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { goal_id, delete_subtasks } = await req.json();

  if (!goal_id) {
    return Response.json({ error: 'goal_id is required' }, { status: 400 });
  }

  try {
    // שליפת היעד
    const goals = await base44.asServiceRole.entities.CustomerGoal.filter({ id: goal_id });
    if (!goals || goals.length === 0) {
      return Response.json({ error: 'Goal not found' }, { status: 404 });
    }

    const goal = goals[0];
    let deletedCount = 0;

    // מחיקת תת-משימות אם נדרש
    if (delete_subtasks) {
      const subtasks = await base44.asServiceRole.entities.CustomerGoal.filter({ parent_id: goal_id, is_active: true });
      for (const subtask of subtasks) {
        const payload = { is_active: false };
        if (!subtask.end_date || subtask.end_date === '' || subtask.end_date === 'null') {
          payload.end_date = subtask.start_date || new Date().toISOString().split('T')[0];
        }
        await base44.asServiceRole.entities.CustomerGoal.update(subtask.id, payload);
        deletedCount++;
      }
    }

    // מחיקת היעד עצמו
    const goalPayload = { is_active: false };
    if (!goal.end_date || goal.end_date === '' || goal.end_date === 'null') {
      goalPayload.end_date = goal.start_date || new Date().toISOString().split('T')[0];
    }
    await base44.asServiceRole.entities.CustomerGoal.update(goal_id, goalPayload);
    deletedCount++;

    return Response.json({ 
      success: true, 
      deleted_count: deletedCount,
      goal_name: goal.name
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});