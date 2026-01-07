import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, Package, Download } from "lucide-react";
import { base44 } from '@/api/base44Client';

import Step1ServicesAndCosts from './Step1ServicesAndCosts';
import Step2SalaryCosts from './Step2SalaryCosts';
import Step3SalesForecast from './Step3SalesForecast';
import Step4Expenses from './Step4Expenses';
import Step5ProfitLoss from './Step5ProfitLoss';
import { generateForecastHTML } from '../../shared/generateForecastHTML';
import { openPrintWindow } from '../../shared/printUtils';

export default function ManualForecastWizard({ 
  customer, 
  forecast = null,
  initialForecastData = null,
  onSave,
  onCancel
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const [isSavingInProgress, setIsSavingInProgress] = useState(false);

  const [forecastData, setForecastData] = useState({
    customer_email: customer.email,
    forecast_name: '',
    forecast_year: new Date().getFullYear(),
    start_month: 1,
    end_month: 12,
    use_aggregate_planning: false,
    average_cogs_percentage: 0,
    planned_monthly_revenue_aggregate: Array(12).fill(0),
    services: [],
    global_employees: [],
    planned_employee_hires: [],
    working_days_per_month: 22,
    sales_forecast_onetime: [],
    marketing_expenses: [],
    admin_expenses: [],
    detailed_expenses: {
      marketing_sales: [],
      admin_general: []
    },
    financing_loans: [],
    financing_expenses: { monthly_amounts: Array(12).fill(0) },
    tax_rate: 23,
    profit_loss_monthly: [],
    summary: {}
  });

  console.log('🔍 ManualForecastWizard - customer:', customer);
  console.log('🔍 ManualForecastWizard - forecastData.customer_email:', forecastData.customer_email);

  // ===== פונקציות Sanitization - מבטיחות שאין איבוד מידע =====
  
  const sanitizeNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(num) ? num : defaultValue;
  };

  const sanitizeNumberArray = (arr, length = 12) => {
    if (!Array.isArray(arr)) {
      return Array(length).fill(0);
    }
    
    const result = [...arr];
    while (result.length < length) {
      result.push(0);
    }
    
    return result.map(v => sanitizeNumber(v, 0));
  };

  const sanitizeExpenseArrays = (expenseArray) => {
    if (!Array.isArray(expenseArray)) return expenseArray;
    
    return expenseArray.map(expense => {
      const sanitized = { ...expense };
      
      if (sanitized.planned_monthly_amounts) {
        sanitized.planned_monthly_amounts = sanitizeNumberArray(sanitized.planned_monthly_amounts, 12);
      }
      if (sanitized.actual_monthly_amounts) {
        sanitized.actual_monthly_amounts = sanitizeNumberArray(sanitized.actual_monthly_amounts, 12);
      }
      
      if (sanitized.amount !== undefined) {
        sanitized.amount = sanitizeNumber(sanitized.amount, 0);
      }
      
      return sanitized;
    });
  };

  const sanitizeEmployees = (employeesArray) => {
    if (!Array.isArray(employeesArray)) return employeesArray;
    
    return employeesArray.map(employee => {
      const sanitized = { ...employee };
      
      if (sanitized.planned_monthly_hours) {
        sanitized.planned_monthly_hours = sanitizeNumberArray(sanitized.planned_monthly_hours, 12);
      }
      if (sanitized.actual_monthly_hours) {
        sanitized.actual_monthly_hours = sanitizeNumberArray(sanitized.actual_monthly_hours, 12);
      }
      
      if (sanitized.planned_monthly_salary_amounts) {
        sanitized.planned_monthly_salary_amounts = sanitizeNumberArray(sanitized.planned_monthly_salary_amounts, 12);
      }
      if (sanitized.actual_monthly_salary_amounts) {
        sanitized.actual_monthly_salary_amounts = sanitizeNumberArray(sanitized.actual_monthly_salary_amounts, 12);
      }
      if (sanitized.monthly_salary_amounts) {
        sanitized.monthly_salary_amounts = sanitizeNumberArray(sanitized.monthly_salary_amounts, 12);
      }
      if (sanitized.monthly_hours_amounts) {
        sanitized.monthly_hours_amounts = sanitizeNumberArray(sanitized.monthly_hours_amounts, 12);
      }
      if (sanitized.monthly_bonuses) {
        sanitized.monthly_bonuses = sanitizeNumberArray(sanitized.monthly_bonuses, 12);
      }
      
      sanitized.base_salary = sanitizeNumber(sanitized.base_salary, 0);
      sanitized.hourly_rate = sanitizeNumber(sanitized.hourly_rate, 0);
      sanitized.hours_per_month = sanitizeNumber(sanitized.hours_per_month, 0);
      sanitized.salary_addition_percentage = sanitizeNumber(sanitized.salary_addition_percentage, 25);
      sanitized.monthly_total_cost = sanitizeNumber(sanitized.monthly_total_cost, 0);
      sanitized.commission_percentage = sanitizeNumber(sanitized.commission_percentage, 0);
      
      return sanitized;
    });
  };

  const sanitizeSalesForecast = (salesForecastArray) => {
    if (!Array.isArray(salesForecastArray)) return salesForecastArray;
    
    return salesForecastArray.map(item => {
      const sanitized = { ...item };
      
      if (sanitized.planned_monthly_quantities) {
        sanitized.planned_monthly_quantities = sanitizeNumberArray(sanitized.planned_monthly_quantities, 12);
      }
      if (sanitized.actual_monthly_quantities) {
        sanitized.actual_monthly_quantities = sanitizeNumberArray(sanitized.actual_monthly_quantities, 12);
      }
      if (sanitized.planned_monthly_revenue) {
        sanitized.planned_monthly_revenue = sanitizeNumberArray(sanitized.planned_monthly_revenue, 12);
      }
      if (sanitized.actual_monthly_revenue) {
        sanitized.actual_monthly_revenue = sanitizeNumberArray(sanitized.actual_monthly_revenue, 12);
      }
      
      return sanitized;
    });
  };

  const sanitizeFinancingExpenses = (financingExpenses) => {
    if (!financingExpenses) return { monthly_amounts: Array(12).fill(0) };
    
    return {
      ...financingExpenses,
      monthly_amounts: sanitizeNumberArray(financingExpenses.monthly_amounts, 12)
    };
  };

  const sanitizeAllForecastData = (data) => {
    const sanitized = { ...data };
    
    if (sanitized.sales_forecast_onetime) {
      sanitized.sales_forecast_onetime = sanitizeSalesForecast(sanitized.sales_forecast_onetime);
    }
    
    if (sanitized.detailed_expenses) {
      sanitized.detailed_expenses = {
        marketing_sales: sanitizeExpenseArrays(sanitized.detailed_expenses.marketing_sales || []),
        admin_general: sanitizeExpenseArrays(sanitized.detailed_expenses.admin_general || [])
      };
    }
    
    if (sanitized.global_employees) {
      sanitized.global_employees = sanitizeEmployees(sanitized.global_employees);
    }
    
    if (sanitized.financing_expenses) {
      sanitized.financing_expenses = sanitizeFinancingExpenses(sanitized.financing_expenses);
    }
    
    // ✅ FIX: Sanitize תכנון כללי
    if (sanitized.planned_monthly_revenue_aggregate) {
      sanitized.planned_monthly_revenue_aggregate = sanitizeNumberArray(sanitized.planned_monthly_revenue_aggregate, 12);
    }
    sanitized.average_cogs_percentage = sanitizeNumber(sanitized.average_cogs_percentage, 0);
    
    sanitized.working_days_per_month = sanitizeNumber(sanitized.working_days_per_month, 22);
    sanitized.tax_rate = sanitizeNumber(sanitized.tax_rate, 23);
    sanitized.forecast_year = sanitizeNumber(sanitized.forecast_year, new Date().getFullYear());
    sanitized.start_month = sanitizeNumber(sanitized.start_month, 1);
    sanitized.end_month = sanitizeNumber(sanitized.end_month, 12);
    
    return sanitized;
  };

  useEffect(() => {
    const loadForecast = async () => {
      if (forecast && forecast.id) {
        setIsLoading(true);
        try {
          const existingForecast = await base44.entities.ManualForecast.get(forecast.id);
          console.log('📥 Loaded forecast from DB:', {
            id: existingForecast.id,
            z_reports_count: existingForecast.z_reports_uploaded?.length || 0,
            has_mapping: !!existingForecast.z_report_product_mapping,
            sales_forecast_count: existingForecast.sales_forecast_onetime?.length || 0
          });
          setForecastData({
            ...existingForecast,
            company_type: existingForecast.company_type || 'company'
          });
        } catch (error) {
          console.error('Error loading forecast:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (initialForecastData) {
        setForecastData(prev => ({
          ...prev,
          ...initialForecastData
        }));
      }
    };

    loadForecast();
  }, [forecast, initialForecastData]);

  // ✅ טעינה מחדש מה-DB כשעוברים לשלב 5 - מבטיח שכל הנתונים עדכניים
  useEffect(() => {
    const reloadForStep5 = async () => {
      if (currentStep === 5 && forecastData.id) {
        console.log('🔄 Reloading forecast from DB before Step 5...');
        try {
          const freshData = await base44.entities.ManualForecast.get(forecastData.id);
          console.log('✅ Fresh data loaded:', {
            z_reports_count: freshData.z_reports_uploaded?.length || 0,
            has_mapping: !!freshData.z_report_product_mapping,
            sales_forecast_count: freshData.sales_forecast_onetime?.length || 0
          });
          setForecastData(prev => ({
            ...prev,
            ...freshData
          }));
        } catch (error) {
          console.error('❌ Error reloading forecast for Step 5:', error);
        }
      }
    };

    reloadForStep5();
  }, [currentStep, forecastData.id]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ✅ פונקציה חדשה: וידוא שקיימת תחזית במערכת לפני פעולות קריטיות
  const ensureForecastExists = async () => {
    if (forecastData.id) {
      console.log('✅ Forecast ID exists:', forecastData.id);
      return forecastData.id;
    }

    if (!forecastData.forecast_name?.trim()) {
      const autoName = `תחזית ${forecastData.forecast_year || new Date().getFullYear()}`;
      console.log('⚠️ Creating forecast with auto-generated name:', autoName);
      forecastData.forecast_name = autoName;
    }

    console.log('🆕 Creating new forecast for customer:', customer.email);
    
    try {
      const sanitizedData = sanitizeAllForecastData(forecastData);
      const newForecast = await base44.entities.ManualForecast.create(sanitizedData);
      
      console.log('✅ Forecast created successfully:', newForecast.id);
      
      setForecastData(prev => ({ ...prev, id: newForecast.id }));
      return newForecast.id;
    } catch (error) {
      console.error('❌ Error creating forecast:', error);
      throw new Error('יצירת תחזית נכשלה: ' + error.message);
    }
  };

  const autoSaveForecast = (dataToSave) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!dataToSave.forecast_name?.trim()) {
        console.log('Skipping auto-save - missing forecast name');
        return;
      }

      if (isSavingInProgress) {
        console.log('Save already in progress, skipping...');
        return;
      }

      setIsSavingInProgress(true);
      setSaveStatus('saving');
      
      try {
        const sanitizedData = sanitizeAllForecastData(dataToSave);
        
        let savedForecast;
        
        if (sanitizedData.id) {
          await base44.entities.ManualForecast.update(sanitizedData.id, sanitizedData);
          savedForecast = sanitizedData;
        } else {
          savedForecast = await base44.entities.ManualForecast.create(sanitizedData);
          setForecastData(prev => ({ ...prev, id: savedForecast.id }));
        }
        
        setLastSaved(new Date());
        setSaveStatus('saved');
        
        setTimeout(() => {
          setSaveStatus(null);
        }, 3000);

        } catch (error) {
        console.error('Error auto-saving forecast:', error);
        setSaveStatus('error');

        setTimeout(() => {
          setSaveStatus(null);
        }, 5000);
        } finally {
        setIsSavingInProgress(false);
        }
        }, 3000);
  };

  const updateForecast = (updates) => {
    setForecastData(prev => {
      const newData = {
        ...prev,
        ...updates
      };
      
      // ✅ לוג לניפוי שגיאות
      console.log('📝 Updating forecast with:', Object.keys(updates));
      if (updates.sales_forecast_onetime) {
        console.log('🔄 Updated sales_forecast_onetime:', updates.sales_forecast_onetime.length, 'items');
      }
      
      autoSaveForecast(newData);
      
      return newData;
    });
  };

  const handleSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (!forecastData.forecast_name?.trim()) {
      alert('נא להזין שם לתחזית');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const sanitizedData = sanitizeAllForecastData(forecastData);

      if (sanitizedData.id) {
        await base44.entities.ManualForecast.update(sanitizedData.id, sanitizedData);
      } else {
        await base44.entities.ManualForecast.create(sanitizedData);
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      alert('התחזית נשמרה בהצלחה!');
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving forecast:', error);
      setSaveStatus('error');
      alert('שגיאה בשמירת התחזית: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!forecastData.id) {
      alert('יש לשמור את התחזית לפני ייצוא ל-PDF');
      return;
    }
    
    try {
      const fullForecast = await base44.entities.ManualForecast.get(forecastData.id);
      const htmlContent = generateForecastHTML(fullForecast, 'manual');
      openPrintWindow(htmlContent, `תחזית_${forecastData.forecast_name || 'ידנית'}`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('שגיאה בייצוא PDF');
    }
  };

  const steps = [
    { number: 1, title: "מוצרים ועלויות" },
    { number: 2, title: "עלויות שכר" },
    { number: 3, title: "תחזית מכירות" },
    { number: 4, title: "הוצאות" },
    { number: 5, title: "רווח והפסד" }
  ];

  const progressPercentage = (currentStep / steps.length) * 100;

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-horizon-primary" />
          <p className="text-horizon-accent">טוען תחזית...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת ומד התקדמות */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl text-horizon-text">
                {forecastData.id ? 'עריכת תחזית ידנית' : 'יצירת תחזית ידנית חדשה'}
              </CardTitle>
              <p className="text-sm text-horizon-accent mt-1">
                {forecastData.forecast_name || 'תחזית חדשה'}
              </p>
            </div>
            
            {/* אינדיקטור שמירה */}
            <div className="flex items-center gap-3">
              {saveStatus === 'saving' && (
                <Badge variant="outline" className="border-blue-400 text-blue-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  שומר...
                </Badge>
              )}
              {saveStatus === 'saved' && (
                <Badge variant="outline" className="border-green-400 text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  נשמר ✓
                </Badge>
              )}
              {saveStatus === 'error' && (
                <Badge variant="outline" className="border-red-400 text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  שגיאה בשמירה
                </Badge>
              )}
              {lastSaved && (
                <span className="text-xs text-horizon-accent">
                  נשמר לאחרונה: {lastSaved.toLocaleTimeString('he-IL')}
                </span>
              )}
              {forecastData.id && (
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-400 hover:bg-green-500/10"
                >
                  <Download className="w-4 h-4 ml-1" />
                  ייצא ל-PDF
                </Button>
              )}
              <Button
                onClick={onCancel}
                variant="outline"
                size="sm"
                className="border-horizon text-horizon-accent"
              >
                חזור
              </Button>
            </div>
          </div>

          {/* ניווט ישיר בין שלבים */}
          <div className="mt-6 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {steps.map(step => (
                <button
                  key={step.number}
                  onClick={() => setCurrentStep(step.number)}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium ${
                    currentStep === step.number
                      ? 'bg-horizon-primary text-white shadow-md'
                      : 'bg-horizon-card text-horizon-accent hover:bg-horizon-card/80 hover:text-horizon-text border border-horizon'
                  }`}
                >
                  {step.number}. {step.title}
                </button>
              ))}
            </div>
          </div>

          {/* מד התקדמות */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      currentStep === step.number
                        ? 'border-horizon-primary bg-horizon-primary text-white'
                        : currentStep > step.number
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-horizon text-horizon-accent'
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="mr-3 text-right">
                    <div className={`text-sm font-medium ${
                      currentStep === step.number ? 'text-horizon-primary' : 'text-horizon-accent'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-horizon'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* תוכן השלבים */}
      <div className="min-h-[600px]">
        {currentStep === 1 && (
          <Step1ServicesAndCosts
            forecastData={forecastData}
            onUpdateForecast={updateForecast}
            onNext={() => setCurrentStep(2)}
            onBack={onCancel}
          />
        )}

        {currentStep === 2 && (
          <Step2SalaryCosts
            forecastData={forecastData}
            onUpdateForecast={updateForecast}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3SalesForecast
            forecastData={forecastData}
            onUpdateForecast={updateForecast}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
            customer={customer}
            sanitizeAllForecastData={sanitizeAllForecastData}
            setForecastData={setForecastData}
          />
        )}

        {currentStep === 4 && (
          <Step4Expenses
            forecastData={forecastData}
            onUpdateForecast={updateForecast}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 5 && (
          <Step5ProfitLoss
            forecastData={forecastData}
            onUpdateForecast={updateForecast}
            onSave={handleSave}
            onBack={() => setCurrentStep(4)}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}