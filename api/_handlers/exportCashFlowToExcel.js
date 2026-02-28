import { requireAuth, supabaseAdmin } from '../_helpers.js';
import * as xlsx from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email, customer_id, start_date, end_date } = req.body ?? {};
    if (!customer_email && !customer_id) return res.status(400).json({ error: 'customer_email or customer_id is required' });

    const filterKey = customer_id ? 'customer_id' : 'customer_email';
    const filterVal = customer_id || customer_email;

    let query = supabaseAdmin
      .from('cash_flow_entry')
      .select('*')
      .eq(filterKey, filterVal)
      .order('date', { ascending: true });

    if (start_date) query = query.gte('date', start_date);
    if (end_date) query = query.lte('date', end_date);

    const { data: entries, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (entries || []).map(e => ({
      'תאריך': e.date || '',
      'קטגוריה': e.category || '',
      'תיאור': e.description || '',
      'הכנסות': e.income || 0,
      'הוצאות': e.expense || 0,
      'יתרה': e.balance || 0,
      'סוג': e.entry_type || '',
      'הערות': e.notes || '',
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'תזרים מזומנים');

    // Add summary row
    const totalIncome = rows.reduce((s, r) => s + (r['הכנסות'] || 0), 0);
    const totalExpense = rows.reduce((s, r) => s + (r['הוצאות'] || 0), 0);
    xlsx.utils.sheet_add_aoa(worksheet, [
      [],
      ['סיכום', '', '', totalIncome, totalExpense, totalIncome - totalExpense],
    ], { origin: -1 });

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const base64 = buffer.toString('base64');

    return res.status(200).json({
      success: true,
      file_data: base64,
      file_name: `cashflow_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      entries_count: rows.length,
      total_income: totalIncome,
      total_expense: totalExpense,
    });
  } catch (e) {
    console.error('[exportCashFlowToExcel]', e);
    return res.status(500).json({ error: e.message });
  }
}
