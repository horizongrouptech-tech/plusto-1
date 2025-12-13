
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    TrendingUp, 
    TrendingDown, 
    AlertTriangle,
    DollarSign,
    Calendar,
    Target,
    Sparkles
} from "lucide-react";

export default function ForecastAnalytics({ rows, forecast }) {
    const [analytics, setAnalytics] = useState(null);
    const [insights, setInsights] = useState([]);

    const detectInsights = useCallback((monthlyData, months, avgGrowth, margin) => {
        const insights = [];

        // תובנה 1: גידול חזק
        if (avgGrowth > 15) {
            insights.push({
                type: 'positive',
                icon: TrendingUp,
                title: 'גידול מרשים!',
                description: `העסק צומח בקצב של ${avgGrowth.toFixed(1)}% בממוצע לחודש`
            });
        } else if (avgGrowth < -5) {
            insights.push({
                type: 'warning',
                icon: TrendingDown,
                title: 'ירידה במכירות',
                description: `ירידה של ${Math.abs(avgGrowth).toFixed(1)}% בממוצע - מומלץ לבדוק מה קרה`
            });
        }

        // תובנה 2: שולי רווח
        if (margin > 30) {
            insights.push({
                type: 'positive',
                icon: DollarSign,
                title: 'שולי רווח מעולים',
                description: `שולי רווח של ${margin.toFixed(1)}% - מצוין!`
            });
        } else if (margin < 10) {
            insights.push({
                type: 'warning',
                icon: AlertTriangle,
                title: 'שולי רווח נמוכים',
                description: `שולי רווח של ${margin.toFixed(1)}% בלבד - כדאי לבדוק תמחור`
            });
        }

        // תובנה 3: עונתיות
        if (months.length >= 6) {
            const revenues = months.map(m => monthlyData[m].revenue);
            const maxRevenue = Math.max(...revenues);
            const minRevenue = Math.min(...revenues);
            // Ensure minRevenue is not zero to avoid division by zero
            const seasonality = minRevenue !== 0 ? ((maxRevenue - minRevenue) / minRevenue) * 100 : 0;

            if (seasonality > 50) {
                insights.push({
                    type: 'info',
                    icon: Calendar,
                    title: 'זוהתה עונתיות',
                    description: `הפרש של ${seasonality.toFixed(0)}% בין החודשים - יש לתכנן מלאי בהתאם`
                });
            }
        }

        // תובנה 4: חודש חריג
        const totalRevenue = Object.values(monthlyData).reduce((sum, m) => sum + m.revenue, 0);
        const avgRevenue = months.length > 0 ? totalRevenue / months.length : 0;
        
        if (avgRevenue > 0) { // Avoid division by zero if avgRevenue is 0
            months.forEach(month => {
                const deviation = ((monthlyData[month].revenue - avgRevenue) / avgRevenue) * 100;
                if (Math.abs(deviation) > 40) {
                    insights.push({
                        type: deviation > 0 ? 'positive' : 'warning',
                        icon: deviation > 0 ? Target : AlertTriangle,
                        title: `חודש ${month} חריג`,
                        description: `סטייה של ${deviation.toFixed(0)}% מהממוצע - ${deviation > 0 ? 'הישג מרשים' : 'כדאי לבדוק מה קרה'}`
                    });
                }
            });
        }

        return insights;
    }, []); // Empty dependency array as it only uses its arguments and imported constants

    const calculateAnalytics = useCallback(() => {
        if (!rows || rows.length === 0) {
            setAnalytics(null);
            setInsights([]); // Clear insights when no data
            return;
        }

        // קיבוץ לפי חודש
        const monthlyData = {};
        rows.forEach(row => {
            if (!row.period_month) return;
            
            const month = row.period_month.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = {
                    revenue: 0,
                    expenses: 0,
                    profit: 0,
                    count: 0
                };
            }
            
            monthlyData[month].revenue += row.revenue || 0;
            monthlyData[month].expenses += row.expenses || 0;
            monthlyData[month].profit += row.profit || (row.revenue - row.expenses) || 0;
            monthlyData[month].count++;
        });

        const months = Object.keys(monthlyData).sort();
        
        // חישוב סטטיסטיקות
        const totalRevenue = rows.reduce((sum, r) => sum + (r.revenue || 0), 0);
        const totalExpenses = rows.reduce((sum, r) => sum + (r.expenses || 0), 0);
        const totalProfit = totalRevenue - totalExpenses;
        const avgMonthlyRevenue = months.length > 0 ? totalRevenue / months.length : 0; // Prevent division by zero
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // חישוב Growth (השוואה לחודש הקודם)
        const growthRates = [];
        for (let i = 1; i < months.length; i++) {
            const prevMonth = monthlyData[months[i - 1]];
            const currMonth = monthlyData[months[i]];
            
            if (prevMonth.revenue > 0) { // Prevent division by zero
                const growth = ((currMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;
                growthRates.push(growth);
            }
        }
        const avgGrowthRate = growthRates.length > 0 
            ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length 
            : 0;

        // זיהוי תובנות
        const detectedInsights = detectInsights(monthlyData, months, avgGrowthRate, profitMargin);

        setAnalytics({
            totalRevenue,
            totalExpenses,
            totalProfit,
            avgMonthlyRevenue,
            profitMargin,
            avgGrowthRate,
            monthlyData,
            months
        });

        setInsights(detectedInsights);
    }, [rows, detectInsights]); // Dependencies for useCallback

    useEffect(() => {
        calculateAnalytics();
    }, [calculateAnalytics]); // Effect depends on the memoized calculateAnalytics

    if (!analytics) {
        return (
            <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-horizon-accent opacity-50" />
                    <p className="text-horizon-accent">אין מספיק נתונים לניתוח</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6" dir="rtl">
            {/* כרטיסי KPI ראשיים */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="card-horizon border-r-4 border-r-green-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-horizon-accent">סה"כ הכנסות</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-horizon-text">
                            ₪{analytics.totalRevenue.toLocaleString()}
                        </div>
                        <p className="text-xs text-horizon-accent mt-1">
                            ממוצע חודשי: ₪{Math.round(analytics.avgMonthlyRevenue).toLocaleString()}
                        </p>
                    </CardContent>
                </Card>

                <Card className="card-horizon border-r-4 border-r-red-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-horizon-accent">סה"כ הוצאות</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-horizon-text">
                            ₪{analytics.totalExpenses.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="card-horizon border-r-4 border-r-blue-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-horizon-accent">רווח נקי</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-horizon-text">
                            ₪{analytics.totalProfit.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="card-horizon border-r-4 border-r-purple-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-horizon-accent">שולי רווח</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-horizon-text">
                            {analytics.profitMargin.toFixed(1)}%
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            {analytics.avgGrowthRate > 0 ? (
                                <>
                                    <TrendingUp className="w-3 h-3 text-green-400" />
                                    <span className="text-xs text-green-400">
                                        +{analytics.avgGrowthRate.toFixed(1)}% גידול ממוצע
                                    </span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                    <span className="text-xs text-red-400">
                                        {analytics.avgGrowthRate.toFixed(1)}% ירידה ממוצעת
                                    </span>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* תובנות AI */}
            {insights.length > 0 && (
                <Card className="card-horizon">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-horizon-text">
                            <Sparkles className="w-5 h-5 text-horizon-primary" />
                            תובנות חכמות
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {insights.map((insight, idx) => {
                                const Icon = insight.icon;
                                const colorMap = {
                                    positive: 'bg-green-500/10 border-green-500/30 text-green-400',
                                    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
                                    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                };

                                return (
                                    <div 
                                        key={idx}
                                        className={`p-4 rounded-lg border ${colorMap[insight.type]}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Icon className="w-5 h-5 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold mb-1">{insight.title}</h4>
                                                <p className="text-sm opacity-90">{insight.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
