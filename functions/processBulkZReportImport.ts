import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      forecastId,
      zProducts, 
      mapping, 
      monthAssigned,
      fileName,
      fileUrl,
      totalRevenue,
      currentSalesForecast,
      currentServices 
    } = await req.json();

    console.log('🚀 Starting bulk Z-report import:', {
      products: zProducts.length,
      month: monthAssigned,
      forecastId
    });

    // ✅ שלב 1: עיבוד המיפוי ועדכון sales_forecast
    const updated = JSON.parse(JSON.stringify(currentSalesForecast));
    const monthIndex = monthAssigned - 1;
    let productsUpdated = 0;
    const detailedProducts = [];

    zProducts.forEach(zProduct => {
      const mappedServiceName = mapping[zProduct.product_name];
      if (!mappedServiceName) return;

      const serviceIndex = updated.findIndex(s => s.service_name === mappedServiceName);
      if (serviceIndex === -1) return;

      updated[serviceIndex].actual_monthly_quantities[monthIndex] = zProduct.quantity_sold;
      
      const realRevenue = zProduct.revenue_with_vat || 0;
      updated[serviceIndex].actual_monthly_revenue[monthIndex] = realRevenue;

      detailedProducts.push({
        product_name: zProduct.product_name,
        barcode: zProduct.barcode || '',
        quantity_sold: zProduct.quantity_sold,
        unit_price: zProduct.quantity_sold > 0 ? realRevenue / zProduct.quantity_sold : 0,
        revenue_with_vat: realRevenue,
        mapped_service: mappedServiceName
      });

      productsUpdated++;
    });

    console.log(`✅ Processed ${productsUpdated} products`);

    // ✅ שלב 2: שמירת מוצרים מפורטים ל-ZReportProduct (ב-batches)
    const zReportId = `zrpt_${Date.now()}_${monthAssigned}`;
    
    const zReportProductRecords = detailedProducts.map(p => ({
      z_report_id: zReportId,
      customer_email: user.email,
      product_name: p.product_name,
      barcode: p.barcode,
      quantity_sold: p.quantity_sold,
      unit_price: p.unit_price,
      revenue_with_vat: p.revenue_with_vat,
      mapped_service: p.mapped_service,
      month_assigned: monthAssigned
    }));

    // שמירה ב-batches של 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < zReportProductRecords.length; i += BATCH_SIZE) {
      const batch = zReportProductRecords.slice(i, i + BATCH_SIZE);
      await base44.asServiceRole.entities.ZReportProduct.bulkCreate(batch);
    }
    console.log(`✅ Saved ${zReportProductRecords.length} products to ZReportProduct`);

    // ✅ שלב 3: טעינת ה-forecast הנוכחי
    const currentForecast = await base44.asServiceRole.entities.ManualForecast.get(forecastId);

    // ✅ שלב 4: עדכון ManualForecast עם metadata בלבד
    const uploadRecord = {
      z_report_id: zReportId,
      file_name: fileName,
      upload_date: new Date().toISOString(),
      month_assigned: monthAssigned,
      products_updated: productsUpdated,
      total_revenue: totalRevenue,
      file_url: fileUrl,
      products_count: detailedProducts.length
    };

    const updatedReports = [...(currentForecast.z_reports_uploaded || []), uploadRecord];

    // שמירה אטומית אחת עם כל העדכונים
    await base44.asServiceRole.entities.ManualForecast.update(forecastId, {
      sales_forecast_onetime: updated,
      z_reports_uploaded: updatedReports,
      z_report_product_mapping: {
        ...(currentForecast.z_report_product_mapping || {}),
        ...mapping
      }
    });

    console.log('✅ ManualForecast updated successfully');

    return Response.json({
      success: true,
      products_updated: productsUpdated,
      z_report_id: zReportId,
      updated_sales_forecast: updated,
      updated_reports: updatedReports
    });

  } catch (error) {
    console.error('❌ Error processing bulk Z-report import:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});