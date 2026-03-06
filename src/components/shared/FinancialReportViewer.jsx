import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, DollarSign, PieChart, Lightbulb, BarChart, AlertTriangle, CheckCircle, SlidersHorizontal, ArrowUpRight, Target, TrendingDown, XCircle, Sparkles } from "lucide-react"; // Added Sparkles
import DeeperInsightsModal from "./DeeperInsightsModal"; // NEW IMPORT
import { formatMarginPercentage } from "@/components/utils/formatMarginPercentage";

const currencyFormatter = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

export function FinancialReportViewer({ reportData: rawReportData, isOpen, onClose, fileData }) {
  // parsed_data עשוי להגיע כ-string מ-DB — פרסר אם צריך
  const reportData = React.useMemo(() => {
    if (typeof rawReportData === 'string') {
      try { return JSON.parse(rawReportData); } catch { return rawReportData; }
    }
    return rawReportData;
  }, [rawReportData]);

  const [showDeeperInsightsModal, setShowDeeperInsightsModal] = useState(false);
  const [localFileData, setLocalFileData] = useState(fileData);

  useEffect(() => {
    setLocalFileData(fileData);
  }, [fileData]);

  const handleInsightsUpdated = (updatedFile) => {
      setLocalFileData(updatedFile);
  };

  // Detect report type and extract data accordingly for Dialog Header
  const isBalanceSheet = reportData?.report_metadata?.report_type?.includes('מאזן') ||
                        reportData?.report_metadata?.report_type?.includes('Balance');
  
  const isProfitLoss = (reportData?.report_metadata?.report_type?.includes('רווח') ||
                      reportData?.report_metadata?.report_type?.includes('Income') ||
                      reportData?.report_metadata?.report_type?.includes('P&L')) && !isBalanceSheet;

  const reportTitle = isBalanceSheet ? "ניתוח מאזן בוחן" : 
                     isProfitLoss ? "ניתוח דוח רווח והפסד" : 
                     "ניתוח דוח פיננסי";

  // StatCard component - kept from original for full report view
  const StatCard = ({ title, value, icon: Icon, color, description }) => (
    <Card className={`bg-${color}-500/10 border-${color}-500/20 border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-horizon-accent">{title}</p>
            <p className={`text-xl lg:text-2xl font-bold text-${color}-400`}>{value}</p>
            {description && <p className="text-xs text-horizon-accent mt-1">{description}</p>}
          </div>
          <Icon className={`w-6 h-6 lg:w-8 lg:h-8 text-${color}-400 flex-shrink-0`} />
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    if (!reportData) {
      return (
        <div className="p-4 text-center text-horizon-accent">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p>אין נתונים זמינים להצגה.</p>
        </div>
      );
    }

    // SPECIFIC HANDLING FOR PROFIT & LOSS RAW DATA FALLBACK
    if (reportData.raw_data && Array.isArray(reportData.raw_data) && reportData.error) {
      const rawData = reportData.raw_data;
      if (rawData.length === 0) {
        return (
          <div className="text-center py-10">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold text-horizon-text mb-2">שגיאה בניתוח דוח רווח והפסד</h3>
            <p className="text-horizon-accent mb-4">
              המערכת לא הצליחה לנתח את דוח רווח והפסד באופן מלא. הוצגו נתונים גולמיים.
            </p>
            <p className="text-sm text-horizon-accent">
              {reportData.error || "נתונים גולמיים בלבד. אנא בדוק את פורמט הקובץ."}
            </p>
          </div>
        );
      }

      const headers = rawData[0] || [];
      const rows = rawData.slice(1);

      return (
        <div className="overflow-x-auto pr-2 space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h4 className="text-lg font-semibold text-yellow-400">ניתוח חלקי - דוח רווח והפסד</h4>
            </div>
            <p className="text-sm text-horizon-accent">
              המערכת לא הצליחה לנתח את דוח רווח והפסד באופן מלא. מוצגים נתונים כפי שהם הופיעו בקובץ המקור.
              מומלץ להעלות קובץ בפורמט סטנדרטי יותר או לפנות לתמיכה.
            </p>
          </div>
          
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-primary">נתוני דוח רווח והפסד (גולמיים)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="min-w-full">
                <TableHeader className="bg-horizon-card">
                  <TableRow>
                    {headers.map((header, index) => (
                      <TableHead key={index} className="px-4 py-2 text-right text-horizon-text font-bold">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="border-b border-horizon-border last:border-0 hover:bg-horizon-card/50">
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="px-4 py-2 text-right text-horizon-accent text-sm">
                          {typeof cell === 'number' ? cell.toLocaleString('he-IL') : (cell || '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 100 && (
                <p className="text-sm text-horizon-accent mt-4 text-center">
                  מוצגות 100 שורות ראשונות מתוך {rows.length} שורות סה"כ
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    // ORIGINAL LOGIC FOR FULL AI-PARSED REPORTS
    // בודק שיש נתונים אמיתיים — לא רק אובייקטים ריקים/null
    const fs = reportData.financial_summary || {};
    const revenue = fs.total_revenue?.amount ?? fs.total_revenue;
    const netProfit = fs.net_profit?.amount ?? fs.net_profit;
    const hasRealData = revenue != null || netProfit != null;

    if (!reportData.report_metadata || !reportData.financial_summary || !hasRealData) {
      return (
        <div className="text-center py-10">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-semibold text-horizon-text mb-2">לא ניתן היה לחלץ נתונים מהקובץ</h3>
          <p className="text-horizon-accent mb-4">
            ה-AI לא הצליח לקרוא נתונים פיננסיים מהקובץ. ייתכן שה-PDF סרוק (תמונה) ולא טקסט.
          </p>
          <p className="text-sm text-horizon-accent">
            המלצה: העלה קובץ Excel / CSV, או PDF שנוצר דיגיטלית (לא סריקה).
          </p>
        </div>
      );
    }

    // Extract financial data with fallbacks (for full AI-parsed reports)
    const metadata = reportData.report_metadata || {};
    const financialSummary = reportData.financial_summary || {};
    const profitabilityRatios = reportData.profitability_ratios || {};
    const alertsAndInsights = reportData.alerts_and_insights || {};
    const revenueAnalysis = reportData.revenue_analysis || {};
    const costStructure = reportData.cost_structure_analysis || {};
    const annualProjections = reportData.annual_projections || {};
    const expenseEfficiency = reportData.expense_efficiency_analysis || {};
    const kpis = reportData.key_performance_indicators || {};

    // תמיכה בשני מבני שמות שדות: balance_sheet ו-P&L (detailedProfitLossSchema)
    const keyInsights = reportData.key_insights
      || alertsAndInsights.cost_alerts
      || alertsAndInsights.efficiency_insights
      || [];
    const positiveInights = alertsAndInsights.positive_trends
      || alertsAndInsights.growth_opportunities
      || [];
    const attentionAreas = alertsAndInsights.areas_for_attention
      || alertsAndInsights.risk_factors
      || [];
    const recommendations = alertsAndInsights.recommendations
      || alertsAndInsights.efficiency_insights
      || [];

    // מחלץ ערך מספרי — תומך גם ב-{amount: N} וגם ב-N ישיר
    const getAmount = (field) => {
      if (field == null) return null;
      if (typeof field === 'object') return field.amount ?? null;
      return typeof field === 'number' ? field : null;
    };
    const fmt = (field) => {
      const val = getAmount(field);
      return val != null ? currencyFormatter.format(val) : '—';
    };

    return (
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {/* Financial Summary Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isProfitLoss ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          {getAmount(financialSummary.total_revenue) != null && (
            <StatCard 
              title="סך הכנסות" 
              value={fmt(financialSummary.total_revenue)} 
              icon={DollarSign} 
              color="green" 
            />
          )}
          
          {getAmount(financialSummary.total_expenses) != null && (
            <StatCard 
              title="סך הוצאות" 
              value={fmt(financialSummary.total_expenses)} 
              icon={TrendingUp} 
              color="red" 
            />
          )}

          {getAmount(financialSummary.gross_profit) != null && (
            <StatCard 
              title="רווח גולמי" 
              value={fmt(financialSummary.gross_profit)} 
              icon={PieChart} 
              color="blue"
              description={`${formatMarginPercentage(profitabilityRatios.gross_margin || profitabilityRatios.gross_profit_margin || 0)}% מההכנסות`}
            />
          )}

          {getAmount(financialSummary.net_profit) != null && (
            <StatCard 
              title="רווח נקי" 
              value={fmt(financialSummary.net_profit)} 
              icon={(getAmount(financialSummary.net_profit) ?? 0) >= 0 ? TrendingUp : TrendingDown} 
              color={(getAmount(financialSummary.net_profit) ?? 0) >= 0 ? "green" : "red"}
              description={`${formatMarginPercentage(profitabilityRatios.net_margin || profitabilityRatios.net_profit_margin || 0)}% מההכנסות`}
            />
          )}
        </div>

        {/* Profitability Ratios — תומך בשני schema: balance_sheet ו-P&L */}
        {(() => {
          const gross = profitabilityRatios.gross_profit_margin ?? profitabilityRatios.gross_margin;
          const operating = profitabilityRatios.operating_profit_margin ?? profitabilityRatios.operating_margin;
          const net = profitabilityRatios.net_profit_margin ?? profitabilityRatios.net_margin;
          if (!gross && !operating && !net) return null;
          return (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-horizon-primary">
                  <BarChart /> יחסי רווחיות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {gross != null && (
                    <div className="text-center p-3 bg-horizon-card rounded-lg">
                      <p className="text-2xl font-bold text-green-400">
                        {formatMarginPercentage(gross)}%
                      </p>
                      <p className="text-sm text-horizon-accent">רווח גולמי</p>
                    </div>
                  )}
                  {operating != null && (
                    <div className="text-center p-3 bg-horizon-card rounded-lg">
                      <p className="text-2xl font-bold text-blue-400">
                        {formatMarginPercentage(operating)}%
                      </p>
                      <p className="text-sm text-horizon-accent">רווח תפעולי</p>
                    </div>
                  )}
                  {net != null && (
                    <div className="text-center p-3 bg-horizon-card rounded-lg">
                      <p className="text-2xl font-bold text-purple-400">
                        {formatMarginPercentage(net)}%
                      </p>
                      <p className="text-sm text-horizon-accent">רווח נקי</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Expense Breakdown */}
        {financialSummary.total_expenses?.breakdown && (
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-horizon-primary">
                <PieChart /> פירוט הוצאות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(financialSummary.total_expenses.breakdown).map(([key, value]) => {
                  if (!value || value === 0) return null;
                  const label = {
                    cost_of_goods_sold: 'עלות המכר',
                    operating_expenses: 'הוצאות תפעול',
                    vehicle_expenses: 'הוצאות רכב',
                    salary_expenses: 'הוצאות שכר',
                    financing_expenses: 'הוצאות מימון'
                  }[key] || key;
                  
                  return (
                    <div key={key} className="flex justify-between items-center p-3 bg-horizon-card rounded-lg">
                      <span className="text-horizon-text font-medium">{label}</span>
                      <span className="text-horizon-primary font-bold">
                        {currencyFormatter.format(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insights & Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Insights */}
          {keyInsights.length > 0 && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-horizon-primary">
                  <Lightbulb /> תובנות מפתח
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 list-disc list-inside text-horizon-accent">
                  {keyInsights.map((insight, idx) => (
                    <li key={idx} className="text-sm">{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Positive Trends */}
          {positiveInights.length > 0 && (
            <Card className="card-horizon border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <CheckCircle /> מגמות חיוביות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 list-disc list-inside text-horizon-accent">
                  {positiveInights.map((trend, idx) => (
                    <li key={idx} className="text-sm">{trend}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Areas for Attention */}
        {attentionAreas.length > 0 && (
          <Card className="card-horizon border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle /> תחומים לתשומת לב
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc list-inside text-horizon-accent">
                {attentionAreas.map((area, idx) => (
                  <li key={idx} className="text-sm">{area}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card className="card-horizon border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <TrendingUp /> המלצות לפעולה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc list-inside text-horizon-accent">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm">{rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* NEW: Detailed sections for P&L reports */}
        {isProfitLoss && (
          <>
            {/* KPIs & Annual Projections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="card-horizon">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-horizon-primary"><Target /> מדדי ביצוע מרכזיים (KPIs)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {kpis.monthly_burn_rate && <div className="flex justify-between"><span>קצב שריפת מזומנים חודשי:</span><Badge variant="secondary">{currencyFormatter.format(kpis.monthly_burn_rate)}</Badge></div>}
                    {kpis.break_even_revenue && <div className="flex justify-between"><span>הכנסה נדרשת לאיזון:</span><Badge variant="secondary">{currencyFormatter.format(kpis.break_even_revenue)}</Badge></div>}
                  </CardContent>
                </Card>
                 <Card className="card-horizon">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-horizon-primary"><ArrowUpRight /> תחזיות שנתיות</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     {annualProjections.projected_revenue && <div className="flex justify-between"><span>הכנסות צפויות:</span><Badge variant="secondary">{currencyFormatter.format(annualProjections.projected_revenue)}</Badge></div>}
                     {annualProjections.projected_gross_profit && <div className="flex justify-between"><span>רווח גולמי צפוי:</span><Badge variant="secondary">{currencyFormatter.format(annualProjections.projected_gross_profit)}</Badge></div>}
                     {annualProjections.projected_net_profit !== undefined && <div className={`flex justify-between ${annualProjections.projected_net_profit < 0 ? 'text-red-400' : 'text-green-400'}`}><span>רווח נקי צפוי:</span><Badge variant={annualProjections.projected_net_profit < 0 ? 'destructive' : 'default'}>{currencyFormatter.format(annualProjections.projected_net_profit)}</Badge></div>}
                  </CardContent>
                </Card>
            </div>

             {/* Expense Efficiency */}
            <Card className="card-horizon">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-horizon-primary"><SlidersHorizontal /> יעילות הוצאות (% מההכנסות)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {expenseEfficiency.salary_to_revenue_ratio !== undefined && <div className="text-center p-2 rounded-lg bg-horizon-card/50"><h4>שכר</h4><p className="font-bold text-lg text-blue-400">{formatMarginPercentage(expenseEfficiency.salary_to_revenue_ratio)}%</p></div>}
                      {expenseEfficiency.admin_to_revenue_ratio !== undefined && <div className="text-center p-2 rounded-lg bg-horizon-card/50"><h4>הנהלה וכלליות</h4><p className="font-bold text-lg text-yellow-400">{formatMarginPercentage(expenseEfficiency.admin_to_revenue_ratio)}%</p></div>}
                      {expenseEfficiency.financing_cost_ratio !== undefined && <div className="text-center p-2 rounded-lg bg-horizon-card/50"><h4>מימון</h4><p className="font-bold text-lg text-purple-400">{formatMarginPercentage(expenseEfficiency.financing_cost_ratio)}%</p></div>}
                      {costStructure?.cost_of_goods_sold?.percentage_of_revenue !== undefined && <div className="text-center p-2 rounded-lg bg-horizon-card/50"><h4>עלות מכר</h4><p className="font-bold text-lg text-red-400">{formatMarginPercentage(costStructure.cost_of_goods_sold.percentage_of_revenue)}%</p></div>}
                  </div>
                </CardContent>
            </Card>
          </>
        )}

        {/* Report Metadata */}
        {(metadata.company_name || metadata.generated_date || metadata.currency) && (
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-primary">פרטי הדוח</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {metadata.company_name && (
                  <div>
                    <span className="text-horizon-accent">חברה: </span>
                    <span className="text-horizon-text font-medium">{metadata.company_name}</span>
                  </div>
                )}
                {metadata.generated_date && (
                   <div>
                     <span className="text-horizon-accent">תאריך יצירה: </span>
                     <span className="text-horizon-text font-medium">{metadata.generated_date ? (new Date(metadata.generated_date).getTime() ? new Date(metadata.generated_date).toLocaleDateString('he-IL') : metadata.generated_date) : 'לא זמין'}</span>
                   </div>
                 )}
                {metadata.currency && (
                  <div>
                    <span className="text-horizon-accent">מטבע: </span>
                    <span className="text-horizon-text font-medium">{metadata.currency}</span>
                  </div>
                )}
                {metadata.period?.period_description && (
                  <div>
                    <span className="text-horizon-accent">תקופת הדוח: </span>
                    <span className="text-horizon-text font-medium">{metadata.period.period_description}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
          <div>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <BarChart className="text-horizon-primary" />
              {reportTitle}
            </DialogTitle>
            <DialogDescription className="text-horizon-accent">
              {reportData?.analysis_notes || "נתוני הדוח מנותחים על ידי AI ומספקים תובנות עסקיות."}
            </DialogDescription>
          </div>
          {localFileData?.status === 'analyzed' && localFileData?.ai_insights && (
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeeperInsightsModal(true)}
                  className="text-horizon-accent border-horizon-primary/50 hover:text-horizon-primary hover:bg-horizon-primary/10"
              >
                  <Sparkles className="w-4 h-4 ml-2" /> תובנות נוספות
              </Button>
          )}
        </DialogHeader>
        
        {renderContent()}

        <DialogFooter className="pt-4 border-t border-horizon">
          <Button onClick={onClose} className="btn-horizon-primary">
            סגור
          </Button>
        </DialogFooter>

        {showDeeperInsightsModal && localFileData && (
            <DeeperInsightsModal
                isOpen={showDeeperInsightsModal}
                onClose={() => setShowDeeperInsightsModal(false)}
                fileData={localFileData}
                onInsightsUpdated={handleInsightsUpdated}
            />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FinancialReportViewer;