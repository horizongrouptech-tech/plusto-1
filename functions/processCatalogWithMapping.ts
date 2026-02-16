import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as xlsx from 'npm:xlsx@0.18.5';

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

  const { 
    customer_email, 
    file_url, 
    catalog_id, 
    mapping,
    import_with_errors = false,
    header_row_index = 0,
    total_rows: total_rows_from_client
  } = await req.json();

  if (!customer_email || !file_url || !catalog_id || !mapping) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'חסרים פרמטרים נדרשים' 
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
    await updateProcessStatus(base44, process.id, 10, 'running', 'בודק גודל הקובץ...');

    const MAX_ROWS = 100_000;
    let totalRows: number;

    // מקור יחיד לאמת: total_rows מ-parseFileHeaders (נשלח מהקליינט)
    if (total_rows_from_client != null && typeof total_rows_from_client === 'number' && total_rows_from_client > 0) {
      totalRows = Math.floor(total_rows_from_client);
    } else {
      // fallback: חישוב מהקובץ (לא מומלץ - dimension של Excel עלול לטעות)
      const response = await fetch(file_url);
      if (!response.ok) {
        throw new Error(`נכשל בהורדת הקובץ: ${response.statusText}`);
      }
      const contentType = response.headers.get('content-type') || '';
      const isExcel = contentType.includes('spreadsheet') || contentType.includes('excel') ||
        file_url.toLowerCase().endsWith('.xlsx') || file_url.toLowerCase().endsWith('.xls');
      const buffer = await response.arrayBuffer();
      if (isExcel) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // תיקון !ref – כפי שב-parseFileHeaders, למניעת מיליוני שורות
        const cellKeys = Object.keys(firstSheet).filter((k) => !k.startsWith('!'));
        if (cellKeys.length >= 10) {
          let maxRow = 0;
          let maxCol = 'A';
          for (const cell of cellKeys) {
            const match = cell.match(/^([A-Z]+)(\d+)$/);
            if (!match) continue;
            const [, col, rowStr] = match;
            const row = parseInt(rowStr, 10);
            if (row > maxRow) {
              maxRow = row;
              maxCol = col;
            }
          }
          if (maxRow > 0) {
            firstSheet['!ref'] = `A1:${maxCol}${maxRow}`;
          }
        }
        
        const allRows = xlsx.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
        const nonEmptyRows = (allRows || []).filter((row) =>
          Array.isArray(row) && row.some((cell) => cell != null && String(cell).trim() !== '')
        );
        totalRows = nonEmptyRows.slice(header_row_index + 1).length;
      } else {
        const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
        const lines = text.split(/\r\n|\n/).filter(line => line.trim());
        totalRows = lines.length - header_row_index - 1;
      }
    }

    if (!totalRows || totalRows <= 0) {
      throw new Error('הקובץ ריק או לא נמצאו נתונים');
    }

    if (totalRows > MAX_ROWS) {
      throw new Error(`הקובץ מכיל ${totalRows.toLocaleString()} שורות - הגבלה של ${MAX_ROWS.toLocaleString()} שורות מקסימום. פצל את הקובץ.`);
    }

    // 🎯 חלוקה ל-20 chunks מדויקים
    const NUM_CHUNKS = 20;
    const chunkSize = Math.ceil(totalRows / NUM_CHUNKS);

    await updateProcessStatus(base44, process.id, 20, 'running', 
      `זוהו ${totalRows.toLocaleString('he-IL')} מוצרים. מתחיל עיבוד ב-${NUM_CHUNKS} חלקים של ${chunkSize.toLocaleString('he-IL')} שורות...`);

    // שמירת מטא-דטה ל-ProcessStatus
    await base44.asServiceRole.entities.ProcessStatus.update(process.id, {
      metadata: {
        file_url,
        mapping,
        catalog_id,
        customer_email,
        total_rows: totalRows,
        chunk_size: chunkSize,
        num_chunks: NUM_CHUNKS,
        import_with_errors,
        header_row_index
      }
    });

    // קריאה ל-worker הראשון – fire-and-forget (ללא await) כדי למנוע timeout/502
    // האורקסטרטור מחזיר מיד, ה-worker רץ ברקע
    base44.asServiceRole.functions.invoke('processCatalogChunkWorker', {
      process_id: process.id,
      chunk_number: 0,
      start_row: 0,
      end_row: Math.min(chunkSize, totalRows)
    }).catch(err => {
      console.error('Worker invoke failed:', err);
      updateProcessStatus(base44, process.id, 0, 'failed',
        `שגיאה בהפעלת העיבוד: ${err?.message || err}`, null, err?.message || String(err));
    });

    // החזרת תגובה מיידית - העיבוד ממשיך ברקע
    return new Response(JSON.stringify({
      success: true,
      process_id: process.id,
      total_rows: totalRows,
      total_chunks: NUM_CHUNKS,
      message: `התחיל עיבוד ${totalRows.toLocaleString('he-IL')} מוצרים ב-${NUM_CHUNKS} שלבים`
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