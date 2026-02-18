import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Verify admin access
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        console.log(`[deleteOrphanProducts] Admin ${user.email} initiated orphan product deletion`);

        // Delete orphan products in small batches to avoid timeout
        const DELETE_BATCH_SIZE = 100;
        const MAX_TOTAL_TO_DELETE = 10000;
        
        let totalDeletedCount = 0;
        const allDeletedIds = [];
        const errors = [];
        
        console.log(`[deleteOrphanProducts] Starting deletion - up to ${MAX_TOTAL_TO_DELETE} products, ${DELETE_BATCH_SIZE} at a time`);

        while (totalDeletedCount < MAX_TOTAL_TO_DELETE) {
            // Find next batch of orphan products
            const orphanBatch = await base44.asServiceRole.entities.Product.filter({
                $or: [
                    { catalog_id: null },
                    { catalog_id: '' }
                ]
            }, '-created_date', DELETE_BATCH_SIZE);

            if (orphanBatch.length === 0) {
                console.log(`[deleteOrphanProducts] No more orphan products found`);
                break;
            }

            console.log(`[deleteOrphanProducts] Processing batch ${Math.floor(totalDeletedCount / DELETE_BATCH_SIZE) + 1}: ${orphanBatch.length} products`);

            // Delete products in this batch
            for (const product of orphanBatch) {
                try {
                    await base44.asServiceRole.entities.Product.delete(product.id);
                    totalDeletedCount++;
                    allDeletedIds.push(product.id);
                } catch (error) {
                    console.error(`[deleteOrphanProducts] Failed to delete product ${product.id}:`, error.message);
                    errors.push({ product_id: product.id, error: error.message });
                }
            }

            console.log(`[deleteOrphanProducts] Batch complete. Total deleted: ${totalDeletedCount}`);

            // If we got fewer products than the batch size, no more products remain
            if (orphanBatch.length < DELETE_BATCH_SIZE) {
                console.log(`[deleteOrphanProducts] Last batch complete - all orphan products cleared`);
                break;
            }
        }

        // Check if there are still more orphan products remaining
        const remainingOrphans = await base44.asServiceRole.entities.Product.filter({
            $or: [
                { catalog_id: null },
                { catalog_id: '' }
            ]
        }, '-created_date', 1);

        const hasMore = remainingOrphans.length > 0;

        console.log(`[deleteOrphanProducts] Process complete. Total deleted: ${totalDeletedCount}`);
        console.log(`[deleteOrphanProducts] More orphan products remaining: ${hasMore ? 'Yes' : 'No'}`);
        
        if (errors.length > 0) {
            console.error(`[deleteOrphanProducts] Encountered ${errors.length} errors during deletion`);
        }

        return Response.json({
            success: true,
            message: `Successfully deleted ${totalDeletedCount} orphan products. ${hasMore ? 'More products remain - run again to continue.' : 'All orphan products cleared.'}`,
            deleted_count: totalDeletedCount,
            remaining: hasMore,
            deleted_ids: allDeletedIds,
            errors: errors.length > 0 ? errors : null
        });

    } catch (error) {
        console.error('[deleteOrphanProducts] Error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});