import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// This function now deletes a single batch of products from a catalog.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const BATCH_SIZE = 50; // Number of products to delete per call

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

    // Find a batch of active products to delete
    const productsToDelete = await base44.asServiceRole.entities.ProductCatalog.filter({
      customer_email: customer_email,
      catalog_id: catalog_id,
      is_active: true
    }, null, BATCH_SIZE);

    if (productsToDelete.length === 0) {
      // No more products to delete, finalize the process
      await base44.asServiceRole.entities.Catalog.update(catalog_id, {
        status: 'draft',
        product_count: 0
      });
      return new Response(JSON.stringify({
        success: true,
        deleted_count: 0,
        is_finished: true,
        message: 'Catalog has been fully cleared.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process the batch: set is_active to false for each product
    for (const product of productsToDelete) {
      await base44.asServiceRole.entities.ProductCatalog.update(product.id, {
        is_active: false
      });
    }

    // Check if there are more products remaining after this batch
    const remainingProducts = await base44.asServiceRole.entities.ProductCatalog.filter({
      customer_email: customer_email,
      catalog_id: catalog_id,
      is_active: true
    }, null, 1);

    const isFinished = remainingProducts.length === 0;

    if (isFinished) {
        // This was the last batch, finalize catalog status
        await base44.asServiceRole.entities.Catalog.update(catalog_id, {
            status: 'draft',
            product_count: 0
        });
    }

    return new Response(JSON.stringify({
      success: true,
      deleted_count: productsToDelete.length,
      is_finished: isFinished,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in deleteEntireCatalog batch:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error processing deletion batch'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});