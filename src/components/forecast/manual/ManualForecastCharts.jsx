import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
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

  const nivoTheme = {
    text: {
      fontSize: 13,
      fontWeight: 600,
      fill: '#5a6c7d',
      fontFamily: 'Heebo, Inter, system-ui, sans-serif'
    },
    tooltip: {
      container: {
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        color: '#121725',
        fontSize: '13px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        padding: '16px',
        border: '1px solid rgba(50, 172, 193, 0.2)'
      }
    },
    grid: {
      line: {
        stroke: '#f3f4f6',
        strokeWidth: 1.5,
        strokeOpacity: 0.6
      }
    },
    axis: {
      ticks: {
        text: {
          fontSize: 12,
          fill: '#6b7280',
          fontWeight: 600
        }
      },
      legend: {
        text: {
          fontSize: 13,
          fill: '#5a6c7d',
          fontWeight: 700
        }
      }
    }
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
          <div style={{ height: '400px' }}>
            <ResponsiveBar
              data={salesComparisonData}
              keys={['תכנון מכירות', 'ביצוע מכירות']}
              indexBy="name"
              margin={{ top: 50, right: 130, bottom: 60, left: 80 }}
              padding={0.25}
              groupMode="grouped"
              valueScale={{ type: 'linear' }}
              colors={['#32acc1', '#10B981']}
              theme={nivoTheme}
              borderRadius={6}
              axisBottom={{
                tickSize: 0,
                tickPadding: 10,
                tickRotation: -15
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 10,
                format: (value) => `₪${(value / 1000).toFixed(0)}K`
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#ffffff"
              enableGridY={true}
              gridYValues={5}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 8,
                  itemWidth: 100,
                  itemHeight: 24,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 16,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
              animate={true}
              motionConfig="wobbly"
              tooltip={({ id, value, color }) => (
                <div className="bg-white/98 backdrop-blur-xl border border-gray-200/60 p-4 rounded-xl shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold text-gray-700">{id}:</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color }}>
                    {formatCurrency(value, 0)}
                  </span>
                </div>
              )}
            />
          </div>
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
          <div style={{ height: '400px' }}>
            <ResponsiveBar
              data={getFilteredExpensesData()}
              keys={['תכנון', 'ביצוע']}
              indexBy="name"
              margin={{ top: 50, right: 130, bottom: 60, left: 80 }}
              padding={0.25}
              groupMode="grouped"
              valueScale={{ type: 'linear' }}
              colors={['#A855F7', '#EC4899']}
              theme={nivoTheme}
              borderRadius={6}
              axisBottom={{
                tickSize: 0,
                tickPadding: 10,
                tickRotation: -15
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 10,
                format: (value) => `₪${(value / 1000).toFixed(0)}K`
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#ffffff"
              enableGridY={true}
              gridYValues={5}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 8,
                  itemWidth: 100,
                  itemHeight: 24,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 16,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
              animate={true}
              motionConfig="wobbly"
              tooltip={({ id, value, color }) => (
                <div className="bg-white/98 backdrop-blur-xl border border-gray-200/60 p-4 rounded-xl shadow-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold text-gray-700">{id}:</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color }}>
                    {formatCurrency(value, 0)}
                  </span>
                </div>
              )}
            />
          </div>
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
          <div style={{ height: '420px' }}>
            <ResponsiveBar
              data={chartData}
              keys={['הכנסות', 'עלות מכר', 'רווח גולמי']}
              indexBy="name"
              margin={{ top: 50, right: 130, bottom: 60, left: 80 }}
              padding={0.2}
              groupMode="grouped"
              valueScale={{ type: 'linear' }}
              colors={['#32acc1', '#fb7185', '#34d399']}
              theme={nivoTheme}
              borderRadius={4}
              axisBottom={{
                tickSize: 0,
                tickPadding: 10,
                tickRotation: -15
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 10,
                format: (value) => `₪${(value / 1000).toFixed(0)}K`
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#ffffff"
              enableGridY={true}
              gridYValues={5}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 8,
                  itemWidth: 100,
                  itemHeight: 24,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 16,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
              animate={true}
              motionConfig="wobbly"
              tooltip={({ id, value, color }) => (
                <div className="bg-white/98 backdrop-blur-xl border border-gray-200/60 p-4 rounded-xl shadow-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold text-gray-700">{id}:</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color }}>
                    {formatCurrency(value, 0)}
                  </span>
                </div>
              )}
            />
          </div>
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
          <div style={{ height: '440px' }}>
            <ResponsiveLine
              data={[
                {
                  id: 'רווח תפעולי',
                  color: '#32acc1',
                  data: chartData.map(d => ({ x: d.name, y: d['רווח תפעולי'] }))
                },
                {
                  id: 'הוצאות מימון',
                  color: '#ef4444',
                  data: chartData.map(d => ({ x: d.name, y: d['הוצאות מימון'] }))
                },
                {
                  id: 'רווח לפני מס',
                  color: '#a855f7',
                  data: chartData.map(d => ({ x: d.name, y: d['רווח לפני מס'] }))
                },
                {
                  id: 'רווח נקי',
                  color: '#10B981',
                  data: chartData.map(d => ({ x: d.name, y: d['רווח נקי'] }))
                }
              ]}
              margin={{ top: 50, right: 130, bottom: 60, left: 80 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              curve="monotoneX"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 10,
                tickRotation: -15
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 10,
                format: (value) => `₪${(value / 1000).toFixed(0)}K`
              }}
              enableGridX={false}
              enableGridY={true}
              colors={{ datum: 'color' }}
              lineWidth={3}
              pointSize={8}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              enableArea={true}
              areaOpacity={0.1}
              useMesh={true}
              theme={nivoTheme}
              legends={[
                {
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 4,
                  itemDirection: 'left-to-right',
                  itemWidth: 100,
                  itemHeight: 24,
                  itemOpacity: 0.85,
                  symbolSize: 14,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
              animate={true}
              motionConfig="wobbly"
              tooltip={({ point }) => (
                <div className="bg-white/98 backdrop-blur-xl border border-gray-200/60 p-4 rounded-xl shadow-2xl">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: point.serieColor }} />
                      <span className="text-sm font-semibold text-gray-700">{point.serieId}</span>
                    </div>
                    <div className="text-xs text-gray-600">{point.data.xFormatted}</div>
                    <div className="text-lg font-bold" style={{ color: point.serieColor }}>
                      {formatCurrency(point.data.yFormatted, 0)}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}