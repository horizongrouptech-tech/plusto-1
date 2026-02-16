import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as xlsx from 'npm:xlsx@0.18.5';
import { parse } from "npm:csv-parse@5.5.2/sync";

// ניקוי תא
function cleanCell(cell) {
  if (cell === null || cell === undefined) return '';
  return String(cell).trim()
    .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// עיבוד CSV
function processCSVRaw(content) {
  const lines = content.split(/\r\n|\n/).filter(line => line.trim());
  const delimiter = (lines[0] || '').includes('\t') ? '\t' : ',';
  try {
    return parse(content, { delimiter, skip_empty_lines: true, relax_column_count: true });
  } catch (e) {
    return lines.map(line => line.split(delimiter).map(v => v?.trim() || ''));
  }
}

// זיהוי שורת כותרת (זהה ל-parseFileHeaders) – fallback כש-header_row_index לא עובד
function findHeaderRow(rows, maxRowsToCheck = 15) {
  const knownHeaders = [
    'שם מוצר', 'שם פריט', 'שם המוצר', 'תיאור', 'תאור', 'מוצר', 'product_name', 'name', 'פריט', 'תחמור',
    'ברקוד', 'מק"ט', 'מקט', 'barcode', 'sku', 'קוד',
    'מחיר', 'מחיר עלות', 'מחיר מכירה', 'עלות', 'price', 'cost', 'מחיר גלם', 'מחיר יחידה',
    'קטגוריה', 'category', 'תמחורים', 'מתחורים', 'תפריט', 'ספק', 'supplier',
    'מכירות', 'סה"כ מכירות', 'מלאי', 'כמות', 'כמה נמכר'
  ];
  for (let i = 0; i < Math.min(rows.length, maxRowsToCheck); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    const cleanedRow = row.map(cell => cleanCell(cell));
    const hasTextCells = cleanedRow.some(cell => {
      const t = String(cell).trim();
      return t && isNaN(Number(t));
    });
    const matchCount = cleanedRow.filter(cell => {
      const t = String(cell).trim().toLowerCase();
      return knownHeaders.some(h => t === h.toLowerCase() || t.includes(h.toLowerCase()) || h.toLowerCase().includes(t));
    }).length;
    if (hasTextCells && matchCount >= 2) {
      return { index: i, headers: cleanedRow };
    }
  }
  if (rows.length > 0 && rows[0]) {
    return { index: 0, headers: rows[0].map(cell => cleanCell(cell)) };
  }
  return null;
}

// צמצום טווח הגיליון לפי תאים קיימים (מונע מיליוני שורות ריקות מ-!ref רחב ב-Excel)
function clampSheetRef(worksheet) {
  if (!worksheet || typeof worksheet !== 'object') return;
  const cellKeys = Object.keys(worksheet).filter((k) => !k.startsWith('!'));
  if (cellKeys.length < 10) return;
  let maxRow = 0;
  let maxCol = 'A';
  cellKeys.forEach((key) => {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const col = match[1];
      const row = parseInt(match[2], 10);
      if (row > maxRow) maxRow = row;
      if (col.length > maxCol.length || (col.length === maxCol.length && col > maxCol)) maxCol = col;
    }
  });
  if (maxRow > 1) {
    worksheet['!ref'] = `A1:${maxCol}${maxRow}`;
  }
}

// עיבוד Excel – תואם ל-parseFileHeaders (סינון שורות ריקות)
function processExcelRaw(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    throw new Error('קובץ Excel ללא גיליונות');
  }
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('גיליון Excel לא נמצא');
  }
  clampSheetRef(worksheet);
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null }) || [];
  return rows.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== ''));
}

// עדכון סטטוס תהליך
const updateProcessStatus = async (base44, processId, progress, status, currentStep, resultData = null, errorMessage = null) => {
  try {
    const updateData = {
      progress: Math.min(Math.max(progress, 0), 100),
      status,
      current_step: currentStep
    };
    
    if (resultData) updateData.result_data = resultData;
    if (errorMessage) updateData.error_message = errorMessage;
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    await base44.asServiceRole.entities.ProcessStatus.update(processId, updateData);
  } catch (error) {
    console.error('שגיאה בעדכון סטטוס:', error);
  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const payload = await req.json();
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));

  const { 
    customer_email, 
    file_url, 
    catalog_id, 
    mapping,
    import_with_errors = false,
    header_row_index = 0,
    total_rows: total_rows_from_client,
    raw_data: pre_parsed_raw_data
  } = payload;

  console.log('🔍 total_rows_from_client:', total_rows_from_client, 'pre_parsed_raw_data:', pre_parsed_raw_data?.length);

  if (!customer_email || !catalog_id || !mapping) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'חסרים פרמטרים נדרשים' 
    }), { status: 400 });
  }
  if (!file_url && !(pre_parsed_raw_data && Array.isArray(pre_parsed_raw_data) && pre_parsed_raw_data.length > 0)) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'נדרש file_url או raw_data מנותח מראש' 
    }), { status: 400 });
  }

  // יצירת רשומת תהליך
  const process = await base44.asServiceRole.entities.ProcessStatus.create({
    customer_email,
    catalog_id,
    process_type: 'catalog_upload',
    status: 'running',
    progress: 5,
    current_step: 'מתחיל עיבוד קובץ...',
    started_at: new Date().toISOString()
  });

  try {
    let recordsToUse;
    let totalRows;
    let usedPreParsed = false;

    if (pre_parsed_raw_data && Array.isArray(pre_parsed_raw_data) && pre_parsed_raw_data.length > 0) {
      await updateProcessStatus(base44, process.id, 15, 'running', 'משתמש בנתונים מנותחים מראש...');
      recordsToUse = pre_parsed_raw_data.filter(obj => 
        obj && typeof obj === 'object' && 
        Object.values(obj).some(v => v != null && String(v).trim() !== '')
      );
      totalRows = recordsToUse.length;
      usedPreParsed = true;
      console.log(`📊 שימוש ב-raw_data מראש: ${totalRows} רשומות`);
    }

    if (!usedPreParsed) {
    await updateProcessStatus(base44, process.id, 10, 'running', 'מוריד ומנתח את הקובץ...');

    if (!file_url) {
      throw new Error('נדרש file_url כאשר אין raw_data מנותח');
    }
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`נכשל בהורדת הקובץ: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isExcel = contentType.includes('spreadsheet') || contentType.includes('excel') ||
      file_url.toLowerCase().endsWith('.xlsx') || file_url.toLowerCase().endsWith('.xls');

    let allRawRows;
    
    if (isExcel) {
      const buffer = await response.arrayBuffer();
      allRawRows = processExcelRaw(buffer);
      console.log(`📊 Excel: ${allRawRows.length} שורות גולמיות`);
    } else {
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      let text;
      try {
        text = new TextDecoder('utf-8').decode(uint8Array);
      } catch {
        text = new TextDecoder('windows-1255').decode(uint8Array);
      }
      allRawRows = processCSVRaw(text);
      console.log(`📊 CSV: ${allRawRows.length} שורות גולמיות`);
    }

    // בניית אובייקטים
    const headerRow = allRawRows[header_row_index];
    if (!headerRow || !Array.isArray(headerRow)) {
      throw new Error(`שורת כותרת לא נמצאה באינדקס ${header_row_index}`);
    }

    const headers = headerRow.map(cell => cleanCell(cell));
    const dataRows = allRawRows.slice(header_row_index + 1);
    
    const allRecords = dataRows.map(row => {
      if (!row || !Array.isArray(row)) return null;
      const obj = {};
      headers.forEach((header, i) => {
        if (header && row[i] !== undefined && row[i] !== null) {
          obj[header] = row[i];
        }
      });
      return obj;
    }).filter(obj => {
      if (!obj || Object.keys(obj).length === 0) return false;
      return Object.values(obj).some(v => v != null && String(v).trim() !== '');
    });

    totalRows = allRecords.length;
    recordsToUse = allRecords;

    // Fallback: אם לא נמצאו רשומות – נסה זיהוי שורת כותרת אוטומטי עם חיפוש רחב יותר
    if (totalRows === 0 && allRawRows.length > 1) {
      const headerInfo = findHeaderRow(allRawRows, 25);
      if (headerInfo) {
        const { index: hi, headers: h } = headerInfo;
        const fallbackRecords = allRawRows.slice(hi + 1).map(row => {
          if (!row || !Array.isArray(row)) return null;
          const obj = {};
          h.forEach((header, i) => {
            if (header && row[i] !== undefined && row[i] !== null) {
              obj[header] = row[i];
            }
          });
          return obj;
        }).filter(obj => {
          if (!obj || Object.keys(obj).length === 0) return false;
          return Object.values(obj).some(v => v != null && String(v).trim() !== '');
        });
        if (fallbackRecords.length > 0) {
          recordsToUse = fallbackRecords;
          totalRows = fallbackRecords.length;
          console.log(`🔄 Fallback: נמצאו ${totalRows} רשומות עם findHeaderRow`);
        }
      }
    }

    }  // סוף if (!recordsToUse || totalRows === 0)

    console.log(`✅ ${totalRows} רשומות תקינות לעיבוד`);

    const MAX_ROWS = 100_000;
    if (totalRows > MAX_ROWS) {
      throw new Error(`הקובץ מכיל ${totalRows.toLocaleString()} שורות - מקסימום ${MAX_ROWS.toLocaleString()}`);
    }

    if (totalRows === 0) {
      const diag = usedPreParsed
        ? 'הנתונים מנותחים מראש לא הכילו רשומות תקינות.'
        : `אבחון: כותרת באינדקס ${header_row_index}. ודא שהקובץ כולל כותרות כמו "שם מוצר", "מחיר", "ברקוד" באחת השורות הראשונות.`;
      throw new Error(`הקובץ ריק או לא נמצאו נתונים. ${diag}`);
    }

    await updateProcessStatus(base44, process.id, 30, 'running', 
      `מעבד ${totalRows.toLocaleString('he-IL')} מוצרים...`);

    // שמירת הנתונים ב-metadata (ללא filesystem – אין גישת כתיבה ל-/tmp בסביבה)
    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);
    await base44.asServiceRole.entities.ProcessStatus.update(process.id, {
      metadata: {
        all_records: recordsToUse,
        mapping,
        catalog_id,
        customer_email,
        total_rows: totalRows,
        import_with_errors,
        header_row_index
      }
    });
    console.log(`💾 נשמרו ${totalRows} רשומות ב-metadata`);

    // קריאה ל-worker - fire-and-forget
    base44.asServiceRole.functions.invoke('processCatalogChunkWorker', {
      process_id: process.id,
      chunk_number: 0,
      start_row: 0,
      end_row: Math.min(CHUNK_SIZE, totalRows)
    }).catch(err => {
      console.error('Worker invoke failed:', err);
      updateProcessStatus(base44, process.id, 0, 'failed',
        `שגיאה: ${err?.message || err}`, null, err?.message || String(err));
    });

    // החזרת תגובה מיידית - העיבוד ממשיך ברקע
    return new Response(JSON.stringify({
      success: true,
      process_id: process.id,
      total_rows: totalRows,
      message: `התחיל עיבוד ${totalRows.toLocaleString('he-IL')} מוצרים`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in processCatalogWithMapping orchestrator:', error);
    await updateProcessStatus(base44, process.id, 0, 'failed', 
      `שגיאה: ${error.message}`, null, error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      process_id: process.id
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});