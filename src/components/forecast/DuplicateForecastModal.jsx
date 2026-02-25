import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Loader2 } from 'lucide-react';

import { toast } from "sonner";
import { BusinessForecast, ManualForecast } from '@/api/entities';

export default function DuplicateForecastModal({ isOpen, onClose, sourceForecast, customer, onSuccess }) {
  const currentYear = new Date().getFullYear();
  
  const [duplicateData, setDuplicateData] = useState({
    forecast_name: `העתק - ${sourceForecast?.forecast_name || 'תחזית'}`,
    forecast_year: currentYear + 1,
    start_month: sourceForecast?.start_month || 1,
    end_month: sourceForecast?.end_month || 12
  });
  
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!sourceForecast || !customer) {
      toast.warning('חסרים נתונים ליצירת העתק');
      return;
    }

    if (!duplicateData.forecast_name.trim()) {
      toast.warning('נא להזין שם לתחזית החדשה');
      return;
    }

    setIsDuplicating(true);
    
    try {
      // בניית התחזית המשוכפלת
      const duplicatedForecast = {
        // ✅ פרטים בסיסיים
        customer_email: customer.email,
        forecast_name: duplicateData.forecast_name,
        forecast_year: duplicateData.forecast_year,
        start_month: duplicateData.start_month,
        end_month: duplicateData.end_month,
        
        // ✅ הגדרות כלליות
        working_days_per_month: sourceForecast.working_days_per_month || 22,
        tax_rate: sourceForecast.tax_rate || 23,
        company_type: sourceForecast.company_type || 'company',
        
        // ✅ העתק שירותים/מוצרים עם עלויות
        services: sourceForecast.services || [],
        
        // ✅ העתק עובדים
        global_employees: sourceForecast.global_employees || [],
        planned_employee_hires: sourceForecast.planned_employee_hires || [],
        
        // ✅ העתק תחזית מכירות - רק PLANNED, אפס ACTUAL
        sales_forecast_onetime: (sourceForecast.sales_forecast_onetime || []).map(item => ({
          service_name: item.service_name,
          planned_monthly_quantities: item.planned_monthly_quantities || Array(12).fill(0),
          actual_monthly_quantities: Array(12).fill(0), // ❌ אפס בפועל
          planned_monthly_revenue: item.planned_monthly_revenue || Array(12).fill(0),
          actual_monthly_revenue: Array(12).fill(0) // ❌ אפס בפועל
        })),
        
        // ✅ העתק הוצאות - רק PLANNED, אפס ACTUAL
        detailed_expenses: {
          marketing_sales: (sourceForecast.detailed_expenses?.marketing_sales || []).map(exp => ({
            ...exp,
            actual_monthly_amounts: Array(12).fill(0) // ❌ אפס בפועל
          })),
          admin_general: (sourceForecast.detailed_expenses?.admin_general || []).map(exp => ({
            ...exp,
            actual_monthly_amounts: Array(12).fill(0) // ❌ אפס בפועל
          }))
        },
        
        // ✅ העתק מימון
        financing_loans: sourceForecast.financing_loans || [],
        financing_expenses: sourceForecast.financing_expenses || { monthly_amounts: Array(12).fill(0) },
        
        // ❌ אפס תוצאות - יחושבו מחדש
        profit_loss_monthly: [],
        summary: {},
        vat_summary: {}
      };
      
      // שמירת התחזית החדשה
      let newForecast;
      
      if (sourceForecast.type === 'manual' || !sourceForecast.is_system_generated) {
        newForecast = await ManualForecast.create(duplicatedForecast);
      } else {
        newForecast = await BusinessForecast.create({
          ...duplicatedForecast,
          is_system_generated: false, // סמן כלא אוטומטי
          is_editable: true
        });
      }
      
      toast.success(`התחזית שוכפלה בהצלחה! תחזית חדשה: "${duplicateData.forecast_name}"`);
      
      // העבר לעריכת התחזית החדשה
      if (onSuccess) {
        onSuccess(newForecast);
      }
      
      onClose();
      
    } catch (error) {
      console.error('Error duplicating forecast:', error);
      toast.error('שגיאה בשכפול התחזית: ' + error.message);
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-horizon-text flex items-center gap-2">
            <Copy className="w-5 h-5 text-horizon-primary" />
            שכפול תחזית
          </DialogTitle>
          <DialogDescription className="text-horizon-accent text-right">
            יצירת תחזית חדשה מבוססת על: <strong>{sourceForecast?.forecast_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="forecast_name" className="text-horizon-text">שם התחזית החדשה *</Label>
            <Input
              id="forecast_name"
              value={duplicateData.forecast_name}
              onChange={(e) => setDuplicateData(prev => ({ ...prev, forecast_name: e.target.value }))}
              className="bg-horizon-card border-horizon text-horizon-text"
              placeholder="לדוגמה: תחזית 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="forecast_year" className="text-horizon-text">שנת התחזית *</Label>
              <Select
                value={duplicateData.forecast_year.toString()}
                onValueChange={(value) => setDuplicateData(prev => ({ ...prev, forecast_year: parseInt(value) }))}
              >
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start_month" className="text-horizon-text text-sm">חודש התחלה</Label>
                <Select
                  value={duplicateData.start_month.toString()}
                  onValueChange={(value) => setDuplicateData(prev => ({ ...prev, start_month: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="end_month" className="text-horizon-text text-sm">חודש סיום</Label>
                <Select
                  value={duplicateData.end_month.toString()}
                  onValueChange={(value) => setDuplicateData(prev => ({ ...prev, end_month: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* הסבר על מה מועתק */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
            <h4 className="font-semibold text-blue-400 mb-2">מה יועתק לתחזית החדשה:</h4>
            <ul className="space-y-1 text-horizon-accent text-xs">
              <li>✅ כל השירותים/מוצרים + עלויות</li>
              <li>✅ כל העובדים + שכר</li>
              <li>✅ תחזית מכירות <strong>מתוכננת</strong> (planned)</li>
              <li>✅ הוצאות <strong>מתוכננות</strong> (planned)</li>
              <li>✅ הגדרות מס ומימון</li>
              <li className="text-yellow-400">❌ נתוני ביצוע (actual) יתחילו מאפס</li>
              <li className="text-yellow-400">❌ דוחות רווח והפסד יחושבו מחדש</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDuplicating}
            className="border-horizon text-horizon-text"
          >
            ביטול
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            className="btn-horizon-primary"
          >
            {isDuplicating ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                משכפל...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 ml-2" />
                שכפל תחזית
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}