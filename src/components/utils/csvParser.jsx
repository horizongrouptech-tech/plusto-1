/**
 * Enhanced CSV Parser with Hebrew support and robust error handling
 */

// Common Hebrew column mappings for different report types
const COLUMN_MAPPINGS = {
  inventory_report: {
    'קוד פריט': ['barcode', 'product_code', 'item_code', 'sku', 'מק"ט', 'מקט'],
    'תאור': ['description', 'product_name', 'name', 'תיאור', 'שם מוצר'],
    'ספק': ['supplier', 'vendor', 'ספק'],
    'קטגוריה ראשית': ['category', 'main_category', 'קטגוריה'],
    'קטגוריה משנית': ['sub_category', 'secondary_category'],
    'מחיר עלות': ['cost_price', 'cost', 'purchase_price', 'עלות', 'מחיר קנייה'],
    'מחיר לצרכן': ['selling_price', 'retail_price', 'consumer_price', 'מחיר מכירה', 'מחיר'],
    'כמות פריטים': ['quantity', 'stock', 'inventory', 'כמות', 'מלאי'],
  },
  sales_report: {
    'תאריך': ['date', 'sale_date', 'transaction_date'],
    'קוד פריט': ['barcode', 'product_code', 'item_code', 'sku'],
    'תאור': ['description', 'product_name', 'name'],
    'כמות נמכרה': ['quantity_sold', 'sold_quantity', 'qty_sold', 'כמות'],
    'פדיון': ['revenue', 'sales_amount', 'total_sales', 'סכום'],
    'רווח גולמי': ['gross_profit', 'profit', 'רווח']
  },
  bank_statement: {
    'תאריך': ['date', 'transaction_date', 'תאריך'],
    'תיאור': ['description', 'details', 'memo', 'תיאור'],
    'זכות': ['credit', 'deposit', 'income', 'זכות'],
    'חובה': ['debit', 'withdrawal', 'expense', 'חובה'],
    'יתרה': ['balance', 'running_balance', 'יתרה']
  },
  profit_loss: {
    'תיאור': ['description', 'account_name', 'תיאור'],
    'הכנסות': ['revenue', 'income', 'sales', 'הכנסות'],
    'הוצאות': ['expenses', 'costs', 'הוצאות'],
    'סכום': ['amount', 'value', 'total', 'סכום']
  }
};

/**
 * Detect delimiter in CSV content
 */
function detectDelimiter(content) {
  const delimiters = [',', ';', '\t', '|'];
  const firstLines = content.split('\n').slice(0, 5).join('\n');
  
  let bestDelimiter = ',';
  let maxCount = 0;
  
  for (const delimiter of delimiters) {
    const count = (firstLines.match(new RegExp(delimiter, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

/**
 * Parse a single CSV row, handling quoted fields properly
 */
function parseCSVRow(row, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Normalize column names based on category
 */
function normalizeHeaders(headers, category = 'mixed_business_data') {
  const mappings = COLUMN_MAPPINGS[category] || {};
  const normalized = [];
  
  for (const header of headers) {
    const cleanHeader = header.replace(/['"]/g, '').trim();
    let normalizedHeader = cleanHeader;
    
    // Try to find a mapping
    for (const [standardName, variations] of Object.entries(mappings)) {
      const lowerHeader = cleanHeader.toLowerCase();
      if (variations.some(variation => 
        lowerHeader.includes(variation.toLowerCase()) || 
        variation.toLowerCase().includes(lowerHeader)
      )) {
        normalizedHeader = standardName;
        break;
      }
    }
    
    normalized.push(normalizedHeader);
  }
  
  return normalized;
}

/**
 * Convert string values to appropriate types
 */
function convertValue(value, columnName) {
  if (!value || value.trim() === '') return null;
  
  const cleanValue = value.trim();
  
  // Check if it's a number
  const numericColumns = [
    'מחיר עלות', 'מחיר לצרכן', 'כמות פריטים', 'פדיון', 'רווח גולמי',
    'זכות', 'חובה', 'יתרה', 'הכנסות', 'הוצאות', 'סכום'
  ];
  
  if (numericColumns.includes(columnName)) {
    // Remove currency symbols and commas
    const numericValue = cleanValue
      .replace(/[₪$,]/g, '')
      .replace(/[)(]/g, match => match === '(' ? '-' : '')
      .trim();
    
    const parsed = parseFloat(numericValue);
    return !isNaN(parsed) ? parsed : cleanValue;
  }
  
  // Check if it's a date
  if (columnName === 'תאריך' || columnName.toLowerCase().includes('date')) {
    // Try to parse common date formats
    const datePatterns = [
      /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
      /^\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/
    ];
    
    if (datePatterns.some(pattern => pattern.test(cleanValue))) {
      try {
        const date = new Date(cleanValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
  }
  
  return cleanValue;
}

/**
 * Main CSV parsing function
 */
export function parseCsvData(csvContent, category = 'mixed_business_data') {
  try {
    if (!csvContent || typeof csvContent !== 'string') {
      return {
        success: false,
        data: [],
        metadata: {
          total_rows: 0,
          columns_found: 0,
          original_headers: [],
          normalized_headers: [],
          delimiter_used: ',',
          errors: ['Invalid or empty CSV content']
        }
      };
    }

    // Clean the content
    const cleanContent = csvContent.trim();
    if (!cleanContent) {
      return {
        success: true,
        data: [],
        metadata: {
          total_rows: 0,
          columns_found: 0,
          original_headers: [],
          normalized_headers: [],
          delimiter_used: ',',
          errors: []
        }
      };
    }

    // Detect delimiter
    const delimiter = detectDelimiter(cleanContent);
    
    // Split into lines
    const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return {
        success: true,
        data: [],
        metadata: {
          total_rows: 0,
          columns_found: 0,
          original_headers: [],
          normalized_headers: [],
          delimiter_used: delimiter,
          errors: []
        }
      };
    }

    // Parse headers
    const headerRow = lines[0];
    const originalHeaders = parseCSVRow(headerRow, delimiter);
    const normalizedHeaders = normalizeHeaders(originalHeaders, category);
    
    // Parse data rows
    const dataRows = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = lines[i];
        if (!row.trim()) continue;
        
        const values = parseCSVRow(row, delimiter);
        
        // Skip rows that are mostly empty
        const nonEmptyValues = values.filter(v => v && v.trim() !== '').length;
        if (nonEmptyValues < Math.max(1, normalizedHeaders.length * 0.3)) {
          continue;
        }
        
        // Create row object
        const rowObject = {};
        for (let j = 0; j < normalizedHeaders.length; j++) {
          const headerName = normalizedHeaders[j];
          const rawValue = values[j] || '';
          const convertedValue = convertValue(rawValue, headerName);
          rowObject[headerName] = convertedValue;
        }
        
        dataRows.push(rowObject);
        
      } catch (rowError) {
        console.warn(`Error parsing row ${i + 1}:`, rowError);
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    return {
      success: true,
      data: dataRows,
      metadata: {
        total_rows: dataRows.length,
        columns_found: normalizedHeaders.length,
        original_headers: originalHeaders,
        normalized_headers: normalizedHeaders,
        delimiter_used: delimiter,
        data_quality_score: Math.round((dataRows.length / Math.max(1, lines.length - 1)) * 100),
        errors: errors.slice(0, 10) // Limit to first 10 errors
      }
    };

  } catch (error) {
    console.error('CSV parsing error:', error);
    return {
      success: false,
      data: [],
      metadata: {
        total_rows: 0,
        columns_found: 0,
        original_headers: [],
        normalized_headers: [],
        delimiter_used: ',',
        errors: [`Critical parsing error: ${error.message}`]
      }
    };
  }
}

export default parseCsvData;