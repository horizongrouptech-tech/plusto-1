import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    CreditCard,
    TrendingDown, 
    Lightbulb, 
    ShoppingBag,
    Calendar,
    FileText
} from "lucide-react";
import FullAnalysisButton from './FullAnalysisButton';

const KPI_Card = ({ title, value, icon, colorClass = "text-horizon-text" }) => (
    <Card className="bg-horizon-card/50">
        <CardContent className="p-4">
            <div className="flex items-center gap-4">
                <div className={`p-3 bg-horizon-card rounded-lg ${colorClass}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-horizon-accent">{title}</p>
                    <p className={`text-2xl font-bold ${colorClass}`}>
                        {typeof value === 'number' ? `₪${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
                    </p>
                </div>
            </div>
        </CardContent>
    </Card>
);

const InsightList = ({ title, items, icon, colorClass }) => (
    <Card className="card-horizon">
        <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-lg ${colorClass}`}>
                {icon}
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            {items && items.length > 0 ? (
                <ul className="space-y-3">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-start gap-3 text-horizon-accent">
                            <div className={`mt-1 w-2 h-2 rounded-full ${colorClass.replace('text-', 'bg-')}`}></div>
                            <span>{`${item.category}: ₪${item.total_amount.toLocaleString()}`}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-horizon-accent text-sm">לא נמצאו נתונים בקטגוריה זו.</p>
            )}
        </CardContent>
    </Card>
);

export default function CreditCardReportViewer({ file, reportData, onAnalysisComplete }) {
    const card_summary = reportData.card_summary || reportData.summary || {};
    const transactions = reportData.transactions || reportData.rows || [];
    const key_insights = reportData.key_insights || [];
    const top_spending_categories = reportData.top_spending_categories || [];

    return (
        <div className="space-y-6">
            <FullAnalysisButton file={file} onAnalysisComplete={onAnalysisComplete} />
            
            {/* KPIs Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPI_Card 
                    title="סה''כ חיוב" 
                    value={card_summary.total_amount || 0} 
                    icon={<TrendingDown />}
                    colorClass="text-red-400"
                />
                <KPI_Card 
                    title="תאריך חיוב" 
                    value={card_summary.billing_date || 'N/A'}
                    icon={<Calendar />}
                />
                <KPI_Card 
                    title="מספר כרטיס" 
                    value={`**** ${card_summary.card_number}` || 'N/A'}
                    icon={<CreditCard />}
                />
            </div>

            {/* Insights and Top Spending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="card-horizon">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-blue-400">
                           <Lightbulb className="w-5 h-5"/>
                           תובנות ודגשים
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {key_insights && key_insights.length > 0 ? (
                            <ul className="space-y-3">
                                {key_insights.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3 text-horizon-accent">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-blue-400"></div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-horizon-accent text-sm">לא נמצאו תובנות מיוחדות.</p>
                        )}
                    </CardContent>
                </Card>
                 <InsightList 
                    title="קטגוריות הוצאה מובילות"
                    items={top_spending_categories}
                    icon={<ShoppingBag className="w-5 h-5"/>}
                    colorClass="text-purple-400"
                />
            </div>
            
            {/* Transactions Table */}
            <Card className="card-horizon">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-horizon-text">
                        <FileText className="w-5 h-5"/>
                        פירוט עסקאות
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">תאריך</TableHead>
                                    <TableHead className="text-right">בית עסק</TableHead>
                                    <TableHead className="text-right">קטגוריה</TableHead>
                                    <TableHead className="text-right">סכום</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{tx.date}</TableCell>
                                        <TableCell className="max-w-xs truncate">{tx.merchant}</TableCell>
                                        <TableCell>
                                            {tx.category && <Badge variant="outline">{tx.category}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-red-400">{`₪${(tx.billed_amount || tx.transaction_amount || 0).toLocaleString()}`}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}