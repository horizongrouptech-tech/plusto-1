import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User as UserIcon, Building, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { User } from '@/api/entities';

export default function InitialSetup() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    business_name: '',
    business_type: 'retail',
    customer_type: 'retail',
    company_size: '1-10',
    monthly_revenue: '',
    employee_salaries: '',
    main_products: '',
    target_customers: '',
    business_goals: '',
    main_challenges: '',
    competitors: '',
    sales_channels: '',
    website_url: '',
    website_platform: 'none',
    address: { city: '', street: '' },
    service_providers: '',
    unwanted_products: '',
    bestselling_products: ''
  });
  const navigate = useNavigate();

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    setStep(2);
  };

  const handleInputChange = (field, value) => {
    if (field === 'city' || field === 'street') {
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updateData = {
        user_type: userType,
        onboarding_completed: true,
        is_active: true,
        ...formData,
        monthly_revenue: Number(formData.monthly_revenue) || 0,
        employee_salaries: Number(formData.employee_salaries) || 0
      };

      await User.updateMyUserData(updateData);

      // Redirect based on user type
      if (userType === 'financial_manager') {
        navigate('/admin');
      } else {
        navigate('/pending-approval');
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('שגיאה בשמירת הנתונים. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">הגדרת פרופיל</h1>
          <p className="text-slate-400">בואו נכיר אותך כדי להתאים את המערכת עבורך</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600' : 'bg-slate-700'} text-white font-semibold`}>
            {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'} text-white font-semibold`}>
            2
          </div>
        </div>

        {step === 1 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-center">בחר את סוג המשתמש שלך</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                onClick={() => handleUserTypeSelect('financial_manager')}
                className="p-6 bg-slate-700 hover:bg-slate-600 rounded-xl cursor-pointer transition-colors border-2 border-transparent hover:border-blue-500"
              >
                <div className="flex items-center gap-4">
                  <UserIcon className="w-12 h-12 text-blue-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">מנהל כספים</h3>
                    <p className="text-slate-400">אני מנהל כספים המטפל בלקוחות עסקיים</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-400 mr-auto" />
                </div>
              </div>

              <div 
                onClick={() => handleUserTypeSelect('regular')}
                className="p-6 bg-slate-700 hover:bg-slate-600 rounded-xl cursor-pointer transition-colors border-2 border-transparent hover:border-blue-500"
              >
                <div className="flex items-center gap-4">
                  <Building className="w-12 h-12 text-green-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">בעל עסק</h3>
                    <p className="text-slate-400">אני בעל עסק המעוניין לשפר את הרווחיות</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-400 mr-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                {userType === 'financial_manager' ? 'פרטי מנהל כספים' : 'פרטי העסק'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Fields for Both Types */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">שם מלא *</label>
                    <Input
                      required
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="הזן שם מלא"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">טלפון *</label>
                    <Input
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="050-1234567"
                    />
                  </div>
                </div>

                {/* Additional Fields for Business Owners Only */}
                {userType === 'regular' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">שם העסק *</label>
                        <Input
                          required
                          value={formData.business_name}
                          onChange={(e) => handleInputChange('business_name', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="שם החברה או העסק"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">סוג העסק</label>
                        <select
                          value={formData.business_type}
                          onChange={(e) => handleInputChange('business_type', e.target.value)}
                          className="w-full p-3 bg-slate-700 border border-slate-600 text-white rounded-md"
                        >
                          <option value="retail">קמעונאות</option>
                          <option value="wholesale">סיטונאות</option>
                          <option value="manufacturing">ייצור</option>
                          <option value="import">יבוא</option>
                          <option value="export">יצוא</option>
                          <option value="services">שירותים</option>
                          <option value="restaurant">מסעדה</option>
                          <option value="fashion">אופנה</option>
                          <option value="tech">טכנולוגיה</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">מחזור חודשי (₪)</label>
                        <Input
                          type="number"
                          value={formData.monthly_revenue}
                          onChange={(e) => handleInputChange('monthly_revenue', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="50000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">גודל החברה</label>
                        <select
                          value={formData.company_size}
                          onChange={(e) => handleInputChange('company_size', e.target.value)}
                          className="w-full p-3 bg-slate-700 border border-slate-600 text-white rounded-md"
                        >
                          <option value="1-10">1-10 עובדים</option>
                          <option value="11-50">11-50 עובדים</option>
                          <option value="51-200">51-200 עובדים</option>
                          <option value="200+">200+ עובדים</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">עיר</label>
                        <Input
                          value={formData.address.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="תל אביב"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">כתובת אתר</label>
                        <Input
                          value={formData.website_url}
                          onChange={(e) => handleInputChange('website_url', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="https://www.example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">מוצרים/שירותים עיקריים</label>
                      <Textarea
                        value={formData.main_products}
                        onChange={(e) => handleInputChange('main_products', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white h-24"
                        placeholder="תאר את המוצרים או השירותים העיקריים שלך..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">קהל יעד</label>
                        <Textarea
                          value={formData.target_customers}
                          onChange={(e) => handleInputChange('target_customers', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white h-24"
                          placeholder="מי הלקוחות שלך?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">יעדים עסקיים</label>
                        <Textarea
                          value={formData.business_goals}
                          onChange={(e) => handleInputChange('business_goals', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white h-24"
                          placeholder="מה המטרות העסקיות שלך?"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">מוצרים "להעיף" (מופרדים בפסיק)</label>
                        <Textarea
                          value={formData.unwanted_products}
                          onChange={(e) => handleInputChange('unwanted_products', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white h-20"
                          placeholder="מוצר 1, מוצר 2, מוצר 3..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">מוצרים נמכרים ביותר (מופרדים בפסיק)</label>
                        <Textarea
                          value={formData.bestselling_products}
                          onChange={(e) => handleInputChange('bestselling_products', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white h-20"
                          placeholder="מוצר 1, מוצר 2, מוצר 3..."
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-4 pt-6 border-t border-slate-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    חזור
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? 'שומר...' : 'סיים הגדרה'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}