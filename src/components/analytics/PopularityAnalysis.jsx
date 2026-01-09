import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PopularityAnalysis({ top10, bottom10, products = [], hasZReports = true }) {
  const formatNumber = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return Math.round(value).toLocaleString();
  };

  // אם אין דוחות Z, הצג מידע מהקטלוג
  if (!hasZReports && products.length > 0) {
    const sortedByPrice = [...products].sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
    const topByPrice = sortedByPrice.slice(0, 10).map(p => ({
      name: p.product_name,
      totalQuantity: p.monthly_sales || p.inventory || 0,
      price: p.selling_price || 0
    }));
    const bottomByPrice = sortedByPrice.slice(-10).reverse().map(p => ({
      name: p.product_name,
      totalQuantity: p.monthly_sales || p.inventory || 0,
      price: p.selling_price || 0
    }));

    return (
      <div className="space-y-6">
        <Card className="card-horizon border-r-4 border-r-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">נתוני קטלוג (ללא דוחות Z)</span>
            </div>
            <p className="text-horizon-accent text-sm mb-4">
              העלה דוחות Z כדי לראות ניתוח מכירות מלא. כרגע מוצגים נתוני מחירים ומלאי מהקטלוג.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-horizon-text font-semibold mb-2">מוצרים יקרים</h4>
                {topByPrice.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-horizon-surface rounded mb-1">
                    <span className="text-sm text-horizon-text">{p.name}</span>
                    <span className="text-sm text-horizon-primary">₪{p.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-horizon-text font-semibold mb-2">מוצרים זולים</h4>
                {bottomByPrice.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-horizon-surface rounded mb-1">
                    <span className="text-sm text-horizon-text">{p.name}</span>
                    <span className="text-sm text-horizon-accent">₪{p.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
            <BarChart data={top10} layout="horizontal" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--horizon-border)" />
              <XAxis 
                type="number" 
                stroke="var(--horizon-accent)"
                tick={{ fill: 'var(--horizon-accent)', fontSize: 11 }}
                tickFormatter={formatNumber}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="var(--horizon-accent)"
                tick={{ fill: 'var(--horizon-text)', fontSize: 11 }}
                width={75}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--horizon-dark)',
                  border: '1px solid var(--horizon-border)',
                  borderRadius: '8px',
                  direction: 'rtl'
                }}
                labelStyle={{ color: 'var(--horizon-text)', fontWeight: 'bold' }}
                formatter={(value, name) => [
                  name === 'totalQuantity' ? `${value.toLocaleString()} יחידות` : `₪${formatNumber(value)}`,
                  name === 'totalQuantity' ? 'כמות' : 'הכנסות'
                ]}
              />
              <Bar dataKey="totalQuantity" fill="#48BB78" radius={[0, 4, 4, 0]} />
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
            <BarChart data={bottom10} layout="horizontal" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--horizon-border)" />
              <XAxis 
                type="number" 
                stroke="var(--horizon-accent)"
                tick={{ fill: 'var(--horizon-accent)', fontSize: 11 }}
                tickFormatter={formatNumber}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="var(--horizon-accent)"
                tick={{ fill: 'var(--horizon-text)', fontSize: 11 }}
                width={75}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--horizon-dark)',
                  border: '1px solid var(--horizon-border)',
                  borderRadius: '8px',
                  direction: 'rtl'
                }}
                labelStyle={{ color: 'var(--horizon-text)', fontWeight: 'bold' }}
                formatter={(value) => [`${value.toLocaleString()} יחידות`, 'כמות']}
              />
              <Bar dataKey="totalQuantity" fill="#FC8181" radius={[0, 4, 4, 0]} />
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
  );
}