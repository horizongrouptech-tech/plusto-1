import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import NoZReportsPlaceholder from './NoZReportsPlaceholder';
import { RECHARTS_CONFIG, HORIZON_COLORS, formatNumber } from '@/components/utils/chartConfig';

export default function PopularityAnalysis({ top10, bottom10, products = [], hasZReports = true }) {
  const handleExport = () => {
    const csvData = [
      ['דירוג', 'שם מוצר', 'כמות נמכרת', 'סטטוס'],
      ...top10.map((p, i) => [`${i + 1}`, p.name, p.totalQuantity, 'מוביל']),
      ...bottom10.map((p, i) => [`${i + 1}`, p.name, p.totalQuantity, 'חלש'])
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ניתוח_פופולאריות_${new Date().toLocaleDateString('he-IL')}.csv`;
    link.click();
  };

  // אם אין דוחות Z, הצג מידע מהקטלוג
  if (!hasZReports) {
    return <NoZReportsPlaceholder products={products} />;
  }

  if ((!top10 || top10.length === 0) && (!bottom10 || bottom10.length === 0)) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-horizon-accent opacity-50" />
          <p className="text-horizon-accent">אין מספיק נתונים לניתוח פופולאריות</p>
        </CardContent>
      </Card>
    );
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* מוצרים מובילים */}
      <Card className="card-horizon border-r-4 border-r-green-500">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            🏆 סוסים מנצחים - Top 10
          </CardTitle>
          <p className="text-sm text-horizon-accent mt-1">
            המוצרים הנמכרים ביותר לפי כמות
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={top10} layout="horizontal" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid {...RECHARTS_CONFIG.cartesianGrid} />
              <XAxis 
                type="number" 
                {...RECHARTS_CONFIG.xAxis}
                tickFormatter={formatNumber}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                {...RECHARTS_CONFIG.yAxis}
                tick={{ fill: 'var(--horizon-text)', fontSize: 11 }}
                width={75}
              />
              <Tooltip
                {...RECHARTS_CONFIG.tooltip}
                formatter={(value, name) => [
                  name === 'totalQuantity' ? `${value.toLocaleString()} יחידות` : `₪${formatNumber(value)}`,
                  name === 'totalQuantity' ? 'כמות' : 'הכנסות'
                ]}
              />
              <Bar dataKey="totalQuantity" fill={HORIZON_COLORS.green} radius={[0, 6, 6, 0]}>
                <LabelList 
                  dataKey="totalQuantity" 
                  position="right" 
                  formatter={(value) => formatNumber(value)}
                  fill="var(--horizon-text)"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* טבלה מסכמת */}
          <div className="mt-4 space-y-2">
            {top10.slice(0, 5).map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                <span className="text-horizon-text font-medium text-sm">#{idx + 1} {product.name}</span>
                <span className="text-green-400 font-bold">{product.totalQuantity.toLocaleString()} יח'</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* מוצרים חלשים */}
      <Card className="card-horizon border-r-4 border-r-red-500">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            ⚠️ מוצרים חלשים - Bottom 10
          </CardTitle>
          <p className="text-sm text-horizon-accent mt-1">
            המוצרים הנמכרים הכי פחות
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={bottom10} layout="horizontal" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid {...RECHARTS_CONFIG.cartesianGrid} />
              <XAxis 
                type="number" 
                {...RECHARTS_CONFIG.xAxis}
                tickFormatter={formatNumber}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                {...RECHARTS_CONFIG.yAxis}
                tick={{ fill: 'var(--horizon-text)', fontSize: 11 }}
                width={75}
              />
              <Tooltip
                {...RECHARTS_CONFIG.tooltip}
                formatter={(value) => [`${value.toLocaleString()} יחידות`, 'כמות']}
              />
              <Bar dataKey="totalQuantity" fill={HORIZON_COLORS.red} radius={[0, 6, 6, 0]}>
                <LabelList 
                  dataKey="totalQuantity" 
                  position="right" 
                  formatter={(value) => formatNumber(value)}
                  fill="var(--horizon-text)"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* טבלה מסכמת */}
          <div className="mt-4 space-y-2">
            {bottom10.slice(0, 5).map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                <span className="text-horizon-text font-medium text-sm">{product.name}</span>
                <span className="text-red-400 font-bold">{product.totalQuantity.toLocaleString()} יח'</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}