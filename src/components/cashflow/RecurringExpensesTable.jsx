import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Link as LinkIcon, Save, Check, RefreshCw, Calendar } from 'lucide-react';
import { format, subMonths } from 'date-fns';

const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const ITEMS_PER_PAGE = 15;

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

  // טעינת הוצאות קבועות
  const { data: recurringExpenses = [], isLoading } = useQuery({
    queryKey: ['recurringExpenses', customer?.email],
    queryFn: () => base44.entities.RecurringExpense.filter({
      customer_email: customer.email
    }),
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
        initialStatus[key] = month.linked_to_forecast || false;
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

  const toggleLink = (category, month, year) => {
    const key = `${category}_${month}_${year}`;
    setLinkStatus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const linkEntireRow = (category) => {
    const expense = recurringExpenses.find(e => e.category === category);
    if (!expense) return;

    const newStatus = { ...linkStatus };
    expense.monthly_amounts?.forEach(month => {
      const key = `${category}_${month.month}_${month.year}`;
      newStatus[key] = true;
    });
    setLinkStatus(newStatus);
  };

  const handleSaveLinks = async () => {
    setIsSaving(true);
    try {
      // עדכון כל ההוצאות הקבועות
      const updates = recurringExpenses.map(expense => {
        const updatedMonthlyAmounts = expense.monthly_amounts?.map(month => {
          const key = `${expense.category}_${month.month}_${month.year}`;
          return {
            ...month,
            linked_to_forecast: linkStatus[key] || false
          };
        });

        return base44.entities.RecurringExpense.update(expense.id, {
          monthly_amounts: updatedMonthlyAmounts
        });
      });

      await Promise.all(updates);
      
      queryClient.invalidateQueries(['recurringExpenses', customer.email]);
      alert('השיוכים נשמרו בהצלחה!');
    } catch (error) {
      console.error('Error saving links:', error);
      alert('שגיאה בשמירת השיוכים: ' + error.message);
    } finally {
      setIsSaving(false);
    }
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
            <Button
              onClick={handleSaveLinks}
              disabled={isSaving}
              className="btn-horizon-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור שיוכים
                </>
              )}
            </Button>
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
                  <TableHead className="text-center text-horizon-text">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-horizon-dark/20">
                    <TableCell className="text-right font-medium text-horizon-text sticky right-0 bg-horizon-card">
                      {expense.category}
                    </TableCell>
                    {monthsInRange.map((m, idx) => {
                      const monthData = expense.monthly_amounts?.find(
                        ma => ma.month === m.month && ma.year === m.year
                      );
                      const key = `${expense.category}_${m.month}_${m.year}`;
                      const isLinked = linkStatus[key] || false;

                      return (
                        <TableCell key={idx} className="text-center">
                          {monthData ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm text-horizon-text">
                                ₪{monthData.amount?.toLocaleString() || '0'}
                              </span>
                              <Checkbox
                                checked={isLinked}
                                onCheckedChange={() => toggleLink(expense.category, m.month, m.year)}
                                className="border-horizon"
                              />
                            </div>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => linkEntireRow(expense.category)}
                        className="text-horizon-primary hover:text-horizon-accent"
                      >
                        <LinkIcon className="w-4 h-4 ml-1" />
                        שייך הכל
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
    </Card>
  );
}