import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerEmail, dateRangeStart, dateRangeEnd } = await req.json();

    if (!customerEmail) {
      return Response.json({ error: 'Missing customer email' }, { status: 400 });
    }

    // טעינת נתוני תזרים
    const cashFlowData = await base44.asServiceRole.entities.CashFlow.filter({
      customer_email: customerEmail,
      date: { 
        $gte: dateRangeStart, 
        $lte: dateRangeEnd 
      }
    }, '-date');

    // יצירת קובץ Excel
    const XLSX = await import('npm:xlsx@0.18.5');
    
    const worksheetData = [
      ['תאריך', 'מקור', 'סוג תשלום', 'קטגוריה', 'זכות', 'חובה', 'אסמכתא'],
      ...cashFlowData.map(item => [
        item.date,
        item.source || '',
        item.payment_type || '',
        item.category || '',
        item.credit || 0,
        item.debit || 0,
        item.reference_number || ''
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'תזרים כספים');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=cashflow.xlsx'
      }
    });

  } catch (error) {
    console.error('Error exporting cash flow:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});