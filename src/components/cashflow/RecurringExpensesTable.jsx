import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Link as LinkIcon, Save, Check } from 'lucide-react';

const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const ITEMS_PER_PAGE = 15;

export default function RecurringExpensesTable({ customer, dateRange }) {
  const [linkStatus, setLinkStatus] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
      expense.monthly_amounts?.forEach(month => {
        const key = `${expense.category}_${month.month}_${month.year}`;
        initialStatus[key] = month.linked_to_forecast || false;
      });
    });
    setLinkStatus(initialStatus);
  }, [recurringExpenses]);

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-horizon-text">הוצאות קבועות - שיוך לתחזית</CardTitle>
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
                {recurringExpenses.map((expense) => (
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}