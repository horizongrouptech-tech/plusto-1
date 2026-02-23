import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function camelToSnake(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function mapType(fieldName, type) {
  switch (type) {
    case 'number': return 'NUMERIC';
    case 'boolean': return 'BOOLEAN DEFAULT false';
    case 'array': return 'JSONB DEFAULT \'[]\'::jsonb';
    case 'object': return 'JSONB';
    case 'string':
    default: return 'TEXT';
  }
}

const filePath = 'c:\\Users\\asher\\Downloads\\ad7f59b27_entity_schemas_export כל הסכמות.xlsx';
const wb = XLSX.readFile(filePath);

const SKIP_SHEETS = ['Summary', 'Product'];

const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'is_sample'];

let allSQL = [];
let tableCount = 0;

for (const sheetName of wb.SheetNames) {
  if (SKIP_SHEETS.includes(sheetName)) {
    console.log(`Skipping: ${sheetName}`);
    continue;
  }

  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (data.length < 2) {
    console.log(`Skipping empty sheet: ${sheetName}`);
    continue;
  }

  const tableName = camelToSnake(sheetName);
  const fields = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const fieldName = row[0];
    const fieldType = row[1];

    if (!fieldName || SYSTEM_FIELDS.includes(fieldName)) continue;

    fields.push(`  ${fieldName} ${mapType(fieldName, fieldType)}`);
  }

  const sql = `
-- ============================================
-- Table: ${tableName} (from ${sheetName})
-- ============================================
CREATE TABLE IF NOT EXISTS ${tableName} (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
${fields.join(',\n')},
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_id TEXT,
  is_sample BOOLEAN DEFAULT false
);

ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on ${tableName}" ON ${tableName} FOR ALL USING (true) WITH CHECK (true);
`;

  allSQL.push(sql);
  tableCount++;
  console.log(`Generated: ${tableName} (${fields.length} fields)`);
}

const fullSQL = allSQL.join('\n');
const outputPath = resolve(__dirname, 'all-tables.sql');
writeFileSync(outputPath, fullSQL, 'utf-8');
console.log(`\nTotal: ${tableCount} tables`);
console.log(`SQL saved to: ${outputPath}`);
