import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, Loader2, FileText, BarChart3, PieChart, 
  TrendingUp, Target, Building2, CheckCircle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// אפשרויות לייצוא
const EXPORT_OPTIONS = [
  { id: 'summary', label: 'סיכום רווח והפסד', icon: TrendingUp, defaultChecked: true },
  { id: 'revenue_chart', label: 'גרף הכנסות', icon: BarChart3, defaultChecked: true },
  { id: 'expenses_chart', label: 'גרף הוצאות', icon: PieChart, defaultChecked: true },
  { id: 'profit_chart', label: 'גרף רווח/הפסד', icon: TrendingUp, defaultChecked: true },
  { id: 'goals', label: 'יעדים עסקיים', icon: Target, defaultChecked: false },
  { id: 'org_chart', label: 'מבנה ארגוני', icon: Building2, defaultChecked: false }
];

export default function ExportWithGraphsButton({ 
  forecast, 
  customer,
  chartRefs = {},
  onExportStart,
  onExportEnd
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(
    EXPORT_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.defaultChecked }), {})
  );
  const [exportProgress, setExportProgress] = useState(0);

  const toggleOption = (optionId) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: !prev[optionId]
    }));
  };

  const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '₪0';
    return `₪${Math.round(value).toLocaleString()}`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    onExportStart?.();

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // הגדרות פונט (עברית)
      pdf.setFont('helvetica');
      
      let yPosition = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // כותרת ראשית
      pdf.setFontSize(24);
      pdf.setTextColor(50, 172, 193); // horizon-primary
      const title = `תחזית עסקית - ${customer?.business_name || 'לקוח'}`;
      pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(forecast?.forecast_name || '', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      pdf.text(new Date().toLocaleDateString('he-IL'), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      setExportProgress(10);

      // סיכום רווח והפסד
      if (selectedOptions.summary && forecast?.profit_loss_summary) {
        pdf.setFontSize(16);
        pdf.setTextColor(30, 41, 59);
        pdf.text('סיכום רווח והפסד', pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 10;

        const summary = forecast.profit_loss_summary;
        const summaryData = [
          ['הכנסות שנתיות', formatCurrency(summary.total_revenue || 0)],
          ['הוצאות שנתיות', formatCurrency(summary.total_expenses || 0)],
          ['רווח גולמי', formatCurrency(summary.gross_profit || 0)],
          ['רווח נקי', formatCurrency(summary.net_profit || 0)],
          ['שולי רווח', `${(summary.profit_margin || 0).toFixed(1)}%`]
        ];

        pdf.setFontSize(11);
        summaryData.forEach(([label, value]) => {
          pdf.setTextColor(100, 100, 100);
          pdf.text(label, pageWidth - margin, yPosition, { align: 'right' });
          pdf.setTextColor(30, 41, 59);
          pdf.text(value, margin + 50, yPosition, { align: 'left' });
          yPosition += 7;
        });

        yPosition += 10;
      }

      setExportProgress(30);

      // צילום והוספת גרפים
      const chartIds = ['revenue_chart', 'expenses_chart', 'profit_chart'];
      for (const chartId of chartIds) {
        if (selectedOptions[chartId] && chartRefs[chartId]?.current) {
          try {
            // בדיקה אם צריך עמוד חדש
            if (yPosition > pageHeight - 80) {
              pdf.addPage();
              yPosition = 20;
            }

            const canvas = await html2canvas(chartRefs[chartId].current, {
              backgroundColor: '#ffffff',
              scale: 2,
              logging: false,
              useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, 80));
            yPosition += Math.min(imgHeight, 80) + 10;
          } catch (err) {
            console.error(`Error capturing chart ${chartId}:`, err);
          }
        }
        setExportProgress(prev => prev + 15);
      }

      // יעדים
      if (selectedOptions.goals && chartRefs.goals?.current) {
        try {
          if (yPosition > pageHeight - 80) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFontSize(16);
          pdf.setTextColor(30, 41, 59);
          pdf.text('יעדים עסקיים', pageWidth - margin, yPosition, { align: 'right' });
          yPosition += 10;

          const canvas = await html2canvas(chartRefs.goals.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, 100));
          yPosition += Math.min(imgHeight, 100) + 10;
        } catch (err) {
          console.error('Error capturing goals:', err);
        }
      }

      setExportProgress(85);

      // מבנה ארגוני
      if (selectedOptions.org_chart && chartRefs.org_chart?.current) {
        try {
          pdf.addPage();
          yPosition = 20;

          pdf.setFontSize(16);
          pdf.setTextColor(30, 41, 59);
          pdf.text('מבנה ארגוני', pageWidth - margin, yPosition, { align: 'right' });
          yPosition += 10;

          const canvas = await html2canvas(chartRefs.org_chart.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, 150));
        } catch (err) {
          console.error('Error capturing org chart:', err);
        }
      }

      setExportProgress(95);

      // הורדת ה-PDF
      const fileName = `תחזית_${customer?.business_name?.replace(/ /g, '_') || 'עסקית'}_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

      setExportProgress(100);
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('שגיאה בייצוא ל-PDF: ' + error.message);
    } finally {
      setIsExporting(false);
      onExportEnd?.();
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="btn-horizon-primary">
        <Download className="w-4 h-4 ml-2" />
        ייצוא ל-PDF עם גרפים
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-horizon-primary" />
              ייצוא תחזית עסקית ל-PDF
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-horizon-accent">
              בחר אילו רכיבים לכלול בקובץ ה-PDF:
            </p>

            <div className="space-y-3">
              {EXPORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Card 
                    key={option.id}
                    className={`bg-horizon-card border cursor-pointer transition-all ${
                      selectedOptions[option.id] 
                        ? 'border-horizon-primary bg-horizon-primary/5' 
                        : 'border-horizon hover:border-horizon-primary/50'
                    }`}
                    onClick={() => toggleOption(option.id)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <Checkbox
                        checked={selectedOptions[option.id]}
                        onCheckedChange={() => toggleOption(option.id)}
                        className="border-horizon-primary data-[state=checked]:bg-horizon-primary"
                      />
                      <Icon className={`w-5 h-5 ${selectedOptions[option.id] ? 'text-horizon-primary' : 'text-horizon-accent'}`} />
                      <Label className={`flex-1 cursor-pointer ${selectedOptions[option.id] ? 'text-horizon-text' : 'text-horizon-accent'}`}>
                        {option.label}
                      </Label>
                      {selectedOptions[option.id] && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {isExporting && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-horizon-accent text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מייצא... {exportProgress}%
                </div>
                <div className="w-full bg-horizon-card rounded-full h-2">
                  <div 
                    className="bg-horizon-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isExporting || !Object.values(selectedOptions).some(Boolean)}
              className="btn-horizon-primary"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייצא...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 ml-2" />
                  ייצא PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
