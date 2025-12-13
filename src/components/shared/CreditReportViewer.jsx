
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ShieldAlert, Lightbulb, Banknote, Landmark, Home } from "lucide-react";
import { format } from 'date-fns';

const currencyFormatter = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const RiskScore = ({ score }) => {
    const getColor = () => {
        if (score <= 3) return 'text-green-400';
        if (score <= 7) return 'text-yellow-400';
        return 'text-red-400';
    };
    return <span className={`font-bold text-2xl ${getColor()}`}>{score}/10</span>;
};

export default function CreditReportViewer({ isOpen, onClose, reportData }) {
    if (!reportData) return null;

    const { reportMeta, summary, currentAccounts, loans, mortgages, analysis } = reportData;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
                <DialogHeader className="p-4 border-b border-horizon flex-shrink-0">
                    <DialogTitle className="text-2xl text-horizon-primary">
                        ניתוח דוח ריכוז נתונים - {reportMeta?.subjectFullName}
                    </DialogTitle>
                    <DialogDescription className="text-horizon-accent">
                        הופק בתאריך: {reportMeta?.reportIssueDate ? format(new Date(reportMeta.reportIssueDate), 'dd/MM/yyyy') : 'לא ידוע'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto p-4">
                    <Tabs defaultValue="analysis" className="w-full">
                        <TabsList className="grid w-full grid-cols-5 bg-horizon-card">
                            <TabsTrigger value="analysis">ניתוח ותובנות</TabsTrigger>
                            <TabsTrigger value="summary">סיכום</TabsTrigger>
                            <TabsTrigger value="accounts">חשבונות עו"ש</TabsTrigger>
                            <TabsTrigger value="loans">הלוואות</TabsTrigger>
                            <TabsTrigger value="mortgages">משכנתאות</TabsTrigger>
                        </TabsList>

                        <TabsContent value="analysis" className="mt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <Card className="card-horizon lg:col-span-1">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-horizon-text"><ShieldAlert /> הערכת סיכון</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <RiskScore score={analysis?.riskScore} />
                                        <p className="text-horizon-accent mt-2">ציון סיכון פיננסי</p>
                                    </CardContent>
                                </Card>
                                <Card className="card-horizon lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-horizon-text"><TrendingUp /> נקודות חוזק</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="list-disc pr-5 space-y-2">
                                            {analysis?.strengths?.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </CardContent>
                                </Card>
                                <Card className="card-horizon lg:col-span-3">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-red-400"><TrendingDown /> נקודות חולשה</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="list-disc pr-5 space-y-2">
                                            {analysis?.weaknesses?.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </CardContent>
                                </Card>
                                <Card className="card-horizon lg:col-span-3">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-green-400"><Lightbulb /> המלצות לשיפור</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="list-disc pr-5 space-y-2">
                                            {analysis?.recommendations?.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                        
                        <TabsContent value="summary" className="mt-4">
                            <Card className="card-horizon">
                                <CardHeader><CardTitle>סיכום נתונים</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <p><strong>סה"כ חוב:</strong> {currencyFormatter.format(summary?.totalDebtILS || 0)}</p>
                                    <p><strong>סה"כ חוב (ללא משכנתא):</strong> {currencyFormatter.format(summary?.totalDebtExMortgageILS || 0)}</p>
                                    <p><strong>סה"כ הלוואות:</strong> {summary?.totalLoansCount || 0}</p>
                                    <p><strong>סה"כ עסקאות פעילות:</strong> {summary?.totalActiveDealsCount || 0}</p>
                                    <p className="col-span-2"><strong>מלווים:</strong> {summary?.lenders?.join(', ')}</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="accounts" className="mt-4">
                            {currentAccounts?.map((acc, i) => (
                                <Card key={i} className="card-horizon mb-4">
                                    <CardHeader><CardTitle className="flex items-center gap-2"><Landmark/> {acc.sourceDisplayName}</CardTitle></CardHeader>
                                    <CardContent>
                                        <p><strong>סטטוס:</strong> <Badge>{acc.status}</Badge></p>
                                        <p><strong>מסגרת אשראי:</strong> {currencyFormatter.format(acc.creditLimit || 0)}</p>
                                        <p><strong>יתרה נוכחית:</strong> {currencyFormatter.format(acc.currentBalance || 0)}</p>
                                        <p><strong>חוב שלא שולם בזמן:</strong> <span className="text-red-400 font-bold">{currencyFormatter.format(acc.notPaidOnTime || 0)}</span></p>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="loans" className="mt-4">
                            {loans?.map((loan, i) => (
                                <Card key={i} className="card-horizon mb-4">
                                    <CardHeader><CardTitle className="flex items-center gap-2"><Banknote/> {loan.sourceDisplayName}</CardTitle></CardHeader>
                                    <CardContent>
                                        <p><strong>סטטוס:</strong> <Badge>{loan.status}</Badge></p>
                                        <p><strong>סכום מקורי:</strong> {currencyFormatter.format(loan.originalPrincipal || 0)}</p>
                                        <p><strong>יתרה נוכחית:</strong> {currencyFormatter.format(loan.currentBalance || 0)}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="mortgages" className="mt-4">
                            {mortgages?.map((mort, i) => (
                                <Card key={i} className="card-horizon mb-4">
                                    <CardHeader><CardTitle className="flex items-center gap-2"><Home/> {mort.sourceDisplayName}</CardTitle></CardHeader>
                                    <CardContent>
                                        <p><strong>סכום מקורי:</strong> {currencyFormatter.format(mort.originalPrincipal || 0)}</p>
                                        <p><strong>יתרה נוכחית:</strong> {currencyFormatter.format(mort.currentBalance || 0)}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                    </Tabs>
                </div>
                <DialogFooter className="p-4 border-t border-horizon flex-shrink-0">
                    <Button onClick={onClose} variant="outline">סגור</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
