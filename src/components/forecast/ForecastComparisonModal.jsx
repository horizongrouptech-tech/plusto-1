import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowRight, Calendar } from "lucide-react";
import { formatCurrency, formatPercentage } from './manual/utils/numberFormatter';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ForecastComparisonModal({ isOpen, onClose, forecasts, customer }) {
  const [forecast1Id, setForecast1Id] = useState(null);
  const [forecast2Id, setForecast2Id] = useState(null);

  const forecast1 = forecasts?.find(f => f.id === forecast1Id);
  const forecast2 = forecasts?.find(f => f.id === forecast2Id);

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // חישוב נתונים להשוואה
  const comparisonData = useMemo(() => {
    if (!forecast1 || !forecast2) return null;

    const data = {
      summary: {
        revenue1: forecast1.summary?.total_revenue || 0,
        revenue2: forecast2.summary?.total_revenue || 0,
        netProfit1: forecast1.summary?.net_profit || 0,
        netProfit2: forecast2.summary?.net_profit || 0,
        grossProfit1: forecast1.summary?.gross_profit || 0,
        grossProfit2: forecast2.summary?.gross_profit || 0,
      },
      monthlyComparison: []
    };

    // השוואה חודשית
    for (let i = 0; i < 12; i++) {
      const month1 = forecast1.profit_loss_monthly?.[i];
      const month2 = forecast2.profit_loss_monthly?.[i];

      data.monthlyComparison.push({
        month: monthNames[i],
        revenue1: month1?.revenue || 0,
        revenue2: month2?.revenue || 0,
        netProfit1: month1?.net_profit || 0,
        netProfit2: month2?.net_profit || 0,
      });
    }

    return data;
  }, [forecast1, forecast2]);

  const getDifference = (val1, val2) => {
    const diff = val2 - val1;
    const percentage = val1 !== 0 ? ((diff / val1) * 100) : 0;
    return { diff, percentage };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-horizon-primary" />
            השוואת תחזיות עסקיות
          </DialogTitle>
          <p className="text-sm text-horizon-accent mt-2">
            {customer?.business_name || customer?.full_name} - בחר שתי תחזיות להשוואה
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* בחירת תחזיות */}
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-text text-base">בחירת תחזיות להשוואה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-horizon-text mb-2 block font-medium">תחזית ראשונה:</label>
                  <Select value={forecast1Id || ''} onValueChange={setForecast1Id}>
                    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר תחזית..." />
                    </SelectTrigger>
                    <SelectContent>
                      {forecasts?.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.forecast_name} ({f.forecast_year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-horizon-text mb-2 block font-medium">תחזית שנייה:</label>
                  <Select value={forecast2Id || ''} onValueChange={setForecast2Id}>
                    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר תחזית..." />
                    </SelectTrigger>
                    <SelectContent>
                      {forecasts?.filter(f => f.id !== forecast1Id).map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.forecast_name} ({f.forecast_year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* תוצאות השוואה */}
          {comparisonData && (
            <>
              {/* השוואת סיכומים */}
              <Card className="card-horizon">
                <CardHeader>
                  <CardTitle className="text-horizon-text">השוואת סיכומים שנתיים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {/* הכנסות */}
                    <div className="bg-horizon-card/30 border border-horizon rounded-xl p-4">
                      <p className="text-sm text-horizon-accent mb-3">סה"כ הכנסות</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-blue-400 text-blue-400">
                            {forecast1?.forecast_name}
                          </Badge>
                          <span className="font-bold text-horizon-text">
                            {formatCurrency(comparisonData.summary.revenue1, 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-horizon-accent" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-green-400 text-green-400">
                            {forecast2?.forecast_name}
                          </Badge>
                          <span className="font-bold text-horizon-text">
                            {formatCurrency(comparisonData.summary.revenue2, 0)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-horizon text-center">
                          {(() => {
                            const { diff, percentage } = getDifference(
                              comparisonData.summary.revenue1,
                              comparisonData.summary.revenue2
                            );
                            return (
                              <div className="flex items-center justify-center gap-2">
                                {diff > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-green-400" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-red-400" />
                                )}
                                <span className={diff > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {diff > 0 ? '+' : ''}{formatCurrency(diff, 0)} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* רווח גולמי */}
                    <div className="bg-horizon-card/30 border border-horizon rounded-xl p-4">
                      <p className="text-sm text-horizon-accent mb-3">רווח גולמי</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-blue-400 text-blue-400">
                            {forecast1?.forecast_name}
                          </Badge>
                          <span className="font-bold text-horizon-text">
                            {formatCurrency(comparisonData.summary.grossProfit1, 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-horizon-accent" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-green-400 text-green-400">
                            {forecast2?.forecast_name}
                          </Badge>
                          <span className="font-bold text-horizon-text">
                            {formatCurrency(comparisonData.summary.grossProfit2, 0)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-horizon text-center">
                          {(() => {
                            const { diff, percentage } = getDifference(
                              comparisonData.summary.grossProfit1,
                              comparisonData.summary.grossProfit2
                            );
                            return (
                              <div className="flex items-center justify-center gap-2">
                                {diff > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-green-400" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-red-400" />
                                )}
                                <span className={diff > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {diff > 0 ? '+' : ''}{formatCurrency(diff, 0)} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* רווח נקי */}
                    <div className="bg-horizon-card/30 border border-horizon rounded-xl p-4">
                      <p className="text-sm text-horizon-accent mb-3">רווח נקי</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-blue-400 text-blue-400">
                            {forecast1?.forecast_name}
                          </Badge>
                          <span className="font-bold text-horizon-text">
                            {formatCurrency(comparisonData.summary.netProfit1, 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-horizon-accent" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-green-400 text-green-400">
                            {forecast2?.forecast_name}
                          </Badge>
                          <span className="font-bold text-horizon-text">
                            {formatCurrency(comparisonData.summary.netProfit2, 0)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-horizon text-center">
                          {(() => {
                            const { diff, percentage } = getDifference(
                              comparisonData.summary.netProfit1,
                              comparisonData.summary.netProfit2
                            );
                            return (
                              <div className="flex items-center justify-center gap-2">
                                {diff > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-green-400" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-red-400" />
                                )}
                                <span className={diff > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {diff > 0 ? '+' : ''}{formatCurrency(diff, 0)} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* גרף השוואה חודשי */}
              <Card className="card-horizon">
                <CardHeader>
                  <CardTitle className="text-horizon-text flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-horizon-primary" />
                    השוואה חודשית - הכנסות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={comparisonData.monthlyComparison} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#374151', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fill: '#374151', fontSize: 12 }}
                        tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                        tickLine={false}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value, 0)}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '2px solid rgba(50, 172, 193, 0.3)',
                          borderRadius: '12px',
                          padding: '12px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue1" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name={forecast1.forecast_name}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue2" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        name={forecast2.forecast_name}
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* גרף השוואה - רווח נקי */}
              <Card className="card-horizon">
                <CardHeader>
                  <CardTitle className="text-horizon-text flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    השוואה חודשית - רווח נקי
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={comparisonData.monthlyComparison} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#374151', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fill: '#374151', fontSize: 12 }}
                        tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                        tickLine={false}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value, 0)}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '2px solid rgba(50, 172, 193, 0.3)',
                          borderRadius: '12px',
                          padding: '12px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="netProfit1" fill="#3b82f6" name={forecast1.forecast_name} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="netProfit2" fill="#10b981" name={forecast2.forecast_name} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {!forecast1 || !forecast2 ? (
            <div className="text-center py-12 text-horizon-accent">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>בחר שתי תחזיות כדי להתחיל בהשוואה</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}