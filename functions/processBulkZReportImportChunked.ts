import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      forecast_id, 
      z_products, 
      mapping, 
      assigned_month,
      chunk_index,
      total_chunks,
      is_first_chunk,
      is_last_chunk,
      z_report_id
    } = await req.json();

    console.log(`📦 Processing chunk ${chunk_index + 1}/${total_chunks} (${z_products.length} products)`);

    // טעינת התחזית הנוכחית
    const currentForecast = await base44.entities.ManualForecast.read(forecast_id);
    
    if (!currentForecast) {
      throw new Error('Forecast not found');
    }

    // Parse existing data
    let salesForecast = currentForecast.sales_forecast_onetime 
      ? (typeof currentForecast.sales_forecast_onetime === 'string' 
          ? JSON.parse(currentForecast.sales_forecast_onetime) 
          : currentForecast.sales_forecast_onetime)
      : {};

    let existingMapping = currentForecast.z_product_mapping || {};
    let uploadedReports = currentForecast.uploaded_reports || [];

    // עיבוד המוצרים מה-chunk הנוכחי בלבד
    const detailedProducts = [];

    z_products.forEach(zProduct => {
      const serviceName = mapping[zProduct.product_name];
      
      if (!serviceName || serviceName === 'skip') return;

      if (!salesForecast[serviceName]) {
        salesForecast[serviceName] = {
          service_name: serviceName,
          actual_monthly_quantities: {},
          actual_monthly_revenue: {}
        };
      }

      const service = salesForecast[serviceName];
      const currentQty = service.actual_monthly_quantities[assigned_month] || 0;
      const currentRev = service.actual_monthly_revenue[assigned_month] || 0;

      service.actual_monthly_quantities[assigned_month] = currentQty + (zProduct.quantity_sold || 0);
      service.actual_monthly_revenue[assigned_month] = currentRev + (zProduct.revenue_with_vat || 0);

      detailedProducts.push({
        z_report_id: z_report_id,
        customer_email: user.email,
        product_name: zProduct.product_name,
        barcode: zProduct.barcode || '',
        quantity_sold: zProduct.quantity_sold || 0,
        unit_price: zProduct.unit_price || 0,
        revenue_with_vat: zProduct.revenue_with_vat || 0,
        mapped_service: serviceName,
        month_assigned: assigned_month
      });
    });

    // שמירת המוצרים המפורטים ב-batch
    if (detailedProducts.length > 0) {
      const BATCH_SIZE = 200;
      for (let i = 0; i < detailedProducts.length; i += BATCH_SIZE) {
        const batch = detailedProducts.slice(i, i + BATCH_SIZE);
        await base44.asServiceRole.entities.ZReportProduct.bulkCreate(batch);
      }
      console.log(`✅ Saved ${detailedProducts.length} detailed products to ZReportProduct`);
    }

    // מיזוג המיפוי
    existingMapping = { ...existingMapping, ...mapping };

    // רק ב-chunk האחרון - עדכון ה-upload record
    if (is_last_chunk) {
      const uploadRecord = {
        month: assigned_month,
        z_report_id: z_report_id,
        uploaded_at: new Date().toISOString(),
        products_count: z_products.length
      };

      const existingIndex = uploadedReports.findIndex(r => r.month === assigned_month);
      if (existingIndex >= 0) {
        uploadedReports[existingIndex] = uploadRecord;
      } else {
        uploadedReports.push(uploadRecord);
      }
    }

    // עדכון התחזית - רק את מה שהשתנה
    const updateData = {
      sales_forecast_onetime: salesForecast,
      z_product_mapping: existingMapping
    };

    if (is_last_chunk) {
      updateData.uploaded_reports = uploadedReports;
    }

    await base44.asServiceRole.entities.ManualForecast.update(forecast_id, updateData);

    console.log(`✅ Chunk ${chunk_index + 1}/${total_chunks} processed successfully`);

    return Response.json({
      success: true,
      chunk_index,
      processed_count: z_products.length,
      sales_forecast: salesForecast,
      uploaded_reports: is_last_chunk ? uploadedReports : null
    });

  } catch (error) {
    console.error('❌ Error processing chunk:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});