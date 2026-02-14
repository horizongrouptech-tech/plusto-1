import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Download, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  FileSpreadsheet,
  Filter,
  AlertTriangle,
  Edit,
  Trash2,
  Pencil,
  X,
  Check,
  Plus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import RecurringExpensesTable from './RecurringExpensesTable';
import FailedRowsEditor from './FailedRowsEditor';
import RecurringTransactionsTab from './RecurringTransactionsTab';
import CreditCardsTab from './CreditCardsTab';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 25;

export default function CashFlowManager({ customer }) {
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [isUploading, setIsUploading] = useState(false);
  const [activeView, setActiveView] = useState('daily');
  const [showFailedEditor, setShowFailedEditor] = useState(false);
  const [failedRowsData, setFailedRowsData] = useState({ failedRows: [], skippedRows: [] });
  const [lastUploadSummary, setLastUploadSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' = ישן לחדש, 'desc' = חדש לישן
  const [openingBalance, setOpeningBalance] = useState(0);
  const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [showAddExpectedModal, setShowAddExpectedModal] = useState(false);
  const [expectedTransaction, setExpectedTransaction] = useState({
    type: 'expense',
    category: '',
    amount: 0,
    date: '',
    description: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const queryClient = useQueryClient();

  // טעינת כל הקטגוריות הקיימות
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

  // טעינת תנועות תזרים
  const { data: rawCashFlowData = [], isLoading } = useQuery({
    queryKey: ['cashFlow', customer?.email, dateRange],
    queryFn: () => base44.entities.CashFlow.filter({
      customer_email: customer.email,
      date: { 
        $gte: dateRange.start, 
        $lte: dateRange.end 
      }
    }, 'date'), // ממיין מהישן לחדש כדי לחשב יתרה מצטברת נכון
    enabled: !!customer?.email
  });

  // טעינת יתרת פתיחה מ-OnboardingRequest
  React.useEffect(() => {
    const loadOpeningBalance = async () => {
      if (!customer?.email) return;
      try {
        // נסה לטעון מ-OnboardingRequest entity
        const customerData = await base44.entities.OnboardingRequest.filter({
          email: customer.email
        });
        if (customerData && customerData.length > 0 && customerData[0].opening_balance !== undefined) {
          setOpeningBalance(customerData[0].opening_balance || 0);
        }
      } catch (error) {
        console.log('No opening balance found, using default 0');
      }
    };
    loadOpeningBalance();
  }, [customer?.email]);

  // חישוב יתרה מצטברת ומיון הנתונים
  const cashFlowData = React.useMemo(() => {
    if (!rawCashFlowData || rawCashFlowData.length === 0) return [];
    
    // מיון לפי תאריך (מהישן לחדש) לחישוב יתרה מצטברת
    const sortedByDateAsc = [...rawCashFlowData].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // חישוב יתרה מצטברת - מתחיל מיתרת פתיחה
    let cumulativeBalance = openingBalance || 0;
    const dataWithBalance = sortedByDateAsc.map(item => {
      cumulativeBalance += (item.credit || 0) - (item.debit || 0);
      return {
        ...item,
        cumulativeBalance: cumulativeBalance
      };
    });
    
    // מיון לפי הבחירה של המשתמש
    if (sortOrder === 'desc') {
      return dataWithBalance.reverse();
    }
    return dataWithBalance;
  }, [rawCashFlowData, sortOrder, openingBalance]);

  // טעינת הוצאות קבועות
  const { data: recurringExpenses = [] } = useQuery({
    queryKey: ['recurringExpenses', customer?.email],
    queryFn: () => base44.entities.RecurringExpense.filter({
      customer_email: customer.email
    }),
    enabled: !!customer?.email
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // העלאת הקובץ
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // קריאה לפונקציה שמנתחת את הקובץ - ללא טווח תאריכים (ייבוא הכל)
      const response = await base44.functions.invoke('parseBizIboxFile', {
        fileUrl: file_url,
        customerEmail: customer.email
        // dateRangeStart and dateRangeEnd removed - import all dates
      });

      if (response.data.success) {
        // שמירת הקובץ ל-FileUpload entity - תמיד
        try {
          // קביעת data_category מדויק לפי סוג הקובץ
          let dataCategory = 'bank_statement'; // ברירת מחדל
          
          if (file.name.toLowerCase().includes('credit') || file.name.toLowerCase().includes('כרטיס')) {
            dataCategory = 'credit_card_report';
          } else if (file.name.toLowerCase().includes('bizibox')) {
            dataCategory = 'bank_statement';
          }
          
          await base44.entities.FileUpload.create({
            customer_email: customer.email,
            filename: file.name,
            file_url: file_url,
            file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
            status: 'analyzed',
            data_category: dataCategory,
            analysis_notes: `נוספו ${response.data.processed || response.data.cashFlowEntries || 0} תנועות`,
            products_count: response.data.processed || response.data.cashFlowEntries || 0,
            parsed_data: {
              summary: `${response.data.processed || 0} תנועות, ${response.data.categories?.length || 0} קטגוריות`,
              dateRange: response.data.dateRange,
              categories: response.data.categories || []
            }
          });
          toast.success('הקובץ נשמר בהצלחה בלשונית "קבצים"');
        } catch (saveError) {
          console.error('Error saving file record:', saveError);
          toast.warning('הקובץ עובד אך לא נשמר ברשימת הקבצים');
        }

        queryClient.invalidateQueries(['cashFlow', customer.email]);
        queryClient.invalidateQueries(['recurringExpenses', customer.email]);
        queryClient.invalidateQueries(['file-uploads', customer.email]);
        
        // שמור נתונים על שורות בעייתיות
        setFailedRowsData({
          failedRows: response.data.failedRows || [],
          skippedRows: response.data.skippedSample || []
        });
        
        setLastUploadSummary({
          processed: response.data.processed || response.data.cashFlowEntries,
          duplicates: response.data.duplicates || 0,
          skipped: response.data.skipped || 0,
          failed: response.data.failed || 0,
          categories: response.data.categories?.length || 0,
          recurringExpenses: response.data.recurringExpenses,
          dateRange: response.data.dateRange,
          totals: response.data.totals
        });
        
        // הצג התראה עם סיכום
        const hasIssues = (response.data.failed || 0) > 0 || (response.data.skipped || 0) > 5;

        if (hasIssues) {
          toast.warning(`נוספו ${response.data.processed || 0} תנועות, אך יש ${response.data.failed || 0} שורות בעייתיות`, {
            duration: 5000,
            action: {
              label: 'ערוך שורות',
              onClick: () => setShowFailedEditor(true)
            }
          });
        } else {
          toast.success(`הקובץ יובא בהצלחה! ${response.data.processed || 0} תנועות נוספו`, {
            duration: 4000
          });
        }
      } else {
        // אם יש details, שמור אותם להצגה
        if (response.data.details) {
          setFailedRowsData({
            failedRows: response.data.details.failedRows || [],
            skippedRows: response.data.details.skippedRows || []
          });
        }
        throw new Error(response.data.error || 'שגיאה בניתוח הקובץ');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // שמירת פרטי השגיאה
      let technicalError = error.message || 'שגיאה לא ידועה';
      
      if (error.message?.includes('לא נמצאו תנועות')) {
        technicalError = 'הקובץ ריק או לא מכיל נתוני תזרים תקינים מ-BiziBox.';
      } else if (error.message?.includes('JSON')) {
        technicalError = 'הקובץ לא בפורמט תקין. נא לוודא שמדובר בדוח תזרים מ-BiziBox.';
      } else if (error.message?.includes('טווח התאריכים')) {
        technicalError = 'לא נמצאו תנועות בטווח התאריכים שנבחר. נסה להרחיב את הטווח.';
      }
      
      // שמירת הקובץ כנכשל במערכת
      try {
        if (file_url) {
          await base44.entities.FileUpload.create({
            filename: file?.name || 'קובץ תזרים',
            file_url: file_url,
            file_type: file?.name?.split('.').pop()?.toLowerCase() || 'unknown',
            status: 'failed',
            data_category: 'cashflow',
            analysis_notes: technicalError,
            error_message: error.message || technicalError,
            customer_email: customer?.email
          });
        }
      } catch (saveError) {
        console.error('Error saving failed file record:', saveError);
      }
      
      // הודעה ידידותית למשתמש
      toast.error('הקובץ לא הועלה בהצלחה. הקובץ הועבר לטיפול מנהל המערכת', {
        duration: 5000
      });
    } finally {
      setIsUploading(false);
      // איפוס שדה הקובץ
      const fileInput = document.getElementById('bizibox-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleExportToExcel = async () => {
    try {
      const response = await base44.functions.invoke('exportCashFlowToExcel', {
        customerEmail: customer.email,
        dateRangeStart: dateRange.start,
        dateRangeEnd: dateRange.end
      });

      // הורדת הקובץ
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `תזרים_${customer.business_name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('שגיאה בייצוא הקובץ: ' + error.message);
    }
  };

  // חישוב סיכומים
  const totals = React.useMemo(() => {
    const totalDebit = cashFlowData.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = cashFlowData.reduce((sum, item) => sum + (item.credit || 0), 0);
    const balance = totalCredit - totalDebit;

    return { totalDebit, totalCredit, balance };
  }, [cashFlowData]);

  // Pagination
  const totalPages = Math.ceil(cashFlowData.length / ITEMS_PER_PAGE);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return cashFlowData.slice(start, start + ITEMS_PER_PAGE);
  }, [cashFlowData, currentPage]);

  // Reset page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, customer?.email]);

  // פונקציות עריכה ומחיקה
  const handleEditClick = (item) => {
    // בדוק אם התנועה עתידית
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(item.date);
    
    if (itemDate < today && !item.is_expected) {
      const confirmEdit = confirm('תנועה זו בעבר. האם אתה בטוח שברצונך לערוך אותה?\n\nשים לב: עריכה מומלצת רק לתנועות עתידיות.');
      if (!confirmEdit) {
        return;
      }
    }
    
    setEditingItem({ ...item });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      await base44.entities.CashFlow.update(editingItem.id, {
        date: editingItem.date,
        description: editingItem.description,
        category: editingItem.category,
        credit: editingItem.credit || 0,
        debit: editingItem.debit || 0,
        payment_type: editingItem.payment_type,
        reference_number: editingItem.reference_number,
        account_number: editingItem.account_number
      });
      queryClient.invalidateQueries(['cashFlow', customer.email]);
      setIsEditDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('שגיאה בעדכון: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await base44.entities.CashFlow.delete(id);
      queryClient.invalidateQueries(['cashFlow', customer.email]);
      queryClient.invalidateQueries(['recurringTransactions', customer.email]);
      setDeleteConfirmId(null);
      setShowDeleteDialog(false);
      setItemToDelete(null);
      toast.success('התנועה נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('שגיאה במחיקה: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteFileUpload = async (fileUploadId) => {
    setIsDeleting(true);
    try {
      // מצא את כל תנועות ה-CashFlow המשויכות לקובץ
      const relatedEntries = await base44.entities.CashFlow.filter({
        customer_email: customer.email,
        file_upload_id: fileUploadId
      });

      // מחק את כל התנועות המשויכות
      for (const entry of relatedEntries) {
        await base44.entities.CashFlow.delete(entry.id);
      }

      // מחק את רשומת הקובץ
      await base44.entities.FileUpload.delete(fileUploadId);

      // רענן את כל ה-caches הרלוונטיים
      queryClient.invalidateQueries(['cashFlow', customer.email]);
      queryClient.invalidateQueries(['file-uploads', customer.email]);
      queryClient.invalidateQueries(['recurringExpenses', customer.email]);
      
      toast.success(`הקובץ ו-${relatedEntries.length} תנועות משויכות נמחקו בהצלחה`);
    } catch (error) {
      console.error('Error deleting file upload:', error);
      toast.error('שגיאה במחיקת הקובץ: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* כותרת ופעולות */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-horizon-primary" />
              תזרים כספים - {customer.business_name}
            </CardTitle>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="bizibox-upload"
              />
              <Button
                onClick={() => document.getElementById('bizibox-upload').click()}
                disabled={isUploading}
                className="btn-horizon-primary"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעלה...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 ml-2" />
                    העלה מ-BiziBox
                  </>
                )}
              </Button>
              <Button
                onClick={handleExportToExcel}
                variant="outline"
                className="border-horizon text-horizon-text"
              >
                <Download className="w-4 h-4 ml-2" />
                ייצא לExcel
              </Button>
              <Button
                onClick={() => setShowAddExpectedModal(true)}
                variant="outline"
                className="border-green-500 text-green-400 hover:bg-green-500/10"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף הוצאה/הכנסה צפויה
              </Button>
              <Button
                onClick={async () => {
                  if (!window.confirm('האם אתה בטוח שברצונך למחוק את כל נתוני התזרים? פעולה זו בלתי הפיכה!')) {
                    return;
                  }
                  if (!window.confirm('אישור אחרון: כל הנתונים יימחקו לצמיתות!')) {
                    return;
                  }
                  setIsDeleting(true);
                  try {
                    const { data, error } = await base44.functions.invoke('deleteCashFlowPermanently', {
                      customer_email: customer.email
                    });
                    if (error) throw new Error(error.message || JSON.stringify(error));
                    queryClient.invalidateQueries(['cashFlow', customer.email]);
                    queryClient.invalidateQueries(['recurringTransactions', customer.email]);
                    const deletedCount = data?.deletedCount ?? 0;
                    toast.success(deletedCount > 0 ? `כל נתוני התזרים נמחקו בהצלחה - ${deletedCount} תנועות` : 'אין תנועות למחוק');
                  } catch (err) {
                    toast.error('שגיאה במחיקה: ' + (err?.message || err));
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500/10"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מוחק...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 ml-2" />
                    מחק הכל
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* סינון טווח תאריכים לתצוגה */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">סנן לפי טווח תאריכים:</span>
              </div>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-40 bg-horizon-card border-horizon text-horizon-text color-scheme-dark"
                style={{ colorScheme: 'dark' }}
              />
              <span className="text-horizon-accent">עד</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-40 bg-horizon-card border-horizon text-horizon-text color-scheme-dark"
                style={{ colorScheme: 'dark' }}
              />
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-blue-400">מיון:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className={`border-blue-500/50 ${sortOrder === 'asc' ? 'bg-blue-500/20 text-blue-400' : 'text-horizon-text'}`}
                >
                  {sortOrder === 'asc' ? '📅 ישן → חדש' : '📅 חדש → ישן'}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOpeningBalanceDialog(true)}
                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                <DollarSign className="w-4 h-4 ml-1" />
                יתרת פתיחה: ₪{openingBalance.toLocaleString()}
              </Button>
            </div>
            <p className="text-xs text-blue-300 mt-2">
              💡 העלאת קובץ תייבא את כל התאריכים. השתמש בסינון זה כדי לראות תקופה ספציפית. היתרה המצטברת מחושבת מיתרת הפתיחה.
            </p>
          </div>

          {/* סיכומי זכות וחובה */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-sm text-horizon-accent">זכות (הכנסות)</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                ₪{totals.totalCredit.toLocaleString()}
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                <span className="text-sm text-horizon-accent">חובה (הוצאות)</span>
              </div>
              <p className="text-2xl font-bold text-red-400">
                ₪{totals.totalDebit.toLocaleString()}
              </p>
            </div>
            <div className={`${totals.balance >= 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-orange-500/10 border-orange-500/30'} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className={`w-5 h-5 ${totals.balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`} />
                <span className="text-sm text-horizon-accent">יתרה</span>
              </div>
              <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                ₪{totals.balance.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* טאבים - תזרים יומי vs הוצאות קבועות */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-horizon-card border border-horizon">
          <TabsTrigger value="daily" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
            תזרים יומי
          </TabsTrigger>
          <TabsTrigger value="recurring-transactions" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
            תנועות קבועות
          </TabsTrigger>
          <TabsTrigger value="recurring" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
            הוצאות קבועות
          </TabsTrigger>
          <TabsTrigger value="credit-cards" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
            כרטיסי אשראי
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card className="card-horizon">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
                </div>
              ) : cashFlowData.length === 0 ? (
                <div className="text-center py-12">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
                  <p className="text-horizon-accent mb-2">אין נתוני תזרים</p>
                  <p className="text-sm text-horizon-accent">העלה קובץ מ-BiziBox כדי להתחיל</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-horizon-dark">
                        <TableRow>
                          <TableHead className="text-right text-horizon-text">תאריך</TableHead>
                          <TableHead className="text-right text-horizon-text">ח-ן</TableHead>
                          <TableHead className="text-right text-horizon-text">תיאור</TableHead>
                          <TableHead className="text-right text-horizon-text">סוג תשלום</TableHead>
                          <TableHead className="text-right text-horizon-text">קטגוריה</TableHead>
                          <TableHead className="text-right text-horizon-text">אסמכתא</TableHead>
                          <TableHead className="text-right text-horizon-text">זכות</TableHead>
                          <TableHead className="text-right text-horizon-text">חובה</TableHead>
                          <TableHead className="text-right text-horizon-text">יתרה מצטברת</TableHead>
                          <TableHead className="text-right text-horizon-text w-24">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((item) => (
                          <TableRow key={item.id} className="hover:bg-horizon-dark/20">
                            <TableCell className="text-right text-horizon-text">
                              {format(new Date(item.date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-right text-horizon-accent text-sm">
                              {item.account_number || '-'}
                            </TableCell>
                            <TableCell className="text-right text-horizon-accent">
                              {item.description || item.source || '-'}
                            </TableCell>
                            <TableCell className="text-right text-horizon-accent">
                              {item.payment_type || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Select
                                value={item.category || ''}
                                onValueChange={async (value) => {
                                  try {
                                    // טיפול בהוספת קטגוריה חדשה
                                    if (value === '__new__') {
                                      const newCategory = prompt('הזן שם לקטגוריה החדשה:');
                                      if (!newCategory?.trim()) {
                                        return;
                                      }
                                      value = newCategory.trim();
                                    }
                                    
                                    // בדיקה אם התנועה בעבר - אזהרה לשיוך עתידי בלבד
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const itemDate = new Date(item.date);
                                    
                                    if (itemDate < today) {
                                      const confirmPast = confirm('שים לב: תנועה זו מתוארכת לעבר.\n\nשיוך קטגוריה חדש יחול רק על תנועות מהיום והלאה.\n\nהאם להמשיך?');
                                      if (!confirmPast) {
                                        return;
                                      }
                                    }
                                    
                                    await base44.entities.CashFlow.update(item.id, { 
                                      category: value,
                                      category_assignment_date: new Date().toISOString()
                                    });
                                    queryClient.invalidateQueries(['cashFlow', customer.email]);
                                    queryClient.invalidateQueries(['cashFlowCategories', customer.email]);
                                    toast.success('קטגוריה עודכנה');
                                  } catch (error) {
                                    console.error('Error updating category:', error);
                                    toast.error('שגיאה בעדכון קטגוריה');
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[140px] h-8 bg-horizon-dark border-horizon text-horizon-text text-sm">
                                  <SelectValue placeholder="בחר קטגוריה" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                  <SelectItem value="__new__" className="text-horizon-primary">
                                    + הוסף קטגוריה חדשה
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right text-horizon-accent text-sm">
                              {item.reference_number || '-'}
                            </TableCell>
                            <TableCell className="text-right text-green-400 font-medium">
                              {item.credit > 0 ? `₪${item.credit.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-red-400 font-medium">
                              {item.debit > 0 ? `₪${item.debit.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${item.cumulativeBalance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                              ₪{item.cumulativeBalance?.toLocaleString() || '0'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-horizon-accent hover:text-horizon-primary"
                                  onClick={() => handleEditClick(item)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-horizon-accent hover:text-red-500"
                                  onClick={() => {
                                    setItemToDelete(item);
                                    setShowDeleteDialog(true);
                                  }}
                                  disabled={isDeleting}
                                >
                                  {isDeleting && itemToDelete?.id === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-horizon">
                      <div className="text-sm text-horizon-accent">
                        מציג {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, cashFlowData.length)} מתוך {cashFlowData.length}
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
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring-transactions">
          <RecurringTransactionsTab customer={customer} dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="recurring">
          <RecurringExpensesTable 
            customer={customer}
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="credit-cards">
          <CreditCardsTab customer={customer} dateRange={dateRange} />
        </TabsContent>
      </Tabs>

      {/* סיכום העלאה אחרונה */}
      {lastUploadSummary && (
        <Card className={`card-horizon ${(lastUploadSummary.failed > 0 || lastUploadSummary.skipped > 5) ? 'border-yellow-500/30' : 'border-green-500/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(lastUploadSummary.failed > 0 || lastUploadSummary.skipped > 5) ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Check className="w-5 h-5 text-green-500" />
                )}
                <div>
                  <p className="text-horizon-text font-medium">
                    העלאה אחרונה: {lastUploadSummary.processed} תנועות חדשות נוספו
                  </p>
                  <p className="text-sm text-horizon-accent">
                    {lastUploadSummary.duplicates > 0 && `${lastUploadSummary.duplicates} כפילויות דולגו • `}
                    {lastUploadSummary.failed > 0 && `${lastUploadSummary.failed} שורות נכשלו • `}
                    {lastUploadSummary.skipped > 0 && `${lastUploadSummary.skipped} שורות דולגו`}
                  </p>
                </div>
              </div>
              {(lastUploadSummary.failed > 0 || lastUploadSummary.skipped > 5) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFailedEditor(true)}
                  className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך שורות בעייתיות
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* מודל הוספת הוצאה/הכנסה צפויה */}
      <Dialog open={showAddExpectedModal} onOpenChange={setShowAddExpectedModal}>
        <DialogContent className="bg-horizon-card border-horizon text-horizon-text max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוסף תנועה צפויה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-horizon-accent">סוג תנועה</Label>
              <Select 
                value={expectedTransaction.type}
                onValueChange={(value) => setExpectedTransaction({ ...expectedTransaction, type: value })}
              >
                <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">הוצאה צפויה</SelectItem>
                  <SelectItem value="income">הכנסה צפויה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-horizon-accent">קטגוריה</Label>
              <Select 
                value={expectedTransaction.category}
                onValueChange={(value) => setExpectedTransaction({ ...expectedTransaction, category: value })}
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
                value={expectedTransaction.amount}
                onChange={(e) => setExpectedTransaction({ ...expectedTransaction, amount: parseFloat(e.target.value) || 0 })}
                className="bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">תאריך צפוי</Label>
              <Input
                type="date"
                value={expectedTransaction.date}
                onChange={(e) => setExpectedTransaction({ ...expectedTransaction, date: e.target.value })}
                className="bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">תיאור</Label>
              <Input
                value={expectedTransaction.description}
                onChange={(e) => setExpectedTransaction({ ...expectedTransaction, description: e.target.value })}
                className="bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddExpectedModal(false);
                setExpectedTransaction({ type: 'expense', category: '', amount: 0, date: '', description: '' });
              }}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={async () => {
                try {
                  await base44.entities.CashFlow.create({
                    customer_email: customer.email,
                    date: expectedTransaction.date,
                    description: expectedTransaction.description,
                    category: expectedTransaction.category,
                    debit: expectedTransaction.type === 'expense' ? expectedTransaction.amount : 0,
                    credit: expectedTransaction.type === 'income' ? expectedTransaction.amount : 0,
                    payment_type: 'expected',
                    is_expected: true
                  });
                  
                  queryClient.invalidateQueries(['cashFlow', customer.email]);
                  setShowAddExpectedModal(false);
                  setExpectedTransaction({ type: 'expense', category: '', amount: 0, date: '', description: '' });
                  toast.success('התנועה הצפויה נוספה בהצלחה');
                } catch (error) {
                  console.error('Error adding expected transaction:', error);
                  toast.error('שגיאה בהוספת התנועה: ' + error.message);
                }
              }}
              className="btn-horizon-primary"
            >
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* עורך שורות בעייתיות */}
      <FailedRowsEditor
        isOpen={showFailedEditor}
        onClose={() => setShowFailedEditor(false)}
        failedRows={failedRowsData.failedRows}
        skippedRows={failedRowsData.skippedRows}
        customerEmail={customer.email}
        onSaveComplete={(count) => {
          queryClient.invalidateQueries(['cashFlow', customer.email]);
          setLastUploadSummary(prev => prev ? {
            ...prev,
            processed: (prev.processed || 0) + count
          } : null);
        }}
      />

      {/* דיאלוג עריכה */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-horizon-card border-horizon text-horizon-text max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת תנועה</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-horizon-accent">תאריך</Label>
                  <Input
                    type="date"
                    value={editingItem.date?.split('T')[0] || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
                <div>
                  <Label className="text-horizon-accent">קטגוריה</Label>
                  <Input
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
              </div>
              <div>
                <Label className="text-horizon-accent">תיאור</Label>
                <Input
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-horizon-accent">זכות (הכנסה)</Label>
                  <Input
                    type="number"
                    value={editingItem.credit || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, credit: parseFloat(e.target.value) || 0 })}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
                <div>
                  <Label className="text-horizon-accent">חובה (הוצאה)</Label>
                  <Input
                    type="number"
                    value={editingItem.debit || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, debit: parseFloat(e.target.value) || 0 })}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-horizon-accent">סוג תשלום</Label>
                  <Input
                    value={editingItem.payment_type || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, payment_type: e.target.value })}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
                <div>
                  <Label className="text-horizon-accent">אסמכתא</Label>
                  <Input
                    value={editingItem.reference_number || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, reference_number: e.target.value })}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="btn-horizon-primary"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג אישור מחיקה */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-horizon-card border-horizon text-horizon-text max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-horizon-text mb-2">האם אתה בטוח שברצונך למחוק תנועה זו?</p>
            <p className="text-sm text-red-400 font-semibold">⚠️ פעולה זו בלתי הפיכה</p>
            {itemToDelete && (
              <div className="mt-4 p-3 bg-horizon-dark rounded-lg border border-horizon">
                <div className="text-sm space-y-1">
                  <div><span className="text-horizon-accent">תאריך:</span> <span className="text-horizon-text">{itemToDelete.date}</span></div>
                  <div><span className="text-horizon-accent">תיאור:</span> <span className="text-horizon-text">{itemToDelete.description}</span></div>
                  <div><span className="text-horizon-accent">סכום:</span> <span className="text-horizon-text">₪{(itemToDelete.credit || itemToDelete.debit || 0).toLocaleString()}</span></div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setItemToDelete(null);
              }}
              className="border-horizon text-horizon-text"
              disabled={isDeleting}
            >
              ביטול
            </Button>
            <Button
              onClick={() => itemToDelete && handleDelete(itemToDelete.id)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מוחק...
                </>
              ) : (
                'מחק'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג לעדכון יתרת פתיחה */}
      <Dialog open={showOpeningBalanceDialog} onOpenChange={setShowOpeningBalanceDialog}>
        <DialogContent className="bg-horizon-dark border-horizon text-horizon-text" dir="rtl">
          <DialogHeader>
            <DialogTitle>עדכון יתרת פתיחה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-horizon-accent mb-2 block">יתרת פתיחה (₪)</Label>
              <Input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                className="bg-horizon-card border-horizon text-horizon-text text-lg"
                placeholder="0"
              />
              <p className="text-xs text-horizon-accent mt-2">
                💡 יתרת הפתיחה תתווסף לתחילת התזרים ותחושב כחלק מהיתרה המצטברת
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOpeningBalanceDialog(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={async () => {
                try {
                  // עדכון יתרת פתיחה ב-OnboardingRequest entity
                  const customers = await base44.entities.OnboardingRequest.filter({
                    email: customer.email
                  });
                  if (customers && customers.length > 0) {
                    await base44.entities.OnboardingRequest.update(customers[0].id, {
                      opening_balance: openingBalance
                    });
                  }
                  queryClient.invalidateQueries(['cashFlow', customer.email]);
                  setShowOpeningBalanceDialog(false);
                  toast.success('יתרת הפתיחה עודכנה בהצלחה');
                } catch (error) {
                  console.error('Error updating opening balance:', error);
                  toast.error('שגיאה בעדכון יתרת פתיחה: ' + error.message);
                }
              }}
              className="btn-horizon-primary"
            >
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}