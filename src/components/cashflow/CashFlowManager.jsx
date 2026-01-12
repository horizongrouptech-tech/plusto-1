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
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import RecurringExpensesTable from './RecurringExpensesTable';
import FailedRowsEditor from './FailedRowsEditor';

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
  
  const queryClient = useQueryClient();

  // טעינת תנועות תזרים
  const { data: cashFlowData = [], isLoading } = useQuery({
    queryKey: ['cashFlow', customer?.email, dateRange],
    queryFn: () => base44.entities.CashFlow.filter({
      customer_email: customer.email,
      date: { 
        $gte: dateRange.start, 
        $lte: dateRange.end 
      }
    }, '-date'),
    enabled: !!customer?.email
  });

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
      
      // קריאה לפונקציה שמנתחת את הקובץ
      const response = await base44.functions.invoke('parseBizIboxFile', {
        fileUrl: file_url,
        customerEmail: customer.email,
        dateRangeStart: dateRange.start,
        dateRangeEnd: dateRange.end
      });

      if (response.data.success) {
        queryClient.invalidateQueries(['cashFlow', customer.email]);
        queryClient.invalidateQueries(['recurringExpenses', customer.email]);
        
        // שמור נתונים על שורות בעייתיות
        setFailedRowsData({
          failedRows: response.data.failedRows || [],
          skippedRows: response.data.skippedSample || []
        });
        
        setLastUploadSummary({
          processed: response.data.processed || response.data.cashFlowEntries,
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
          const shouldEdit = window.confirm(
            `הקובץ נותח בהצלחה!\n\n` +
            `✅ נשמרו: ${response.data.processed || response.data.cashFlowEntries} תנועות\n` +
            `⚠️ דולגו: ${response.data.skipped || 0} שורות\n` +
            `❌ נכשלו: ${response.data.failed || 0} שורות\n` +
            `📁 קטגוריות: ${response.data.categories?.length || 0}\n\n` +
            `האם לפתוח את עורך השורות הבעייתיות?`
          );
          
          if (shouldEdit) {
            setShowFailedEditor(true);
          }
        } else {
          alert(
            `הקובץ נותח בהצלחה!\n\n` +
            `✅ נשמרו: ${response.data.processed || response.data.cashFlowEntries} תנועות\n` +
            `📁 קטגוריות: ${response.data.categories?.length || 0}\n` +
            `📅 טווח: ${response.data.dateRange || ''}`
          );
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
      
      let errorMessage = 'שגיאה בהעלאת הקובץ: ';
      
      if (error.message.includes('לא נמצאו תנועות')) {
        errorMessage += 'הקובץ ריק או לא מכיל נתוני תזרים תקינים מ-BiziBox.';
      } else if (error.message.includes('JSON')) {
        errorMessage += 'הקובץ לא בפורמט תקין. נא לוודא שמדובר בדוח תזרים מ-BiziBox.';
      } else if (error.message.includes('טווח התאריכים')) {
        errorMessage += 'לא נמצאו תנועות בטווח התאריכים שנבחר. נסה להרחיב את הטווח.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
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
      alert('שגיאה בייצוא הקובץ: ' + error.message);
    }
  };

  // חישוב סיכומים
  const totals = React.useMemo(() => {
    const totalDebit = cashFlowData.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = cashFlowData.reduce((sum, item) => sum + (item.credit || 0), 0);
    const balance = totalCredit - totalDebit;

    return { totalDebit, totalCredit, balance };
  }, [cashFlowData]);

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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* בחירת טווח תאריכים */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">בחר טווח תאריכים לפני העלאת הקובץ:</span>
              </div>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-40 bg-horizon-dark border-blue-500/50 text-horizon-text"
              />
              <span className="text-horizon-accent">עד</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-40 bg-horizon-dark border-blue-500/50 text-horizon-text"
              />
            </div>
            <p className="text-xs text-blue-300 mt-2">
              💡 הקובץ שתעלה צריך להכיל תנועות בטווח תאריכים זה
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
          <TabsTrigger value="recurring" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
            הוצאות קבועות
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
                        <TableHead className="text-right text-horizon-text">יתרה</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashFlowData.map((item) => (
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
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {item.category}
                            </Badge>
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
                          <TableCell className="text-right text-blue-400 font-medium">
                            {item.balance != null ? `₪${item.balance.toLocaleString()}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring">
          <RecurringExpensesTable 
            customer={customer}
            dateRange={dateRange}
          />
        </TabsContent>
      </Tabs>

      {/* סיכום העלאה אחרונה */}
      {lastUploadSummary && (lastUploadSummary.failed > 0 || lastUploadSummary.skipped > 5) && (
        <Card className="card-horizon border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-horizon-text font-medium">
                    העלאה אחרונה: {lastUploadSummary.processed} תנועות נשמרו
                  </p>
                  <p className="text-sm text-horizon-accent">
                    {lastUploadSummary.failed > 0 && `${lastUploadSummary.failed} שורות נכשלו • `}
                    {lastUploadSummary.skipped} שורות דולגו
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFailedEditor(true)}
                className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
              >
                <Edit className="w-4 h-4 ml-2" />
                ערוך שורות בעייתיות
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}