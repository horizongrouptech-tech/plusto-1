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
async function deleteInChunks(base44, products, chunkSize = 100) {
  let deletedCount = 0;
  
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map(p => deleteWithRetry(base44, p.id))
    );
    deletedCount += results.filter(Boolean).length;
  }
  
  return deletedCount;
}

// מחיקת batch אחד - מחזיר מצב עם has_more
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const BATCH_SIZE = 500; // מוחק 500 בכל קריאה

  try {
    const { customer_email, catalog_id, delete_catalog_entity } = await req.json();
    
    if (!customer_email || !catalog_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'customer_email and catalog_id are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // אם זו קריאה למחיקת הקטלוג עצמו (אחרי שכל המוצרים נמחקו)
    if (delete_catalog_entity) {
      console.log(`🗑️ Deleting the Catalog entity itself: ${catalog_id}`);
      try {
        await base44.asServiceRole.entities.Catalog.delete(catalog_id);
        console.log(`✅ Catalog entity deleted successfully`);
        return new Response(JSON.stringify({
          success: true,
          catalog_deleted: true,
          message: 'הקטלוג נמחק בהצלחה'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (catalogDeleteError) {
        console.error(`⚠️ Could not delete Catalog entity:`, catalogDeleteError.message);
        return new Response(JSON.stringify({
          success: false,
          error: 'שגיאה במחיקת הקטלוג: ' + catalogDeleteError.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // שליפת מוצרים למחיקה
    console.log(`🗑️ Fetching products for catalog ${catalog_id}...`);
    
    const productsToDelete = await base44.asServiceRole.entities.ProductCatalog.filter({
      catalog_id: catalog_id
    }, null, BATCH_SIZE);

    // אם אין יותר מוצרים - סיימנו
    if (!productsToDelete || productsToDelete.length === 0) {
      console.log(`✅ No more products to delete for catalog ${catalog_id}`);
      return new Response(JSON.stringify({
        success: true,
        deleted_count: 0,
        has_more: false,
        remaining_count: 0,
        message: 'אין יותר מוצרים למחיקה'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📦 Deleting ${productsToDelete.length} products...`);

    // מחיקת המוצרים
    const deletedCount = await deleteInChunks(base44, productsToDelete, 100);

    console.log(`✅ Deleted ${deletedCount} products`);

    // בדיקה אם יש עוד מוצרים
    const remainingProducts = await base44.asServiceRole.entities.ProductCatalog.filter({
      catalog_id: catalog_id
    }, null, 1);

    const hasMore = remainingProducts && remainingProducts.length > 0;

    // אם יש עוד - נספור כמה
    let remainingCount = 0;
    if (hasMore) {
      try {
        const allRemaining = await base44.asServiceRole.entities.ProductCatalog.filter({
          catalog_id: catalog_id
        }, null, 10000);
        remainingCount = allRemaining?.length || 0;
      } catch (e) {
        remainingCount = -1; // לא ידוע
      }
    }

    return new Response(JSON.stringify({
      success: true,
      deleted_count: deletedCount,
      has_more: hasMore,
      remaining_count: remainingCount,
      message: hasMore 
        ? `נמחקו ${deletedCount} מוצרים, נותרו עוד ${remainingCount}` 
        : `נמחקו ${deletedCount} מוצרים - סיום`
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