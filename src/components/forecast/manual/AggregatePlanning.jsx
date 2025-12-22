import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Percent, DollarSign, Calculator, Lightbulb } from "lucide-react";
import { formatCurrency } from './utils/numberFormatter';

export default function AggregatePlanning({ forecastData, onUpdateForecast }) {
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  
  const avgCogsPercentage = forecastData.average_cogs_percentage || 0;
  const monthlyRevenues = forecastData.planned_monthly_revenue_aggregate || Array(12).fill(0);

  const handleCogsChange = (newPercentage) => {
    onUpdateForecast({
      average_cogs_percentage: parseFloat(newPercentage) || 0
    });
  };

  const handleRevenueChange = (monthIndex, value) => {
    const updated = [...monthlyRevenues];
    updated[monthIndex] = parseFloat(value) || 0;
    onUpdateForecast({
      planned_monthly_revenue_aggregate: updated
    });
  };

  // חישוב סיכומים
  const totals = monthlyRevenues.reduce((acc, revenue) => {
    const cogs = revenue * (avgCogsPercentage / 100);
    const grossProfit = revenue - cogs;
    
    return {
      revenue: acc.revenue + revenue,
      cogs: acc.cogs + cogs,
      grossProfit: acc.grossProfit + grossProfit
    };
  }, { revenue: 0, cogs: 0, grossProfit: 0 });

  const avgMargin = totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100) : 0;

  return (
    <div className="space-y-6" dir="rtl">
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <Lightbulb className="h-5 w-5 text-blue-400" />
        <AlertDescription className="text-horizon-text">
          <strong>תכנון מכירות כללי</strong> מתאים לעסקים עם קטלוג גדול (מעל 50 מוצרים).
          במקום לתכנן כל מוצר בנפרד, תגדיר מחזור מכירות חודשי ואחוז עלות גלם ממוצע.
        </AlertDescription>
      </Alert>

      {/* הגדרת אחוז עלות גלם */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Percent className="w-5 h-5 text-orange-400" />
            הגדרת עלות גלם ממוצעת
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-horizon-text mb-2 block font-semibold">אחוז עלות גלם ממוצעת *</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={avgCogsPercentage}
                  onChange={(e) => handleCogsChange(e.target.value)}
                  placeholder="30"
                  min="0"
                  max="100"
                  step="0.1"
                  className="bg-horizon-card border-orange-400/30 text-horizon-text h-12 text-lg pr-10 font-bold"
                />
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />
              </div>
              <p className="text-xs text-horizon-accent mt-2">
                לדוגמה: אם עלות הגלם בממוצע היא 30% מההכנסה - הזן 30
              </p>
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-xs text-green-300 mb-1">מחזור שנתי</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(totals.revenue, 0)}</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                <p className="text-xs text-orange-300 mb-1">עלות גלם שנתית</p>
                <p className="text-xl font-bold text-orange-400">{formatCurrency(totals.cogs, 0)}</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-300 mb-1">רווח גולמי שנתי</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(totals.grossProfit, 0)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-horizon-card/30 border border-horizon rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-horizon-text font-medium">שולי רווח גולמי ממוצעים:</span>
            <Badge className="bg-blue-500/20 text-blue-400 text-lg px-3 py-1">
              {avgMargin.toFixed(1)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* מחזור חודשי */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-horizon-primary" />
            מחזור מכירות חודשי מתוכנן
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {monthNames.map((monthName, idx) => {
              const revenue = monthlyRevenues[idx] || 0;
              const cogs = revenue * (avgCogsPercentage / 100);
              const grossProfit = revenue - cogs;
              
              return (
                <div key={idx} className="space-y-2">
                  <Label className="text-horizon-text text-sm font-medium">{monthName}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={revenue || ''}
                      onChange={(e) => handleRevenueChange(idx, e.target.value)}
                      placeholder="0"
                      className="bg-horizon-card border-horizon text-horizon-text h-10 pr-7 font-semibold"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-horizon-accent pointer-events-none">₪</span>
                  </div>
                  {revenue > 0 && (
                    <div className="text-xs space-y-0.5">
                      <p className="text-orange-400">עלות: {formatCurrency(cogs, 0)}</p>
                      <p className="text-green-400">רווח: {formatCurrency(grossProfit, 0)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}