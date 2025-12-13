import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Info, BarChart2, Calendar, FileText, Landmark } from 'lucide-react';
import { formatCurrency as currencyFormatter } from '../utils/currencyFormatter';
export default function ESNAReportViewer({ fileData }) {

  // The main issue is likely here. The component might not be finding the data.
  // The backend log shows the data is nested under a `data` key. Let's ensure we look there.
  // The backend saves the processed data into `fileData.esna_report_data`.
  const esnaData = fileData?.esna_report_data;
  const insights = fileData?.ai_insights;

  if (!esnaData || !esnaData.metadata || !esnaData.annualSummary || !esnaData.monthlyBreakdown) {
    return (
      <div className="p-6 bg-horizon-card rounded-lg" dir="rtl">
        <div className="flex flex-col items-center justify-center text-center text-horizon-accent py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h3 className="text-xl font-semibold text-horizon-text">לא נמצאו נתונים תקינים</h3>
          <p className="mt-2">לא ניתן היה לעבד את נתוני דוח המע"מ (ESNA) מהקובץ.</p>
        </div>
      </div>
    );
  }

  const { metadata, annualSummary, monthlyBreakdown, collectionsAndPayments } = esnaData;

  const summaryCards = [
    { title: "סה\"כ עסקאות חייבות", value: annualSummary.totalTaxableTransactions, icon: TrendingUp, color: "text-green-400" },
    { title: "סה\"כ מס תשומות", value: annualSummary.totalInputTax, icon: TrendingDown, color: "text-red-400" },
    { title: "שיעור ערך מוסף", value: `${annualSummary.addedValueRate}%`, icon: BarChart2, color: "text-blue-400" },
    { title: "סה\"כ גבייה מתשלומים", value: collectionsAndPayments.annualSummary.totalPayments, icon: Landmark, color: "text-purple-400" },
  ];

  return (
    <div className="p-6 bg-horizon-dark rounded-lg text-white" dir="rtl">
      <CardHeader className="p-0 mb-6">
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle className="text-2xl font-bold text-horizon-text flex items-center gap-2">
                    <FileText className="w-6 h-6 text-horizon-primary" />
                    דוח מע"מ (ESNA) - {metadata.reportYear}
                </CardTitle>
                <p className="text-horizon-accent mt-1">{metadata.companyName} | ע.מ: {metadata.businessId}</p>
            </div>
            <div className="text-left">
                <p className="text-sm text-horizon-accent">הופק ב: {new Date(metadata.generatedDate).toLocaleDateString('he-IL')}</p>
                <p className="text-sm text-horizon-accent">משרד מייצג: {metadata.representativeOffice}</p>
            </div>
        </div>
      </CardHeader>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="card-horizon">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="text-right">
                        <p className="text-sm font-medium text-horizon-accent">{card.title}</p>
                        <p className={`text-2xl font-bold ${card.color}`}>{typeof card.value === 'number' ? currencyFormatter(card.value) : card.value}</p>
                    </div>
                    <div className={`p-3 rounded-full bg-horizon-primary/10`}>
                        <Icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Monthly Breakdown Table */}
      <Card className="card-horizon mb-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-horizon-text"><Calendar className="w-5 h-5 text-horizon-primary"/>פירוט חודשי - עסקאות ומס</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b border-horizon">
                            <th className="p-3 text-sm font-semibold text-horizon-accent">תקופה</th>
                            <th className="p-3 text-sm font-semibold text-horizon-accent">עסקאות חייבות</th>
                            <th className="p-3 text-sm font-semibold text-horizon-accent">מס תשומות</th>
                            <th className="p-3 text-sm font-semibold text-horizon-accent">ערך מוסף</th>
                            <th className="p-3 text-sm font-semibold text-horizon-accent">שיעור ערך מוסף</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthlyBreakdown.filter(m => m.totalTransactions > 0).map((month, index) => (
                            <tr key={index} className="border-b border-horizon/50 hover:bg-horizon-card/30">
                                <td className="p-3">{month.period}</td>
                                <td className="p-3">{currencyFormatter(month.taxableTransactions)}</td>
                                <td className="p-3 text-red-400">{currencyFormatter(month.inputTaxTotal)}</td>
                                <td className="p-3">{currencyFormatter(month.addedValue)}</td>
                                <td className="p-3">
                                    <Badge variant={month.addedValueRate > 50 ? 'default' : 'secondary'} className={month.addedValueRate > 50 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}>
                                        {month.addedValueRate}%
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
      
      {/* AI Insights Section */}
      {insights && (
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-horizon-text"><Info className="w-5 h-5 text-horizon-primary"/>תובנות AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-horizon-accent mb-2"> הערכת בריאות העסק:</h4>
              <p className="text-sm p-3 bg-horizon-card/50 rounded-md">{insights.businessHealthAssessment}</p>
            </div>
            <div>
              <h4 className="font-semibold text-horizon-accent mb-2">מגמות מרכזיות:</h4>
              <ul className="list-disc pr-5 space-y-1 text-sm">
                {insights.keyTrends?.map((trend, i) => <li key={i}>{trend}</li>)}
              </ul>
            </div>
             <div>
              <h4 className="font-semibold text-horizon-accent mb-2">המלצות:</h4>
              <ul className="list-disc pr-5 space-y-1 text-sm">
                {insights.recommendations?.map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
             <div>
              <h4 className="font-semibold text-red-400 mb-2">אזהרות:</h4>
              <ul className="list-disc pr-5 space-y-1 text-sm text-red-300">
                {insights.warnings?.map((warn, i) => <li key={i}>{warn}</li>)}
              </ul>
            </div>
             <div>
              <h4 className="font-semibold text-horizon-accent mb-2">השוואה ענפית:</h4>
              <p className="text-sm p-3 bg-horizon-card/50 rounded-md">{insights.industryComparison}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}