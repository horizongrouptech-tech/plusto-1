import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PopularityAnalysis({ top10, bottom10, chartType = 'bar' }) {
  const formatNumber = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return Math.round(value).toLocaleString();
  };

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