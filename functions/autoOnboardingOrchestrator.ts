
import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.7.0';

/**
 * Helper function to process uploaded files from a temporary URL and create FileUpload records in Base44.
 * This function will now use a dedicated service role client for storage operations to ensure proper permissions.
 */
async function processAndCreateFileUploads(
    base44_general, // The main Base44 SDK client instance, typically initialized from a request
    customerEmail,
    files,
    documentType
) {
    if (!files || files.length === 0) {
        return [];
    }

    console.log(`Processing ${files.length} files for document type: ${documentType}`);

    // Create a dedicated service client for storage operations using environment variables.
    // This ensures that storage operations have the necessary service role permissions
    // regardless of the permissions associated with the incoming request.
    let serviceRoleBase44;
    try {
        serviceRoleBase44 = createClient({
            appId: Deno.env.get('BASE44_APP_ID'),
            serviceToken: Deno.env.get('BASE44_API_KEY')
        });
        if (!serviceRoleBase44 || !serviceRoleBase44.asServiceRole || !serviceRoleBase44.asServiceRole.storage) {
            throw new Error('Service role client for storage not properly initialized. Check APP_ID and API_KEY.');
        }
    } catch (clientError) {
        console.error(`Failed to create service role client for storage operations for ${customerEmail}:`, clientError.message);
        return files.map(file => ({
            filename: file.file_name,
            status: 'rejected',
            reason: `Failed to initialize storage client: ${clientError.message}`
        }));
    }

    const uploadPromises = files.map(async (file) => {
        try {
            console.log(`Fetching file from URL: ${file.url}`);
            const response = await fetch(file.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch file from ${file.url}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();

            const contentType = file.mime_type || 'application/octet-stream';
            const storagePath = `onboarding_files/${customerEmail}/${documentType}/${Date.now()}_${file.file_name}`;

            console.log(`Uploading file ${file.file_name} to storage path: ${storagePath} using dedicated serviceRoleBase44.asServiceRole.storage.`);

            // Use the newly created serviceRoleBase44 client for storage operations
            const uploadResult = await serviceRoleBase44.asServiceRole.storage.upload(
                storagePath,
                new Uint8Array(buffer),
                {
                    contentType: contentType,
                    upsert: true
                }
            );

            if (uploadResult.error) {
                throw new Error(`Upload failed: ${uploadResult.error.message || uploadResult.error}`);
            }

            console.log(`Creating FileUpload record for ${file.file_name}...`);
            // Continue to use base44_general for creating the FileUpload entity,
            // as this operation might not strictly require a dedicated service client
            // if base44_general itself is sufficiently privileged (e.g., from an authenticated request).
            await base44_general.asServiceRole.entities.FileUpload.create({
                customer_email: customerEmail,
                filename: file.file_name,
                file_url: file.url,
                file_type: file.mime_type?.split('/')[1] || 'unknown',
                status: 'uploaded',
                data_category: documentType,
                storage_path: uploadResult.path,
                parsing_metadata: {
                    original_filename: file.file_name,
                    file_size: file.file_size,
                }
            });
            console.log(`Successfully processed file: ${file.file_name}`);
            return { filename: file.file_name, status: 'fulfilled' };
        } catch (error) {
            console.error(`Error processing file ${file.file_name} for ${customerEmail}, type ${documentType}:`, error.message);
            return { filename: file.file_name, status: 'rejected', reason: error.message };
        }
    });

    return await Promise.all(uploadPromises);
}

/**
 * Main helper function to run the onboarding process.
 * Receives the pre-initialized service client.
 */
async function runOnboarding(base44, onboardingRequestId, customerEmail) {
    let processStatusId;
    try {
        console.log("Orchestrator: OnboardingRequest fetched successfully.");

        // Create a ProcessStatus record to track the overall onboarding progress
        const processStatus = await base44.asServiceRole.entities.ProcessStatus.create({
            customer_email: customerEmail,
            process_type: 'auto_onboarding',
            status: 'running',
            progress: 10,
            current_step: 'Starting auto-onboarding process...',
            started_at: new Date().toISOString()
        });
        processStatusId = processStatus.id;

        // Update onboarding request status to "processing"
        await base44.asServiceRole.entities.OnboardingRequest.update(onboardingRequestId, {
            onboarding_status: 'processing_files'
        });

        // Fetch the onboarding request data
        const onboardingRequest = await base44.asServiceRole.entities.OnboardingRequest.get(onboardingRequestId);
        if (!onboardingRequest) throw new Error(`OnboardingRequest not found for ID: ${onboardingRequestId}`);

        // Step 1: Process uploaded files from the onboarding request
        console.log("Orchestrator: Processing uploaded files from onboarding request...");
        await base44.asServiceRole.entities.ProcessStatus.update(processStatusId, {
            progress: 20,
            current_step: 'Processing uploaded files...'
        });

        const allFileProcessingResults = [];

        // Process each type of file with the corrected function signature
        if (onboardingRequest.profit_loss_reports?.length > 0) {
            const results = await processAndCreateFileUploads(
                base44, // Pass the request-scoped client
                customerEmail,
                onboardingRequest.profit_loss_reports,
                'profit_loss_statement'
            );
            allFileProcessingResults.push(...results);
        }

        if (onboardingRequest.balance_sheet_reports?.length > 0) {
            const results = await processAndCreateFileUploads(
                base44, // Pass the request-scoped client
                customerEmail,
                onboardingRequest.balance_sheet_reports,
                'balance_sheet'
            );
            allFileProcessingResults.push(...results);
        }

        if (onboardingRequest.bank_statements?.length > 0) {
            const results = await processAndCreateFileUploads(
                base44, // Pass the request-scoped client
                customerEmail,
                onboardingRequest.bank_statements,
                'bank_statement'
            );
            allFileProcessingResults.push(...results);
        }

        if (onboardingRequest.sales_reports?.length > 0) {
            const results = await processAndCreateFileUploads(
                base44, // Pass the request-scoped client
                customerEmail,
                onboardingRequest.sales_reports,
                'sales_report'
            );
            allFileProcessingResults.push(...results);
        }

        if (onboardingRequest.inventory_reports?.length > 0) {
            const results = await processAndCreateFileUploads(
                base44, // Pass the request-scoped client
                customerEmail,
                onboardingRequest.inventory_reports,
                'inventory_report'
            );
            allFileProcessingResults.push(...results);
        }

        if (onboardingRequest.credit_card_reports?.length > 0) {
            const results = await processAndCreateFileUploads(
                base44, // Pass the request-scoped client
                customerEmail,
                onboardingRequest.credit_card_reports,
                'credit_card_report'
            );
            allFileProcessingResults.push(...results);
        }

        if (onboardingRequest.promotions_reports?.length > 0) {
            const results = await processAndCreateFileUploads(
                base44, // Pass the request-scoped client
                customerEmail,
                onboardingRequest.promotions_reports,
                'promotions_report'
            );
            allFileProcessingResults.push(...results);
        }

        if (onboardingRequest.credit_reports?.length > 0) {
            const results = await processAndCreateFileUploads(
                base44, // Pass the request-scoped client
                customerEmail,
                onboardingRequest.credit_reports,
                'credit_report'
            );
            allFileProcessingResults.push(...results);
        }

        // Count successful and failed file processing
        const successfulFiles = allFileProcessingResults.filter(result => result.status === 'fulfilled').length;
        const failedFiles = allFileProcessingResults.filter(result => result.status === 'rejected').length;
        const totalFiles = allFileProcessingResults.length;

        console.log(`Orchestrator: File processing completed: ${successfulFiles} successful, ${failedFiles} failed out of ${totalFiles} total files.`);

        // Step 2: Generate initial catalog
        console.log(`Orchestrator: Generating initial catalog for ${customerEmail}...`);
        await base44.asServiceRole.entities.ProcessStatus.update(processStatusId, {
            progress: 50,
            current_step: 'Generating initial product catalog...'
        });

        try {
            await base44.asServiceRole.functions.invoke('generateInitialCatalog', {
                customer_email: customerEmail,
                business_type: onboardingRequest.business_type,
                business_goals: onboardingRequest.business_goals,
                target_audience: onboardingRequest.target_audience,
                main_products_services: onboardingRequest.main_products_services
            });
        } catch (catalogError) {
            console.error(`Error generating initial catalog for ${customerEmail}:`, catalogError.message);
        }

        // Step 3: Generate strategic recommendations
        console.log(`Orchestrator: Generating strategic recommendations for ${customerEmail}...`);
        await base44.asServiceRole.entities.ProcessStatus.update(processStatusId, {
            progress: 80,
            current_step: 'Generating strategic business recommendations...'
        });

        try {
            await base44.asServiceRole.functions.invoke('generateStrategicRecommendations', {
                customer_email: customerEmail,
                business_type: onboardingRequest.business_type,
                business_goals: onboardingRequest.business_goals,
                target_audience: onboardingRequest.target_audience,
                main_products_services: onboardingRequest.main_products_services,
                monthly_revenue: onboardingRequest.monthly_revenue
            });
        } catch (recommendationsError) {
            console.error(`Error generating strategic recommendations for ${customerEmail}:`, recommendationsError.message);
        }

        // Step 4: Update onboarding request to completed
        await base44.asServiceRole.entities.OnboardingRequest.update(onboardingRequestId, {
            onboarding_status: 'completed'
        });

        // Mark process as completed
        await base44.asServiceRole.entities.ProcessStatus.update(processStatusId, {
            status: 'completed',
            progress: 100,
            current_step: 'Auto-onboarding process completed successfully!',
            completed_at: new Date().toISOString(),
            result_data: {
                files_processed: totalFiles,
                files_successful: successfulFiles,
                files_failed: failedFiles,
                catalog_generated: true,
                recommendations_generated: true
            }
        });

        console.log(`Orchestrator: Onboarding process for ${customerEmail} completed successfully.`);

    } catch (error) {
        console.error(`Orchestrator: Auto-onboarding failed for ${customerEmail}:`, error.message);

        if (processStatusId) {
            await base44.asServiceRole.entities.ProcessStatus.update(processStatusId, {
                status: 'failed',
                error_message: error.message,
                completed_at: new Date().toISOString()
            });
        }

        await base44.asServiceRole.entities.OnboardingRequest.update(onboardingRequestId, {
            onboarding_status: 'failed'
        });

        throw error;
    }
}

/**
 * Main Deno.serve handler for the auto-onboarding orchestrator
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { onboarding_request_id, customer_email } = await req.json();

        if (!onboarding_request_id || !customer_email) {
            return new Response(JSON.stringify({
                success: false,
                error: 'onboarding_request_id and customer_email are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await runOnboarding(base44, onboarding_request_id, customer_email);

        return new Response(JSON.stringify({
            success: true,
            message: 'Auto-onboarding process initiated successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Auto-onboarding orchestrator error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: `Internal server error: ${error.message}`
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
