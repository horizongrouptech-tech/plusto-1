import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const { catalog_id } = await req.json();
  
  if (!catalog_id) {
    return Response.json({ success: false, error: 'חסר catalog_id' }, { status: 400 });
  }
  
  try {
    // ספירת מוצרים פעילים בקטלוג
    const count = await base44.asServiceRole.entities.ProductCatalog.count({
      catalog_id,
      is_active: true
    });
    
    // עדכון הקטלוג
    await base44.asServiceRole.entities.Catalog.update(catalog_id, {
      product_count: count
    });
    
    return Response.json({ 
      success: true, 
      catalog_id, 
      product_count: count 
    });
  } catch (error) {
    console.error('Error fixing catalog count:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});