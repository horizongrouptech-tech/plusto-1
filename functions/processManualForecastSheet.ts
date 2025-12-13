import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as XLSX from 'npm:xlsx@0.18.5';

// --- Helper Functions ---
function analyzeColumns(headers, dataRows) {
  const types = {};
  let hebrewCount = 0, englishCount = 0, dateColumn = null;
  headers.forEach((header, idx) => {
    if (!header) return;
    if (/[\u0590-\u05FF]/.test(header)) hebrewCount++;
    if (/[a-zA-Z]/.test(header)) englishCount++;

    const sampleValues = dataRows.slice(0, 10).map(row => row[idx]).filter(v => v !== null && v !== '');
    if (sampleValues.length > 0) {
      const firstValue = sampleValues[0];
      if (firstValue instanceof Date || (typeof firstValue === 'string' && (firstValue.match(/^\d{1,2}\/\d{4}$/) || firstValue.match(/^\d{4}-\d{2}$/)))) {
        types[header] = 'date';
        if (!dateColumn) dateColumn = header;
      } else if (typeof firstValue === 'number' || (typeof firstValue === 'string' && firstValue.match(/^[\d,.\s₪$€%-]+$/))) {
        types[header] = 'number';
      } else {
        types[header] = 'text';
      }
    }
  });
  const language = hebrewCount > englishCount ? 'english' : 'hebrew';
  return { types, language, dateColumn };
}

function autoMapSheet(headers) {
    const mapping = {
        period_month: { source_columns: [], formula: 'first' },
        category: { source_columns: [], formula: 'first' },
        revenue: { source_columns: [], formula: 'sum' },
        expenses: { source_columns: [], formula: 'sum' },
        profit: { source_columns: [], formula: 'calculated' }
    };
    let confidence = 0;
    const mappedHeaders = new Set();
    const patterns = {
        period_month: /תאריך|חודש|תקופה|date|month|period/i,
        category: /קטגוריה|סוג|category|type/i,
        revenue: /הכנסות|מחזור|פדיון|revenue|sales|turnover/i,
        expenses: /הוצאות|עלויות|cost|expense/i,
        profit: /רווח|profit/i
    };
    for (const header of headers) {
        if (!header || mappedHeaders.has(header)) continue;
        for (const [key, regex] of Object.entries(patterns)) {
            if (regex.test(header)) {
                mapping[key].source_columns.push(header);
                if (mapping[key].source_columns.length === 1) confidence += 0.2;
                mappedHeaders.add(header);
                break;
            }
        }
    }
    return { mapping, confidence: Math.min(confidence, 1) };
}


// --- Main Handler ---
Deno.serve(async (req) => {
  const { forecast_id, file_url, sheet_name, total_sheets, process_id } = await req.json();
  const base44 = createClientFromRequest(req);

  try {
    if (!forecast_id || !file_url || !sheet_name || !process_id) {
      throw new Error('Missing parameters for sheet worker');
    }

    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) throw new Error(`Worker failed to download file: ${fileResponse.statusText}`);
    const fileBuffer = await fileResponse.arrayBuffer();

    // Parse the entire workbook to get the specific sheet
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
    const worksheet = workbook.Sheets[sheet_name];
    if (!worksheet) throw new Error(`Sheet ${sheet_name} not found in workbook.`);

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });
    
    let headerRowIndex = 0;
    for (let j = 0; j < Math.min(5, rawData.length); j++) {
        if (rawData[j] && rawData[j].filter(cell => cell !== null && cell !== '').length >= 2) {
            headerRowIndex = j;
            break;
        }
    }
    
    const headers = rawData[headerRowIndex] || [];
    const dataRows = rawData.slice(headerRowIndex + 1);

    const { types, language, dateColumn } = analyzeColumns(headers, dataRows);
    const { mapping, confidence } = autoMapSheet(headers);

    const sampleData = dataRows.slice(0, 5).map(row => {
        const obj = {};
        headers.forEach((header, idx) => { if (header) obj[header] = row[idx]; });
        return obj;
    });

    await base44.asServiceRole.entities.ManualForecastSheet.create({
        forecast_id,
        sheet_name,
        sheet_index: workbook.SheetNames.indexOf(sheet_name),
        header_row_index: headerRowIndex,
        original_columns: headers.filter(h => h),
        column_types: types,
        detected_language: language,
        row_count: dataRows.length,
        date_column_name: dateColumn,
        raw_sample_data: sampleData,
        mapping_confidence: confidence
    });

    // Check if this is the last sheet to be processed
    const processedSheets = await base44.asServiceRole.entities.ManualForecastSheet.filter({ forecast_id });
    
    const progress = 10 + Math.round((processedSheets.length / total_sheets) * 80);
    await base44.asServiceRole.entities.ProcessStatus.update(process_id, {
      progress,
      current_step: `מעבד גיליון ${processedSheets.length} מתוך ${total_sheets}`
    });

    if (processedSheets.length === total_sheets) {
      console.log(`All ${total_sheets} sheets processed for forecast ${forecast_id}. Finalizing.`);
      await base44.asServiceRole.entities.ManualForecast.update(forecast_id, { status: 'mapped_required' });
      await base44.asServiceRole.entities.ProcessStatus.update(process_id, {
        progress: 100,
        status: 'completed',
        current_step: 'הניתוח הושלם. ממתין למיפוי עמודות.'
      });
    }

    return Response.json({ success: true, sheet: sheet_name });

  } catch (error) {
    console.error(`[processManualForecastSheet] Error for sheet ${sheet_name}:`, error);
    await base44.asServiceRole.entities.ProcessStatus.update(process_id, {
      status: 'failed',
      error_message: `שגיאה בעיבוד גיליון ${sheet_name}: ${error.message}`
    });
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});