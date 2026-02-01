import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  GripVertical, 
  ChevronUp,
  ChevronDown, 
  Users,
  DollarSign,
  Calendar,
  AlertCircle,
  Check
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency } from './utils/numberFormatter';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from '@/api/base44Client';
import SaveProgressIndicator from './SaveProgressIndicator';

const MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function Step2SalaryCosts({ forecastData, onUpdateForecast, onNext, onBack }) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  
  const handleSaveProgress = async () => {
    if (!forecastData.forecast_name?.trim()) {
      alert('נא להזין שם לתחזית לפני שמירה');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      if (forecastData.id) {
        await base44.entities.ManualForecast.update(forecastData.id, forecastData);
      } else {
        const created = await base44.entities.ManualForecast.create(forecastData);
        if (onUpdateForecast) {
          onUpdateForecast({ id: created.id });
        }
      }

      setLastSaved(new Date());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error saving:', error);
      setSaveStatus('error');
      alert('שגיאה בשמירה: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  // פונקציה לחישוב עלות עובד בחודש ספציפי
  const calculateEmployeeMonthlyCost = (employee, monthIndex) => {
    const startMonth = (employee.start_month || 1) - 1;
    const endMonth = employee.end_month ? employee.end_month - 1 : 11;
    
    if (monthIndex < startMonth || monthIndex > endMonth || 
        (employee.unpaid_leave_months && employee.unpaid_leave_months.includes(monthIndex + 1))) {
      return 0;
    }

    let monthlyBaseSalary = 0;
    
    // עבור עובד שעתי - השתמש בנתוני ביצוע אם קיימים
    if (employee.job_type === 'hourly') {
      if (employee.actual_monthly_salary_amounts?.[monthIndex] !== undefined && employee.actual_monthly_salary_amounts?.[monthIndex] !== null) {
        monthlyBaseSalary = employee.actual_monthly_salary_amounts[monthIndex];
      } else if (employee.monthly_salary_amounts?.[monthIndex] !== undefined && employee.monthly_salary_amounts?.[monthIndex] !== null) {
        monthlyBaseSalary = employee.monthly_salary_amounts[monthIndex];
      } else {
        const hours = employee.actual_monthly_hours?.[monthIndex] ?? 
                     employee.planned_monthly_hours?.[monthIndex] ?? 
                     employee.monthly_hours_amounts?.[monthIndex] ?? 
                     employee.hours_per_month ?? 0;
        const hourlyRate = employee.hourly_rate ?? 0;
        monthlyBaseSalary = hours * hourlyRate;
      }
    } else {
      if (employee.monthly_salary_amounts?.[monthIndex] !== undefined && employee.monthly_salary_amounts?.[monthIndex] !== null) {
        monthlyBaseSalary = employee.monthly_salary_amounts[monthIndex];
      } else {
        if (employee.job_type === 'sales_commission') {
          monthlyBaseSalary = 0;
        } else {
          monthlyBaseSalary = employee.base_salary ?? 0;
        }
      }
    }

    const monthlyBonus = employee.monthly_bonuses?.[monthIndex] ?? 0;
    const salaryAddition = employee.salary_addition_percentage ?? 25;
    const totalMonthlyCost = (monthlyBaseSalary + monthlyBonus) * (1 + salaryAddition / 100);

    return totalMonthlyCost;
  };

  // פונקציה לחישוב עלות שנתית כוללת של עובד
  const calculateEmployeeAnnualCost = (employee) => {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      total += calculateEmployeeMonthlyCost(employee, i);
    }
    return total;
  };

  // Drag & Drop for Planned Hires only
  const handlePlannedHiresDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(forecastData.planned_employee_hires || []);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    if (onUpdateForecast) {
      onUpdateForecast({ planned_employee_hires: reordered });
    }
  };

  // העתקת נתונים קיימים לתכנון וביצוע למשכורות שעתיות
  const migrateHourlyDataToPlanVsActual = (employee) => {
    if (employee.job_type !== 'hourly') return employee;
    
    const migrated = { ...employee };
    
    // העתקת שעות - אם יש נתונים קיימים, העתק אותם לתכנון וביצוע
    if (employee.monthly_hours_amounts) {
      migrated.planned_monthly_hours = [...employee.monthly_hours_amounts];
      migrated.actual_monthly_hours = [...employee.monthly_hours_amounts];
    } else {
      const defaultHours = employee.hours_per_month || 0;
      migrated.planned_monthly_hours = Array(12).fill(defaultHours);
      migrated.actual_monthly_hours = Array(12).fill(defaultHours);
    }
    
    // העתקת שכר - אם יש נתונים קיימים, העתק אותם לתכנון וביצוע
    if (employee.monthly_salary_amounts) {
      migrated.planned_monthly_salary_amounts = [...employee.monthly_salary_amounts];
      migrated.actual_monthly_salary_amounts = [...employee.monthly_salary_amounts];
    } else {
      const calculatedSalary = (employee.hours_per_month || 0) * (employee.hourly_rate || 0);
      migrated.planned_monthly_salary_amounts = Array(12).fill(calculatedSalary);
      migrated.actual_monthly_salary_amounts = Array(12).fill(calculatedSalary);
    }
    
    return migrated;
  };

  const addEmployee = () => {
    const newEmployee = {
      employee_role: "",
      job_type: "full_time",
      base_salary: 0,
      hourly_rate: 0,
      hours_per_month: 0,
      monthly_salary_amounts: Array(12).fill(0),
      monthly_hours_amounts: Array(12).fill(0),
      monthly_bonuses: Array(12).fill(0),
      planned_monthly_hours: Array(12).fill(0),
      actual_monthly_hours: Array(12).fill(0),
      planned_monthly_salary_amounts: Array(12).fill(0),
      actual_monthly_salary_amounts: Array(12).fill(0),
      salary_addition_percentage: 25,
      start_month: 1,
      end_month: 12,
      unpaid_leave_months: [],
      is_expanded: false,
      notes: ""
    };
    const updated = [...(forecastData.global_employees || []), newEmployee];
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  const removeEmployee = (index) => {
    const updated = (forecastData.global_employees || []).filter((_, i) => i !== index);
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  const updateEmployee = (index, field, value) => {
    const updated = [...(forecastData.global_employees || [])];
    const employeeToUpdate = { ...updated[index], [field]: value };
    
    // אם שינוי סוג משרה לשעתי - העתק נתונים קיימים לתכנון וביצוע
    if (field === 'job_type' && value === 'hourly') {
      const migrated = migrateHourlyDataToPlanVsActual(employeeToUpdate);
      updated[index] = migrated;
    } else {
      updated[index] = employeeToUpdate;
    }

    // If base salary changes, fill monthly salary amounts with new base value
    if (field === 'base_salary') {
      updated[index].monthly_salary_amounts = Array(12).fill(parseFloat(value) || 0);
    }
    
    // If hourly rate or default hours per month changes, fill monthly hours and calculated salary
    if (field === 'hourly_rate' || field === 'hours_per_month') {
      const currentHourlyRate = field === 'hourly_rate' ? (parseFloat(value) || 0) : (updated[index].hourly_rate || 0);
      const currentHoursPerMonth = field === 'hours_per_month' ? (parseFloat(value) || 0) : (updated[index].hours_per_month || 0);
      
      updated[index].hourly_rate = currentHourlyRate;
      updated[index].hours_per_month = currentHoursPerMonth;

      const calculatedSalary = currentHourlyRate * currentHoursPerMonth;
      
      updated[index].monthly_hours_amounts = Array(12).fill(currentHoursPerMonth || 0);
      updated[index].monthly_salary_amounts = Array(12).fill(calculatedSalary || 0);
      
      // אם זה עובד שעתי, עדכן גם תכנון וביצוע
      if (updated[index].job_type === 'hourly') {
        updated[index].planned_monthly_hours = Array(12).fill(currentHoursPerMonth || 0);
        updated[index].actual_monthly_hours = Array(12).fill(currentHoursPerMonth || 0);
        updated[index].planned_monthly_salary_amounts = Array(12).fill(calculatedSalary || 0);
        updated[index].actual_monthly_salary_amounts = Array(12).fill(calculatedSalary || 0);
      }
    }

    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  const updateMonthlySalary = (empIndex, monthIndex, value) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    updated[empIndex] = employee;

    if (!employee.monthly_salary_amounts) {
      employee.monthly_salary_amounts = Array(12).fill(0);
    }
    employee.monthly_salary_amounts[monthIndex] = parseFloat(value) || 0;

    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  const updateMonthlyHours = (empIndex, monthIndex, value) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    updated[empIndex] = employee;

    if (!employee.monthly_hours_amounts) {
      employee.monthly_hours_amounts = Array(12).fill(0);
    }
    employee.monthly_hours_amounts[monthIndex] = parseFloat(value) || 0;
    
    if (employee.job_type === 'hourly' && employee.hourly_rate !== undefined) {
      if (!employee.monthly_salary_amounts) {
        employee.monthly_salary_amounts = Array(12).fill(0);
      }
      const newHours = value === '' ? (employee.hours_per_month || 0) : (parseFloat(value) || 0);
      employee.monthly_salary_amounts[monthIndex] = newHours * (employee.hourly_rate || 0);
    }
    
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  const updateMonthlyBonus = (empIndex, monthIndex, value) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    updated[empIndex] = employee;

    if (!employee.monthly_bonuses) {
      employee.monthly_bonuses = Array(12).fill(0);
    }
    employee.monthly_bonuses[monthIndex] = parseFloat(value) || 0;
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  // עדכון שעות תכנון לעובד שעתי
  const updatePlannedMonthlyHours = (empIndex, monthIndex, value) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    updated[empIndex] = employee;

    if (!employee.planned_monthly_hours) {
      employee.planned_monthly_hours = Array(12).fill(0);
    }
    employee.planned_monthly_hours[monthIndex] = parseFloat(value) || 0;
    
    if (employee.job_type === 'hourly' && employee.hourly_rate !== undefined) {
      if (!employee.planned_monthly_salary_amounts) {
        employee.planned_monthly_salary_amounts = Array(12).fill(0);
      }
      employee.planned_monthly_salary_amounts[monthIndex] = employee.planned_monthly_hours[monthIndex] * (employee.hourly_rate || 0);
    }
    
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  // עדכון שעות ביצוע לעובד שעתי
  const updateActualMonthlyHours = (empIndex, monthIndex, value) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    updated[empIndex] = employee;

    if (!employee.actual_monthly_hours) {
      employee.actual_monthly_hours = Array(12).fill(0);
    }
    employee.actual_monthly_hours[monthIndex] = parseFloat(value) || 0;
    
    if (employee.job_type === 'hourly' && employee.hourly_rate !== undefined) {
      if (!employee.actual_monthly_salary_amounts) {
        employee.actual_monthly_salary_amounts = Array(12).fill(0);
      }
      employee.actual_monthly_salary_amounts[monthIndex] = employee.actual_monthly_hours[monthIndex] * (employee.hourly_rate || 0);
    }
    
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  // עדכון שכר תכנון (עבור עובד שעתי)
  const updatePlannedMonthlySalary = (empIndex, monthIndex, value) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    updated[empIndex] = employee;

    if (!employee.planned_monthly_salary_amounts) {
      employee.planned_monthly_salary_amounts = Array(12).fill(0);
    }
    employee.planned_monthly_salary_amounts[monthIndex] = parseFloat(value) || 0;
    
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  // עדכון שכר ביצוע (עבור עובד שעתי)
  const updateActualMonthlySalary = (empIndex, monthIndex, value) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    updated[empIndex] = employee;

    if (!employee.actual_monthly_salary_amounts) {
      employee.actual_monthly_salary_amounts = Array(12).fill(0);
    }
    employee.actual_monthly_salary_amounts[monthIndex] = parseFloat(value) || 0;
    
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  // פונקציה לשכפול סכום לכל המשבצות החודשיות
  const fillAllMonthlyValues = (empIndex, field, value, isPlanVsActual = false) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    const parsedValue = parseFloat(value) || 0;
    
    if (isPlanVsActual && employee.job_type === 'hourly') {
      if (field === 'hours') {
        employee.planned_monthly_hours = Array(12).fill(parsedValue);
        employee.actual_monthly_hours = Array(12).fill(parsedValue);
        const calculatedSalary = parsedValue * (employee.hourly_rate || 0);
        employee.planned_monthly_salary_amounts = Array(12).fill(calculatedSalary);
        employee.actual_monthly_salary_amounts = Array(12).fill(calculatedSalary);
      } else if (field === 'salary') {
        employee.planned_monthly_salary_amounts = Array(12).fill(parsedValue);
        employee.actual_monthly_salary_amounts = Array(12).fill(parsedValue);
      }
    } else {
      if (field === 'salary') {
        employee.monthly_salary_amounts = Array(12).fill(parsedValue);
      } else if (field === 'bonus') {
        employee.monthly_bonuses = Array(12).fill(parsedValue);
      } else if (field === 'hours') {
        employee.monthly_hours_amounts = Array(12).fill(parsedValue);
        if (employee.job_type === 'hourly' && employee.hourly_rate !== undefined) {
          const calculatedSalary = parsedValue * (employee.hourly_rate || 0);
          employee.monthly_salary_amounts = Array(12).fill(calculatedSalary);
        }
      }
    }
    
    updated[empIndex] = employee;
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  const toggleEmployeeExpanded = (index) => {
    const updated = [...(forecastData.global_employees || [])];
    updated[index] = { ...updated[index], is_expanded: !updated[index].is_expanded };
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  const toggleUnpaidLeave = (empIndex, month) => {
    const updated = [...(forecastData.global_employees || [])];
    const employee = { ...updated[empIndex] };
    updated[empIndex] = employee;

    if (!employee.unpaid_leave_months) {
      employee.unpaid_leave_months = [];
    }
    const currentLeaves = employee.unpaid_leave_months;
    if (currentLeaves.includes(month)) {
      employee.unpaid_leave_months = currentLeaves.filter(m => m !== month);
    } else {
      employee.unpaid_leave_months = [...currentLeaves, month];
    }
    if (onUpdateForecast) {
      onUpdateForecast({ global_employees: updated });
    }
  };

  const addPlannedHire = () => {
    const newHire = {
      role: "",
      count: 1,
      month_of_hire: 1,
      estimated_monthly_salary: 0,
      job_type: "full_time",
      salary_addition_percentage: 25
    };
    const updated = [...(forecastData.planned_employee_hires || []), newHire];
    if (onUpdateForecast) {
      onUpdateForecast({ planned_employee_hires: updated });
    }
  };

  const removePlannedHire = (index) => {
    const updated = (forecastData.planned_employee_hires || []).filter((_, i) => i !== index);
    if (onUpdateForecast) {
      onUpdateForecast({ planned_employee_hires: updated });
    }
  };

  const updatePlannedHire = (index, field, value) => {
    const updated = [...(forecastData.planned_employee_hires || [])];
    updated[index] = { ...updated[index], [field]: value };
    if (onUpdateForecast) {
      onUpdateForecast({ planned_employee_hires: updated });
    }
  };

  const calculateTotalSalaryCosts = () => {
    let total = 0;
    (forecastData.global_employees || []).forEach(emp => {
      total += calculateEmployeeAnnualCost(emp);
    });
    
    (forecastData.planned_employee_hires || []).forEach(hire => {
      const monthsWorking = 12 - (hire.month_of_hire - 1);
      const salaryAddition = hire.salary_addition_percentage ?? 25;
      const monthlyCost = (hire.estimated_monthly_salary ?? 0) * (1 + salaryAddition / 100);
      total += monthlyCost * monthsWorking * (hire.count || 1);
    });

    return total;
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* כרטיס סיכום עלויות */}
      <Card className="card-horizon border-horizon-primary">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-horizon-primary" />
            סיכום עלויות שכר שנתיות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency(calculateTotalSalaryCosts())}
            </div>
            <p className="text-sm text-horizon-accent mt-2">
              סה"כ עלויות שכר כולל תוספת מעביד ({ (forecastData.global_employees || []).length} עובדים + { (forecastData.planned_employee_hires || []).length} גיוסים)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* עובדים קיימים */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-3">
            <Users className="w-5 h-5 text-horizon-primary" />
            עובדים קיימים
            <SaveProgressIndicator
              onSave={handleSaveProgress}
              isSaving={isSaving}
              lastSaved={lastSaved}
              saveStatus={saveStatus}
              compact={true}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(!forecastData.global_employees || forecastData.global_employees.length === 0) ? (
            <Alert className="bg-horizon-card/50 border-horizon">
              <AlertCircle className="h-4 w-4 text-horizon-accent" />
              <AlertDescription className="text-horizon-accent">
                לא הוגדרו עובדים. לחץ על "הוסף עובד" למטה.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {(forecastData.global_employees || []).map((employee, empIndex) => (
                <Card key={empIndex} className="bg-horizon-card/30 border-horizon">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-horizon-text">
                        {employee.employee_role || `עובד ${empIndex + 1}`}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEmployeeExpanded(empIndex)}
                          className="text-horizon-primary hover:text-horizon-primary/80"
                        >
                          {employee.is_expanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 ml-1" />
                              הסתר פירוט חודשי
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 ml-1" />
                              הצג פירוט חודשי
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmployee(empIndex)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-horizon-text text-sm">תפקיד</Label>
                        <Input
                          value={employee.employee_role || ''}
                          onChange={(e) => updateEmployee(empIndex, 'employee_role', e.target.value)}
                          placeholder="למשל: מנהל, עובד מכירות"
                          className="bg-horizon-dark border-horizon text-horizon-text"
                        />
                      </div>

                      <div>
                        <Label className="text-horizon-text text-sm">סוג משרה</Label>
                        <Select
                          value={employee.job_type || "full_time"}
                          onValueChange={(value) => updateEmployee(empIndex, 'job_type', value)}
                        >
                          <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">גלובלי</SelectItem>
                            <SelectItem value="part_time">משרה חלקית</SelectItem>
                            <SelectItem value="hourly">שעתי</SelectItem>
                            <SelectItem value="sales_commission">עמלות</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {employee.job_type === 'hourly' ? (
                        <div>
                          <Label className="text-horizon-text text-sm">תעריף שעתי (₪)</Label>
                          <Input
                            type="number"
                            value={employee.hourly_rate ?? ''}
                            onChange={(e) => updateEmployee(empIndex, 'hourly_rate', parseFloat(e.target.value) || 0)}
                            placeholder="למשל: 60"
                            className="bg-horizon-dark border-horizon text-horizon-text"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label className="text-horizon-text text-sm">שכר בסיס ברוטו (₪)</Label>
                          <Input
                            type="number"
                            value={employee.base_salary ?? ''}
                            onChange={(e) => updateEmployee(empIndex, 'base_salary', parseFloat(e.target.value) || 0)}
                            placeholder="למשל: 15000"
                            className="bg-horizon-dark border-horizon text-horizon-text"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {employee.job_type === 'hourly' && (
                        <div>
                          <Label className="text-horizon-text text-sm">שעות בחודש (ברירת מחדל)</Label>
                          <Input
                            type="number"
                            value={employee.hours_per_month ?? ''}
                            onChange={(e) => updateEmployee(empIndex, 'hours_per_month', parseFloat(e.target.value) || 0)}
                            placeholder="למשל: 160"
                            className="bg-horizon-dark border-horizon text-horizon-text"
                          />
                        </div>
                      )}

                      <div>
                        <Label className="text-horizon-text text-sm">תוספת סוציאלית (%)</Label>
                        <Input
                          type="number"
                          value={employee.salary_addition_percentage ?? 25}
                          onChange={(e) => updateEmployee(empIndex, 'salary_addition_percentage', parseFloat(e.target.value) || 0)}
                          placeholder="25"
                          className="bg-horizon-dark border-horizon text-horizon-text"
                        />
                      </div>

                      <div>
                        <Label className="text-horizon-text text-sm">חודש התחלה</Label>
                        <Select
                          value={(employee.start_month || 1).toString()}
                          onValueChange={(value) => updateEmployee(empIndex, 'start_month', parseInt(value))}
                        >
                          <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((month, idx) => (
                              <SelectItem key={idx} value={(idx + 1).toString()}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-horizon-text text-sm">חודש סיום (אופציונלי)</Label>
                        <Select
                          value={(employee.end_month || 12).toString()}
                          onValueChange={(value) => updateEmployee(empIndex, 'end_month', parseInt(value))}
                        >
                          <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((month, idx) => (
                              <SelectItem key={idx} value={(idx + 1).toString()}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* שדה הערה */}
                    <div className="mt-2">
                      <Label className="text-horizon-text text-sm">הערות</Label>
                      <Input
                        value={employee.notes || ''}
                        onChange={(e) => updateEmployee(empIndex, 'notes', e.target.value)}
                        placeholder="הערות נוספות על העובד..."
                        className="bg-horizon-dark border-horizon text-horizon-text mt-1"
                      />
                    </div>

                    {/* פירוט חודשי - נפתח בלחיצה */}
                    {employee.is_expanded && (
                      <div className="mt-4 p-4 bg-horizon-dark/50 rounded-lg border border-horizon space-y-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-horizon-text flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-horizon-primary" />
                            פירוט חודשי - {employee.employee_role || 'עובד'}
                          </h4>
                          <Badge variant="outline" className="text-horizon-accent">
                            {employee.job_type === 'hourly' ? 'שעתי' : 
                             employee.job_type === 'part_time' ? 'חלקי' :
                             employee.job_type === 'sales_commission' ? 'עמלות' : 'גלובלי'}
                          </Badge>
                        </div>

                        <Alert className="bg-horizon-card/50 border-horizon-primary/30">
                          <AlertCircle className="h-4 w-4 text-horizon-primary" />
                          <AlertDescription className="text-horizon-accent text-sm">
                            {employee.job_type === 'hourly' 
                              ? 'עובד שעתי: הזן שעות תכנון וביצוע לכל חודש. העלות תחושב אוטומטית (שעות × תעריף שעתי). ניתן גם לערוך את השכר ישירות.'
                              : employee.job_type === 'sales_commission'
                              ? 'עובד עמלות: הזן בונוסים/עמלות חודשיים. ניתן גם לערוך שכר בסיס אם קיים.'
                              : 'הזן שכר ובונוס לכל חודש. השכר שהוזן למעלה הוא ברירת המחדל. תוכל לערוך כל חודש בנפרד.'}
                          </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {MONTHS.map((monthName, monthIndex) => {
                            const isUnpaidLeave = employee.unpaid_leave_months?.includes(monthIndex + 1);
                            const isInRange = monthIndex >= ((employee.start_month || 1) - 1) && 
                                             monthIndex <= ((employee.end_month || 12) - 1);

                            return (
                              <div 
                                key={monthIndex} 
                                className={`p-3 rounded-lg border ${
                                  isUnpaidLeave ? 'bg-red-900/20 border-red-500/30' :
                                  !isInRange ? 'bg-horizon-card/20 border-horizon/20 opacity-50' :
                                  'bg-horizon-card border-horizon'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-xs text-horizon-text font-medium">
                                    {monthName}
                                  </Label>
                                  <Checkbox
                                    checked={isUnpaidLeave}
                                    onCheckedChange={() => toggleUnpaidLeave(empIndex, monthIndex + 1)}
                                    className="border-horizon-accent"
                                    title="חופשה ללא תשלום"
                                  />
                                </div>

                                {/* תכנון מול ביצוע - רק למשכורות שעתיות */}
                                {employee.job_type === 'hourly' ? (
                                  <>
                                    {/* תכנון - שעות */}
                                    <div className="mb-2">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Label className="text-xs text-horizon-accent">תכנון - שעות</Label>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0 text-horizon-primary hover:bg-horizon-primary/20"
                                          onClick={() => {
                                            const currentValue = employee.planned_monthly_hours?.[monthIndex] ?? employee.hours_per_month ?? 0;
                                            fillAllMonthlyValues(empIndex, 'hours', currentValue, true);
                                          }}
                                          title="שכפל לכל החודשים"
                                        >
                                          <Check className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <Input
                                       type="number"
                                       value={employee.planned_monthly_hours?.[monthIndex] ?? ''}
                                       onChange={(e) => updatePlannedMonthlyHours(empIndex, monthIndex, e.target.value)}
                                       className="bg-horizon-dark border-horizon text-horizon-text text-xs h-7 mb-2"
                                       placeholder="שעות תכנון"
                                      />
                                    </div>

                                    {/* תכנון - שכר */}
                                    <div className="mb-2">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Label className="text-xs text-horizon-accent">תכנון - שכר</Label>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0 text-horizon-primary hover:bg-horizon-primary/20"
                                          onClick={() => {
                                            const currentValue = employee.planned_monthly_salary_amounts?.[monthIndex] ?? 
                                              ((employee.planned_monthly_hours?.[monthIndex] ?? employee.hours_per_month ?? 0) * (employee.hourly_rate ?? 0));
                                            fillAllMonthlyValues(empIndex, 'salary', currentValue, true);
                                          }}
                                          title="שכפל לכל החודשים"
                                        >
                                          <Check className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <Input
                                       type="number"
                                       value={employee.planned_monthly_salary_amounts?.[monthIndex] ?? ''}
                                       onChange={(e) => updatePlannedMonthlySalary(empIndex, monthIndex, e.target.value)}
                                       className="bg-horizon-dark border-horizon text-horizon-text text-xs h-7 mb-2"
                                       placeholder="שכר תכנון"
                                      />
                                    </div>

                                    {/* ביצוע - שעות */}
                                    <div className="mb-2">
                                      <Label className="text-xs text-horizon-accent">ביצוע - שעות</Label>
                                      <Input
                                       type="number"
                                       value={employee.actual_monthly_hours?.[monthIndex] ?? ''}
                                       onChange={(e) => updateActualMonthlyHours(empIndex, monthIndex, e.target.value)}
                                       className="bg-horizon-dark border-horizon text-horizon-text text-xs h-7 mb-2"
                                       placeholder="שעות ביצוע"
                                      />
                                    </div>

                                    {/* ביצוע - שכר */}
                                    <div className="mb-2">
                                      <Label className="text-xs text-horizon-accent">ביצוע - שכר</Label>
                                      <Input
                                       type="number"
                                       value={employee.actual_monthly_salary_amounts?.[monthIndex] ?? ''}
                                       onChange={(e) => updateActualMonthlySalary(empIndex, monthIndex, e.target.value)}
                                       className="bg-horizon-dark border-horizon text-horizon-text text-xs h-7 mb-2"
                                       placeholder="שכר ביצוע"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* שדה שעות רגיל (אם יש) */}
                                    {employee.job_type === 'hourly' && (
                                      <>
                                        <div className="flex items-center gap-1 mb-1">
                                          <Label className="text-xs text-horizon-accent">שעות</Label>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 text-horizon-primary hover:bg-horizon-primary/20"
                                            onClick={() => {
                                              const currentValue = employee.monthly_hours_amounts?.[monthIndex] ?? employee.hours_per_month ?? 0;
                                              fillAllMonthlyValues(empIndex, 'hours', currentValue);
                                            }}
                                            title="שכפל לכל החודשים"
                                          >
                                            <Check className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        <Input
                                          type="number"
                                          value={employee.monthly_hours_amounts?.[monthIndex] ?? (employee.hours_per_month || '')}
                                          onChange={(e) => updateMonthlyHours(empIndex, monthIndex, e.target.value)}
                                          className="bg-horizon-dark border-horizon text-horizon-text text-xs h-7 mb-2"
                                          placeholder="שעות"
                                        />
                                      </>
                                    )}

                                    {/* שדה שכר - לכל סוגי המשרות (לא שעתי או שעתי ללא תכנון מול ביצוע) */}
                                    {employee.job_type !== 'sales_commission' && (
                                      <>
                                        <div className="flex items-center gap-1 mb-1">
                                          <Label className="text-xs text-horizon-accent">שכר ברוטו</Label>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 text-horizon-primary hover:bg-horizon-primary/20"
                                            onClick={() => {
                                              const currentValue = employee.monthly_salary_amounts?.[monthIndex] ?? 
                                                (employee.job_type === 'hourly' 
                                                  ? ((employee.monthly_hours_amounts?.[monthIndex] ?? employee.hours_per_month ?? 0) * (employee.hourly_rate ?? 0))
                                                  : (employee.base_salary ?? 0));
                                              fillAllMonthlyValues(empIndex, 'salary', currentValue);
                                            }}
                                            title="שכפל לכל החודשים"
                                          >
                                            <Check className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        <Input
                                          type="number"
                                          value={employee.monthly_salary_amounts?.[monthIndex] ?? 
                                                 (employee.job_type === 'hourly' 
                                                    ? ((employee.monthly_hours_amounts?.[monthIndex] ?? employee.hours_per_month ?? 0) * (employee.hourly_rate ?? 0))
                                                    : (employee.base_salary ?? ''))}
                                          onChange={(e) => updateMonthlySalary(empIndex, monthIndex, e.target.value)}
                                          className="bg-horizon-dark border-horizon text-horizon-text text-xs h-7 mb-2"
                                          placeholder="שכר ברוטו"
                                        />
                                      </>
                                    )}
                                  </>
                                )}

                                {/* שדה בונוס - לכל סוגי המשרות */}
                                <div className="flex items-center gap-1 mb-1">
                                  <Label className="text-xs text-horizon-accent">בונוס</Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 text-horizon-primary hover:bg-horizon-primary/20"
                                    onClick={() => {
                                      const currentValue = employee.monthly_bonuses?.[monthIndex] ?? 0;
                                      fillAllMonthlyValues(empIndex, 'bonus', currentValue);
                                    }}
                                    title="שכפל לכל החודשים"
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  value={employee.monthly_bonuses?.[monthIndex] ?? ''}
                                  onChange={(e) => updateMonthlyBonus(empIndex, monthIndex, e.target.value)}
                                  className="bg-horizon-dark border-horizon text-horizon-text text-xs h-7 mb-1"
                                  placeholder="בונוס"
                                />

                                {/* הצגת עלות מחושבת */}
                                <div className="text-xs text-green-400 font-semibold mt-2 pt-2 border-t border-horizon">
                                  עלות: {formatCurrency(calculateEmployeeMonthlyCost(employee, monthIndex))}
                                </div>

                                {isUnpaidLeave && (
                                  <Badge variant="destructive" className="mt-2 text-xs w-full justify-center">
                                    ללא תשלום
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button
            onClick={addEmployee}
            variant="outline"
            className="w-full border-horizon-primary text-horizon-primary hover:bg-horizon-primary/20"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף עובד
          </Button>
        </CardContent>
      </Card>

      {/* גיוסים מתוכננים */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              גיוסים מתוכננים
            </CardTitle>
            <Button onClick={addPlannedHire} size="sm" variant="outline" className="border-horizon text-horizon-text">
              <Plus className="w-4 h-4 ml-2" />
              הוסף גיוס
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(forecastData.planned_employee_hires || []).length === 0 ? (
            <div className="text-center py-6 text-horizon-accent">
              <p className="text-sm">אין גיוסים מתוכננים</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handlePlannedHiresDragEnd}>
              <Droppable droppableId="planned-hires">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {(forecastData.planned_employee_hires || []).map((hire, hireIndex) => (
                      <Draggable key={`hire-${hireIndex}`} draggableId={`hire-${hireIndex}`} index={hireIndex}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-horizon-card/50 border border-horizon rounded-lg p-4 ${
                              snapshot.isDragging ? 'shadow-lg border-blue-400' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div {...provided.dragHandleProps} className="mt-2 cursor-move text-horizon-accent hover:text-horizon-text">
                                <GripVertical className="w-5 h-5" />
                              </div>

                              <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div>
                                  <Label className="text-horizon-text text-sm">תפקיד</Label>
                                  <Input
                                    value={hire.role ?? ""}
                                    onChange={(e) => updatePlannedHire(hireIndex, 'role', e.target.value)}
                                    placeholder="תפקיד"
                                    className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                                  />
                                </div>

                                <div>
                                  <Label className="text-horizon-text text-sm">כמות</Label>
                                  <Input
                                    type="number"
                                    value={hire.count ?? 1}
                                    onChange={(e) => updatePlannedHire(hireIndex, 'count', parseFloat(e.target.value) || 0)}
                                    className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                                  />
                                </div>

                                <div>
                                  <Label className="text-horizon-text text-sm">חודש גיוס</Label>
                                  <Select
                                    value={String(hire.month_of_hire ?? 1)}
                                    onValueChange={(value) => updatePlannedHire(hireIndex, 'month_of_hire', parseInt(value))}
                                  >
                                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MONTHS.map((month, idx) => (
                                        <SelectItem key={idx} value={String(idx + 1)}>
                                          {month}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-horizon-text text-sm">שכר משוער</Label>
                                  <Input
                                    type="number"
                                    value={hire.estimated_monthly_salary ?? 0}
                                    onChange={(e) => updatePlannedHire(hireIndex, 'estimated_monthly_salary', parseFloat(e.target.value) || 0)}
                                    className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                                  />
                                </div>

                                <div>
                                  <Label className="text-horizon-text text-sm">סוג משרה</Label>
                                  <Select
                                    value={hire.job_type ?? "full_time"}
                                    onValueChange={(value) => updatePlannedHire(hireIndex, 'job_type', value)}
                                  >
                                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="full_time">גלובלי</SelectItem>
                                      <SelectItem value="part_time">משרה חלקית</SelectItem>
                                      <SelectItem value="hourly">שעתי</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <Button
                                onClick={() => removePlannedHire(hireIndex)}
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* כפתורי ניווט */}
      <div className="flex justify-between pt-6">
        <Button onClick={onBack} variant="outline" className="border-horizon text-horizon-text">
          <ChevronRight className="w-4 h-4 ml-2" />
          חזור
        </Button>
        <Button onClick={handleNext} className="btn-horizon-primary">
          המשך לתחזית מכירות
          <ChevronLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </div>
  );
}