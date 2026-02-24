import { requireAuth, supabaseAdmin } from './_helpers.js';
import * as xlsx from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { catalogId, customer_email } = req.body ?? {};
    if (!catalogId) return res.status(400).json({ error: 'catalogId is required' });

    const { data: products, error } = await supabaseAdmin
      .from('product')
      .select('product_name, barcode, cost_price, selling_price, category, supplier, inventory, gross_profit, profit_percentage')
      .eq('catalog_id', catalogId)
      .eq('is_active', true);

    if (error) throw new Error(error.message);

    const rows = (products || []).map((p) => ({
      'שם מוצר': p.product_name,
      'ברקוד': p.barcode || '',
      'מחיר עלות': p.cost_price,
      'מחיר מכירה': p.selling_price,
      'רווח גולמי': p.gross_profit,
      'אחוז רווח': p.profit_percentage,
      'קטגוריה': p.category,
      'ספק': p.supplier,
      'מלאי': p.inventory,
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'קטלוג');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const base64 = buffer.toString('base64');

    return res.status(200).json({
      success: true,
      file_data: base64,
      file_name: `catalog_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      products_count: rows.length,
    });
  } catch (error) {
    console.error('[exportCatalogToExcel]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
