import { requireAuth, supabaseAdmin } from './_helpers.js';
import { parse } from 'csv-parse/sync';

function normalizeHeaders(headers) {
  const headerMapping = {
    'שם מוצר': ['שם מוצר', 'שם פריט', 'product_name', 'product name'],
    'ברקוד': ['ברקוד', 'barcode'],
    'מחיר קניה': ['מחיר קניה', 'מחיר עלות', 'cost_price', 'cost price', 'מחיר עלות ללא מעמ'],
    'מחיר מכירה': ['מחיר מכירה', 'מחיר לצרכן', 'selling_price', 'selling price', 'מחיר בחנות'],
    'קטגוריה': ['קטגוריה', 'קטגוריה ראשית', 'category'],
    'ספק': ['ספק', 'supplier'],
    'מלאי': ['מלאי', 'כמות במלאי', 'inventory', 'stock'],
    'מק"ט ספק': ['מק"ט ספק', 'מק"ט-ספק', 'קוד פריט ספק', 'supplier_sku', 'קוד פריט'],
  };
  const normalized = {};
  headers.forEach((header) => {
    const h = header.trim();
    for (const key in headerMapping) {
      if (headerMapping[key].some((v) => v.toLowerCase() === h.toLowerCase() || h.toLowerCase().includes(v.toLowerCase()))) {
        normalized[key] = h;
        break;
      }
    }
  });
  return normalized;
}

async function updateProcess(id, progress, status, currentStep, extraData = {}) {
  const payload = { progress: Math.min(Math.max(progress, 0), 100), status, current_step: currentStep, ...extraData };
  if (status === 'completed' || status === 'failed') payload.completed_at = new Date().toISOString();
  await supabaseAdmin.from('process_status').update(payload).eq('id', id);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { customer_email, file_url, catalog_id } = req.body ?? {};
  if (!customer_email || !file_url || !catalog_id) {
    return res.status(400).json({ success: false, error: 'customer_email, file_url, and catalog_id are required.' });
  }

  const { data: process } = await supabaseAdmin.from('process_status').insert({
    customer_email, catalog_id, process_type: 'catalog_upload', status: 'running',
    progress: 5, current_step: 'מוריד קובץ מהשרת...', started_at: new Date().toISOString(),
  }).select().single();

  try {
    await updateProcess(process.id, 10, 'running', 'מעבד את הקובץ...');

    const response = await fetch(file_url);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
    const fileContent = await response.text();

    let records;
    try {
      records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });
    } catch (e) {
      throw new Error(`Failed to parse CSV: ${e.message}`);
    }

    if (!records || records.length === 0) throw new Error('הקובץ ריק או שלא הכיל נתונים חוקיים.');

    const normalizedHeaders = normalizeHeaders(Object.keys(records[0]));
    await updateProcess(process.id, 30, 'running', `מעבד ${records.length} שורות נתונים...`);

    const processedProducts = records.map((record) => {
      const productName = record[normalizedHeaders['שם מוצר']] || '';
      const costPrice = parseFloat((record[normalizedHeaders['מחיר קניה']] || '0').toString().replace(/[^0-9.]/g, '')) || 0;
      const sellingPrice = parseFloat((record[normalizedHeaders['מחיר מכירה']] || '0').toString().replace(/[^0-9.]/g, '')) || 0;
      const barcode = record[normalizedHeaders['ברקוד']] || null;
      const category = record[normalizedHeaders['קטגוריה']] || 'כללי';
      const supplier = record[normalizedHeaders['ספק']] || 'ללא ספק';
      const supplierItemCode = record[normalizedHeaders['מק"ט ספק']] || null;

      const missingFields = [];
      if (!productName) missingFields.push('שם מוצר');
      if (costPrice === 0) missingFields.push('מחיר קניה');
      if (sellingPrice === 0) missingFields.push('מחיר מכירה');

      return {
        catalog_id,
        customer_email,
        product_name: productName || `מוצר ${Math.random().toString(36).substr(2, 9)}`,
        barcode,
        cost_price: costPrice,
        selling_price: sellingPrice,
        category,
        supplier,
        supplier_item_code: supplierItemCode,
        inventory: 0,
        gross_profit: Math.max(0, sellingPrice - costPrice),
        profit_percentage: costPrice > 0 ? Math.round(((sellingPrice - costPrice) / costPrice) * 100) : 0,
        data_source: 'file_upload',
        data_quality: missingFields.length === 0 ? 'complete' : missingFields.length <= 1 ? 'partial' : 'incomplete',
        missing_fields: missingFields,
        needs_review: missingFields.length > 0,
        is_active: true,
        last_updated: new Date().toISOString(),
      };
    }).filter((p) => p.product_name && p.product_name.trim() !== '');

    if (processedProducts.length === 0) throw new Error('לא נמצאו מוצרים תקינים בקובץ.');

    await updateProcess(process.id, 70, 'running', `שומר ${processedProducts.length} מוצרים...`);

    // Insert in batches of 100
    let createdCount = 0;
    for (let i = 0; i < processedProducts.length; i += 100) {
      const batch = processedProducts.slice(i, i + 100);
      const { data } = await supabaseAdmin.from('product').insert(batch).select('id');
      if (data) createdCount += data.length;
    }

    // Update catalog
    const { data: existingCatalog } = await supabaseAdmin.from('catalog').select('product_count').eq('id', catalog_id).single();
    if (existingCatalog) {
      await supabaseAdmin.from('catalog').update({
        product_count: (existingCatalog.product_count || 0) + createdCount,
        last_generated_at: new Date().toISOString(),
        status: 'ready', is_active: true,
      }).eq('id', catalog_id);
    }

    await updateProcess(process.id, 100, 'completed', 'העלאת קטלוג הושלמה בהצלחה!', { result_data: { products_created: createdCount, catalog_id } });

    return res.status(200).json({ success: true, products_created: createdCount, catalog_id, process_id: process.id });
  } catch (error) {
    console.error('[processCatalogUpload]', error);
    await updateProcess(process.id, 0, 'failed', `שגיאה: ${error.message}`, { error_message: error.message });
    return res.status(500).json({ success: false, error: error.message });
  }
}
