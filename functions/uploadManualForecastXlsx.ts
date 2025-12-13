import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * פונקציה פשוטה - רק יוצרת רשומת תחזית ריקה
 * ללא פרסור הקובץ כדי למנוע Memory limit
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const { file_url, customer_email } = await req.json();

        if (!file_url || !customer_email) {
            return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        console.log('Creating forecast record for file:', file_url);

        const fileName = file_url.split('/').pop();

        // רק יצירת רשומת תחזית - בלי פרסור
        const forecast = await base44.asServiceRole.entities.ManualForecast.create({
            customer_email: customer_email,
            file_name: fileName,
            status: 'ready', // Set to ready to allow manual entry immediately
            sheet_count: 1
        });

        // יצירת גיליון ברירת מחדל
        await base44.asServiceRole.entities.ManualForecastSheet.create({
            forecast_id: forecast.id,
            sheet_name: 'תחזית עסקית',
            sheet_index: 0,
            header_row_index: 0,
            original_columns: [],
            row_count: 0
        });

        return new Response(JSON.stringify({
            success: true,
            forecast_id: forecast.id,
            message: 'תחזית נוצרה בהצלחה. כעת ניתן להזין נתונים ידנית.',
            status: 'ready'
        }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error('Error in uploadManualForecastXlsx:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message 
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});