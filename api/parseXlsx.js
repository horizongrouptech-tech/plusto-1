import { requireAuth } from './_helpers.js';
import * as xlsx from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { fileUrl } = req.body ?? {};
    if (!fileUrl) return res.status(400).json({ error: 'fileUrl is required' });

    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    const filtered = rawData.filter(row => Array.isArray(row) && row.some(c => c !== null && c !== ''));

    return res.status(200).json({ success: true, data: { raw_data: filtered } });
  } catch (error) {
    console.error('[parseXlsx]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
