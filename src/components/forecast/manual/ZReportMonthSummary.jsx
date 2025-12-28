import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Download, FileSpreadsheet, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Edit } from "lucide-react";
import { formatCurrency } from './utils/numberFormatter';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import ZReportEditor from './ZReportEditor';

export default function ZReportMonthSummary({ forecastData, salesForecast, services, onUpdateZReport }) {
  const [editingMonth, setEditingMonth] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // חישוב סיכומים לכל 12 חודשים
  const monthlySummaries = useMemo(() => {
    const summaries = [];
    
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      // 1. מציאת דוח Z לחודש
      const zReport = (forecastData.z_reports_uploaded || []).find(
        r => r.month_assigned === monthIndex + 1
      );
      
      // 2. חישוב מכירות מנתוני ביצוע בפועל
      let totalRevenue = 0;
      let totalCost = 0;
      let productsWithData = 0;
      
      (salesForecast || []).forEach(item => {
        const service = (services || []).find(s => s.service_name === item.service_name);
        if (!service) return;
        
        const actualQty = item.actual_monthly_quantities?.[monthIndex] || 0;
        const actualRevenue = item.actual_monthly_revenue?.[monthIndex] || 0;
        
        if (actualQty > 0 || actualRevenue > 0) {
          productsWithData++;
          
          // מכירות - כבר ללא מע"מ אם המוצר מסומן עם has_vat
          const revenueGross = actualRevenue;
          const revenue = service.has_vat ? revenueGross / 1.17 : revenueGross;
          totalRevenue += revenue;
          
          // עלות מכר - חישוב לפי העלויות של המוצר
          const costPerUnit = (service.costs || []).reduce((sum, cost) => {
            if (cost.is_percentage) {
              // אם העלות באחוזים, מחשבים מההכנסה הנטו
              return sum + (revenue * cost.percentage_of_price / 100);
            }
            // עלות קבועה - הפחת מע"מ אם יש
            const costAmount = cost.has_vat ? cost.amount / 1.17 : cost.amount;
            return sum + costAmount;
          }, 0);
          
          totalCost += actualQty * costPerUnit;
        }
      });
      
      // 3. חישוב רווח
      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;
      
      summaries.push({
        month: monthIndex + 1,
        monthName: monthNames[monthIndex],
        hasZReport: !!zReport,
        zReport: zReport || null,
        productsWithData,
        totalRevenue,
        totalCost,
        profit,
        profitMargin
      });
    }
    
    return summaries;
  }, [forecastData, salesForecast, services]);

  // חישוב סיכום כולל של כל החודשים עם דוחות Z
  const totalSummary = useMemo(() => {
    return monthlySummaries.reduce((acc, summary) => {
      if (summary.hasZReport && summary.productsWithData > 0) {
        acc.totalRevenue += summary.totalRevenue;
        acc.totalCost += summary.totalCost;
        acc.totalProfit += summary.profit;
        acc.monthsWithReports++;
      }
      return acc;
    }, { totalRevenue: 0, totalCost: 0, totalProfit: 0, monthsWithReports: 0 });
  }, [monthlySummaries]);

  const handleDownloadReport = (fileUrl) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleEditReport = (monthIdx) => {
    const zReport = (forecastData.z_reports_uploaded || []).find(
      r => r.month_assigned === monthIdx + 1
    );
    
    if (!zReport) {
      alert('⚠️ דוח לא נמצא');
      return;
    }

    if (!zReport.detailed_products || zReport.detailed_products.length === 0) {
      alert('⚠️ דוח זה לא מכיל פרטי מוצרים לעריכה.\nהעלה דוח Z מחדש כדי לאפשר עריכה.');
      return;
    }
    
    setEditingMonth({ ...zReport, monthIndex: monthIdx });
  };

  const handleSaveEditedReport = async (updatedReport) => {
    if (!onUpdateZReport) {
      alert('⚠️ לא ניתן לשמור - אין callback זמין');
      return;
    }

    try {
      await onUpdateZReport(updatedReport);
      setEditingMonth(null);
      alert('✅ דוח Z עודכן בהצלחה!');
    } catch (error) {
      console.error('Error saving edited report:', error);
      alert('❌ שגיאה בשמירת השינויים: ' + error.message);
    }
  };

  // ✅ לוג לניפוי שגיאות
  useEffect(() => {
    console.log('📊 ZReportMonthSummary - Data received:', {
      z_reports_count: forecastData.z_reports_uploaded?.length || 0,
      sales_forecast_count: salesForecast?.length || 0,
      services_count: services?.length || 0
    });
  }, [forecastData, salesForecast, services]);

  return (
    <Card className="card-horizon mb-6">
      <CardHeader className="cursor-pointer hover:bg-horizon-card/50 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-horizon-primary" />
              סיכום דוחות Z - מכירות בפועל לפי חודש
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-horizon-accent" />
              ) : (
                <ChevronDown className="w-5 h-5 text-horizon-accent" />
              )}
            </CardTitle>
            <p className="text-sm text-horizon-accent mt-1">
              סיכום כספי לכל חודש בו הועלה דוח Z מהקופה
            </p>
          </div>
          
          {/* סיכום כולל */}
          {totalSummary.monthsWithReports > 0 && (
            <div className="bg-horizon-card/50 border-2 border-horizon-primary/30 rounded-lg p-4">
              <p className="text-xs text-horizon-accent mb-2 text-center">
                סה"כ {totalSummary.monthsWithReports} חודשים עם דוחות Z
              </p>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <span className="text-horizon-accent block">מכירות</span>
                  <span className="text-horizon-primary font-bold">{formatCurrency(totalSummary.totalRevenue, 0)}</span>
                </div>
                <div className="text-center">
                  <span className="text-horizon-accent block">עלות</span>
                  <span className="text-red-400 font-bold">{formatCurrency(totalSummary.totalCost, 0)}</span>
                </div>
                <div className="text-center">
                  <span className="text-horizon-accent block">רווח</span>
                  <span className={`font-bold ${totalSummary.totalProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(totalSummary.totalProfit, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {monthlySummaries.map((summary, idx) => {
            const hasData = summary.productsWithData > 0;
            const isProfitable = summary.profit > 0;
            
            return (
              <Card
                key={idx}
                className={`overflow-hidden transition-all hover:shadow-lg ${
                  summary.hasZReport
                    ? isProfitable 
                      ? 'border-2 border-green-500/50 bg-green-500/5' 
                      : 'border-2 border-yellow-500/50 bg-yellow-500/5'
                    : 'border border-horizon bg-horizon-card/20 opacity-60'
                }`}
              >
                {/* Header */}
                <div className={`p-3 ${
                  summary.hasZReport
                    ? isProfitable
                      ? 'bg-gradient-to-l from-green-500 to-green-600'
                      : 'bg-gradient-to-l from-yellow-500 to-yellow-600'
                    : 'bg-horizon-card/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`font-bold text-sm ${
                      summary.hasZReport ? 'text-white' : 'text-horizon-accent'
                    }`}>
                      {summary.monthName}
                    </h4>
                    {summary.hasZReport ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-horizon-accent" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  {summary.hasZReport && summary.zReport ? (
                    <div className="space-y-3">
                      {/* פרטי קובץ */}
                      <div className="text-xs space-y-1 pb-2 border-b border-horizon">
                        <div className="flex items-start gap-1">
                          <FileSpreadsheet className="w-3 h-3 text-horizon-accent mt-0.5 flex-shrink-0" />
                          <p className="text-horizon-text truncate" title={summary.zReport.file_name}>
                            {summary.zReport.file_name}
                          </p>
                        </div>
                        <p className="text-horizon-accent">
                          {format(new Date(summary.zReport.upload_date), 'dd/MM/yy HH:mm', { locale: he })}
                        </p>
                        <Badge variant="outline" className="border-blue-400 text-blue-400 text-[10px] py-0">
                          {summary.productsWithData} מוצרים
                        </Badge>
                      </div>

                      {/* נתונים כספיים */}
                      {hasData ? (
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-horizon-accent">מכירות:</span>
                            <span className="font-bold text-horizon-text">{formatCurrency(summary.totalRevenue, 0)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-horizon-accent">עלות:</span>
                            <span className="font-bold text-red-400">{formatCurrency(summary.totalCost, 0)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-horizon">
                            <span className="text-horizon-accent font-semibold">רווח:</span>
                            <div className="text-left">
                              <div className={`font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(summary.profit, 0)}
                              </div>
                              <div className={`text-[10px] flex items-center gap-0.5 ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                                {isProfitable ? (
                                  <TrendingUp className="w-2.5 h-2.5" />
                                ) : (
                                  <TrendingDown className="w-2.5 h-2.5" />
                                )}
                                {summary.profitMargin.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-horizon-accent text-center py-2">
                          אין נתוני מכירות
                        </div>
                      )}

                      {/* כפתורי פעולה */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditReport(idx)}
                          className="flex-1 border-horizon-primary/30 text-horizon-primary hover:bg-horizon-primary/10 h-7 text-xs"
                        >
                          <Edit className="w-3 h-3 ml-1" />
                          ערוך
                        </Button>
                        {summary.zReport.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReport(summary.zReport.file_url)}
                            className="flex-1 border-horizon-primary/30 text-horizon-primary hover:bg-horizon-primary/10 h-7 text-xs"
                          >
                            <Download className="w-3 h-3 ml-1" />
                            הורד
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="w-6 h-6 text-horizon-accent mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-horizon-accent">לא הועלה דוח Z</p>
                      {hasData && (
                        <Badge variant="outline" className="border-blue-400 text-blue-400 text-[10px] mt-2">
                          יש נתוני תכנון
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* הודעה כשאין דוחות Z כלל */}
        {totalSummary.monthsWithReports === 0 && (
          <div className="text-center py-6 bg-horizon-card/20 rounded-lg border border-horizon mt-4">
            <FileSpreadsheet className="w-12 h-12 text-horizon-accent mx-auto mb-3 opacity-50" />
            <p className="text-horizon-text font-medium mb-1">טרם הועלו דוחות Z</p>
            <p className="text-sm text-horizon-accent">
              העלה דוחות Z מהקופה כדי לראות כאן סיכום מכירות בפועל לכל חודש
            </p>
          </div>
        )}
        </CardContent>
      )}

      {/* Editor Modal */}
      {editingMonth && (
        <ZReportEditor
          isOpen={!!editingMonth}
          onClose={() => setEditingMonth(null)}
          zReport={editingMonth}
          monthName={monthNames[editingMonth.monthIndex]}
          services={services}
          onSave={handleSaveEditedReport}
        />
      )}
    </Card>
  );
}