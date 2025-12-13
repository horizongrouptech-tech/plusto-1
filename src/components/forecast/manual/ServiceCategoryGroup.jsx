import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, TrendingUp, DollarSign, Percent, ShoppingCart, Package } from 'lucide-react';
import { formatCurrency, formatNumber } from './utils/numberFormatter';

export default function ServiceCategoryGroup({ 
  categoryName, 
  services, 
  salesData, 
  monthNames,
  onUpdateQuantity,
  startIndex 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // חישוב סטטיסטיקות הקטגוריה
  const calculateCategoryStats = () => {
    let totalPlannedRevenue = 0;
    let totalActualRevenue = 0;
    let totalPlannedQuantity = 0;
    let totalActualQuantity = 0;

    services.forEach((service, serviceIdx) => {
      const serviceData = salesData[startIndex + serviceIdx];
      if (serviceData) {
        totalPlannedRevenue += serviceData.planned_monthly_revenue.reduce((sum, val) => sum + val, 0);
        totalActualRevenue += serviceData.actual_monthly_revenue.reduce((sum, val) => sum + val, 0);
        totalPlannedQuantity += serviceData.planned_monthly_quantities.reduce((sum, val) => sum + val, 0);
        totalActualQuantity += serviceData.actual_monthly_quantities.reduce((sum, val) => sum + val, 0);
      }
    });

    const avgPrice = totalPlannedQuantity > 0 ? totalPlannedRevenue / totalPlannedQuantity : 0;
    const avgCost = services.length > 0 
      ? services.reduce((sum, s) => {
          const totalCost = (s.costs || []).reduce((cSum, c) => cSum + (c.amount || 0), 0);
          return sum + totalCost;
        }, 0) / services.length 
      : 0;
    
    const avgProfit = avgPrice - avgCost;
    const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;

    return {
      totalPlannedRevenue,
      totalActualRevenue,
      totalPlannedQuantity,
      totalActualQuantity,
      avgPrice,
      avgCost,
      avgProfit,
      avgMargin,
      productCount: services.length
    };
  };

  const stats = calculateCategoryStats();

  return (
    <Card className="card-horizon">
      <CardHeader 
        className="cursor-pointer hover:bg-horizon-card/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
            <div>
              <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-horizon-primary" />
                {categoryName || 'ללא קטגוריה'}
              </CardTitle>
              <p className="text-sm text-horizon-accent mt-1">
                {stats.productCount} מוצרים/שירותים
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">הכנסות מתוכננות</span>
              </div>
              <div className="text-lg font-bold text-horizon-text">
                {formatCurrency(stats.totalPlannedRevenue, 0)}
              </div>
              <div className="text-xs text-horizon-accent">
                {formatNumber(stats.totalPlannedQuantity)} יח'
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">הכנסות בפועל</span>
              </div>
              <div className="text-lg font-bold text-horizon-text">
                {formatCurrency(stats.totalActualRevenue, 0)}
              </div>
              <div className="text-xs text-horizon-accent">
                {formatNumber(stats.totalActualQuantity)} יח'
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">מחיר ממוצע</span>
              </div>
              <div className="text-lg font-bold text-horizon-text">
                {formatCurrency(stats.avgPrice, 0)}
              </div>
              <div className="text-xs text-horizon-accent">
                עלות: {formatCurrency(stats.avgCost, 0)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                <Percent className="w-4 h-4" />
                <span className="text-xs">מרווח ממוצע</span>
              </div>
              <div className={`text-lg font-bold ${stats.avgMargin >= 30 ? 'text-green-400' : stats.avgMargin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                {stats.avgMargin.toFixed(1)}%
              </div>
              <div className="text-xs text-horizon-accent">
                רווח: {formatCurrency(stats.avgProfit, 0)}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-4 border-t border-horizon">
          {services.map((service, serviceIdx) => {
            const serviceData = salesData[startIndex + serviceIdx];
            if (!serviceData) return null;

            return (
              <div key={serviceIdx} className="bg-horizon-card/20 border border-horizon rounded-lg p-4">
                <h4 className="font-semibold text-horizon-text mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-horizon-primary" />
                  {service.service_name}
                </h4>
                
                {/* תצוגת נתוני מוצר */}
                <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-horizon-dark/30 rounded-lg">
                  <div>
                    <span className="text-xs text-horizon-accent">מחיר מכירה:</span>
                    <div className="text-sm font-bold text-horizon-text">{formatCurrency(service.price || 0)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-horizon-accent">עלות:</span>
                    <div className="text-sm font-bold text-horizon-text">
                      {formatCurrency(service.calculated?.cost_of_sale || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-horizon-accent">רווח ליחידה:</span>
                    <div className="text-sm font-bold text-green-400">
                      {formatCurrency(service.calculated?.gross_profit || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-horizon-accent">מרווח:</span>
                    <div className={`text-sm font-bold ${
                      (service.calculated?.gross_margin_percentage || 0) >= 30 ? 'text-green-400' :
                      (service.calculated?.gross_margin_percentage || 0) >= 15 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {(service.calculated?.gross_margin_percentage || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* טבלת חודשים */}
                <div className="grid grid-cols-6 gap-3">
                  {monthNames.map((month, monthIndex) => (
                    <div key={monthIndex} className="space-y-2">
                      <Label className="text-xs text-horizon-accent block text-center">{month}</Label>
                      
                      {/* תכנון */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-blue-400">תכנון</Label>
                        <Input
                          type="number"
                          value={serviceData.planned_monthly_quantities[monthIndex]}
                          onChange={(e) => onUpdateQuantity(startIndex + serviceIdx, monthIndex, 'planned', e.target.value)}
                          className="bg-horizon-card border-blue-400/30 text-horizon-text text-sm h-8"
                          placeholder="0"
                        />
                        <div className="text-[10px] text-blue-400 text-center">
                          {formatCurrency(serviceData.planned_monthly_revenue[monthIndex], 0)}
                        </div>
                      </div>

                      {/* ביצוע */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-green-400">ביצוע</Label>
                        <Input
                          type="number"
                          value={serviceData.actual_monthly_quantities[monthIndex]}
                          onChange={(e) => onUpdateQuantity(startIndex + serviceIdx, monthIndex, 'actual', e.target.value)}
                          className="bg-horizon-card border-green-400/30 text-horizon-text text-sm h-8"
                          placeholder="0"
                        />
                        <div className="text-[10px] text-green-400 text-center">
                          {formatCurrency(serviceData.actual_monthly_revenue[monthIndex], 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}