import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { AlertTriangle, TrendingUp, Landmark, PiggyBank, HandCoins } from "lucide-react";

export default function BalanceSheetViewer({ reportData }) {
  
  // התאמה למבנה ai_insights - גישה ישירה לשדות ללא parsed_data
  const reportMetadata = reportData?.report_metadata;
  const balanceSheetSummary = reportData?.balance_sheet_summary;
  const assets = reportData?.assets;
  const liabilities = reportData?.liabilities;
  const equity = reportData?.equity;
  const financialRatios = reportData?.financial_ratios;
  const alertsAndInsights = reportData?.alerts_and_insights;

  if (!reportData || !balanceSheetSummary) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-horizon-accent" />
          <h3 className="text-lg font-medium text-horizon-text mb-2">לא ניתן להציג דוח מאזן</h3>
          <p className="text-horizon-accent">הדוח לא מכיל מידע פיננסי מובנה של מאזן.</p>
        </CardContent>
      </Card>
    );
  }

  const renderCategory = (title, items, icon) => {
    const Icon = icon;
    return (
      <Card className="card-horizon flex-1">
        <CardHeader>
          <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
            <Icon className="w-5 h-5 text-horizon-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {items?.map((item, index) => (
              <li key={index} className="flex justify-between items-center text-sm">
                <span className="text-horizon-accent">{item.item}</span>
                <span className="font-mono text-horizon-text">{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-horizon-text mb-2">
                מאזן בוחן
              </CardTitle>
              <p className="text-horizon-accent">
                {reportMetadata?.company_name || 'שם החברה לא זמין'} • {reportMetadata?.period?.period_description || 'תקופה לא זמינה'}
              </p>
            </div>
            <div className="text-left">
              <Badge variant="outline" className="bg-horizon-primary/10 text-horizon-primary border-horizon-primary">
                {reportMetadata?.report_type || 'מאזן'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-horizon-accent">סך הנכסים</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(balanceSheetSummary?.total_assets)}</p>
          </CardContent>
        </Card>
        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-horizon-accent">סך ההתחייבויות</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(balanceSheetSummary?.total_liabilities)}</p>
          </CardContent>
        </Card>
        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-horizon-accent">הון עצמי</p>
            <p className="text-2xl font-bold text-horizon-text">{formatCurrency(balanceSheetSummary?.total_equity)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="flex flex-col md:flex-row gap-6">
        {assets && renderCategory("נכסים", assets, Landmark)}
        {liabilities && renderCategory("התחייבויות", liabilities, HandCoins)}
        {equity && renderCategory("הון עצמי", equity, PiggyBank)}
      </div>

       {/* Alerts and Insights */}
       {alertsAndInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                נקודות לתשומת לב
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
                תובנות מרכזיות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc pr-5 text-horizon-accent">
                {alertsAndInsights.key_insights?.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}