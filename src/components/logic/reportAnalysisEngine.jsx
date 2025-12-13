/**
 * Universal Business Report Analysis Engine
 * This file contains the core logic for validating, analyzing, and enriching
 * data extracted from various business reports, as per the system prompt.
 */

// Helper to safely parse numbers
const safeParseFloat = (value) => {
  if (value === null || value === undefined || typeof value === 'boolean') return 0;
  const strValue = String(value).replace(/[₪,]/g, '').trim();
  if (strValue === '' || strValue === '-') return 0;
  const num = parseFloat(strValue);
  return isNaN(num) ? 0 : num;
};

// Helper to safely parse dates
const safeParseDate = (value) => {
  if (!value || value === '-') return null;
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Main analysis orchestrator function.
 * @param {Array} rows - The raw data rows from the file.
 * @param {Array} headers - The original headers.
 * @param {String} reportType - The detected report type (e.g., 'inventory_report').
 * @returns {Object} - An object containing { summary, flags, breakdown, validatedRows }.
 */
export const analyzeAndEnrichReportData = (rows, headers, reportType) => {
  switch (reportType) {
    case 'inventory_report':
      return analyzeInventoryReport(rows);
    case 'sales_report':
      return analyzeSalesReport(rows);
    case 'profit_loss':
    case 'balance_sheet':
      return analyzeProfitLossReport(rows, reportType);
    case 'bank_statement':
      return analyzeBankStatement(rows);
    case 'credit_card_report':
      return analyzeCreditCardStatement(rows);
    case 'promotions_report':
      return analyzePromotionsReport(rows);
    default:
      return analyzeGenericReport(rows);
  }
};

/**
 * Analyzes an Inventory Report.
 */
function analyzeInventoryReport(rows) {
  const flags = [];
  const validatedRows = [];
  const supplierCount = {};
  const categoryCount = {};
  const supplierValue = {};
  const categoryValue = {};
  let totalItems = 0;
  let totalQuantity = 0;
  let totalInventoryValue = 0;
  let totalInventoryValueNoVat = 0;
  const seenCodes = new Set();
  let highValueItems = 0;
  let zeroQuantityItems = 0;

  for (const row of rows) {
    // Apply default values for missing data
    const itemCode = row['קוד פריט'] || row['barcode'] || row['product_code'] || 'לא מוגדר';
    const description = row['תאור'] || row['description'] || row['product_name'] || 'ללא תיאור';
    const supplier = row['ספק'] || row['supplier'] || 'לא ידוע';
    const primaryCategory = row['קטגוריה ראשית'] || row['category'] || row['main_category'] || 'כללי';
    const secondaryCategory = row['קטגוריה משנית'] || row['sub_category'] || 'לא מוגדר';
    
    const costPrice = safeParseFloat(row['מחיר עלות'] || row['cost_price'] || row['cost']);
    const sellingPrice = safeParseFloat(row['מחיר לצרכן'] || row['selling_price'] || row['consumer_price']);
    const quantity = Math.round(safeParseFloat(row['כמות פריטים'] || row['quantity'] || row['stock']));
    
    // Calculate inventory values
    const inventoryValue = sellingPrice * quantity;
    const inventoryValueNoVat = inventoryValue / 1.17;
    
    // Validation & Flagging - following the exact specifications
    if (costPrice > sellingPrice && costPrice > 0 && sellingPrice > 0) {
      flags.push(`⚠️ מחיר עלות גבוה ממחיר מכירה: "${description}" - עלות: ₪${costPrice}, מכירה: ₪${sellingPrice}`);
    }
    if (quantity < 0) {
      flags.push(`⚠️ כמות שלילית: "${description}" - כמות: ${quantity}`);
    }
    if (quantity === 0) {
      flags.push(`ℹ️ מוצר אזל מהמלאי: "${description}"`);
      zeroQuantityItems++;
    }
    if (seenCodes.has(itemCode) && itemCode !== 'לא מוגדר') {
      flags.push(`🔄 כפילות: קוד פריט "${itemCode}" מופיע יותר מפעם אחת`);
    } else {
      seenCodes.add(itemCode);
    }
    if (costPrice === 0 || sellingPrice === 0) {
      flags.push(`⚠️ חסר מחיר: "${description}" - ${costPrice === 0 ? 'מחיר עלות' : 'מחיר מכירה'} לא מוגדר`);
    }
    if (itemCode === 'לא מוגדר') {
      flags.push(`⚠️ חסר קוד פריט: "${description}"`);
    }
    if (inventoryValue > 10000) {
      highValueItems++;
    }

    // Update totals and breakdowns
    totalItems++;
    totalQuantity += quantity;
    totalInventoryValue += inventoryValue;
    totalInventoryValueNoVat += inventoryValueNoVat;

    supplierCount[supplier] = (supplierCount[supplier] || 0) + 1;
    categoryCount[primaryCategory] = (categoryCount[primaryCategory] || 0) + 1;
    supplierValue[supplier] = (supplierValue[supplier] || 0) + inventoryValue;
    categoryValue[primaryCategory] = (categoryValue[primaryCategory] || 0) + inventoryValue;

    // Add enriched row
    validatedRows.push({
      ...row,
      'קוד פריט': itemCode,
      'תאור': description,
      'ספק': supplier,
      'קטגוריה ראשית': primaryCategory,
      'קטגוריה משנית': secondaryCategory,
      'מחיר עלות': costPrice,
      'מחיר לצרכן': sellingPrice,
      'כמות פריטים': quantity,
      'ערך מלאי': inventoryValue,
      'ערך מלאי ללא מע"מ': inventoryValueNoVat
    });
  }

  // Summary with all required fields
  const summary = {
    'סה"כ פריטים ייחודיים': totalItems,
    'סה"כ יחידות במלאי': totalQuantity,
    'שווי מלאי כולל (לפי מחיר צרכן)': `₪${totalInventoryValue.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'שווי מלאי ללא מע"מ': `₪${totalInventoryValueNoVat.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'תאריך דוח': new Date().toLocaleDateString('he-IL'),
    'פריטים בעלי ערך גבוה (מעל ₪10,000)': highValueItems,
    'פריטים שאזלו מהמלאי': zeroQuantityItems
  };

  const breakdown = {
    'לפי ספק (כמות)': supplierCount,
    'לפי קטגוריה (כמות)': categoryCount,
    'לפי ספק (ערך)': Object.fromEntries(
      Object.entries(supplierValue).map(([k, v]) => [k, `₪${v.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`])
    ),
    'לפי קטגוריה (ערך)': Object.fromEntries(
      Object.entries(categoryValue).map(([k, v]) => [k, `₪${v.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`])
    )
  };

  return { summary, flags, breakdown, validatedRows };
}

/**
 * Analyzes a Sales Report.
 */
function analyzeSalesReport(rows) {
  const flags = [];
  const validatedRows = [];
  let totalSales = 0;
  let totalCost = 0;
  const categorySales = {};
  const supplierSales = {};
  const topPerformers = [];
  const lowPerformers = [];

  for (const row of rows) {
    // Apply default values
    const itemCode = row['קוד פריט'] || row['product_code'] || 'לא מוגדר';
    const description = row['תאור'] || row['description'] || 'ללא תיאור';
    const category = row['קטגוריה'] || row['category'] || 'כללי';
    const supplier = row['ספק'] || row['supplier'] || 'לא ידוע';
    
    const costPrice = safeParseFloat(row['מחיר עלות'] || row['cost_price']);
    const sellingPrice = safeParseFloat(row['מחיר לצרכן'] || row['selling_price']);
    const quantitySold = safeParseFloat(row['כמות נמכרה'] || row['quantity_sold']);
    const revenue = safeParseFloat(row['פדיון'] || row['revenue']) || (sellingPrice * quantitySold);
    
    const cost = costPrice * quantitySold;
    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Validation & Flagging
    if (profitMargin < 10 && profitMargin > 0 && revenue > 100) {
      flags.push(`📉 רווחיות נמוכה: "${description}" - ${profitMargin.toFixed(1)}% רווח`);
      lowPerformers.push({ description, profitMargin, revenue });
    }
    if (profit < 0) {
      flags.push(`💸 הפסד: "${description}" נמכר בהפסד של ₪${Math.abs(profit).toFixed(2)}`);
    }
    if (revenue > 5000) {
      topPerformers.push({ description, revenue, profitMargin });
    }
    if (quantitySold === 0 && revenue > 0) {
      flags.push(`🔍 חריגה: "${description}" עם פדיון ללא כמות נמכרה`);
    }

    totalSales += revenue;
    totalCost += cost;
    categorySales[category] = (categorySales[category] || 0) + revenue;
    supplierSales[supplier] = (supplierSales[supplier] || 0) + revenue;

    validatedRows.push({
      ...row,
      'קוד פריט': itemCode,
      'תאור': description,
      'קטגוריה': category,
      'ספק': supplier,
      'מחיר עלות': costPrice,
      'מחיר לצרכן': sellingPrice,
      'כמות נמכרה': quantitySold,
      'פדיון': revenue,
      'רווח גולמי': profit,
      'אחוז רווח': profitMargin
    });
  }

  const grossProfit = totalSales - totalCost;
  const overallMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  // ABC Analysis (Enhanced)
  validatedRows.sort((a, b) => b['פדיון'] - a['פדיון']);
  const eightyPercentCutoff = totalSales * 0.8;
  const ninetyFivePercentCutoff = totalSales * 0.95;
  let cumulativeSales = 0;
  
  for (const row of validatedRows) {
    cumulativeSales += row['פדיון'];
    if (cumulativeSales <= eightyPercentCutoff) {
      row.abc_category = 'A';
    } else if (cumulativeSales <= ninetyFivePercentCutoff) {
      row.abc_category = 'B';
    } else {
      row.abc_category = 'C';
    }
  }
  
  const abcBreakdown = {
    'A': validatedRows.filter(r => r.abc_category === 'A').length,
    'B': validatedRows.filter(r => r.abc_category === 'B').length,
    'C': validatedRows.filter(r => r.abc_category === 'C').length
  };

  // Flag top and low performers
  if (topPerformers.length > 0) {
    const topItem = topPerformers.sort((a, b) => b.revenue - a.revenue)[0];
    flags.push(`🏆 מוצר מוביל: "${topItem.description}" עם פדיון של ₪${topItem.revenue.toLocaleString()}`);
  }

  const summary = {
    'סה"כ מכירות (פדיון)': `₪${totalSales.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'סה"כ עלות המכר': `₪${totalCost.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'רווח גולמי': `₪${grossProfit.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'שולי רווח גולמי': `${overallMargin.toFixed(2)}%`,
    'מכירה ממוצעת לפריט': `₪${(totalSales / validatedRows.length).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'מוצרים מובילים (מעל ₪5,000)': topPerformers.length,
    'מוצרים בעלי רווחיות נמוכה': lowPerformers.length
  };

  const breakdown = {
    'מכירות לפי קטגוריה': Object.fromEntries(
      Object.entries(categorySales).map(([k, v]) => [k, `₪${v.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`])
    ),
    'מכירות לפי ספק': Object.fromEntries(
      Object.entries(supplierSales).map(([k, v]) => [k, `₪${v.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`])
    ),
    'ניתוח ABC': abcBreakdown
  };

  return { summary, flags, breakdown, validatedRows };
}

/**
 * Analyzes Profit & Loss / Balance Sheet Reports.
 */
function analyzeProfitLossReport(rows, reportType) {
  const flags = [];
  const validatedRows = [];
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryBreakdown = {
    'הכנסות': {},
    'הוצאות קבועות': {},
    'הוצאות משתנות': {},
    'הוצאות שכר': {},
    'הוצאות תחזוקה': {},
    'עמלות ודמי ניהול': {}
  };

  for (const row of rows) {
    const accountSort = row['מיון'] || row['sort_code'] || '';
    const accountCode = row['חשבון'] || row['account_code'] || 'לא מוגדר';
    const accountName = row['שם חשבון'] || row['account_name'] || 'ללא שם';
    const debit = safeParseFloat(row['חובה'] || row['debit']);
    const credit = safeParseFloat(row['זכות'] || row['credit']);
    
    // Categorize accounts based on account codes/names
    let category = 'אחרות';
    if (accountName.includes('הכנסות') || accountName.includes('מכירות') || accountCode.startsWith('4')) {
      category = 'הכנסות';
      totalIncome += credit;
    } else if (accountName.includes('שכר') || accountName.includes('משכורת')) {
      category = 'הוצאות שכר';
      totalExpenses += debit;
    } else if (accountName.includes('שכירות') || accountName.includes('ביטוח') || accountName.includes('חשמל')) {
      category = 'הוצאות קבועות';
      totalExpenses += debit;
    } else if (accountName.includes('עמלה') || accountName.includes('דמי')) {
      category = 'עמלות ודמי ניהול';
      totalExpenses += debit;
    } else if (debit > 0) {
      category = 'הוצאות משתנות';
      totalExpenses += debit;
    }

    // Validation & Flagging
    if (debit < 0) {
      flags.push(`⚠️ יתרת חובה שלילית: חשבון "${accountName}" - ₪${debit}`);
    }
    if (credit < 0) {
      flags.push(`⚠️ יתרת זכות שלילית: חשבון "${accountName}" - ₪${credit}`);
    }
    if (accountName === 'ללא שם') {
      flags.push(`⚠️ חשבון ללא תיאור: קוד ${accountCode}`);
    }

    categoryBreakdown[category] = categoryBreakdown[category] || {};
    categoryBreakdown[category][accountName] = debit + credit;

    validatedRows.push({
      ...row,
      'מיון': accountSort,
      'חשבון': accountCode,
      'שם חשבון': accountName,
      'חובה': debit,
      'זכות': credit,
      'קטגוריה': category
    });
  }

  const grossProfit = totalIncome - totalExpenses;
  const netProfit = grossProfit; // Simplified for this example
  
  // Check for balance issues
  const totalDebits = validatedRows.reduce((sum, row) => sum + row['חובה'], 0);
  const totalCredits = validatedRows.reduce((sum, row) => sum + row['זכות'], 0);
  const balanceDifference = Math.abs(totalDebits - totalCredits);
  
  if (balanceDifference > 1) {
    flags.push(`⚠️ חוסר איזון: הפרש של ₪${balanceDifference.toFixed(2)} בין חובות לזכויות`);
  }

  const summary = {
    'סה"כ הכנסות': `₪${totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'סה"כ הוצאות': `₪${totalExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'רווח גולמי': `₪${grossProfit.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'רווח נקי': `₪${netProfit.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'יחס הוצאות להכנסות': totalIncome > 0 ? `${((totalExpenses / totalIncome) * 100).toFixed(1)}%` : 'לא זמין',
    'סה"כ חובות': `₪${totalDebits.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'סה"כ זכויות': `₪${totalCredits.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
  };

  const breakdown = {
    'לפי קטגוריה': Object.fromEntries(
      Object.entries(categoryBreakdown).filter(([_, accounts]) => Object.keys(accounts).length > 0)
        .map(([category, accounts]) => [
          category, 
          Object.values(accounts).reduce((sum, val) => sum + val, 0).toLocaleString('he-IL', { minimumFractionDigits: 2 })
        ])
    )
  };

  return { summary, flags, breakdown, validatedRows };
}

/**
 * Analyzes Bank Statement.
 */
function analyzeBankStatement(rows) {
  const flags = [];
  const validatedRows = [];
  let totalCredits = 0;
  let totalDebits = 0;
  let creditCount = 0;
  let debitCount = 0;
  const categoryBreakdown = {};
  const supplierBreakdown = {};
  let openingBalance = 0;
  let closingBalance = 0;
  const dates = [];

  for (const row of rows) {
    const date = safeParseDate(row['תאריך'] || row['date']);
    const description = row['תיאור'] || row['description'] || 'ללא תיאור';
    const reference = row['אסמכתא'] || row['reference'] || '';
    const category = row['קטגוריה'] || row['category'] || 'כללי';
    const credit = safeParseFloat(row['זכות'] || row['credit']);
    const debit = safeParseFloat(row['חובה'] || row['debit']);
    const balance = safeParseFloat(row['יתרה'] || row['balance']);

    if (date) dates.push(date);
    
    // Track totals
    if (credit > 0) {
      totalCredits += credit;
      creditCount++;
    }
    if (debit > 0) {
      totalDebits += debit;
      debitCount++;
    }

    // Flagging
    if (balance < 0) {
      flags.push(`💳 משיכת יתר: ביום ${date ? date.toLocaleDateString('he-IL') : 'לא ידוע'} - יתרה: ₪${balance}`);
    }
    if (debit > 5000) {
      flags.push(`💸 הוצאה גבוהה: ₪${debit.toLocaleString()} - ${description}`);
    }
    if (description.includes('עמלה') || description.includes('דמי')) {
      flags.push(`💰 עמלה זוהתה: ₪${debit} - ${description}`);
    }

    // Breakdowns
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + (credit + debit);
    
    // Try to identify suppliers from description
    const supplier = extractSupplierFromDescription(description);
    if (supplier !== 'לא זוהה') {
      supplierBreakdown[supplier] = (supplierBreakdown[supplier] || 0) + debit;
    }

    if (validatedRows.length === 0) openingBalance = balance + debit - credit;
    closingBalance = balance;

    validatedRows.push({
      ...row,
      'תאריך': date ? date.toLocaleDateString('he-IL') : 'לא ידוע',
      'תיאור': description,
      'אסמכתא': reference,
      'קטגוריה': category,
      'זכות': credit,
      'חובה': debit,
      'יתרה': balance
    });
  }

  const netCashFlow = totalCredits - totalDebits;
  const startDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const endDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

  const summary = {
    'מספר חשבון': 'לא זוהה', // Would need to be extracted from file metadata
    'תקופת דוח': startDate && endDate ? 
      `${startDate.toLocaleDateString('he-IL')} - ${endDate.toLocaleDateString('he-IL')}` : 'לא זוהתה',
    'יתרת פתיחה': `₪${openingBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'יתרת סגירה': `₪${closingBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'סה"כ זכויות': `₪${totalCredits.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'סה"כ חובות': `₪${totalDebits.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'תזרים מזומנים נטו': `₪${netCashFlow.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'תאריך ראשון': startDate ? startDate.toLocaleDateString('he-IL') : 'לא זוהה',
    'תאריך אחרון': endDate ? endDate.toLocaleDateString('he-IL') : 'לא זוהה',
    'מספר תנועות זכות': creditCount,
    'מספר תנועות חובה': debitCount
  };

  const breakdown = {
    'לפי קטגוריה': Object.fromEntries(
      Object.entries(categoryBreakdown).map(([k, v]) => [k, `₪${v.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`])
    ),
    'לפי ספק': Object.fromEntries(
      Object.entries(supplierBreakdown).map(([k, v]) => [k, `₪${v.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`])
    )
  };

  return { summary, flags, breakdown, validatedRows };
}

/**
 * Analyzes Credit Card Statement.
 */
function analyzeCreditCardStatement(rows) {
  const flags = [];
  const validatedRows = [];
  let totalCharges = 0;
  let transactionCount = 0;
  const categoryBreakdown = {};
  const supplierBreakdown = {};
  let maxTransaction = 0;
  let refundCount = 0;
  const splitPayments = [];

  for (const row of rows) {
    const transactionDate = safeParseDate(row['תאריך עסקה'] || row['transaction_date']);
    const description = row['תיאור'] || row['description'] || 'ללא תיאור';
    const category = row['קטגוריה'] || row['category'] || 'כללי';
    const transactionAmount = safeParseFloat(row['סכום עסקה'] || row['transaction_amount']);
    const chargeAmount = safeParseFloat(row['סכום לחיוב'] || row['charge_amount']);

    // Flagging
    if (chargeAmount < 0) {
      flags.push(`💸 זיכוי/החזר: ₪${Math.abs(chargeAmount)} - ${description}`);
      refundCount++;
    }
    if (chargeAmount > 2000) {
      flags.push(`💳 עסקה גבוהה: ₪${chargeAmount.toLocaleString()} - ${description}`);
    }
    if (transactionAmount !== chargeAmount && Math.abs(transactionAmount - chargeAmount) > 1) {
      flags.push(`📊 תשלום מפוצל: ${description} - עסקה: ₪${transactionAmount}, חיוב: ₪${chargeAmount}`);
      splitPayments.push({ description, transactionAmount, chargeAmount });
    }

    totalCharges += chargeAmount;
    transactionCount++;
    maxTransaction = Math.max(maxTransaction, chargeAmount);

    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + chargeAmount;
    
    const supplier = extractSupplierFromDescription(description);
    if (supplier !== 'לא זוהה') {
      supplierBreakdown[supplier] = (supplierBreakdown[supplier] || 0) + chargeAmount;
    }

    validatedRows.push({
      ...row,
      'תאריך עסקה': transactionDate ? transactionDate.toLocaleDateString('he-IL') : 'לא ידוע',
      'תיאור': description,
      'קטגוריה': category,
      'סכום עסקה': transactionAmount,
      'סכום לחיוב': chargeAmount
    });
  }

  const avgTransaction = transactionCount > 0 ? totalCharges / transactionCount : 0;
  
  // Simplified utilization calculation (would need credit limit from file)
  const estimatedLimit = maxTransaction * 10; // Rough estimate
  const utilization = (totalCharges / estimatedLimit) * 100;
  
  if (utilization > 80) {
    flags.push(`⚠️ ניצול גבוה של כרטיס האשראי: ${utilization.toFixed(1)}%`);
  }

  const summary = {
    'פרטי כרטיס': 'לא זוהה', // Would need to be extracted from metadata
    'תקופת דוח': 'לא זוהתה', // Would need date range
    'סה"כ חיובים': `₪${totalCharges.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'ממוצע לעסקה': `₪${avgTransaction.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'עסקה מקסימלית': `₪${maxTransaction.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    'מספר עסקאות': transactionCount,
    'מספר זיכויים/החזרים': refundCount,
    'עסקאות מפוצלות': splitPayments.length,
    'אחוז ניצול משוער': `${utilization.toFixed(1)}%`
  };

  const breakdown = {
    'לפי קטגוריה': Object.fromEntries(
      Object.entries(categoryBreakdown).map(([k, v]) => [k, `₪${v.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`])
    ),
    'לפי ספק': Object.fromEntries(
      Object.entries(supplierBreakdown).map(([k, v]) => [k, `₪${v.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`])
    )
  };

  return { summary, flags, breakdown, validatedRows };
}

/**
 * Analyzes Promotions Report.
 */
function analyzePromotionsReport(rows) {
  const flags = [];
  const validatedRows = [];
  let activePromotions = 0;
  let totalPromotions = 0;
  const storeParticipation = {};
  let avgStoresPerPromo = 0;
  const overlappingPromotions = [];
  const longPromotions = [];
  const shortPromotions = [];

  for (const row of rows) {
    const promoId = row['מזהה'] || row['id'] || row['promo_id'] || `PROMO_${totalPromotions + 1}`;
    const promoName = row['שם מבצע'] || row['promo_name'] || 'ללא שם';
    const description = row['תיאור'] || row['description'] || 'ללא תיאור';
    const definingStore = row['חנות מגדירה'] || row['defining_store'] || 'לא מוגדר';
    const participatingStores = safeParseFloat(row['מספר חנויות משתתפות'] || row['participating_stores']);
    const startDate = safeParseDate(row['תאריך תחילה'] || row['start_date']);
    const endDate = safeParseDate(row['תאריך סיום'] || row['end_date']);
    const isActive = row['סטטוס פעיל'] === true || row['active_status'] === 'true' || row['active'] === '1';

    totalPromotions++;
    if (isActive) activePromotions++;

    // Calculate duration
    let duration = 0;
    if (startDate && endDate) {
      duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      if (duration > 30) {
        longPromotions.push({ promoName, duration });
        flags.push(`📅 מבצע ארוך: "${promoName}" - ${duration} ימים`);
      } else if (duration < 3) {
        shortPromotions.push({ promoName, duration });
        flags.push(`⏰ מבצע קצר: "${promoName}" - ${duration} ימים`);
      }
    }

    // Track store participation
    if (participatingStores > 0) {
      avgStoresPerPromo += participatingStores;
      storeParticipation[definingStore] = (storeParticipation[definingStore] || 0) + 1;
    }

    // Check for overlaps (simplified - same dates)
    const potentialOverlap = validatedRows.find(existingRow => 
      existingRow['תאריך תחילה'] === (startDate ? startDate.toLocaleDateString('he-IL') : '') &&
      existingRow['תאריך סיום'] === (endDate ? endDate.toLocaleDateString('he-IL') : '')
    );
    
    if (potentialOverlap) {
      overlappingPromotions.push({ promo1: potentialOverlap['שם מבצע'], promo2: promoName });
      flags.push(`⚠️ חפיפה אפשרית: "${promoName}" ו-"${potentialOverlap['שם מבצע']}"`);
    }

    // Operational load check
    if (participatingStores > 50) {
      flags.push(`🏪 עומס תפעולי: "${promoName}" - ${participatingStores} חנויות משתתפות`);
    }

    validatedRows.push({
      ...row,
      'מזהה': promoId,
      'שם מבצע': promoName,
      'תיאור': description,
      'חנות מגדירה': definingStore,
      'מספר חנויות משתתפות': participatingStores,
      'תאריך תחילה': startDate ? startDate.toLocaleDateString('he-IL') : 'לא מוגדר',
      'תאריך סיום': endDate ? endDate.toLocaleDateString('he-IL') : 'לא מוגדר',
      'סטטוס פעיל': isActive ? 'פעיל' : 'לא פעיל',
      'משך במים': duration > 0 ? `${duration} ימים` : 'לא מחושב'
    });
  }

  avgStoresPerPromo = totalPromotions > 0 ? avgStoresPerPromo / totalPromotions : 0;

  const summary = {
    'סה"כ מבצעים': totalPromotions,
    'מבצעים פעילים': activePromotions,
    'מבצעים לא פעילים': totalPromotions - activePromotions,
    'ממוצע חנויות למבצע': avgStoresPerPromo.toFixed(1),
    'מבצעים ארוכים (מעל 30 יום)': longPromotions.length,
    'מבצעים קצרים (פחות מ-3 ימים)': shortPromotions.length,
    'חפיפות זוהו': overlappingPromotions.length,
    'אחוז מבצעים פעילים': totalPromotions > 0 ? `${((activePromotions / totalPromotions) * 100).toFixed(1)}%` : '0%'
  };

  const breakdown = {
    'לפי חנות מגדירה': storeParticipation,
    'לפי משך': {
      'קצרים (1-2 ימים)': shortPromotions.length,
      'בינוניים (3-30 ימים)': totalPromotions - longPromotions.length - shortPromotions.length,
      'ארוכים (מעל 30 ימים)': longPromotions.length
    },
    'לפי סטטוס': {
      'פעילים': activePromotions,
      'לא פעילים': totalPromotions - activePromotions
    }
  };

  return { summary, flags, breakdown, validatedRows };
}

/**
 * Generic analysis for unknown report types.
 */
function analyzeGenericReport(rows) {
  const flags = [];
  const validatedRows = rows.map(row => ({ ...row }));
  
  // Basic validation
  const emptyRows = rows.filter(row => Object.values(row).every(val => !val || val === '-'));
  if (emptyRows.length > 0) {
    flags.push(`ℹ️ ${emptyRows.length} שורות ריקות נמצאו ונמחקו`);
  }

  const summary = {
    'סה"כ שורות': rows.length,
    'שורות תקינות': rows.length - emptyRows.length,
    'עמודות': Object.keys(rows[0] || {}).length
  };

  return { summary, flags, breakdown: {}, validatedRows: validatedRows.filter(row => 
    !Object.values(row).every(val => !val || val === '-')
  )};
}

/**
 * Helper function to extract supplier name from transaction description.
 */
function extractSupplierFromDescription(description) {
  if (!description) return 'לא זוהה';
  
  // Common supplier patterns in Hebrew banking/credit card statements
  const patterns = [
    /^([א-ת\s]+)\s*-/,  // Text before dash
    /^([א-ת\s]+)\s*\d/,  // Text before numbers
    /^([א-ת\s]{3,})/     // Just Hebrew text (min 3 chars)
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      const supplier = match[1].trim();
      if (supplier.length >= 3) {
        return supplier;
      }
    }
  }
  
  return 'לא זוהה';
}