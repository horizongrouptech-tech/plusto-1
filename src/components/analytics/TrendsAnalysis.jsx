import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProductTrend, getProductsForPeriod } from './productAnalyticsEngine';
import NoZReportsPlaceholder from './NoZReportsPlaceholder';

export default function TrendsAnalysis({ products, zReports, services, customer, hasZReports = true }) {
  const [analysisMode, setAnalysisMode] = useState('product'); // product / period
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedInterval, setSelectedInterval] = useState('monthly'); // weekly / monthly / quarterly / yearly
  const [productTrendData, setProductTrendData] = useState([]);
  const [periodProductsData, setPeriodProductsData] = useState([]);

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const intervalOptions = [
    { value: 'weekly', label: 'שבועי' },
    { value: 'monthly', label: 'חודשי' },
    { value: 'quarterly', label: 'רבעוני' },
    { value: 'yearly', label: 'שנתי' }
  ];

  useEffect(() => {
    if (analysisMode === 'product' && selectedProduct) {
      loadProductTrend();
    }
  }, [selectedProduct, analysisMode, selectedInterval]);

  useEffect(() => {
    if (analysisMode === 'period' && selectedMonth) {
      loadPeriodProducts();
    }
  }, [selectedMonth, analysisMode]);

  const loadProductTrend = async () => {
    const data = await getProductTrend(selectedProduct, customer?.email, zReports, services);
    setProductTrendData(data);
  };

  const loadPeriodProducts = () => {
    const data = getProductsForPeriod(zReports, [selectedMonth], services);
    setPeriodProductsData(data.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 15));
  };

  // אם אין דוחות Z
  if (!hasZReports) {
    return <NoZReportsPlaceholder products={products} />;
  }

  return (
    <div className="space-y-6">
      <Tabs value={analysisMode} onValueChange={setAnalysisMode}>
        <TabsList className="grid w-full grid-cols-2 bg-horizon-card">
          <TabsTrigger value="product">מוצר ספציפי לאורך זמן</TabsTrigger>
          <TabsTrigger value="period">תקופה עם כל המוצרים</TabsTrigger>
        </TabsList>

        {/* מצב 1: מוצר ספציפי */}
        <TabsContent value="product" className="mt-4">
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-text flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-horizon-primary" />
                מגמת מוצר לאורך זמן
              </CardTitle>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-horizon-accent mb-1 block">בחר מוצר</label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר מוצר לניתוח..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.product_name}>
                          {p.product_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-horizon-accent mb-1 block">אינטרוול זמן</label>
                  <Select value={selectedInterval} onValueChange={setSelectedInterval}>
                    <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר אינטרוול..." />
                    </SelectTrigger>
                    <SelectContent>
                      {intervalOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProduct && (
                <div className="p-6 bg-horizon-surface rounded-lg border border-horizon mb-4">
                  <div className="flex items-center gap-2 text-horizon-accent mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">בחר מוצר ואינטרוול לניתוח</span>
                  </div>
                  <p className="text-xs text-horizon-accent">
                    המערכת תציג גרף של כמות המכירות ואחוז הרווח לאורך זמן
                  </p>
                </div>
              )}
              {selectedProduct && productTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={productTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--horizon-border)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="var(--horizon-accent)"
                      tick={{ fill: 'var(--horizon-accent)', fontSize: 11 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="var(--horizon-accent)"
                      tick={{ fill: 'var(--horizon-accent)', fontSize: 11 }}
                      label={{ value: 'כמות מכירות', angle: -90, position: 'insideLeft', fill: 'var(--horizon-text)' }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="left"
                      stroke="var(--horizon-accent)"
                      tick={{ fill: 'var(--horizon-accent)', fontSize: 11 }}
                      label={{ value: 'אחוז רווח', angle: 90, position: 'insideRight', fill: 'var(--horizon-text)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--horizon-dark)',
                        border: '1px solid var(--horizon-border)',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'var(--horizon-text)' }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="quantity" 
                      stroke="#32acc1" 
                      strokeWidth={3}
                      name="כמות מכירות"
                      dot={{ fill: '#32acc1', r: 5 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="profitMargin" 
                      stroke="#48BB78" 
                      strokeWidth={3}
                      name="אחוז רווח"
                      dot={{ fill: '#48BB78', r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-horizon-accent">
                  בחר מוצר כדי לראות את המגמה שלו לאורך זמן
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* מצב 2: תקופה עם כל המוצרים */}
        <TabsContent value="period" className="mt-4">
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-text flex items-center gap-2">
                <Calendar className="w-5 h-5 text-horizon-primary" />
                כל המוצרים לפי תקופה
              </CardTitle>
              <div className="mt-4">
                <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                  <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue placeholder="בחר חודש..." />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {periodProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={periodProductsData} layout="horizontal" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
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
                      width={95}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--horizon-dark)',
                        border: '1px solid var(--horizon-border)',
                        borderRadius: '8px',
                        direction: 'rtl'
                      }}
                      formatter={(value, name) => [
                        `₪${Math.round(value).toLocaleString()}`,
                        name === 'totalRevenue' ? 'הכנסות' : 'רווח'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="totalRevenue" fill="#32acc1" name="הכנסות" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="totalProfit" fill="#48BB78" name="רווח" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-horizon-accent">
                  אין נתוני מכירות לחודש זה
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}