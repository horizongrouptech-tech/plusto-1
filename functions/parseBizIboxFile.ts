import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl, customerEmail, dateRangeStart, dateRangeEnd } = await req.json();

    if (!fileUrl || !customerEmail) {
      return Response.json({ 
        success: false, 
        error: 'חסרים פרמטרים נדרשים' 
      }, { status: 400 });
    }

    // אם לא סופקו תאריכים, נשתמש בכל התאריכים שבקובץ
    const shouldFilterByDate = !!(dateRangeStart && dateRangeEnd);
    console.log('Date filtering:', shouldFilterByDate ? `${dateRangeStart} to ${dateRangeEnd}` : 'ALL DATES');

    // זיהוי סוג הקובץ - בדיקה משופרת
    const urlLower = fileUrl.toLowerCase();
    const isPdf = urlLower.endsWith('.pdf') || urlLower.includes('.pdf?');
    const isExcel = urlLower.endsWith('.xlsx') || urlLower.endsWith('.xls') || 
                   urlLower.includes('.xlsx?') || urlLower.includes('.xls?') ||
                   urlLower.includes('xlsx') || urlLower.includes('xls');
    
    console.log('=== FILE TYPE DETECTION ===');
    console.log('File URL:', fileUrl);
    console.log('Detected as PDF:', isPdf);
    console.log('Detected as Excel:', isExcel);
    console.log('=== END FILE TYPE ===');
    
    let rows = [];
    let detectedColumns = [];

    if (isPdf && !isExcel) {
      // ניתוח PDF באמצעות InvokeLLM עם Vision
      console.log('Starting PDF analysis for BiziBox file...');
      
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `אתה צריך לחלץ נתוני תנועות בנקאיות מדוח תזרים של BiziBox.

בדוח יש טבלה עם עמודות:
- תאריך (בפורמט DD/MM/YYYY)
- תיאור
- סוג חשבון  
- סוג תשלום
- קטגוריה
- אסמכתא/מספר ייחוס
- חובה (הוצאה) - מספר עם פסיק
- זכות (הכנסה) - מספר עם פסיק
- יתרה - מספר עם פסיק

עבור כל שורת תנועה בטבלה, חלץ:
1. date - המר תאריך מ-DD/MM/YYYY ל-YYYY-MM-DD (לדוגמה: 03/10/2025 -> 2025-10-03)
2. description - תיאור התנועה בעברית
3. account_type - סוג החשבון (אם קיים)
4. payment_type - סוג התשלום (אם קיים)
5. category - שם הקטגוריה בעברית (REQUIRED - חובה!)
6. reference - מספר אסמכתא (אם קיים)
7. debit - סכום חובה, הסר פסיקים והמר למספר (0 אם ריק)
8. credit - סכום זכות, הסר פסיקים והמר למספר (0 אם ריק)
9. balance - יתרה, הסר פסיקים והמר למספר

חשוב מאוד:
- התעלם משורות כותרת וסיכום
- כל שורה חייבת להכיל תאריך וקטגוריה תקינים
- המר את כל הסכומים למספרים טהורים ללא פסיקים ותווים מיוחדים
- החזר רק את ה-transactions array`,
          file_urls: [fileUrl],
          response_json_schema: {
            type: "object",
            properties: {
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string", description: "Date in YYYY-MM-DD format" },
                    description: { type: "string", description: "Transaction description" },
                    account_type: { type: "string", description: "Account type" },
                    payment_type: { type: "string", description: "Payment type" },
                    category: { type: "string", description: "Category name - REQUIRED" },
                    reference: { type: "string", description: "Reference number" },
                    debit: { type: "number", description: "Debit amount (expense)" },
                    credit: { type: "number", description: "Credit amount (income)" },
                    balance: { type: "number", description: "Balance amount" }
                  },
                  required: ["date", "category"]
                }
              }
            }
          }
        });

        rows = result?.transactions || [];
        console.log(`Found ${rows.length} transactions in PDF`);

        if (rows.length === 0) {
          console.error('No transactions found in PDF');
          return Response.json({ 
            success: false, 
            error: 'לא נמצאו תנועות בקובץ ה-PDF. ייתכן שהקובץ אינו בפורמט תקין של BiziBox או שהוא ריק.' 
          });
        }

      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return Response.json({ 
          success: false, 
          error: 'שגיאה בניתוח קובץ PDF: ' + pdfError.message 
        });
      }

    } else {
      // ניתוח Excel
      console.log('Attempting Excel parsing...');
      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();

      const XLSX = await import('npm:xlsx@0.18.5');
      
      try {
        const workbook = XLSX.read(fileBuffer, { type: 'array' });
        
        console.log('=== EXCEL COLUMNS DEBUG ===');
        console.log('Sheet names:', workbook.SheetNames);
        
        // נסה כל גיליון עד שנמצא נתונים
        for (const sheetName of workbook.SheetNames) {
          console.log(`Trying sheet: ${sheetName}`);
          const sheet = workbook.Sheets[sheetName];
          
          // קרא את ה-raw data ומצא את שורת הכותרות
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          console.log('Raw data rows:', rawData.length);
          
          // חפש שורה שמכילה "תאריך" או "קטגוריה"
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(15, rawData.length); i++) {
            const rowValues = rawData[i];
            if (rowValues && Array.isArray(rowValues)) {
              const rowText = rowValues.join(' ');
              if (rowText.includes('תאריך') && (rowText.includes('קטגוריה') || rowText.includes('זכות') || rowText.includes('חובה'))) {
                console.log(`Found header row at index ${i}:`, rowValues);
                headerRowIndex = i;
                detectedColumns = rowValues.filter(v => v); // שמור את העמודות שזוהו
                break;
              }
            }
          }
          
          if (headerRowIndex >= 0) {
            rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
            console.log('Rows after setting header:', rows.length);
            if (rows.length > 0) {
              console.log('First row keys:', Object.keys(rows[0]));
              console.log('First row:', JSON.stringify(rows[0], null, 2));
            }
            break;
          }
          
          // אם לא מצאנו header, נסה default
          if (rows.length === 0) {
            let testRows = XLSX.utils.sheet_to_json(sheet);
            if (testRows.length > 0) {
              const keys = Object.keys(testRows[0]);
              const hasRecognizedColumn = keys.some(k => 
                k.includes('תאריך') || k.includes('קטגוריה') || k.includes('חובה') || 
                k.includes('זכות') || k.includes('יתרה') || k.includes('תיאור')
              );
              
              if (hasRecognizedColumn) {
                console.log('Found recognized columns in sheet:', sheetName);
                rows = testRows;
                detectedColumns = keys;
                break;
              }
            }
          }
        }
        
        console.log('=== END EXCEL DEBUG ===');
        
      } catch (xlsxError) {
        console.error('Excel parsing failed:', xlsxError.message);
        return Response.json({ 
          success: false, 
          error: 'שגיאה בקריאת קובץ Excel: ' + xlsxError.message 
        });
      }
    }

    console.log(`Total rows to process: ${rows.length}`);
    
    if (!rows || rows.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'הקובץ ריק או לא נמצאו נתונים' 
      });
    }

    // פונקציה לזיהוי עמודה לפי מילות מפתח
    const findColumnValue = (row, possibleNames) => {
      if (!row) return undefined;
      // קודם בדיקה מדויקת
      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }
      }
      // בדיקה חלקית - אם שם העמודה מכיל את הטקסט
      const keys = Object.keys(row);
      for (const name of possibleNames) {
        const matchingKey = keys.find(k => k.includes(name) || name.includes(k));
        if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null && row[matchingKey] !== '') {
          return row[matchingKey];
        }
      }
      return undefined;
    };

    // פונקציה לבדיקה אם ערך הוא תאריך תקין
    const isValidDateValue = (value) => {
      if (!value) return false;
      
      // אם זה מספר (Excel serial) - תקין
      if (typeof value === 'number') return true;
      
      // אם זה string - בדוק אם נראה כמו תאריך
      if (typeof value === 'string') {
        const trimmed = value.trim();
        
        // פורמט DD/MM/YY או DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) return true;
        
        // פורמט YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
        
        // אם הטקסט ארוך מ-15 תווים, כנראה לא תאריך (זה כותרת או סיכום)
        if (trimmed.length > 15) return false;
        
        return false;
      }
      
      return false;
    };

    // פונקציה לניקוי ערך מספרי
    const cleanNumericValue = (value) => {
      if (value === undefined || value === null || value === '') return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // בדוק אם זה לא מספר (למשל "סליקה", "העברה בנקאית")
        const cleaned = value.replace(/[^\d.-]/g, '');
        if (cleaned === '' || cleaned === '-') return 0;
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    // פונקציה להמרת תאריך
    const parseDate = async (dateValue) => {
      if (!dateValue) return null;
      
      let parsedDate;
      
      if (typeof dateValue === 'number') {
        // Excel date serial
        const XLSX = await import('npm:xlsx@0.18.5');
        const parsed = XLSX.SSF.parse_date_code(dateValue);
        parsedDate = new Date(parsed.y, parsed.m - 1, parsed.d);
      } else if (typeof dateValue === 'string') {
        const trimmed = dateValue.trim();
        
        // פורמט YYYY-MM-DD
        if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = new Date(trimmed);
        }
        // פורמט DD/MM/YYYY או DD/MM/YY
        else if (trimmed.includes('/')) {
          const parts = trimmed.split('/');
          if (parts.length === 3) {
            let year = parseInt(parts[2]);
            // תמיכה בשנה עם 2 ספרות
            if (year < 100) {
              year = year < 50 ? 2000 + year : 1900 + year;
            }
            parsedDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        } else {
          parsedDate = new Date(trimmed);
        }
      } else {
        parsedDate = new Date(dateValue);
      }
      
      // בדוק אם התאריך תקין
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return null;
      }
      
      return parsedDate;
    };

    const cashFlowEntries = [];
    const categorySums = {};
    const failedRows = [];
    const skippedRows = [];
    let rowIndex = 0;

    for (const row of rows) {
      rowIndex++;
      
      // מיפוי עמודות גמיש
      const dateRaw = findColumnValue(row, [
        'date', 'תאריך', 'Date', 'תאריך עבר', 'תנועות עבר', 
        'תאריך ערך', 'תאריך תנועה', 'transaction_date', 'תאריך התנועה',
        'ת.ערך', 'ת.תנועה', 'תאריך ביצוע'
      ]);
      
      // בדיקה ראשונית - האם התאריך נראה תקין
      if (!isValidDateValue(dateRaw)) {
        const reason = !dateRaw ? 'חסר תאריך' : `תאריך לא תקין: "${String(dateRaw).substring(0, 30)}"`;
        skippedRows.push({
          row: rowIndex,
          reason,
          data: JSON.stringify(row).substring(0, 200)
        });
        console.log(`Skipping row ${rowIndex} - ${reason}`);
        continue;
      }
      
      // קריאת ערכי זכות וחובה - חיפוש מפורש יותר
      const creditRaw = findColumnValue(row, [
        'זכות', 'credit', 'Credit', 'הכנסה', 'income', 
        'זכות (הכנסה)', 'כניסה', 'הפקדה', 'זכ\'', 'זכ',
        'זיכוי', 'הכנסות', 'תקבולים', 'תקבול'
      ]);
      
      const debitRaw = findColumnValue(row, [
        'חובה', 'debit', 'Debit', 'הוצאה', 'expense', 
        'חובה (הוצאה)', 'יציאה', 'משיכה', 'חו\'', 'חו',
        'חיוב', 'הוצאות', 'תשלומים'
      ]);
      
      // נקה ערכים מספריים
      const credit = cleanNumericValue(creditRaw);
      const debit = cleanNumericValue(debitRaw);
      
      // דילוג על שורות ללא סכומים
      if (credit === 0 && debit === 0) {
        skippedRows.push({
          row: rowIndex,
          reason: 'אין סכומים (זכות וחובה = 0)',
          data: JSON.stringify(row).substring(0, 200)
        });
        continue;
      }
      
      // שאר השדות
      const description = findColumnValue(row, [
        'description', 'תיאור', 'Description', 'פרטים', 'תאור', 
        'תיאור התנועה', 'פירוט', 'details'
      ]) || '';
      
      const accountNumber = findColumnValue(row, [
        'account_number', 'ח-ן', 'חשבון', 'מספר חשבון', 'חשבון בנק',
        'account', 'bank_account', 'ח.ן', 'חן'
      ]) || '';
      
      const source = findColumnValue(row, [
        'source', 'מאת', 'Source', 'מקור'
      ]) || description;
      
      const accountType = findColumnValue(row, [
        'account_type', 'סוג חשבון', 'Account Type', 'סוג', 'type'
      ]) || '';
      
      const paymentType = findColumnValue(row, [
        'payment_type', 'סוג תשלום', 'Payment Type', 'אמצעי תשלום',
        'סוג התשלום', 'תשלום', 'payment'
      ]) || '';
      
      let category = findColumnValue(row, [
        'category', 'קטגוריה', 'Category', 'קטגוריות', 
        'סיווג', 'classification', 'סוג הוצאה', 'קטגוריה ראשית'
      ]) || '';
      
      // אם אין קטגוריה, נסה לזהות לפי סוג התנועה
      if (!category) {
        if (credit > 0) {
          category = 'הכנסות';
        } else if (debit > 0) {
          category = 'הוצאות';
        } else {
          category = 'לא מסווג';
        }
      }
      
      const reference = findColumnValue(row, [
        'reference', 'אסמכתא', 'Reference', 'מספר אסמכתא', 
        'אסמכתה', 'ref', 'מספר ייחוס', 'reference_number'
      ]) || '';
      
      const balance = findColumnValue(row, [
        'balance', 'יתרה', 'Balance', 'יתרה נוכחית', 
        'יתרה (כולל גררות)', 'total_balance'
      ]);
      const balanceNum = cleanNumericValue(balance);

      // המרת תאריך
      const parsedDate = await parseDate(dateRaw);
      
      if (!parsedDate) {
        failedRows.push({
          row: rowIndex,
          reason: `לא ניתן להמיר תאריך: "${dateRaw}"`,
          data: { date: dateRaw, description, category, credit, debit },
          rawData: row
        });
        continue;
      }

      const dateString = parsedDate.toISOString().split('T')[0];

      // סינון לפי טווח תאריכים - רק אם סופק טווח
      if (shouldFilterByDate) {
        if (dateRangeStart && dateString < dateRangeStart) {
          skippedRows.push({
            row: rowIndex,
            reason: `תאריך ${dateString} מחוץ לטווח (לפני ${dateRangeStart})`,
            data: { date: dateString, description }
          });
          continue;
        }
        if (dateRangeEnd && dateString > dateRangeEnd) {
          skippedRows.push({
            row: rowIndex,
            reason: `תאריך ${dateString} מחוץ לטווח (אחרי ${dateRangeEnd})`,
            data: { date: dateString, description }
          });
          continue;
        }
      }

      // שמירת רשומה
      cashFlowEntries.push({
        customer_email: customerEmail,
        date: dateString,
        description,
        source,
        account_type: accountType,
        account_number: String(accountNumber),
        payment_type: paymentType,
        category,
        debit,
        credit,
        balance: balanceNum,
        reference_number: String(reference),
        imported_from_file_id: fileUrl
      });

      // חישוב סכומים לפי קטגוריה (רק הוצאות)
      if (debit > 0) {
        if (!categorySums[category]) {
          categorySums[category] = { total: 0, count: 0, months: {} };
        }
        categorySums[category].total += debit;
        categorySums[category].count += 1;

        const monthKey = `${parsedDate.getFullYear()}-${parsedDate.getMonth() + 1}`;
        if (!categorySums[category].months[monthKey]) {
          categorySums[category].months[monthKey] = 0;
        }
        categorySums[category].months[monthKey] += debit;
      }
    }

    console.log(`=== PROCESSING SUMMARY ===`);
    console.log(`Total rows in file: ${rows.length}`);
    console.log(`Valid entries: ${cashFlowEntries.length}`);
    console.log(`Skipped rows: ${skippedRows.length}`);
    console.log(`Failed rows: ${failedRows.length}`);
    console.log(`Categories found: ${Object.keys(categorySums).length}`);
    
    const totalCreditSum = cashFlowEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
    const totalDebitSum = cashFlowEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    console.log(`Total Credit: ${totalCreditSum.toLocaleString()}`);
    console.log(`Total Debit: ${totalDebitSum.toLocaleString()}`);
    console.log(`=== END SUMMARY ===`);

    if (cashFlowEntries.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'לא נמצאו תנועות תקינות בקובץ',
        details: {
          totalRows: rows.length,
          skippedRows: skippedRows.slice(0, 10),
          failedRows: failedRows.slice(0, 10),
          detectedColumns
        }
      });
    }

    // טעינת תנועות קיימות למניעת כפילויות
    const existingEntries = await base44.asServiceRole.entities.CashFlow.filter({
      customer_email: customerEmail
    });

    console.log(`Found ${existingEntries.length} existing entries for duplicate detection`);

    // מיזוג חכם - זיהוי כפילויות
    const newEntries = [];
    const duplicates = [];

    for (const entry of cashFlowEntries) {
      const isDuplicate = existingEntries.some(existing => 
        existing.date === entry.date &&
        existing.description === entry.description &&
        existing.debit === entry.debit &&
        existing.credit === entry.credit
      );

      if (isDuplicate) {
        duplicates.push(entry);
      } else {
        newEntries.push(entry);
      }
    }

    console.log(`New entries to add: ${newEntries.length}, Duplicates skipped: ${duplicates.length}`);

    // סינון רק תאריכים מהיום והלאה (עתיד והווה)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureEntries = newEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= today;
    });

    console.log(`Filtered to future entries: ${futureEntries.length} (from ${newEntries.length} total)`);

    // שמירה בבסיס הנתונים - רק שורות חדשות עתידיות
    if (futureEntries.length > 0) {
      console.log('Saving new cash flow entries to database...');
      await base44.asServiceRole.entities.CashFlow.bulkCreate(futureEntries);
      console.log('Cash flow entries saved successfully');
    }

    // יצירת הוצאות קבועות
    const recurringExpenses = [];
    for (const [category, data] of Object.entries(categorySums)) {
      const monthlyAmounts = Object.entries(data.months).map(([monthKey, amount]) => {
        const [year, month] = monthKey.split('-').map(Number);
        return {
          month,
          year,
          amount,
          linked_to_forecast: false
        };
      });

      const avgMonthly = data.total / Object.keys(data.months).length;

      recurringExpenses.push({
        customer_email: customerEmail,
        category,
        monthly_amounts: monthlyAmounts,
        average_monthly: avgMonthly,
        total_in_range: data.total,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd
      });
    }

    // בדיקה אם כבר קיימות רשומות - עדכון או יצירה
    const existingExpenses = await base44.asServiceRole.entities.RecurringExpense.filter({
      customer_email: customerEmail
    });

    for (const newExpense of recurringExpenses) {
      const existingExpense = existingExpenses.find(e => e.category === newExpense.category);
      if (existingExpense) {
        await base44.asServiceRole.entities.RecurringExpense.update(existingExpense.id, newExpense);
      } else {
        await base44.asServiceRole.entities.RecurringExpense.create(newExpense);
      }
    }

    // חישוב טווח תאריכים בפועל מהנתונים שנשמרו
    let actualDateRange = dateRangeStart && dateRangeEnd 
      ? `${dateRangeStart} - ${dateRangeEnd}` 
      : 'כל התאריכים';
    
    if (newEntries.length > 0) {
      const dates = newEntries.map(e => e.date).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      actualDateRange = `${minDate} - ${maxDate}`;
    }

    console.log('Process completed successfully');
    
    return Response.json({
      success: true,
      processed: newEntries.length,
      duplicates: duplicates.length,
      skipped: skippedRows.length,
      failed: failedRows.length,
      cashFlowEntries: newEntries.length,
      recurringExpenses: recurringExpenses.length,
      categories: Object.keys(categorySums),
      dateRange: actualDateRange,
      detectedDateRange: actualDateRange,
      filterWasApplied: shouldFilterByDate,
      totals: {
        credit: totalCreditSum,
        debit: totalDebitSum
      },
      // מידע לעריכה ידנית
      failedRows: failedRows.slice(0, 50), // עד 50 שורות בעייתיות
      skippedSample: skippedRows.slice(0, 20), // דוגמה משורות שדולגו
      detectedColumns
    });

  } catch (error) {
    console.error('Error parsing BiziBox file:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});