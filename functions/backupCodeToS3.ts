import { createClient } from 'npm:@base44/sdk@0.8.4';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3.x';

// פונקציית עזר למחיקת גיבויים ישנים
async function deleteOldBackups(s3Client, bucketName, prefix, daysToKeep) {
    try {
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
        });
        
        const { Contents } = await s3Client.send(listCommand);

        if (!Contents || Contents.length === 0) {
            console.log('No existing backups found to clean up.');
            return 0;
        }

        const now = new Date();
        const oldBackups = Contents.filter(obj => {
            const lastModified = new Date(obj.LastModified);
            const diffTime = Math.abs(now - lastModified);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > daysToKeep;
        });

        if (oldBackups.length === 0) {
            console.log('No old backups to delete.');
            return 0;
        }

        console.log(`Deleting ${oldBackups.length} old backups from ${prefix}...`);
        
        const deletePromises = oldBackups.map(obj => {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: obj.Key
            });
            return s3Client.send(deleteCommand);
        });
        
        await Promise.all(deletePromises);
        console.log('Old backups deleted successfully.');
        
        return oldBackups.length;
    } catch (error) {
        console.error('Error deleting old backups:', error);
        return 0;
    }
}

// פונקציה לקריאת קבצים מתיקייה רקורסיבית
async function readDirectoryRecursive(dirPath) {
    const files = {};
    
    try {
        const entries = [];
        for await (const entry of Deno.readDir(dirPath)) {
            entries.push(entry);
        }

        for (const entry of entries) {
            const fullPath = `${dirPath}/${entry.name}`;
            
            if (entry.isDirectory) {
                const subFiles = await readDirectoryRecursive(fullPath);
                Object.assign(files, subFiles);
            } else if (entry.isFile) {
                try {
                    const content = await Deno.readTextFile(fullPath);
                    const relativePath = fullPath.replace('/src/', '');
                    files[relativePath] = content;
                } catch (error) {
                    console.error(`Error reading file ${fullPath}:`, error.message);
                }
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error.message);
    }

    return files;
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    let base44;
    let s3Client;

    try {
        console.log('=== Starting Code Backup to S3 ===');

        // קריאת ה-body בצורה בטוחה
        let token = null;
        let triggered_by = 'cron';
        
        try {
            const requestBody = await req.json();
            token = requestBody.token;
            triggered_by = requestBody.triggered_by || 'cron';
        } catch (e) {
            console.error('Failed to parse request body:', e);
            return Response.json({ 
                success: false, 
                error: 'Invalid request body' 
            }, { status: 400 });
        }

        console.log('Triggered by:', triggered_by);

        // אימות טוקן
        const BACKUP_SECRET_TOKEN = Deno.env.get('BACKUP_SECRET_TOKEN');
        
        if (!token || token !== BACKUP_SECRET_TOKEN) {
            console.error('Unauthorized backup attempt - invalid token');
            return Response.json({ 
                success: false, 
                error: 'Unauthorized - Invalid token' 
            }, { status: 401 });
        }

        // בדיקת משתני סביבה נדרשים
        const requiredEnvVars = {
            'BASE44_APP_ID': Deno.env.get('BASE44_APP_ID'),
            'BASE44_API_KEY': Deno.env.get('BASE44_API_KEY'),
            'AWS_REGION': Deno.env.get('AWS_REGION'),
            'AWS_S3_BUCKET_NAME': Deno.env.get('AWS_S3_BUCKET_NAME'),
            'AWS_ACCESS_KEY_ID': Deno.env.get('AWS_ACCESS_KEY_ID'),
            'AWS_SECRET_ACCESS_KEY': Deno.env.get('AWS_SECRET_ACCESS_KEY')
        };

        const missingVars = Object.entries(requiredEnvVars).filter(([_, value]) => !value).map(([key]) => key);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        // יצירת Base44 client עם service role
        base44 = createClient({
            appId: requiredEnvVars.BASE44_APP_ID,
            serviceToken: requiredEnvVars.BASE44_API_KEY
        });

        // יצירת S3 client
        const awsAccessKeyId = requiredEnvVars.AWS_ACCESS_KEY_ID.trim();
        const awsSecretAccessKey = requiredEnvVars.AWS_SECRET_ACCESS_KEY.trim();

        console.log('AWS Region:', requiredEnvVars.AWS_REGION);
        console.log('AWS Bucket:', requiredEnvVars.AWS_S3_BUCKET_NAME);

        s3Client = new S3Client({
            region: requiredEnvVars.AWS_REGION,
            credentials: {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey
            }
        });

        console.log('S3 Client initialized');

        // רשימת התיקיות לגיבוי
        const directoriesToBackup = [
            '/src/pages',
            '/src/components',
            '/src/functions',
            '/src/agents',
            '/src/entities'
        ];

        console.log('Starting code files collection...');
        
        // איסוף כל הקבצים
        const backupData = {
            backup_date: new Date().toISOString(),
            triggered_by: triggered_by,
            files: {}
        };

        let totalFiles = 0;

        for (const dirPath of directoriesToBackup) {
            console.log(`Reading directory: ${dirPath}`);
            try {
                const files = await readDirectoryRecursive(dirPath);
                Object.assign(backupData.files, files);
                const fileCount = Object.keys(files).length;
                totalFiles += fileCount;
                console.log(`✓ ${dirPath}: ${fileCount} files`);
            } catch (error) {
                console.error(`✗ Error reading ${dirPath}:`, error.message);
            }
        }

        // קריאת Layout.js
        try {
            const layoutContent = await Deno.readTextFile('/src/Layout.js');
            backupData.files['Layout.js'] = layoutContent;
            totalFiles++;
            console.log('✓ Layout.js: 1 file');
        } catch (error) {
            console.error('✗ Error reading Layout.js:', error.message);
        }

        // קריאת globals.css
        try {
            const globalsContent = await Deno.readTextFile('/src/globals.css');
            backupData.files['globals.css'] = globalsContent;
            totalFiles++;
            console.log('✓ globals.css: 1 file');
        } catch (error) {
            console.error('✗ Error reading globals.css:', error.message);
        }

        console.log(`Total files collected: ${totalFiles}`);

        // יצירת שם קובץ עם timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0];
        const fileName = `backup-code-${timestamp}.json`;
        const s3Key = `code-backups/${fileName}`;

        // המרת הנתונים ל-JSON
        const jsonData = JSON.stringify(backupData, null, 2);
        const fileSize = new TextEncoder().encode(jsonData).length;

        console.log(`Backup file size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        // העלאה ל-S3
        console.log('Uploading to S3...');
        const uploadCommand = new PutObjectCommand({
            Bucket: requiredEnvVars.AWS_S3_BUCKET_NAME,
            Key: s3Key,
            Body: jsonData,
            ContentType: 'application/json',
            ServerSideEncryption: 'AES256',
            Metadata: {
                'backup-type': 'code',
                'backup-date': now.toISOString(),
                'total-files': String(totalFiles),
                'triggered-by': triggered_by
            }
        });

        await s3Client.send(uploadCommand);
        console.log('✓ Upload successful');

        // ניקוי גיבויים ישנים (שומר 90 יום)
        console.log('Cleaning old backups...');
        const deletedCount = await deleteOldBackups(
            s3Client, 
            requiredEnvVars.AWS_S3_BUCKET_NAME,
            'code-backups/',
            90
        );

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        // רישום הגיבוי ב-BackupLog
        try {
            await base44.asServiceRole.entities.BackupLog.create({
                backup_type: 'code',
                backup_date: now.toISOString(),
                status: 'success',
                file_name: fileName,
                file_size: fileSize,
                s3_path: s3Key,
                entities_backed_up: directoriesToBackup,
                records_count: totalFiles,
                duration_seconds: durationSeconds,
                old_backups_deleted: deletedCount,
                triggered_by: triggered_by
            });
            console.log('✓ Backup log created');
        } catch (logError) {
            console.error('Failed to create backup log:', logError);
        }

        console.log('=== Code Backup Completed Successfully ===');

        return Response.json({ 
            success: true,
            message: 'גיבוי קוד הושלם בהצלחה',
            details: {
                fileName: fileName,
                s3Path: s3Key,
                filesBackedUp: totalFiles,
                fileSizeMB: (fileSize / 1024 / 1024).toFixed(2),
                durationSeconds: durationSeconds,
                oldBackupsDeleted: deletedCount,
                timestamp: now.toISOString()
            }
        });

    } catch (error) {
        console.error('=== Code Backup Failed ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        // רישום הכשלון ב-BackupLog
        if (base44) {
            try {
                await base44.asServiceRole.entities.BackupLog.create({
                    backup_type: 'code',
                    backup_date: new Date().toISOString(),
                    status: 'failed',
                    error_message: error.message,
                    duration_seconds: durationSeconds,
                    triggered_by: triggered_by
                });
            } catch (logError) {
                console.error('Failed to log backup failure:', logError);
            }
        }

        return Response.json({ 
            success: false,
            error: error.message,
            technical_details: error.stack
        }, { status: 500 });
    }
});