import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export default function NoZReportsPlaceholder({ products = [] }) {
  if (!products || products.length === 0) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
          <h3 className="text-xl font-semibold text-horizon-text mb-2">אין נתונים להצגה</h3>
          <p className="text-horizon-accent">
            הוסף מוצרים לקטלוג או העלה דוחות Z לניתוח מלא
          </p>
        </CardContent>
      </Card>
    );
  }

  // חישוב נתונים מהקטלוג
  const totalProducts = products.length;
  const totalInventory = products.reduce((sum, p) => sum + (p.inventory || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.inventory || 0)), 0);
  const avgMargin = products.filter(p => p.profit_percentage).length > 0
    ? products.reduce((sum, p) => sum + (p.profit_percentage || 0), 0) / products.filter(p => p.profit_percentage).length
    : 0;

  // קטגוריות
  const categoryData = {};
  products.forEach(p => {
    const cat = p.category || 'אחר';
    if (!categoryData[cat]) {
      categoryData[cat] = { name: cat, count: 0, value: 0 };
    }
    categoryData[cat].count++;
    categoryData[cat].value += (p.selling_price || 0) * (p.inventory || 0);
  });

  const categoryArray = Object.values(categoryData).sort((a, b) => b.count - a.count);
  const COLORS = ['#32acc1', '#fc9f67', '#48BB78', '#FC8181', '#63B3ED', '#F6AD55'];

  // מוצרים יקרים
  const topByPrice = [...products]
    .filter(p => p.selling_price > 0)
    .sort((a, b) => b.selling_price - a.selling_price)
    .slice(0, 10)
    .map(p => ({ name: p.product_name, price: p.selling_price }));

  return (
    <div className="space-y-6">
      {/* אזהרה */}
      <Card className="card-horizon border-r-4 border-r-yellow-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="font-semibold text-yellow-400">מוצגים נתוני קטלוג בלבד</h3>
              <p className="text-sm text-horizon-accent">
                העלה דוחות Z מהקופה הרושמת כדי לראות ניתוח מכירות מלא, מגמות ורווחיות בפועל
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* סטטיסטיקות כלליות */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 text-horizon-primary" />
            <div className="text-3xl font-bold text-horizon-text">{totalProducts}</div>
            <div className="text-sm text-horizon-accent">מוצרים בקטלוג</div>
          </CardContent>
        </Card>
        
        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <div className="text-3xl font-bold text-horizon-text">{totalInventory.toLocaleString()}</div>
            <div className="text-sm text-horizon-accent">יחידות במלאי</div>
          </CardContent>
        </Card>
        
        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-horizon-secondary" />
            <div className="text-3xl font-bold text-horizon-text">₪{(totalValue / 1000).toFixed(0)}K</div>
            <div className="text-sm text-horizon-accent">שווי מלאי</div>
          </CardContent>
        </Card>
        
        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <BarChart className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <div className="text-3xl font-bold text-horizon-text">{avgMargin.toFixed(1)}%</div>
            <div className="text-sm text-horizon-accent">רווח ממוצע</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* התפלגות לפי קטגוריות */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text">התפלגות מוצרים לפי קטגוריה</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryArray}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {categoryArray.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

        {/* מוצרים יקרים */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text">המוצרים היקרים ביותר</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topByPrice} layout="horizontal" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--horizon-border)" />
                <XAxis 
                  type="number" 
                  stroke="var(--horizon-accent)"
                  tick={{ fill: 'var(--horizon-accent)', fontSize: 10 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="var(--horizon-accent)"
                  tick={{ fill: 'var(--horizon-text)', fontSize: 10 }}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--horizon-dark)',
                    border: '1px solid var(--horizon-border)',
                    borderRadius: '8px',
                    direction: 'rtl'
                  }}
                  formatter={(value) => [`₪${value.toLocaleString()}`, 'מחיר']}
                />
                <Bar dataKey="price" fill="#32acc1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}