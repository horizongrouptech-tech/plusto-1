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

        // Find orphan products without catalog_id - limit to 10,000 per run to avoid timeout
        const BATCH_SIZE = 10000;
        const orphanProducts = await base44.asServiceRole.entities.Product.filter({
            $or: [
                { catalog_id: null },
                { catalog_id: '' }
            ]
        }, '-created_date', BATCH_SIZE);

        console.log(`[deleteOrphanProducts] Found ${orphanProducts.length} orphan products in this batch (limit: ${BATCH_SIZE})`);

        if (orphanProducts.length === 0) {
            return Response.json({
                success: true,
                message: 'No orphan products found',
                deleted_count: 0,
                remaining: 0,
                deleted_ids: []
            });
        }

        // Log sample of products that will be deleted
        const sampleProducts = orphanProducts.slice(0, 5).map(p => ({
            id: p.id,
            description: p.description,
            created_date: p.created_date
        }));
        console.log(`[deleteOrphanProducts] Sample of products to delete:`, sampleProducts);

        // Delete each orphan product
        let deletedCount = 0;
        const deletedIds = [];
        const errors = [];

        for (const product of orphanProducts) {
            try {
                await base44.asServiceRole.entities.Product.delete(product.id);
                deletedCount++;
                deletedIds.push(product.id);
                
                if (deletedCount % 100 === 0) {
                    console.log(`[deleteOrphanProducts] Progress: ${deletedCount}/${orphanProducts.length} deleted`);
                }
            } catch (error) {
                console.error(`[deleteOrphanProducts] Failed to delete product ${product.id}:`, error.message);
                errors.push({ product_id: product.id, error: error.message });
            }
        }

        // Check if there are more orphan products remaining
        const remainingOrphans = await base44.asServiceRole.entities.Product.filter({
            $or: [
                { catalog_id: null },
                { catalog_id: '' }
            ]
        }, '-created_date', 1);

        const hasMore = remainingOrphans.length > 0;

        console.log(`[deleteOrphanProducts] Deletion complete. Deleted: ${deletedCount}/${orphanProducts.length}`);
        console.log(`[deleteOrphanProducts] More orphan products remaining: ${hasMore ? 'Yes' : 'No'}`);
        
        if (errors.length > 0) {
            console.error(`[deleteOrphanProducts] Encountered ${errors.length} errors during deletion`);
        }

        return Response.json({
            success: true,
            message: `Successfully deleted ${deletedCount} orphan products. ${hasMore ? 'More products remain - run again to continue.' : 'All orphan products cleared.'}`,
            deleted_count: deletedCount,
            total_in_batch: orphanProducts.length,
            remaining: hasMore,
            deleted_ids: deletedIds,
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