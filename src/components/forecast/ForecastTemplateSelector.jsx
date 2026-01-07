import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Users, TrendingUp, Store, Truck, Utensils, Shirt, CheckCircle } from "lucide-react";

const FORECAST_TEMPLATES = [
  {
    id: 'retail_basic',
    name: 'קמעונאות - בסיסי',
    icon: Store,
    description: 'תחזית עבור חנות קמעונאית קטנה-בינונית',
    services: [
      { service_name: 'מוצר A', price: 100, has_vat: true, costs: [{ cost_name: 'עלות קנייה', amount: 60, has_vat: true, is_percentage: false }] },
      { service_name: 'מוצר B', price: 150, has_vat: true, costs: [{ cost_name: 'עלות קנייה', amount: 90, has_vat: true, is_percentage: false }] },
      { service_name: 'מוצר C', price: 200, has_vat: true, costs: [{ cost_name: 'עלות קנייה', amount: 120, has_vat: true, is_percentage: false }] },
    ],
    employees: [
      { employee_role: 'מנהל חנות', job_type: 'full_time', base_salary: 12000, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
      { employee_role: 'מוכר', job_type: 'full_time', base_salary: 8000, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
    ],
    expenses: {
      marketing: [
        { name: 'פרסום דיגיטלי', amount: 3000, has_vat: true, planned_monthly_amounts: Array(12).fill(3000), actual_monthly_amounts: Array(12).fill(0) }
      ],
      admin: [
        { name: 'שכירות', amount: 8000, has_vat: false, planned_monthly_amounts: Array(12).fill(8000), actual_monthly_amounts: Array(12).fill(0) },
        { name: 'חשמל ומים', amount: 1500, has_vat: true, planned_monthly_amounts: Array(12).fill(1500), actual_monthly_amounts: Array(12).fill(0) }
      ]
    }
  },
  {
    id: 'services_business',
    name: 'עסק שירותים',
    icon: Users,
    description: 'תחזית עבור עסק מבוסס שירותים מקצועיים',
    services: [
      { service_name: 'ייעוץ שעתי', price: 400, has_vat: true, costs: [] },
      { service_name: 'פרויקט קטן', price: 5000, has_vat: true, costs: [{ cost_name: 'קבלני משנה', amount: 2000, has_vat: true, is_percentage: false }] },
      { service_name: 'פרויקט גדול', price: 15000, has_vat: true, costs: [{ cost_name: 'קבלני משנה', amount: 6000, has_vat: true, is_percentage: false }] },
    ],
    employees: [
      { employee_role: 'יועץ בכיר', job_type: 'full_time', base_salary: 18000, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
      { employee_role: 'מנהל פרויקטים', job_type: 'full_time', base_salary: 14000, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
    ],
    expenses: {
      marketing: [
        { name: 'שיווק ברשתות', amount: 4000, has_vat: true, planned_monthly_amounts: Array(12).fill(4000), actual_monthly_amounts: Array(12).fill(0) }
      ],
      admin: [
        { name: 'משרד', amount: 5000, has_vat: false, planned_monthly_amounts: Array(12).fill(5000), actual_monthly_amounts: Array(12).fill(0) },
        { name: 'ביטוחים', amount: 2000, has_vat: true, planned_monthly_amounts: Array(12).fill(2000), actual_monthly_amounts: Array(12).fill(0) }
      ]
    }
  },
  {
    id: 'restaurant',
    name: 'מסעדה',
    icon: Utensils,
    description: 'תחזית מותאמת לעסק מסעדנות',
    services: [
      { service_name: 'ארוחות', price: 80, has_vat: true, costs: [{ cost_name: 'מזון', amount: 0, has_vat: true, is_percentage: true, percentage_of_price: 35 }] },
      { service_name: 'משקאות', price: 20, has_vat: true, costs: [{ cost_name: 'עלות משקאות', amount: 0, has_vat: true, is_percentage: true, percentage_of_price: 25 }] },
    ],
    employees: [
      { employee_role: 'שף ראשי', job_type: 'full_time', base_salary: 15000, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
      { employee_role: 'מלצר', job_type: 'part_time', base_salary: 6000, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
      { employee_role: 'עובד מטבח', job_type: 'hourly', hourly_rate: 45, hours_per_month: 160, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
    ],
    expenses: {
      marketing: [
        { name: '10bis ודיגיטל', amount: 2500, has_vat: true, planned_monthly_amounts: Array(12).fill(2500), actual_monthly_amounts: Array(12).fill(0) }
      ],
      admin: [
        { name: 'שכירות', amount: 15000, has_vat: false, planned_monthly_amounts: Array(12).fill(15000), actual_monthly_amounts: Array(12).fill(0) },
        { name: 'חשמל וגז', amount: 3500, has_vat: true, planned_monthly_amounts: Array(12).fill(3500), actual_monthly_amounts: Array(12).fill(0) }
      ]
    }
  },
  {
    id: 'ecommerce',
    name: 'מסחר אלקטרוני',
    icon: Package,
    description: 'תחזית עבור עסק אונליין',
    services: [
      { service_name: 'מוצר דיגיטלי', price: 99, has_vat: true, costs: [] },
      { service_name: 'מוצר פיזי', price: 199, has_vat: true, costs: [
        { cost_name: 'עלות מוצר', amount: 100, has_vat: true, is_percentage: false },
        { cost_name: 'משלוח', amount: 20, has_vat: true, is_percentage: false }
      ] },
    ],
    employees: [
      { employee_role: 'מנהל תוכן', job_type: 'full_time', base_salary: 10000, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
      { employee_role: 'שירות לקוחות', job_type: 'part_time', base_salary: 6000, salary_addition_percentage: 25, start_month: 1, end_month: 12 },
    ],
    expenses: {
      marketing: [
        { name: 'פרסום Google/Facebook', amount: 8000, has_vat: true, planned_monthly_amounts: Array(12).fill(8000), actual_monthly_amounts: Array(12).fill(0) },
        { name: 'influencers', amount: 3000, has_vat: false, planned_monthly_amounts: Array(12).fill(3000), actual_monthly_amounts: Array(12).fill(0) }
      ],
      admin: [
        { name: 'אחסון ודומיין', amount: 500, has_vat: true, planned_monthly_amounts: Array(12).fill(500), actual_monthly_amounts: Array(12).fill(0) },
        { name: 'מערכות ותוכנות', amount: 1000, has_vat: true, planned_monthly_amounts: Array(12).fill(1000), actual_monthly_amounts: Array(12).fill(0) }
      ]
    }
  }
];

export default function ForecastTemplateSelector({ isOpen, onClose, onSelectTemplate, customer }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  const handleApplyTemplate = () => {
    const template = FORECAST_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const templateData = {
      forecast_name: `${template.name} - ${new Date().getFullYear()}`,
      forecast_year: new Date().getFullYear(),
      start_month: 1,
      end_month: 12,
      services: template.services.map(s => ({
        ...s,
        calculated: {
          cost_of_sale: s.costs.reduce((sum, c) => {
            if (c.is_percentage) {
              return sum + (s.price * c.percentage_of_price / 100);
            }
            return sum + (c.amount || 0);
          }, 0),
          gross_profit: s.price - s.costs.reduce((sum, c) => {
            if (c.is_percentage) {
              return sum + (s.price * c.percentage_of_price / 100);
            }
            return sum + (c.amount || 0);
          }, 0),
          gross_margin_percentage: ((s.price - s.costs.reduce((sum, c) => {
            if (c.is_percentage) {
              return sum + (s.price * c.percentage_of_price / 100);
            }
            return sum + (c.amount || 0);
          }, 0)) / s.price) * 100
        }
      })),
      global_employees: template.employees.map(emp => ({
        ...emp,
        monthly_salary_amounts: Array(12).fill(emp.base_salary || 0),
        monthly_hours_amounts: emp.job_type === 'hourly' ? Array(12).fill(emp.hours_per_month || 0) : Array(12).fill(0),
        monthly_bonuses: Array(12).fill(0),
        unpaid_leave_months: [],
        is_expanded: false
      })),
      planned_employee_hires: [],
      working_days_per_month: 22,
      sales_forecast_onetime: template.services.map(s => ({
        service_name: s.service_name,
        planned_monthly_quantities: Array(12).fill(0),
        actual_monthly_quantities: Array(12).fill(0),
        planned_monthly_revenue: Array(12).fill(0),
        actual_monthly_revenue: Array(12).fill(0)
      })),
      detailed_expenses: {
        marketing_sales: template.expenses.marketing,
        admin_general: template.expenses.admin
      },
      financing_loans: [],
      financing_expenses: { monthly_amounts: Array(12).fill(0) },
      tax_rate: 23,
      company_type: 'company'
    };

    onSelectTemplate(templateData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-horizon-primary" />
            תבניות תחזית מוכנות
          </DialogTitle>
          <p className="text-sm text-horizon-accent mt-2">
            {customer?.business_name || customer?.full_name} - בחר תבנית מתאימה לסוג העסק שלך
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {FORECAST_TEMPLATES.map(template => {
            const Icon = template.icon;
            const isSelected = selectedTemplateId === template.id;

            return (
              <Card
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-2 border-horizon-primary bg-horizon-primary/10 shadow-lg' 
                    : 'border border-horizon hover:border-horizon-primary/50'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${
                        isSelected 
                          ? 'bg-horizon-primary' 
                          : 'bg-horizon-card'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          isSelected ? 'text-white' : 'text-horizon-primary'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-horizon-text">
                          {template.name}
                        </CardTitle>
                        <p className="text-xs text-horizon-accent mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-6 h-6 text-horizon-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-horizon-accent">מוצרים/שירותים:</span>
                      <Badge variant="outline" className="border-horizon-primary text-horizon-primary">
                        {template.services.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-horizon-accent">עובדים:</span>
                      <Badge variant="outline" className="border-blue-400 text-blue-400">
                        {template.employees.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-horizon-accent">הוצאות שיווק:</span>
                      <Badge variant="outline" className="border-orange-400 text-orange-400">
                        {template.expenses.marketing.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-horizon-accent">הוצאות הנהלה:</span>
                      <Badge variant="outline" className="border-purple-400 text-purple-400">
                        {template.expenses.admin.length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-horizon">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-horizon text-horizon-text"
          >
            ביטול
          </Button>
          <Button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplateId}
            className="btn-horizon-primary"
          >
            <CheckCircle className="w-4 h-4 ml-2" />
            השתמש בתבנית
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}