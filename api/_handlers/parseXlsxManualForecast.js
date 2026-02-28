import { requireAuth } from '../_helpers.js';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url } = req.body ?? {};
    if (!file_url) return res.status(400).json({ error: 'file_url required' });

    const response = await fetch(file_url);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
    const buffer = await response.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = workbook.SheetNames.map(name => {
      const ws = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const headers = (data[0] || []).filter(h => h !== '');
      const sampleRows = data.slice(1, 4);

      // Detect column types
      const columnTypes = headers.map((h, i) => {
        const values = sampleRows.map(r => r[i]).filter(v => v !== '');
        const isNum = values.every(v => !isNaN(parseFloat(v)));
        const isDate = values.some(v => /\d{1,4}[-/]\d{1,2}/.test(String(v)));
        return { header: h, type: isDate ? 'date' : isNum ? 'number' : 'text' };
      });

      return { sheet_name: name, headers, column_types: columnTypes, sample_rows: sampleRows };
    });

    return res.status(200).json({ sheets, sheet_count: sheets.length });
  } catch (e) {
    console.error('[parseXlsxManualForecast]', e);
    return res.status(500).json({ error: e.message });
  }
}
