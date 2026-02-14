import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * מחיקת תזרים מזומנים של לקוח.
 * גישה: מחיקת מנה אחת בלבד בכל קריאה כדי למנוע Rate Limit (429).
 * הלקוח ימשיך לקרוא עד hasMore=false.
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

        const CHUNK_SIZE = 1000; // מספר הרשומות למחיקה בכל מנה
        let totalDeleted = 0;

        console.log(`Cash flow deletion for ${customer_email} (one chunk per request)`);

        // נמשוך רק מנה אחת של רשומות
        const entries = await base44.asServiceRole.entities.CashFlow.filter(
            { customer_email },
            'date',
            CHUNK_SIZE
        );

        if (entries && entries.length > 0) {
            const deleteResults = await Promise.allSettled(
                entries.map(entry => base44.asServiceRole.entities.CashFlow.delete(entry.id))
            );
            const succeeded = deleteResults.filter(r => r.status === 'fulfilled').length;
            const failed = deleteResults.filter(r => r.status === 'rejected').length;
            totalDeleted += succeeded;
            if (failed > 0) console.warn(`Batch: ${succeeded} deleted, ${failed} failed`);
        }

        // דגל hasMore יהיה נכון אם מספר הרשומות שנמשכו שווה לגודל החבילה
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