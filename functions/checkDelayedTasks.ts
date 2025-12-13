import { createClient } from 'npm:@base44/sdk@0.7.1';

// פונקציה זו מיועדת לריצה מתוזמנת (Cron Job)
// היא בודקת משימות שתאריך היעד שלהן עבר ומעדכנת את הסטטוס שלהן ל"delayed"
Deno.serve(async (req) => {
    try {
        const base44 = createClient({
            appId: Deno.env.get('BASE44_APP_ID'),
            serviceToken: Deno.env.get('BASE44_API_KEY')
        });

        const now = new Date().toISOString();
        
        // מצא את כל המשימות הפתוחות או בתהליך שתאריך היעד שלהן כבר עבר
        const overdueTasks = await base44.asServiceRole.entities.Task.filter({
            status: { $in: ['open', 'in_progress'] },
            deadline: { $lt: now }
        });

        if (overdueTasks.length === 0) {
            return Response.json({ success: true, message: 'No overdue tasks found.' });
        }

        console.log(`Found ${overdueTasks.length} overdue tasks to update.`);

        const updates = overdueTasks.map(task => 
            base44.asServiceRole.entities.Task.update(task.id, { status: 'delayed' })
        );

        await Promise.all(updates);

        return Response.json({ 
            success: true, 
            message: `Successfully updated ${overdueTasks.length} tasks to 'delayed'.` 
        });

    } catch (error) {
        console.error('Error in checkDelayedTasks:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});