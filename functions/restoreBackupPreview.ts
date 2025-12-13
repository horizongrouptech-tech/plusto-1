import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3.x';

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

        const { s3_path, preview_only = true } = await req.json();

        if (!s3_path) {
            return Response.json({
                success: false,
                error: 's3_path is required'
            }, { status: 400 });
        }

        // יצירת S3 client
        const s3Client = new S3Client({
            region: Deno.env.get('AWS_REGION'),
            credentials: {
                accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')
            }
        });

        console.log(`Fetching backup from S3: ${s3_path}`);

        // הורדת הקובץ מ-S3
        const getCommand = new GetObjectCommand({
            Bucket: Deno.env.get('AWS_S3_BUCKET_NAME'),
            Key: s3_path
        });

        const response = await s3Client.send(getCommand);
        const bodyText = await response.Body.transformToString();
        const backupData = JSON.parse(bodyText);

        // הכנת סיכום הגיבוי
        const summary = {
            s3_path: s3_path,
            backup_date: response.Metadata?.['backup-date'] || 'Unknown',
            file_size_mb: (response.ContentLength / 1024 / 1024).toFixed(2),
            entities: {}
        };

        let totalRecords = 0;
        for (const [entityName, records] of Object.entries(backupData)) {
            if (Array.isArray(records)) {
                summary.entities[entityName] = {
                    count: records.length,
                    sample: records.slice(0, 3) // 3 רשומות לדוגמה
                };
                totalRecords += records.length;
            }
        }

        summary.total_records = totalRecords;
        summary.total_entities = Object.keys(summary.entities).length;

        // אם preview_only = false, אפשר להוסיף כאן לוגיקת שחזור מלאה
        // אבל זה מסוכן ולא מומלץ ללא אישור מפורש
        if (!preview_only) {
            return Response.json({
                success: false,
                error: 'Full restore is not implemented for safety reasons. Please contact support for data restoration.',
                preview: summary
            }, { status: 403 });
        }

        return Response.json({
            success: true,
            message: 'תצוגה מקדימה של הגיבוי',
            preview: summary,
            note: 'זוהי תצוגה מקדימה בלבד. לשחזור מלא, צור קשר עם התמיכה.'
        });

    } catch (error) {
        console.error('Error previewing backup:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});