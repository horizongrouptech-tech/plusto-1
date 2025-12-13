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

Deno.serve(async (req) => {
    const startTime = Date.now();
    let base44;
    let s3Client;

    try {
        console.log('=== Starting Database Backup to S3 ===');

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

        // יצירת S3 client עם בדיקה מפורשת של credentials
        const awsAccessKeyId = requiredEnvVars.AWS_ACCESS_KEY_ID.trim();
        const awsSecretAccessKey = requiredEnvVars.AWS_SECRET_ACCESS_KEY.trim();

        console.log('AWS Region:', requiredEnvVars.AWS_REGION);
        console.log('AWS Bucket:', requiredEnvVars.AWS_S3_BUCKET_NAME);
        console.log('AWS Access Key ID length:', awsAccessKeyId.length);
        console.log('AWS Secret Key length:', awsSecretAccessKey.length);

        s3Client = new S3Client({
            region: requiredEnvVars.AWS_REGION,
            credentials: {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey
            }
        });

        console.log('S3 Client initialized');

        // רשימת כל ה-entities לגיבוי (ללא User - entity מיוחד עם הגבלות אבטחה)
        const entitiesToBackup = [
            'Product', 'Recommendation', 'FileUpload', 'Supplier', 'SupplierQuote',
            'CustomerAction', 'DashboardStats', 'BusinessMove', 'CustomerNotification',
            'SupportTicket', 'Sale', 'Promotion', 'ExperientialProduct', 'UserActivity',
            'RecommendationRating', 'ProductCatalog', 'WebsiteScanResult', 'RecommendationFeedback',
            'UserEngagement', 'BusinessForecast', 'StrategicMove', 'Catalog', 'FinancialReport',
            'OnboardingRequest', 'ProcessStatus', 'StrategicPlanInput', 'CustomerContact',
            'Lead', 'FinancialManagerPerformance', 'CommunicationThread', 'ChatMessage',
            'Notification', 'FileCategory', 'TempUpload', 'RecommendationSuggestion',
            'ManagerConversation', 'ManagerMessage', 'PurchaseRecord', 'LeadCommission',
            'CustomerGoal', 'GoalComment', 'ManualForecast', 'ManualForecastSheet',
            'ManualForecastRow', 'ManualForecastMappingProfile', 'ManualForecastVersion',
            'AgentSupportTicket', 'Ofek360Model', 'BackupLog'
        ];

        console.log(`Starting backup of ${entitiesToBackup.length} entities...`);
        console.log('Note: User entity excluded due to special security restrictions');

        // שליפת כל ה-entities
        const backupData = {};
        let totalRecords = 0;

        for (const entityName of entitiesToBackup) {
            try {
                console.log(`Fetching ${entityName}...`);
                const records = await base44.asServiceRole.entities[entityName].list();
                backupData[entityName] = records;
                totalRecords += records.length;
                console.log(`✓ ${entityName}: ${records.length} records`);
            } catch (error) {
                console.error(`✗ Error fetching ${entityName}:`, error.message);
                backupData[entityName] = [];
            }
        }

        console.log(`Total records collected: ${totalRecords}`);

        // יצירת שם קובץ עם timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0];
        const fileName = `backup-data-${timestamp}.json`;
        const s3Key = `data-backups/${fileName}`;

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
                'backup-type': 'database',
                'backup-date': now.toISOString(),
                'total-entities': String(entitiesToBackup.length),
                'total-records': String(totalRecords),
                'triggered-by': triggered_by
            }
        });

        await s3Client.send(uploadCommand);
        console.log('✓ Upload successful');

        // ניקוי גיבויים ישנים
        console.log('Cleaning old backups...');
        const deletedCount = await deleteOldBackups(
            s3Client, 
            requiredEnvVars.AWS_S3_BUCKET_NAME,
            'data-backups/',
            30
        );

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        // רישום הגיבוי ב-BackupLog
        try {
            await base44.asServiceRole.entities.BackupLog.create({
                backup_type: 'data',
                backup_date: now.toISOString(),
                status: 'success',
                file_name: fileName,
                file_size: fileSize,
                s3_path: s3Key,
                entities_backed_up: entitiesToBackup,
                records_count: totalRecords,
                duration_seconds: durationSeconds,
                old_backups_deleted: deletedCount,
                triggered_by: triggered_by
            });
            console.log('✓ Backup log created');
        } catch (logError) {
            console.error('Failed to create backup log:', logError);
        }

        console.log('=== Backup Completed Successfully ===');

        return Response.json({ 
            success: true,
            message: 'גיבוי נתונים הושלם בהצלחה',
            details: {
                fileName: fileName,
                s3Path: s3Key,
                entitiesBackedUp: entitiesToBackup.length,
                recordsBackedUp: totalRecords,
                fileSizeMB: (fileSize / 1024 / 1024).toFixed(2),
                durationSeconds: durationSeconds,
                oldBackupsDeleted: deletedCount,
                timestamp: now.toISOString()
            }
        });

    } catch (error) {
        console.error('=== Backup Failed ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        // בדיקה מיוחדת לשגיאות AWS
        let userMessage = error.message;
        if (error.name === 'SignatureDoesNotMatch') {
            userMessage = 'שגיאה באימות AWS - נא לבדוק את ה-AWS credentials (Access Key ID ו-Secret Access Key)';
        } else if (error.Code === 'InvalidAccessKeyId') {
            userMessage = 'AWS Access Key ID לא תקין';
        } else if (error.Code === 'NoSuchBucket') {
            userMessage = 'Bucket לא נמצא ב-AWS S3';
        }

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        // רישום הכשלון ב-BackupLog
        if (base44) {
            try {
                await base44.asServiceRole.entities.BackupLog.create({
                    backup_type: 'data',
                    backup_date: new Date().toISOString(),
                    status: 'failed',
                    error_message: userMessage,
                    duration_seconds: durationSeconds,
                    triggered_by: triggered_by
                });
            } catch (logError) {
                console.error('Failed to log backup failure:', logError);
            }
        }

        return Response.json({ 
            success: false,
            error: userMessage,
            technical_details: error.message
        }, { status: 500 });
    }
});