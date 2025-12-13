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

        console.log(`Starting permanent catalog deletion for ${customer_email}`);

        // מחיקה בבאצ'ים כדי למנוע timeout
        let deletedCount = 0;
        const batchSize = 1000;

        while (true) {
            const products = await base44.asServiceRole.entities.ProductCatalog.filter({
                customer_email: customer_email
            }, 'created_date', batchSize);

            if (products.length === 0) break;

            // מחק את הבאץ' הנוכחי
            const deletePromises = products.map(product => 
                base44.asServiceRole.entities.ProductCatalog.delete(product.id)
            );
            
            await Promise.all(deletePromises);
            deletedCount += products.length;

            console.log(`Deleted batch: ${products.length} products. Total deleted: ${deletedCount}`);

            // הפסקה קצרה בין באצ'ים
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // מחק גם קבצים קשורים שכבר סונכרנו
        const relatedFiles = await base44.asServiceRole.entities.FileUpload.filter({
            customer_email: customer_email,
            is_synced_to_catalog: true
        });

        for (const file of relatedFiles) {
            await base44.asServiceRole.entities.FileUpload.update(file.id, {
                is_synced_to_catalog: false,
                sync_date: null
            });
        }

        console.log(`Catalog deletion completed. Total products deleted: ${deletedCount}`);

        return new Response(JSON.stringify({ 
            success: true,
            deletedCount,
            message: `נמחק הקטלוג לצמיתות - ${deletedCount} מוצרים`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error deleting catalog permanently:', error);
        return new Response(JSON.stringify({ 
            error: 'שגיאה במחיקת הקטלוג', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});