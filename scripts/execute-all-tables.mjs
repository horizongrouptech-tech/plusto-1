import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env.local');
  console.error('Get it from: Supabase Dashboard > Settings > Database > Connection string (URI)');
  console.error('Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });

async function main() {
  const sqlPath = resolve(__dirname, 'all-tables.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('Connected!\n');

  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let success = 0;
  let errors = 0;

  for (const stmt of statements) {
    const tableName = stmt.match(/(?:CREATE TABLE|ALTER TABLE|CREATE POLICY).*?(\w+)/i)?.[1] || 'unknown';
    try {
      await client.query(stmt + ';');
      success++;
      if (stmt.includes('CREATE TABLE')) {
        console.log(`✓ Created table: ${tableName}`);
      }
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`⏭ Already exists: ${tableName}`);
        success++;
      } else {
        console.error(`✗ Error on ${tableName}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nDone! Success: ${success}, Errors: ${errors}`);
  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
