import XLSX from 'xlsx';

const filePath = 'c:\\Users\\asher\\Downloads\\ad7f59b27_entity_schemas_export כל הסכמות.xlsx';
const wb = XLSX.readFile(filePath);

const sheetName = 'Meeting';
const ws = wb.Sheets[sheetName];

console.log('=== Raw cell data for Meeting ===');
console.log('Sheet range:', ws['!ref']);

// Print all cells in the first 3 rows
const range = XLSX.utils.decode_range(ws['!ref']);
console.log(`Range: cols ${range.s.c}-${range.e.c}, rows ${range.s.r}-${range.e.r}`);

for (let r = 0; r <= 2; r++) {
  console.log(`\n--- Row ${r} ---`);
  for (let c = 0; c <= Math.min(range.e.c, 10); c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (cell) {
      console.log(`  ${addr} (col ${c}): "${cell.v}" [type: ${cell.t}]`);
    }
  }
}

// Also check with defval to see all columns
console.log('\n\n=== Full JSON with all columns ===');
const allData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log('Header row:', JSON.stringify(allData[0]));
console.log('Data row 1:', JSON.stringify(allData[1]));
console.log('Data row 2:', JSON.stringify(allData[2]));
