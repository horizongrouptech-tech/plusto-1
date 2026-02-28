import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, catalog_id, column_mapping, sheet_name } = req.body ?? {};
    if (!file_url || !catalog_id) return res.status(400).json({ error: 'file_url and catalog_id are required' });

    const response = await fetch(file_url);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
    const buffer = await response.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const targetSheet = sheet_name || workbook.SheetNames[0];
    const ws = workbook.Sheets[targetSheet];
    if (!ws) return res.status(404).json({ error: `Sheet not found: ${targetSheet}` });

    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const headers = rawData[0] || [];
    const dataRows = rawData.slice(1).filter(row => row.some(c => c !== ''));

    // Default field mapping if not provided
    const mapping = column_mapping || {
      product_name: 0,
      barcode: 1,
      cost_price: 2,
      selling_price: 3,
      category: 4,
      supplier: 5,
      inventory: 6,
    };

    const products = dataRows.map(row => {
      const product = { catalog_id, is_active: true };
      for (const [field, colIdx] of Object.entries(mapping)) {
        const val = row[colIdx];
        if (val !== '' && val !== undefined) {
          if (['cost_price', 'selling_price', 'inventory'].includes(field)) {
            product[field] = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
          } else {
            product[field] = String(val).trim();
          }
        }
      }
      // Calculate profit if prices are available
      if (product.selling_price && product.cost_price) {
        product.gross_profit = product.selling_price - product.cost_price;
        product.profit_percentage = product.cost_price > 0
          ? ((product.gross_profit / product.cost_price) * 100).toFixed(2)
          : 0;
      }
      return product;
    }).filter(p => p.product_name);

    let inserted = 0;
    let errors = 0;
    for (let i = 0; i < products.length; i += 200) {
      const chunk = products.slice(i, i + 200);
      const { error } = await supabaseAdmin.from('product').upsert(chunk, { onConflict: 'catalog_id,barcode', ignoreDuplicates: false });
      if (error) { errors += chunk.length; console.error('[processCatalogWithMapping] chunk error:', error.message); }
      else inserted += chunk.length;
    }

    // Update catalog product count
    await supabaseAdmin.from('catalog').update({ product_count: inserted }).eq('id', catalog_id);

    return res.status(200).json({ success: true, catalog_id, products_imported: inserted, errors });
  } catch (e) {
    console.error('[processCatalogWithMapping]', e);
    return res.status(500).json({ error: e.message });
  }
}
