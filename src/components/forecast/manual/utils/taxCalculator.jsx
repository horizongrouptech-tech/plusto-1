/**
 * חישוב מס לפי מדרגות לעוסק מורשה (עדכני לשנת 2025)
 * @param {number} profit - הרווח לפני מס
 * @returns {number} - סכום המס
 */
export const calculateTaxByBrackets = (profit) => {
  if (profit <= 0) return 0;
  
  // מדרגות מס לעוסק מורשה (עדכני לשנת 2024)
  const brackets = [
    { min: 0, max: 77400, rate: 10 },
    { min: 77401, max: 110880, rate: 14 },
    { min: 110881, max: 178080, rate: 20 },
    { min: 178081, max: 247440, rate: 31 },
    { min: 247441, max: 514920, rate: 35 },
    { min: 514921, max: 663240, rate: 47 },
    { min: 663241, max: Infinity, rate: 50 }
  ];
  
  let totalTax = 0;
  let remaining = profit;
  
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    
    // חישוב הסכום במדרגה זו
    const bracketSize = bracket.max === Infinity ? Infinity : (bracket.max - bracket.min + 1);
    const taxableInBracket = Math.min(remaining, bracketSize);
    
    totalTax += taxableInBracket * (bracket.rate / 100);
    remaining -= taxableInBracket;
    
    if (bracket.max === Infinity) break; // הגענו למדרגה האחרונה
  }
  
  return Math.round(totalTax);
};

/**
 * חישוב מס לפי סוג החברה
 * @param {number} profit - הרווח לפני מס
 * @param {string} companyType - 'company' או 'sole_proprietor'
 * @param {number} taxRate - אחוז מס לחברה בע״מ (ברירת מחדל 23)
 * @returns {number} - סכום המס
 */
export const calculateTax = (profit, companyType = 'company', taxRate = 23) => {
  if (profit <= 0) return 0;
  
  if (companyType === 'sole_proprietor') {
    // חישוב לפי מדרגות לעוסק מורשה
    return calculateTaxByBrackets(profit);
  } else {
    // חישוב אחיד לחברה בע״מ
    return Math.round(profit * (taxRate / 100));
  }
};