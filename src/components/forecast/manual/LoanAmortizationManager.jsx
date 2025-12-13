import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, CreditCard, Eye, EyeOff } from "lucide-react";
import { calculateMonthlyPayment, calculateAmortizationSchedule } from "./loanCalculations";
import { useState } from "react";

export default function LoanAmortizationManager({ forecastData, onChange }) {
  const [expandedLoan, setExpandedLoan] = useState(null);

  const addLoan = () => {
    onChange({
      ...forecastData,
      financing_loans: [
        ...(forecastData.financing_loans || []),
        {
          loan_name: '',
          principal_amount: 0,
          annual_interest_rate_percent: 0,
          term_months: 12,
          start_month_offset: 0,
          current_payment_number: 1,
          monthly_payment: 0,
          amortization_schedule: []
        }
      ]
    });
  };

  const updateLoan = (index, field, value) => {
    const loans = [...forecastData.financing_loans];
    loans[index] = { ...loans[index], [field]: value };

    // חישוב מחדש של לוח שפיצר
    const loan = loans[index];
    if (loan.principal_amount > 0 && loan.annual_interest_rate_percent > 0 && loan.term_months > 0) {
      loan.monthly_payment = calculateMonthlyPayment(
        loan.principal_amount,
        loan.annual_interest_rate_percent,
        loan.term_months
      );
      
      loan.amortization_schedule = calculateAmortizationSchedule(
        loan.principal_amount,
        loan.annual_interest_rate_percent,
        loan.term_months,
        loan.current_payment_number || 1
      );
    }

    onChange({ ...forecastData, financing_loans: loans });
  };

  const removeLoan = (index) => {
    onChange({
      ...forecastData,
      financing_loans: forecastData.financing_loans.filter((_, i) => i !== index)
    });
  };

  return (
    <Card className="card-horizon">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-horizon-primary" />
            הלוואות ולוח שפיצר
          </CardTitle>
          <Button onClick={addLoan} size="sm" className="btn-horizon-primary">
            <Plus className="w-4 h-4 ml-2" />
            הוסף הלוואה
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(forecastData.financing_loans || []).map((loan, loanIdx) => (
          <Card key={loanIdx} className="bg-horizon-card/50 border-horizon">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-1">
                  <div>
                    <Label className="text-horizon-accent text-xs">שם ההלוואה</Label>
                    <Input
                      value={loan.loan_name}
                      onChange={(e) => updateLoan(loanIdx, 'loan_name', e.target.value)}
                      placeholder="הלוואה 1"
                      className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-horizon-accent text-xs">סכום ההלוואה (₪)</Label>
                    <Input
                      type="number"
                      value={loan.principal_amount}
                      onChange={(e) => updateLoan(loanIdx, 'principal_amount', parseFloat(e.target.value) || 0)}
                      className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-horizon-accent text-xs">ריבית שנתית (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={loan.annual_interest_rate_percent}
                      onChange={(e) => updateLoan(loanIdx, 'annual_interest_rate_percent', parseFloat(e.target.value) || 0)}
                      className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-horizon-accent text-xs">תקופה (חודשים)</Label>
                    <Input
                      type="number"
                      value={loan.term_months}
                      onChange={(e) => updateLoan(loanIdx, 'term_months', parseInt(e.target.value) || 12)}
                      className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-horizon-accent text-xs">מספר תשלום נוכחי</Label>
                    <Input
                      type="number"
                      value={loan.current_payment_number || 1}
                      onChange={(e) => updateLoan(loanIdx, 'current_payment_number', parseInt(e.target.value) || 1)}
                      className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mr-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedLoan(expandedLoan === loanIdx ? null : loanIdx)}
                    className="text-horizon-primary"
                  >
                    {expandedLoan === loanIdx ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLoan(loanIdx)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* תוצאה מחושבת */}
              {loan.monthly_payment > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-green-300">תשלום חודשי קבוע</div>
                    <div className="text-xl font-bold text-green-400">₪{loan.monthly_payment.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {/* לוח שפיצר מפורט */}
              {expandedLoan === loanIdx && loan.amortization_schedule?.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-horizon">
                        <th className="text-right p-2 text-horizon-accent">מספר תשלום</th>
                        <th className="text-right p-2 text-horizon-accent">יתרה פותחת</th>
                        <th className="text-right p-2 text-horizon-accent">ריבית</th>
                        <th className="text-right p-2 text-horizon-accent">קרן</th>
                        <th className="text-right p-2 text-horizon-accent">יתרה סוגרת</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loan.amortization_schedule.slice(0, 12).map((payment, idx) => (
                        <tr key={idx} className="border-b border-horizon/30">
                          <td className="text-right p-2 text-horizon-text">{payment.payment_number}</td>
                          <td className="text-right p-2 text-horizon-text">₪{payment.opening_balance.toFixed(2)}</td>
                          <td className="text-right p-2 text-red-400">₪{payment.interest_payment.toFixed(2)}</td>
                          <td className="text-right p-2 text-blue-400">₪{payment.principal_payment.toFixed(2)}</td>
                          <td className="text-right p-2 text-horizon-text font-semibold">₪{payment.closing_balance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {loan.amortization_schedule.length > 12 && (
                    <p className="text-xs text-horizon-accent text-center mt-2">
                      מוצגים 12 התשלומים הראשונים. סה"כ {loan.amortization_schedule.length} תשלומים.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {forecastData.financing_loans?.length === 0 && (
          <div className="text-center py-8 text-horizon-accent">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>לא הוגדרו הלוואות. לחץ על "הוסף הלוואה" אם יש הלוואות לניהול.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}