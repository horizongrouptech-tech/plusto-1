import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as xlsx from 'npm:xlsx@0.18.5';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    return values;
  });
}

function findHeaderRow(rows) {
  // Hebrew and English headers
  const possibleHeaders = [
    // Hebrew
    'פריטים', 'פריט', 'שם', 'מוצר', 'נמכר', 'מכירה', 'מכירות', 'הוכן', 'כולל', 'ברקוד', 'מק"ט', 'קוד',
    // English
    'product', 'title', 'name', 'item', 'sold', 'sales', 'quantity', 'ordered', 'total', 'sku', 'barcode', 'net'
  ];
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const rowText = row.map(cell => (cell || '').toString().toLowerCase()).join(' ');
    
    const matches = possibleHeaders.filter(header => 
      rowText.includes(header.toLowerCase())
    );
    
    if (matches.length >= 2) {
      console.log(`Found header row at index ${i}:`, row);
      return i;
    }
  }
  
  console.log('No header row found, using row 0');
  return 0;
}

function normalizeProductName(name) {
  if (!name) return '';
  return name.toString().trim().replace(/\s+/g, ' ');
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  
  const str = value.toString().trim().replace(/,/g, '').replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  
  return isNaN(num) ? 0 : num;
}

function extractZReportData(rows, headerRowIndex) {
  const headers = rows[headerRowIndex].map(h => (h || '').toString().trim());
  
  console.log('Headers found:', headers);
  console.log('Headers length:', headers.length);
  
  let productNameIndex = -1;
  let soldQtyIndex = -1;
  let revenueIndex = -1;
  let barcodeIndex = -1;
  let orderedQtyIndex = -1;
  
  headers.forEach((h, index) => {
    const normalized = h.toLowerCase();
    const normalizedTrimmed = normalized.trim();
    
    // Barcode / SKU column - MUST check first to not confuse with product name
    if (normalized.includes('ברקוד') || normalized.includes('קוד פריט') || normalizedTrimmed === 'קוד פריט' ||
        normalizedTrimmed === 'קוד' || normalized.includes('מק"ט') || 
        normalized.includes('sku') || normalized.includes('barcode')) {
      barcodeIndex = index;
      console.log(`✅ Found barcode column at index ${index}: "${h}"`);
    }
    
    // Product name column - תאור פריט has highest priority
    if (normalized.includes('תאור פריט') || normalized.includes('תיאור פריט')) {
      productNameIndex = index;
      console.log(`✅✅ Found EXACT product description column at index ${index}: "${h}"`);
    } else if (productNameIndex === -1 && (normalized.includes('תאור') || normalized.includes('תיאור')) && !normalized.includes('קוד')) {
      productNameIndex = index;
      console.log(`✅ Found product description column at index ${index}: "${h}"`);
    } else if (productNameIndex === -1 && 
               ((normalized.includes('שם') && !normalized.includes('קוד')) ||
                normalizedTrimmed === 'פריט' || normalizedTrimmed === 'מוצר' ||
                normalized.includes('product') || normalized.includes('title') || 
                normalized.includes('description'))) {
      productNameIndex = index;
      console.log(`✅ Found product name column at index ${index}: "${h}"`);
    }
    
    // Sold quantity - מכר (WITHOUT נו"ן) has highest priority, then נמכר
    if (normalizedTrimmed === 'מכר' || normalized === 'מכר') {
      soldQtyIndex = index;
      console.log(`✅✅ Found EXACT "מכר" quantity column at index ${index}: "${h}"`);
    } else if (soldQtyIndex === -1 && (normalizedTrimmed === 'נמכר' || 
               (normalized.includes('נמכר') && !normalized.includes('מכיר')))) {
      soldQtyIndex = index;
      console.log(`✅ Found "נמכר" quantity column at index ${index}: "${h}"`);
    } else if (soldQtyIndex === -1 && (normalized.includes('net items sold') || normalizedTrimmed === 'sold' ||
               normalized.includes('quantity sold'))) {
      soldQtyIndex = index;
      console.log(`✅ Found English quantity column at index ${index}: "${h}"`);
    }
    
    // Quantity ordered - for reports with "quantity ordered" column
    if (normalized.includes('quantity ordered') || normalized.includes('כמות שהוזמנה')) {
      orderedQtyIndex = index;
    }
    
    // Revenue column - פידיון בש"ח or רווח has highest priority (NOT כולל מע"מ!)
    if ((normalized.includes('פידיון') || normalized.includes('פדיון')) && 
        normalized.includes('בש') && !normalized.includes('כולל')) {
      revenueIndex = index;
      console.log(`✅✅ Found EXACT "פידיון בש״ח" revenue column at index ${index}: "${h}"`);
    } else if (revenueIndex === -1 && normalized.includes('רווח') && 
               (normalized.includes('ממלאכה') || normalized.includes('בש'))) {
      revenueIndex = index;
      console.log(`✅✅ Found "רווח" revenue column at index ${index}: "${h}"`);
    } else if (revenueIndex === -1 && normalized.includes('מכירות') && !normalized.includes('ללא')) {
      revenueIndex = index;
      console.log(`✅ Found sales revenue column at index ${index}: "${h}"`);
    } else if (revenueIndex === -1 && 
               (normalized.includes('total sales') || 
                (normalizedTrimmed === 'total' && headers.some(h2 => h2.toLowerCase().includes('sales'))))) {
      revenueIndex = index;
      console.log(`✅ Found English revenue column at index ${index}: "${h}"`);
    }
  });
  
  // If product name not found but barcode is found, use the column AFTER barcode
  if (productNameIndex === -1) {
    if (barcodeIndex !== -1 && headers.length > barcodeIndex + 1) {
      productNameIndex = barcodeIndex + 1;
      console.log(`⚠️ Using column after barcode as product name: ${productNameIndex}`);
    } else {
      productNameIndex = 0;
      console.log(`⚠️ Defaulting to first column for product name`);
    }
  }
  
  // For Z reports with structure: פריטים | הוכן | הוחזר | נמכר | מכירות פריטים כולל מע"מ
  // soldQty should be column D (index 3) - "נמכר"
  // revenue should be column E (index 4) - "מכירות פריטים כולל מע"מ"
  
  // For English reports like "Product title | Net items sold | Quantity ordered | Total sales"
  // soldQty = Net items sold (index 1), revenue = Total sales (index 3)
  
  if (soldQtyIndex === -1) {
    // Look for column with just "נמכר" header
    headers.forEach((h, index) => {
      if (h.trim() === 'נמכר') {
        soldQtyIndex = index;
      }
    });
    
    // If still not found, try column index 3 (D) for typical Z report structure
    if (soldQtyIndex === -1 && headers.length >= 4) {
      soldQtyIndex = 3;
    } else if (soldQtyIndex === -1) {
      soldQtyIndex = Math.min(1, headers.length - 1);
    }
  }
  
  if (revenueIndex === -1) {
    // Try the last column for revenue
    if (headers.length >= 4) {
      revenueIndex = headers.length - 1;
    } else {
      revenueIndex = headers.length - 1;
    }
  }
  
  console.log(`📊 Column indices detected:`);
  console.log(`   - Barcode: ${barcodeIndex} ${barcodeIndex !== -1 ? `("${headers[barcodeIndex]}")` : '(not found)'}`);
  console.log(`   - Product Name: ${productNameIndex} ${productNameIndex !== -1 ? `("${headers[productNameIndex]}")` : '(not found)'}`);
  console.log(`   - Quantity Sold: ${soldQtyIndex} ${soldQtyIndex !== -1 ? `("${headers[soldQtyIndex]}")` : '(not found)'}`);
  console.log(`   - Revenue: ${revenueIndex} ${revenueIndex !== -1 ? `("${headers[revenueIndex]}")` : '(not found)'}`);
  console.log(`   - Ordered Qty: ${orderedQtyIndex} ${orderedQtyIndex !== -1 ? `("${headers[orderedQtyIndex]}")` : '(not found)'}`);
  console.log(`\n📋 All headers:`, headers);
  
  const products = [];
  
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    
    if (!row || row.length === 0) continue;
    
    console.log(`Row ${i} length: ${row.length}, content:`, row);
    
    const productName = normalizeProductName(row[productNameIndex]);
    const barcode = barcodeIndex !== -1 ? (row[barcodeIndex] || '').toString().trim() : '';
    
    if (!productName || productName.length < 2) {
      console.log(`Skipping row ${i} - invalid product name:`, productName);
      continue;
    }
    
    const quantitySold = parseNumber(row[soldQtyIndex]);
    const revenue = parseNumber(row[revenueIndex]);
    
    console.log(`Row ${i}: Product="${productName}" | Barcode="${barcode}" | Qty=${quantitySold} (from col ${soldQtyIndex}) | Revenue=${revenue} (from col ${revenueIndex})`);
    
    if (quantitySold > 0 || revenue > 0) {
      products.push({
        product_name: productName,
        barcode: barcode,
        quantity_sold: quantitySold,
        revenue_with_vat: revenue,
        revenue_without_vat: revenue / 1.17
      });
    } else {
      console.log(`Skipping row ${i} - both qty and revenue are 0`);
    }
  }
  
  console.log(`Total products extracted: ${products.length}`);
  
  return products;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  if (!await base44.auth.isAuthenticated()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { fileUrl, fileName } = await req.json();
    
    if (!fileUrl) {
      throw new Error('File URL is required');
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    let rows = [];
    const fileExtension = (fileName || fileUrl).toLowerCase();

    if (fileExtension.includes('.csv')) {
      const text = await response.text();
      rows = parseCSV(text);
    } else if (fileExtension.includes('.xls') || fileExtension.includes('.xlsx')) {
      const buffer = await response.arrayBuffer();
      
      // Try multiple parsing options
      let workbook;
      try {
        workbook = xlsx.read(buffer, { 
          type: 'buffer', 
          cellStyles: false, 
          cellNF: false, 
          cellDates: false,
          sheetRows: 0, // Read all rows
          dense: false
        });
      } catch (e) {
        console.log('First parse attempt failed, trying array type:', e.message);
        workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });
      }
      
      console.log('Workbook sheets:', workbook.SheetNames);
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get sheet range to understand actual data extent
      const range = worksheet['!ref'];
      console.log('Sheet range:', range);
      
      // Log all cell keys to see what's actually in the sheet
      const cellKeys = Object.keys(worksheet).filter(k => !k.startsWith('!'));
      console.log('Total cells in sheet:', cellKeys.length);
      console.log('First 20 cell keys:', cellKeys.slice(0, 20));
      
      // If range is very limited but we have more cells, fix the range
      if (cellKeys.length > 10) {
        // Find max row and column
        let maxRow = 0;
        let maxCol = 'A';
        cellKeys.forEach(key => {
          const match = key.match(/([A-Z]+)(\d+)/);
          if (match) {
            const col = match[1];
            const row = parseInt(match[2]);
            if (row > maxRow) maxRow = row;
            if (col > maxCol) maxCol = col;
          }
        });
        console.log('Max row found from cells:', maxRow);
        console.log('Max col found from cells:', maxCol);
        
        // Override the range if it seems incorrect
        if (maxRow > 1) {
          worksheet['!ref'] = `A1:${maxCol}${maxRow}`;
          console.log('Fixed sheet range to:', worksheet['!ref']);
        }
      }
      
      // Use raw option to get all data
      rows = xlsx.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '', 
        raw: true,
        blankrows: false
      });
      
      console.log('Raw rows count from xlsx:', rows.length);
      console.log('First 5 raw rows:', JSON.stringify(rows.slice(0, 5)));
      
      // Filter out completely empty rows
      rows = rows.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
    } else {
      throw new Error('Unsupported file format. Please upload CSV or Excel file.');
    }

    if (!rows || rows.length === 0) {
      throw new Error('File is empty or could not be read');
    }

    console.log('Total rows in data:', rows.length);
    console.log('First 3 rows:', rows.slice(0, 3));
    
    const headerRowIndex = findHeaderRow(rows);
    const products = extractZReportData(rows, headerRowIndex);

    if (products.length === 0) {
      throw new Error('No products found in Z report');
    }

    const totalRevenue = products.reduce((sum, p) => sum + p.revenue_with_vat, 0);
    const totalQuantity = products.reduce((sum, p) => sum + p.quantity_sold, 0);

    return Response.json({
      success: true,
      data: {
        products,
        summary: {
          total_products: products.length,
          total_quantity_sold: totalQuantity,
          total_revenue_with_vat: totalRevenue,
          total_revenue_without_vat: totalRevenue / 1.17
        }
      }
    });

  } catch (error) {
    console.error('Error parsing Z report:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});