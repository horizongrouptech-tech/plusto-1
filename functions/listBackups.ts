import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { S3Client, ListObjectsV2Command } from 'npm:@aws-sdk/client-s3@3.x';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // בדיקת הרשאות - רק admin יכול לצפות ברשימת גיבויים
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized - Admin only' 
            }, { status: 403 });
        }

        const { backup_type = 'all', limit = 50 } = await req.json();

        // יצירת S3 client
        const s3Client = new S3Client({
            region: Deno.env.get('AWS_REGION'),
            credentials: {
                accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')
            }
        });

        const bucketName = Deno.env.get('AWS_S3_BUCKET_NAME');
        const backups = [];

        // פונקציית עזר לשליפת גיבויים מתיקייה מסוימת
        const fetchBackupsFromPrefix = async (prefix, type) => {
            const listCommand = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                MaxKeys: limit
            });

            const { Contents } = await s3Client.send(listCommand);

            if (Contents && Contents.length > 0) {
                return Contents.map(obj => ({
                    type: type,
                    fileName: obj.Key.split('/').pop(),
                    fullPath: obj.Key,
                    size: obj.Size,
                    sizeMB: (obj.Size / 1024 / 1024).toFixed(2),
                    lastModified: obj.LastModified,
                    url: `s3://${bucketName}/${obj.Key}`
                }));
            }
            return [];
        };

        // שליפת גיבויי נתונים
        if (backup_type === 'all' || backup_type === 'data') {
            const dataBackups = await fetchBackupsFromPrefix('data-backups/', 'data');
            backups.push(...dataBackups);
        }

        // שליפת גיבויי קוד
        if (backup_type === 'all' || backup_type === 'code') {
            const codeBackups = await fetchBackupsFromPrefix('code-backups/', 'code');
            backups.push(...codeBackups);
        }

        // מיון לפי תאריך (מהחדש לישן)
        backups.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

        // שליפת לוגים מ-BackupLog entity
        const backupLogs = await base44.asServiceRole.entities.BackupLog.filter(
            backup_type !== 'all' ? { backup_type: backup_type } : {},
            '-backup_date',
            limit
        );

        return Response.json({
            success: true,
            backups: backups.slice(0, limit),
            logs: backupLogs,
            total: backups.length,
            bucket: bucketName,
            region: Deno.env.get('AWS_REGION')
        });

    } catch (error) {
        console.error('Error listing backups:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});