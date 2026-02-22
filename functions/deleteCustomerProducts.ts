import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { customer_email } = await req.json();

        if (!customer_email) {
            return Response.json({ error: 'customer_email is required' }, { status: 400 });
        }

        let totalDeleted = 0;
        let hasMore = true;
        let errors = [];

        console.log(`Starting deletion of products for customer: ${customer_email}`);

        while (hasMore) {
            try {
                // מוחק 50 מוצרים בכל פעם (קטן יותר להימנע מ-rate limit)
                const products = await base44.asServiceRole.entities.ProductCatalog.filter(
                    { customer_email },
                    '-created_date',
                    50
                );

                if (products.length === 0) {
                    hasMore = false;
                    break;
                }

                console.log(`Found ${products.length} products to delete in this batch`);

                // מחיקה בבאצ' עם delay
                for (const product of products) {
                    try {
                        await base44.asServiceRole.entities.ProductCatalog.delete(product.id);
                        totalDeleted++;
                        
                        // המתנה של 100ms כל 10 מחיקות
                        if (totalDeleted % 10 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        
                        // לוג כל 50 מחיקות
                        if (totalDeleted % 50 === 0) {
                            console.log(`Deleted ${totalDeleted} products so far...`);
                        }
                    } catch (deleteError) {
                        errors.push({ product_id: product.id, error: deleteError.message });
                    }
                }

                console.log(`Batch completed. Total deleted so far: ${totalDeleted}`);
                
                // המתנה של 500ms בין באצ'ים
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (batchError) {
                console.error('Batch error:', batchError);
                errors.push({ batch: true, error: batchError.message });
                hasMore = false;
            }
        }

        console.log(`Deletion completed. Total deleted: ${totalDeleted}`);

        return Response.json({
            success: true,
            total_deleted: totalDeleted,
            errors: errors.length > 0 ? errors : null,
            message: `Successfully deleted ${totalDeleted} products for ${customer_email}`
        });

    } catch (error) {
        console.error('Function error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});