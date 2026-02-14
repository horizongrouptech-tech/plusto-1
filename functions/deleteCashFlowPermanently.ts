import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * מחיקת כל תזרים המזומנים של לקוח.
 * גישה: שליפה במנות (Chunked Fetching) + מחיקה במנות – לא שולפים את כל הרשומות בבת אחת.
 * בכל iteration: שולפים רק CHUNK_SIZE רשומות (עם limit), מוחקים אותן, וחוזרים עד שה-filter מחזיר רשימה ריקה.
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

        const CHUNK_SIZE = 1000;
        let totalDeleted = 0;

        console.log(`Starting permanent cash flow deletion for ${customer_email} (chunked fetch + delete)`);

        while (true) {
            // א. שליפה במנה בלבד – לא את כל הרשומות (מונע timeout וזיכרון ענק)
            const entries = await base44.asServiceRole.entities.CashFlow.filter(
                { customer_email },
                'date',
                CHUNK_SIZE
            );

            if (!entries || entries.length === 0) break;

            // ב. מחיקת המנה שזה עתה נשלפה (במקביל)
            const deleteResults = await Promise.allSettled(
                entries.map(entry => base44.asServiceRole.entities.CashFlow.delete(entry.id))
            );
            const succeeded = deleteResults.filter(r => r.status === 'fulfilled').length;
            const failed = deleteResults.filter(r => r.status === 'rejected').length;
            totalDeleted += succeeded;
            if (failed > 0) {
                console.warn(`Batch: ${succeeded} deleted, ${failed} failed`);
            }

            console.log(`Deleted chunk of ${entries.length}. Total so far: ${totalDeleted}`);

            // הפסקה קצרה בין מנות כדי לא להעמיס על ה-API
            if (entries.length === CHUNK_SIZE) {
                await new Promise(r => setTimeout(r, 50));
            }
        }

        console.log(`Cash flow deletion completed. Total deleted: ${totalDeleted}`);

        return new Response(JSON.stringify({
            success: true,
            deletedCount: totalDeleted,
            message: totalDeleted > 0
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
