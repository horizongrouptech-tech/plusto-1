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
      throw new Error('חסר metadata בתהליך');
    }

    const { 
      file_url, 
      mapping, 
      catalog_id, 
      customer_email, 
      total_rows,
      num_chunks,
      import_with_errors,
      header_row_index = 0
    } = metadata;

    // 🎯 שימוש בטווח שהתקבל מהפרמטרים
    const startRow = start_row;
    const endRow = end_row;

    const progressPercent = Math.round((endRow / total_rows) * 100);
    await updateProcessStatus(base44, process_id, 
      progressPercent, 
      'running', 
      `מעבד חלק ${chunk_number + 1}/${num_chunks} (שורות ${startRow + 1}-${endRow})...`);

    // הורדת הקובץ
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`נכשל בהורדת הקובץ: ${response.statusText}`);
    }

    // זיהוי וניתוח - תמיד כ-raw arrays
    const contentType = response.headers.get('content-type') || '';
    const isExcel = contentType.includes('spreadsheet') || 
                    contentType.includes('excel') ||
                    file_url.toLowerCase().endsWith('.xlsx') ||
                    file_url.toLowerCase().endsWith('.xls');

    let allRawRows;
    
    if (isExcel) {
      const buffer = await response.arrayBuffer();
      allRawRows = processExcelRaw(buffer);
    } else {
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      let text;
      try {
        text = new TextDecoder('utf-8').decode(uint8Array);
      } catch (e) {
        text = new TextDecoder('windows-1255').decode(uint8Array);
      }
      allRawRows = processCSVRaw(text);
    }

    // בניית אובייקטים באמצעות שורת הכותרת הנכונה
    const headerRowIdx = header_row_index || 0;
    const headerRow = allRawRows[headerRowIdx];

    if (!headerRow || !Array.isArray(headerRow)) {
      throw new Error(`שורת כותרת לא נמצאה באינדקס ${headerRowIdx}`);
    }

    const headers = headerRow.map(cell => cleanCell(cell));
    // dataRows = שורות אחרי הכותרת - ללא סינון מוקדם!
    const dataRows = allRawRows.slice(headerRowIdx + 1);

    // המרת שורות גולמיות לאובייקטים
    const allRecords = dataRows.map(row => {
      if (!row || !Array.isArray(row)) return null;
      const obj = {};
      headers.forEach((header, i) => {
        if (header && row[i] !== undefined && row[i] !== null) {
          obj[header] = row[i];
        }
      });
      return obj;
    }).filter((obj) => {
      if (!obj || Object.keys(obj).length === 0) return false;
      // סינון רק שורות שבאמת ריקות לחלוטין
      const hasMeaningfulValue = Object.values(obj).some((v) => v != null && String(v).trim() !== '');
      return hasMeaningfulValue;
    });

    // 🎯 חילוץ רק הטווח המבוקש - כל chunk מעבד רק את השורות שלו
    const records = allRecords.slice(startRow, endRow);
    
    console.log(`Chunk ${chunk_number}: Processing rows ${startRow}-${endRow} (${records.length} records)`);

    // Sanity check: וידוא שלא עוברים על total_rows
    if (endRow > total_rows) {
      console.warn(`Worker: endRow=${endRow} > total_rows=${total_rows} - חישוב שגוי!`);
    }

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
    if (productsToCreate.length > 0) {
      const batchSize = 200;
      
      for (let i = 0; i < productsToCreate.length; i += batchSize) {
        const batch = productsToCreate.slice(i, i + batchSize);
        
        try {
          await base44.asServiceRole.entities.ProductCatalog.bulkCreate(batch);
          createdCount += batch.length;
        } catch (batchError) {
          console.error(`שגיאה ב-batch:`, batchError);
          for (const product of batch) {
            try {
              await base44.asServiceRole.entities.ProductCatalog.create(product);
              createdCount++;
            } catch (singleError) {
              console.error('שגיאה ביצירת מוצר בודד:', singleError);
            }
          }
        }
        
        if (i + batchSize < productsToCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // אין צורך לעדכן מונה מצטבר - ה-worker האחרון יספור את כל המוצרים

    // 🎯 בדיקה אם יש עוד chunks לפי end_row < total_rows
    if (endRow < total_rows) {
      const nextStartRow = endRow;
      const chunkSize = Math.ceil(total_rows / num_chunks);
      const nextEndRow = Math.min(nextStartRow + chunkSize, total_rows);
      
      // קריאה עצמית לחלק הבא
      await base44.asServiceRole.functions.invoke('processCatalogChunkWorker', {
        process_id,
        chunk_number: chunk_number + 1,
        start_row: nextStartRow,
        end_row: nextEndRow
      });
      
      return new Response(JSON.stringify({
        success: true,
        chunk_completed: chunk_number + 1,
        products_created_in_chunk: createdCount,
        next_chunk: chunk_number + 2,
        next_range: `${nextStartRow}-${nextEndRow}`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // זה החלק האחרון - סיום התהליך
      await updateProcessStatus(base44, process_id, 95, 'running', 'מעדכן ישות קטלוג...');

      // ספירה – שימוש ב-count ולא ב-filter (filter מחזיר תוצאה מקוצרת!)
      const processStartTime = processStatus.started_at;
      const newProductsCount = await base44.asServiceRole.entities.ProductCatalog.count({
        catalog_id,
        created_date: { $gte: processStartTime }
      });
      
      const allProductsCount = await base44.asServiceRole.entities.ProductCatalog.count({
        catalog_id,
        is_active: true
      });
      
      await base44.asServiceRole.entities.Catalog.update(catalog_id, {
        product_count: allProductsCount,
        last_generated_at: new Date().toISOString(),
        status: 'ready'
      });

      const resultData = {
        total_products_created: newProductsCount,
        total_chunks_processed: num_chunks,
        catalog_id
      };

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
    console.error('Error in chunk worker:', error);
    
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