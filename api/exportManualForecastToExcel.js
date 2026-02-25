import { requireAuth, supabaseAdmin } from './_helpers.js';
import * as xlsx from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { forecast_id, sheet_id } = req.body ?? {};
    if (!forecast_id) return res.status(400).json({ error: 'Missing forecast_id' });

    const { data: forecast } = await supabaseAdmin.from('manual_forecast').select('*').eq('id', forecast_id).single();
    if (!forecast) return res.status(404).json({ error: 'Forecast not found' });

    let sheetsQuery = supabaseAdmin.from('manual_forecast_sheet').select('*').eq('forecast_id', forecast_id);
    if (sheet_id) sheetsQuery = sheetsQuery.eq('id', sheet_id);
    const { data: sheets } = await sheetsQuery;

    const workbook = xlsx.utils.book_new();

    for (const sheet of sheets || []) {
      const { data: rows } = await supabaseAdmin.from('manual_forecast_row').select('*').eq('forecast_id', forecast_id).eq('sheet_id', sheet.id);
      if (!rows || rows.length === 0) continue;

      const sheetData = [['תקופה', 'קטגוריה', 'תת-קטגוריה', 'הכנסות', 'הוצאות', 'רווח', 'מטבע', 'הערות']];
      rows.forEach((row) => {
        sheetData.push([
          row.period_month || '',
          row.category || '',
          row.subcategory || '',
          row.revenue || 0,
          row.expenses || 0,
          row.profit || (row.revenue - row.expenses) || 0,
          row.currency || 'ILS',
          row.notes || '',
        ]);
      });

      const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
      worksheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 30 }];
      xlsx.utils.book_append_sheet(workbook, worksheet, sheet.sheet_name || `גיליון ${(sheet.sheet_index || 0) + 1}`);
    }

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const base64 = buffer.toString('base64');

    return res.status(200).json({
      success: true,
      file_data: base64,
      file_name: `forecast_${forecast_id}_${Date.now()}.xlsx`,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (error) {
    console.error('[exportManualForecastToExcel]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
