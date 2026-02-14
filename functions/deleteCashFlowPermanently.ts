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

        console.log(`Starting permanent cash flow deletion for ${customer_email}`);

        let deletedCount = 0;
        const batchSize = 1000;

        while (true) {
            const entries = await base44.asServiceRole.entities.CashFlow.filter(
                { customer_email },
                'date',
                batchSize
            );

            if (entries.length === 0) break;

            const deletePromises = entries.map(entry =>
                base44.asServiceRole.entities.CashFlow.delete(entry.id)
            );
            await Promise.all(deletePromises);
            deletedCount += entries.length;

            console.log(`Deleted batch: ${entries.length} entries. Total deleted: ${deletedCount}`);

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`Cash flow deletion completed. Total entries deleted: ${deletedCount}`);

        return new Response(JSON.stringify({
            success: true,
            deletedCount,
            message: `כל נתוני התזרים נמחקו בהצלחה - ${deletedCount} תנועות`
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
