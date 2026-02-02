import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatCurrency } from './utils/numberFormatter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, Filter, BarChart3 } from 'lucide-react';

export default function ManualForecastCharts({ profitLossData, yearlyTotals, salesForecast, detailedExpenses }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // תיקון: שימוש ב-month.month במקום index כדי להציג את שם החודש הנכון
  const chartData = useMemo(() => {
    if (!profitLossData || profitLossData.length === 0) return [];
    
    return profitLossData.map((month) => ({
      name: monthNames[month.month - 1] || `חודש ${month.month}`,
      הכנסות: month.revenue || 0,
      'עלות מכר': month.cost_of_sale || 0,
      'רווח גולמי': month.gross_profit || 0,
      'רווח תפעולי': month.operating_profit || 0,
      'הוצאות מימון': month.financing_expenses || 0,
      'רווח לפני מס': month.profit_before_tax || 0,
      'רווח נקי': month.net_profit || 0
    }));
  }, [profitLossData, monthNames]);

  // תיקון: סינון salesComparisonData רק לחודשים הרלוונטיים
  const salesComparisonData = useMemo(() => {
    if (!profitLossData || profitLossData.length === 0) return [];
    
    return profitLossData.map((month) => {
      const monthIndex = month.month - 1;
      let plannedRevenue = 0;
      let actualRevenue = 0;

      if (salesForecast && salesForecast.length > 0) {
        salesForecast.forEach(item => {
          plannedRevenue += (item.planned_monthly_revenue?.[monthIndex] || 0);
          actualRevenue += (item.actual_monthly_revenue?.[monthIndex] || 0);
        });
      }

      return {
        name: monthNames[monthIndex],
        'תכנון מכירות': plannedRevenue,
        'ביצוע מכירות': actualRevenue
      };
    });
  }, [profitLossData, salesForecast, monthNames]);

  // תיקון: סינון expensesComparisonData רק לחודשים הרלוונטיים + הוספת שכר
  const expensesComparisonData = useMemo(() => {
    if (!profitLossData || profitLossData.length === 0) return [];
    
    return profitLossData.map((month) => {
      const monthIndex = month.month - 1;
      let plannedMarketing = 0;
      let actualMarketing = 0;
      let plannedAdmin = 0;
      let actualAdmin = 0;

      if (detailedExpenses?.marketing_sales) {
        detailedExpenses.marketing_sales.forEach(exp => {
          plannedMarketing += (exp.planned_monthly_amounts?.[monthIndex] || 0);
          actualMarketing += (exp.actual_monthly_amounts?.[monthIndex] || 0);
        });
      }

      if (detailedExpenses?.admin_general) {
        detailedExpenses.admin_general.forEach(exp => {
          plannedAdmin += (exp.planned_monthly_amounts?.[monthIndex] || 0);
          actualAdmin += (exp.actual_monthly_amounts?.[monthIndex] || 0);
        });
      }

      const salaryExpenses = month.salary_expenses || 0;

      return {
        name: monthNames[monthIndex],
        'תכנון שיווק': plannedMarketing,
        'ביצוע שיווק': actualMarketing,
        'תכנון הנהלה': plannedAdmin,
        'ביצוע הנהלה': actualAdmin,
        'תכנון שכר': salaryExpenses,
        'ביצוע שכר': salaryExpenses,
        'תכנון סה"כ': plannedMarketing + plannedAdmin + salaryExpenses,
        'ביצוע סה"כ': actualMarketing + actualAdmin + salaryExpenses
      };
    });
  }, [profitLossData, detailedExpenses, monthNames]);

  const getFilteredExpensesData = () => {
    if (selectedCategory === 'all') {
      return expensesComparisonData.map(item => ({
        name: item.name,
        'תכנון': item['תכנון סה"כ'],
        'ביצוע': item['ביצוע סה"כ']
      }));
    } else if (selectedCategory === 'marketing') {
      return expensesComparisonData.map(item => ({
        name: item.name,
        'תכנון': item['תכנון שיווק'],
        'ביצוע': item['ביצוע שיווק']
      }));
    } else if (selectedCategory === 'admin') {
      return expensesComparisonData.map(item => ({
        name: item.name,
        'תכנון': item['תכנון הנהלה'],
        'ביצוע': item['ביצוע הנהלה']
      }));
    } else if (selectedCategory === 'salary') {
      return expensesComparisonData.map(item => ({
        name: item.name,
        'תכנון': item['תכנון שכר'],
        'ביצוע': item['ביצוע שכר']
      }));
    }
  };

  // Tooltip מותאם אישית עם תמיכה ב-dark mode
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-horizon-card/98 backdrop-blur-xl border-2 border-horizon-primary/30 p-4 rounded-2xl shadow-2xl">
          <p className="text-horizon-text font-bold mb-3 text-base pb-2 border-b-2 border-horizon-primary/20">
            {label}
          </p>
          <div className="space-y-2">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-md shadow-md" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-semibold text-horizon-text">
                    {entry.name}:
                  </span>
                </div>
                <span 
                  className="font-bold text-base text-horizon-primary" 
                  style={{ color: entry.color }}
                >
                  {formatCurrency(entry.value, 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (!profitLossData || profitLossData.length === 0) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <p className="text-horizon-accent">אין נתונים להצגה בגרפים</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* גרף תכנון מול ביצוע - מכירות */}
      <Card className="card-horizon overflow-hidden">
        <CardHeader className="bg-horizon-card/50 border-b-2 border-horizon">
          <div className="space-y-2">
            <CardTitle className="text-horizon-text flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#32acc1] to-[#83ddec] rounded-xl shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-[#32acc1] to-[#83ddec] bg-clip-text text-transparent font-bold">
                תכנון מול ביצוע - מכירות
              </span>
            </CardTitle>
            <p className="text-sm text-horizon-accent mr-12">
              השוואה חודשית בין המכירות המתוכננות לבין המכירות בפועל - עוזר לזהות פערים ולהתאים את התכנון
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-6 bg-horizon-dark/20">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart 
              data={salesComparisonData} 
              margin={{ top: 30, right: 40, left: 40, bottom: 20 }}
              barGap={12}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="planGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="5 5" 
                stroke="var(--horizon-border)" 
                vertical={false}
                strokeOpacity={0.3}
              />
              <XAxis 
                dataKey="name" 
                tick={{ 
                  fill: 'var(--horizon-text)', 
                  fontSize: 13, 
                  fontWeight: 600,
                  fontFamily: 'Heebo, sans-serif'
                }}
                tickLine={false}
                axisLine={{ stroke: 'var(--horizon-border)', strokeWidth: 2 }}
              />
              <YAxis 
                tick={{ 
                  fill: 'var(--horizon-text)', 
                  fontSize: 12, 
                  fontWeight: 600,
                  fontFamily: 'Heebo, sans-serif'
                }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                tickLine={false}
                axisLine={{ stroke: 'var(--horizon-border)', strokeWidth: 2 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '20px',
                  color: 'var(--horizon-text)'
                }}
                iconType="circle"
                iconSize={10}
              />
              <Bar 
                dataKey="תכנון מכירות" 
                fill="url(#planGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
                label={{ 
                  position: 'top', 
                  fill: '#3b82f6',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value > 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
              <Bar 
                dataKey="ביצוע מכירות" 
                fill="url(#actualGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
                label={{ 
                  position: 'top', 
                  fill: '#10B981',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value > 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* גרף תכנון מול ביצוע - הוצאות */}
      <Card className="card-horizon overflow-hidden">
        <CardHeader className="bg-horizon-card/50 border-b-2 border-horizon">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex-1 space-y-2">
              <CardTitle className="text-horizon-text flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                  תכנון מול ביצוע - הוצאות
                </span>
              </CardTitle>
              <p className="text-sm text-horizon-accent mr-12">
                מעקב אחר הוצאות שיווק, הנהלה ושכר - ניתן לסנן לפי קטגוריה ולראות היכן חרגת מהתקציב
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Filter className="w-4 h-4 text-purple-500" />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 bg-white border-2 border-purple-200 text-horizon-text rounded-xl shadow-sm hover:border-purple-400 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל ההוצאות</SelectItem>
                  <SelectItem value="salary">שכר בלבד</SelectItem>
                  <SelectItem value="marketing">שיווק בלבד</SelectItem>
                  <SelectItem value="admin">הנהלה בלבד</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-6 bg-horizon-dark/20">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart 
              data={getFilteredExpensesData()} 
              margin={{ top: 30, right: 40, left: 40, bottom: 20 }}
              barGap={12}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="expensePlanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="expenseActualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="5 5" 
                stroke="var(--horizon-border)" 
                vertical={false}
                strokeOpacity={0.3}
              />
              <XAxis 
                dataKey="name" 
                tick={{ 
                  fill: 'var(--horizon-text)', 
                  fontSize: 13, 
                  fontWeight: 600,
                  fontFamily: 'Heebo, sans-serif'
                }}
                tickLine={false}
                axisLine={{ stroke: 'var(--horizon-border)', strokeWidth: 2 }}
              />
              <YAxis 
                tick={{ 
                  fill: 'var(--horizon-text)', 
                  fontSize: 12, 
                  fontWeight: 600,
                  fontFamily: 'Heebo, sans-serif'
                }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                tickLine={false}
                axisLine={{ stroke: 'var(--horizon-border)', strokeWidth: 2 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }} />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '20px',
                  color: 'var(--horizon-text)'
                }}
                iconType="circle"
                iconSize={10}
              />
              <Bar 
                dataKey="תכנון" 
                fill="url(#expensePlanGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
                label={{ 
                  position: 'top', 
                  fill: '#f59e0b',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value > 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
              <Bar 
                dataKey="ביצוע" 
                fill="url(#expenseActualGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
                label={{ 
                  position: 'top', 
                  fill: '#ef4444',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value > 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* גרף הכנסות, עלות מכר ורווח גולמי */}
      <Card className="card-horizon overflow-hidden">
        <CardHeader className="bg-horizon-card/50 border-b-2 border-horizon">
          <div className="space-y-2">
            <CardTitle className="text-horizon-text flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
                הכנסות והוצאות לפי חודש
              </span>
            </CardTitle>
            <p className="text-sm text-horizon-accent mr-12">
              תמונה מקיפה של ההכנסות, עלות המכר והרווח הגולמי בכל חודש - מאפשר לזהות חודשים חזקים וחלשים
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-6 bg-horizon-dark/20">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={chartData} 
              margin={{ top: 40, right: 40, left: 40, bottom: 20 }}
              barGap={6}
              barCategoryGap="15%"
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#32acc1" stopOpacity={0.95}/>
                  <stop offset="95%" stopColor="#32acc1" stopOpacity={0.65}/>
                </linearGradient>
                <linearGradient id="cogsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.95}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.65}/>
                </linearGradient>
                <linearGradient id="grossProfitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.95}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.65}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="5 5" 
                stroke="var(--horizon-border)" 
                vertical={false}
                strokeOpacity={0.3}
              />
              <XAxis 
                dataKey="name" 
                tick={{ 
                  fill: 'var(--horizon-text)', 
                  fontSize: 13, 
                  fontWeight: 600,
                  fontFamily: 'Heebo, sans-serif'
                }}
                tickLine={false}
                axisLine={{ stroke: 'var(--horizon-border)', strokeWidth: 2 }}
              />
              <YAxis 
                tick={{ 
                  fill: 'var(--horizon-text)', 
                  fontSize: 12, 
                  fontWeight: 600,
                  fontFamily: 'Heebo, sans-serif'
                }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                tickLine={false}
                axisLine={{ stroke: 'var(--horizon-border)', strokeWidth: 2 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(50, 172, 193, 0.08)' }} />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '25px',
                  color: 'var(--horizon-text)'
                }}
                iconType="circle"
                iconSize={10}
              />
              <Bar 
                dataKey="הכנסות" 
                fill="url(#revenueGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
                label={{ 
                  position: 'top', 
                  fill: '#32acc1',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value > 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
              <Bar 
                dataKey="עלות מכר" 
                fill="url(#cogsGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
                label={{ 
                  position: 'top', 
                  fill: '#f97316',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value > 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
              <Bar 
                dataKey="רווח גולמי" 
                fill="url(#grossProfitGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
                label={{ 
                  position: 'top', 
                  fill: '#22c55e',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value > 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* גרף מגמת רווחיות - עם הוצאות מימון */}
      <Card className="card-horizon overflow-hidden">
        <CardHeader className="bg-horizon-card/50 border-b-2 border-horizon">
          <div className="space-y-2">
            <CardTitle className="text-horizon-text flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
                מגמת רווחיות
              </span>
            </CardTitle>
            <p className="text-sm text-horizon-accent mr-12">
              מעקב אחר השתלשלות הרווחיות לאורך השנה - מרווח תפעולי דרך הוצאות מימון ועד לרווח הנקי הסופי
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-6 bg-horizon-dark/20">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart 
              data={chartData} 
              margin={{ top: 40, right: 40, left: 40, bottom: 20 }}
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid 
                strokeDasharray="5 5" 
                stroke="var(--horizon-border)" 
                vertical={false}
                strokeOpacity={0.3}
              />
              <XAxis 
                dataKey="name" 
                tick={{ 
                  fill: 'var(--horizon-text)', 
                  fontSize: 13, 
                  fontWeight: 600,
                  fontFamily: 'Heebo, sans-serif'
                }}
                tickLine={false}
                axisLine={{ stroke: 'var(--horizon-border)', strokeWidth: 2 }}
              />
              <YAxis 
                tick={{ 
                  fill: 'var(--horizon-text)', 
                  fontSize: 12, 
                  fontWeight: 600,
                  fontFamily: 'Heebo, sans-serif'
                }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                tickLine={false}
                axisLine={{ stroke: 'var(--horizon-border)', strokeWidth: 2 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '25px',
                  color: 'var(--horizon-text)'
                }}
                iconType="line"
                iconSize={20}
              />
              <Line 
                type="monotone" 
                dataKey="רווח גולמי" 
                stroke="#22c55e" 
                strokeWidth={4}
                dot={{ fill: '#22c55e', r: 6, strokeWidth: 3, stroke: 'var(--horizon-card)' }}
                activeDot={{ r: 8, strokeWidth: 4, filter: 'url(#glow)' }}
                label={{ 
                  position: 'top', 
                  fill: '#22c55e',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value !== 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
              <Line 
                type="monotone" 
                dataKey="רווח תפעולי" 
                stroke="#3b82f6" 
                strokeWidth={4}
                dot={{ fill: '#3b82f6', r: 6, strokeWidth: 3, stroke: 'var(--horizon-card)' }}
                activeDot={{ r: 8, strokeWidth: 4, filter: 'url(#glow)' }}
                label={{ 
                  position: 'top', 
                  fill: '#3b82f6',
                  fontSize: 11,
                  fontWeight: 700,
                  formatter: (value) => value !== 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
              <Line 
                type="monotone" 
                dataKey="רווח נקי" 
                stroke="#10B981" 
                strokeWidth={5}
                dot={{ fill: '#10B981', r: 7, strokeWidth: 3, stroke: 'var(--horizon-card)' }}
                activeDot={{ r: 9, strokeWidth: 4, filter: 'url(#glow)' }}
                label={{ 
                  position: 'top', 
                  fill: '#10B981',
                  fontSize: 12,
                  fontWeight: 800,
                  formatter: (value) => value !== 0 ? `₪${(value/1000).toFixed(0)}K` : ''
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}