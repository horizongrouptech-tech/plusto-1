/**
 * פונקציות עזר לחישובים של תחזית ידנית
 */

/**
 * חישוב תשלום חודשי קבוע (PMT) עבור הלוואה
 * @param {number} principal - סכום ההלוואה
 * @param {number} annualInterestRatePercent - ריבית שנתית באחוזים (לדוגמה: 8.5)
 * @param {number} termMonths - תקופת ההלוואה בחודשים
 * @returns {number} - תשלום חודשי קבוע
 */
export const calculateMonthlyPayment = (principal, annualInterestRatePercent, termMonths) => {
  if (!principal || !termMonths || termMonths === 0) return 0;
  
  const monthlyRate = annualInterestRatePercent / 100 / 12;
  
  if (monthlyRate === 0) {
    return principal / termMonths;
  }
  
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  
  return principal * (numerator / denominator);
};

/**
 * חישוב לוח שפיצר מלא עבור הלוואה
 * @param {number} principal - סכום ההלוואה
 * @param {number} annualInterestRatePercent - ריבית שנתית באחוזים
 * @param {number} termMonths - תקופת ההלוואה בחודשים
 * @param {number} startMonthOffset - היסט חודשי (אם ההלוואה מתחילה לא בחודש הראשון של התחזית)
 * @param {number} currentPaymentNumber - מספר התשלום הנוכחי (אם ההלוואה כבר החלה)
 * @returns {Array} - מערך של 12 אובייקטים (לכל חודש בתחזית) עם פירוט ריבית, קרן ויתרה
 */
export const calculateAmortizationSchedule = (
  principal,
  annualInterestRatePercent,
  termMonths,
  startMonthOffset = 0,
  currentPaymentNumber = 1
) => {
  const schedule = Array(12).fill(null).map(() => ({
    month_index: 0,
    opening_balance: 0,
    interest_payment: 0,
    principal_payment: 0,
    closing_balance: 0
  }));

  if (!principal || !termMonths) return schedule;

  const monthlyRate = annualInterestRatePercent / 100 / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualInterestRatePercent, termMonths);
  
  let balance = principal;
  
  // חישוב היתרה בתחילת התחזית (אם ההלוואה כבר החלה)
  if (currentPaymentNumber > 1) {
    for (let i = 1; i < currentPaymentNumber; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
      
      if (balance < 0) balance = 0;
    }
  }

  // מילוי לוח שפיצר עבור 12 חודשי התחזית
  for (let month = 0; month < 12; month++) {
    // אם עדיין לא הגענו לחודש התחלת ההלוואה
    if (month < startMonthOffset) {
      schedule[month] = {
        month_index: month + 1,
        opening_balance: 0,
        interest_payment: 0,
        principal_payment: 0,
        closing_balance: 0
      };
      continue;
    }

    // אם ההלוואה כבר נסגרה
    if (balance <= 0) {
      schedule[month] = {
        month_index: month + 1,
        opening_balance: 0,
        interest_payment: 0,
        principal_payment: 0,
        closing_balance: 0
      };
      continue;
    }

    const openingBalance = balance;
    const interestPayment = balance * monthlyRate;
    let principalPayment = monthlyPayment - interestPayment;
    
    // וודא שלא משלמים יותר קרן מהיתרה
    if (principalPayment > balance) {
      principalPayment = balance;
    }
    
    const closingBalance = balance - principalPayment;
    
    schedule[month] = {
      month_index: month + 1,
      opening_balance: Math.round(openingBalance * 100) / 100,
      interest_payment: Math.round(interestPayment * 100) / 100,
      principal_payment: Math.round(principalPayment * 100) / 100,
      closing_balance: Math.round(closingBalance * 100) / 100
    };
    
    balance = closingBalance;
  }

  return schedule;
};

/**
 * חישוב הוצאות ריבית חודשיות מכל ההלוואות
 * @param {Array} loans - מערך הלוואות
 * @returns {Array} - מערך של 12 מספרים (הוצאות ריבית לכל חודש)
 */
export const calculateMonthlyInterestExpenses = (loans = []) => {
  const monthlyInterest = Array(12).fill(0);
  
  loans.forEach(loan => {
    const schedule = calculateAmortizationSchedule(
      loan.principal_amount,
      loan.annual_interest_rate_percent,
      loan.term_months,
      loan.start_month_offset || 0,
      loan.current_payment_number || 1
    );
    
    schedule.forEach((monthData, index) => {
      monthlyInterest[index] += monthData.interest_payment;
    });
  });
  
  return monthlyInterest.map(val => Math.round(val * 100) / 100);
};