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

        console.log('=== AI RESPONSE DEBUG ===');
        console.log('Full result type:', typeof result);
        console.log('Result is array?', Array.isArray(result));
        console.log('Result keys:', Object.keys(result || {}));
        console.log('Transactions exists?', !!result?.transactions);
        console.log('Transactions length:', result?.transactions?.length);
        console.log('First row full object:', JSON.stringify(result?.transactions?.[0], null, 2));
        console.log('Second row full object:', JSON.stringify(result?.transactions?.[1], null, 2));
        console.log('Third row full object:', JSON.stringify(result?.transactions?.[2], null, 2));
        console.log('=== END DEBUG ===');

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
      // ניתוח Excel - נסה קודם כ-Excel
      console.log('Attempting Excel parsing...');
      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();

      const XLSX = await import('npm:xlsx@0.18.5');
      
      try {
        const workbook = XLSX.read(fileBuffer, { type: 'array' });
        
        // דיבאג - זיהוי שמות העמודות
        console.log('=== EXCEL COLUMNS DEBUG ===');
        console.log('Sheet names:', workbook.SheetNames);
        
        // נסה כל גיליון עד שנמצא נתונים
        for (const sheetName of workbook.SheetNames) {
          console.log(`Trying sheet: ${sheetName}`);
          const sheet = workbook.Sheets[sheetName];
          
          // נסה עם header row שונים
          let testRows = XLSX.utils.sheet_to_json(sheet);
          console.log(`Sheet ${sheetName} - rows with default header:`, testRows.length);
          
          if (testRows.length > 0) {
            console.log('First row keys:', Object.keys(testRows[0]));
            console.log('First row full:', JSON.stringify(testRows[0], null, 2));
            
            // בדוק אם יש עמודות מוכרות
            const keys = Object.keys(testRows[0]);
            const hasRecognizedColumn = keys.some(k => 
              k.includes('תאריך') || k.includes('קטגוריה') || k.includes('חובה') || 
              k.includes('זכות') || k.includes('יתרה') || k.includes('תיאור')
            );
            
            if (hasRecognizedColumn) {
              console.log('Found recognized columns in sheet:', sheetName);
              rows = testRows;
              break;
            }
          }
          
          // אם לא מצאנו עמודות מוכרות, נסה לדלג על שורות header
          if (rows.length === 0) {
            // נסה לקרוא את ה-raw data ולמצוא את שורת הכותרות
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log('Raw data rows:', rawData.length);
            console.log('First 5 raw rows:', JSON.stringify(rawData.slice(0, 5), null, 2));
            
            // חפש שורה שמכילה "תאריך" או "קטגוריה"
            for (let i = 0; i < Math.min(10, rawData.length); i++) {
              const rowValues = rawData[i];
              if (rowValues && Array.isArray(rowValues)) {
                const rowText = rowValues.join(' ');
                if (rowText.includes('תאריך') || rowText.includes('קטגוריה')) {
                  console.log(`Found header row at index ${i}:`, rowValues);
                  // קרא מחדש עם header מהשורה הזו
                  rows = XLSX.utils.sheet_to_json(sheet, { range: i });
                  console.log('Rows after setting header:', rows.length);
                  if (rows.length > 0) {
                    console.log('New first row keys:', Object.keys(rows[0]));
                    console.log('New first row:', JSON.stringify(rows[0], null, 2));
                  }
                  break;
                }
              }
            }
          }
          
          if (rows.length > 0) break;
        }
        
        console.log('=== END EXCEL DEBUG ===');
        
      } catch (xlsxError) {
        console.error('Excel parsing failed:', xlsxError.message);
        // אם נכשל, נסה כ-PDF
        console.log('Falling back to PDF/AI analysis...');
        
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `חלץ את כל התנועות הבנקאיות מהקובץ הזה. זהו דוח תזרים מ-BiziBox.
עבור כל תנועה החזר: date (YYYY-MM-DD), description, category, debit (מספר), credit (מספר), balance (מספר).
חובה שלכל שורה יהיה date וגם category.`,
          file_urls: [fileUrl],
          response_json_schema: {
            type: "object",
            properties: {
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    description: { type: "string" },
                    category: { type: "string" },
                    debit: { type: "number" },
                    credit: { type: "number" },
                    balance: { type: "number" }
                  },
                  required: ["date", "category"]
                }
              }
            }
          }
        });
        rows = result?.transactions || [];
      }
    }

    console.log(`Total rows to process: ${rows.length}`);
    
    // לוג מפורט של העמודות שזוהו
    if (rows.length > 0) {
      console.log('=== COLUMN DETECTION SUMMARY ===');
      console.log('Available columns in first row:', Object.keys(rows[0]));
      console.log('Sample values:', JSON.stringify(rows[0], null, 2));
      console.log('=== END SUMMARY ===');
    }

    if (!rows || rows.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'הקובץ ריק או לא נמצאו נתונים' 
      });
    }

    const cashFlowEntries = [];
    const categorySums = {};

    // פונקציה לזיהוי עמודה לפי מילות מפתח - הוגדר מחוץ ללולאה
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

    for (const row of rows) {
      // מיפוי עמודות גמיש - תמיכה בשמות שונים מ-BiziBox
      const date = findColumnValue(row, [
        'date', 'תאריך', 'Date', 'תאריך עבר', 'תנועות עבר', 
        'תאריך ערך', 'תאריך תנועה', 'transaction_date', 'תאריך התנועה',
        'ת.ערך', 'ת.תנועה', 'תאריך ביצוע'
      ]);
      
      const description = findColumnValue(row, [
        'description', 'תיאור', 'Description', 'פרטים', 'תאור', 
        'תיאור התנועה', 'פירוט', 'details'
      ]) || '';
      
      const source = findColumnValue(row, [
        'source', 'מאת', 'Source', 'מקור', 'חשבון', 'מספר חשבון'
      ]) || description;
      
      const accountType = findColumnValue(row, [
        'account_type', 'סוג חשבון', 'Account Type', 'חשבון', 
        'סוג', 'type', 'מאשר'
      ]) || '';
      
      const paymentType = findColumnValue(row, [
        'payment_type', 'סוג תשלום', 'Payment Type', 'אמצעי תשלום',
        'סוג התשלום', 'תשלום', 'payment'
      ]) || '';
      
      let category = findColumnValue(row, [
        'category', 'קטגוריה', 'Category', 'קטגוריות', 
        'סיווג', 'classification', 'סוג הוצאה', 'קטגוריה ראשית',
        'סיווג ראשי', 'קט\'', 'קטג', 'סוג', 'type', 'סוג תנועה'
      ]) || '';
      
      // אם אין קטגוריה, נסה לזהות לפי סוג התנועה
      if (!category) {
        if (creditRaw && parseFloat(String(creditRaw).replace(/[^\d.-]/g, '')) > 0) {
          category = 'הכנסות';
        } else if (debitRaw && parseFloat(String(debitRaw).replace(/[^\d.-]/g, '')) > 0) {
          category = 'הוצאות';
        } else {
          category = 'לא מסווג';
        }
      }
      
      const creditRaw = findColumnValue(row, [
        'credit', 'זכות', 'Credit', 'הכנסה', 'income', 
        'זכות (הכנסה)', 'כניסה', 'הפקדה', 'זכ\'', 'זכ',
        'זיכוי', 'הכנסות', 'מכירות', 'מחזור', 'מחזור מכירות',
        'תקבולים', 'תקבול', 'סה"כ זכות', 'סכום זכות',
        'Sales', 'Revenue', 'Total Credit', 'סה״כ'
      ]) || 0;
      
      const debitRaw = findColumnValue(row, [
        'debit', 'חובה', 'Debit', 'הוצאה', 'expense', 
        'חובה (הוצאה)', 'יציאה', 'משיכה', 'חו\'', 'חו',
        'חיוב', 'הוצאות', 'תשלומים', 'תשלום', 'סה"כ חובה',
        'סכום חובה', 'Expense', 'Payment', 'Total Debit'
      ]) || 0;
      
      const reference = findColumnValue(row, [
        'reference', 'אסמכתא', 'Reference', 'מספר אסמכתא', 
        'אסמכתה', 'ref', 'מספר ייחוס', 'reference_number'
      ]) || '';
      
      const balance = findColumnValue(row, [
        'balance', 'יתרה', 'Balance', 'יתרה נוכחית', 
        'יתרה (כולל גררות)', 'total_balance'
      ]) || 0;

      console.log(`Processing row - date: ${date}, category: ${category}, debit: ${debitRaw}, credit: ${creditRaw}`);

      // דילוג רק אם אין תאריך - קטגוריה כבר ממולאה אוטומטית
      if (!date) {
        console.log(`Skipping row - missing date`);
        continue;
      }
      
      // אם אין סכומים בשורה, דלג
      const tempCredit = parseFloat(String(creditRaw).replace(/[^\d.-]/g, '')) || 0;
      const tempDebit = parseFloat(String(debitRaw).replace(/[^\d.-]/g, '')) || 0;
      if (tempCredit === 0 && tempDebit === 0) {
        console.log(`Skipping row - no amounts (credit: ${creditRaw}, debit: ${debitRaw})`);
        continue;
      }

      // המרת תאריך
      let parsedDate;
      if (typeof date === 'number') {
        // Excel date serial
        const XLSX = await import('npm:xlsx@0.18.5');
        parsedDate = XLSX.SSF.parse_date_code(date);
        parsedDate = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
      } else if (typeof date === 'string') {
        // תמיכה בפורמט YYYY-MM-DD (מה-AI)
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = new Date(date);
        }
        // תמיכה בפורמט DD/MM/YYYY
        else if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            // DD/MM/YYYY
            parsedDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        } 
        // תמיכה בכל פורמט אחר
        else {
          parsedDate = new Date(date);
        }
      } else {
        parsedDate = new Date(date);
      }

      if (isNaN(parsedDate.getTime())) {
        console.log(`Invalid date format: ${date}`);
        continue;
      }

      const dateString = parsedDate.toISOString().split('T')[0];

      // סינון לפי טווח תאריכים
      if (dateRangeStart && dateString < dateRangeStart) continue;
      if (dateRangeEnd && dateString > dateRangeEnd) continue;

      // ניקוי ערכים מספריים
      const credit = typeof creditRaw === 'string' 
        ? parseFloat(creditRaw.replace(/[^\d.-]/g, '')) || 0
        : parseFloat(creditRaw) || 0;
      
      const debit = typeof debitRaw === 'string' 
        ? parseFloat(debitRaw.replace(/[^\d.-]/g, '')) || 0
        : parseFloat(debitRaw) || 0;

      const balanceNum = typeof balance === 'string' 
        ? parseFloat(balance.replace(/[^\d.-]/g, '')) || 0
        : parseFloat(balance) || 0;

      // שמירת רשומה
      cashFlowEntries.push({
        customer_email: customerEmail,
        date: dateString,
        description,
        source,
        account_type: accountType,
        payment_type: paymentType,
        category,
        debit,
        credit,
        balance: balanceNum,
        reference_number: reference,
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

    console.log(`Valid cash flow entries: ${cashFlowEntries.length}`);
    console.log(`Categories found: ${Object.keys(categorySums).length}`);
    
    // סיכום סכומים לבדיקה
    const totalCreditSum = cashFlowEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
    const totalDebitSum = cashFlowEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    console.log(`=== TOTALS SUMMARY ===`);
    console.log(`Total Credit (הכנסות): ${totalCreditSum.toLocaleString()}`);
    console.log(`Total Debit (הוצאות): ${totalDebitSum.toLocaleString()}`);
    console.log(`Rows processed: ${cashFlowEntries.length} out of ${rows.length}`);
    console.log(`=== END TOTALS ===`);

    if (cashFlowEntries.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'לא נמצאו תנועות תקינות בקובץ. טווח שנבחר: ' + dateRangeStart + ' עד ' + dateRangeEnd 
      });
    }

    // מחיקת נתונים קיימים באותו טווח תאריכים
    const existing = await base44.asServiceRole.entities.CashFlow.filter({
      customer_email: customerEmail,
      date: { $gte: dateRangeStart, $lte: dateRangeEnd }
    });

    for (const item of existing) {
      await base44.asServiceRole.entities.CashFlow.delete(item.id);
    }

    // שמירה בבסיס הנתונים
    console.log('Saving cash flow entries to database...');
    await base44.asServiceRole.entities.CashFlow.bulkCreate(cashFlowEntries);
    console.log('Cash flow entries saved successfully');

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

    console.log('Process completed successfully');
    
    return Response.json({
      success: true,
      cashFlowEntries: cashFlowEntries.length,
      recurringExpenses: recurringExpenses.length,
      categories: Object.keys(categorySums),
      dateRange: `${dateRangeStart} - ${dateRangeEnd}`
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