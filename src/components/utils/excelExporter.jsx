import * as XLSX from 'xlsx';

/**
 * ייצוא נתונים לקובץ Excel
 * @param {Array} data - מערך של אובייקטים לייצוא
 * @param {string} filename - שם הקובץ (ללא סיומת)
 * @param {string} sheetName - שם הגיליון (ברירת מחדל: 'נתונים')
 */
export function exportToExcel(data, filename = 'export', sheetName = 'נתונים') {
  try {
    // יצירת workbook
    const wb = XLSX.utils.book_new();
    
    // יצירת worksheet מהנתונים
    const ws = XLSX.utils.json_to_sheet(data);
    
    // הוספת הגיליון ל-workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // כתיבת הקובץ
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ייצוא מספר גיליונות לקובץ Excel אחד
 * @param {Object} sheets - אובייקט שבו המפתחות הם שמות הגיליונות והערכים הם מערכי הנתונים
 * @param {string} filename - שם הקובץ
 */
export function exportMultipleSheetsToExcel(sheets, filename = 'export') {
  try {
    const wb = XLSX.utils.book_new();
    
    Object.entries(sheets).forEach(([sheetName, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting multiple sheets to Excel:', error);
    return { success: false, error: error.message };
  }
}

/**
 * קריאת קובץ Excel והמרתו לנתונים
 * @param {File} file - קובץ Excel
 * @returns {Promise} Promise שמחזיר את הנתונים מכל הגיליונות
 */
export async function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets = {};
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet);
        });
        
        resolve({ success: true, sheets });
      } catch (error) {
        reject({ success: false, error: error.message });
      }
    };
    
    reader.onerror = () => {
      reject({ success: false, error: 'Failed to read file' });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * המרת טבלה HTML לקובץ Excel
 * @param {string} tableId - ID של טבלת HTML
 * @param {string} filename - שם הקובץ
 */
export function exportTableToExcel(tableId, filename = 'table-export') {
  try {
    const table = document.getElementById(tableId);
    if (!table) {
      throw new Error(`Table with ID ${tableId} not found`);
    }
    
    const wb = XLSX.utils.table_to_book(table, { sheet: 'Sheet1' });
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting table to Excel:', error);
    return { success: false, error: error.message };
  }
}