import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
        let errorCount = 0;
        const batchSize = 200;
        const maxRetries = 3;
        const delayBetweenBatchesMs = 30;

        while (true) {
            let entries;
            let fetchSuccess = false;

            for (let retry = 0; retry < maxRetries; retry++) {
                try {
                    entries = await base44.asServiceRole.entities.CashFlow.filter(
                        { customer_email },
                        'date',
                        batchSize
                    );
                    fetchSuccess = true;
                    break;
                } catch (fetchErr) {
                    console.warn(`Fetch attempt ${retry + 1} failed: ${fetchErr.message}`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (!fetchSuccess || !entries || entries.length === 0) break;

            const deleteResults = await Promise.allSettled(
                entries.map(entry => base44.asServiceRole.entities.CashFlow.delete(entry.id))
            );
            const succeeded = deleteResults.filter(r => r.status === 'fulfilled').length;
            const failed = deleteResults.filter(r => r.status === 'rejected').length;
            deletedCount += succeeded;
            errorCount += failed;
            if (failed > 0) {
                console.warn(`Batch: ${succeeded} deleted, ${failed} failed`);
            }

            console.log(`Deleted batch. Total deleted: ${deletedCount}, errors: ${errorCount}`);
            if (delayBetweenBatchesMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
            }
        }

        console.log(`Cash flow deletion completed. Total: ${deletedCount}, errors: ${errorCount}`);

        return new Response(JSON.stringify({
            success: true,
            deletedCount,
            errorCount,
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