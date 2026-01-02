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

    // זיהוי סוג הקובץ
    const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
    
    let rows = [];

    if (isPdf) {
      // ניתוח PDF באמצעות InvokeLLM עם Vision
      console.log('Starting PDF analysis for BiziBox file...');
      
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract all bank transactions from this BiziBox cash flow report.

For each transaction row in the table, extract:
- date (convert from DD/MM/YYYY to YYYY-MM-DD format)
- description (the transaction description)
- account_type (if exists)
- payment_type (if exists)
- category (the category name)
- reference (reference number if exists)
- debit (expense amount - number only, 0 if empty)
- credit (income amount - number only, 0 if empty)
- balance (balance amount - number only)

Important:
- Remove commas and currency symbols from numbers
- Convert all amounts to pure numbers
- Skip header rows and summary rows
- If a field is empty, use empty string for text fields and 0 for numbers
- Return ONLY the transactions array, nothing else`,
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
                    account_type: { type: "string" },
                    payment_type: { type: "string" },
                    category: { type: "string" },
                    reference: { type: "string" },
                    debit: { type: "number" },
                    credit: { type: "number" },
                    balance: { type: "number" }
                  }
                }
              }
            }
          }
        });

        console.log('LLM Response:', JSON.stringify(result));

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
      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();

      const XLSX = await import('npm:xlsx@0.18.5');
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(firstSheet);
    }

    console.log(`Total rows to process: ${rows.length}`);

    if (!rows || rows.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'הקובץ ריק או לא נמצאו נתונים' 
      });
    }

    const cashFlowEntries = [];
    const categorySums = {};

    for (const row of rows) {
      // מיפוי עמודות גמיש - תמיכה בשמות שונים (אנגלית קודמת למקרה של AI)
      const date = row.date || row['date'] || row['תאריך'] || row['Date'];
      const description = row.description || row['description'] || row['תיאור'] || row['Description'] || '';
      const source = row.source || row['source'] || row['מאת'] || row['Source'] || description;
      const accountType = row.account_type || row['account_type'] || row['סוג חשבון'] || row['Account Type'] || '';
      const paymentType = row.payment_type || row['payment_type'] || row['סוג תשלום'] || row['Payment Type'] || '';
      const category = row.category || row['category'] || row['קטגוריה'] || row['Category'] || '';
      const creditRaw = row.credit || row['credit'] || row['זכות'] || row['Credit'] || 0;
      const debitRaw = row.debit || row['debit'] || row['חובה'] || row['Debit'] || 0;
      const reference = row.reference || row['reference'] || row['אסמכתא'] || row['Reference'] || '';
      const balance = row.balance || row['balance'] || row['יתרה'] || row['Balance'] || 0;

      console.log(`Processing row - date: ${date}, category: ${category}, debit: ${debitRaw}, credit: ${creditRaw}`);

      if (!date || !category) {
        console.log(`Skipping row - missing date (${!!date}) or category (${!!category})`);
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