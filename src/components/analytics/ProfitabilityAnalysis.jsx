import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ProfitabilityAnalysis({ categorizedProducts, products = [], hasZReports = true }) {
  const { profitable, controversial, unprofitable, unknown } = categorizedProducts;

  const pieData = [
    { name: 'רווחיים (>25%)', value: profitable.length, color: '#48BB78' },
    { name: 'שנויים במחלוקת (15-25%)', value: controversial.length, color: '#fc9f67' },
    { name: 'לא רווחיים (<15%)', value: unprofitable.length, color: '#FC8181' },
    { name: 'חסרים נתונים', value: unknown.length, color: '#718096' }
  ];

  const formatCurrency = (value) => {
    if (!value) return '₪0';
    return `₪${Math.round(value).toLocaleString()}`;
  };

  const topUnprofitable = unprofitable
    .sort((a, b) => (b.monthly_sales || 0) - (a.monthly_sales || 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* סיכום כללי */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{profitable.length}</div>
            <div className="text-sm text-green-300 mt-1">מוצרים רווחיים</div>
            <div className="text-xs text-horizon-accent mt-2">רווח מעל 25%</div>
          </CardContent>
        </Card>
        
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{controversial.length}</div>
            <div className="text-sm text-yellow-300 mt-1">שנויים במחלוקת</div>
            <div className="text-xs text-horizon-accent mt-2">רווח 15-25%</div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{unprofitable.length}</div>
            <div className="text-sm text-red-300 mt-1">לא רווחיים</div>
            <div className="text-xs text-horizon-accent mt-2">רווח מתחת ל-15%</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-500/10 border-gray-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-gray-400">{unknown.length}</div>
            <div className="text-sm text-gray-300 mt-1">חסרים נתונים</div>
            <div className="text-xs text-horizon-accent mt-2">נדרש עדכון מחירים</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-horizon-primary" />
              התפלגות רווחיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--horizon-dark)',
                    border: '1px solid var(--horizon-border)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 10 מוצרים לא רווחיים */}
        <Card className="card-horizon border-r-4 border-r-red-500">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              מוצרים לא רווחיים - דורשים תשומת לב
            </CardTitle>
            <p className="text-sm text-horizon-accent mt-1">
              מוצרים עם רווח נמוך שנמכרים הרבה
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topUnprofitable.length > 0 ? (
                topUnprofitable.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-horizon-text text-sm">{product.product_name}</div>
                      <div className="text-xs text-horizon-accent mt-1">
                        {product.monthly_sales?.toLocaleString() || 0} יח' חודשיות
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-red-400 font-bold">
                        {product.profitMargin?.toFixed(1) || '0'}%
                      </div>
                      <div className="text-xs text-horizon-accent">רווח</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-horizon-accent">
                  אין מוצרים לא רווחיים - מצוין! 🎉
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* מוצרים רווחיים - Top 5 */}
      <Card className="card-horizon border-r-4 border-r-green-500">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            💎 המוצרים הרווחיים ביותר
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profitable.slice(0, 6).map((product, idx) => (
              <div key={idx} className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="font-bold text-horizon-text mb-2">{product.product_name}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-horizon-accent">רווח:</span>
                    <span className="text-green-400 font-bold">{product.profitMargin?.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-horizon-accent">מכירות:</span>
                    <span className="text-horizon-text">{product.monthly_sales?.toLocaleString() || 0} יח'</span>
                  </div>
                  {product.selling_price && (
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">מחיר:</span>
                      <span className="text-horizon-text">₪{product.selling_price.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}