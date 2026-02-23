import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function* parseCSV(text) {
  let current = '';
  let fields = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current !== '' || fields.length > 0) {
        fields.push(current);
        yield fields;
        fields = [];
        current = '';
      }
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += char;
    }
  }
  if (current !== '' || fields.length > 0) {
    fields.push(current);
    yield fields;
  }
}

async function main() {
  const csvPath = 'c:\\Users\\asher\\Downloads\\Product_export (2).csv';
  console.log(`Reading CSV from: ${csvPath}`);

  const text = readFileSync(csvPath, 'utf-8');
  const rows = [...parseCSV(text)];

  const headers = rows[0];
  console.log(`Headers: ${headers.join(', ')}`);
  console.log(`Total rows (excluding header): ${rows.length - 1}`);

  const products = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;

    const product = {
      name: row[0] || null,
      cost_price: row[1] ? parseFloat(row[1]) : 0,
      selling_price: row[2] ? parseFloat(row[2]) : 0,
      monthly_sales: row[3] ? parseFloat(row[3]) : null,
      inventory: row[4] ? parseFloat(row[4]) : null,
      category: row[5] || null,
      supplier: row[6] || null,
      margin_percentage: row[7] ? parseFloat(row[7]) : null,
      monthly_revenue: row[8] ? parseFloat(row[8]) : null,
      id: row[9],
      created_date: row[10] || null,
      updated_date: row[11] || null,
      created_by_id: row[12] || null,
      created_by: row[13] || null,
      is_sample: row[14] === 'true',
    };
    products.push(product);
  }

  console.log(`Parsed ${products.length} products. Uploading in batches...`);

  const BATCH_SIZE = 500;
  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      errors += batch.length;
    } else {
      uploaded += batch.length;
      console.log(`Uploaded ${uploaded}/${products.length} products...`);
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Errors: ${errors}`);
}

main().catch(console.error);
