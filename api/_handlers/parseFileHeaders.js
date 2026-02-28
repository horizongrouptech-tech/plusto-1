import { requireAuth } from '../_helpers.js';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, sheet_name } = req.body ?? {};
    if (!file_url) return res.status(400).json({ error: 'file_url required' });

    const response = await fetch(file_url);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
    const buffer = await response.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const targetSheet = sheet_name || workbook.SheetNames[0];
    const ws = workbook.Sheets[targetSheet];

    if (!ws) return res.status(404).json({ error: `Sheet "${targetSheet}" not found` });

    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const headers = (data[0] || []).filter(h => h !== '');
    const sample = data.slice(1, 5);

    return res.status(200).json({ headers, sample_rows: sample, sheet_name: targetSheet, sheet_names: workbook.SheetNames });
  } catch (e) {
    console.error('[parseFileHeaders]', e);
    return res.status(500).json({ error: e.message });
  }
}
