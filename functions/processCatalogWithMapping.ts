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
    header_row_index = 0
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

    // הורדת הקובץ
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`נכשל בהורדת הקובץ: ${response.statusText}`);
    }

    // זיהוי סוג קובץ
    const contentType = response.headers.get('content-type') || '';
    const isExcel = contentType.includes('spreadsheet') || 
                    contentType.includes('excel') ||
                    file_url.toLowerCase().endsWith('.xlsx') ||
                    file_url.toLowerCase().endsWith('.xls');

    let totalRows;
    
    // ספירת שורות נתונים - קריאה מלאה וספירה אמיתית (לא dimension של Excel שמטעה למיליוני שורות)
    if (isExcel) {
      const buffer = await response.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const allRows = xlsx.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
      const nonEmptyRows = (allRows || []).filter((row) =>
        Array.isArray(row) && row.some((cell) => cell != null && String(cell).trim() !== '')
      );
      const dataRows = nonEmptyRows.slice(header_row_index + 1);
      totalRows = dataRows.length;
    } else {
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const text = new TextDecoder('utf-8').decode(uint8Array);
      const lines = text.split(/\r\n|\n/).filter(line => line.trim());
      totalRows = lines.length - header_row_index - 1; // subtract header and pre-header rows
    }

    if (!totalRows || totalRows <= 0) {
      throw new Error('הקובץ ריק או לא נמצאו נתונים');
    }

    // הגבלת בטיחות: מניעת "מיליוני מוצרים" מקבצים עם dimension שגוי
    const MAX_ROWS = 500_000;
    if (totalRows > MAX_ROWS) {
      throw new Error(`הקובץ מכיל ${totalRows.toLocaleString()} שורות - הגבלה של ${MAX_ROWS.toLocaleString()} שורות מקסימום. פצל את הקובץ או בדוק את מבנה הקובץ.`);
    }

    // חישוב chunks
    const CHUNK_SIZE = 2000;
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

    await updateProcessStatus(base44, process.id, 20, 'running', 
      `זוהו ${totalRows.toLocaleString('he-IL')} מוצרים. מתחיל עיבוד ב-${totalChunks} חלקים...`);

    // שמירת מטא-דטה ל-ProcessStatus
    await base44.asServiceRole.entities.ProcessStatus.update(process.id, {
      metadata: {
        file_url,
        mapping,
        catalog_id,
        customer_email,
        total_rows: totalRows,
        chunk_size: CHUNK_SIZE,
        import_with_errors,
        header_row_index
      }
    });

    // קריאה ל-worker הראשון
    await base44.asServiceRole.functions.invoke('processCatalogChunkWorker', {
      process_id: process.id,
      chunk_number: 0,
      total_chunks: totalChunks
    });

    // החזרת תגובה מיידית - העיבוד ממשיך ברקע
    return new Response(JSON.stringify({
      success: true,
      process_id: process.id,
      total_rows: totalRows,
      total_chunks: totalChunks,
      message: `התחיל עיבוד ${totalRows.toLocaleString('he-IL')} מוצרים ב-${totalChunks} שלבים`
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