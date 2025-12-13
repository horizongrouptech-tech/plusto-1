import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * ביטול תהליך עיבוד תחזית וניקוי נתונים זמניים
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { forecast_id } = await req.json();

        if (!forecast_id) {
            return Response.json({ 
                error: 'Missing forecast_id' 
            }, { status: 400 });
        }

        // קבלת התחזית
        const forecast = await base44.asServiceRole.entities.ManualForecast.get(forecast_id);

        if (!forecast) {
            return Response.json({ 
                error: 'Forecast not found' 
            }, { status: 404 });
        }

        // בדיקת הרשאות
        if (forecast.customer_email !== user.email && user.role !== 'admin') {
            return Response.json({ 
                error: 'Unauthorized to cancel this forecast' 
            }, { status: 403 });
        }

        // מחיקת כל השורות הקשורות
        const rows = await base44.asServiceRole.entities.ManualForecastRow.filter({
            forecast_id
        });

        for (const row of rows) {
            await base44.asServiceRole.entities.ManualForecastRow.delete(row.id);
        }

        // מחיקת כל הגיליונות
        const sheets = await base44.asServiceRole.entities.ManualForecastSheet.filter({
            forecast_id
        });

        for (const sheet of sheets) {
            await base44.asServiceRole.entities.ManualForecastSheet.delete(sheet.id);
        }

        // מחיקת גרסאות
        const versions = await base44.asServiceRole.entities.ManualForecastVersion.filter({
            forecast_id
        });

        for (const version of versions) {
            await base44.asServiceRole.entities.ManualForecastVersion.delete(version.id);
        }

        // מחיקת התחזית עצמה
        await base44.asServiceRole.entities.ManualForecast.delete(forecast_id);

        return Response.json({
            success: true,
            message: 'Forecast cancelled and data cleaned',
            deleted: {
                rows: rows.length,
                sheets: sheets.length,
                versions: versions.length
            }
        });

    } catch (error) {
        console.error('Error cancelling forecast:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});