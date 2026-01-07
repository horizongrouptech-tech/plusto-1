import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatCurrency, formatPercentage } from './utils/numberFormatter';

export default function ForecastSensitivityAnalysis({ forecastData }) {
  // תרחישים - שינויים באחוזים
  const [revenueChange, setRevenueChange] = useState(0); // -50% עד +50%
  const [cogsChange, setCogsChange] = useState(0);
  const [expensesChange, setExpensesChange] = useState(0);

  // חישוב השפעה
  const analysis = useMemo(() => {
    const baseRevenue = forecastData.summary?.total_revenue || 0;
    const baseCogs = forecastData.summary?.total_cogs || 0;
    const baseExpenses = forecastData.summary?.total_expenses || 0;
    const baseNetProfit = forecastData.summary?.net_profit || 0;

    const newRevenue = baseRevenue * (1 + revenueChange / 100);
    const newCogs = baseCogs * (1 + cogsChange / 100);
    const newExpenses = baseExpenses * (1 + expensesChange / 100);

    const newGrossProfit = newRevenue - newCogs;
    const newOperatingProfit = newGrossProfit - newExpenses;
    const taxRate = (forecastData.tax_rate || 23) / 100;
    const newNetProfit = newOperatingProfit * (1 - taxRate);

    const profitChange = newNetProfit - baseNetProfit;
    const profitChangePercentage = baseNetProfit !== 0 ? (profitChange / baseNetProfit) * 100 : 0;

    return {
      baseRevenue,
      baseCogs,
      baseExpenses,
      baseNetProfit,
      newRevenue,
      newCogs,
      newExpenses,
      newGrossProfit,
      newNetProfit,
      profitChange,
      profitChangePercentage
    };
  }, [forecastData, revenueChange, cogsChange, expensesChange]);

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          ניתוח רגישות - מה אם?
        </CardTitle>
        <p className="text-sm text-horizon-accent mt-2">
          בדוק איך שינויים בהכנסות, עלויות או הוצאות משפיעים על הרווח הנקי
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* בקרות */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-horizon-text">שינוי בהכנסות</Label>
              <Badge variant="outline" className={revenueChange > 0 ? 'border-green-400 text-green-400' : revenueChange < 0 ? 'border-red-400 text-red-400' : 'border-horizon text-horizon-accent'}>
                {revenueChange > 0 ? '+' : ''}{revenueChange}%
              </Badge>
            </div>
            <Slider
              value={[revenueChange]}
              onValueChange={(val) => setRevenueChange(val[0])}
              min={-50}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-horizon-accent mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-horizon-text">שינוי בעלות מכר</Label>
              <Badge variant="outline" className={cogsChange > 0 ? 'border-red-400 text-red-400' : cogsChange < 0 ? 'border-green-400 text-green-400' : 'border-horizon text-horizon-accent'}>
                {cogsChange > 0 ? '+' : ''}{cogsChange}%
              </Badge>
            </div>
            <Slider
              value={[cogsChange]}
              onValueChange={(val) => setCogsChange(val[0])}
              min={-50}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-horizon-accent mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-horizon-text">שינוי בהוצאות</Label>
              <Badge variant="outline" className={expensesChange > 0 ? 'border-red-400 text-red-400' : expensesChange < 0 ? 'border-green-400 text-green-400' : 'border-horizon text-horizon-accent'}>
                {expensesChange > 0 ? '+' : ''}{expensesChange}%
              </Badge>
            </div>
            <Slider
              value={[expensesChange]}
              onValueChange={(val) => setExpensesChange(val[0])}
              min={-50}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-horizon-accent mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>
        </div>

        {/* תוצאות */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-horizon">
          <div className="space-y-3">
            <h4 className="font-semibold text-horizon-text text-sm">מצב בסיס:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-horizon-accent">הכנסות:</span>
                <span className="text-horizon-text">{formatCurrency(analysis.baseRevenue, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-horizon-accent">עלות מכר:</span>
                <span className="text-red-400">{formatCurrency(analysis.baseCogs, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-horizon-accent">הוצאות:</span>
                <span className="text-red-400">{formatCurrency(analysis.baseExpenses, 0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-horizon font-bold">
                <span className="text-horizon-text">רווח נקי:</span>
                <span className="text-green-400">{formatCurrency(analysis.baseNetProfit, 0)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-horizon-text text-sm">תרחיש חדש:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-horizon-accent">הכנסות:</span>
                <span className="text-horizon-text">{formatCurrency(analysis.newRevenue, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-horizon-accent">עלות מכר:</span>
                <span className="text-red-400">{formatCurrency(analysis.newCogs, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-horizon-accent">הוצאות:</span>
                <span className="text-red-400">{formatCurrency(analysis.newExpenses, 0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-horizon font-bold">
                <span className="text-horizon-text">רווח נקי:</span>
                <span className={analysis.newNetProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(analysis.newNetProfit, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* השפעה על רווח */}
        <div className={`p-4 rounded-xl border-2 ${
          analysis.profitChange > 0 
            ? 'bg-green-500/10 border-green-500/30' 
            : analysis.profitChange < 0 
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-horizon-card/30 border-horizon'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {analysis.profitChange > 0 ? (
                <TrendingUp className="w-6 h-6 text-green-400" />
              ) : analysis.profitChange < 0 ? (
                <TrendingDown className="w-6 h-6 text-red-400" />
              ) : null}
              <div>
                <p className="text-sm text-horizon-accent">השפעה על רווח נקי:</p>
                <p className={`text-2xl font-bold ${
                  analysis.profitChange > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {analysis.profitChange > 0 ? '+' : ''}{formatCurrency(analysis.profitChange, 0)}
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm text-horizon-accent">שינוי באחוזים:</p>
              <p className={`text-2xl font-bold ${
                analysis.profitChangePercentage > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {analysis.profitChangePercentage > 0 ? '+' : ''}{analysis.profitChangePercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* תובנות */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-400 mb-2 text-sm">💡 תובנות:</h4>
          <ul className="text-xs text-horizon-accent space-y-1">
            {revenueChange !== 0 && (
              <li>• שינוי של {revenueChange}% בהכנסות משנה את הרווח ב-{formatCurrency(Math.abs(analysis.profitChange), 0)}</li>
            )}
            {Math.abs(analysis.profitChangePercentage) > 20 && (
              <li className="text-yellow-400">• ⚠️ שינוי משמעותי ברווחיות - יש לבחון היטב</li>
            )}
            {analysis.newNetProfit < 0 && (
              <li className="text-red-400">• 🚨 בתרחיש זה העסק בהפסד - יש לשקול התאמות</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}