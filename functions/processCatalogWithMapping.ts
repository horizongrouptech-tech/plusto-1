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

// הגדרת סוגי שדות - מורחב לתמיכה בקטלוגים מגוונים
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

// עדכון סטטוס תהליך
const updateProcessStatus = async (base44, processId, progress, status, currentStep, resultData = null, errorMessage = null) => {
  try {
    const updateData = {
      progress: Math.min(Math.max(progress, 0), 100),
      status,
      current_step: currentStep
    };
    
    if (resultData) updateData.result_data = resultData;
    if (errorMessage) updateData.error_message = errorMessage;
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    await base44.asServiceRole.entities.ProcessStatus.update(processId, updateData);
  } catch (error) {
    console.error('שגיאה בעדכון סטטוס:', error);
  }
};

// עיבוד CSV
function processCSV(content) {
  const lines = content.split(/\r\n|\n/).filter(line => line.trim());
  const delimiter = (lines[0] || '').includes('\t') ? '\t' : ',';
  
  try {
    return parse(content, {
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true,
      columns: true
    });
  } catch (e) {
    // פרסור ידני
    const headerRow = lines[0].split(delimiter).map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(delimiter);
      const obj = {};
      headerRow.forEach((h, i) => {
        obj[h] = values[i]?.trim() || '';
      });
      return obj;
    });
  }
}

// עיבוד Excel
function processExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return xlsx.utils.sheet_to_json(worksheet, { defval: null });
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { 
    customer_email, 
    file_url, 
    catalog_id, 
    mapping,
    import_with_errors = false
  } = await req.json();

  if (!customer_email || !file_url || !catalog_id || !mapping) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'חסרים פרמטרים נדרשים' 
    }), { status: 400 });
  }

  // יצירת רשומת תהליך
  const process = await base44.asServiceRole.entities.ProcessStatus.create({
    customer_email,
    catalog_id,
    process_type: 'catalog_upload',
    status: 'running',
    progress: 5,
    current_step: 'מתחיל עיבוד קובץ...',
    started_at: new Date().toISOString()
  });

  try {
    await updateProcessStatus(base44, process.id, 10, 'running', 'מוריד קובץ...');

    // הורדת הקובץ
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`נכשל בהורדת הקובץ: ${response.statusText}`);
    }

    // זיהוי סוג קובץ
    const contentType = response.headers.get('content-type') || '';
    const isExcel = contentType.includes('spreadsheet') || 
                    contentType.includes('excel') ||
                    file_url.toLowerCase().endsWith('.xlsx') ||
                    file_url.toLowerCase().endsWith('.xls');

    let records;
    
    if (isExcel) {
      const buffer = await response.arrayBuffer();
      records = processExcel(buffer);
    } else {
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      let text;
      try {
        text = new TextDecoder('utf-8').decode(uint8Array);
      } catch (e) {
        text = new TextDecoder('windows-1255').decode(uint8Array);
      }
      records = processCSV(text);
    }

    if (!records || records.length === 0) {
      throw new Error('הקובץ ריק או לא נמצאו נתונים');
    }

    await updateProcessStatus(base44, process.id, 30, 'running', `מעבד ${records.length} שורות...`);

    await updateProcessStatus(base44, process.id, 40, 'running', 'ממיר נתונים לפי המיפוי...');

    // עיבוד כל רשומה לפי המיפוי
    const productsToCreate = [];
    const invalidRows = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // בניית אובייקט מוצר לפי המיפוי
      const product = {
        catalog_id,
        customer_email,
        is_active: true,
        data_source: 'file_upload',
        last_updated: new Date().toISOString()
      };

      const missingFields = [];
      const validationErrors = []; // NEW: מעקב אחר שגיאות ספציפיות

      // מיפוי שדות
      for (const [systemField, sourceColumn] of Object.entries(mapping)) {
        if (sourceColumn && record[sourceColumn] !== undefined) {
          const fieldType = FIELD_TYPES[systemField] || 'text';
          product[systemField] = cleanValue(record[sourceColumn], fieldType);
        }
      }

      // בדיקת שדות חובה
      if (!product.product_name || product.product_name.trim() === '') {
        validationErrors.push('שם מוצר חסר');
        // גם אם import_with_errors=true, שם מוצר הוא חובה - ניתן שם זמני
        if (import_with_errors) {
          product.product_name = `מוצר ללא שם - שורה ${i + 1}`;
        } else {
          invalidRows.push({ row: i + 1, reason: 'שם מוצר חסר' });
          continue;
        }
      }

      // חישוב רווח - גמיש לפי העמודות שזמינות
      const costPrice = product.cost_price || product.cost_price_no_vat || 0;
      const sellingPrice = product.selling_price || product.store_price || product.store_price_alt || 0;
      
      // שמירת מחיר עלות ומכירה מנורמלים
      if (!product.cost_price && product.cost_price_no_vat) {
        product.cost_price = product.cost_price_no_vat;
      }
      if (!product.selling_price && product.store_price) {
        product.selling_price = product.store_price;
      }
      
      product.gross_profit = Math.max(0, sellingPrice - costPrice);
      // אם יש אחוז רווחיות בקובץ - נשתמש בו, אחרת נחשב
      if (!product.profit_percentage || product.profit_percentage === 0) {
        product.profit_percentage = costPrice > 0 ? Math.round(((sellingPrice - costPrice) / costPrice) * 100) : 0;
      }

      // קביעת איכות נתונים - גמיש יותר
      if (!costPrice && !product.cost_price_no_vat) {
        missingFields.push('מחיר עלות');
      }
      if (!sellingPrice && !product.store_price && !product.store_price_alt) {
        missingFields.push('מחיר מכירה');
      }
      
      product.missing_fields = missingFields;
      product.data_quality = missingFields.length === 0 ? 'complete' : 
                             missingFields.length <= 1 ? 'partial' : 'incomplete';
      
      // סימון מוצרים שיובאו עם שגיאות
      const hasErrors = validationErrors.length > 0;
      product.needs_review = missingFields.length > 0 || hasErrors;
      product.import_errors = hasErrors ? validationErrors : null;

      productsToCreate.push(product);
    }

    await updateProcessStatus(base44, process.id, 60, 'running', 'שומר מוצרים חדשים...');

    // יצירת מוצרים חדשים - batches קטנים למניעת חסימת מגבלת 5000 של Base44
    let createdCount = 0;
    if (productsToCreate.length > 0) {
      // Base44 מגביל ל-5000 רשומות, נשתמש ב-batch של 200 עם הפסקות
      const batchSize = 200;
      const totalBatches = Math.ceil(productsToCreate.length / batchSize);
      
      for (let i = 0; i < productsToCreate.length; i += batchSize) {
        const batch = productsToCreate.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        
        try {
          await base44.asServiceRole.entities.ProductCatalog.bulkCreate(batch);
          createdCount += batch.length;
        } catch (batchError) {
          console.error(`שגיאה ב-batch ${currentBatch}:`, batchError);
          // ניסיון ליצור אחד-אחד במקרה של שגיאה
          for (const product of batch) {
            try {
              await base44.asServiceRole.entities.ProductCatalog.create(product);
              createdCount++;
            } catch (singleError) {
              console.error('שגיאה ביצירת מוצר בודד:', singleError);
            }
          }
        }
        
        const progress = 60 + Math.round((createdCount / productsToCreate.length) * 25);
        await updateProcessStatus(base44, process.id, progress, 'running', 
          `נוצרו ${createdCount.toLocaleString('he-IL')} מתוך ${productsToCreate.length.toLocaleString('he-IL')} מוצרים (batch ${currentBatch}/${totalBatches})...`);
        
        // הפסקה בין batches למניעת עומס על השרת
        if (i + batchSize < productsToCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
    }

    await updateProcessStatus(base44, process.id, 90, 'running', 'מעדכן ישות קטלוג...');

    // עדכון ישות הקטלוג - ספירה מדויקת של כל המוצרים
    try {
      // ספירת כל המוצרים הפעילים בקטלוג
      let totalCount = 0;
      let hasMore = true;
      let skip = 0;
      const countBatchSize = 5000;
      
      while (hasMore) {
        const batch = await base44.asServiceRole.entities.ProductCatalog.filter(
          { catalog_id, is_active: true },
          '-created_date',
          countBatchSize,
          skip
        );
        totalCount += batch.length;
        skip += batch.length;
        if (batch.length < countBatchSize) {
          hasMore = false;
        }
      }
      
      await base44.asServiceRole.entities.Catalog.update(catalog_id, {
        product_count: totalCount,
        last_generated_at: new Date().toISOString(),
        status: 'ready'
      });
    } catch (e) {
      console.warn('שגיאה בעדכון קטלוג:', e);
    }

    const resultData = {
      created_count: createdCount,
      invalid_rows: invalidRows.length,
      total_processed: records.length,
      catalog_id,
      products_with_errors: productsToCreate.filter(p => p.import_errors).length
    };

    await updateProcessStatus(base44, process.id, 100, 'completed', 
      `הושלם! נוצרו ${createdCount} מוצרים`, resultData);

    return new Response(JSON.stringify({
      success: true,
      process_id: process.id,
      ...resultData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in processCatalogWithMapping:', error);
    await updateProcessStatus(base44, process.id, 0, 'failed', 
      `שגיאה: ${error.message}`, null, error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      process_id: process.id
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});