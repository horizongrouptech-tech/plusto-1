import { requireAuth, supabaseAdmin } from '../_helpers.js';

/**
 * POST /api/exportBusinessPlanToPdf
 * Returns the business plan text as HTML formatted for printing/PDF.
 * Full PDF generation (Puppeteer/jsPDF) requires additional setup outside Vercel limits.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { forecastId } = req.body ?? {};
    if (!forecastId) return res.status(400).json({ error: 'forecastId is required' });

    const { data: forecast, error } = await supabaseAdmin.from('business_forecast').select('business_plan_text, forecast_year, customer_email').eq('id', forecastId).single();
    if (error || !forecast) return res.status(404).json({ error: 'Forecast not found' });

    if (!forecast.business_plan_text) {
      return res.status(400).json({ error: 'No business plan text found. Please generate it first.' });
    }

    // Return the markdown/text content — client can render it as PDF
    return res.status(200).json({
      success: true,
      business_plan_text: forecast.business_plan_text,
      forecast_year: forecast.forecast_year,
      file_name: `business_plan_${forecast.forecast_year || 'export'}.txt`,
    });
  } catch (error) {
    console.error('[exportBusinessPlanToPdf]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
