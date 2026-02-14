import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { customer_email } = await req.json();

        if (!customer_email) {
            return new Response(JSON.stringify({ error: 'Customer email is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const CHUNK_SIZE = 1000;
        // שליפה במנה בלבד – 1000 תנועות בכל פעם, מחיקה, ואז שליפה של 1000 הבאות (לא טוען את כל הנתונים לזיכרון)
        const entries = await base44.asServiceRole.entities.CashFlow.filter(
            { customer_email },
            'date',
            CHUNK_SIZE
        );

        if (entries.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                deletedCount: 0,
                hasMore: false,
                message: 'אין תנועות למחוק'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const deletePromises = entries.map(entry =>
            base44.asServiceRole.entities.CashFlow.delete(entry.id)
        );
        await Promise.all(deletePromises);

        const hasMore = entries.length === CHUNK_SIZE;

        return new Response(JSON.stringify({
            success: true,
            deletedCount: entries.length,
            hasMore,
            message: hasMore
                ? `נמחקו ${entries.length} תנועות. ממשיך...`
                : `כל נתוני התזרים נמחקו בהצלחה - ${entries.length} תנועות`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error deleting cash flow permanently:', error);
        return new Response(JSON.stringify({
            error: 'שגיאה במחיקת התזרים',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
