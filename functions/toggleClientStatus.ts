import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// פונקציה זו משנה את סטטוס הפעילות של לקוח (מעבירה לארכיון או מפעילה מחדש)
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // ודא שרק מנהל מערכת או מנהל כספים יכול לבצע פעולה זו
        if (!user || (user.role !== 'admin' && user.user_type !== 'financial_manager')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { clientId, isActive } = await req.json();

        if (!clientId || typeof isActive !== 'boolean') {
            return new Response(JSON.stringify({ error: 'Missing required fields: clientId and isActive' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // השתמש בהרשאות מנהל כדי לעדכן משתמש אחר
        const updatedUser = await base44.asServiceRole.entities.User.update(clientId, { is_active: isActive });

        return new Response(JSON.stringify({ success: true, updatedUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in toggleClientStatus function:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});