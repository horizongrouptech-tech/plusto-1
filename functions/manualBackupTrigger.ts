import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // בדיקת הרשאות - רק admin
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized - Admin only' 
            }, { status: 403 });
        }

        // קריאת ה-body בצורה בטוחה
        let backup_type = 'data';
        try {
            const body = await req.json();
            backup_type = body.backup_type || 'data';
        } catch (e) {
            console.log('No JSON body provided, using default backup_type: data');
        }

        // קבלת הטוקן הסודי
        const BACKUP_SECRET_TOKEN = Deno.env.get('BACKUP_SECRET_TOKEN');

        if (!BACKUP_SECRET_TOKEN) {
            throw new Error('BACKUP_SECRET_TOKEN not configured');
        }

        console.log(`Manually triggering backup by ${currentUser.email}`);

        // הפעלת הפונקציה
        const result = await base44.asServiceRole.functions.invoke('backupDatabaseToS3', {
            token: BACKUP_SECRET_TOKEN,
            triggered_by: currentUser.email
        });

        console.log('Backup result:', result);

        return Response.json({
            success: true,
            message: 'גיבוי נתונים הופעל בהצלחה',
            triggered_by: currentUser.email,
            result: result?.data || result
        });

    } catch (error) {
        console.error('Error triggering manual backup:', error);
        return Response.json({
            success: false,
            error: error.message || 'Unknown error occurred'
        }, { status: 500 });
    }
});