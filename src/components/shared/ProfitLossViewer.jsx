import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatCurrency, formatLargeNumber } from "@/components/utils/currencyFormatter";
import { formatMarginPercentage } from "@/components/utils/formatMarginPercentage";

export default function ProfitLossViewer({ reportData }) {
  const [activeTab, setActiveTab] = useState('summary');

  // התאמה למבנה ai_insights - גישה ישירה לשדות ללא parsed_data
  const reportMetadata = reportData?.report_metadata;
  const financialSummary = reportData?.financial_summary;
  const revenueAnalysis = reportData?.revenue_analysis;
  const costStructureAnalysis = reportData?.cost_structure_analysis;
  const profitabilityRatios = reportData?.profitability_ratios;
  const alertsAndInsights = reportData?.alerts_and_insights;
  const annualProjections = reportData?.annual_projections;

  if (!reportData || !financialSummary) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-horizon-accent" />
          <h3 className="text-lg font-medium text-horizon-text mb-2">לא ניתן להציג דוח</h3>
          <p className="text-horizon-accent">הדוח לא מכיל מידע פיננסי מובנה</p>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (value) => {
    if (typeof value === 'number') {
      return formatLargeNumber(value);
    }
    return value || 'לא זמין';
  };

  const getChangeColor = (value) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-horizon-accent';
  };

  const getChangeIcon = (value) => {
    if (value > 0) return <TrendingUp className="w-4 h-4" />;
    if (value < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  const SummaryItem = ({ title, value, percentage, monthly, change, isCurrency = true }) => (
    <div className="bg-horizon-card/50 p-4 rounded-lg flex flex-col justify-between">
      <div>
        <p className="text-sm text-horizon-accent">{title}</p>
        <p className="text-2xl font-bold text-horizon-text mt-1">{isCurrency ? formatCurrency(value) : formatNumber(value)}</p>
      </div>
      <div className="text-xs text-horizon-accent mt-2 space-y-1">
        {percentage !== undefined && <div>{formatMarginPercentage(percentage)}% מההכנסות</div>}
        {monthly !== undefined && <div>ממוצע חודשי: {isCurrency ? formatCurrency(monthly) : formatNumber(monthly)}</div>}
        {change !== undefined && (
          <div className={`flex items-center gap-1 ${getChangeColor(change)}`}>
            {getChangeIcon(change)}
            <span>{change.toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-horizon-text mb-2">
                דוח רווח והפסד
              </CardTitle>
              <p className="text-horizon-accent">
                {reportMetadata?.company_name || 'שם החברה לא זמין'} • {reportMetadata?.period?.period_description || (reportMetadata?.period?.start_date && reportMetadata?.period?.end_date ? `${reportMetadata.period.start_date} - ${reportMetadata.period.end_date}` : 'תקופה לא זמינה')}
              </p>
            </div>
            <div className="text-left">
              <Badge variant="outline" className="bg-horizon-primary/10 text-horizon-primary border-horizon-primary">
                {reportMetadata?.report_type || 'דוח פיננסי'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryItem title="סך הכנסות" value={financialSummary.total_revenue.amount} monthly={financialSummary.total_revenue.monthly_average} />
        <SummaryItem title="רווח גולמי" value={financialSummary.gross_profit.amount} percentage={financialSummary.gross_profit.percentage_of_revenue} monthly={financialSummary.gross_profit.monthly_average} />
        <SummaryItem title="רווח תפעולי" value={financialSummary.operating_profit.amount} percentage={financialSummary.operating_profit.percentage_of_revenue} monthly={financialSummary.operating_profit.monthly_average} />
        <SummaryItem title="רווח נקי" value={financialSummary.net_profit.amount} percentage={financialSummary.net_profit.percentage_of_revenue} monthly={financialSummary.net_profit.monthly_average} />
      </div>

      {/* Alerts and Insights */}
      {alertsAndInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                התראות וגורמי סיכון
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc pr-5 text-horizon-accent">
                {alertsAndInsights.risk_factors?.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                הזדמנויות צמיחה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc pr-5 text-horizon-accent">
                {alertsAndInsights.growth_opportunities?.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}