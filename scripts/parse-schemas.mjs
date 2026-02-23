import XLSX from 'xlsx';

const filePath = 'c:\\Users\\asher\\Downloads\\ad7f59b27_entity_schemas_export כל הסכמות.xlsx';
const wb = XLSX.readFile(filePath);

console.log('Sheet names:', wb.SheetNames);
console.log('Total sheets:', wb.SheetNames.length);
console.log('---');

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n========== Sheet: "${name}" ==========`);
  console.log(`Rows: ${data.length}`);
  if (data.length > 0) {
    console.log('Headers:', JSON.stringify(data[0]));
  }
  for (let i = 1; i < Math.min(4, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
});
