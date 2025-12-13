import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, ChevronUp, CreditCard, TrendingDown } from "lucide-react";
import { formatCurrency } from "./utils/numberFormatter";

// פונקציות חישוב מקומיות
const calculateMonthlyPayment = (principal, annualInterestRate, termMonths) => {
  if (!principal || !termMonths || termMonths <= 0) return 0;
  if (!annualInterestRate || annualInterestRate <= 0) return principal / termMonths;
  
  const monthlyRate = annualInterestRate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                   (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return payment;
};

const calculateAmortizationSchedule = (principal, annualInterestRate, termMonths, startMonthOffset = 0, currentPaymentNumber = 1) => {
  const schedule = [];
  const monthlyPayment = calculateMonthlyPayment(principal, annualInterestRate, termMonths);
  const monthlyRate = annualInterestRate / 100 / 12;
  
  let remainingBalance = principal;
  
  for (let paymentNum = 1; paymentNum < currentPaymentNumber; paymentNum++) {
    const interest = remainingBalance * monthlyRate;
    const principalPortion = monthlyPayment - interest;
    remainingBalance -= principalPortion;
  }
  
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    if (monthIndex < startMonthOffset) {
      schedule.push({
        month: monthIndex + 1,
        opening_balance: 0,
        interest_payment: 0,
        principal_payment: 0,
        total_payment: 0,
        closing_balance: 0
      });
      continue;
    }
    
    const effectivePaymentNumber = currentPaymentNumber + (monthIndex - startMonthOffset);
    
    if (effectivePaymentNumber > termMonths) {
      schedule.push({
        month: monthIndex + 1,
        opening_balance: 0,
        interest_payment: 0,
        principal_payment: 0,
        total_payment: 0,
        closing_balance: 0
      });
      continue;
    }
    
    const openingBalance = remainingBalance;
    const interest = openingBalance * monthlyRate;
    const principalPortion = monthlyPayment - interest;
    const closingBalance = openingBalance - principalPortion;
    
    schedule.push({
      month: monthIndex + 1,
      opening_balance: Math.max(0, openingBalance),
      interest_payment: Math.max(0, interest),
      principal_payment: Math.max(0, principalPortion),
      total_payment: Math.max(0, monthlyPayment),
      closing_balance: Math.max(0, closingBalance)
    });
    
    remainingBalance = closingBalance;
  }
  
  return schedule;
};

const calculateMonthlyInterestExpenses = (loans) => {
  const monthlyInterest = Array(12).fill(0);
  
  if (!loans || !Array.isArray(loans) || loans.length === 0) {
    return monthlyInterest;
  }
  
  loans.forEach(loan => {
    if (loan.amortization_schedule && Array.isArray(loan.amortization_schedule)) {
      loan.amortization_schedule.forEach((monthData, idx) => {
        if (idx < 12) {
          monthlyInterest[idx] += (monthData.interest_payment || 0);
        }
      });
    }
  });
  
  return monthlyInterest;
};

export default function LoanManagerSection({ forecastData, onUpdateForecast }) {
  const [loans, setLoans] = useState(forecastData?.financing_loans || []);
  const [expandedLoans, setExpandedLoans] = useState({});

  const addLoan = () => {
    const newLoan = {
      loan_name: "",
      principal_amount: 0,
      annual_interest_rate_percent: 0,
      term_months: 12,
      start_month_offset: 0,
      current_payment_number: 1,
      monthly_payment: 0,
      amortization_schedule: []
    };
    const updated = [...loans, newLoan];
    setLoans(updated);
    updateLoansAndExpenses(updated);
  };

  const updateLoan = (index, field, value) => {
    const updated = [...loans];
    updated[index] = { ...updated[index], [field]: value };

    // חישוב אוטומטי של תשלום חודשי ולוח שפיצר
    if (['principal_amount', 'annual_interest_rate_percent', 'term_months', 'start_month_offset', 'current_payment_number'].includes(field)) {
      const loan = updated[index];
      const monthlyPayment = calculateMonthlyPayment(
        loan.principal_amount,
        loan.annual_interest_rate_percent,
        loan.term_months
      );
      const schedule = calculateAmortizationSchedule(
        loan.principal_amount,
        loan.annual_interest_rate_percent,
        loan.term_months,
        loan.start_month_offset || 0,
        loan.current_payment_number || 1
      );
      
      updated[index].monthly_payment = Math.round(monthlyPayment * 100) / 100;
      updated[index].amortization_schedule = schedule;
    }

    setLoans(updated);
    updateLoansAndExpenses(updated);
  };

  const removeLoan = (index) => {
    const updated = loans.filter((_, i) => i !== index);
    setLoans(updated);
    updateLoansAndExpenses(updated);
  };

  const toggleExpandLoan = (index) => {
    setExpandedLoans(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const updateLoansAndExpenses = (updatedLoans) => {
    const monthlyInterest = calculateMonthlyInterestExpenses(updatedLoans);
    
    if (onUpdateForecast) {
      onUpdateForecast({
        financing_loans: updatedLoans,
        financing_expenses: {
          monthly_amounts: monthlyInterest
        }
      });
    }
  };

  const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

  const totalMonthlyInterest = calculateMonthlyInterestExpenses(loans);
  const totalYearlyInterest = totalMonthlyInterest.reduce((sum, val) => sum + val, 0);

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-horizon-primary" />
          הלוואות והוצאות מימון
        </CardTitle>
        <p className="text-sm text-horizon-accent">
          הזן פרטי הלוואות והמערכת תחשב אוטומטית את הוצאות הריבית החודשיות
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {loans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="text-sm text-red-300">סך הלוואות</div>
              <div className="text-2xl font-bold text-red-400">
                {formatCurrency(loans.reduce((sum, l) => sum + (l.principal_amount || 0), 0))}
              </div>
            </div>
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <div className="text-sm text-orange-300">ריבית חודשית ממוצעת</div>
              <div className="text-2xl font-bold text-orange-400">
                {formatCurrency(totalYearlyInterest / 12)}
              </div>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="text-sm text-purple-300">סך ריבית שנתית</div>
              <div className="text-2xl font-bold text-purple-400">
                {formatCurrency(totalYearlyInterest)}
              </div>
            </div>
          </div>
        )}

        {loans.map((loan, loanIndex) => (
          <div key={loanIndex} className="bg-horizon-card/30 p-4 rounded-lg border border-horizon space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpandLoan(loanIndex)}
                className="text-horizon-accent hover:text-horizon-text"
              >
                {expandedLoans[loanIndex] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>

              <Input
                placeholder="שם ההלוואה"
                value={loan.loan_name || ''}
                onChange={(e) => updateLoan(loanIndex, 'loan_name', e.target.value)}
                className="flex-1 min-w-[200px] bg-horizon-card border-horizon text-horizon-text"
              />

              <div className="flex items-center gap-2">
                <Label className="text-sm text-horizon-accent whitespace-nowrap">סכום:</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={loan.principal_amount || ''}
                  onChange={(e) => updateLoan(loanIndex, 'principal_amount', parseFloat(e.target.value) || 0)}
                  className="w-32 bg-horizon-card border-horizon text-horizon-text"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-horizon-accent whitespace-nowrap">ריבית %:</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={loan.annual_interest_rate_percent || ''}
                  onChange={(e) => updateLoan(loanIndex, 'annual_interest_rate_percent', parseFloat(e.target.value) || 0)}
                  className="w-24 bg-horizon-card border-horizon text-horizon-text"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-horizon-accent whitespace-nowrap">תקופה (חודשים):</Label>
                <Input
                  type="number"
                  placeholder="12"
                  value={loan.term_months || ''}
                  onChange={(e) => updateLoan(loanIndex, 'term_months', parseInt(e.target.value) || 12)}
                  className="w-24 bg-horizon-card border-horizon text-horizon-text"
                />
              </div>

              <Badge className="bg-horizon-primary text-white">
                תשלום חודשי: {formatCurrency(loan.monthly_payment || 0)}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLoan(loanIndex)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {expandedLoans[loanIndex] && (
              <div className="mt-4 space-y-4 pr-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-horizon-accent">התחלה (חודש בתחזית)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="11"
                      value={loan.start_month_offset || 0}
                      onChange={(e) => updateLoan(loanIndex, 'start_month_offset', parseInt(e.target.value) || 0)}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                    <p className="text-xs text-horizon-accent mt-1">0 = ינואר, 1 = פברואר, וכו'</p>
                  </div>

                  <div>
                    <Label className="text-sm text-horizon-accent">תשלום נוכחי #</Label>
                    <Input
                      type="number"
                      min="1"
                      value={loan.current_payment_number || 1}
                      onChange={(e) => updateLoan(loanIndex, 'current_payment_number', parseInt(e.target.value) || 1)}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                    <p className="text-xs text-horizon-accent mt-1">אם ההלוואה החלה לפני התחזית</p>
                  </div>
                </div>

                {/* לוח שפיצר */}
                {loan.amortization_schedule && loan.amortization_schedule.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-horizon-text mb-2 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-horizon-accent" />
                      לוח שפיצר - 12 חודשי התחזית
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-horizon">
                            <th className="p-2 text-right text-horizon-accent">חודש</th>
                            <th className="p-2 text-right text-horizon-accent">יתרה פותחת</th>
                            <th className="p-2 text-right text-horizon-accent">ריבית</th>
                            <th className="p-2 text-right text-horizon-accent">קרן</th>
                            <th className="p-2 text-right text-horizon-accent">יתרה נותרת</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loan.amortization_schedule.map((monthData, idx) => (
                            <tr key={idx} className="border-b border-horizon/50">
                              <td className="p-2 text-horizon-text">{monthNames[idx]}</td>
                              <td className="p-2 text-horizon-text">{formatCurrency(monthData.opening_balance)}</td>
                              <td className="p-2 text-red-400">{formatCurrency(monthData.interest_payment)}</td>
                              <td className="p-2 text-blue-400">{formatCurrency(monthData.principal_payment)}</td>
                              <td className="p-2 text-horizon-text">{formatCurrency(monthData.closing_balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <Button onClick={addLoan} variant="outline" className="w-full border-horizon-primary text-horizon-primary">
          <Plus className="w-4 h-4 ml-2" />
          הוסף הלוואה
        </Button>

        {loans.length > 0 && (
          <div className="mt-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <h4 className="text-sm font-semibold text-purple-300 mb-3">הוצאות ריבית חודשיות</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {totalMonthlyInterest.map((amount, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-xs text-horizon-accent">{monthNames[idx]}</div>
                  <div className="text-sm font-bold text-purple-400">{formatCurrency(amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}