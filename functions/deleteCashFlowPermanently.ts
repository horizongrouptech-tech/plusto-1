import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * מחיקת תזרים מזומנים של לקוח.
 * גישה: מנה אחת בכל קריאה; מחיקה בתת-מנות עם השהייה כדי להימנע מ-Rate Limit (429).
 */
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

        const CHUNK_SIZE = 200;
        const SUB_BATCH_SIZE = 40;   // מקסימום מחיקות מקבילות – מפחית עומס על ה-API
        const DELAY_MS = 120;        // השהייה בין תת-מנות (מפחית rate limit)

        const entries = await base44.asServiceRole.entities.CashFlow.filter(
            { customer_email },
            'date',
            CHUNK_SIZE
        );

        let totalDeleted = 0;
        if (entries && entries.length > 0) {
            for (let i = 0; i < entries.length; i += SUB_BATCH_SIZE) {
                const sub = entries.slice(i, i + SUB_BATCH_SIZE);
                const results = await Promise.allSettled(
                    sub.map(entry => base44.asServiceRole.entities.CashFlow.delete(entry.id))
                );
                totalDeleted += results.filter(r => r.status === 'fulfilled').length;
                if (i + SUB_BATCH_SIZE < entries.length) {
                    await new Promise(r => setTimeout(r, DELAY_MS));
                }
            }
        }

        const hasMore = entries?.length === CHUNK_SIZE;

        return new Response(JSON.stringify({
            success: true,
            deletedCount: totalDeleted,
            hasMore,
            message: hasMore
                ? `נמחקו ${totalDeleted} תנועות. ממשיך...`
                : totalDeleted > 0
                    ? `כל נתוני התזרים נמחקו בהצלחה - ${totalDeleted} תנועות`
                    : 'אין תנועות למחוק'
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