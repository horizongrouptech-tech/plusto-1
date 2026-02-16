import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const { catalog_id } = await req.json();
  
  if (!catalog_id) {
    return Response.json({ success: false, error: 'חסר catalog_id' }, { status: 400 });
  }
  
  try {
    // ספירת כל המוצרים הפעילים בקטלוג
    let totalCount = 0;
    let skip = 0;
    const batchSize = 1000;
    
    while (true) {
      const batch = await base44.asServiceRole.entities.ProductCatalog.filter(
        { catalog_id, is_active: true },
        '-created_date',
        batchSize,
        skip
      );
      
      totalCount += batch.length;
      
      if (batch.length < batchSize) {
        break;
      }
      
      skip += batchSize;
    }
    
    console.log(`Found ${totalCount} active products in catalog ${catalog_id}`);
    
    // עדכון הקטלוג
    await base44.asServiceRole.entities.Catalog.update(catalog_id, {
      product_count: totalCount
    });
    
    return Response.json({ 
      success: true, 
      catalog_id, 
      product_count: totalCount 
    });
  } catch (error) {
    console.error('Error fixing catalog count:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});