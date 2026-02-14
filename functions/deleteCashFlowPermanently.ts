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
        const startTime = Date.now();
        const TIMEOUT_MS = 25000; // 25 seconds safety margin
        const CHUNK_SIZE = 1000;

        // Step 1: Count total records
        const allRecords = await base44.asServiceRole.entities.CashFlow.filter(
            { customer_email },
            '-created_date',
            999999
        );
        const totalCount = allRecords.length;
        console.log(`Found ${totalCount} records to delete`);

        if (totalCount === 0) {
            return new Response(JSON.stringify({
                success: true,
                deletedCount: 0,
                message: 'אין תנועות למחוק'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Step 2: Delete in chunks
        let totalDeleted = 0;
        let chunkNumber = 0;

        for (let i = 0; i < allRecords.length; i += CHUNK_SIZE) {
            // Check timeout
            if (Date.now() - startTime > TIMEOUT_MS) {
                console.log(`Timeout reached. Deleted ${totalDeleted}/${totalCount}`);
                return new Response(JSON.stringify({
                    success: false,
                    partialSuccess: true,
                    deletedCount: totalDeleted,
                    totalCount,
                    message: `נמחקו ${totalDeleted} מתוך ${totalCount} תנועות. יש להריץ שוב למחיקת היתר`
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const chunk = allRecords.slice(i, i + CHUNK_SIZE);
            const chunkIds = chunk.map(r => r.id);

            chunkNumber++;
            console.log(`Deleting chunk ${chunkNumber}: ${chunkIds.length} records`);

            // Delete chunk by IDs
            for (const id of chunkIds) {
                try {
                    await base44.asServiceRole.entities.CashFlow.delete(id);
                    totalDeleted++;
                } catch (deleteError) {
                    console.error(`Failed to delete record ${id}:`, deleteError);
                }
            }

            console.log(`Chunk ${chunkNumber} completed. Total deleted: ${totalDeleted}/${totalCount}`);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Cash flow deletion completed in ${duration}s. Deleted: ${totalDeleted}`);

        return new Response(JSON.stringify({
            success: true,
            deletedCount: totalDeleted,
            totalCount,
            duration: `${duration}s`,
            message: `כל נתוני התזרים נמחקו בהצלחה - ${totalDeleted} תנועות בזמן ${duration} שניות`
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