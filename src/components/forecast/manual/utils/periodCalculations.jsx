// פונקציות עזר לחישובים לפי תקופה

const MONTH_NAMES_HEBREW = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

/**
 * מסנן מערך נתונים חודשיים לפי טווח חודשים
 */
export const filterDataByPeriod = (monthlyData, startMonth, endMonth) => {
  if (!monthlyData || !Array.isArray(monthlyData)) return [];
  
  return monthlyData.filter(data => {
    const month = data.month || 0;
    return month >= startMonth && month <= endMonth;
  });
};

/**
 * מסנן ומחשב מע"מ לפי תקופה
 */
export const calculateVATSummaryForPeriod = (forecastData, startMonth, endMonth) => {
  if (!forecastData?.profit_loss_monthly) {
    return {
      totalVATOnSales: 0,
      totalVATOnCosts: 0,
      totalVATOnExpenses: 0,
      netVATToPay: 0
    };
  }

  const filteredMonths = filterDataByPeriod(forecastData.profit_loss_monthly, startMonth, endMonth);
  
  // חישוב מע"מ לתקופה מסך הנתונים השמורים
  let totalVATOnSales = 0;
  let totalVATOnCosts = 0;
  let totalVATOnExpenses = 0;

  // אם יש נתוני מע"מ חודשיים, נשתמש בהם
  // אחרת נחשב מתוך vat_summary הכללי ביחס לתקופה
  if (forecastData.vat_summary) {
    const monthsInRange = endMonth - startMonth + 1;
    const yearlyFactor = monthsInRange / 12;
    
    totalVATOnSales = (forecastData.vat_summary.total_vat_on_sales || 0) * yearlyFactor;
    totalVATOnCosts = (forecastData.vat_summary.total_vat_on_costs || 0) * yearlyFactor;
    totalVATOnExpenses = (forecastData.vat_summary.total_vat_on_expenses || 0) * yearlyFactor;
  }

  return {
    totalVATOnSales: Math.round(totalVATOnSales),
    totalVATOnCosts: Math.round(totalVATOnCosts),
    totalVATOnExpenses: Math.round(totalVATOnExpenses),
    netVATToPay: Math.round(totalVATOnSales - totalVATOnCosts - totalVATOnExpenses)
  };
};

/**
 * מחשב רווח והפסד לפי תקופה
 */
export const calculateProfitLossForPeriod = (forecastData, startMonth, endMonth) => {
  if (!forecastData?.profit_loss_monthly) {
    return {
      totalRevenue: 0,
      totalCogs: 0,
      totalGrossProfit: 0,
      totalSalaryExpenses: 0,
      totalMarketingExpenses: 0,
      totalAdminExpenses: 0,
      totalOperatingProfit: 0,
      totalFinancingExpenses: 0,
      totalTax: 0,
      totalNetProfit: 0,
      avgGrossMargin: 0,
      avgOperatingMargin: 0,
      avgNetMargin: 0
    };
  }

  const filteredMonths = filterDataByPeriod(forecastData.profit_loss_monthly, startMonth, endMonth);
  
  const totals = filteredMonths.reduce((acc, month) => {
    acc.totalRevenue += month.revenue || 0;
    acc.totalCogs += month.cost_of_sale || 0;
    acc.totalGrossProfit += month.gross_profit || 0;
    acc.totalSalaryExpenses += month.salary_expenses || 0;
    acc.totalMarketingExpenses += month.marketing_sales_expenses || 0;
    acc.totalAdminExpenses += month.admin_expenses || 0;
    acc.totalOperatingProfit += month.operating_profit || 0;
    acc.totalFinancingExpenses += month.financing_expenses || 0;
    acc.totalTax += month.tax_amount || 0;
    acc.totalNetProfit += month.net_profit || 0;
    return acc;
  }, {
    totalRevenue: 0,
    totalCogs: 0,
    totalGrossProfit: 0,
    totalSalaryExpenses: 0,
    totalMarketingExpenses: 0,
    totalAdminExpenses: 0,
    totalOperatingProfit: 0,
    totalFinancingExpenses: 0,
    totalTax: 0,
    totalNetProfit: 0
  });

  // חישוב ממוצעים
  totals.avgGrossMargin = totals.totalRevenue > 0 
    ? (totals.totalGrossProfit / totals.totalRevenue * 100) 
    : 0;
  totals.avgOperatingMargin = totals.totalRevenue > 0 
    ? (totals.totalOperatingProfit / totals.totalRevenue * 100) 
    : 0;
  totals.avgNetMargin = totals.totalRevenue > 0 
    ? (totals.totalNetProfit / totals.totalRevenue * 100) 
    : 0;

  return totals;
};

/**
 * מחזיר תווית תקופה בעברית
 */
export const getPeriodLabel = (startMonth, endMonth, year) => {
  if (startMonth === 1 && endMonth === 12) {
    return `שנתי ${year}`;
  }
  if (startMonth === endMonth) {
    return `${MONTH_NAMES_HEBREW[startMonth - 1]} ${year}`;
  }
  return `${MONTH_NAMES_HEBREW[startMonth - 1]} - ${MONTH_NAMES_HEBREW[endMonth - 1]} ${year}`;
};

/**
 * מחזיר שם חודש בעברית
 */
export const getMonthNameHebrew = (monthNumber) => {
  if (monthNumber < 1 || monthNumber > 12) return '';
  return MONTH_NAMES_HEBREW[monthNumber - 1];
};