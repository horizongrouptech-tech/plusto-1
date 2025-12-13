import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { formatCurrency } from './utils/numberFormatter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, Filter } from 'lucide-react';

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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/60 p-4 rounded-xl shadow-2xl">
          <p className="text-gray-900 font-bold mb-3 text-sm pb-2 border-b border-gray-200">
            {payload[0].payload.name}
          </p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color, opacity: 0.9 }} />
                <span className="text-xs font-semibold text-gray-600">{entry.name}:</span>
              </div>
              <span className="font-bold text-sm" style={{ color: entry.color }}>
                {formatCurrency(entry.value, 0)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const axisStyle = {
    fontSize: 13,
    fontWeight: 600,
    fill: '#5a6c7d',
    fontFamily: 'Inter, system-ui, sans-serif'
  };

  const legendStyle = {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'Inter, system-ui, sans-serif'
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
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-100">
          <CardTitle className="text-horizon-text flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#32acc1] to-[#83ddec] rounded-xl shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[#32acc1] to-[#83ddec] bg-clip-text text-transparent font-bold">
              תכנון מול ביצוע - מכירות
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-6 bg-gradient-to-br from-white to-gray-50">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesComparisonData} margin={{ top: 30, right: 40, left: 20, bottom: 30 }} barCategoryGap="20%">
              <defs>
                <linearGradient id="planGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#32acc1" stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#32acc1" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.4}/>
                </linearGradient>
                <filter id="glassEffect">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.15"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ ...axisStyle, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ ...axisStyle, fill: '#6b7280' }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(50, 172, 193, 0.08)', radius: 8 }} />
              <Legend 
                wrapperStyle={{ ...legendStyle, paddingTop: '20px' }} 
                iconType="rect"
                iconSize={14}
              />
              <Bar 
                dataKey="תכנון מכירות" 
                fill="url(#planGradient)" 
                radius={[6, 6, 6, 6]}
                filter="url(#glassEffect)"
                animationDuration={1000}
                animationBegin={0}
              />
              <Bar 
                dataKey="ביצוע מכירות" 
                fill="url(#actualGradient)" 
                radius={[6, 6, 6, 6]}
                filter="url(#glassEffect)"
                animationDuration={1000}
                animationBegin={200}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* גרף תכנון מול ביצוע - הוצאות */}
      <Card className="card-horizon overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle className="text-horizon-text flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                תכנון מול ביצוע - הוצאות
              </span>
            </CardTitle>
            
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
        <CardContent className="pt-8 pb-6 bg-gradient-to-br from-white to-gray-50">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getFilteredExpensesData()} margin={{ top: 30, right: 40, left: 20, bottom: 30 }} barCategoryGap="20%">
              <defs>
                <linearGradient id="expensePlanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#A855F7" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="expenseActualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#EC4899" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ ...axisStyle, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ ...axisStyle, fill: '#6b7280' }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168, 85, 247, 0.08)', radius: 8 }} />
              <Legend 
                wrapperStyle={{ ...legendStyle, paddingTop: '20px' }} 
                iconType="rect"
                iconSize={14}
              />
              <Bar 
                dataKey="תכנון" 
                fill="url(#expensePlanGradient)" 
                radius={[6, 6, 6, 6]}
                filter="url(#glassEffect)"
                animationDuration={1000}
                animationBegin={0}
              />
              <Bar 
                dataKey="ביצוע" 
                fill="url(#expenseActualGradient)" 
                radius={[6, 6, 6, 6]}
                filter="url(#glassEffect)"
                animationDuration={1000}
                animationBegin={200}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* גרף הכנסות, עלות מכר ורווח גולמי */}
      <Card className="card-horizon overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-100">
          <CardTitle className="text-horizon-text flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
              הכנסות והוצאות לפי חודש
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-6 bg-gradient-to-br from-white to-gray-50">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 30, right: 40, left: 20, bottom: 30 }} barCategoryGap="18%">
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#32acc1" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#32acc1" stopOpacity={0.35}/>
                </linearGradient>
                <linearGradient id="cogsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#fb7185" stopOpacity={0.35}/>
                </linearGradient>
                <linearGradient id="grossProfitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.35}/>
                </linearGradient>
                <filter id="modernGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
                  <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" result="glow"/>
                  <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" strokeOpacity={0.6} vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ ...axisStyle, fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ ...axisStyle, fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                width={85}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(50, 172, 193, 0.06)', radius: 8 }} />
              <Legend 
                wrapperStyle={{ ...legendStyle, paddingTop: '25px' }} 
                iconType="rect"
                iconSize={16}
              />
              <Bar 
                dataKey="הכנסות" 
                fill="url(#revenueGradient)" 
                radius={[4, 4, 4, 4]}
                filter="url(#modernGlow)"
                animationDuration={1200}
                animationBegin={0}
              />
              <Bar 
                dataKey="עלות מכר" 
                fill="url(#cogsGradient)" 
                radius={[4, 4, 4, 4]}
                filter="url(#modernGlow)"
                animationDuration={1200}
                animationBegin={150}
              />
              <Bar 
                dataKey="רווח גולמי" 
                fill="url(#grossProfitGradient)" 
                radius={[4, 4, 4, 4]}
                filter="url(#modernGlow)"
                animationDuration={1200}
                animationBegin={300}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* גרף מגמת רווחיות - עם הוצאות מימון */}
      <Card className="card-horizon overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100">
          <CardTitle className="text-horizon-text flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
              מגמת רווחיות עם הוצאות מימון
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-6 bg-gradient-to-br from-white to-gray-50">
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={chartData} margin={{ top: 30, right: 40, left: 20, bottom: 30 }}>
              <defs>
                <linearGradient id="operatingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#32acc1" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#32acc1" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="netProfitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.05}/>
                </linearGradient>
                <filter id="lineGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" strokeOpacity={0.6} vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ ...axisStyle, fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ ...axisStyle, fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                width={85}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ ...legendStyle, paddingTop: '25px' }} 
                iconType="rect"
                iconSize={14}
              />
              
              <Area
                type="monotone"
                dataKey="רווח תפעולי"
                fill="url(#operatingGradient)"
                stroke="none"
                animationDuration={1200}
              />
              <Area
                type="monotone"
                dataKey="רווח נקי"
                fill="url(#netProfitGradient)"
                stroke="none"
                animationDuration={1200}
              />
              
              <Line 
                type="monotone" 
                dataKey="רווח תפעולי" 
                stroke="#32acc1" 
                strokeWidth={3.5}
                dot={{ fill: '#32acc1', r: 5, strokeWidth: 2.5, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 3, stroke: '#32acc1', fill: '#fff' }}
                filter="url(#lineGlow)"
                animationDuration={1200}
              />
              <Line 
                type="monotone" 
                dataKey="הוצאות מימון" 
                stroke="#ef4444" 
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ fill: '#ef4444', r: 4, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 2.5 }}
                animationDuration={1200}
              />
              <Line 
                type="monotone" 
                dataKey="רווח לפני מס" 
                stroke="#a855f7" 
                strokeWidth={3}
                dot={{ fill: '#a855f7', r: 5, strokeWidth: 2.5, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 3, stroke: '#a855f7', fill: '#fff' }}
                filter="url(#lineGlow)"
                animationDuration={1200}
              />
              <Line 
                type="monotone" 
                dataKey="רווח נקי" 
                stroke="#10B981" 
                strokeWidth={4}
                dot={{ fill: '#10B981', r: 6, strokeWidth: 3, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 3.5, stroke: '#10B981', fill: '#fff' }}
                filter="url(#lineGlow)"
                animationDuration={1200}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}