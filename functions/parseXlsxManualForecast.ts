import * as XLSX from 'npm:xlsx@0.18.5';

/**
 * פרסור קובץ Excel לתחזית ידנית
 * מחזיר את המבנה הבסיסי של הגיליונות והעמודות
 */
Deno.serve(async (req) => {
    try {
        const { file_url } = await req.json();

        if (!file_url) {
            return Response.json({ 
                error: 'Missing file_url parameter' 
            }, { status: 400 });
        }

        console.log('Fetching file from:', file_url);

        // הורדת הקובץ
        let fileResponse;
        try {
            fileResponse = await fetch(file_url);
            
            if (!fileResponse.ok) {
                throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
            }
        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            return Response.json({ 
                error: 'שגיאה בהורדת הקובץ: ' + fetchError.message 
            }, { status: 500 });
        }

        // המרה ל-ArrayBuffer
        let arrayBuffer;
        try {
            arrayBuffer = await fileResponse.arrayBuffer();
            console.log('File size:', arrayBuffer.byteLength, 'bytes');
        } catch (bufferError) {
            console.error('Buffer error:', bufferError);
            return Response.json({ 
                error: 'שגיאה בקריאת הקובץ: ' + bufferError.message 
            }, { status: 500 });
        }

        // פרסור ה-Excel
        let workbook;
        try {
            workbook = XLSX.read(arrayBuffer, { 
                type: 'array',
                cellDates: true,
                cellNF: true,
                cellText: false
            });
            
            console.log('Workbook loaded, sheets:', workbook.SheetNames);
        } catch (xlsxError) {
            console.error('XLSX parse error:', xlsxError);
            return Response.json({ 
                error: 'שגיאה בפרסור הקובץ: ' + xlsxError.message + '. האם זה קובץ Excel תקין?' 
            }, { status: 500 });
        }

        // עיבוד הגיליונות
        const sheets = [];
        
        for (const sheetName of workbook.SheetNames) {
            try {
                const worksheet = workbook.Sheets[sheetName];
                
                // המרה ל-JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: null,
                    blankrows: false
                });

                if (jsonData.length === 0) {
                    console.log(`Sheet "${sheetName}" is empty, skipping`);
                    continue;
                }

                // השורה הראשונה היא הכותרות
                const headers = jsonData[0]
                    .map(h => h ? String(h).trim() : '')
                    .filter(h => h !== '');

                const dataRows = jsonData.slice(1).filter(row => 
                    row.some(cell => cell !== null && cell !== '')
                );

                sheets.push({
                    name: sheetName,
                    headers: headers,
                    row_count: dataRows.length,
                    sample_data: dataRows.slice(0, 3) // 3 שורות לדוגמה
                });

                console.log(`Sheet "${sheetName}": ${headers.length} columns, ${dataRows.length} rows`);
            } catch (sheetError) {
                console.error(`Error processing sheet "${sheetName}":`, sheetError);
                // ממשיכים לגיליון הבא
            }
        }

        if (sheets.length === 0) {
            return Response.json({ 
                error: 'לא נמצאו גיליונות עם נתונים בקובץ' 
            }, { status: 400 });
        }

        // חילוץ שם הקובץ מה-URL
        const fileName = file_url.split('/').pop() || 'forecast.xlsx';

        return Response.json({
            success: true,
            file_name: fileName,
            sheets: sheets
        });

    } catch (error) {
        console.error('Unexpected error in parseXlsxManualForecast:', error);
        return Response.json({ 
            error: 'שגיאה כללית בפרסור: ' + error.message,
            stack: error.stack
        }, { status: 500 });
    }
});