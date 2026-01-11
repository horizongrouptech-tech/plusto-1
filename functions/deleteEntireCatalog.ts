import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// מחיקה מלאה ולצמיתות של קטלוג - כולל כל המוצרים והקטלוג עצמו
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const BATCH_SIZE = 500; // מחיקה ב-batches גדולים יותר

  try {
    const { customer_email, catalog_id } = await req.json();
    
    if (!customer_email || !catalog_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'customer_email and catalog_id are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🗑️ Starting PERMANENT deletion of catalog ${catalog_id} for ${customer_email}`);

    let totalDeleted = 0;
    let batchNumber = 0;

    // לולאה שמוחקת את כל המוצרים עד שלא נשאר כלום
    while (true) {
      batchNumber++;
      
      // מביא מוצרים - גם פעילים וגם לא פעילים (מוחק הכל!)
      const productsToDelete = await base44.asServiceRole.entities.ProductCatalog.filter({
        customer_email: customer_email,
        catalog_id: catalog_id
      }, null, BATCH_SIZE);

      if (productsToDelete.length === 0) {
        console.log(`✅ No more products to delete. Total deleted: ${totalDeleted}`);
        break;
      }

      console.log(`📦 Batch ${batchNumber}: Deleting ${productsToDelete.length} products...`);

      // מחיקה אמיתית ולצמיתות - לא רק is_active: false!
      const deletePromises = productsToDelete.map(product => 
        base44.asServiceRole.entities.ProductCatalog.delete(product.id)
      );
      
      await Promise.all(deletePromises);
      totalDeleted += productsToDelete.length;

      console.log(`✅ Batch ${batchNumber} completed. Total deleted so far: ${totalDeleted}`);

      // הפסקה קצרה בין batches למניעת עומס
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // מחיקת הקטלוג עצמו לצמיתות
    console.log(`🗑️ Deleting the Catalog entity itself: ${catalog_id}`);
    try {
      await base44.asServiceRole.entities.Catalog.delete(catalog_id);
      console.log(`✅ Catalog entity deleted successfully`);
    } catch (catalogDeleteError) {
      console.error(`⚠️ Could not delete Catalog entity (may already be deleted):`, catalogDeleteError.message);
    }

    console.log(`🎉 Catalog deletion completed. Total products deleted: ${totalDeleted}`);

    return new Response(JSON.stringify({
      success: true,
      deleted_count: totalDeleted,
      batches_processed: batchNumber,
      is_finished: true,
      is_fully_deleted: true,
      message: `הקטלוג נמחק לצמיתות - ${totalDeleted} מוצרים הוסרו`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in deleteEntireCatalog:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error deleting catalog'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});