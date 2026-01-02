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
      // ניתוח PDF באמצעות AI
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
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

      if (extractResult.status === 'error') {
        return Response.json({ 
          success: false, 
          error: 'שגיאה בניתוח קובץ PDF: ' + extractResult.details 
        });
      }

      rows = extractResult.output?.transactions || [];

    } else {
      // ניתוח Excel
      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();

      const XLSX = await import('npm:xlsx@0.18.5');
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(firstSheet);
    }

    if (!rows || rows.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'הקובץ ריק או לא נמצאו נתונים' 
      });
    }

    const cashFlowEntries = [];
    const categorySums = {};

    for (const row of rows) {
      // מיפוי עמודות גמיש - תמיכה בשמות שונים
      const date = row['תאריך'] || row['date'] || row['Date'];
      const description = row['תיאור'] || row['description'] || row['Description'] || '';
      const source = row['מאת'] || row['source'] || row['Source'] || description;
      const accountType = row['סוג חשבון'] || row['account_type'] || row['Account Type'] || '';
      const paymentType = row['סוג תשלום'] || row['payment_type'] || row['Payment Type'] || '';
      const category = row['קטגוריה'] || row['category'] || row['Category'];
      const creditRaw = row['זכות'] || row['credit'] || row['Credit'] || 0;
      const debitRaw = row['חובה'] || row['debit'] || row['Debit'] || 0;
      const reference = row['אסמכתא'] || row['reference'] || row['Reference'] || '';
      const balance = row['יתרה'] || row['balance'] || row['Balance'] || 0;

      if (!date || !category) continue;

      // המרת תאריך
      let parsedDate;
      if (typeof date === 'number') {
        // Excel date serial
        const XLSX = await import('npm:xlsx@0.18.5');
        parsedDate = XLSX.SSF.parse_date_code(date);
        parsedDate = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
      } else if (typeof date === 'string') {
        // ניסיון לפרש תאריך בפורמטים שונים
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            parsedDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        } else {
          parsedDate = new Date(date);
        }
      } else {
        parsedDate = new Date(date);
      }

      if (isNaN(parsedDate.getTime())) continue;

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

    if (cashFlowEntries.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'לא נמצאו תנועות תקינות בקובץ (או שכולן מחוץ לטווח התאריכים שנבחר)' 
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
    await base44.asServiceRole.entities.CashFlow.bulkCreate(cashFlowEntries);

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