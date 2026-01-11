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
    identifier_column,
    duplicate_action,
    import_with_errors = false // NEW: אפשרות לייבא שורות עם שגיאות
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

    // שליפת מוצרים קיימים לבדיקת כפילויות - עם pagination לעקיפת מגבלת 5000
    let existingProducts = [];
    if (duplicate_action === 'skip' || duplicate_action === 'update') {
      let skip = 0;
      const limit = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const batch = await base44.asServiceRole.entities.ProductCatalog.filter(
          { catalog_id, is_active: true },
          '-created_date',
          limit,
          skip
        );
        
        if (batch.length > 0) {
          existingProducts = existingProducts.concat(batch);
          skip += limit;
          console.log(`Fetched ${existingProducts.length} existing products so far...`);
        }
        
        hasMore = batch.length === limit;
      }
      console.log(`Total existing products fetched: ${existingProducts.length}`);
    }

    // יצירת מפה של מוצרים קיימים לפי עמודת המזהה
    const existingProductsMap = new Map();
    existingProducts.forEach(p => {
      const key = identifier_column === 'barcode' ? p.barcode :
                  identifier_column === 'product_name' ? p.product_name :
                  p.supplier_item_code;
      if (key) existingProductsMap.set(key.toLowerCase().trim(), p);
    });

    await updateProcessStatus(base44, process.id, 40, 'running', 'ממיר נתונים לפי המיפוי...');

    // עיבוד כל רשומה לפי המיפוי
    const productsToCreate = [];
    const productsToUpdate = [];
    const skippedDuplicates = [];
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
      
      // NEW: סימון מוצרים שיובאו עם שגיאות
      const hasErrors = validationErrors.length > 0;
      product.needs_review = missingFields.length > 0 || hasErrors;
      product.import_errors = hasErrors ? validationErrors : null; // שמירת השגיאות למעקב

      // בדיקת כפילות
      const identifierValue = identifier_column === 'barcode' ? product.barcode :
                              identifier_column === 'product_name' ? product.product_name :
                              product.supplier_item_code;
      
      const identifierKey = identifierValue?.toLowerCase().trim();
      const existingProduct = identifierKey ? existingProductsMap.get(identifierKey) : null;

      if (existingProduct) {
        // ✅ חדש: הגנה על מוצרים שנוצרו ידנית
        if (existingProduct.data_source === 'manual_entry') {
          skippedDuplicates.push({ 
            row: i + 1, 
            identifier: identifierValue, 
            reason: 'מוצר נוצר ידנית - מוגן מדריסה' 
          });
          continue;
        }
        
        if (duplicate_action === 'skip') {
          skippedDuplicates.push({ row: i + 1, identifier: identifierValue });
          continue;
        } else if (duplicate_action === 'update') {
          productsToUpdate.push({ id: existingProduct.id, data: product });
          continue;
        }
      }

      productsToCreate.push(product);
    }

    await updateProcessStatus(base44, process.id, 60, 'running', 'שומר מוצרים חדשים...');

    // יצירת מוצרים חדשים - יצירה בודדת לעקיפת מגבלת 5000 של Base44
    let createdCount = 0;
    const totalToCreate = productsToCreate.length;
    
    if (totalToCreate > 0) {
      console.log(`Starting to create ${totalToCreate} products...`);
      
      // עבור קטלוגים קטנים (עד 3000) - נשתמש ב-bulkCreate
      // עבור קטלוגים גדולים - נשתמש ב-create בודד
      const useBulkCreate = totalToCreate <= 3000;
      
      if (useBulkCreate) {
        // Bulk create בקבוצות קטנות
        const batchSize = 100;
        for (let i = 0; i < totalToCreate; i += batchSize) {
          const batch = productsToCreate.slice(i, i + batchSize);
          
          try {
            await base44.asServiceRole.entities.ProductCatalog.bulkCreate(batch);
            createdCount += batch.length;
          } catch (batchError) {
            console.error(`Bulk create failed at ${i}, falling back to single create:`, batchError.message);
            for (const product of batch) {
              try {
                await base44.asServiceRole.entities.ProductCatalog.create(product);
                createdCount++;
              } catch (e) {
                console.error('Single create error:', e.message);
              }
            }
          }
          
          const progress = 60 + Math.round((createdCount / totalToCreate) * 25);
          await updateProcessStatus(base44, process.id, progress, 'running', 
            `נוצרו ${createdCount.toLocaleString('he-IL')} מתוך ${totalToCreate.toLocaleString('he-IL')} מוצרים...`);
          
          if (i + batchSize < totalToCreate) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } else {
        // יצירה בודדת לקטלוגים גדולים - עוקף את מגבלת 5000
        console.log(`Large catalog detected (${totalToCreate}), using single create method...`);
        
        for (let i = 0; i < totalToCreate; i++) {
          try {
            await base44.asServiceRole.entities.ProductCatalog.create(productsToCreate[i]);
            createdCount++;
          } catch (createError) {
            console.error(`Error creating product ${i + 1}:`, createError.message);
          }
          
          // עדכון התקדמות כל 100 מוצרים
          if (createdCount % 100 === 0 || i === totalToCreate - 1) {
            const progress = 60 + Math.round((createdCount / totalToCreate) * 25);
            await updateProcessStatus(base44, process.id, progress, 'running', 
              `נוצרו ${createdCount.toLocaleString('he-IL')} מתוך ${totalToCreate.toLocaleString('he-IL')} מוצרים...`);
          }
          
          // הפסקה קצרה כל 50 מוצרים למניעת עומס
          if ((i + 1) % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 30));
          }
          
          // הפסקה ארוכה יותר כל 500 מוצרים
          if ((i + 1) % 500 === 0) {
            console.log(`Created ${createdCount} products, pausing...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      console.log(`Finished creating products. Total created: ${createdCount}`);
    }

    await updateProcessStatus(base44, process.id, 85, 'running', 'מעדכן מוצרים קיימים...');

    // עדכון מוצרים קיימים
    let updatedCount = 0;
    for (const { id, data } of productsToUpdate) {
      try {
        await base44.asServiceRole.entities.ProductCatalog.update(id, data);
        updatedCount++;
      } catch (e) {
        console.error(`שגיאה בעדכון מוצר ${id}:`, e);
      }
    }

    await updateProcessStatus(base44, process.id, 95, 'running', 'מעדכן ישות קטלוג...');

    // עדכון ישות הקטלוג
    try {
      const existingCatalogs = await base44.asServiceRole.entities.Catalog.filter({ id: catalog_id });
      if (existingCatalogs.length > 0) {
        const currentCount = existingCatalogs[0].product_count || 0;
        await base44.asServiceRole.entities.Catalog.update(catalog_id, {
          product_count: currentCount + createdCount,
          last_generated_at: new Date().toISOString(),
          status: 'ready'
        });
      }
    } catch (e) {
      console.warn('שגיאה בעדכון קטלוג:', e);
    }

    const resultData = {
      created_count: createdCount,
      updated_count: updatedCount,
      skipped_duplicates: skippedDuplicates.length,
      invalid_rows: invalidRows.length,
      total_processed: records.length,
      catalog_id,
      products_with_errors: productsToCreate.filter(p => p.import_errors).length + 
                           productsToUpdate.filter(p => p.data.import_errors).length // NEW: ספירת מוצרים עם שגיאות
    };

    await updateProcessStatus(base44, process.id, 100, 'completed', 
      `הושלם! נוצרו ${createdCount}, עודכנו ${updatedCount}`, resultData);

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