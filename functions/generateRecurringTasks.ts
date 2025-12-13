import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { add, format } from 'npm:date-fns@3.6.0';

// This function is designed to be run periodically (e.g., daily)
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req).asServiceRole;

        const today = new Date();

        // Find recurring tasks that have been completed
        const completedRecurringTasks = await base44.entities.CustomerGoal.filter({
            task_type: 'recurring',
            status: 'done',
            is_active: true
        });

        const newTasksToCreate = [];

        for (const task of completedRecurringTasks) {
            const lastCompleted = new Date(task.last_completed_at || task.updated_date);
            let nextDueDate;

            switch (task.recurrence_pattern) {
                case 'daily':
                    nextDueDate = add(lastCompleted, { days: 1 });
                    break;
                case 'weekly':
                    nextDueDate = add(lastCompleted, { weeks: 1 });
                    break;
                case 'monthly':
                    nextDueDate = add(lastCompleted, { months: 1 });
                    break;
                default:
                    continue; // Skip if pattern is not recognized
            }

            // Only create the new task if the next due date is in the past or today
            if (nextDueDate <= today) {
                newTasksToCreate.push({
                    ...task,
                    status: 'open',
                    start_date: format(nextDueDate, 'yyyy-MM-dd'),
                    end_date: format(nextDueDate, 'yyyy-MM-dd'), // For daily tasks, start and end are same
                    last_completed_at: null,
                    // remove fields that should not be copied
                    id: undefined, 
                    created_date: undefined,
                    updated_date: undefined,
                });

                // Deactivate the old completed task to prevent re-creation
                await base44.entities.CustomerGoal.update(task.id, { is_active: false });
            }
        }

        if (newTasksToCreate.length > 0) {
            await base44.entities.CustomerGoal.bulkCreate(newTasksToCreate);
        }

        return new Response(JSON.stringify({ message: `Successfully processed recurring tasks. Created ${newTasksToCreate.length} new tasks.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in generateRecurringTasks function:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});