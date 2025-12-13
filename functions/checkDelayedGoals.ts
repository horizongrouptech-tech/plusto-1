import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// This function is designed to be run periodically (e.g., daily) by a scheduler.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req).asServiceRole;

        const today = new Date().toISOString().split('T')[0];

        // Find tasks that are delayed
        const delayedTasks = await base44.entities.CustomerGoal.filter({
            end_date: { $lt: today },
            status: { $in: ['open', 'in_progress'] },
            is_active: true
        });

        if (delayedTasks.length === 0) {
            return new Response(JSON.stringify({ message: "No delayed tasks found." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const notificationsToCreate = [];
        const tasksToUpdate = [];

        for (const task of delayedTasks) {
            // Update the task status to 'delayed'
            tasksToUpdate.push(base44.entities.CustomerGoal.update(task.id, { status: 'delayed' }));
            
            // Prepare a notification if an assignee exists
            if (task.assignee_email) {
                notificationsToCreate.push({
                    recipient_email: task.assignee_email,
                    type: 'system',
                    title: `משימה באיחור: ${task.name}`,
                    message: `המשימה "${task.name}" עבור הלקוח ${task.customer_email} עברה את תאריך היעד שלה (${task.end_date}).`,
                    priority: 'high',
                    related_entity_id: task.id,
                    related_entity_type: 'CustomerGoal'
                });
            }
        }
        
        // Batch update tasks and create notifications
        if (tasksToUpdate.length > 0) {
            await Promise.all(tasksToUpdate);
        }
        if (notificationsToCreate.length > 0) {
            await base44.entities.Notification.bulkCreate(notificationsToCreate);
        }

        const summary = `Processed ${delayedTasks.length} tasks. Updated ${tasksToUpdate.length} to 'delayed' status and created ${notificationsToCreate.length} notifications.`;
        
        return new Response(JSON.stringify({ message: "Delayed tasks processed successfully.", summary }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in checkDelayedGoals function:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});