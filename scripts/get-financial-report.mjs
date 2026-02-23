import XLSX from 'xlsx';

const filePath = 'c:\\Users\\asher\\Downloads\\ad7f59b27_entity_schemas_export כל הסכמות.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['FinancialReport'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
for (const row of data) {
  console.log(JSON.stringify(row));
}
