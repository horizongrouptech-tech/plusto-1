import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import ForecastAnalytics from "./ForecastAnalytics";

const COLORS = ['#00C184', '#103C77', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

export default function ForecastCharts({ forecast, rows }) {
    const chartData = useMemo(() => {
        if (!rows || rows.length === 0) return null;

        // נתונים חודשיים
        const monthlyData = {};
        rows.forEach(row => {
            if (!row.period_month) return;
            
            const month = row.period_month.substring(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = {
                    month,
                    revenue: 0,
                    expenses: 0,
                    profit: 0
                };
            }
            
            monthlyData[month].revenue += row.revenue || 0;
            monthlyData[month].expenses += row.expenses || 0;
            monthlyData[month].profit += (row.profit || (row.revenue - row.expenses)) || 0;
        });

        const monthlyArray = Object.values(monthlyData).sort((a, b) => 
            a.month.localeCompare(b.month)
        );

        // נתונים לפי קטגוריה
        const categoryData = {};
        rows.forEach(row => {
            const cat = row.category || 'לא מוגדר';
            if (!categoryData[cat]) {
                categoryData[cat] = {
                    category: cat,
                    revenue: 0,
                    expenses: 0,
                    profit: 0
                };
            }
            
            categoryData[cat].revenue += row.revenue || 0;
            categoryData[cat].expenses += row.expenses || 0;
            categoryData[cat].profit += (row.profit || (row.revenue - row.expenses)) || 0;
        });

        const categoryArray = Object.values(categoryData);

        return {
            monthly: monthlyArray,
            byCategory: categoryArray
        };
    }, [rows]);

    if (!chartData) {
        return (
            <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-horizon-accent opacity-50" />
                    <p className="text-horizon-accent">אין מספיק נתונים להצגת גרפים</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6" dir="rtl">
            {/* תובנות ו-KPIs */}
            <ForecastAnalytics rows={rows} forecast={forecast} />

            {/* גרפים */}
            <Tabs defaultValue="trends" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-horizon-card">
                    <TabsTrigger value="trends" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                        <TrendingUp className="w-4 h-4 ml-2" />
                        מגמות חודשיות
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                        <BarChart3 className="w-4 h-4 ml-2" />
                        השוואה
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                        <PieChartIcon className="w-4 h-4 ml-2" />
                        לפי קטגוריה
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="trends" className="mt-6">
                    <Card className="card-horizon">
                        <CardHeader>
                            <CardTitle className="text-horizon-text">מגמת הכנסות והוצאות לאורך זמן</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={chartData.monthly}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                    <XAxis 
                                        dataKey="month" 
                                        stroke="#8b949e"
                                        tick={{ fill: '#8b949e' }}
                                    />
                                    <YAxis 
                                        stroke="#8b949e"
                                        tick={{ fill: '#8b949e' }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1a1a1a', 
                                            border: '1px solid #2a2a2a',
                                            borderRadius: '8px',
                                            color: '#e6edf3'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ color: '#8b949e' }} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="revenue" 
                                        stroke="#00C184" 
                                        strokeWidth={3}
                                        name="הכנסות"
                                        dot={{ fill: '#00C184', r: 5 }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="expenses" 
                                        stroke="#FF6B6B" 
                                        strokeWidth={3}
                                        name="הוצאות"
                                        dot={{ fill: '#FF6B6B', r: 5 }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="profit" 
                                        stroke="#103C77" 
                                        strokeWidth={3}
                                        name="רווח"
                                        dot={{ fill: '#103C77', r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="comparison" className="mt-6">
                    <Card className="card-horizon">
                        <CardHeader>
                            <CardTitle className="text-horizon-text">השוואת הכנסות מול הוצאות</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={chartData.monthly}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                    <XAxis 
                                        dataKey="month" 
                                        stroke="#8b949e"
                                        tick={{ fill: '#8b949e' }}
                                    />
                                    <YAxis 
                                        stroke="#8b949e"
                                        tick={{ fill: '#8b949e' }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1a1a1a', 
                                            border: '1px solid #2a2a2a',
                                            borderRadius: '8px',
                                            color: '#e6edf3'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ color: '#8b949e' }} />
                                    <Bar dataKey="revenue" fill="#00C184" name="הכנסות" />
                                    <Bar dataKey="expenses" fill="#FF6B6B" name="הוצאות" />
                                    <Bar dataKey="profit" fill="#103C77" name="רווח" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="categories" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="card-horizon">
                            <CardHeader>
                                <CardTitle className="text-horizon-text">התפלגות הכנסות לפי קטגוריה</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={chartData.byCategory}
                                            dataKey="revenue"
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={(entry) => `${entry.category}: ${entry.revenue.toLocaleString()}`}
                                        >
                                            {chartData.byCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#1a1a1a', 
                                                border: '1px solid #2a2a2a',
                                                borderRadius: '8px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="card-horizon">
                            <CardHeader>
                                <CardTitle className="text-horizon-text">התפלגות הוצאות לפי קטגוריה</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={chartData.byCategory}
                                            dataKey="expenses"
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={(entry) => `${entry.category}: ${entry.expenses.toLocaleString()}`}
                                        >
                                            {chartData.byCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#1a1a1a', 
                                                border: '1px solid #2a2a2a',
                                                borderRadius: '8px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}