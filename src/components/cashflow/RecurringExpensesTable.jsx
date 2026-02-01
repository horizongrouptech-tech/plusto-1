import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Link as LinkIcon, Save, Check, RefreshCw, Calendar, FileText, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, subMonths } from 'date-fns';

const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const ITEMS_PER_PAGE = 15;

// קטגוריות הוצאות אפשריות בתחזית
const FORECAST_EXPENSE_CATEGORIES = [
  { value: 'salary_expenses', label: 'הוצאות שכר' },
  { value: 'rent', label: 'שכירות' },
  { value: 'utilities', label: 'חשמל/מים/ארנונה' },
  { value: 'marketing', label: 'שיווק ופרסום' },
  { value: 'insurance', label: 'ביטוחים' },
  { value: 'professional_services', label: 'שירותים מקצועיים' },
  { value: 'office_supplies', label: 'ציוד משרדי' },
  { value: 'transportation', label: 'הובלות ונסיעות' },
  { value: 'maintenance', label: 'תחזוקה ותיקונים' },
  { value: 'communication', label: 'תקשורת וטלפון' },
  { value: 'financing', label: 'הוצאות מימון' },
  { value: 'other', label: 'אחר' }
];

export default function RecurringExpensesTable({ customer, dateRange }) {
  const [linkStatus, setLinkStatus] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [calcDateRange, setCalcDateRange] = useState({
    start: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [lastCalcDate, setLastCalcDate] = useState(null);
  const queryClient = useQueryClient();

  // State for linking dialog
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedExpenseForLink, setSelectedExpenseForLink] = useState(null);
  const [selectedForecastId, setSelectedForecastId] = useState('');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState('');
  const [selectedExpenseType, setSelectedExpenseType] = useState('marketing_sales'); // 'marketing_sales' | 'admin_general'
  const [newExpenseName, setNewExpenseName] = useState('');
  const [createNewExpense, setCreateNewExpense] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [availableExpenseItems, setAvailableExpenseItems] = useState([]);

  // טעינת הוצאות קבועות
  const { data: recurringExpenses = [], isLoading } = useQuery({
    queryKey: ['recurringExpenses', customer?.email],
    queryFn: () => base44.entities.RecurringExpense.filter({
      customer_email: customer.email
    }),
    enabled: !!customer?.email
  });

  // טעינת תחזיות זמינות
  const { data: availableForecasts = [] } = useQuery({
    queryKey: ['forecasts', customer?.email],
    queryFn: async () => {
      const forecasts = await base44.entities.ManualForecast.filter({
        customer_email: customer.email
      });
      return forecasts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!customer?.email
  });

  // אתחול מצב השיוכים
  React.useEffect(() => {
    const initialStatus = {};
    recurringExpenses.forEach(expense => {
      if (expense.date_range_start && !lastCalcDate) {
        setLastCalcDate(expense.date_range_start);
      }
      expense.monthly_amounts?.forEach(month => {
        const key = `${expense.category}_${month.month}_${month.year}`;
        initialStatus[key] = {
          linked: month.linked_to_forecast || false,
          forecastId: month.linked_forecast_id || null,
          expenseCategory: month.linked_expense_category || null
        };
      });
    });
    setLinkStatus(initialStatus);
  }, [recurringExpenses]);

  // עדכון הוצאות קבועות ידני
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      // טען תנועות מהטווח הנבחר
      const cashFlowEntries = await base44.entities.CashFlow.filter({
        customer_email: customer.email,
        date: { $gte: calcDateRange.start, $lte: calcDateRange.end }
      });

      if (cashFlowEntries.length === 0) {
        alert('לא נמצאו תנועות בטווח התאריכים הנבחר');
        return;
      }

      // קבץ לפי קטגוריה וחודש
      const categorySums = {};
      for (const entry of cashFlowEntries) {
        if (entry.debit > 0) {
          const category = entry.category || 'לא מסווג';
          const entryDate = new Date(entry.date);
          const monthKey = `${entryDate.getFullYear()}-${entryDate.getMonth() + 1}`;
          
          if (!categorySums[category]) {
            categorySums[category] = { total: 0, count: 0, months: {} };
          }
          categorySums[category].total += entry.debit;
          categorySums[category].count += 1;

          if (!categorySums[category].months[monthKey]) {
            categorySums[category].months[monthKey] = 0;
          }
          categorySums[category].months[monthKey] += entry.debit;
        }
      }

      // יצירת/עדכון הוצאות קבועות
      const existingExpenses = await base44.entities.RecurringExpense.filter({
        customer_email: customer.email
      });

      for (const [category, data] of Object.entries(categorySums)) {
        const monthlyAmounts = Object.entries(data.months).map(([monthKey, amount]) => {
          const [year, month] = monthKey.split('-').map(Number);
          return { month, year, amount, linked_to_forecast: false };
        });

        const avgMonthly = data.total / Object.keys(data.months).length;

        const expenseData = {
          customer_email: customer.email,
          category,
          monthly_amounts: monthlyAmounts,
          average_monthly: avgMonthly,
          total_in_range: data.total,
          date_range_start: calcDateRange.start,
          date_range_end: calcDateRange.end
        };

        const existingExpense = existingExpenses.find(e => e.category === category);
        if (existingExpense) {
          await base44.entities.RecurringExpense.update(existingExpense.id, expenseData);
        } else {
          await base44.entities.RecurringExpense.create(expenseData);
        }
      }

      queryClient.invalidateQueries(['recurringExpenses', customer.email]);
      setLastCalcDate(calcDateRange.start);
      alert(`הוצאות קבועות עודכנו! נמצאו ${Object.keys(categorySums).length} קטגוריות`);
    } catch (error) {
      console.error('Error recalculating:', error);
      alert('שגיאה בעדכון הוצאות קבועות: ' + error.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  // טעינת פריטי הוצאות מהתחזית הנבחרת
  React.useEffect(() => {
    const loadExpenseItems = async () => {
      if (!selectedForecastId) {
        setAvailableExpenseItems([]);
        return;
      }
      
      try {
        const forecasts = await base44.entities.ManualForecast.filter({ id: selectedForecastId });
        const forecast = forecasts?.[0];
        
        if (forecast && forecast.detailed_expenses) {
          const items = [];
          
          // הוסף פריטים מ-marketing_sales
          if (forecast.detailed_expenses.marketing_sales && Array.isArray(forecast.detailed_expenses.marketing_sales)) {
            forecast.detailed_expenses.marketing_sales.forEach(item => {
              if (item.name) {
                items.push({
                  name: item.name,
                  type: 'marketing_sales',
                  label: `${item.name} (שיווק ומכירות)`,
                  value: `marketing_sales::${item.name}`
                });
              }
            });
          }
          
          // הוסף פריטים מ-admin_general
          if (forecast.detailed_expenses.admin_general && Array.isArray(forecast.detailed_expenses.admin_general)) {
            forecast.detailed_expenses.admin_general.forEach(item => {
              if (item.name) {
                items.push({
                  name: item.name,
                  type: 'admin_general',
                  label: `${item.name} (הנהלה וכלליות)`,
                  value: `admin_general::${item.name}`
                });
              }
            });
          }
          
          setAvailableExpenseItems(items);
        } else {
          setAvailableExpenseItems([]);
        }
      } catch (error) {
        console.error('Error loading expense items:', error);
        setAvailableExpenseItems([]);
      }
    };
    
    loadExpenseItems();
  }, [selectedForecastId]);

  // פתיחת דיאלוג השיוך
  const openLinkDialog = (expense) => {
    setSelectedExpenseForLink(expense);
    setSelectedForecastId('');
    setSelectedExpenseCategory('');
    setNewExpenseName('');
    setCreateNewExpense(false);
    setSelectedExpenseType('marketing_sales');
    setLinkSuccess(false);
    setShowLinkDialog(true);
  };

  // שיוך הוצאה לתחזית
  const handleLinkToForecast = async () => {
    if (!selectedForecastId || !selectedExpenseForLink) {
      alert('יש לבחור תחזית');
      return;
    }

    // בדוק אם יש בחירת פריט קיים או שם לפריט חדש
    const hasExistingSelection = selectedExpenseCategory && !newExpenseName;
    const hasNewExpenseName = newExpenseName && newExpenseName.trim();
    
    if (!hasExistingSelection && !hasNewExpenseName) {
      alert('יש לבחור פריט הוצאה קיים או למלא שם לפריט חדש');
      return;
    }

    setIsLinking(true);
    try {
      // טען את התחזית הנבחרת
      const forecasts = await base44.entities.ManualForecast.filter({ id: selectedForecastId });
      const forecast = forecasts?.[0];
      
      if (!forecast) {
        throw new Error('לא נמצאה התחזית');
      }

      let expenseItemName;
      let expenseType;

      if (createNewExpense) {
        // יצירת פריט הוצאה חדש
        expenseItemName = newExpenseName;
        expenseType = selectedExpenseType;
        
        // עדכון התחזית עם הפריט החדש
        const detailedExpenses = forecast.detailed_expenses || { marketing_sales: [], admin_general: [] };
        const targetArray = expenseType === 'marketing_sales' ? 'marketing_sales' : 'admin_general';
        
        // צור מערך של 12 חודשים עם הסכום הממוצע
        const monthlyAmounts = Array(12).fill(selectedExpenseForLink.average_monthly || 0);
        
        const newExpenseItem = {
          name: expenseItemName,
          amount: selectedExpenseForLink.average_monthly || 0,
          monthly_amounts: monthlyAmounts,
          is_annual_total: false
        };
        
        detailedExpenses[targetArray] = [
          ...(detailedExpenses[targetArray] || []),
          newExpenseItem
        ];
        
        await base44.entities.ManualForecast.update(selectedForecastId, {
          detailed_expenses: detailedExpenses
        });
      } else {
        // שיוך לפריט קיים
        const [type, name] = selectedExpenseCategory.split('::');
        expenseItemName = name;
        expenseType = type;
        
        // עדכון הפריט הקיים עם הסכום
        const detailedExpenses = forecast.detailed_expenses || { marketing_sales: [], admin_general: [] };
        const targetArray = type === 'marketing_sales' ? 'marketing_sales' : 'admin_general';
        
        const existingItems = detailedExpenses[targetArray] || [];
        const itemIndex = existingItems.findIndex(item => item.name === name);
        
        if (itemIndex !== -1) {
          // עדכן את הסכומים החודשיים
          const existingItem = existingItems[itemIndex];
          const monthlyAmounts = existingItem.monthly_amounts || Array(12).fill(0);
          
          // הוסף את הסכום הממוצע לכל חודש
          const updatedMonthlyAmounts = monthlyAmounts.map(amount => 
            amount + (selectedExpenseForLink.average_monthly || 0)
          );
          
          existingItems[itemIndex] = {
            ...existingItem,
            amount: (existingItem.amount || 0) + (selectedExpenseForLink.average_monthly || 0),
            monthly_amounts: updatedMonthlyAmounts
          };
          
          detailedExpenses[targetArray] = existingItems;
          
          await base44.entities.ManualForecast.update(selectedForecastId, {
            detailed_expenses: detailedExpenses
          });
        }
      }

      // עדכון ההוצאה הקבועה עם פרטי השיוך
      const finalLinkInfo = `${expenseType}::${expenseItemName}`;
      const updatedMonthlyAmounts = selectedExpenseForLink.monthly_amounts?.map(month => ({
        ...month,
        linked_to_forecast: true,
        linked_forecast_id: selectedForecastId,
        linked_expense_category: finalLinkInfo
      }));

      await base44.entities.RecurringExpense.update(selectedExpenseForLink.id, {
        monthly_amounts: updatedMonthlyAmounts,
        linked_forecast_id: selectedForecastId,
        linked_expense_category: finalLinkInfo
      });

      // עדכון הסטטוס המקומי
      const newLinkStatus = { ...linkStatus };
      selectedExpenseForLink.monthly_amounts?.forEach(month => {
        const key = `${selectedExpenseForLink.category}_${month.month}_${month.year}`;
        newLinkStatus[key] = {
          linked: true,
          forecastId: selectedForecastId,
          expenseCategory: finalLinkInfo
        };
      });
      setLinkStatus(newLinkStatus);

      // עדכון אופטימי של הדאטה
      queryClient.setQueryData(['recurringExpenses', customer.email], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(exp => {
          if (exp.id === selectedExpenseForLink.id) {
            return {
              ...exp,
              linked_forecast_id: selectedForecastId,
              linked_expense_category: finalLinkInfo,
              monthly_amounts: updatedMonthlyAmounts
            };
          }
          return exp;
        });
      });

      setLinkSuccess(true);
      
      // סגור את הדיאלוג אחרי הצלחה
      setTimeout(() => {
        setShowLinkDialog(false);
        setLinkSuccess(false);
      }, 1500);

    } catch (error) {
      console.error('Error linking to forecast:', error);
      alert('שגיאה בשיוך לתחזית: ' + error.message);
    } finally {
      setIsLinking(false);
    }
  };

  // בדיקה אם הוצאה כבר משויכת
  const getLinkedInfo = (expense) => {
    // בדיקה ראשונה - ברמת ההוצאה
    if (expense.linked_forecast_id && expense.linked_expense_category) {
      const forecast = availableForecasts.find(f => f.id === expense.linked_forecast_id);
      
      // פענוח הקטגוריה
      let categoryName = expense.linked_expense_category;
      if (expense.linked_expense_category.includes('::')) {
        const [type, name] = expense.linked_expense_category.split('::');
        const typeLabel = type === 'marketing_sales' ? 'שיווק ומכירות' : 'הנהלה וכלליות';
        categoryName = `${name} (${typeLabel})`;
      }
      
      return {
        isLinked: true,
        forecastName: forecast?.forecast_name || forecast?.name || 'תחזית',
        categoryName: categoryName
      };
    }
    
    // בדיקה חלופית - ברמת החודשים
    const firstMonth = expense.monthly_amounts?.[0];
    if (firstMonth?.linked_forecast_id && firstMonth?.linked_expense_category) {
      const forecast = availableForecasts.find(f => f.id === firstMonth.linked_forecast_id);
      
      // פענוח הקטגוריה
      let categoryName = firstMonth.linked_expense_category;
      if (firstMonth.linked_expense_category.includes('::')) {
        const [type, name] = firstMonth.linked_expense_category.split('::');
        const typeLabel = type === 'marketing_sales' ? 'שיווק ומכירות' : 'הנהלה וכלליות';
        categoryName = `${name} (${typeLabel})`;
      }
      
      return {
        isLinked: true,
        forecastName: forecast?.forecast_name || forecast?.name || 'תחזית',
        categoryName: categoryName
      };
    }
    return { isLinked: false };
  };

  // קבלת החודשים הרלוונטיים מהטווח
  const getMonthsInRange = () => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const months = [];

    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      months.push({
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        label: MONTH_NAMES[current.getMonth()]
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  const monthsInRange = getMonthsInRange();

  // Pagination
  const totalPages = Math.ceil(recurringExpenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return recurringExpenses.slice(start, start + ITEMS_PER_PAGE);
  }, [recurringExpenses, currentPage]);

  // Reset page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [customer?.email]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <Card className="card-horizon">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-horizon-text">הוצאות קבועות - שיוך לתחזית</CardTitle>
              {lastCalcDate && (
                <p className="text-xs text-horizon-accent mt-1">
                  חושב לאחרונה: {format(new Date(lastCalcDate), 'dd/MM/yyyy')}
                </p>
              )}
            </div>
          </div>
          
          {/* עדכון הוצאות קבועות */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">טווח לחישוב:</span>
              </div>
              <Input
                type="date"
                value={calcDateRange.start}
                onChange={(e) => setCalcDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-36 bg-horizon-dark border-blue-500/50 text-horizon-text text-sm"
              />
              <span className="text-horizon-accent">עד</span>
              <Input
                type="date"
                value={calcDateRange.end}
                onChange={(e) => setCalcDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-36 bg-horizon-dark border-blue-500/50 text-horizon-text text-sm"
              />
              <Button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
              >
                {isRecalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מחשב...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    עדכן הוצאות קבועות
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-blue-300 mt-2">
              💡 בחר טווח תאריכים וחשב מחדש הוצאות קבועות לפי תנועות התזרים
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {recurringExpenses.length === 0 ? (
          <div className="text-center py-8 text-horizon-accent">
            <p>אין הוצאות קבועות</p>
            <p className="text-sm mt-2">העלה קובץ תזרים כדי ליצור הוצאות קבועות</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-horizon-dark">
                <TableRow>
                  <TableHead className="text-right text-horizon-text font-bold sticky right-0 bg-horizon-dark">
                    קטגוריה
                  </TableHead>
                  {monthsInRange.map((m, idx) => (
                    <TableHead key={idx} className="text-center text-horizon-text">
                      {m.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center text-horizon-text">ממוצע</TableHead>
                  <TableHead className="text-center text-horizon-text">סטטוס</TableHead>
                  <TableHead className="text-center text-horizon-text">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.map((expense) => {
                  const linkedInfo = getLinkedInfo(expense);
                  
                  return (
                    <TableRow key={expense.id} className="hover:bg-horizon-dark/20">
                      <TableCell className="text-right font-medium text-horizon-text sticky right-0 bg-horizon-card">
                        {expense.category}
                      </TableCell>
                      {monthsInRange.map((m, idx) => {
                        const monthData = expense.monthly_amounts?.find(
                          ma => ma.month === m.month && ma.year === m.year
                        );

                        return (
                          <TableCell key={idx} className="text-center">
                            {monthData ? (
                              <span className="text-sm text-horizon-text">
                                ₪{monthData.amount?.toLocaleString() || '0'}
                              </span>
                            ) : (
                              <span className="text-horizon-accent">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center text-horizon-primary font-bold">
                        ₪{expense.average_monthly?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell className="text-center">
                        {linkedInfo.isLinked ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                              משויך
                            </Badge>
                            <span className="text-xs text-horizon-accent">
                              {linkedInfo.categoryName}
                            </span>
                          </div>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            לא משויך
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={linkedInfo.isLinked ? "outline" : "default"}
                          onClick={() => openLinkDialog(expense)}
                          className={linkedInfo.isLinked 
                            ? "border-horizon text-horizon-accent hover:text-horizon-primary" 
                            : "btn-horizon-primary"
                          }
                        >
                          <LinkIcon className="w-4 h-4 ml-1" />
                          {linkedInfo.isLinked ? 'עדכן שיוך' : 'שייך לתחזית'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-horizon">
                <div className="text-sm text-horizon-accent">
                  מציג {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, recurringExpenses.length)} מתוך {recurringExpenses.length}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="border-horizon"
                  >
                    ראשון
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-horizon"
                  >
                    הקודם
                  </Button>
                  <span className="flex items-center px-3 text-horizon-text">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-horizon"
                  >
                    הבא
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="border-horizon"
                  >
                    אחרון
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* דיאלוג שיוך לתחזית */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="bg-horizon-card border-horizon text-horizon-text max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <LinkIcon className="w-6 h-6 text-horizon-primary" />
              שיוך הוצאה קבועה לתחזית
            </DialogTitle>
            <DialogDescription className="text-horizon-accent">
              בחר את התחזית וקטגוריית ההוצאה שאליה תרצה לשייך את ההוצאה הקבועה
            </DialogDescription>
          </DialogHeader>

          {linkSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-400 mb-4" />
              <p className="text-xl font-bold text-green-400">השיוך בוצע בהצלחה!</p>
              <p className="text-horizon-accent mt-2">
                ההוצאה "{selectedExpenseForLink?.category}" שויכה לתחזית
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* פרטי ההוצאה הנבחרת */}
              <div className="bg-horizon-dark/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-horizon-primary" />
                  <span className="font-medium text-horizon-text">הוצאה נבחרת:</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-horizon-accent">קטגוריה:</span>
                    <p className="font-medium text-horizon-text">{selectedExpenseForLink?.category}</p>
                  </div>
                  <div>
                    <span className="text-horizon-accent">ממוצע חודשי:</span>
                    <p className="font-medium text-horizon-primary">
                      ₪{selectedExpenseForLink?.average_monthly?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* בחירת תחזית */}
              <div>
                <Label className="text-horizon-text mb-2 block">
                  <FileText className="w-4 h-4 inline ml-2" />
                  בחר תחזית
                </Label>
                <Select value={selectedForecastId} onValueChange={setSelectedForecastId}>
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue placeholder="בחר תחזית..." />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-dark border-horizon">
                    {availableForecasts.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        אין תחזיות זמינות
                      </SelectItem>
                    ) : (
                      availableForecasts.map(forecast => (
                        <SelectItem key={forecast.id} value={forecast.id}>
                          {forecast.name || `תחזית ${format(new Date(forecast.created_date), 'dd/MM/yyyy')}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {availableForecasts.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    יש ליצור תחזית קודם בלשונית "תוכנית עסקית"
                  </p>
                )}
              </div>

              {/* בחירת פריט הוצאה או יצירת חדש */}
              {selectedForecastId && (
                <div>
                  <Label className="text-horizon-text mb-3 block font-medium">
                    <Tag className="w-4 h-4 inline ml-2" />
                    שיוך לפריט הוצאה
                  </Label>
                  
                  {availableExpenseItems.length > 0 ? (
                    <>
                      <div>
                        <Label className="text-horizon-accent mb-2 block text-sm">בחר פריט הוצאה קיים</Label>
                        <Select 
                          value={selectedExpenseCategory} 
                          onValueChange={(val) => {
                            setSelectedExpenseCategory(val);
                            setCreateNewExpense(false);
                            setNewExpenseName('');
                          }}
                        >
                          <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                            <SelectValue placeholder="בחר פריט קיים..." />
                          </SelectTrigger>
                          <SelectContent className="bg-horizon-dark border-horizon">
                            {availableExpenseItems.map(item => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-horizon"></div>
                        <span className="text-xs text-horizon-accent">או</span>
                        <div className="flex-1 h-px bg-horizon"></div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                      <p className="text-xs text-yellow-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        לא נמצאו פריטי הוצאות קיימים בתחזית זו. יש ליצור פריט חדש.
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-horizon-accent mb-2 block text-sm">
                      {availableExpenseItems.length > 0 ? 'צור פריט הוצאה חדש' : 'שם ההוצאה החדשה'}
                    </Label>
                    <Input
                      value={newExpenseName}
                      onChange={(e) => {
                        setNewExpenseName(e.target.value);
                        if (e.target.value) {
                          setCreateNewExpense(true);
                          setSelectedExpenseCategory('');
                        } else {
                          setCreateNewExpense(false);
                        }
                      }}
                      placeholder={selectedExpenseForLink?.category || "לדוגמה: שכירות משרד, פרסום בגוגל..."}
                      className="bg-horizon-dark border-horizon text-horizon-text mb-2"
                    />
                    <Select 
                      value={selectedExpenseType} 
                      onValueChange={setSelectedExpenseType}
                      disabled={!newExpenseName}
                    >
                      <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                        <SelectValue placeholder="בחר סוג הוצאה..." />
                      </SelectTrigger>
                      <SelectContent className="bg-horizon-dark border-horizon">
                        <SelectItem value="marketing_sales">שיווק ומכירות</SelectItem>
                        <SelectItem value="admin_general">הנהלה וכלליות</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* הסבר */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  💡 לאחר השיוך, הסכום הממוצע החודשי של ההוצאה יתווסף לקטגוריה הנבחרת בתחזית.
                  ניתן לעדכן את השיוך בכל עת.
                </p>
              </div>
            </div>
          )}

          {!linkSuccess && (
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLinkDialog(false)}
                className="border-horizon text-horizon-text"
              >
                ביטול
              </Button>
              <Button
                onClick={handleLinkToForecast}
                disabled={!selectedForecastId || (!createNewExpense && !selectedExpenseCategory) || (createNewExpense && !newExpenseName) || isLinking}
                className="btn-horizon-primary"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    משייך...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 ml-2" />
                    שייך לתחזית
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}