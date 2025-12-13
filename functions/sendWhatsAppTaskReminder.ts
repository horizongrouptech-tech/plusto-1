import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { differenceInHours } from 'npm:date-fns@3.6.0';

// This function is designed to be run periodically (e.g., hourly)
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req).asServiceRole;
        const now = new Date();

        // Find open tasks with a due time
        const openTasks = await base44.entities.CustomerGoal.filter({
            status: { $in: ['open', 'in_progress'] },
            is_active: true,
            due_time: { $ne: null }
        });

        const remindersToSend = [];

        for (const task of openTasks) {
            if (!task.end_date || !task.due_time) continue;

            const [hours, minutes] = task.due_time.split(':');
            const dueDate = new Date(task.end_date);
            dueDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            
            const hoursUntilDue = differenceInHours(dueDate, now);

            // Send reminder if due within 2 hours, but not in the past
            if (hoursUntilDue >= 0 && hoursUntilDue <= 2) {
                if (task.assignee_email) {
                    // We need to get the manager's phone number
                    const [manager] = await base44.entities.User.filter({ email: task.assignee_email });
                    if (manager && manager.phone) {
                        remindersToSend.push({
                            to: manager.phone,
                            message: `*תזכורת ממערכת Horizon:* \nהמשימה "${task.name}" עומדת להסתיים בקרוב (בשעה ${task.due_time}).\nלקוח: ${task.customer_email}`
                        });
                    }
                }
            }
        }
        
        // This part requires a function to send WhatsApp messages.
        // Assuming a function 'sendWhatsAppMessage' exists.
        for (const reminder of remindersToSend) {
            // This is a conceptual call. The actual implementation depends on the WhatsApp service.
            await base44.functions.invoke('sendWhatsAppMessage', { to: reminder.to, body: reminder.message });
        }

        return new Response(JSON.stringify({ message: `Sent ${remindersToSend.length} WhatsApp reminders.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in sendWhatsAppTaskReminder function:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});