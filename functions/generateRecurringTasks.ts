import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { add, format, startOfDay, isAfter, isSameDay } from 'npm:date-fns@3.6.0';

// פונקציית עזר למציאת היום הבא מרשימת ימים ספציפיים
function findNextOccurrence(fromDate, daysOfWeek) {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return add(fromDate, { weeks: 1 });
  }

  let current = startOfDay(add(fromDate, { days: 1 }));
  const maxIterations = 14;
  let iterations = 0;

  while (iterations < maxIterations) {
    if (daysOfWeek.includes(current.getDay())) {
      return current;
    }
    current = add(current, { days: 1 });
    iterations++;
  }

  return current;
}

// פונקציה להפעלה תקופתית (יומית) או קריאה ידנית
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = startOfDay(new Date());

    // מצא משימות חוזרות שהושלמו ופעילות
    const completedRecurringTasks = await base44.asServiceRole.entities.CustomerGoal.filter({
      task_type: 'recurring',
      status: 'done',
      is_active: true,
      is_recurring_active: true
    });

    const tasksProcessed = [];

    for (const task of completedRecurringTasks) {
      const lastCompleted = task.last_completed_at 
        ? startOfDay(new Date(task.last_completed_at))
        : startOfDay(new Date(task.updated_date));

      let nextDueDate;

      // חישוב התאריך הבא לפי תבנית החזרה
      switch (task.recurrence_pattern) {
        case 'daily':
          nextDueDate = add(lastCompleted, { days: 1 });
          break;
        case 'weekly':
          nextDueDate = add(lastCompleted, { weeks: 1 });
          break;
        case 'monthly':
          const dayToUse = task.day_of_month || 1;
          nextDueDate = add(lastCompleted, { months: 1 });
          nextDueDate.setDate(Math.min(dayToUse, new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 0).getDate()));
          break;
        case 'specific_days':
          nextDueDate = findNextOccurrence(lastCompleted, task.specific_days_of_week);
          break;
        default:
          console.warn(`Unknown recurrence pattern: ${task.recurrence_pattern}`);
          continue;
      }

      // בדוק אם הגענו לתאריך סיום
      if (task.recurrence_end_date) {
        const endDate = startOfDay(new Date(task.recurrence_end_date));
        if (isAfter(nextDueDate, endDate)) {
          await base44.asServiceRole.entities.CustomerGoal.update(task.id, {
            is_recurring_active: false,
            is_active: false
          });
          tasksProcessed.push({ taskId: task.id, action: 'deactivated_end_date_reached' });
          continue;
        }
      }

      // בדוק אם הגענו למספר החזרות המקסימלי
      if (task.recurrence_count && task.recurrence_count > 0) {
        const timesCompleted = task.times_completed || 0;
        if (timesCompleted >= task.recurrence_count) {
          await base44.asServiceRole.entities.CustomerGoal.update(task.id, {
            is_recurring_active: false,
            is_active: false
          });
          tasksProcessed.push({ taskId: task.id, action: 'deactivated_count_reached' });
          continue;
        }
      }

      // צור משימה חדשה רק אם התאריך הבא הוא היום או בעבר
      if (isSameDay(nextDueDate, today) || isAfter(today, nextDueDate)) {
        // צור עותק חדש של המשימה
        const newTask = {
          name: task.name,
          notes: task.notes,
          customer_email: task.customer_email,
          assignee_email: task.assignee_email,
          status: 'open',
          start_date: format(nextDueDate, 'yyyy-MM-dd'),
          end_date: format(nextDueDate, 'yyyy-MM-dd'),
          task_type: 'recurring',
          recurrence_pattern: task.recurrence_pattern,
          specific_days_of_week: task.specific_days_of_week,
          day_of_month: task.day_of_month,
          recurrence_end_date: task.recurrence_end_date,
          recurrence_count: task.recurrence_count,
          parent_recurring_task_id: task.id,
          is_recurring_active: true,
          is_active: true,
          times_completed: 0,
          due_time: task.due_time,
          tagged_users: task.tagged_users,
          responsible_users: task.responsible_users,
          weight: task.weight || 1,
          order_index: task.order_index || 0
        };

        await base44.asServiceRole.entities.CustomerGoal.create(newTask);

        // עדכן את המשימה המקורית - חזור ל-open
        await base44.asServiceRole.entities.CustomerGoal.update(task.id, {
          status: 'open',
          last_completed_at: new Date().toISOString(),
          next_occurrence_date: format(nextDueDate, 'yyyy-MM-dd')
        });

        tasksProcessed.push({ taskId: task.id, action: 'created_next_occurrence', nextDate: format(nextDueDate, 'yyyy-MM-dd') });
      }
    }

    return Response.json({
      success: true,
      message: `Successfully processed ${tasksProcessed.length} recurring tasks.`,
      details: tasksProcessed
    });

  } catch (error) {
    console.error('Error in generateRecurringTasks function:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});