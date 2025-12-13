import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, TrendingUp, DollarSign, AlertTriangle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatCurrency } from '@/components/forecast/manual/utils/numberFormatter';

export default function TaxAssessmentViewer({ reportData, isOpen, onClose }) {
  if (!reportData || !reportData.tax_data) return null;

  const { tax_data, recommendations } = reportData;
  const isRefund = tax_data.is_refund;
  const taxBalance = Math.abs(tax_data.final_tax_balance || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-horizon-dark border-horizon text-horizon-text max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <FileTextIcon />
              </div>
              שומת מס הכנסה לשנת {tax_data.tax_year}
            </DialogTitle>
            <Badge className={isRefund ? "bg-green-500/20 text-green-400 text-lg py-1 px-3" : "bg-red-500/20 text-red-400 text-lg py-1 px-3"}>
              {isRefund ? "החזר מס" : "חוב מס"}
            </Badge>
          </div>
          <DialogDescription className="text-horizon-accent mt-2">
            ניתוח נתונים מתוך הודעת השומה שהופקה ב-{tax_data.assessment_date || "תאריך לא ידוע"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* השורה התחתונה */}
          <Card className={`card-horizon border-2 ${isRefund ? 'border-green-500/50' : 'border-red-500/50'}`}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-horizon-accent mb-1">השורה התחתונה:</p>
                <h2 className={`text-4xl font-black ${isRefund ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(taxBalance)} {isRefund ? 'זכות' : 'חובה'}
                </h2>
                <p className="text-sm text-horizon-text mt-2 opacity-80">
                  {isRefund 
                    ? "סכום זה יועבר לחשבון הבנק שלך ע״י רשות המסים." 
                    : "סכום זה יש לשלם לרשות המסים (כולל הצמדה וריבית)."}
                </p>
              </div>
              <div className={`p-4 rounded-full ${isRefund ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {isRefund ? (
                  <ArrowDownLeft className={`w-12 h-12 ${isRefund ? 'text-green-400' : 'text-red-400'}`} />
                ) : (
                  <ArrowUpRight className={`w-12 h-12 ${isRefund ? 'text-green-400' : 'text-red-400'}`} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* נתונים עיקריים */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              title="סך הכנסות" 
              value={formatCurrency(tax_data.total_income)} 
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-blue-400"
            />
            <StatCard 
              title="הכנסה חייבת" 
              value={formatCurrency(tax_data.taxable_income)} 
              icon={<DollarSign className="w-5 h-5" />}
              color="text-purple-400"
              subtitle="לאחר ניכויים וקיזוזים"
            />
            <StatCard 
              title="מחזור עסק" 
              value={formatCurrency(tax_data.business_turnover)} 
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-orange-400"
              subtitle="לפי דיווח מע״מ/דוח שנתי"
            />
          </div>

          {/* פירוט הכנסות וניכויים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-horizon">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-horizon-text">מקורות הכנסה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="הכנסה מעסק/משלח יד" value={tax_data.income_breakdown?.business} />
                <Row label="הכנסה ממשכורת" value={tax_data.income_breakdown?.salary} />
                <Row label="הכנסות אחרות" value={tax_data.income_breakdown?.other} />
                <div className="border-t border-horizon my-2"></div>
                <Row label='סה"כ הכנסות ברוטו' value={tax_data.total_income} highlight />
              </CardContent>
            </Card>

            <Card className="card-horizon">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-horizon-text">זיכויים וניכויים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="הפקדות לקופת גמל/פנסיה" value={tax_data.deductions_summary?.pension_deposit} />
                <Row label="ביטוח לאומי (חלק מוכר)" value={tax_data.deductions_summary?.social_security} />
                <Row label='סה"כ נקודות זיכוי וזיכויים' value={tax_data.total_credits} />
              </CardContent>
            </Card>
          </div>

          {/* תובנות והמלצות */}
          {recommendations && recommendations.length > 0 && (
            <Card className="card-horizon border-yellow-500/30 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="text-lg text-yellow-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  תובנות והמלצות המערכת
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-horizon-text">
                      <CheckCircle2 className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <Card className="card-horizon">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-horizon-accent text-sm">{title}</span>
          <div className={`p-2 rounded-md bg-horizon-dark ${color}`}>{icon}</div>
        </div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        {subtitle && <div className="text-xs text-horizon-accent mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, highlight = false }) {
  return (
    <div className={`flex justify-between items-center ${highlight ? 'font-bold text-horizon-text' : 'text-horizon-accent'}`}>
      <span>{label}</span>
      <span>{formatCurrency(value || 0)}</span>
    </div>
  );
}

function FileTextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}