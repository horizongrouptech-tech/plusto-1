import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  TrendingUp, 
  DollarSign, 
  Home,
  Sparkles,
  ArrowRight,
  X,
  CloudRain,
  Rocket
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function StrategicPlanInputForm({ 
  customerEmail, 
  onFormSubmit, 
  existingInput, 
  onClose,
  title,
  description,
  submitButtonText,
  selectedForecastType
}) {
  const [formData, setFormData] = useState({
    vision_for_next_year: existingInput?.vision_for_next_year || '',
    desired_monthly_revenue: existingInput?.desired_monthly_revenue || '',
    desired_monthly_net_profit: existingInput?.desired_monthly_net_profit || '',
    personal_take_home_pay_goal: existingInput?.personal_take_home_pay_goal || ''
  });

  // State מקומי לסוג התחזית - נתחיל עם הערך שהתקבל או null
  const [localForecastType, setLocalForecastType] = useState(selectedForecastType || null);

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // בדיקת בחירת סוג תחזית
    if (!localForecastType) {
      newErrors.forecast_type = 'נא לבחור את סוג התחזית (אופטימית או שמרנית)';
    }
    
    if (!formData.vision_for_next_year || formData.vision_for_next_year.trim().length < 20) {
      newErrors.vision_for_next_year = 'נא לתאר את החזון שלך בהרחבה (לפחות 20 תווים)';
    }
    
    if (!formData.desired_monthly_revenue || parseFloat(formData.desired_monthly_revenue) <= 0) {
      newErrors.desired_monthly_revenue = 'נא להזין יעד הכנסות חודשי תקין';
    }
    
    if (!formData.desired_monthly_net_profit || parseFloat(formData.desired_monthly_net_profit) <= 0) {
      newErrors.desired_monthly_net_profit = 'נא להזין יעד רווח חודשי תקין';
    }
    
    if (!formData.personal_take_home_pay_goal || parseFloat(formData.personal_take_home_pay_goal) <= 0) {
      newErrors.personal_take_home_pay_goal = 'נא להזין את הסכום שתרצה לקחת הביתה';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const processedData = {
      ...formData,
      desired_monthly_revenue: parseFloat(formData.desired_monthly_revenue),
      desired_monthly_net_profit: parseFloat(formData.desired_monthly_net_profit),
      personal_take_home_pay_goal: parseFloat(formData.personal_take_home_pay_goal),
      customer_email: customerEmail,
      selected_forecast_type: localForecastType, // שליחת הבחירה
    };

    console.log('Submitting strategic plan with data:', processedData);
    onFormSubmit(processedData);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-horizon-text">{title || "הגדרת תוכנית אסטרטגית"}</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-horizon-accent hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
      {description && <p className="text-horizon-accent mb-6">{description}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* בחירת סוג התחזית */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-horizon-primary" />
              בחר את סוג התחזית
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setLocalForecastType('optimistic');
                  if (errors.forecast_type) {
                    setErrors(prev => ({ ...prev, forecast_type: undefined }));
                  }
                }}
                className={`p-6 rounded-lg border-2 transition-all text-right hover:scale-105 ${
                  localForecastType === 'optimistic'
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-horizon bg-horizon-card hover:border-green-500/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Rocket className={`w-8 h-8 ${localForecastType === 'optimistic' ? 'text-green-400' : 'text-horizon-accent'}`} />
                  <div className="text-right">
                    <h3 className="font-semibold text-lg text-horizon-text mb-2">תחזית אופטימית</h3>
                    <p className="text-sm text-horizon-accent">
                      צמיחה של 15-25%, התמקדות בהזדמנויות שוק וחדשנות
                    </p>
                    {localForecastType === 'optimistic' && (
                      <Badge className="mt-3 bg-green-500 text-white">נבחר ✓</Badge>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLocalForecastType('conservative');
                  if (errors.forecast_type) {
                    setErrors(prev => ({ ...prev, forecast_type: undefined }));
                  }
                }}
                className={`p-6 rounded-lg border-2 transition-all text-right hover:scale-105 ${
                  localForecastType === 'conservative'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-horizon bg-horizon-card hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <CloudRain className={`w-8 h-8 ${localForecastType === 'conservative' ? 'text-blue-400' : 'text-horizon-accent'}`} />
                  <div className="text-right">
                    <h3 className="font-semibold text-lg text-horizon-text mb-2">תחזית שמרנית</h3>
                    <p className="text-sm text-horizon-accent">
                      צמיחה של 5-10%, התמקדות ביציבות וניהול סיכונים
                    </p>
                    {localForecastType === 'conservative' && (
                      <Badge className="mt-3 bg-blue-500 text-white">נבחר ✓</Badge>
                    )}
                  </div>
                </div>
              </button>
            </div>
            {errors.forecast_type && (
              <p className="text-red-400 text-sm mt-2 text-center">{errors.forecast_type}</p>
            )}
          </CardContent>
        </Card>

        {/* החזון שלך לעסק */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-horizon-primary" />
              החזון שלך לעסק
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-horizon-text text-base mb-2">
                איפה אתה רואה את העסק בעוד שנה מהיום?
              </Label>
              <p className="text-sm text-horizon-accent mb-3">
                תאר במילים איך הוא נראה, בנוי, פועל והחלק שלך בו (בהרחבה)
              </p>
              <Textarea
                value={formData.vision_for_next_year}
                onChange={(e) => handleChange('vision_for_next_year', e.target.value)}
                placeholder="תאר את החזון שלך בהרחבה... לדוגמה: בעוד שנה אני רואה את העסק עם 3 סניפים, צוות של 15 עובדים, מערכת ניהול אוטומטית..."
                className="bg-horizon-card border-horizon text-horizon-text min-h-[150px]"
                dir="rtl"
              />
              {errors.vision_for_next_year && (
                <p className="text-red-400 text-sm mt-1">{errors.vision_for_next_year}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* יעדי הכנסות */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-horizon-primary" />
              יעדי הכנסות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-horizon-text text-base mb-2">
                מה יעד ההכנסות החודשי הממוצע שלך?
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={formData.desired_monthly_revenue}
                  onChange={(e) => handleChange('desired_monthly_revenue', e.target.value)}
                  placeholder="לדוגמה: 150000"
                  className="bg-horizon-card border-horizon text-horizon-text text-lg"
                  dir="rtl"
                />
                <span className="text-horizon-accent whitespace-nowrap">₪ לחודש</span>
              </div>
              {errors.desired_monthly_revenue && (
                <p className="text-red-400 text-sm mt-1">{errors.desired_monthly_revenue}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* יעדי רווח */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              יעדי רווח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-horizon-text text-base mb-2">
                מה יעד הרווח החודשי הממוצע שלך?
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={formData.desired_monthly_net_profit}
                  onChange={(e) => handleChange('desired_monthly_net_profit', e.target.value)}
                  placeholder="לדוגמה: 50000"
                  className="bg-horizon-card border-horizon text-horizon-text text-lg"
                  dir="rtl"
                />
                <span className="text-horizon-accent whitespace-nowrap">₪ לחודש</span>
              </div>
              {errors.desired_monthly_net_profit && (
                <p className="text-red-400 text-sm mt-1">{errors.desired_monthly_net_profit}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* יעד אישי */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
              <Home className="w-5 h-5 text-horizon-secondary" />
              יעד אישי
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-horizon-text text-base mb-2">
                כמה כסף היית רוצה לקחת לבית על מנת לשדרג את איכות ורמת החיים שלך?
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={formData.personal_take_home_pay_goal}
                  onChange={(e) => handleChange('personal_take_home_pay_goal', e.target.value)}
                  placeholder="לדוגמה: 30000"
                  className="bg-horizon-card border-horizon text-horizon-text text-lg"
                  dir="rtl"
                />
                <span className="text-horizon-accent whitespace-nowrap">₪ לחודש</span>
              </div>
              {errors.personal_take_home_pay_goal && (
                <p className="text-red-400 text-sm mt-1">{errors.personal_take_home_pay_goal}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose} className="border-horizon text-horizon-accent">
              ביטול
            </Button>
          )}
          <Button
            type="submit"
            className="btn-horizon-primary px-8"
          >
            {submitButtonText || "המשך ליצירת תחזית"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}