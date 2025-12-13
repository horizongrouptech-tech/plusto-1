/**
 * חישוב תשלום חודשי קבוע (PMT) להלוואה
 * @param {number} principal - סכום ההלוואה
 * @param {number} annualRate - ריבית שנתית באחוזים (לדוגמה: 8.5)
 * @param {number} months - מספר חודשי ההחזר
 * @returns {number} תשלום חודשי קבוע
 */
export function calculateMonthlyPayment(principal, annualRate, months) {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return 0;
  
  const monthlyRate = (annualRate / 100) / 12; // המרה לריבית חודשית
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  
  return payment;
}

/**
 * חישוב לוח שפיצר מלא
 * @param {number} principal - סכום ההלוואה
 * @param {number} annualRate - ריבית שנתית באחוזים
 * @param {number} months - מספר חודשי ההחזר
 * @param {number} startPaymentNumber - מספר התשלום הראשון (ברירת מחדל 1)
 * @returns {Array} מערך של תשלומים עם פירוט קרן וריבית
 */
export function calculateAmortizationSchedule(principal, annualRate, months, startPaymentNumber = 1) {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return [];
  
  const monthlyRate = (annualRate / 100) / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, months);
  
  const schedule = [];
  let remainingBalance = principal;
  
  // אם התשלום לא מתחיל מ-1, נחשב את היתרה הנכונה
  if (startPaymentNumber > 1) {
    for (let i = 1; i < startPaymentNumber; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
    }
  }
  
  for (let i = startPaymentNumber; i <= months; i++) {
    const openingBalance = remainingBalance;
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    const closingBalance = remainingBalance - principalPayment;
    
    schedule.push({
      payment_number: i,
      opening_balance: openingBalance,
      interest_payment: interestPayment,
      principal_payment: principalPayment,
      closing_balance: Math.max(0, closingBalance)
    });
    
    remainingBalance = closingBalance;
    
    if (remainingBalance <= 0) break;
  }
  
  return schedule;
}

/**
 * חישוב סך הוצאות ריבית חודשיות מכל ההלוואות
 * @param {Array} loans - מערך ההלוואות
 * @returns {Array} מערך של 12 סכומי ריבית חודשיים
 */
export function calculateTotalMonthlyInterestExpenses(loans) {
  const monthlyInterest = Array(12).fill(0);
  
  if (!loans || loans.length === 0) return monthlyInterest;
  
  loans.forEach(loan => {
    if (!loan.amortization_schedule || loan.amortization_schedule.length === 0) return;
    
    const startOffset = loan.start_month_offset || 0;
    
    loan.amortization_schedule.forEach((payment, idx) => {
      const monthIdx = startOffset + idx;
      if (monthIdx < 12) {
        monthlyInterest[monthIdx] += payment.interest_payment;
      }
    });
  });
  
  return monthlyInterest;
}