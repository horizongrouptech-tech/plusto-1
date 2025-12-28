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

    // הורדת הקובץ
    const fileResponse = await fetch(fileUrl);
    const fileBuffer = await fileResponse.arrayBuffer();

    // ניתוח הקובץ - נניח שזה Excel
    const XLSX = await import('npm:xlsx@0.18.5');
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet);

    const cashFlowEntries = [];
    const categorySums = {};

    for (const row of rows) {
      // התאמה לעמודות של BusyBox
      const date = row['תאריך'] || row['date'];
      const source = row['מאת'] || row['source'];
      const paymentType = row['סוג תשלום'] || row['payment_type'];
      const category = row['קטגוריה'] || row['category'];
      const credit = parseFloat(row['זכות'] || row['credit'] || 0);
      const debit = parseFloat(row['חובה'] || row['debit'] || 0);
      const reference = row['אסמכתא'] || row['reference'];

      if (!date || !category) continue;

      // המרת תאריך
      let parsedDate;
      if (typeof date === 'number') {
        // Excel date serial
        parsedDate = XLSX.SSF.parse_date_code(date);
        parsedDate = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
      } else {
        parsedDate = new Date(date);
      }

      const dateString = parsedDate.toISOString().split('T')[0];

      // שמירת רשומה
      cashFlowEntries.push({
        customer_email: customerEmail,
        date: dateString,
        source: source || '',
        payment_type: paymentType || '',
        category: category,
        debit: debit,
        credit: credit,
        reference_number: reference || '',
        imported_from_file_id: fileUrl
      });

      // חישוב סכומים לפי קטגוריה
      if (!categorySums[category]) {
        categorySums[category] = { total: 0, count: 0, months: {} };
      }
      categorySums[category].total += debit || credit;
      categorySums[category].count += 1;

      const monthKey = `${parsedDate.getFullYear()}-${parsedDate.getMonth() + 1}`;
      if (!categorySums[category].months[monthKey]) {
        categorySums[category].months[monthKey] = 0;
      }
      categorySums[category].months[monthKey] += debit || credit;
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

      const avgMonthly = data.total / data.count;

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
    const existing = await base44.asServiceRole.entities.RecurringExpense.filter({
      customer_email: customerEmail
    });

    for (const newExpense of recurringExpenses) {
      const existingExpense = existing.find(e => e.category === newExpense.category);
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
      categories: Object.keys(categorySums)
    });

  } catch (error) {
    console.error('Error parsing BusyBox file:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});