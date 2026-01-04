import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle, FileSpreadsheet, Calendar, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from './utils/numberFormatter';

export default function ZReportUploader({ isOpen, onClose, forecastData, onDataImported }) {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedMonth) {
      alert('אנא בחר חודש לפני העלאת הקובץ');
      return;
    }

    setIsUploading(true);
    setUploadStatus('מעלה קובץ...');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (!file_url) {
        throw new Error('העלאת הקובץ נכשלה');
      }

      setUploadStatus('מפענח דוח Z...');

      const response = await base44.functions.invoke('parseZReport', {
        fileUrl: file_url,
        fileName: file.name
      });

      console.log('📥 Parse response:', response.data);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'ניתוח דוח Z נכשל');
      }

      setParsedData({
        products: response.data.data.products,
        summary: response.data.data.summary,
        file_name: file.name,
        file_url
      });

      setShowPreview(true);
      setUploadStatus('');

    } catch (error) {
      console.error('❌ Error uploading Z report:', error);
      setUploadStatus('');
      
      let errorMessage = 'שגיאה בעיבוד הקובץ:\n';
      
      if (error.message.includes('No products found')) {
        errorMessage += 'לא נמצאו מוצרים בדוח. וודא שהקובץ מכיל נתוני מכירות תקינים.';
      } else if (error.message.includes('File is empty')) {
        errorMessage += 'הקובץ ריק או לא ניתן לקריאה. נסה קובץ אחר.';
      } else if (error.message.includes('Unsupported file format')) {
        errorMessage += 'פורמט קובץ לא נתמך. העלה קובץ Excel או CSV בלבד.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
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
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
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

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-right text-sm text-horizon-text">
                  <p className="font-semibold mb-2">שים לב:</p>
                  <ul className="space-y-1 pr-5 list-disc">
                    <li>הקובץ צריך להיות בפורמט Excel (.xlsx, .xls) או CSV</li>
                    <li>הנתונים יעודכנו רק בעמודת "ביצוע בפועל" של החודש שנבחר</li>
                    <li>נתוני התכנון והחודשים האחרים לא ישתנו</li>
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
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-lg text-horizon-text">סיכום דוח Z</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-horizon-accent">מוצרים</p>
                    <p className="text-2xl font-bold text-horizon-text">{parsedData.summary.total_products}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-horizon-accent">יחידות שנמכרו</p>
                    <p className="text-2xl font-bold text-horizon-text">{parsedData.summary.total_quantity_sold.toFixed(2)}</p>
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

            <div className="border border-horizon rounded-lg max-h-[50vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-horizon-card/95 backdrop-blur-sm z-10">
                  <tr className="border-b-2 border-horizon">
                    <th className="text-right py-2 px-3 text-horizon-accent font-semibold">מוצר</th>
                    <th className="text-center py-2 px-3 text-horizon-accent font-semibold">כמות נמכרה</th>
                    <th className="text-left py-2 px-3 text-horizon-accent font-semibold">מחזור</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.products.map((product, idx) => (
                    <tr key={idx} className="border-b border-horizon/50 hover:bg-horizon-card/50">
                      <td className="py-2 px-3 text-right text-horizon-text">{product.product_name}</td>
                      <td className="py-2 px-3 text-center text-horizon-text">{product.quantity_sold.toFixed(2)}</td>
                      <td className="py-2 px-3 text-left text-horizon-text">{formatCurrency(product.revenue_with_vat, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
                אשר וייבא נתונים
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}