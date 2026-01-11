import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// פונקציית עזר למחיקה עם ניסיונות חוזרים
async function deleteWithRetry(base44, productId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await base44.asServiceRole.entities.ProductCatalog.delete(productId);
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Failed to delete product ${productId} after ${maxRetries} attempts:`, error.message);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
  return false;
}

// מחיקה ב-chunks קטנים יותר למניעת timeout
async function deleteInChunks(base44, products, chunkSize = 50) {
  let deletedCount = 0;
  
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map(p => deleteWithRetry(base44, p.id))
    );
    deletedCount += results.filter(Boolean).length;
    
    // הפסקה קצרה בין chunks
    if (i + chunkSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return deletedCount;
}

// מחיקה מלאה ולצמיתות של קטלוג - כולל כל המוצרים והקטלוג עצמו
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const BATCH_SIZE = 200; // batch קטן יותר לשליפה
  const CHUNK_SIZE = 50;  // מחיקה ב-chunks קטנים

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
    const maxBatches = 100; // הגבלה למניעת לולאה אינסופית

    // לולאה שמוחקת את כל המוצרים עד שלא נשאר כלום
    while (batchNumber < maxBatches) {
      batchNumber++;
      
      // מביא מוצרים - גם פעילים וגם לא פעילים (מוחק הכל!)
      const productsToDelete = await base44.asServiceRole.entities.ProductCatalog.filter({
        catalog_id: catalog_id
      }, null, BATCH_SIZE);

      if (!productsToDelete || productsToDelete.length === 0) {
        console.log(`✅ No more products to delete. Total deleted: ${totalDeleted}`);
        break;
      }

      console.log(`📦 Batch ${batchNumber}: Deleting ${productsToDelete.length} products...`);

      // מחיקה ב-chunks קטנים עם retry
      const deletedInBatch = await deleteInChunks(base44, productsToDelete, CHUNK_SIZE);
      totalDeleted += deletedInBatch;

      console.log(`✅ Batch ${batchNumber} completed. Deleted: ${deletedInBatch}. Total so far: ${totalDeleted}`);

      // הפסקה בין batches
      await new Promise(resolve => setTimeout(resolve, 200));
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