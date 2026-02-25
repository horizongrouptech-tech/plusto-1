import { requireAuth, supabaseAdmin } from '../_helpers.js';

/**
 * POST /api/exportForecastToPdf
 * Returns the forecast data as JSON for client-side PDF rendering.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { forecastId, forecast_id } = req.body ?? {};
    const id = forecastId || forecast_id;
    if (!id) return res.status(400).json({ error: 'forecastId is required' });

    const { data: forecast, error } = await supabaseAdmin.from('business_forecast').select('*').eq('id', id).single();
    if (error || !forecast) return res.status(404).json({ error: 'Forecast not found' });

    return res.status(200).json({
      success: true,
      forecast,
      file_name: `forecast_${forecast.forecast_year || 'export'}.json`,
    });
  } catch (error) {
    console.error('[exportForecastToPdf]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
