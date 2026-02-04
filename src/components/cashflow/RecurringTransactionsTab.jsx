import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Loader2
} from 'lucide-react';
import { format, addMonths, addWeeks, addDays, addYears, isBefore, isAfter, startOfDay } from 'date-fns';
import { toast } from 'sonner';

export default function RecurringTransactionsTab({ customer, dateRange }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    description: '',
    category: '',
    amount: 0,
    pattern: 'monthly',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: ''
  });

  const queryClient = useQueryClient();

  // טעינת תנועות קבועות
  const { data: recurringTransactions = [], isLoading } = useQuery({
    queryKey: ['recurringTransactions', customer?.email],
    queryFn: () => base44.entities.CashFlow.filter({
      customer_email: customer.email,
      is_recurring: true
    }, '-date'),
    enabled: !!customer?.email
  });

  // טעינת קטגוריות קיימות
  const { data: allCategories = [] } = useQuery({
    queryKey: ['cashFlowCategories', customer?.email],
    queryFn: async () => {
      const entries = await base44.entities.CashFlow.filter({
        customer_email: customer.email
      });
      const categories = [...new Set(entries.map(e => e.category).filter(Boolean))];
      return categories.sort();
    },
    enabled: !!customer?.email
  });

  // חישוב תנועות עתידיות בהתבסס על התבנית
  const projectedTransactions = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return [];
    
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const today = startOfDay(new Date());
    const projected = [];

    recurringTransactions.forEach(transaction => {
      if (!transaction.recurring_pattern) return;
      
      let currentDate = new Date(transaction.date);
      const transactionEndDate = transaction.end_date ? new Date(transaction.end_date) : null;

      while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
        // הוסף רק תאריכים עתידיים בטווח
        if ((isAfter(currentDate, startDate) || currentDate.getTime() === startDate.getTime()) &&
            isAfter(currentDate, today) &&
            (!transactionEndDate || isBefore(currentDate, transactionEndDate))) {
          projected.push({
            ...transaction,
            projected_date: format(currentDate, 'yyyy-MM-dd'),
            is_projected: true
          });
        }

        // התקדם לפי התבנית
        switch (transaction.recurring_pattern) {
          case 'daily':
            currentDate = addDays(currentDate, 1);
            break;
          case 'weekly':
            currentDate = addWeeks(currentDate, 1);
            break;
          case 'monthly':
            currentDate = addMonths(currentDate, 1);
            break;
          case 'yearly':
            currentDate = addYears(currentDate, 1);
            break;
          default:
            currentDate = addMonths(currentDate, 1);
        }
      }
    });

    return projected.sort((a, b) => new Date(a.projected_date) - new Date(b.projected_date));
  }, [recurringTransactions, dateRange]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {
        customer_email: customer.email,
        date: newTransaction.start_date,
        description: newTransaction.description,
        category: newTransaction.category,
        debit: newTransaction.type === 'expense' ? newTransaction.amount : 0,
        credit: newTransaction.type === 'income' ? newTransaction.amount : 0,
        is_recurring: true,
        recurring_pattern: newTransaction.pattern,
        end_date: newTransaction.end_date || null
      };

      if (editingTransaction) {
        await base44.entities.CashFlow.update(editingTransaction.id, data);
        toast.success('התנועה הקבועה עודכנה בהצלחה');
      } else {
        await base44.entities.CashFlow.create(data);
        toast.success('התנועה הקבועה נוספה בהצלחה');
      }

      queryClient.invalidateQueries(['recurringTransactions', customer.email]);
      queryClient.invalidateQueries(['cashFlow', customer.email]);
      setShowAddModal(false);
      setEditingTransaction(null);
      resetForm();
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
      toast.error('שגיאה בשמירה: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק תנועה קבועה זו?')) return;
    
    try {
      await base44.entities.CashFlow.delete(id);
      queryClient.invalidateQueries(['recurringTransactions', customer.email]);
      queryClient.invalidateQueries(['cashFlow', customer.email]);
      toast.success('התנועה נמחקה');
    } catch (error) {
      toast.error('שגיאה במחיקה');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setNewTransaction({
      type: transaction.credit > 0 ? 'income' : 'expense',
      description: transaction.description || '',
      category: transaction.category || '',
      amount: transaction.credit > 0 ? transaction.credit : transaction.debit,
      pattern: transaction.recurring_pattern || 'monthly',
      start_date: transaction.date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
      end_date: transaction.end_date?.split('T')[0] || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setNewTransaction({
      type: 'expense',
      description: '',
      category: '',
      amount: 0,
      pattern: 'monthly',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: ''
    });
  };

  const getPatternLabel = (pattern) => {
    switch (pattern) {
      case 'daily': return 'יומי';
      case 'weekly': return 'שבועי';
      case 'monthly': return 'חודשי';
      case 'yearly': return 'שנתי';
      default: return pattern;
    }
  };

  // סיכומים
  const totals = useMemo(() => {
    const monthlyIncome = recurringTransactions
      .filter(t => t.credit > 0 && t.recurring_pattern === 'monthly')
      .reduce((sum, t) => sum + (t.credit || 0), 0);
    const monthlyExpense = recurringTransactions
      .filter(t => t.debit > 0 && t.recurring_pattern === 'monthly')
      .reduce((sum, t) => sum + (t.debit || 0), 0);
    
    return { monthlyIncome, monthlyExpense, monthlyNet: monthlyIncome - monthlyExpense };
  }, [recurringTransactions]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* סיכומים */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm text-horizon-accent">הכנסות קבועות חודשיות</span>
            </div>
            <p className="text-2xl font-bold text-green-400">₪{totals.monthlyIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <span className="text-sm text-horizon-accent">הוצאות קבועות חודשיות</span>
            </div>
            <p className="text-2xl font-bold text-red-400">₪{totals.monthlyExpense.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={`${totals.monthlyNet >= 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-horizon-accent">יתרה חודשית צפויה</span>
            </div>
            <p className={`text-2xl font-bold ${totals.monthlyNet >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
              ₪{totals.monthlyNet.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* כפתור הוספה */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-horizon-text">תנועות קבועות</h3>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-horizon-primary">
          <Plus className="w-4 h-4 ml-2" />
          הוסף תנועה קבועה
        </Button>
      </div>

      {/* טבלת תנועות קבועות */}
      <Card className="card-horizon">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
            </div>
          ) : recurringTransactions.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent mb-2">אין תנועות קבועות</p>
              <p className="text-sm text-horizon-accent">הוסף תנועות שחוזרות על עצמן באופן קבוע</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-horizon-dark">
                <TableRow>
                  <TableHead className="text-right text-horizon-text">תיאור</TableHead>
                  <TableHead className="text-right text-horizon-text">קטגוריה</TableHead>
                  <TableHead className="text-right text-horizon-text">סכום</TableHead>
                  <TableHead className="text-right text-horizon-text">תדירות</TableHead>
                  <TableHead className="text-right text-horizon-text">תאריך התחלה</TableHead>
                  <TableHead className="text-right text-horizon-text">תאריך סיום</TableHead>
                  <TableHead className="text-right text-horizon-text">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-horizon-dark/20">
                    <TableCell className="text-right text-horizon-text font-medium">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {transaction.category || 'ללא'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${transaction.credit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {transaction.credit > 0 ? '+' : '-'}₪{(transaction.credit || transaction.debit || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-horizon-accent">
                      {getPatternLabel(transaction.recurring_pattern)}
                    </TableCell>
                    <TableCell className="text-right text-horizon-accent">
                      {transaction.date ? format(new Date(transaction.date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right text-horizon-accent">
                      {transaction.end_date ? format(new Date(transaction.end_date), 'dd/MM/yyyy') : 'ללא הגבלה'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(transaction)}
                          className="h-8 w-8 text-horizon-accent hover:text-horizon-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction.id)}
                          className="h-8 w-8 text-horizon-accent hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* תנועות צפויות לפי טווח התאריכים */}
      {projectedTransactions.length > 0 && (
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text text-lg">תנועות צפויות בטווח התאריכים</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-horizon-dark">
                <TableRow>
                  <TableHead className="text-right text-horizon-text">תאריך צפוי</TableHead>
                  <TableHead className="text-right text-horizon-text">תיאור</TableHead>
                  <TableHead className="text-right text-horizon-text">קטגוריה</TableHead>
                  <TableHead className="text-right text-horizon-text">סכום</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectedTransactions.slice(0, 20).map((transaction, idx) => (
                  <TableRow key={`${transaction.id}-${idx}`} className="hover:bg-horizon-dark/20 opacity-75">
                    <TableCell className="text-right text-horizon-accent">
                      {format(new Date(transaction.projected_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right text-horizon-text">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="border-horizon text-horizon-accent">
                        {transaction.category || 'ללא'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${transaction.credit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {transaction.credit > 0 ? '+' : '-'}₪{(transaction.credit || transaction.debit || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {projectedTransactions.length > 20 && (
              <div className="p-4 text-center text-horizon-accent text-sm">
                מציג 20 מתוך {projectedTransactions.length} תנועות צפויות
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* מודל הוספה/עריכה */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-horizon-card border-horizon text-horizon-text max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'עריכת תנועה קבועה' : 'הוספת תנועה קבועה'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-horizon-accent">סוג תנועה</Label>
              <Select 
                value={newTransaction.type}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, type: value })}
              >
                <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">הוצאה</SelectItem>
                  <SelectItem value="income">הכנסה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-horizon-accent">תיאור</Label>
              <Input
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                className="bg-horizon-dark border-horizon text-horizon-text"
                placeholder="למשל: שכירות חודשית"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">קטגוריה</Label>
              <Select 
                value={newTransaction.category}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
              >
                <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-horizon-accent">סכום</Label>
              <Input
                type="number"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                className="bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">תדירות</Label>
              <Select 
                value={newTransaction.pattern}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, pattern: value })}
              >
                <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">יומי</SelectItem>
                  <SelectItem value="weekly">שבועי</SelectItem>
                  <SelectItem value="monthly">חודשי</SelectItem>
                  <SelectItem value="yearly">שנתי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-horizon-accent">תאריך התחלה</Label>
              <Input
                type="date"
                value={newTransaction.start_date}
                onChange={(e) => setNewTransaction({ ...newTransaction, start_date: e.target.value })}
                className="bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">תאריך סיום (אופציונלי)</Label>
              <Input
                type="date"
                value={newTransaction.end_date}
                onChange={(e) => setNewTransaction({ ...newTransaction, end_date: e.target.value })}
                className="bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAddModal(false); setEditingTransaction(null); resetForm(); }}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !newTransaction.description || !newTransaction.amount}
              className="btn-horizon-primary"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingTransaction ? 'עדכן' : 'שמור')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}