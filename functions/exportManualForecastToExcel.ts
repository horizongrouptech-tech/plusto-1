import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as XLSX from 'npm:xlsx@0.18.5';

/**
 * יצוא תחזית ידנית לקובץ Excel
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { forecast_id, sheet_id } = await req.json();

        if (!forecast_id) {
            return Response.json({ 
                error: 'Missing forecast_id' 
            }, { status: 400 });
        }

        // טעינת נתוני התחזית
        const forecast = await base44.entities.ManualForecast.get(forecast_id);
        
        if (!forecast) {
            return Response.json({ error: 'Forecast not found' }, { status: 404 });
        }

        // טעינת הגיליונות
        const sheets = await base44.entities.ManualForecastSheet.filter({
            forecast_id: forecast_id
        });

        // יצירת Workbook
        const workbook = XLSX.utils.book_new();

        // אם צוין גיליון ספציפי - יצא רק אותו
        const sheetsToExport = sheet_id 
            ? sheets.filter(s => s.id === sheet_id)
            : sheets;

        for (const sheet of sheetsToExport) {
            // טעינת השורות
            const rows = await base44.entities.ManualForecastRow.filter({
                forecast_id: forecast_id,
                sheet_id: sheet.id
            });

            if (rows.length === 0) continue;

            // הכנת הנתונים לגיליון
            const sheetData = [];
            
            // שורת כותרת
            const headers = [
                'תקופה',
                'קטגוריה',
                'תת-קטגוריה',
                'הכנסות',
                'הוצאות',
                'רווח',
                'מטבע',
                'הערות'
            ];
            sheetData.push(headers);

            // שורות הנתונים
            rows.forEach(row => {
                sheetData.push([
                    row.period_month || '',
                    row.category || '',
                    row.subcategory || '',
                    row.revenue || 0,
                    row.expenses || 0,
                    row.profit || (row.revenue - row.expenses) || 0,
                    row.currency || 'ILS',
                    row.notes || ''
                ]);
            });

            // יצירת worksheet
            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

            // עיצוב עמודות
            worksheet['!cols'] = [
                { wch: 12 }, // תקופה
                { wch: 15 }, // קטגוריה
                { wch: 15 }, // תת-קטגוריה
                { wch: 12 }, // הכנסות
                { wch: 12 }, // הוצאות
                { wch: 12 }, // רווח
                { wch: 8 },  // מטבע
                { wch: 30 }  // הערות
            ];

            // הוספת הגיליון ל-workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheet_name || `גיליון ${sheet.sheet_index + 1}`);
        }

        // המרה ל-buffer
        const excelBuffer = XLSX.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx' 
        });

        // החזרת הקובץ
        return new Response(excelBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="forecast_${forecast_id}_${Date.now()}.xlsx"`
            }
        });

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});