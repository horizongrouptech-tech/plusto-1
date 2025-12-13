import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { customer_email } = await req.json();

        if (!customer_email) {
            return new Response(JSON.stringify({ error: 'Customer email is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Starting Excel export for catalog of ${customer_email}`);

        // טען את כל המוצרים מהקטלוג
        const allProducts = await base44.asServiceRole.entities.ProductCatalog.filter({
            customer_email: customer_email,
            is_active: true
        });

        console.log(`Found ${allProducts.length} products to export`);

        if (allProducts.length === 0) {
            return new Response(JSON.stringify({ 
                error: 'לא נמצאו מוצרים לייצוא' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // הכנת נתונים לייצוא CSV (Excel compatible)
        const headers = [
            'שם המוצר',
            'ברקוד',
            'מחיר קנייה',
            'מחיר מכירה',
            'קטגוריה',
            'ספק',
            'כמות במלאי',
            'מכירות חודשיות',
            'רווח גולמי',
            'אחוז רווח',
            'קוד ספק',
            'קטגוריה משנית',
            'מחיר בחנות',
            'הכנסות מכירה',
            'מקור נתונים',
            'איכות נתונים',
            'תאריך עדכון',
            'פעיל'
        ];

        const csvRows = [headers.join(',')];

        for (const product of allProducts) {
            const row = [
                `"${(product.product_name || '').replace(/"/g, '""')}"`,
                `"${product.barcode || ''}"`,
                product.cost_price || 0,
                product.selling_price || 0,
                `"${(product.category || '').replace(/"/g, '""')}"`,
                `"${(product.supplier || '').replace(/"/g, '""')}"`,
                product.inventory || 0,
                product.monthly_sales || 0,
                product.gross_profit || 0,
                product.profit_percentage || 0,
                `"${product.supplier_item_code || ''}"`,
                `"${(product.secondary_category || '').replace(/"/g, '""')}"`,
                product.store_price || 0,
                product.sales_revenue || 0,
                `"${product.data_source || ''}"`,
                `"${product.data_quality || ''}"`,
                `"${product.last_updated || product.created_date || ''}"`,
                product.is_active ? 'כן' : 'לא'
            ];
            csvRows.push(row.join(','));
        }

        const csvContent = csvRows.join('\n');
        
        // הוספת BOM לתמיכה בעברית ב-Excel
        const bom = '\uFEFF';
        const fullCsvContent = bom + csvContent;

        const filename = `catalog_${customer_email.replace('@', '_')}_${new Date().toISOString().split('T')[0]}.csv`;

        console.log(`Excel export completed: ${allProducts.length} products exported to ${filename}`);

        return new Response(fullCsvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Error exporting catalog to Excel:', error);
        return new Response(JSON.stringify({ 
            error: 'שגיאה בייצוא לאקסל', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});