/**
 * פונקציה לניקוי ועיצוב אחוזי רווחיות
 * מטפלת במקרים שבהם ה-AI מחזיר ערכים שגויים (755% במקום 75.5%)
 * 
 * @param {number} value - ערך הרווחיות (יכול להיות עשרוני 0.755 או אחוז 75.5 או שגוי 755)
 * @returns {string} - ערך מעוצב כאחוז (75.5%)
 */
export const formatMarginPercentage = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0';
  }
  
  // אם הערך כבר באחוזים (גדול מ-1), לא צריך להכפיל
  // אם הערך כעשרוני (קטן או שווה ל-1), צריך להכפיל ב-100
  let percentageValue;
  
  if (Math.abs(value) > 1) {
    // כבר באחוזים - אבל יכול להיות שגוי (755 במקום 75.5)
    // אם זה גדול מ-100, כנראה זה שגוי - נחלק ב-10
    if (Math.abs(value) > 100) {
      percentageValue = value / 10;
    } else {
      percentageValue = value;
    }
  } else {
    // ערך עשרוני - צריך להכפיל ב-100
    percentageValue = value * 100;
  }
  
  // וולידציה - לא יותר מ-100% ולא פחות מ-100%-
  const finalValue = Math.min(100, Math.max(-100, percentageValue));
  
  return finalValue.toFixed(1);
};
