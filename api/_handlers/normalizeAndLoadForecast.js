import { requireAuth, supabaseAdmin } from '../_helpers.js';

function autoMapColumns(headers, columnTypes) {
  const aliases = {
    period_month: ['date', 'month', 'תאריך', 'חודש', 'תקופה', 'period'],
    category: ['category', 'dept', 'department', 'segment', 'קטגוריה', 'מחלקה', 'סוג'],
    subcategory: ['subcategory', 'sub category', 'תת קטגוריה', 'תת-קטגוריה'],
    revenue: ['revenue', 'income', 'sales', 'הכנסות', 'מחזור', 'הכנסה'],
    expenses: ['expenses', 'expense', 'cost', 'costs', 'הוצאות', 'עלות', 'הוצאה'],
    profit: ['profit', 'net profit', 'רווח', 'רווח נקי', 'רווח גולמי'],
    notes: ['notes', 'note', 'comment', 'remarks', 'הערות', 'הערה'],
  };
  const mapping = {};
  headers.forEach((header, idx) => {
    if (!header) return;
    const h = header.toString().toLowerCase().trim();
    for (const [field, aliasList] of Object.entries(aliases)) {
      for (const alias of aliasList) {
        if (h.includes(alias.toLowerCase())) {
          if (!mapping[field]) mapping[field] = [];
          mapping[field].push(idx);
          break;
        }
      }
    }
  });
  return mapping;
}

function parseNumeric(value) {
  if (typeof value === 'number') return value;
  if (!value) return null;
  const cleaned = value.toString().replace(/[₪$€£¥,\s]/g, '').replace(/%/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeDate(value) {
  if (!value) return null;
  try {
    let date;
    if (value instanceof Date) date = value;
    else if (typeof value === 'string') date = new Date(value);
    else if (typeof value === 'number') date = new Date((value - 25569) * 86400 * 1000);
    if (date && !isNaN(date.getTime())) return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  } catch {}
  return null;
}

function normalizeRow(rawRow, headers, columnTypes, columnMapping, forecastId, sheetId, rowIdx) {
  const normalized = { forecast_id: forecastId, sheet_id: sheetId, row_index: rowIdx, source_columns: {}, extra: {} };
  headers.forEach((h, i) => { if (rawRow[i] !== null && rawRow[i] !== undefined) normalized.source_columns[h] = rawRow[i]; });

  for (const [targetField, sourceIndices] of Object.entries(columnMapping)) {
    if (!sourceIndices || sourceIndices.length === 0) continue;
    if (sourceIndices.length > 1 && ['revenue', 'expenses'].includes(targetField)) {
      normalized[targetField] = sourceIndices.reduce((s, i) => s + (parseNumeric(rawRow[i]) || 0), 0);
    } else {
      const rawValue = rawRow[sourceIndices[0]];
      if (targetField === 'period_month') normalized[targetField] = normalizeDate(rawValue);
      else if (['revenue', 'expenses', 'profit'].includes(targetField)) normalized[targetField] = parseNumeric(rawValue);
      else normalized[targetField] = rawValue?.toString() || null;
    }
  }
  if (!normalized.profit && normalized.revenue !== undefined && normalized.expenses !== undefined) {
    normalized.profit = (normalized.revenue || 0) - (normalized.expenses || 0);
  }
  headers.forEach((h, i) => {
    const isMapped = Object.values(columnMapping).some((arr) => arr.includes(i));
    if (!isMapped && rawRow[i] !== null && rawRow[i] !== undefined) normalized.extra[h] = rawRow[i];
  });
  return normalized;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { forecast_id, parsed_sheets, mapping_profile_id } = req.body ?? {};
    if (!forecast_id || !parsed_sheets) return res.status(400).json({ error: 'Missing required fields' });

    let mappingProfile = null;
    if (mapping_profile_id) {
      const { data } = await supabaseAdmin.from('manual_forecast_mapping_profile').select('*').eq('id', mapping_profile_id).single();
      mappingProfile = data;
    }

    const allRowsToInsert = [];
    const createdSheets = [];

    for (const sheetData of parsed_sheets) {
      const { data: sheetRecord } = await supabaseAdmin.from('manual_forecast_sheet').insert({
        forecast_id,
        sheet_name: sheetData.sheet_name,
        sheet_index: sheetData.sheet_index,
        header_row_index: sheetData.header_row_index,
        original_columns: sheetData.original_columns,
        row_count: sheetData.row_count,
      }).select().single();

      if (sheetRecord) {
        createdSheets.push(sheetRecord);
        const columnMapping = mappingProfile ? mappingProfile.mappings : autoMapColumns(sheetData.original_columns, sheetData.column_types);
        for (let rowIdx = 0; rowIdx < (sheetData.data_rows || []).length; rowIdx++) {
          const normalized = normalizeRow(sheetData.data_rows[rowIdx], sheetData.original_columns, sheetData.column_types, columnMapping, forecast_id, sheetRecord.id, rowIdx);
          if (normalized) allRowsToInsert.push(normalized);
        }
      }
    }

    if (allRowsToInsert.length > 0) {
      for (let i = 0; i < allRowsToInsert.length; i += 500) {
        await supabaseAdmin.from('manual_forecast_row').insert(allRowsToInsert.slice(i, i + 500));
      }
    }

    await supabaseAdmin.from('manual_forecast').update({ status: 'ready', sheet_count: parsed_sheets.length }).eq('id', forecast_id);

    return res.status(200).json({ success: true, forecast_id, sheets_created: createdSheets.length, rows_inserted: allRowsToInsert.length });
  } catch (error) {
    console.error('[normalizeAndLoadForecast]', error);
    await supabaseAdmin.from('manual_forecast').update({ status: 'error', error_message: error.message }).eq('id', forecast_id).catch(() => {});
    return res.status(500).json({ success: false, error: error.message });
  }
}
