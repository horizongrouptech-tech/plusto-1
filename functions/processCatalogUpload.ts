import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parse } from "npm:csv-parse/sync";

function normalizeHeaders(headers) {
    const headerMapping = {
        'שם מוצר': ['שם מוצר', 'שם פריט', 'product_name', 'product name'],
        'ברקוד': ['ברקוד', 'barcode'],
        'מחיר קניה': ['מחיר קניה', 'מחיר עלות', 'cost_price', 'cost price', 'מחיר עלות ללא מעמ'],
        'מחיר מכירה': ['מחיר מכירה', 'מחיר לצרכן', 'selling_price', 'selling price', 'מחיר בחנות'],
        'קטגוריה': ['קטגוריה', 'קטגוריה ראשית', 'category'],
        'ספק': ['ספק', 'supplier'],
        'מלאי': ['מלאי', 'כמות במלאי', 'inventory', 'stock'],
        'מק"ט ספק': ['מק"ט ספק', 'מק"ט-ספק', 'קוד פריט ספק', 'supplier_sku', 'קוד פריט']
    };

    const normalized = {};
    headers.forEach(header => {
        const headerTrimmed = header.trim();
        for (const key in headerMapping) {
            if (headerMapping[key].some(variant => 
                variant.toLowerCase() === headerTrimmed.toLowerCase() ||
                headerTrimmed.toLowerCase().includes(variant.toLowerCase())
            )) {
                normalized[key] = headerTrimmed;
                break;
            }
        }
    });

    return normalized;
}

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
        console.error('שגיאה בעדכון סטטוס התהליך:', error);
    }
};

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const { customer_email, file_url, catalog_id } = await req.json();

    if (!customer_email || !file_url || !catalog_id) {
        return new Response(JSON.stringify({ success: false, error: 'Customer email, file URL, and catalog ID are required.' }), { status: 400 });
    }

    const process = await base44.asServiceRole.entities.ProcessStatus.create({
        customer_email,
        catalog_id,
        process_type: 'catalog_upload',
        status: 'running',
        progress: 5,
        current_step: 'מוריד קובץ מהשרת...',
        started_at: new Date().toISOString()
    });

    try {
        await updateProcessStatus(base44, process.id, 10, 'running', 'מעבד את הקובץ...');

        const response = await fetch(file_url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file from ${file_url}: ${response.statusText}`);
        }
        const fileContent = await response.text();

        let records;
        try {
            records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });
        } catch (e) {
            throw new Error(`Failed to parse CSV: ${e.message}`);
        }

        if (!records || records.length === 0) {
            throw new Error('הקובץ ריק או שלא הכיל נתונים חוקיים.');
        }

        const normalizedHeaders = normalizeHeaders(Object.keys(records[0]));
        
        await updateProcessStatus(base44, process.id, 30, 'running', `מעבד ${records.length} שורות נתונים...`);

        const processedProducts = records.map(record => {
            const productName = record[normalizedHeaders['שם מוצר']] || '';
            const costPriceStr = record[normalizedHeaders['מחיר קניה']] || '0';
            const sellingPriceStr = record[normalizedHeaders['מחיר מכירה']] || '0';
            const barcode = record[normalizedHeaders['ברקוד']] || null;
            const category = record[normalizedHeaders['קטגוריה']] || 'כללי';
            const supplier = record[normalizedHeaders['ספק']] || 'ללא ספק';
            const supplierItemCode = record[normalizedHeaders['מק"ט ספק']] || null;

            const costPrice = parseFloat(costPriceStr.toString().replace(/[^0-9.]/g, '')) || 0;
            const sellingPrice = parseFloat(sellingPriceStr.toString().replace(/[^0-9.]/g, '')) || 0;

            const missingFields = [];
            if (!productName || productName.trim() === '') missingFields.push('שם מוצר');
            if (costPrice === 0) missingFields.push('מחיר קניה');
            if (sellingPrice === 0) missingFields.push('מחיר מכירה');

            const dataQuality = missingFields.length === 0 ? 'complete' : 
                               missingFields.length <= 1 ? 'partial' : 'incomplete';
            const needsReview = missingFields.length > 0;

            return {
                catalog_id: catalog_id,
                customer_email: customer_email,
                product_name: productName || `מוצר ${Math.random().toString(36).substr(2, 9)}`,
                barcode: barcode,
                cost_price: costPrice,
                selling_price: sellingPrice,
                category: category,
                supplier: supplier,
                supplier_item_code: supplierItemCode,
                inventory: 0,
                monthly_sales: null,
                gross_profit: Math.max(0, sellingPrice - costPrice),
                profit_percentage: costPrice > 0 ? Math.round(((sellingPrice - costPrice) / costPrice) * 100) : 0,
                data_source: 'file_upload',
                data_quality: dataQuality,
                missing_fields: missingFields,
                needs_review: needsReview,
                is_active: true,
                last_updated: new Date().toISOString()
            };
        }).filter(product => product.product_name && product.product_name.trim() !== '');

        if (processedProducts.length === 0) {
            throw new Error('לא נמצאו מוצרים תקינים בקובץ.');
        }

        await updateProcessStatus(base44, process.id, 70, 'running', `שומר ${processedProducts.length} מוצרים למסד הנתונים...`);

        const createdProducts = await base44.asServiceRole.entities.ProductCatalog.bulkCreate(processedProducts);
        
        await updateProcessStatus(base44, process.id, 90, 'running', 'מעדכן את ישות הקטלוג...');

        // יצירה או עדכון של ישות הקטלוג
        try {
            const existingCatalogs = await base44.asServiceRole.entities.Catalog.filter({ id: catalog_id });
            const existingCatalog = existingCatalogs.length > 0 ? existingCatalogs[0] : null;

            if (existingCatalog) {
                await base44.asServiceRole.entities.Catalog.update(catalog_id, {
                    product_count: (existingCatalog.product_count || 0) + createdProducts.length,
                    last_generated_at: new Date().toISOString(),
                    status: 'ready',
                    is_active: true
                });
            } else {
                await base44.asServiceRole.entities.Catalog.create({
                    id: catalog_id,
                    customer_email: customer_email,
                    catalog_name: `קטלוג שהועלה - ${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}`,
                    creation_method: 'file_upload',
                    status: 'ready',
                    product_count: createdProducts.length,
                    last_generated_at: new Date().toISOString(),
                    is_active: true
                });
            }
        } catch (catalogError) {
            console.warn('שגיאה ביצירת/עדכון ישות הקטלוג:', catalogError);
        }

        await updateProcessStatus(base44, process.id, 100, 'completed', 'העלאת קטלוג הושלמה בהצלחה!', 
            { products_created: createdProducts.length, catalog_id: catalog_id });

        return new Response(JSON.stringify({ 
            success: true, 
            products_created: createdProducts.length, 
            catalog_id: catalog_id,
            process_id: process.id
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error in processCatalogUpload:", error);
        await updateProcessStatus(base44, process.id, 0, 'failed', `שגיאה: ${error.message}`, null, error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});