import { requireAuth, supabaseAdmin } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, customer_email } = req.body ?? {};
    if (!file_url || !customer_email) return res.status(400).json({ success: false, error: 'Missing required fields' });

    const fileName = file_url.split('/').pop();

    const { data: forecast, error: forecastErr } = await supabaseAdmin.from('manual_forecast').insert({
      customer_email,
      file_name: fileName,
      status: 'ready',
      sheet_count: 1,
    }).select().single();

    if (forecastErr) throw new Error(forecastErr.message);

    await supabaseAdmin.from('manual_forecast_sheet').insert({
      forecast_id: forecast.id,
      sheet_name: 'תחזית עסקית',
      sheet_index: 0,
      header_row_index: 0,
      original_columns: [],
      row_count: 0,
    });

    return res.status(200).json({
      success: true,
      forecast_id: forecast.id,
      message: 'תחזית נוצרה בהצלחה. כעת ניתן להזין נתונים ידנית.',
      status: 'ready',
    });
  } catch (error) {
    console.error('[uploadManualForecastXlsx]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
