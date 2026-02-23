import XLSX from 'xlsx';

const filePath = 'c:\\Users\\asher\\Downloads\\ad7f59b27_entity_schemas_export כל הסכמות.xlsx';
const wb = XLSX.readFile(filePath);

// Show full detail for Meeting sheet as example
const sheetName = 'Meeting';
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`=== Sheet: "${sheetName}" ===`);
console.log(`Total columns: ${data[0].length}`);
console.log(`All Headers: ${JSON.stringify(data[0])}`);
console.log('---');

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const obj = {};
  for (let j = 0; j < data[0].length; j++) {
    if (row[j] !== undefined && row[j] !== '') {
      obj[data[0][j]] = row[j];
    }
  }
  console.log(`Row ${i}:`, JSON.stringify(obj, null, 2));
}

// Also check another sheet with more data
console.log('\n\n=== Checking ProductCatalog ===');
const ws2 = wb.Sheets['ProductCatalog'];
const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
console.log(`All Headers: ${JSON.stringify(data2[0])}`);
for (let i = 1; i < Math.min(6, data2.length); i++) {
  const row = data2[i];
  const obj = {};
  for (let j = 0; j < data2[0].length; j++) {
    if (row[j] !== undefined && row[j] !== '') {
      obj[data2[0][j]] = row[j];
    }
  }
  console.log(`Row ${i}:`, JSON.stringify(obj, null, 2));
}
