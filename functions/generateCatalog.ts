import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const BATCH_SIZE = 100;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    const requestBody = await req.json();
    
    // Support both old and new parameter formats for backward compatibility
    const customer_email = requestBody.customer_email;
    const catalog_id = requestBody.catalog_id || requestBody.selectedCatalogId;
    const business_type = requestBody.business_type;
    const product_count = requestBody.product_count || requestBody.productsCount || 200;
    const generation_metadata = requestBody.generation_metadata || {};
    
    // For backward compatibility - if catalog_name is provided but no catalog_id, create new catalog
    if (!catalog_id && requestBody.catalog_name) {
      try {
        const newCatalog = await base44.asServiceRole.entities.Catalog.create({
          customer_email,
          catalog_name: requestBody.catalog_name,
          creation_method: 'ai_generated',
          status: 'generating',
          generation_metadata: generation_metadata
        });
        
        // Continue with the new catalog_id
        const generatedCatalogId = newCatalog.id;
        
        const processStatus = await base44.asServiceRole.entities.ProcessStatus.create({
          customer_email,
          process_type: 'catalog_generation',
          status: 'running',
          progress: 10,
          current_step: 'מתחיל ביצירת קטלוג...',
          catalog_id: generatedCatalogId
        });

        // Trigger the background worker
        await base44.asServiceRole.functions.invoke("generateCatalogWorker", {
          customer_email,
          business_type,
          product_count,
          catalog_id: generatedCatalogId,
          process_id: processStatus.id,
          generation_metadata
        });

        return new Response(JSON.stringify({
          success: true,
          message: "תהליך יצירת הקטלוג החל ברקע.",
          process_id: processStatus.id,
          catalog_id: generatedCatalogId
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
      } catch (catalogCreationError) {
        console.error('Error creating new catalog:', catalogCreationError);
        return new Response(JSON.stringify({
          success: false,
          error: 'שגיאה ביצירת קטלוג חדש: ' + catalogCreationError.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (!customer_email || !catalog_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'חסרים נתונים נדרשים: customer_email ו-catalog_id'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Update catalog status to 'generating'
    await base44.asServiceRole.entities.Catalog.update(catalog_id, {
      status: 'generating',
      last_generated_at: new Date().toISOString()
    });

    const processStatus = await base44.asServiceRole.entities.ProcessStatus.create({
      customer_email,
      process_type: 'catalog_generation',
      status: 'running',
      progress: 10,
      current_step: 'מתחיל ביצירת קטלוג...',
      catalog_id: catalog_id
    });

    // Trigger the background worker
    await base44.asServiceRole.functions.invoke("generateCatalogWorker", {
      customer_email,
      business_type,
      product_count,
      catalog_id,
      process_id: processStatus.id,
      generation_metadata
    });

    return new Response(JSON.stringify({
      success: true,
      message: "תהליך יצירת הקטלוג החל ברקע.",
      process_id: processStatus.id,
      catalog_id: catalog_id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    console.error('Error in catalog generation initializer:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'שגיאה בהתחלת תהליך יצירת הקטלוג'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});