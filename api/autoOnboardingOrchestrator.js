import { requireAuth, supabaseAdmin } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { onboarding_request_id, customer_email } = req.body ?? {};
  if (!onboarding_request_id || !customer_email) {
    return res.status(400).json({ success: false, error: 'onboarding_request_id and customer_email are required' });
  }

  let processStatusId = null;
  try {
    // Create process status record
    const { data: processStatus } = await supabaseAdmin.from('process_status').insert({
      customer_email,
      process_type: 'auto_onboarding',
      status: 'running',
      progress: 10,
      current_step: 'Starting auto-onboarding process...',
      started_at: new Date().toISOString(),
    }).select().single();
    processStatusId = processStatus?.id;

    await supabaseAdmin.from('onboarding_request').update({ onboarding_status: 'processing_files' }).eq('id', onboarding_request_id);

    const { data: onboardingRequest } = await supabaseAdmin
      .from('onboarding_request')
      .select('*')
      .eq('id', onboarding_request_id)
      .single();

    if (!onboardingRequest) throw new Error(`OnboardingRequest not found for ID: ${onboarding_request_id}`);

    // Process uploaded files — create FileUpload records
    const fileTypes = [
      { field: 'profit_loss_reports', category: 'profit_loss_statement' },
      { field: 'balance_sheet_reports', category: 'balance_sheet' },
      { field: 'bank_statements', category: 'bank_statement' },
      { field: 'sales_reports', category: 'sales_report' },
      { field: 'inventory_reports', category: 'inventory_report' },
      { field: 'credit_card_reports', category: 'credit_card_report' },
      { field: 'promotions_reports', category: 'promotions_report' },
      { field: 'credit_reports', category: 'credit_report' },
    ];

    let totalFiles = 0;
    let successfulFiles = 0;

    for (const { field, category } of fileTypes) {
      const files = onboardingRequest[field] || [];
      for (const file of files) {
        totalFiles++;
        try {
          await supabaseAdmin.from('file_upload').insert({
            customer_email,
            filename: file.file_name,
            file_url: file.url,
            file_type: (file.mime_type || '').split('/')[1] || 'unknown',
            status: 'uploaded',
            data_category: category,
            parsing_metadata: { original_filename: file.file_name, file_size: file.file_size },
          });
          successfulFiles++;
        } catch (e) {
          console.error(`Error creating FileUpload for ${file.file_name}:`, e.message);
        }
      }
    }

    if (processStatusId) {
      await supabaseAdmin.from('process_status').update({ progress: 50, current_step: 'Generating initial product catalog...' }).eq('id', processStatusId);
    }

    // Trigger generateStrategicRecommendations in background
    const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    fetch(`${siteUrl}/api/generateStrategicRecommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        customer_email,
        business_type: onboardingRequest.business_type,
        business_goals: onboardingRequest.business_goals,
        target_audience: onboardingRequest.target_audience,
        main_products_services: onboardingRequest.main_products_services,
        monthly_revenue: onboardingRequest.monthly_revenue,
      }),
    }).catch((e) => console.error('Error triggering generateStrategicRecommendations:', e.message));

    // Mark completed
    await supabaseAdmin.from('onboarding_request').update({ onboarding_status: 'completed' }).eq('id', onboarding_request_id);

    if (processStatusId) {
      await supabaseAdmin.from('process_status').update({
        status: 'completed',
        progress: 100,
        current_step: 'Auto-onboarding process completed successfully!',
        completed_at: new Date().toISOString(),
        result_data: { files_processed: totalFiles, files_successful: successfulFiles, files_failed: totalFiles - successfulFiles },
      }).eq('id', processStatusId);
    }

    return res.status(200).json({ success: true, message: 'Auto-onboarding process completed successfully' });
  } catch (error) {
    console.error('[autoOnboardingOrchestrator]', error);
    if (processStatusId) {
      await supabaseAdmin.from('process_status').update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      }).eq('id', processStatusId).catch(() => {});
    }
    await supabaseAdmin.from('onboarding_request').update({ onboarding_status: 'failed' }).eq('id', onboarding_request_id).catch(() => {});
    return res.status(500).json({ success: false, error: `Internal server error: ${error.message}` });
  }
}
