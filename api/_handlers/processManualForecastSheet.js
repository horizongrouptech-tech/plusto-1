import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { forecast_id, sheet_name, file_url, column_mapping } = req.body ?? {};
    if (!forecast_id || !file_url) return res.status(400).json({ error: 'forecast_id and file_url are required' });

    const response = await fetch(file_url);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
    const buffer = await response.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const targetSheet = sheet_name || workbook.SheetNames[0];
    const ws = workbook.Sheets[targetSheet];
    if (!ws) return res.status(404).json({ error: `Sheet "${targetSheet}" not found` });

    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const headers = (rawData[0] || []).filter(h => h !== '');
    const dataRows = rawData.slice(1).filter(row => row.some(cell => cell !== ''));

    // Use LLM to help identify columns if no mapping provided
    let effectiveMapping = column_mapping;
    if (!effectiveMapping) {
      const sampleRows = dataRows.slice(0, 3);
      const aiResult = await invokeLLM({
        prompt: `Given these Excel sheet headers and sample data, identify which columns map to: period_month, category, subcategory, revenue, expenses, profit, notes.
Headers: ${JSON.stringify(headers)}
Sample rows: ${JSON.stringify(sampleRows)}
Return a JSON mapping like: { "period_month": 0, "revenue": 2 } with column indices.`,
        response_json_schema: {
          type: 'object',
          properties: {
            period_month: { type: 'number' },
            category: { type: 'number' },
            subcategory: { type: 'number' },
            revenue: { type: 'number' },
            expenses: { type: 'number' },
            profit: { type: 'number' },
            notes: { type: 'number' },
          },
        },
      }).catch(() => ({}));
      effectiveMapping = aiResult;
    }

    // Build normalized rows
    const rowsToInsert = dataRows.map((row, rowIdx) => {
      const normalized = {
        forecast_id,
        sheet_name: targetSheet,
        row_index: rowIdx,
        source_columns: {},
      };
      headers.forEach((h, i) => { if (row[i] !== '') normalized.source_columns[h] = row[i]; });
      if (effectiveMapping) {
        for (const [field, colIdx] of Object.entries(effectiveMapping)) {
          if (colIdx !== undefined && colIdx !== null) normalized[field] = row[colIdx];
        }
      }
      return normalized;
    });

    // Insert rows in batches
    for (let i = 0; i < rowsToInsert.length; i += 500) {
      await supabaseAdmin.from('manual_forecast_row').insert(rowsToInsert.slice(i, i + 500));
    }

    return res.status(200).json({
      success: true,
      forecast_id,
      sheet_name: targetSheet,
      rows_processed: rowsToInsert.length,
      column_mapping: effectiveMapping,
    });
  } catch (e) {
    console.error('[processManualForecastSheet]', e);
    return res.status(500).json({ error: e.message });
  }
}
