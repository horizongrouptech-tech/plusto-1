import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NoZReportsPlaceholder from './NoZReportsPlaceholder';
import { RECHARTS_CONFIG, HORIZON_COLORS } from '@/components/utils/chartConfig';

export default function ProfitabilityAnalysis({ categorizedProducts, products = [], hasZReports = true }) {
  const { profitable, controversial, unprofitable, unknown } = categorizedProducts;

  const pieData = [
    { name: 'רווחיים (>25%)', value: profitable.length, color: HORIZON_COLORS.green },
    { name: 'שנויים במחלוקת (15-25%)', value: controversial.length, color: HORIZON_COLORS.secondary },
    { name: 'לא רווחיים (<15%)', value: unprofitable.length, color: HORIZON_COLORS.red },
    { name: 'חסרים נתונים', value: unknown.length, color: '#718096' }
  ];

  const handleExport = () => {
    const csvData = [
      ['קטגוריה', 'שם מוצר', 'אחוז רווח', 'מכירות חודשיות', 'מחיר מכירה'],
      ...profitable.map(p => ['רווחי', p.product_name, p.profitMargin?.toFixed(1), p.monthly_sales || 0, p.selling_price || 0]),
      ...controversial.map(p => ['שנוי', p.product_name, p.profitMargin?.toFixed(1), p.monthly_sales || 0, p.selling_price || 0]),
      ...unprofitable.map(p => ['לא רווחי', p.product_name, p.profitMargin?.toFixed(1), p.monthly_sales || 0, p.selling_price || 0])
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ניתוח_רווחיות_${new Date().toLocaleDateString('he-IL')}.csv`;
    link.click();
  };

  const topUnprofitable = unprofitable
    .sort((a, b) => (b.monthly_sales || 0) - (a.monthly_sales || 0))
    .slice(0, 10);

  // אם אין דוחות Z ורוב המוצרים ללא נתוני רווח
  if (!hasZReports && (profitable.length + controversial.length + unprofitable.length) < products.length * 0.3) {
    return <NoZReportsPlaceholder products={products} />;
  }

  return (
    <div className="space-y-6">
      {/* כפתור ייצוא */}
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline" size="sm" className="border-horizon text-horizon-accent hover:bg-horizon-card">
          <Download className="w-4 h-4 ml-2" />
          ייצא ל-CSV
        </Button>
      </div>

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
                  labelLine={true}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--horizon-card-bg)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  {...RECHARTS_CONFIG.tooltip}
                  contentStyle={{ backgroundColor: 'var(--horizon-card)', border: '1px solid var(--horizon)', borderRadius: '8px', padding: '12px' }}
                  formatter={(value, name, props) => [
                    <div key="tooltip" className="space-y-1">
                      <div className="font-bold text-horizon-text">{props.payload.name}</div>
                      <div className="text-sm text-horizon-accent">
                        כמות מוצרים: <span className="font-semibold text-horizon-primary">{value}</span>
                      </div>
                      <div className="text-xs text-horizon-accent mt-1">
                        אחוז מכלל: {((value / (profitable.length + controversial.length + unprofitable.length + unknown.length)) * 100).toFixed(1)}%
                      </div>
                    </div>,
                    ''
                  ]}
                />
                <Legend 
                  {...RECHARTS_CONFIG.legend}
                  verticalAlign="bottom"
                  height={36}
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