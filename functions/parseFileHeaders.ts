import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as xlsx from 'npm:xlsx@0.18.5';
import { parse } from "npm:csv-parse@5.5.2/sync";

// ניקוי תאים
function cleanCell(cell) {
  if (cell === null || cell === undefined) return '';
  return String(cell)
    .trim()
    .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// זיהוי שורת הכותרת
function findHeaderRow(rows, maxRowsToCheck = 15) {
  const knownHeaders = [
    // שם מוצר
    'שם מוצר', 'שם פריט', 'שם המוצר', 'תיאור', 'תאור', 'מוצר', 'product_name', 'name', 'פריט', 'תחמור',
    // ברקוד
    'ברקוד', 'מק"ט', 'מקט', 'barcode', 'sku', 'קוד',
    // מחירים
    'מחיר', 'מחיר עלות', 'מחיר מכירה', 'עלות', 'price', 'cost', 'מחיר גלם', 'מחיר יחידה',
    // קטגוריה
    'קטגוריה', 'category', 'תמחורים', 'מתחורים', 'תפריט',
    // ספק
    'ספק', 'supplier',
    // מכירות ומלאי
    'מכירות', 'סה"כ מכירות', 'מלאי', 'כמות', 'כמה נמכר'
  ];
  
  for (let i = 0; i < Math.min(rows.length, maxRowsToCheck); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    
    const cleanedRow = row.map(cleanCell);
    
    // בדיקה אם יש תאים עם טקסט (לא רק מספרים)
    const hasTextCells = cleanedRow.some(cell => {
      const trimmed = cell.trim();
      return trimmed && isNaN(Number(trimmed));
    });
    
    // בדיקה אם יש התאמה לכותרות ידועות
    const matchCount = cleanedRow.filter(cell => {
      const trimmed = cell.trim().toLowerCase();
      return knownHeaders.some(h => {
        const headerLower = h.toLowerCase();
        return trimmed === headerLower || trimmed.includes(headerLower) || headerLower.includes(trimmed);
      });
    }).length;
    
    // אם יש טקסט ולפחות 2 כותרות מזוהות
    if (hasTextCells && matchCount >= 2) {
      return { index: i, headers: cleanedRow.filter(h => h !== '') };
    }
  }
  
  // אם לא נמצאה שורת כותרת מזוהה, השתמש בשורה הראשונה
  if (rows.length > 0 && rows[0]) {
    return { index: 0, headers: rows[0].map(cleanCell).filter(h => h !== '') };
  }
  
  return null;
}

// עיבוד קובץ CSV
function processCSV(content) {
  const lines = content.split(/\r\n|\n/).filter(line => line.trim());
  
  // זיהוי מפריד
  const firstLine = lines[0] || '';
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  
  // פרסור השורות
  let rows;
  try {
    rows = parse(content, {
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true
    });
  } catch (e) {
    // פרסור ידני אם הספרייה נכשלת
    rows = lines.map(line => line.split(delimiter));
  }
  
  return rows;
}

// עיבוד קובץ Excel
function processExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  return rows.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== ''));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  if (!await base44.auth.isAuthenticated()) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { file_url } = await req.json();
    
    if (!file_url) {
      throw new Error('File URL is required.');
    }

    // הורדת הקובץ
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    // זיהוי סוג הקובץ
    const contentType = response.headers.get('content-type') || '';
    const isExcel = contentType.includes('spreadsheet') || 
                    contentType.includes('excel') ||
                    file_url.toLowerCase().endsWith('.xlsx') ||
                    file_url.toLowerCase().endsWith('.xls');
    
    let rows;
    
    if (isExcel) {
      const buffer = await response.arrayBuffer();
      rows = processExcel(buffer);
    } else {
      // CSV או טקסט
      let text;
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      try {
        text = new TextDecoder('utf-8').decode(uint8Array);
      } catch (e) {
        text = new TextDecoder('windows-1255').decode(uint8Array);
      }
      rows = processCSV(text);
    }

    if (!rows || rows.length === 0) {
      throw new Error('הקובץ ריק או לא ניתן לקריאה');
    }

    // מציאת שורת הכותרת
    const headerInfo = findHeaderRow(rows);
    
    if (!headerInfo) {
      throw new Error('לא נמצאו כותרות בקובץ');
    }

    // הכנת הנתונים לתצוגה מקדימה
    const dataRows = rows.slice(headerInfo.index + 1);
    const rawData = dataRows.map(row => {
      const obj = {};
      headerInfo.headers.forEach((header, index) => {
        if (header && row[index] !== undefined) {
          obj[header] = cleanCell(row[index]);
        }
      });
      return obj;
    }).filter(obj => Object.keys(obj).length > 0);

    return new Response(JSON.stringify({
      success: true,
      data: {
        headers: headerInfo.headers,
        header_row_index: headerInfo.index,
        total_rows: dataRows.length,
        raw_data: rawData.slice(0, 500), // 500 שורות לתצוגה מקדימה
        file_type: isExcel ? 'excel' : 'csv',
        sample_data: rawData.slice(0, 5)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in parseFileHeaders:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});