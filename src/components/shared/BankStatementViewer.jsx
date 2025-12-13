import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    TrendingUp, 
    TrendingDown, 
    AlertTriangle, 
    Lightbulb,
    ArrowLeftRight,
    FileText,
    ListChecks
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
                            <span>{typeof item === 'object' ? `${item.description}: ₪${item.amount.toLocaleString()}` : item}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-horizon-accent text-sm">לא נמצאו נתונים בקטגוריה זו.</p>
            )}
        </CardContent>
    </Card>
);

export default function BankStatementViewer({ file, reportData, onAnalysisComplete }) {
    const account_summary = reportData.account_summary || reportData.summary || {};
    const transactions = reportData.transactions || reportData.rows || [];
    const key_insights = reportData.key_insights || [];
    const risk_flags = reportData.risk_flags || [];
    const top_expenses = reportData.top_expenses || [];

    const netChange = account_summary.net_change ?? (account_summary.total_deposits - account_summary.total_withdrawals) ?? 0;

    return (
        <div className="space-y-6">
            <FullAnalysisButton file={file} onAnalysisComplete={onAnalysisComplete} />
            
            {/* KPIs Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPI_Card 
                    title="סך הכנסות" 
                    value={account_summary.total_deposits || 0} 
                    icon={<TrendingUp />}
                    colorClass="text-green-400"
                />
                <KPI_Card 
                    title="סך הוצאות" 
                    value={account_summary.total_withdrawals || 0} 
                    icon={<TrendingDown />}
                    colorClass="text-red-400"
                />
                <KPI_Card 
                    title="שינוי נטו" 
                    value={netChange} 
                    icon={<ArrowLeftRight />}
                    colorClass={netChange >= 0 ? "text-green-400" : "text-red-400"}
                />
            </div>

            {/* Insights and Risks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InsightList 
                    title="תובנות מפתח"
                    items={key_insights}
                    icon={<Lightbulb className="w-5 h-5"/>}
                    colorClass="text-blue-400"
                />
                <InsightList 
                    title="דגלי סיכון"
                    items={risk_flags}
                    icon={<AlertTriangle className="w-5 h-5"/>}
                    colorClass="text-yellow-400"
                />
            </div>
            
            {/* Top Expenses and Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <InsightList 
                    title="5 ההוצאות הגדולות"
                    items={top_expenses}
                    icon={<ListChecks className="w-5 h-5"/>}
                    colorClass="text-red-400"
                />
                <Card className="card-horizon">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-horizon-text">
                            <FileText className="w-5 h-5"/>
                            פירוט תנועות
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">תאריך</TableHead>
                                        <TableHead className="text-right">תיאור</TableHead>
                                        <TableHead className="text-right">זכות</TableHead>
                                        <TableHead className="text-right">חובה</TableHead>
                                        <TableHead className="text-right">יתרה</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{tx.date}</TableCell>
                                            <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                                            <TableCell className="text-green-400">{tx.credit_amount ? `₪${tx.credit_amount.toLocaleString()}` : '-'}</TableCell>
                                            <TableCell className="text-red-400">{tx.debit_amount ? `₪${tx.debit_amount.toLocaleString()}` : '-'}</TableCell>
                                            <TableCell>{tx.balance ? `₪${tx.balance.toLocaleString()}` : '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}