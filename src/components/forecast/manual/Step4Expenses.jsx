import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, ChevronUp, DollarSign, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { formatCurrency } from "./utils/numberFormatter";
import LoanManagerSection from "./LoanManagerSection";

// מע״מ קבוע
const VAT_RATE = 0.18;

export default function Step4Expenses({ forecastData, onUpdateForecast, onNext, onBack }) {
  const [marketingExpenses, setMarketingExpenses] = useState([]);
  const [adminExpenses, setAdminExpenses] = useState([]);
  const [expandedMarketing, setExpandedMarketing] = useState({});
  const [expandedAdmin, setExpandedAdmin] = useState({});

  useEffect(() => {
    if (forecastData?.detailed_expenses?.marketing_sales) {
      setMarketingExpenses(forecastData.detailed_expenses.marketing_sales);
    }
    if (forecastData?.detailed_expenses?.admin_general) {
      setAdminExpenses(forecastData.detailed_expenses.admin_general);
    }
  }, [forecastData]);

  // ממיר הוצאה שלמה לפי יעד מע״מ; דואג להחזיר מספרים
  const convertExpenseVAT = (expense, goingToWithoutVAT) => {
    const factor = goingToWithoutVAT ? (1 / (1 + VAT_RATE)) : (1 + VAT_RATE);
    const toNum = (v) => {
      const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
      const safe = Number.isFinite(n) ? n : 0;
      return Math.round(safe * factor * 100) / 100;
    };
    const convertArray = (arr = []) => arr.map(toNum);

    const updated = { ...expense };
    if (updated.planned_monthly_amounts) {
      updated.planned_monthly_amounts = convertArray(updated.planned_monthly_amounts);
    }
    if (updated.actual_monthly_amounts) {
      updated.actual_monthly_amounts = convertArray(updated.actual_monthly_amounts);
    }
    if (typeof updated.amount === "number" || typeof updated.amount === "string") {
      updated.amount = toNum(updated.amount);
    }
    updated.has_vat = !goingToWithoutVAT;
    return updated;
  };

  // טוגל לשורת שיווק/מכירות
  const toggleMarketingExpenseVAT = (expIndex) => {
    const current = marketingExpenses[expIndex] || {};
    const includesVAT = current.has_vat !== false;
    const updatedExpense = convertExpenseVAT(current, includesVAT === true);

    const updated = [...marketingExpenses];
    updated[expIndex] = updatedExpense;
    setMarketingExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, marketing_sales: updated }
    });
  };

  // טוגל לשורת הנהלה וכלליות
  const toggleAdminExpenseVAT = (expIndex) => {
    const current = adminExpenses[expIndex] || {};
    const includesVAT = current.has_vat !== false;
    const updatedExpense = convertExpenseVAT(current, includesVAT === true);

    const updated = [...adminExpenses];
    updated[expIndex] = updatedExpense;
    setAdminExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, admin_general: updated }
    });
  };

  // פונקציה לשכפול סכום לכל המשבצות החודשיות
  const fillAllMonthlyAmounts = (expIndex, field, value, expenseType) => {
    const parsedValue = parseFloat(value);
    const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0;
    
    if (expenseType === 'marketing') {
      const updated = [...marketingExpenses];
      const expense = { ...updated[expIndex] };
      expense[field] = Array(12).fill(safeValue);
      updated[expIndex] = expense;
      setMarketingExpenses(updated);
      onUpdateForecast && onUpdateForecast({
        detailed_expenses: { ...forecastData.detailed_expenses, marketing_sales: updated }
      });
    } else {
      const updated = [...adminExpenses];
      const expense = { ...updated[expIndex] };
      expense[field] = Array(12).fill(safeValue);
      updated[expIndex] = expense;
      setAdminExpenses(updated);
      onUpdateForecast && onUpdateForecast({
        detailed_expenses: { ...forecastData.detailed_expenses, admin_general: updated }
      });
    }
  };

  const addMarketingExpense = () => {
    const newExpense = {
      name: "",
      amount: 0,
      planned_monthly_amounts: Array(12).fill(0),
      actual_monthly_amounts: Array(12).fill(0),
      is_annual_total: false,
      notes: "",
      has_vat: true
    };
    const updated = [...marketingExpenses, newExpense];
    setMarketingExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, marketing_sales: updated }
    });
  };

  const addAdminExpense = () => {
    const newExpense = {
      name: "",
      amount: 0,
      planned_monthly_amounts: Array(12).fill(0),
      actual_monthly_amounts: Array(12).fill(0),
      is_annual_total: false,
      notes: "",
      has_vat: true
    };
    const updated = [...adminExpenses, newExpense];
    setAdminExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, admin_general: updated }
    });
  };

  const updateMarketingExpense = (index, field, value) => {
    const updated = [...marketingExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setMarketingExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, marketing_sales: updated }
    });
  };

  const updateAdminExpense = (index, field, value) => {
    const updated = [...adminExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setAdminExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, admin_general: updated }
    });
  };

  const updateMarketingMonthly = (expIndex, monthIndex, field, value) => {
    const parsedValue = parseFloat(value);
    const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0;
    
    const updated = [...marketingExpenses];
    const expense = { ...updated[expIndex] };
    expense[field] = [...(expense[field] || Array(12).fill(0))];
    expense[field][monthIndex] = safeValue;
    updated[expIndex] = expense;
    setMarketingExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, marketing_sales: updated }
    });
  };

  const updateAdminMonthly = (expIndex, monthIndex, field, value) => {
    const parsedValue = parseFloat(value);
    const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0;
    
    const updated = [...adminExpenses];
    const expense = { ...updated[expIndex] };
    expense[field] = [...(expense[field] || Array(12).fill(0))];
    expense[field][monthIndex] = safeValue;
    updated[expIndex] = expense;
    setAdminExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, admin_general: updated }
    });
  };

  const removeMarketingExpense = (index) => {
    const updated = marketingExpenses.filter((_, i) => i !== index);
    setMarketingExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, marketing_sales: updated }
    });
  };

  const removeAdminExpense = (index) => {
    const updated = adminExpenses.filter((_, i) => i !== index);
    setAdminExpenses(updated);
    onUpdateForecast && onUpdateForecast({
      detailed_expenses: { ...forecastData.detailed_expenses, admin_general: updated }
    });
  };

  const toggleExpandMarketing = (index) => {
    setExpandedMarketing(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleExpandAdmin = (index) => {
    setExpandedAdmin(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

  const calculateExpenseTotal = (expense) => {
    if (expense.is_annual_total && expense.amount) {
      return expense.amount;
    }
    const planned = (expense.planned_monthly_amounts || []).reduce((sum, val) => sum + (val || 0), 0);
    const actual = (expense.actual_monthly_amounts || []).reduce((sum, val) => sum + (val || 0), 0);
    return Math.max(planned, actual);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Marketing & Sales Expenses */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-horizon-primary" />
            הוצאות שיווק ומכירות - תכנון מול ביצוע
          </CardTitle>
          <p className="text-sm text-horizon-accent">
            הזן את ההוצאות המתוכננות והבפועל לכל חודש. לחיצה על השם תאפשר להזין נתונים חודשיים.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {marketingExpenses.map((expense, expIndex) => (
            <div key={expIndex} className="bg-horizon-card/30 p-4 rounded-lg border border-horizon space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpandMarketing(expIndex)}
                  className="text-horizon-accent hover:text-horizon-text"
                >
                  {expandedMarketing[expIndex] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                
                <Input
                  placeholder="שם ההוצאה"
                  value={expense.name || ''}
                  onChange={(e) => updateMarketingExpense(expIndex, 'name', e.target.value)}
                  className="flex-1 min-w-[200px] bg-horizon-card border-horizon text-horizon-text"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleMarketingExpenseVAT(expIndex)}
                  className={(expense.has_vat !== false) ? "border-green-400 text-green-300" : "border-orange-400 text-orange-300"}
                  title={(expense.has_vat !== false) ? "כרגע כולל מע״מ (18%). לחץ/י להסרה." : "כרגע ללא מע״מ. לחץ/י להוספה (18%)."}
                >
                  {(expense.has_vat !== false) ? "כולל מע״מ 18%" : "ללא מע״מ"}
                </Button>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-horizon-accent whitespace-nowrap">
                    סכום שנתי:
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={expense.amount || ''}
                    onChange={(e) => updateMarketingExpense(expIndex, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-32 bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={expense.is_annual_total || false}
                    onChange={(e) => updateMarketingExpense(expIndex, 'is_annual_total', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-horizon-accent whitespace-nowrap">
                    השתמש כסכום שנתי
                  </label>
                </div>

                <Badge className="bg-horizon-primary text-white">
                  סה״כ: {formatCurrency(calculateExpenseTotal(expense))}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMarketingExpense(expIndex)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {expandedMarketing[expIndex] && (
                <div className="mt-4 space-y-4 pr-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-400 hover:bg-blue-500/20"
                        onClick={() => {
                          const firstValue = expense.planned_monthly_amounts?.[0] || 0;
                          fillAllMonthlyAmounts(expIndex, 'planned_monthly_amounts', firstValue, 'marketing');
                        }}
                        title="שכפל תכנון לכל החודשים"
                      >
                        <Check className="w-3 h-3 ml-1" />
                        שכפל תכנון
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-green-400 hover:bg-green-500/20"
                        onClick={() => {
                          const firstValue = expense.actual_monthly_amounts?.[0] || 0;
                          fillAllMonthlyAmounts(expIndex, 'actual_monthly_amounts', firstValue, 'marketing');
                        }}
                        title="שכפל ביצוע לכל החודשים"
                      >
                        <Check className="w-3 h-3 ml-1" />
                        שכפל ביצוע
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-3">
                    {monthNames.map((month, monthIndex) => (
                      <div key={monthIndex} className="space-y-2">
                        <Label className="text-xs text-horizon-accent block text-center">{month}</Label>
                        
                        {/* תכנון */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-blue-400">תכנון</Label>
                          <Input
                            type="number"
                            value={expense.planned_monthly_amounts?.[monthIndex] || 0}
                            onChange={(e) => updateMarketingMonthly(expIndex, monthIndex, 'planned_monthly_amounts', e.target.value)}
                            className="bg-horizon-card border-blue-400/30 text-horizon-text text-sm h-8"
                            placeholder="0"
                          />
                        </div>

                        {/* ביצוע */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-green-400">ביצוע</Label>
                          <Input
                            type="number"
                            value={expense.actual_monthly_amounts?.[monthIndex] || 0}
                            onChange={(e) => updateMarketingMonthly(expIndex, monthIndex, 'actual_monthly_amounts', e.target.value)}
                            className="bg-horizon-card border-green-400/30 text-horizon-text text-sm h-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm text-horizon-accent block mb-2">הערות</label>
                    <Textarea
                      value={expense.notes || ''}
                      onChange={(e) => updateMarketingExpense(expIndex, 'notes', e.target.value)}
                      className="bg-horizon-card border-horizon text-horizon-text"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button onClick={addMarketingExpense} variant="outline" className="w-full border-horizon-primary text-horizon-primary">
            <Plus className="w-4 h-4 ml-2" />
            הוסף הוצאת שיווק/מכירות
          </Button>
        </CardContent>
      </Card>

      {/* Admin & General Expenses */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-horizon-primary" />
            הוצאות הנהלה וכלליות - תכנון מול ביצוע
          </CardTitle>
          <p className="text-sm text-horizon-accent">
            הזן את ההוצאות המתוכננות והבפועל לכל חודש. לחיצה על השם תאפשר להזין נתונים חודשיים.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminExpenses.map((expense, expIndex) => (
            <div key={expIndex} className="bg-horizon-card/30 p-4 rounded-lg border border-horizon space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpandAdmin(expIndex)}
                  className="text-horizon-accent hover:text-horizon-text"
                >
                  {expandedAdmin[expIndex] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                
                <Input
                  placeholder="שם ההוצאה"
                  value={expense.name || ''}
                  onChange={(e) => updateAdminExpense(expIndex, 'name', e.target.value)}
                  className="flex-1 min-w-[200px] bg-horizon-card border-horizon text-horizon-text"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAdminExpenseVAT(expIndex)}
                  className={(expense.has_vat !== false) ? "border-green-400 text-green-300" : "border-orange-400 text-orange-300"}
                  title={(expense.has_vat !== false) ? "כרגע כולל מע״מ (18%). לחץ/י להסרה." : "כרגע ללא מע״מ. לחץ/י להוספה (18%)."}
                >
                  {(expense.has_vat !== false) ? "כולל מע״מ 18%" : "ללא מע״מ"}
                </Button>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-horizon-accent whitespace-nowrap">
                    סכום שנתי:
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={expense.amount || ''}
                    onChange={(e) => updateAdminExpense(expIndex, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-32 bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={expense.is_annual_total || false}
                    onChange={(e) => updateAdminExpense(expIndex, 'is_annual_total', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-horizon-accent whitespace-nowrap">
                    השתמש כסכום שנתי
                  </label>
                </div>

                <Badge className="bg-horizon-primary text-white">
                  סה״כ: {formatCurrency(calculateExpenseTotal(expense))}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAdminExpense(expIndex)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {expandedAdmin[expIndex] && (
                <div className="mt-4 space-y-4 pr-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-400 hover:bg-blue-500/20"
                        onClick={() => {
                          const firstValue = expense.planned_monthly_amounts?.[0] || 0;
                          fillAllMonthlyAmounts(expIndex, 'planned_monthly_amounts', firstValue, 'admin');
                        }}
                        title="שכפל תכנון לכל החודשים"
                      >
                        <Check className="w-3 h-3 ml-1" />
                        שכפל תכנון
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-green-400 hover:bg-green-500/20"
                        onClick={() => {
                          const firstValue = expense.actual_monthly_amounts?.[0] || 0;
                          fillAllMonthlyAmounts(expIndex, 'actual_monthly_amounts', firstValue, 'admin');
                        }}
                        title="שכפל ביצוע לכל החודשים"
                      >
                        <Check className="w-3 h-3 ml-1" />
                        שכפל ביצוע
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-3">
                    {monthNames.map((month, monthIndex) => (
                      <div key={monthIndex} className="space-y-2">
                        <Label className="text-xs text-horizon-accent block text-center">{month}</Label>
                        
                        {/* תכנון */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-blue-400">תכנון</Label>
                          <Input
                            type="number"
                            value={expense.planned_monthly_amounts?.[monthIndex] || 0}
                            onChange={(e) => updateAdminMonthly(expIndex, monthIndex, 'planned_monthly_amounts', e.target.value)}
                            className="bg-horizon-card border-blue-400/30 text-horizon-text text-sm h-8"
                            placeholder="0"
                          />
                        </div>

                        {/* ביצוע */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-green-400">ביצוע</Label>
                          <Input
                            type="number"
                            value={expense.actual_monthly_amounts?.[monthIndex] || 0}
                            onChange={(e) => updateAdminMonthly(expIndex, monthIndex, 'actual_monthly_amounts', e.target.value)}
                            className="bg-horizon-card border-green-400/30 text-horizon-text text-sm h-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm text-horizon-accent block mb-2">הערות</label>
                    <Textarea
                      value={expense.notes || ''}
                      onChange={(e) => updateAdminExpense(expIndex, 'notes', e.target.value)}
                      className="bg-horizon-card border-horizon text-horizon-text"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button onClick={addAdminExpense} variant="outline" className="w-full border-horizon-primary text-horizon-primary">
            <Plus className="w-4 h-4 ml-2" />
            הוסף הוצאה כללית
          </Button>
        </CardContent>
      </Card>

      {/* Loans & Financing - NEW SECTION */}
      <LoanManagerSection forecastData={forecastData} onUpdateForecast={onUpdateForecast} />

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="border-horizon text-horizon-text">
          <ArrowRight className="w-4 h-4 ml-2" />
          חזור
        </Button>
        <Button onClick={onNext} className="btn-horizon-primary">
          המשך לרווח והפסד
          <ArrowLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </div>
  );
}