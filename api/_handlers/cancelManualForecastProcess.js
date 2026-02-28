import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { forecast_id, customer_email } = req.body ?? {};
    const email = customer_email || user.email;

    let deleted = { forecasts: 0, sheets: 0, versions: 0 };

    if (forecast_id) {
      // Delete specific forecast and related data
      await supabaseAdmin.from('manual_forecast_sheet').delete().eq('forecast_id', forecast_id);
      await supabaseAdmin.from('manual_forecast_version').delete().eq('forecast_id', forecast_id);
      const { count } = await supabaseAdmin.from('business_forecast').delete().eq('id', forecast_id);
      deleted.forecasts = 1;
    } else {
      // Delete all in-progress forecasts for this customer
      const { data: forecasts } = await supabaseAdmin
        .from('business_forecast')
        .select('id')
        .eq('customer_email', email)
        .eq('status', 'processing');

      for (const f of (forecasts || [])) {
        await supabaseAdmin.from('manual_forecast_sheet').delete().eq('forecast_id', f.id);
        await supabaseAdmin.from('manual_forecast_version').delete().eq('forecast_id', f.id);
        await supabaseAdmin.from('business_forecast').delete().eq('id', f.id);
        deleted.forecasts++;
      }
    }

    return res.status(200).json({ success: true, deleted });
  } catch (e) {
    console.error('[cancelManualForecastProcess]', e);
    return res.status(500).json({ error: e.message });
  }
}
