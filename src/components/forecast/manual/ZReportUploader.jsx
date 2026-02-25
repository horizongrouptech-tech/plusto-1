import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle, FileSpreadsheet, Calendar, AlertTriangle, Download, Search, ChevronLeft, ChevronRight } from "lucide-react";

import { formatCurrency } from './utils/numberFormatter';
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FileUpload } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { parseZReport } from '@/api/functions';

// מערכות קופה נתמכות
const POS_SYSTEMS = [
  { id: 'auto', name: 'זיהוי אוטומטי', description: 'המערכת תזהה את הפורמט אוטומטית' },
  { id: 'generic', name: 'קופה כללית', description: 'פורמט Excel/CSV סטנדרטי' },
  { id: 'emv', name: 'EMV / ישראכרט', description: 'דוחות מסוף אשראי EMV' },
  { id: 'priority', name: 'פריוריטי', description: 'דוחות מ-Priority ERP' },
  { id: 'hashavshevet', name: 'חשבשבת', description: 'דוחות מתוכנת חשבשבת' },
  { id: 'rivhit', name: 'רווחית', description: 'דוחות מתוכנת רווחית' },
  { id: 'hilan', name: 'חילן', description: 'דוחות ממערכת חילן' },
  { id: 'image', name: 'תמונה/סריקה', description: 'ניתוח תמונת דוח Z (JPG/PNG)' }
];

export default function ZReportUploader({ isOpen, onClose, forecastData, onDataImported }) {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedPosSystem, setSelectedPosSystem] = useState('auto');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef(null);
  
  const ITEMS_PER_PAGE = 50;
  const MAX_FILE_SIZE_MB = 10;

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // בדיקת גודל קובץ
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.warning(`⚠️ הקובץ גדול מדי (${fileSizeMB.toFixed(1)}MB).\nהגודל המקסימלי: ${MAX_FILE_SIZE_MB}MB`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!selectedMonth) {
      toast.warning('אנא בחר חודש לפני העלאת הקובץ');
      return;
    }

    setIsUploading(true);
    setUploadStatus('מעלה קובץ...');
    setParsingProgress(10);

    try {
      const { file_url } = await UploadFile({ file });
      
      if (!file_url) {
        throw new Error('העלאת הקובץ נכשלה');
      }

      setUploadStatus('מפענח דוח Z...');
      setParsingProgress(30);

      const response = await parseZReport({
        fileUrl: file_url,
        fileName: file.name,
        posSystem: selectedPosSystem
      });

      setParsingProgress(70);
      console.log('📥 Parse response:', response.data);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'ניתוח דוח Z נכשל');
      }

      setParsingProgress(90);

      setParsedData({
        products: response.data.data.products,
        summary: response.data.data.summary,
        file_name: file.name,
        file_url
      });

      setParsingProgress(100);
      setShowPreview(true);
      setUploadStatus('');
      setCurrentPage(1);
      setSearchTerm('');

    } catch (error) {
      console.error('❌ Error uploading Z report:', error);
      setUploadStatus('');
      
      // שמירת פרטי השגיאה
      const errorDetails = error.message || 'שגיאה לא ידועה';
      let technicalError = errorDetails;
      
      if (error.message?.includes('No products found')) {
        technicalError = 'לא נמצאו מוצרים בדוח. וודא שהקובץ מכיל נתוני מכירות תקינים.';
      } else if (error.message?.includes('File is empty')) {
        technicalError = 'הקובץ ריק או לא ניתן לקריאה. נסה קובץ אחר.';
      } else if (error.message?.includes('Unsupported file format')) {
        technicalError = 'פורמט קובץ לא נתמך. העלה קובץ Excel או CSV בלבד.';
      }
      
      // שמירת הקובץ כנכשל במערכת
      try {
        if (file_url) {
          await FileUpload.create({
            filename: file.name,
            file_url: file_url,
            file_type: file.name.split('.').pop()?.toLowerCase(),
            status: 'failed',
            data_category: 'z_report',
            analysis_notes: technicalError,
            error_message: errorDetails,
            customer_email: forecastData?.customer_email
          });
        }
      } catch (saveError) {
        console.error('Error saving failed file record:', saveError);
      }
      
      // הודעה ידידותית למשתמש
      toast.error('⚠️ הקובץ לא הועלה בהצלחה\n\nהקובץ הועבר לטיפול מנהל המערכת ונבדק בהקדם.\nתוכל לראות את הסטטוס בעדכונים שיישלחו אליך.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData || !selectedMonth) return;

    onDataImported({
      month: selectedMonth,
      products: parsedData.products,
      summary: parsedData.summary,
      file_name: parsedData.file_name,
      file_url: parsedData.file_url
    });

    setParsedData(null);
    setShowPreview(false);
    setSelectedMonth(null);
    onClose();
  };

  const handleCancel = () => {
    setParsedData(null);
    setShowPreview(false);
    setSelectedMonth(null);
    setSelectedPosSystem('auto');
    setSearchTerm('');
    setCurrentPage(1);
    setParsingProgress(0);
    onClose();
  };

  const exportToExcel = () => {
    if (!parsedData) return;
    
    const csvContent = [
      ['מוצר', 'ברקוד', 'כמות נמכרה', 'מחזור'].join(','),
      ...parsedData.products.map(p => [
        `"${p.product_name}"`,
        p.barcode || '',
        p.quantity_sold.toFixed(2),
        p.revenue_with_vat.toFixed(2)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${parsedData.file_name.replace(/\.[^/.]+$/, '')}_מעובד.csv`;
    link.click();
  };

  // חישוב pagination
  const filteredProducts = parsedData?.products.filter(p => 
    !searchTerm || p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toString().includes(searchTerm))
  ) || [];
  
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-horizon-primary" />
            העלאת דוח Z - מכירות בפועל
          </DialogTitle>
          <DialogDescription className="text-horizon-accent text-right">
            העלה דוח Z מקופה רושמת לעדכון מכירות בפועל לחודש נבחר
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* בחירת חודש */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-horizon-text flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-horizon-primary" />
                  בחר חודש לעדכון
                </label>
                <select
                  value={selectedMonth || ''}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full h-12 bg-horizon-card border border-horizon rounded-md px-3 text-horizon-text focus:outline-none focus:border-horizon-primary text-right appearance-none"
                  style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'left 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="" disabled>בחר חודש...</option>
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1} className="text-black bg-white">
                      {month} ({index + 1})
                    </option>
                  ))}
                </select>
              </div>

              {/* בחירת מערכת קופה */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-horizon-text flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-horizon-primary" />
                  מערכת/פורמט הדוח
                </label>
                <select
                  value={selectedPosSystem}
                  onChange={(e) => setSelectedPosSystem(e.target.value)}
                  className="w-full h-12 bg-horizon-card border border-horizon rounded-md px-3 text-horizon-text focus:outline-none focus:border-horizon-primary text-right appearance-none"
                  style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'left 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em'
                  }}
                >
                  {POS_SYSTEMS.map(system => (
                    <option key={system.id} value={system.id} className="text-black bg-white">
                      {system.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* תיאור המערכת הנבחרת */}
            <div className="bg-horizon-card/50 border border-horizon rounded-lg p-3">
              <p className="text-sm text-horizon-accent">
                <span className="font-medium text-horizon-text">
                  {POS_SYSTEMS.find(s => s.id === selectedPosSystem)?.name}:
                </span>{' '}
                {POS_SYSTEMS.find(s => s.id === selectedPosSystem)?.description}
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-right text-sm text-horizon-text">
                  <p className="font-semibold mb-2">שים לב:</p>
                  <ul className="space-y-1 pr-5 list-disc">
                    <li>הקובץ צריך להיות בפורמט Excel (.xlsx, .xls), CSV או תמונה (JPG/PNG)</li>
                    <li>בחר את המערכת הנכונה לקבלת תוצאות מדויקות יותר</li>
                    <li>הנתונים יעודכנו רק בעמודת "ביצוע בפועל" של החודש שנבחר</li>
                    <li>תוצג תצוגה מקדימה לפני השמירה הסופית</li>
                  </ul>
                </div>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.xls,.xlsx,.jpg,.jpeg,.png"
              className="hidden"
              disabled={isUploading || !selectedMonth}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !selectedMonth}
              className="w-full btn-horizon-primary h-12"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  {uploadStatus}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 ml-2" />
                  העלה דוח Z
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Progress Bar בזמן Parsing */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={parsingProgress} className="h-2" />
                <p className="text-sm text-horizon-accent text-center">{uploadStatus} - {parsingProgress}%</p>
              </div>
            )}

            <Card className="card-horizon">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-horizon-text">סיכום דוח Z</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToExcel}
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    <Download className="w-4 h-4 ml-1" />
                    ייצא ל-Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-horizon-accent">מוצרים</p>
                    <p className="text-2xl font-bold text-horizon-text">{parsedData.summary.total_products}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-horizon-accent">יחידות שנמכרו</p>
                    <p className="text-2xl font-bold text-horizon-text">{parsedData.summary.total_quantity_sold.toLocaleString('he-IL')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-horizon-accent">מחזור כולל מע"מ</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(parsedData.summary.total_revenue_with_vat, 2)}</p>
                  </div>
                </div>

                <Badge className="bg-blue-500/20 text-blue-400">
                  יעודכן בחודש: {monthNames[selectedMonth - 1]}
                </Badge>
              </CardContent>
            </Card>

            {/* חיפוש ופילטור */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
              <Input
                type="text"
                placeholder="חפש מוצר לפי שם או ברקוד..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-horizon-card border-horizon text-horizon-text pr-10"
              />
            </div>

            {parsedData.products.length > 100 ? (
              // תצוגה מצומצמת לדוחות גדולים
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-6 text-center space-y-3">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-400" />
                  <h3 className="text-xl font-bold text-horizon-text">דוח גדול זוהה!</h3>
                  <p className="text-horizon-accent">
                    הדוח מכיל {parsedData.products.length.toLocaleString('he-IL')} מוצרים.
                  </p>
                  <p className="text-sm text-horizon-accent">
                    לצפייה בפירוט מלא - ייצא לאקסל. לייבוא לתחזית - לחץ "אשר וייבא נתונים" למטה.
                  </p>
                </CardContent>
              </Card>
            ) : (
              // תצוגה מלאה עם pagination לדוחות בינוניים
              <>
                <div className="border border-horizon rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-horizon-card border-b-2 border-horizon">
                        <tr>
                          <th className="text-right py-2 px-3 text-horizon-accent font-semibold">מוצר</th>
                          <th className="text-center py-2 px-3 text-horizon-accent font-semibold">ברקוד</th>
                          <th className="text-center py-2 px-3 text-horizon-accent font-semibold">כמות נמכרה</th>
                          <th className="text-left py-2 px-3 text-horizon-accent font-semibold">מחזור</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentProducts.map((product, idx) => (
                          <tr key={idx} className="border-b border-horizon/50 hover:bg-horizon-card/50">
                            <td className="py-2 px-3 text-right text-horizon-text">{product.product_name}</td>
                            <td className="py-2 px-3 text-center text-horizon-accent text-xs">{product.barcode || '-'}</td>
                            <td className="py-2 px-3 text-center text-horizon-text font-medium">{product.quantity_sold.toFixed(2)}</td>
                            <td className="py-2 px-3 text-left text-horizon-text font-semibold">{formatCurrency(product.revenue_with_vat, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-horizon-accent">
                      מציג {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} מתוך {filteredProducts.length} מוצרים
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="border-horizon text-horizon-text"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-horizon-text px-3">
                        עמוד {currentPage} מתוך {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="border-horizon text-horizon-text"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-horizon">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-horizon text-horizon-text"
              >
                ביטול
              </Button>
              <Button
                onClick={handleConfirmImport}
                className="btn-horizon-primary"
              >
                <CheckCircle className="w-4 h-4 ml-2" />
                אשר וייבא נתונים ({parsedData.products.length} מוצרים)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}