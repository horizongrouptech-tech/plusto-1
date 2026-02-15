import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as xlsx from 'npm:xlsx@0.18.5';

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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { 
    customer_email, 
    file_url, 
    catalog_id, 
    mapping,
    import_with_errors = false,
    header_row_index = 0
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
    
    // ספירת שורות נתונים בלבד (ללא שורות מטא-דטה וכותרת)
    if (isExcel) {
      const buffer = await response.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const range = xlsx.utils.decode_range(firstSheet['!ref'] || 'A1');
      const totalFileRows = range.e.r - range.s.r + 1; // total rows in file (1-based)
      totalRows = totalFileRows - header_row_index - 1; // subtract header and pre-header rows
    } else {
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const text = new TextDecoder('utf-8').decode(uint8Array);
      const lines = text.split(/\r\n|\n/).filter(line => line.trim());
      totalRows = lines.length - header_row_index - 1; // subtract header and pre-header rows
    }

    if (!totalRows || totalRows <= 0) {
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
        import_with_errors,
        header_row_index
      }
    });

    // קריאה ל-worker הראשון - תוכן מוטמע במקום קריאה חיצונית
    // מעבד את כל הנתונים כאן במקום לקרוא לפונקציה נפרדת
    
    const response2 = await fetch(file_url);
    const contentType2 = response2.headers.get('content-type') || '';
    const isExcel2 = contentType2.includes('spreadsheet') || 
                    contentType2.includes('excel') ||
                    file_url.toLowerCase().endsWith('.xlsx') ||
                    file_url.toLowerCase().endsWith('.xls');

    let allRawRows;
    
    if (isExcel2) {
      const buffer = await response2.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      allRawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    } else {
      const buffer = await response2.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      let text;
      try {
        text = new TextDecoder('utf-8').decode(uint8Array);
      } catch (e) {
        text = new TextDecoder('windows-1255').decode(uint8Array);
      }
      const lines = text.split(/\r\n|\n/).filter(line => line.trim());
      const delimiter = (lines[0] || '').includes('\t') ? '\t' : ',';
      allRawRows = lines.map(line => line.split(delimiter).map(v => v?.trim() || ''));
    }

    const headerRowIdx = header_row_index || 0;
    const headerRow = allRawRows[headerRowIdx];
    const headers = headerRow.map(cell => {
      if (cell === null || cell === undefined) return '';
      return String(cell).trim().replace(/[\uFEFF\u200E-\u202E]/g, '').replace(/\s+/g, ' ').trim();
    });
    const dataRows = allRawRows.slice(headerRowIdx + 1);

    const allRecords = dataRows.map(row => {
      if (!row || !Array.isArray(row)) return null;
      const obj = {};
      headers.forEach((header, i) => {
        if (header && row[i] !== undefined && row[i] !== null) {
          obj[header] = row[i];
        }
      });
      return obj;
    }).filter(obj => obj && Object.keys(obj).length > 0);

    await updateProcessStatus(base44, process.id, 40, 'running', 'מעבד מוצרים...');

    // עיבוד כל המוצרים
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

    const cleanValueInline = (value, type) => {
      if (value === null || value === undefined || value === '') {
        return type === 'number' ? 0 : '';
      }
      const strValue = String(value).trim();
      if (type === 'number') {
        const cleaned = strValue.replace(/[\u200E-\u202E]/g, '').replace(/[₪$€£,\s]/g, '').replace(/[^\d.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
      return strValue.replace(/[\uFEFF\u200E-\u202E]/g, '').trim();
    };

    const productsToCreate = [];
    for (let i = 0; i < allRecords.length; i++) {
      const record = allRecords[i];
      
      const product = {
        catalog_id,
        customer_email,
        is_active: true,
        data_source: 'file_upload',
        last_updated: new Date().toISOString()
      };

      const missingFields = [];
      const validationErrors = [];

      for (const [systemField, sourceColumn] of Object.entries(mapping)) {
        if (sourceColumn && record[sourceColumn] !== undefined) {
          const fieldType = FIELD_TYPES[systemField] || 'text';
          product[systemField] = cleanValueInline(record[sourceColumn], fieldType);
        }
      }

      if (!product.product_name || product.product_name.trim() === '') {
        if (import_with_errors) {
          product.product_name = `מוצר ללא שם - שורה ${i + 1}`;
        } else {
          continue;
        }
      }

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

      if (!costPrice && !product.cost_price_no_vat) {
        missingFields.push('מחיר עלות');
      }
      if (!sellingPrice && !product.store_price && !product.store_price_alt) {
        missingFields.push('מחיר מכירה');
      }
      
      product.missing_fields = missingFields;
      product.data_quality = missingFields.length === 0 ? 'complete' : 
                             missingFields.length <= 1 ? 'partial' : 'incomplete';
      
      product.needs_review = missingFields.length > 0;
      product.import_errors = validationErrors.length > 0 ? validationErrors : null;

      productsToCreate.push(product);
    }

    await updateProcessStatus(base44, process.id, 60, 'running', `יוצר ${productsToCreate.length} מוצרים...`);

    // יצירה בחלקים
    let createdCount = 0;
    const batchSize = 500;
    
    for (let i = 0; i < productsToCreate.length; i += batchSize) {
      const batch = productsToCreate.slice(i, i + batchSize);
      const progressPercent = 60 + Math.round((i / productsToCreate.length) * 30);
      
      await updateProcessStatus(base44, process.id, progressPercent, 'running', 
        `יוצר מוצרים ${i + 1}-${Math.min(i + batchSize, productsToCreate.length)}...`);
      
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
    }

    await updateProcessStatus(base44, process.id, 95, 'running', 'מעדכן קטלוג...');

    await base44.asServiceRole.entities.Catalog.update(catalog_id, {
      product_count: createdCount,
      last_generated_at: new Date().toISOString(),
      status: 'ready'
    });

    const resultData = {
      total_products_created: createdCount,
      catalog_id
    };

    await updateProcessStatus(base44, process.id, 100, 'completed', 
      `הושלם! נוצרו ${createdCount.toLocaleString('he-IL')} מוצרים`, resultData);

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