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
    await updateProcessStatus(base44, process.id, 10, 'running', 'בודק גודל הקובץ...');

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

    let totalRows;
    
    // ספירת שורות מהירה בלבד - ללא עיבוד מלא
    if (isExcel) {
      const buffer = await response.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'buffer', sheetRows: 1 });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const range = xlsx.utils.decode_range(firstSheet['!ref'] || 'A1');
      totalRows = range.e.r - range.s.r; // מספר שורות כולל
    } else {
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const text = new TextDecoder('utf-8').decode(uint8Array);
      const lines = text.split(/\r\n|\n/).filter(line => line.trim());
      totalRows = lines.length - 1; // מספר שורות ללא כותרת
    }

    if (!totalRows || totalRows === 0) {
      throw new Error('הקובץ ריק או לא נמצאו נתונים');
    }

    // חישוב chunks
    const CHUNK_SIZE = 2000;
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

    await updateProcessStatus(base44, process.id, 20, 'running', 
      `זוהו ${totalRows.toLocaleString('he-IL')} מוצרים. מתחיל עיבוד ב-${totalChunks} חלקים...`);

    // שמירת מטא-דטה ל-ProcessStatus
    await base44.asServiceRole.entities.ProcessStatus.update(process.id, {
      metadata: {
        file_url,
        mapping,
        catalog_id,
        customer_email,
        total_rows: totalRows,
        chunk_size: CHUNK_SIZE,
        import_with_errors
      }
    });

    // קריאה ל-worker הראשון
    await base44.asServiceRole.functions.invoke('processCatalogChunkWorker', {
      process_id: process.id,
      chunk_number: 0,
      total_chunks: totalChunks
    });

    // החזרת תגובה מיידית - העיבוד ממשיך ברקע
    return new Response(JSON.stringify({
      success: true,
      process_id: process.id,
      total_rows: totalRows,
      total_chunks: totalChunks,
      message: `התחיל עיבוד ${totalRows.toLocaleString('he-IL')} מוצרים ב-${totalChunks} שלבים`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in processCatalogWithMapping orchestrator:', error);
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