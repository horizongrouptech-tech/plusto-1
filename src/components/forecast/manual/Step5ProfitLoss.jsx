import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  PieChart,
  AlertCircle,
  CheckCircle2,
  Star,
  Loader2
} from "lucide-react";
import ManualForecastCharts from './ManualForecastCharts';
import { formatCurrency, formatPercentage } from './utils/numberFormatter';
import { Badge } from "@/components/ui/badge";
import { calculateTax } from './utils/taxCalculator';
import PeriodSelector from './PeriodSelector';
import {
  calculateVATSummaryForPeriod,
  calculateProfitLossForPeriod,
  getPeriodLabel,
  filterDataByPeriod
} from './utils/periodCalculations';
import TopProductsInsights from './TopProductsInsights';
import ForecastSensitivityAnalysis from './ForecastSensitivityAnalysis';

export default function Step5ProfitLoss({ forecastData, onUpdateForecast, onSave, onBack, isSaving, customer }) {
  const [profitLossData, setProfitLossData] = useState([]);
  const [yearlyTotals, setYearlyTotals] = useState({});

  // State for period selection
  const [viewMode, setViewMode] = useState('yearly');
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);

  // Load saved preferences from localStorage
  useEffect(() => {
    if (forecastData?.id) {
      const saved = localStorage.getItem(`forecast_period_${forecastData.id}`);
      if (saved) {
        try {
          const { viewMode: savedMode, startMonth: savedStart, endMonth: savedEnd } = JSON.parse(saved);
          setViewMode(savedMode || 'yearly');
          setStartMonth(savedStart || 1);
          setEndMonth(savedEnd || 12);
        } catch (e) {
          console.error('Error loading saved period:', e);
        }
      }
    }
  }, [forecastData?.id]);

  // Save preferences to localStorage when changed
  useEffect(() => {
    if (forecastData?.id) {
      localStorage.setItem(`forecast_period_${forecastData.id}`, JSON.stringify({
        viewMode,
        startMonth,
        endMonth
      }));
    }
  }, [viewMode, startMonth, endMonth, forecastData?.id]);

  const handlePeriodChange = (newViewMode, newStartMonth, newEndMonth) => {
    setViewMode(newViewMode);
    setStartMonth(newStartMonth);
    setEndMonth(newEndMonth);
  };

  // פונקציות עזר לטיפול במע"מ
  const removeVAT = (amount, hasVAT = false) => {
    if (!hasVAT) return amount;
    return amount / 1.17; // מחזיר סכום נטו
  };

  const calculateVATAmount = (amount, hasVAT = false) => {
    if (!hasVAT) return 0;
    return amount - amount / 1.17; // מחזיר רק את סכום המע"מ
  };

  useEffect(() => {
    // ✅ חישוב מחדש עם debounce - מונע חישובים מיותרים
    const timeoutId = setTimeout(() => {
      if (forecastData.services || forecastData.sales_forecast_onetime || forecastData.global_employees) {
        console.log('🔄 Recalculating profit & loss due to data changes');
        calculateProfitLoss();
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [
    forecastData.sales_forecast_onetime,
    forecastData.services,
    forecastData.global_employees,
    forecastData.detailed_expenses,
    forecastData.financing_expenses,
    forecastData.company_type,
    forecastData.tax_rate,
    forecastData.planned_employee_hires,
    forecastData.use_aggregate_planning,
    forecastData.planned_monthly_revenue_aggregate,
    forecastData.average_cogs_percentage
  ]);

  const calculateProfitLoss = () => {
    // ✅ לוגים מפורטים - רק ב-development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Starting Profit & Loss calculation');
      console.log('📊 Mode:', forecastData.use_aggregate_planning ? 'Aggregate' : 'Detailed');
    }
    
    const monthlyData = [];
    const totals = {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      salaryExpenses: 0,
      marketingExpenses: 0,
      adminExpenses: 0,
      operatingProfit: 0,
      financingExpenses: 0,
      profitBeforeTax: 0, // Added profitBeforeTax to totals
      taxAmount: 0,
      netProfit: 0,
      // חדש - סיכום מע"מ
      totalVATOnSales: 0,
      totalVATOnCosts: 0,
      totalVATOnExpenses: 0
    };

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      let monthRevenue = 0;
      let monthCogs = 0;
      let monthVATOnSales = 0;
      let monthVATOnCosts = 0;
      let monthVATOnExpenses = 0;

      // ⭐ חישוב הכנסות ועלות מכר
      
      // אם משתמשים בתכנון כללי - חשב לפי אחוז עלות ממוצע
      if (forecastData.use_aggregate_planning) {
        const aggregateRevenue = forecastData.planned_monthly_revenue_aggregate?.[monthIndex] || 0;
        const cogsPercentage = forecastData.average_cogs_percentage || 0;
        
        monthRevenue += aggregateRevenue;
        const cogsCost = aggregateRevenue * (cogsPercentage / 100);
        monthCogs += cogsCost;
        
        // ✅ מע"מ על מכירות כלליות
        monthVATOnSales += calculateVATAmount(aggregateRevenue, true);
        monthVATOnCosts += calculateVATAmount(cogsCost, true);
      } else {
        // תכנון פרטני - חישוב לפי מוצרים (רק נתוני ביצוע בפועל)
        (forecastData.sales_forecast_onetime || []).forEach((item) => {
          // ✅ בדיקה: האם יש נתוני ביצוע בפועל לחודש זה?
          const hasActualQuantity = item.actual_monthly_quantities?.[monthIndex] > 0;
          const hasActualRevenue = item.actual_monthly_revenue?.[monthIndex] > 0;
          
          // ⚠️ אם אין נתוני ביצוע - דלג על מוצר זה (לא להשתמש בתכנון)
          if (!hasActualQuantity && !hasActualRevenue) {
            return;
          }
          
          // ✅ חיפוש השירות - עם fallback חכם
          let service = (forecastData.services || []).find((s) => s.service_name === item.service_name);
          
          // ✅ אם לא נמצא service אבל יש נתונים בפועל - צור service זמני
          if (!service) {
            // חישוב מחיר ממוצע מהנתונים בפועל
            let totalRevenue = 0;
            let totalQuantity = 0;
            
            for (let i = 0; i < 12; i++) {
              const rev = item.actual_monthly_revenue?.[i] || 0;
              const qty = item.actual_monthly_quantities?.[i] || 0;
              totalRevenue += rev;
              totalQuantity += qty;
            }
            
            const avgPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;
            
            service = {
              service_name: item.service_name,
              price: avgPrice,
              costs: [],
              has_vat: true,
              calculated: {
                cost_of_sale: 0,
                gross_profit: avgPrice,
                gross_margin_percentage: 100
              }
            };
            
            console.log(`⚠️ Service not found for "${item.service_name}", using calculated price: ₪${avgPrice.toFixed(2)}`);
          }
          
          // ✅ FIX: חישוב מחדש אוטומטי של service.calculated אם חסר
          if (!service.calculated || typeof service.calculated.cost_of_sale !== 'number') {
            const VAT_RATE = 0.17;
            const rawPrice = parseFloat(service.price) || 0;
            const netPrice = service.has_vat ? rawPrice / (1 + VAT_RATE) : rawPrice;
            
            let totalCost = 0;
            (service.costs || []).forEach(cost => {
              if (cost.is_percentage) {
                totalCost += (netPrice * (parseFloat(cost.percentage_of_price) || 0)) / 100;
              } else {
                const rawCostAmount = parseFloat(cost.amount) || 0;
                const netCostAmount = cost.has_vat ? rawCostAmount / (1 + VAT_RATE) : rawCostAmount;
                totalCost += netCostAmount;
              }
            });

            service.calculated = {
              cost_of_sale: totalCost,
              gross_profit: netPrice - totalCost,
              gross_margin_percentage: netPrice > 0 ? ((netPrice - totalCost) / netPrice * 100) : 0
            };
            
            // ✅ לא להדפיס warning - זה נורמלי, פשוט חשב מחדש בשקט
          }
        
          // ✅ רק נתוני ביצוע
          const quantity = hasActualQuantity ? item.actual_monthly_quantities[monthIndex] : 0;

          const priceGross = service.price || 0;
          
          // שימוש בהכנסה בפועל שנשמרה אם קיימת (למקרה שדוח Z עדכן סכום שונה מהמכפלה), אחרת חישוב לפי כמות ומחיר
          let revenueGross = 0;
          if (hasActualRevenue) {
            revenueGross = item.actual_monthly_revenue[monthIndex];
          } else if (hasActualQuantity) {
            revenueGross = quantity * priceGross;
          } else {
            return; // בטיחות - אם אין שום נתון ביצוע, דלג
          }

          monthRevenue += revenueGross; // ✅ הכנסה ברוטו - ללא הפחתת מע"מ!

          // חישוב מע"מ על מכירות
          if (service.has_vat) {
            monthVATOnSales += calculateVATAmount(revenueGross, true);
          }

          const costOfSale = (service.costs || []).reduce((sum, cost) => {
            if (cost.is_percentage) {
              // אחוזים מחושבים על ההכנסה ברוטו
              return sum + revenueGross * (cost.percentage_of_price / 100);
            }

            const costGross = (cost.amount || 0) * quantity;

            // חישוב מע"מ על עלויות
            if (cost.has_vat) {
              monthVATOnCosts += calculateVATAmount(costGross, true);
            }

            return sum + costGross; // ✅ עלות ברוטו - ללא הפחתת מע"מ!
          }, 0);
          monthCogs += costOfSale;
        });
      }

      const monthGrossProfit = monthRevenue - monthCogs;

      // חישוב עלויות שכר (שכר לא כולל מע"מ)
      let monthSalaryExpenses = 0;
      (forecastData.global_employees || []).forEach((emp) => {
        const startMonth = emp.start_month || 1;
        const endMonth = emp.end_month || 12;

        if (monthIndex + 1 >= startMonth && monthIndex + 1 <= endMonth) {
          const unpaidMonths = emp.unpaid_leave_months || [];
          if (!unpaidMonths.includes(monthIndex + 1)) {
            let baseSalary = 0;
            if (emp.job_type === 'hourly') {
              const hours = emp.monthly_hours_amounts?.[monthIndex] || emp.hours_per_month || 0;
              const rate = emp.hourly_rate || 0;
              baseSalary = hours * rate;
            } else if (emp.job_type === 'sales_commission') {
              baseSalary = 0;
            } else {
              baseSalary = emp.monthly_salary_amounts?.[monthIndex] || emp.base_salary || 0;
            }

            const bonus = emp.monthly_bonuses?.[monthIndex] || 0;
            const salaryAdditionFactor = 1 + (emp.salary_addition_percentage || 0) / 100;
            monthSalaryExpenses += (baseSalary + bonus) * salaryAdditionFactor;
          }
        }
      });

      // גיוסים מתוכננים
      (forecastData.planned_employee_hires || []).forEach((hire) => {
        if (monthIndex + 1 >= hire.month_of_hire) {
          const salaryAdditionFactor = 1 + (hire.salary_addition_percentage || 25) / 100;
          monthSalaryExpenses += (hire.count || 1) * (hire.estimated_monthly_salary || 0) * salaryAdditionFactor;
        }
      });

      // הוצאות שיווק - ברוטו (כולל מע"מ)
      let monthMarketingExpenses = 0;
      (forecastData.detailed_expenses?.marketing_sales || []).forEach((exp) => {
        let expenseGross = 0;

        if (exp.is_annual_total && exp.amount) {
          expenseGross = exp.amount / 12;
        } else {
          const actual = exp.actual_monthly_amounts?.[monthIndex] || 0;
          const planned = exp.planned_monthly_amounts?.[monthIndex] || 0;
          expenseGross = actual > 0 ? actual : planned;
        }

        monthMarketingExpenses += expenseGross; // ✅ הוצאה ברוטו - ללא הפחתת מע"מ!

        if (exp.has_vat) {
          monthVATOnExpenses += calculateVATAmount(expenseGross, true);
        }
      });

      // הוצאות הנהלה - ברוטו (כולל מע"מ)
      let monthAdminExpenses = 0;
      (forecastData.detailed_expenses?.admin_general || []).forEach((exp) => {
        let expenseGross = 0;

        if (exp.is_annual_total && exp.amount) {
          expenseGross = exp.amount / 12;
        } else {
          const actual = exp.actual_monthly_amounts?.[monthIndex] || 0;
          const planned = exp.planned_monthly_amounts?.[monthIndex] || 0;
          expenseGross = actual > 0 ? actual : planned;
        }

        monthAdminExpenses += expenseGross; // ✅ הוצאה ברוטו - ללא הפחתת מע"מ!

        if (exp.has_vat) {
          monthVATOnExpenses += calculateVATAmount(expenseGross, true);
        }
      });

      const monthOperatingProfit = monthGrossProfit - monthSalaryExpenses - monthMarketingExpenses - monthAdminExpenses;

      const monthFinancingExpenses = forecastData.financing_expenses?.monthly_amounts?.[monthIndex] || 0;
      const monthProfitBeforeTax = monthOperatingProfit - monthFinancingExpenses;
      const companyType = forecastData.company_type || 'company';
      const monthTaxAmount = calculateTax(
        monthProfitBeforeTax,
        companyType,
        forecastData.tax_rate || 23
      );
      const monthNetProfit = monthProfitBeforeTax - monthTaxAmount;

      monthlyData.push({
        month: monthIndex + 1,
        revenue: monthRevenue,
        cost_of_sale: monthCogs,
        gross_profit: monthGrossProfit,
        gross_margin_percentage: monthRevenue > 0 ? monthGrossProfit / monthRevenue * 100 : 0,
        salary_expenses: monthSalaryExpenses,
        marketing_sales_expenses: monthMarketingExpenses,
        admin_expenses: monthAdminExpenses,
        operating_profit: monthOperatingProfit,
        operating_margin_percentage: monthRevenue > 0 ? monthOperatingProfit / monthRevenue * 100 : 0,
        financing_expenses: monthFinancingExpenses,
        profit_before_tax: monthProfitBeforeTax,
        tax_amount: monthTaxAmount,
        net_profit: monthNetProfit,
        net_margin_percentage: monthRevenue > 0 ? monthNetProfit / monthRevenue * 100 : 0
      });

      totals.revenue += monthRevenue;
      totals.cogs += monthCogs;
      totals.grossProfit += monthGrossProfit;
      totals.salaryExpenses += monthSalaryExpenses;
      totals.marketingExpenses += monthMarketingExpenses;
      totals.adminExpenses += monthAdminExpenses;
      totals.operatingProfit += monthOperatingProfit;
      totals.financingExpenses += monthFinancingExpenses;
      totals.profitBeforeTax += monthProfitBeforeTax; // Accumulate profitBeforeTax
      totals.taxAmount += monthTaxAmount;
      totals.netProfit += monthNetProfit;
      totals.totalVATOnSales += monthVATOnSales;
      totals.totalVATOnCosts += monthVATOnCosts;
      totals.totalVATOnExpenses += monthVATOnExpenses;
    }

    setProfitLossData(monthlyData);
    setYearlyTotals(totals);

    if (onUpdateForecast) {
      onUpdateForecast({
        profit_loss_monthly: monthlyData,
        summary: {
          total_revenue: Math.round(totals.revenue),
          total_cogs: Math.round(totals.cogs),
          gross_profit: Math.round(totals.grossProfit),
          total_expenses: Math.round(totals.salaryExpenses + totals.marketingExpenses + totals.adminExpenses),
          operating_profit: Math.round(totals.operatingProfit), // Added to summary
          financing_expenses: Math.round(totals.financingExpenses), // Added to summary
          profit_before_tax: Math.round(totals.profitBeforeTax), // Added to summary
          net_profit: Math.round(totals.netProfit)
        },
        vat_summary: {
          total_vat_on_sales: Math.round(totals.totalVATOnSales),
          total_vat_on_costs: Math.round(totals.totalVATOnCosts),
          total_vat_on_expenses: Math.round(totals.totalVATOnExpenses),
          net_vat_to_pay: Math.round(totals.totalVATOnSales - totals.totalVATOnCosts - totals.totalVATOnExpenses)
        }
      });
    }
  };

  // חישוב לפי תקופה נבחרת
  const periodVATSummary = useMemo(() =>
    calculateVATSummaryForPeriod(forecastData, startMonth, endMonth),
    [forecastData, startMonth, endMonth]
  );

  const periodProfitLoss = useMemo(() =>
    calculateProfitLossForPeriod(forecastData, startMonth, endMonth),
    [forecastData, startMonth, endMonth]
  );

  const filteredProfitLossData = useMemo(() =>
    filterDataByPeriod(profitLossData, startMonth, endMonth),
    [profitLossData, startMonth, endMonth]
  );

  const handleSave = () => {
    if (onUpdateForecast) {
      onUpdateForecast({
        profit_loss_monthly: profitLossData,
        summary: {
          total_revenue: Math.round(yearlyTotals.revenue),
          total_cogs: Math.round(yearlyTotals.cogs),
          gross_profit: Math.round(yearlyTotals.grossProfit),
          total_expenses: Math.round(yearlyTotals.salaryExpenses + yearlyTotals.marketingExpenses + yearlyTotals.adminExpenses),
          operating_profit: Math.round(yearlyTotals.operatingProfit), // Added to summary
          financing_expenses: Math.round(yearlyTotals.financingExpenses), // Added to summary
          profit_before_tax: Math.round(yearlyTotals.profitBeforeTax), // Added to summary
          net_profit: Math.round(yearlyTotals.netProfit)
        },
        vat_summary: {
          total_vat_on_sales: Math.round(yearlyTotals.totalVATOnSales),
          total_vat_on_costs: Math.round(yearlyTotals.totalVATOnCosts),
          total_vat_on_expenses: Math.round(yearlyTotals.totalVATOnExpenses),
          net_vat_to_pay: Math.round(yearlyTotals.totalVATOnSales - yearlyTotals.totalVATOnCosts - yearlyTotals.totalVATOnExpenses)
        }
      });
    }
    if (onSave) {
      onSave();
    }
  };

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Period Selector Component */}
      <PeriodSelector
        currentViewMode={viewMode}
        currentStartMonth={startMonth}
        currentEndMonth={endMonth}
        forecastYear={forecastData.forecast_year || new Date().getFullYear()}
        onPeriodChange={handlePeriodChange}
      />

      {/* הודעת הסבר על מע"מ */}
      <Card className="card-horizon border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-horizon-accent">
              <p className="font-semibold text-horizon-text mb-1">טיפול במע"מ</p>
              <p>כל הסכומים בדוח רווח והפסד מוצגים <strong className="text-horizon-text">כולל מע"מ (ברוטו)</strong> - כפי שהם מופיעים בפועל במכירות ובחשבוניות.</p>
              <p className="mt-1">סיכום המע"מ מוצג בנפרד מטה ומציג את יתרת המע"מ לתשלום או להחזר מול רשויות המס.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* סיכום לתקופה - פירוט רווח בלבד */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text">
            פירוט רווח - {getPeriodLabel(startMonth, endMonth, forecastData.forecast_year || new Date().getFullYear())}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-horizon-card/30 rounded-lg border border-horizon">
              <span className="font-semibold text-horizon-text">הכנסות</span>
              <span className="text-xl font-bold text-horizon-primary">
                {formatCurrency(periodProfitLoss.totalRevenue, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-horizon-card/30 rounded-lg border border-horizon">
              <span className="font-semibold text-horizon-text">רווח גולמי</span>
              <span className="text-xl font-bold text-green-400">
                {formatCurrency(periodProfitLoss.totalGrossProfit, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-horizon-card/30 rounded-lg border border-horizon">
              <span className="font-semibold text-horizon-text">רווח תפעולי</span>
              <span className="text-xl font-bold text-blue-400">
                {formatCurrency(periodProfitLoss.totalOperatingProfit, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="font-semibold text-horizon-text">הוצאות מימון</span>
              <span className="text-xl font-bold text-red-400">
                {formatCurrency(periodProfitLoss.totalFinancingExpenses, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-horizon-card/30 rounded-lg border border-horizon">
              <span className="font-semibold text-horizon-text">רווח לפני מס</span>
              <span className="text-xl font-bold text-purple-400">
                {formatCurrency(periodProfitLoss.totalProfitBeforeTax, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-lg border-2 border-green-500">
              <span className="font-bold text-horizon-text">רווח נקי (אחרי מס)</span>
              <span className="text-2xl font-bold text-green-400">
                {formatCurrency(periodProfitLoss.totalNetProfit, 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* סיכום מע"מ לתקופה */}
      <Card className="card-horizon border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            סיכום מע"מ {getPeriodLabel(startMonth, endMonth, forecastData.forecast_year || new Date().getFullYear())}
          </CardTitle>
          <p className="text-sm text-horizon-accent mt-1">
            מע"מ אינו מהווה הכנסה או הוצאה ברווח והפסד - זוהי התחייבות/נכס מול רשויות המס
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-sm text-blue-300">מע"מ עסקאות (מכירות)</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatCurrency(periodVATSummary.totalVATOnSales, 0)}
              </div>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="text-sm text-purple-300">מע"מ תשומות (עלויות)</div>
              <div className="text-2xl font-bold text-purple-400">
                {formatCurrency(periodVATSummary.totalVATOnCosts, 0)}
              </div>
            </div>
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <div className="text-sm text-orange-300">מע"מ תשומות (הוצאות)</div>
              <div className="text-2xl font-bold text-orange-400">
                {formatCurrency(periodVATSummary.totalVATOnExpenses, 0)}
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${
              periodVATSummary.netVATToPay > 0 ?
                'bg-red-500/10 border-red-500/20' :
                'bg-green-500/10 border-green-500/20'
            }`}>
              <div className={`text-sm ${
                periodVATSummary.netVATToPay > 0 ?
                  'text-red-300' :
                  'text-green-300'
              }`}>
                {periodVATSummary.netVATToPay > 0 ? 'לתשלום' : 'להחזר'}
              </div>
              <div className={`text-2xl font-bold ${
                periodVATSummary.netVATToPay > 0 ?
                  'text-red-400' :
                  'text-green-400'
              }`}>
                {formatCurrency(Math.abs(periodVATSummary.netVATToPay), 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* בחירת סוג חברה */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text">הגדרות מס</CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onUpdateForecast) {
                    onUpdateForecast({ company_type: 'company' });
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  (forecastData.company_type || 'company') === 'company' ?
                    'bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-lg' :
                    'bg-white border-2 border-[#e1e8ed] text-[#5a6c7d] hover:border-[#32acc1]'
                }`}>
                חברה בע״מ
              </button>
              <button
                onClick={() => {
                  if (onUpdateForecast) {
                    onUpdateForecast({ company_type: 'sole_proprietor' });
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  forecastData.company_type === 'sole_proprietor' ?
                    'bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-lg' :
                    'bg-white border-2 border-[#e1e8ed] text-[#5a6c7d] hover:border-[#32acc1]'
                }`}>
                עוסק מורשה
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forecastData.company_type === 'company' && (
              <div>
                <Label className="text-horizon-text mb-2 block">אחוז מס (חברה בע״מ)</Label>
                <Input
                  type="number"
                  value={forecastData.tax_rate || 23}
                  onChange={(e) => {
                    if (onUpdateForecast) {
                      onUpdateForecast({ tax_rate: parseFloat(e.target.value) || 23 });
                    }
                  }}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="23"
                />
                <p className="text-xs text-horizon-accent mt-1">ברירת מחדל: 23%</p>
              </div>
            )}
            {forecastData.company_type === 'sole_proprietor' && (
              <div className="md:col-span-2">
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-horizon-text">
                    <strong>עוסק מורשה:</strong> המס מחושב אוטומטית לפי מדרגות המס בישראל.
                  </p>
                  <p className="text-xs text-horizon-accent mt-1">
                    המדרגות: 10% עד 77,400₪, 14% עד 110,880₪, 20% עד 178,080₪, 31% עד 247,440₪, 35% עד 514,920₪, 47% עד 663,240₪, 50% מעל 663,240₪
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ניתוח מוצרים מובילים */}
      <TopProductsInsights
        forecastData={forecastData}
        startMonth={startMonth}
        endMonth={endMonth}
      />

      {/* ניתוח רגישות - מה אם? */}
      <ForecastSensitivityAnalysis forecastData={forecastData} />

      {/* גרפים */}
      <div>
        <ManualForecastCharts
          profitLossData={filteredProfitLossData}
          yearlyTotals={periodProfitLoss}
          salesForecast={forecastData.sales_forecast_onetime}
          detailedExpenses={forecastData.detailed_expenses}
        />
      </div>

      {/* טבלת רווח והפסד חודשית - מוצגת רק לתקופה הנבחרת */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text">
            דוח רווח והפסד חודשי - {getPeriodLabel(startMonth, endMonth, forecastData.forecast_year || new Date().getFullYear())}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-horizon">
                  <th className="p-2 text-right text-horizon-text">חודש</th>
                  <th className="p-2 text-right text-horizon-text">הכנסות</th>
                  <th className="p-2 text-right text-horizon-text">עלות מכר</th>
                  <th className="p-2 text-right text-horizon-text">רווח גולמי</th>
                  <th className="p-2 text-right text-horizon-text">הוצאות שכר</th>
                  <th className="p-2 text-right text-horizon-text">הוצאות שיווק</th>
                  <th className="p-2 text-right text-horizon-text">הוצאות הנהלה</th>
                  <th className="p-2 text-right text-horizon-text">רווח תפעולי</th>
                  <th className="p-2 text-right text-red-400">הוצאות מימון</th>
                  <th className="p-2 text-right text-purple-400">רווח לפני מס</th>
                  <th className="p-2 text-right text-horizon-text">מס</th>
                  <th className="p-2 text-right text-green-400 font-bold">רווח נקי</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfitLossData.map((data, idx) => (
                  <tr key={data.month} className="border-b border-horizon/50 hover:bg-horizon-card/20">
                    <td className="p-2 text-horizon-text">{monthNames[data.month - 1]}</td>
                    <td className="p-2 text-horizon-text">{formatCurrency(data.revenue, 0)}</td>
                    <td className="p-2 text-red-400">{formatCurrency(data.cost_of_sale, 0)}</td>
                    <td className="p-2 text-green-400">{formatCurrency(data.gross_profit, 0)}</td>
                    <td className="p-2 text-horizon-text">{formatCurrency(data.salary_expenses, 0)}</td>
                    <td className="p-2 text-horizon-text">{formatCurrency(data.marketing_sales_expenses, 0)}</td>
                    <td className="p-2 text-horizon-text">{formatCurrency(data.admin_expenses, 0)}</td>
                    <td className="p-2 text-blue-400">{formatCurrency(data.operating_profit, 0)}</td>
                    <td className="p-2 text-red-400">{formatCurrency(data.financing_expenses, 0)}</td>
                    <td className="p-2 text-purple-400 font-semibold">{formatCurrency(data.profit_before_tax, 0)}</td>
                    <td className="p-2 text-red-400">{formatCurrency(data.tax_amount, 0)}</td>
                    <td className="p-2 text-green-400 font-bold">{formatCurrency(data.net_profit, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="border-horizon text-horizon-text">
          <ChevronRight className="w-4 h-4 ml-2" />
          חזור
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              שמור תחזית
            </>
          )}
        </Button>
      </div>
    </div>
  );
}