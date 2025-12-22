import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Package, Star, Award, Crown } from "lucide-react";
import { formatCurrency, formatNumber } from './utils/numberFormatter';

export default function TopProductsInsights({ forecastData, startMonth, endMonth }) {
  const [topCount, setTopCount] = useState(10);
  const [activeTab, setActiveTab] = useState('sellers');

  // חישוב Best Sellers
  const bestSellers = useMemo(() => {
    if (!forecastData.sales_forecast_onetime || forecastData.sales_forecast_onetime.length === 0) {
      return [];
    }

    const monthStart = startMonth - 1;
    const monthEnd = endMonth;

    return forecastData.sales_forecast_onetime
      .map(item => {
        const totalQtyPlanned = item.planned_monthly_quantities
          .slice(monthStart, monthEnd)
          .reduce((sum, qty) => sum + (qty || 0), 0);
        
        const totalQtyActual = item.actual_monthly_quantities
          .slice(monthStart, monthEnd)
          .reduce((sum, qty) => sum + (qty || 0), 0);

        const totalRevenuePlanned = item.planned_monthly_revenue
          .slice(monthStart, monthEnd)
          .reduce((sum, rev) => sum + (rev || 0), 0);

        const totalRevenueActual = item.actual_monthly_revenue
          .slice(monthStart, monthEnd)
          .reduce((sum, rev) => sum + (rev || 0), 0);

        const totalQty = totalQtyActual > 0 ? totalQtyActual : totalQtyPlanned;
        const totalRevenue = totalRevenueActual > 0 ? totalRevenueActual : totalRevenuePlanned;

        return {
          service_name: item.service_name,
          total_quantity: totalQty,
          total_revenue: totalRevenue,
          isActual: totalQtyActual > 0
        };
      })
      .filter(item => item.total_quantity > 0)
      .sort((a, b) => b.total_quantity - a.total_quantity);
  }, [forecastData.sales_forecast_onetime, startMonth, endMonth]);

  // חישוב Most Profitable
  const mostProfitable = useMemo(() => {
    if (!forecastData.sales_forecast_onetime || forecastData.sales_forecast_onetime.length === 0) {
      return [];
    }

    const monthStart = startMonth - 1;
    const monthEnd = endMonth;

    return forecastData.sales_forecast_onetime
      .map(item => {
        const service = (forecastData.services || []).find(s => s.service_name === item.service_name);
        const unitProfit = service?.calculated?.gross_profit || 0;
        const unitMargin = service?.calculated?.gross_margin_percentage || 0;

        const totalQtyPlanned = item.planned_monthly_quantities
          .slice(monthStart, monthEnd)
          .reduce((sum, qty) => sum + (qty || 0), 0);
        
        const totalQtyActual = item.actual_monthly_quantities
          .slice(monthStart, monthEnd)
          .reduce((sum, qty) => sum + (qty || 0), 0);

        const totalQty = totalQtyActual > 0 ? totalQtyActual : totalQtyPlanned;
        const totalProfit = totalQty * unitProfit;

        return {
          service_name: item.service_name,
          total_quantity: totalQty,
          unit_profit: unitProfit,
          total_profit: totalProfit,
          margin_percentage: unitMargin,
          isActual: totalQtyActual > 0
        };
      })
      .filter(item => item.total_quantity > 0)
      .sort((a, b) => b.total_profit - a.total_profit);
  }, [forecastData.sales_forecast_onetime, forecastData.services, startMonth, endMonth]);

  // חישוב אחוזים מתוך הסכום הכולל
  const totalQuantitySold = bestSellers.reduce((sum, item) => sum + item.total_quantity, 0);
  const totalProfitGenerated = mostProfitable.reduce((sum, item) => sum + item.total_profit, 0);

  const topSellers = bestSellers.slice(0, topCount);
  const topProfitables = mostProfitable.slice(0, topCount);

  if (forecastData.use_aggregate_planning) {
    return (
      <Card className="card-horizon border-yellow-500/30">
        <CardContent className="p-6 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
          <p className="text-horizon-text font-medium mb-2">
            ניתוח מוצרים זמין רק בתכנון פרטני
          </p>
          <p className="text-sm text-horizon-accent">
            עבור ל"תכנון פרטני (מוצר מוצר)" בשלב 3 כדי לראות את המוצרים הכי נמכרים והרווחיים
          </p>
        </CardContent>
      </Card>
    );
  }

  if (bestSellers.length === 0) {
    return null;
  }

  return (
    <Card className="card-horizon border-2 border-horizon-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            ניתוח מוצרים מובילים
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-horizon-accent">הצג:</span>
            <Select value={topCount.toString()} onValueChange={(val) => setTopCount(parseInt(val))}>
              <SelectTrigger className="w-24 bg-horizon-card border-horizon text-horizon-text h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="15">Top 15</SelectItem>
                <SelectItem value="30">Top 30</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">Top 100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sellers" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              המוצרים הכי נמכרים
            </TabsTrigger>
            <TabsTrigger value="profitable" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              המוצרים הכי רווחיים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sellers">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div>
                  <p className="text-sm text-horizon-text font-semibold">סך הכל נמכר בתקופה:</p>
                  <p className="text-2xl font-bold text-blue-400">{formatNumber(totalQuantitySold)} יחידות</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-400" />
              </div>

              {topSellers.length === 0 ? (
                <div className="text-center py-8 text-horizon-accent">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  אין נתוני מכירות לתקופה זו
                </div>
              ) : (
                <div className="space-y-2">
                  {topSellers.map((item, idx) => {
                    const percentage = totalQuantitySold > 0 ? (item.total_quantity / totalQuantitySold * 100) : 0;
                    return (
                      <div
                        key={item.service_name}
                        className="bg-horizon-card/50 border border-horizon rounded-lg p-4 hover:border-blue-400/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge className={`${
                              idx === 0 ? 'bg-yellow-500 text-white' :
                              idx === 1 ? 'bg-gray-400 text-white' :
                              idx === 2 ? 'bg-orange-600 text-white' :
                              'bg-blue-500/20 text-blue-400'
                            } font-bold text-sm`}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </Badge>
                            <div>
                              <p className="font-semibold text-horizon-text">{item.service_name}</p>
                              {item.isActual && (
                                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs mt-1">
                                  נתוני ביצוע בפועל
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-blue-400">{formatNumber(item.total_quantity)}</p>
                            <p className="text-xs text-horizon-accent">יחידות</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex-1 bg-horizon-card rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-l from-blue-500 to-blue-400 h-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-blue-400 font-semibold mr-3">{percentage.toFixed(1)}%</span>
                        </div>
                        
                        <div className="mt-2 text-sm text-horizon-accent">
                          מחזור: {formatCurrency(item.total_revenue, 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profitable">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div>
                  <p className="text-sm text-horizon-text font-semibold">סך רווח גולמי בתקופה:</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(totalProfitGenerated, 0)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-400" />
              </div>

              {topProfitables.length === 0 ? (
                <div className="text-center py-8 text-horizon-accent">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  אין נתוני רווחיות לתקופה זו
                </div>
              ) : (
                <div className="space-y-2">
                  {topProfitables.map((item, idx) => {
                    const percentage = totalProfitGenerated > 0 ? (item.total_profit / totalProfitGenerated * 100) : 0;
                    return (
                      <div
                        key={item.service_name}
                        className="bg-horizon-card/50 border border-horizon rounded-lg p-4 hover:border-green-400/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge className={`${
                              idx === 0 ? 'bg-yellow-500 text-white' :
                              idx === 1 ? 'bg-gray-400 text-white' :
                              idx === 2 ? 'bg-orange-600 text-white' :
                              'bg-green-500/20 text-green-400'
                            } font-bold text-sm`}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </Badge>
                            <div>
                              <p className="font-semibold text-horizon-text">{item.service_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {item.isActual && (
                                  <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                    נתוני ביצוע בפועל
                                  </Badge>
                                )}
                                <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                                  שולי רווח: {item.margin_percentage.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-green-400">{formatCurrency(item.total_profit, 0)}</p>
                            <p className="text-xs text-horizon-accent">רווח גולמי</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex-1 bg-horizon-card rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-l from-green-500 to-green-400 h-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-green-400 font-semibold mr-3">{percentage.toFixed(1)}%</span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-horizon-accent">
                          <div>כמות: {formatNumber(item.total_quantity)} יח׳</div>
                          <div>רווח ליחידה: {formatCurrency(item.unit_profit, 0)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}