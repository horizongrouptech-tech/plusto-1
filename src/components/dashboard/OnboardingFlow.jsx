
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Building2, Target, MapPin, CheckCircle, Plus, X, AlertTriangle, Loader2, Users, CheckCircle2 } from "lucide-react"; // Updated lucide-react imports, added CheckCircle2
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from '@/api/entities';


const steps = [
  {
    title: "פרטי עסק בסיסיים",
    icon: Building2,
    fields: ["business_name", "business_type", "phone", "company_size"]
  },
  {
    title: "מידע כלכלי ומיקום",
    icon: MapPin,
    fields: ["monthly_revenue", "address", "website_url"]
  },
  {
    title: "יעדים ולקוחות",
    icon: Target,
    fields: ["main_products", "target_customers", "business_goals"]
  },
  {
    title: "ספקי שירות",
    icon: Users,
    fields: ["service_providers"]
  }
];

export default function OnboardingFlow({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0); // Changed from 1 to 0 for 0-indexed steps
  const [formData, setFormData] = useState({
    business_name: user?.business_name || '',
    business_type: user?.business_type || '',
    phone: user?.phone || '',
    company_size: user?.company_size || '',
    monthly_revenue: user?.monthly_revenue || '',
    address: {
      city: user?.address?.city || '',
      street: user?.address?.street || ''
    },
    service_providers: user?.service_providers || [],
    main_products: user?.main_products || '',
    target_customers: user?.target_customers || '',
    business_goals: user?.business_goals || '',
    website_url: user?.website_url || '' // Added website_url, removed other fields not in new structure
  });
  const [isSaving, setIsSaving] = useState(false); // Renamed from isLoading to isSaving
  const [error, setError] = useState('');

  const serviceProviderTypes = [
    { value: 'accounting', label: 'רואה חשבון' },
    { value: 'legal', label: 'עורך דין' },
    { value: 'marketing', label: 'סוכנות פרסום/שיווק' },
    { value: 'printing', label: 'בית דפוס' },
    { value: 'it_systems', label: 'מערכות מידע' },
    { value: 'insurance', label: 'ביטוח עסקי' },
    { value: 'security', label: 'שירותי אבטחה' },
    { value: 'cleaning', label: 'שירותי ניקיון' },
    { value: 'logistics', label: 'הובלה ולוגיסטיקה' },
    { value: 'banking', label: 'שירותים בנקאיים' },
    { value: 'consultation', label: 'ייעוץ עסקי' },
    { value: 'other', label: 'אחר' }
  ];

  const addServiceProvider = () => {
    setFormData(prev => ({
      ...prev,
      service_providers: [...prev.service_providers, { service_type: 'accounting', monthly_cost: 0 }]
    }));
  };

  const removeServiceProvider = (index) => {
    setFormData(prev => ({
      ...prev,
      service_providers: prev.service_providers.filter((_, i) => i !== index)
    }));
  };

  const updateServiceProvider = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      service_providers: prev.service_providers.map((provider, i) =>
        i === index ? { ...provider, [field]: value } : provider
      )
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // פרטי עסק בסיסיים
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-horizon-primary" />
              <h2 className="text-2xl font-bold text-horizon-text mb-2">בואו נכיר!</h2>
              <p className="text-horizon-accent">ספר לנו על העסק שלך כדי שנוכל לתת לך המלצות מותאמות אישית</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="business_name" className="text-horizon-text">שם העסק <span className="text-red-400">*</span></Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="מה שם העסק שלך?"
                />
              </div>

              <div>
                <Label htmlFor="business_type" className="text-horizon-text">סוג העסק <span className="text-red-400">*</span></Label>
                <Select
                  value={formData.business_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, business_type: value }))}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue placeholder="בחר סוג עסק" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">קמעונאות</SelectItem>
                    <SelectItem value="wholesale">סיטונאות</SelectItem>
                    <SelectItem value="manufacturing">ייצור</SelectItem>
                    <SelectItem value="import">יבוא</SelectItem>
                    <SelectItem value="export">יצוא</SelectItem>
                    <SelectItem value="services">שירותים</SelectItem>
                    <SelectItem value="restaurant">מסעדות/קייטרינג</SelectItem>
                    <SelectItem value="fashion">אופנה</SelectItem>
                    <SelectItem value="tech">טכנולוגיה</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="phone" className="text-horizon-text">טלפון <span className="text-red-400">*</span></Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="05X-XXXXXXX"
                />
              </div>

              <div>
                <Label htmlFor="company_size" className="text-horizon-text">גודל החברה <span className="text-red-400">*</span></Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, company_size: value }))}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue placeholder="כמה עובדים?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 עובדים</SelectItem>
                    <SelectItem value="11-50">11-50 עובדים</SelectItem>
                    <SelectItem value="51-200">51-200 עובדים</SelectItem>
                    <SelectItem value="200+">מעל 200 עובדים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 1: // מידע כלכלי ומיקום
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-horizon-primary" />
              <h2 className="text-2xl font-bold text-horizon-text mb-2">מידע כלכלי ומיקום</h2>
              <p className="text-horizon-accent">המיקום שלך חשוב לקבלת המלצות מותאמות לאזור</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="monthly_revenue" className="text-horizon-text">מחזור חודשי משוער (₪) <span className="text-red-400">*</span></Label>
                <Input
                  id="monthly_revenue"
                  type="number"
                  value={formData.monthly_revenue}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_revenue: e.target.value }))}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="לדוגמה: 50000"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-horizon-text">עיר <span className="text-red-400">*</span></Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    placeholder="לדוגמה: תל אביב"
                  />
                </div>
                <div>
                  <Label htmlFor="street" className="text-horizon-text">רחוב (אופציונלי)</Label>
                  <Input
                    id="street"
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    placeholder="לדוגמה: דיזנגוף 1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website_url" className="text-horizon-text">כתובת אתר העסק (אופציונלי)</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="https://example.com"
                />
                <p className="text-sm text-horizon-accent mt-1">
                  אם יש לך אתר, נוכל לסרוק אותו ולקבל תובנות נוספות על העסק
                </p>
              </div>
            </div>
          </div>
        );

      case 2: // יעדים ולקוחות
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Target className="w-16 h-16 mx-auto mb-4 text-horizon-primary" />
              <h2 className="text-2xl font-bold text-horizon-text mb-2">מטרות ולקוחות</h2>
              <p className="text-horizon-accent">ספר לנו על המטרות שלך כדי שנוכל לתת המלצות מדויקות</p>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="main_products" className="text-horizon-text">המוצרים/שירותים העיקריים שלך</Label>
                <Textarea
                  id="main_products"
                  value={formData.main_products}
                  onChange={(e) => setFormData(prev => ({ ...prev, main_products: e.target.value }))}
                  className="bg-horizon-card border-horizon text-horizon-text h-20"
                  placeholder="לדוגמה: מכירת ביגוד נשים, אביזרי אופנה..."
                />
              </div>

              <div>
                <Label htmlFor="target_customers" className="text-horizon-text">קהל היעד שלך</Label>
                <Textarea
                  id="target_customers"
                  value={formData.target_customers}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_customers: e.target.value }))}
                  className="bg-horizon-card border-horizon text-horizon-text h-20"
                  placeholder="לדוגמה: נשים בגילאי 25-45, משפחות עם ילדים..."
                />
              </div>

              <div>
                <Label htmlFor="business_goals" className="text-horizon-text">המטרות העסקיות שלך</Label>
                <Textarea
                  id="business_goals"
                  value={formData.business_goals}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_goals: e.target.value }))}
                  className="bg-horizon-card border-horizon text-horizon-text h-20"
                  placeholder="לדוגמה: הגדלת מכירות ב-20%, פתיחת סניף נוסף..."
                />
              </div>
            </div>
          </div>
        );

      case 3: // ספקי שירות
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-horizon-primary" />
              <h2 className="text-2xl font-bold text-horizon-text mb-2">ספקי שירות</h2>
              <p className="text-horizon-accent">הספקים שלך חשובים לקבלת המלצות מותאמות</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-horizon-text text-lg">ספקי שירות נוכחיים (אופציונלי)</Label>
                <Button
                  type="button"
                  onClick={addServiceProvider}
                  className="btn-horizon-secondary"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף ספק
                </Button>
              </div>

              <p className="text-sm text-horizon-accent mb-4">
                המידע הזה יעזור לנו למצוא לך ספקים חלופיים במחירים טובים יותר
              </p>

              <div className="space-y-4">
                {formData.service_providers.map((provider, index) => (
                  <div key={index} className="flex gap-3 items-end p-4 bg-horizon-card rounded-lg">
                    <div className="flex-1">
                      <Label className="text-horizon-text text-sm">סוג שירות</Label>
                      <Select
                        value={provider.service_type}
                        onValueChange={(value) => updateServiceProvider(index, 'service_type', value)}
                      >
                        <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceProviderTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Label className="text-horizon-text text-sm">עלות חודשית (₪)</Label>
                      <Input
                        type="number"
                        value={provider.monthly_cost}
                        onChange={(e) => updateServiceProvider(index, 'monthly_cost', parseFloat(e.target.value) || 0)}
                        className="bg-horizon-dark border-horizon text-horizon-text"
                        placeholder="0"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeServiceProvider(index)}
                      className="border-red-500 text-red-400 hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {formData.service_providers.length === 0 && (
                  <div className="text-center py-8 text-horizon-accent">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>לא הוספת ספקי שירות עדיין</p>
                    <p className="text-sm">תוכל להוסיף מאוחר יותר</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    // Validation for Step 0 (Basic Business Info)
    if (currentStep === 0) {
      if (!formData.business_name || !formData.business_type || !formData.phone || !formData.company_size) {
        setError('אנא מלא את כל השדות החובה');
        return;
      }
    }
    // Validation for Step 1 (Financial & Location)
    if (currentStep === 1) {
      if (!formData.monthly_revenue || !formData.address.city) {
        setError('אנא מלא את כל השדות החובה');
        return;
      }
    }

    // No specific validation for Step 2 or 3 based on current requirements in the outline

    setError('');
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const handleComplete = async () => {
    setIsSaving(true);
    setError('');

    try {
      await User.updateMyUserData({
        ...formData,
        monthly_revenue: parseFloat(formData.monthly_revenue) || 0,
        onboarding_completed: true,
        last_activity: new Date().toISOString()
      });

      onComplete();
    } catch (err) {
      setError('שגיאה בשמירת הנתונים. אנא נסה שוב.');
      console.error('Error completing onboarding:', err);
    }

    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-horizon-dark flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  currentStep === index
                    ? 'border-horizon-primary bg-horizon-primary text-white'
                    : currentStep > index
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-horizon-accent text-horizon-accent'
                }`}>
                  {currentStep > index ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 transition-colors ${
                    currentStep > index ? 'bg-green-500' : 'bg-horizon-accent'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Card className="card-horizon shadow-horizon-strong">
          <CardContent className="p-8">
            {error && (
              <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-500/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {renderStep()}

            <div className="flex justify-between mt-8 pt-6 border-t border-horizon">
              <Button
                onClick={handleBack}
                disabled={currentStep === 0}
                variant="outline"
                className="border-horizon-accent text-horizon-accent hover:bg-horizon-card"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                הקודם
              </Button>

              {currentStep === steps.length - 1 ? (
                <Button 
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="btn-horizon-primary"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      סיים הגדרה
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext}
                  className="btn-horizon-primary"
                  disabled={isSaving}
                >
                  הבא
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
