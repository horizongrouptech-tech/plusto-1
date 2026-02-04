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
    if (!reportData || !isOpen) return null;

    // Handle multiple formats: ai_insights (new), parsed_data (stringified), or direct object (legacy)
    let data;
    try {
        if (reportData.ai_insights) {
            data = reportData.ai_insights;
        } else if (reportData.parsed_data) {
            // Parse stringified data safely
            try {
                data = {
                    reportMeta: typeof reportData.parsed_data.reportMeta === 'string' 
                        ? JSON.parse(reportData.parsed_data.reportMeta) 
                        : (reportData.parsed_data.reportMeta || {}),
                    summary: typeof reportData.parsed_data.summary === 'string'
                        ? JSON.parse(reportData.parsed_data.summary)
                        : (reportData.parsed_data.summary || {}),
                    currentAccounts: typeof reportData.parsed_data.currentAccounts === 'string'
                        ? JSON.parse(reportData.parsed_data.currentAccounts)
                        : (reportData.parsed_data.currentAccounts || []),
                    loans: typeof reportData.parsed_data.loans === 'string'
                        ? JSON.parse(reportData.parsed_data.loans)
                        : (reportData.parsed_data.loans || []),
                    mortgages: typeof reportData.parsed_data.mortgages === 'string'
                        ? JSON.parse(reportData.parsed_data.mortgages)
                        : (reportData.parsed_data.mortgages || []),
                    analysis: reportData.ai_insights?.analysis || {},
                    creditInquiries: reportData.parsed_data.creditInquiries || [],
                    directDebitReturned: reportData.parsed_data.directDebitReturned || null
                };
            } catch (parseError) {
                console.error('Error parsing credit report data:', parseError);
                data = {
                    reportMeta: {},
                    summary: {},
                    currentAccounts: [],
                    loans: [],
                    mortgages: [],
                    analysis: {},
                    creditInquiries: [],
                    directDebitReturned: null
                };
            }
        } else {
            data = reportData;
        }
    } catch (error) {
        console.error('Error processing credit report:', error);
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-red-400">שגיאה בטעינת דוח אשראי</DialogTitle>
                        <DialogDescription className="text-horizon-accent">
                            לא ניתן לטעון את נתוני דוח האשראי. נסה שוב או פנה לתמיכה.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={onClose} variant="outline">סגור</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    const { reportMeta = {}, summary = {}, currentAccounts = [], loans = [], mortgages = [], analysis = {} } = data;

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
                        <TabsList className="grid w-full grid-cols-7 bg-horizon-card">
                            <TabsTrigger value="analysis">ניתוח</TabsTrigger>
                            <TabsTrigger value="summary">סיכום</TabsTrigger>
                            <TabsTrigger value="accounts">חשבונות</TabsTrigger>
                            <TabsTrigger value="loans">הלוואות</TabsTrigger>
                            <TabsTrigger value="mortgages">משכנתאות</TabsTrigger>
                            <TabsTrigger value="guarantees">כערב</TabsTrigger>
                            <TabsTrigger value="inquiries">פניות</TabsTrigger>
                        </TabsList>

                        <TabsContent value="analysis" className="mt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <Card className="card-horizon">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-horizon-text"><ShieldAlert /> הערכת סיכון</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <RiskScore score={analysis?.riskScore} />
                                        <p className="text-horizon-accent mt-2">ציון סיכון פיננסי</p>
                                    </CardContent>
                                </Card>
                                <Card className="card-horizon">
                                    <CardHeader>
                                        <CardTitle className="text-sm">ניצול מסגרות</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <div className="text-2xl font-bold">{analysis?.creditUtilization?.toFixed(1) || 0}%</div>
                                    </CardContent>
                                </Card>
                                <Card className="card-horizon">
                                    <CardHeader>
                                        <CardTitle className="text-sm">חשיפה כערב</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <div className="text-2xl font-bold">{currencyFormatter.format(analysis?.guarantorExposure || 0)}</div>
                                    </CardContent>
                                </Card>
                                <Card className="card-horizon lg:col-span-3">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-red-400">⚠️ החזרות ב-12 חודשים</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p><strong>הוראות קבע:</strong> {analysis?.totalDirectDebitReturned || 0} החזרות</p>
                                        <p><strong>שיקים:</strong> {analysis?.totalChecksReturned || 0} החזרות</p>
                                    </CardContent>
                                </Card>
                                <Card className="card-horizon lg:col-span-3">
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
                                {analysis?.redFlags && analysis.redFlags.length > 0 && (
                                    <Card className="card-horizon lg:col-span-3 border-red-500">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-red-500">🚨 דגלים אדומים</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="list-disc pr-5 space-y-2">
                                                {analysis.redFlags.map((item, i) => <li key={i} className="text-red-400">{item}</li>)}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
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
                            {currentAccounts?.length === 0 && <p className="text-center text-horizon-accent">אין חשבונות עו"ש</p>}
                            {currentAccounts?.map((acc, i) => (
                                <Card key={i} className="card-horizon mb-4">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Landmark/> {acc.bankName || acc.sourceDisplayName}
                                            {acc.isGuarantor && <Badge className="bg-orange-500">ערב</Badge>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p><strong>מזהה עסקה:</strong> {acc.dealId} {acc.branchNumber && `(סניף ${acc.branchNumber})`}</p>
                                        <p><strong>סוג:</strong> {acc.accountType}</p>
                                        <p><strong>סטטוס:</strong> <Badge>{acc.status}</Badge></p>
                                        <p><strong>מסגרת אשראי:</strong> {currencyFormatter.format(acc.creditLimit || 0)}</p>
                                        <p><strong>יתרה נוכחית:</strong> {currencyFormatter.format(acc.currentBalance || 0)}</p>
                                        <p><strong>חוב שלא שולם בזמן:</strong> <span className="text-red-400 font-bold">{currencyFormatter.format(acc.notPaidOnTime || 0)}</span></p>
                                        {acc.currency && <p><strong>מטבע:</strong> {acc.currency}</p>}
                                        {acc.lastUpdateDate && <p className="text-xs text-horizon-accent">עדכון אחרון: {acc.lastUpdateDate}</p>}
                                        {acc.interestRates && acc.interestRates.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-horizon">
                                                <p className="font-semibold mb-2">מסלולי ריבית:</p>
                                                {acc.interestRates.map((rate, idx) => (
                                                    <div key={idx} className="text-sm space-y-1 mb-2">
                                                        <p>מסלול {rate.trackNumber || idx+1}: {rate.rateType}</p>
                                                        <p>עוגן: {rate.baseRate} | מרווח: {rate.margin}%</p>
                                                        <p>ריבית נומינלית: {rate.nominalRate}% | אפקטיבית: {rate.effectiveRate}%</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="loans" className="mt-4">
                            {loans?.filter(l => !l.isGuarantor)?.length === 0 && <p className="text-center text-horizon-accent">אין הלוואות כחייב</p>}
                            {loans?.filter(l => !l.isGuarantor)?.map((loan, i) => (
                                <Card key={i} className="card-horizon mb-4">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Banknote/> {loan.bankName || loan.sourceDisplayName}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p><strong>מזהה:</strong> {loan.dealId} {loan.branchNumber && `(סניף ${loan.branchNumber})`}</p>
                                        <p><strong>סטטוס:</strong> <Badge>{loan.status}</Badge></p>
                                        <p><strong>מטרה:</strong> {loan.purpose}</p>
                                        <p><strong>סכום מקורי:</strong> {currencyFormatter.format(loan.originalPrincipal || 0)}</p>
                                        <p><strong>יתרה נוכחית:</strong> {currencyFormatter.format(loan.currentBalance || 0)}</p>
                                        <p><strong>תשלום חודשי:</strong> {currencyFormatter.format(loan.monthlyPayment || 0)} ({loan.paymentType})</p>
                                        {loan.startDate && <p className="text-sm">תחילה: {loan.startDate}</p>}
                                        {loan.plannedEndDate && <p className="text-sm">סיום מתוכנן: {loan.plannedEndDate}</p>}
                                        {loan.interestTracks && loan.interestTracks.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-horizon">
                                                <p className="font-semibold mb-2">מסלולי ריבית:</p>
                                                {loan.interestTracks.map((track, idx) => (
                                                    <div key={idx} className="text-sm bg-horizon-surface p-2 rounded mb-2">
                                                        <p>מסלול {track.trackNumber}: {track.rateType}</p>
                                                        {track.indexation && <p>הצמדה: {track.indexation}</p>}
                                                        <p>מרווח: {track.margin}% | ריבית: {track.nominalRate}%</p>
                                                        <p>יתרה במסלול: {currencyFormatter.format(track.trackBalance || 0)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {loan.collateral && loan.collateral.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-horizon">
                                                <p className="font-semibold text-sm">בטחונות:</p>
                                                {loan.collateral.map((col, idx) => (
                                                    <p key={idx} className="text-sm">{col.collateralType}: {currencyFormatter.format(col.collateralValue || 0)}</p>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="mortgages" className="mt-4">
                            {mortgages?.length === 0 && <p className="text-center text-horizon-accent">אין משכנתאות</p>}
                            {mortgages?.map((mort, i) => (
                                <Card key={i} className="card-horizon mb-4">
                                    <CardHeader><CardTitle className="flex items-center gap-2"><Home/> {mort.bankName || mort.sourceDisplayName}</CardTitle></CardHeader>
                                    <CardContent className="space-y-2">
                                        <p><strong>מזהה:</strong> {mort.dealId} {mort.branchNumber && `(סניף ${mort.branchNumber})`}</p>
                                        <p><strong>מטרה:</strong> {mort.purpose}</p>
                                        <p><strong>סכום מקורי:</strong> {currencyFormatter.format(mort.originalPrincipal || 0)}</p>
                                        <p><strong>יתרה נוכחית:</strong> {currencyFormatter.format(mort.currentBalance || 0)}</p>
                                        <p><strong>תשלום חודשי:</strong> {currencyFormatter.format(mort.monthlyPayment || 0)}</p>
                                        {mort.actualPayment && <p><strong>תשלום בפועל:</strong> {currencyFormatter.format(mort.actualPayment)}</p>}
                                        {mort.interestTracks && mort.interestTracks.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-horizon">
                                                <p className="font-semibold mb-2">מסלולי ריבית:</p>
                                                {mort.interestTracks.map((track, idx) => (
                                                    <div key={idx} className="text-sm bg-horizon-surface p-3 rounded mb-2">
                                                        <p className="font-semibold">מסלול {track.trackNumber}: {track.rateType}</p>
                                                        <p>הצמדה: {track.indexation}</p>
                                                        <p>עוגן: {track.baseRate}</p>
                                                        <p>מרווח: {track.margin}% | ריבית נומינלית: {track.nominalRate}%</p>
                                                        <p>ריבית אפקטיבית: {track.effectiveRate}%</p>
                                                        <p className="font-semibold mt-1">יתרה במסלול: {currencyFormatter.format(track.trackBalance || 0)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {mort.collateral && mort.collateral.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-horizon">
                                                <p className="font-semibold text-sm">בטחונות:</p>
                                                {mort.collateral.map((col, idx) => (
                                                    <p key={idx} className="text-sm">{col.collateralType}: {currencyFormatter.format(col.collateralValue || 0)}</p>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="guarantees" className="mt-4">
                            {loans?.filter(l => l.isGuarantor)?.length === 0 && currentAccounts?.filter(a => a.isGuarantor)?.length === 0 && (
                                <p className="text-center text-horizon-accent">אין עסקאות כערב</p>
                            )}

                            {currentAccounts?.filter(a => a.isGuarantor)?.map((acc, i) => (
                                <Card key={`acc-${i}`} className="card-horizon mb-4 border-orange-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Landmark/> חשבון כערב - {acc.bankName}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Badge className="bg-orange-500">ערבות</Badge>
                                        <p><strong>מזהה:</strong> {acc.dealId}</p>
                                        <p><strong>מסגרת:</strong> {currencyFormatter.format(acc.creditLimit || 0)}</p>
                                        <p><strong>יתרה:</strong> {currencyFormatter.format(acc.currentBalance || 0)}</p>
                                        <p><strong>סטטוס:</strong> {acc.status}</p>
                                    </CardContent>
                                </Card>
                            ))}

                            {loans?.filter(l => l.isGuarantor)?.map((loan, i) => (
                                <Card key={`loan-${i}`} className="card-horizon mb-4 border-orange-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Banknote/> הלוואה כערב - {loan.bankName}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Badge className="bg-orange-500">ערבות {loan.guarantorLevel}</Badge>
                                        <p><strong>מזהה:</strong> {loan.dealId}</p>
                                        <p><strong>סכום מקורי:</strong> {currencyFormatter.format(loan.originalPrincipal || 0)}</p>
                                        <p><strong>יתרה:</strong> {currencyFormatter.format(loan.currentBalance || 0)}</p>
                                        <p><strong>תשלום חודשי:</strong> {currencyFormatter.format(loan.monthlyPayment || 0)}</p>
                                        {loan.relatedCorporation && <p><strong>תאגיד קשור:</strong> {loan.relatedCorporation}</p>}
                                        <p><strong>מטרה:</strong> {loan.purpose}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="inquiries" className="mt-4">
                            {(!data.creditInquiries || data.creditInquiries.length === 0) && <p className="text-center text-horizon-accent">אין פניות לשכות אשראי</p>}
                            {data.creditInquiries && data.creditInquiries.length > 0 && (
                                <Card className="card-horizon">
                                    <CardHeader>
                                        <CardTitle>פניות לשכות אשראי ({data.creditInquiries.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {data.creditInquiries.map((inq, i) => (
                                                <div key={i} className="border-b border-horizon pb-2">
                                                    <p><strong>{inq.inquiryDate}</strong> - {inq.inquirer}</p>
                                                    <p className="text-sm text-horizon-accent">{inq.purpose}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {data.directDebitReturned && (
                                <Card className="card-horizon mt-4">
                                    <CardHeader>
                                        <CardTitle className="text-red-400">החזרות הוראות קבע</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">{data.directDebitReturned.last12Months || 0} החזרות ב-12 חודשים</p>
                                        {data.directDebitReturned.peakMonth && <p className="text-sm mt-2">שיא: {data.directDebitReturned.peakMonth}</p>}
                                        {data.directDebitReturned.trend && <p className="text-sm">מגמה: {data.directDebitReturned.trend}</p>}
                                    </CardContent>
                                </Card>
                            )}
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