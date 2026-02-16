import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as xlsx from 'npm:xlsx@0.18.5';
import { parse } from "npm:csv-parse@5.5.2/sync";

// ניקוי ערכים
function cleanValue(value, type) {
  if (value === null || value === undefined || value === '') {
    return type === 'number' ? 0 : '';
  }
  
  const strValue = String(value).trim();
  
  if (type === 'number') {
    const cleaned = strValue
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
      .replace(/[₪$€£,\s]/g, '')
      .replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  
  return strValue.replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '').trim();
}

// ניקוי תא כותרת (זהה ל-parseFileHeaders)
function cleanCell(cell) {
  if (cell === null || cell === undefined) return '';
  return String(cell).trim()
    .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// הגדרת סוגי שדות
const FIELD_TYPES = {
  product_name: 'text',
  barcode: 'text',
  cost_price: 'number',
  cost_price_no_vat: 'number',
  selling_price: 'number',
  store_price: 'number',
  store_price_alt: 'number',
  category: 'text',
  secondary_category: 'text',
  supplier: 'text',
  supplier_item_code: 'text',
  inventory: 'number',
  monthly_sales: 'number',
  color: 'text',
  size: 'text',
  creation_date: 'text',
  profit_percentage: 'number',
  no_vat_item: 'text'
};

// עיבוד CSV - מחזיר מערך של מערכים (raw arrays)
function processCSVRaw(content) {
  const lines = content.split(/\r\n|\n/).filter(line => line.trim());
  const delimiter = (lines[0] || '').includes('\t') ? '\t' : ',';
  
  try {
    return parse(content, {
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true
      // NO columns: true — return raw arrays
    });
  } catch (e) {
    return lines.map(line => line.split(delimiter).map(v => v?.trim() || ''));
  }
}

// עיבוד Excel - מחזיר מערך של מערכים (raw arrays)
// ⚠️ ללא סינון - מחזיר את כל השורות כפי שהן בקובץ!
function processExcelRaw(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const allRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  // החזר את כל השורות ללא סינון - הסינון יקרה אחר כך
  return allRows || [];
}

// עדכון סטטוס
const updateProcessStatus = async (base44, processId, progress, status, currentStep, resultData = null) => {
  try {
    const updateData = {
      progress: Math.min(Math.max(progress, 0), 100),
      status,
      current_step: currentStep
    };
    
    if (resultData) updateData.result_data = resultData;
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    await base44.asServiceRole.entities.ProcessStatus.update(processId, updateData);
  } catch (error) {
    console.error('שגיאה בעדכון סטטוס:', error);
  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { process_id, chunk_number, start_row, end_row } = await req.json();
  
  console.log(`🟢 [WORKER START] chunk=${chunk_number}, start_row=${start_row}, end_row=${end_row}, process_id=${process_id}`);

  if (!process_id || chunk_number === undefined || start_row === undefined || end_row === undefined) {
    console.error('❌ [WORKER ERROR] חסרים פרמטרים נדרשים');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'חסרים פרמטרים נדרשים' 
    }), { status: 400 });
  }

  try {
    // טעינת ProcessStatus
    console.log(`📋 [WORKER] טוען ProcessStatus: ${process_id}`);
    const processStatus = await base44.asServiceRole.entities.ProcessStatus.get(process_id);
    if (!processStatus) {
      console.error(`❌ [WORKER ERROR] לא נמצאה רשומת תהליך: ${process_id}`);
      throw new Error('לא נמצאה רשומת תהליך');
    }
    console.log(`✅ [WORKER] ProcessStatus נטען בהצלחה`);
    const { metadata } = processStatus;
    
    if (!metadata) {
      console.error(`❌ [WORKER ERROR] חסר metadata בתהליך`);
      throw new Error('חסר metadata בתהליך');
    }

    const { 
      parsed_records, // 🎯 הנתונים המעובדים כבר!
      mapping, 
      catalog_id, 
      customer_email, 
      total_rows,
      import_with_errors
    } = metadata;
    
    console.log(`📊 [WORKER METADATA] catalog_id=${catalog_id}, total_rows=${total_rows}`);

    if (!parsed_records || !Array.isArray(parsed_records)) {
      throw new Error('חסרים נתונים מעובדים ב-metadata');
    }

    const startRow = start_row;
    const endRow = end_row;

    // 🎯 חילוץ רק הטווח המבוקש
    const records = parsed_records.slice(startRow, endRow);
    
    console.log(`🎯 [WORKER CHUNK] chunk=${chunk_number}, טווח=${startRow}-${endRow}, רשומות לעיבוד=${records.length}`);

    const progressPercent = Math.round((endRow / total_rows) * 100);
    console.log(`📈 [WORKER PROGRESS] progress=${progressPercent}%`);
    await updateProcessStatus(base44, process_id, 
      progressPercent, 
      'running', 
      `מעבד שורות ${startRow + 1}-${endRow}...`);

    // עיבוד המוצרים
    const productsToCreate = [];
    const invalidRows = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const globalRowIndex = startRow + i;
      
      const product = {
        catalog_id,
        customer_email,
        is_active: true,
        data_source: 'file_upload',
        last_updated: new Date().toISOString()
      };

      const missingFields = [];
      const validationErrors = [];

      // מיפוי שדות
      for (const [systemField, sourceColumn] of Object.entries(mapping)) {
        if (sourceColumn && record[sourceColumn] !== undefined) {
          const fieldType = FIELD_TYPES[systemField] || 'text';
          product[systemField] = cleanValue(record[sourceColumn], fieldType);
        }
      }

      // בדיקת שדות חובה - דילוג על שורות ריקות לגמרי (ללא שם וללא ברקוד)
      const hasProductName = product.product_name && product.product_name.trim() !== '';
      const hasBarcode = product.barcode && String(product.barcode).trim() !== '';
      if (!hasProductName && !hasBarcode) {
        continue; // שורה ריקה - לא יוצרים מוצר
      }
      if (!hasProductName) {
        validationErrors.push('שם מוצר חסר');
        if (import_with_errors) {
          product.product_name = `מוצר ללא שם - שורה ${globalRowIndex + 1}`;
        } else {
          invalidRows.push({ row: globalRowIndex + 1, reason: 'שם מוצר חסר' });
          continue;
        }
      }

      // חישוב רווח
      const costPrice = product.cost_price || product.cost_price_no_vat || 0;
      const sellingPrice = product.selling_price || product.store_price || product.store_price_alt || 0;
      
      if (!product.cost_price && product.cost_price_no_vat) {
        product.cost_price = product.cost_price_no_vat;
      }
      if (!product.selling_price && product.store_price) {
        product.selling_price = product.store_price;
      }
      
      product.gross_profit = Math.max(0, sellingPrice - costPrice);
      if (!product.profit_percentage || product.profit_percentage === 0) {
        product.profit_percentage = sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0;
      }

      // קביעת איכות נתונים
      if (!costPrice && !product.cost_price_no_vat) {
        missingFields.push('מחיר עלות');
      }
      if (!sellingPrice && !product.store_price && !product.store_price_alt) {
        missingFields.push('מחיר מכירה');
      }
      
      product.missing_fields = missingFields;
      product.data_quality = missingFields.length === 0 ? 'complete' : 
                             missingFields.length <= 1 ? 'partial' : 'incomplete';
      
      const hasErrors = validationErrors.length > 0;
      product.needs_review = missingFields.length > 0 || hasErrors;
      product.import_errors = hasErrors ? validationErrors : null;

      productsToCreate.push(product);
    }

    // יצירת המוצרים
    let createdCount = 0;
    console.log(`💾 [WORKER CREATE] התחלת יצירת ${productsToCreate.length} מוצרים...`);
    
    if (productsToCreate.length > 0) {
      const batchSize = 200;
      
      for (let i = 0; i < productsToCreate.length; i += batchSize) {
        const batch = productsToCreate.slice(i, i + batchSize);
        console.log(`📦 [WORKER BATCH] יוצר batch ${Math.floor(i/batchSize) + 1}, גודל=${batch.length}`);
        
        try {
          await base44.asServiceRole.entities.ProductCatalog.bulkCreate(batch);
          createdCount += batch.length;
          console.log(`✅ [WORKER BATCH SUCCESS] נוצרו ${batch.length} מוצרים, סה"כ עד כה=${createdCount}`);
        } catch (batchError) {
          console.error(`❌ [WORKER BATCH ERROR] שגיאה ב-batch:`, batchError);
          for (const product of batch) {
            try {
              await base44.asServiceRole.entities.ProductCatalog.create(product);
              createdCount++;
            } catch (singleError) {
              console.error('❌ [WORKER SINGLE ERROR] שגיאה ביצירת מוצר בודד:', singleError);
            }
          }
        }
        
        if (i + batchSize < productsToCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    console.log(`✅ [WORKER CREATE DONE] נוצרו ${createdCount} מוצרים ב-chunk ${chunk_number}`);

    // אין צורך לעדכן מונה מצטבר - ה-worker האחרון יספור את כל המוצרים

    // 🎯 בדיקה אם יש עוד chunks
    if (endRow < total_rows) {
      const nextStartRow = endRow;
      const nextEndRow = Math.min(nextStartRow + 500, total_rows);
      
      console.log(`🔄 [WORKER NEXT] מפעיל chunk הבא: ${chunk_number + 1}, טווח=${nextStartRow}-${nextEndRow}`);
      
      // קריאה עצמית לחלק הבא - fire-and-forget
      base44.asServiceRole.functions.invoke('processCatalogChunkWorker', {
        process_id,
        chunk_number: chunk_number + 1,
        start_row: nextStartRow,
        end_row: nextEndRow
      }).catch(err => console.error(`Worker ${chunk_number + 1} failed:`, err));
      
      console.log(`✅ [WORKER NEXT DONE] chunk ${chunk_number + 1} הופעל`);
      
      return new Response(JSON.stringify({
        success: true,
        chunk_completed: chunk_number + 1,
        products_created_in_chunk: createdCount
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.log(`🏁 [WORKER FINAL] זה הchunk האחרון! מתחיל ספירה סופית...`);
      // זה החלק האחרון - סיום התהליך
      await updateProcessStatus(base44, process_id, 95, 'running', 'מעדכן ישות קטלוג...');

      // ספירה מדויקת של כל המוצרים החדשים והפעילים
      const processStartTime = processStatus.started_at;
      console.log(`🔍 [WORKER COUNT] מתחיל ספירת מוצרים חדשים מאז ${processStartTime}...`);

      // ספירת מוצרים חדשים עם לולאה
      let newProductsCount = 0;
      let skip = 0;
      const batchSize = 1000;

      while (true) {
        const batch = await base44.asServiceRole.entities.ProductCatalog.filter(
          { catalog_id, created_date: { $gte: processStartTime } },
          '-created_date',
          batchSize,
          skip
        );

        newProductsCount += batch.length;

        if (batch.length < batchSize) break;
        skip += batchSize;
      }

      console.log(`📊 [WORKER COUNT RESULT] מוצרים חדשים: ${newProductsCount}`);

      // ספירת כל המוצרים הפעילים בקטלוג
      console.log(`🔍 [WORKER COUNT] מתחיל ספירת כל המוצרים הפעילים בקטלוג...`);
      let allProductsCount = 0;
      skip = 0;

      while (true) {
        const batch = await base44.asServiceRole.entities.ProductCatalog.filter(
          { catalog_id, is_active: true },
          '-created_date',
          batchSize,
          skip
        );

        allProductsCount += batch.length;

        if (batch.length < batchSize) break;
        skip += batchSize;
      }

      console.log(`📊 [WORKER COUNT RESULT] סה"כ מוצרים פעילים: ${allProductsCount}`);
      
      console.log(`💾 [WORKER UPDATE CATALOG] מעדכן Catalog ${catalog_id} עם product_count=${allProductsCount}`);
      await base44.asServiceRole.entities.Catalog.update(catalog_id, {
        product_count: allProductsCount,
        last_generated_at: new Date().toISOString(),
        status: 'ready'
      });
      console.log(`✅ [WORKER UPDATE CATALOG DONE] Catalog עודכן בהצלחה`);

      const resultData = {
        total_products_created: newProductsCount,
        total_chunks_processed: num_chunks,
        catalog_id
      };

      console.log(`🎉 [WORKER COMPLETE] התהליך הושלם! מוצרים חדשים=${newProductsCount}, סה"כ בקטלוג=${allProductsCount}`);
      
      await updateProcessStatus(base44, process_id, 100, 'completed', 
        `הושלם! נוצרו ${newProductsCount.toLocaleString('he-IL')} מוצרים חדשים (${num_chunks} חלקים)`, resultData);

      return new Response(JSON.stringify({
        success: true,
        completed: true,
        total_products: newProductsCount,
        process_id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error(`❌❌❌ [WORKER FATAL ERROR] chunk=${chunk_number}, error:`, error);
    console.error(`❌ [WORKER STACK]`, error.stack);
    
    await updateProcessStatus(base44, process_id, 0, 'failed', 
      `שגיאה בחלק ${chunk_number + 1}: ${error.message}`, null);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      chunk_number,
      process_id
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});