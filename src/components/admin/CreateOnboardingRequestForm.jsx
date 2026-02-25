
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UserPlus } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { OnboardingRequest, User } from '@/api/entities';


const BUSINESS_TYPES = [
  { value: 'retail', label: 'קמעונאות' },
  { value: 'wholesale', label: 'סיטונאות' },
  { value: 'import', label: 'ייבוא' },
  { value: 'manufacturing', label: 'ייצור' },
  { value: 'export', label: 'יצוא' },
  { value: 'services', label: 'שירותים' },
  { value: 'restaurant', label: 'מסעדות/קייטרינג' },
  { value: 'fashion', label: 'אופנה' },
  { value: 'tech', label: 'טכנולוגיה' },
  { value: 'other', label: 'אחר' }
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 עובדים' },
  { value: '11-50', label: '11-50 עובדים' },
  { value: '51-200', label: '51-200 עובדים' },
  { value: '200+', label: 'מעל 200 עובדים' }
];

const CUSTOMER_GROUPS = [
  { value: 'A', label: 'קבוצה A (ראשון + רביעי)' },
  { value: 'B', label: 'קבוצה B (שני + חמישי)' }
];

export default function CreateOnboardingRequestForm({ isOpen, onClose, onSuccess, currentUser }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    business_name: '',
    business_type: '',
    company_size: '',
    monthly_revenue: '',
    business_city: '',
    website_url: '',
    main_products_services: '',
    target_audience: '',
    business_goals: '',
    bestselling_products: '',
    unwanted_products: '',
    main_challenges: '',
    competitors: '',
    customer_group: '',
    additional_assigned_financial_manager_emails: [] // NEW FIELD
  });

  const { data: allFinancialManagers } = useQuery({
    queryKey: ['allFinancialManagers'],
    queryFn: async () => {
      const managers = await User.filter({ 
        user_type: 'financial_manager',
        is_approved_by_admin: true 
      });
      return managers;
    },
    enabled: isOpen, // Only fetch when dialog is open
    staleTime: Infinity, // Financial managers list doesn't change often
    refetchOnWindowFocus: false,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        assigned_financial_manager_email: currentUser?.email, // Assign the current user's email
        additional_assigned_financial_manager_emails: data.additional_assigned_financial_manager_emails || [],
        status: 'pending'
      };
      return await OnboardingRequest.create(payload);
    },
    onSuccess: (newRequest) => {
      toast.success('בקשת אונבורדינג נוצרה בהצלחה');
      setFormData({ // Reset form
        full_name: '',
        email: '',
        phone: '',
        business_name: '',
        business_type: '',
        customer_group: '',
        company_size: '',
        monthly_revenue: '',
        business_city: '',
        main_products_services: '',
        bestselling_products: '',
        unwanted_products: '',
        business_goals: '',
        target_audience: '',
        website_url: '',
        competitors: '',
        main_challenges: '',
        additional_assigned_financial_manager_emails: []
      });
      onSuccess?.(); // Call parent's onSuccess callback
      onClose(); // Close the dialog
    },
    onError: (error) => {
      console.error('Error creating onboarding request:', error);
      toast.error('שגיאה ביצירת בקשת אונבורדינג: ' + (error.message || 'נסה שוב'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // ולידציה בסיסית
    if (!formData.full_name || !formData.email || !formData.business_name) {
      toast.error('נא למלא לפחות שם, אימייל ושם עסק');
      return;
    }

    // המרת monthly_revenue למספר
    const dataToSubmit = {
      ...formData,
      monthly_revenue: formData.monthly_revenue ? parseFloat(formData.monthly_revenue) : 0,
      // status: 'pending' is handled in mutationFn payload
    };

    createMutation.mutate(dataToSubmit);
  };

  const handleAdditionalManagersChange = (selectedEmails) => {
    setFormData(prev => ({
      ...prev,
      additional_assigned_financial_manager_emails: selectedEmails
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-horizon-dark text-horizon-text border-horizon max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-primary">יצירת בקשת אונבורדינג חדשה</DialogTitle>
          <DialogDescription className="text-horizon-accent">
            מלא את הפרטים הבאים ליצירת לקוח חדש במערכת
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <Card className="bg-horizon-card border-horizon">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-horizon-text mb-4">פרטים אישיים</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name" className="text-horizon-text">שם מלא *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-horizon-text">אימייל *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-horizon-text">טלפון</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    placeholder="050-1234567"
                  />
                </div>

                <div>
                  <Label htmlFor="business_city" className="text-horizon-text">עיר העסק</Label>
                  <Input
                    id="business_city"
                    value={formData.business_city}
                    onChange={(e) => handleChange('business_city', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-horizon-card border-horizon">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-horizon-text mb-4">פרטי העסק</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name" className="text-horizon-text">שם העסק *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="business_type" className="text-horizon-text">סוג העסק</Label>
                  <Select value={formData.business_type} onValueChange={(value) => handleChange('business_type', value)}>
                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר סוג עסק" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="company_size" className="text-horizon-text">גודל החברה</Label>
                  <Select value={formData.company_size} onValueChange={(value) => handleChange('company_size', value)}>
                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר גודל חברה" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="monthly_revenue" className="text-horizon-text">מחזור חודשי (₪)</Label>
                  <Input
                    id="monthly_revenue"
                    type="number"
                    value={formData.monthly_revenue}
                    onChange={(e) => handleChange('monthly_revenue', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="customer_group" className="text-horizon-text">קבוצת ניהול</Label>
                  <Select value={formData.customer_group} onValueChange={(value) => handleChange('customer_group', value)}>
                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר קבוצת ניהול" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_GROUPS.map(group => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="website_url" className="text-horizon-text">כתובת אתר</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => handleChange('website_url', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    placeholder="https://"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NEW SECTION: שיוך מנהלי כספים נוספים */}
          <Card className="bg-horizon-card border-horizon">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-horizon-text mb-4">שיוך מנהלי כספים נוספים</h3>
              <div className="bg-horizon-card/30 p-4 rounded-lg">
                <Label className="text-horizon-accent mb-2 block">
                  מנהלי כספים נוספים (אופציונלי)
                </Label>
                <p className="text-sm text-horizon-accent mb-3">
                  בחר מנהלי כספים נוספים שיוכלו לצפות ולנהל לקוח זה (המנהל היוצר משויך אוטומטית)
                </p>
                
                {allFinancialManagers && allFinancialManagers.length > 0 ? (
                  <div className="space-y-2">
                    {allFinancialManagers
                      .filter(manager => manager.email !== currentUser?.email) // Filter out current user
                      .map(manager => (
                        <div key={manager.email} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`manager-${manager.email}`}
                            checked={formData.additional_assigned_financial_manager_emails.includes(manager.email)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleAdditionalManagersChange([
                                  ...formData.additional_assigned_financial_manager_emails,
                                  manager.email
                                ]);
                              } else {
                                handleAdditionalManagersChange(
                                  formData.additional_assigned_financial_manager_emails.filter(
                                    email => email !== manager.email
                                  )
                                );
                              }
                            }}
                            className="w-4 h-4 rounded text-horizon-primary focus:ring-horizon-primary"
                          />
                          <label 
                            htmlFor={`manager-${manager.email}`}
                            className="text-horizon-text cursor-pointer text-sm"
                          >
                            {manager.full_name} ({manager.email})
                          </label>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-horizon-accent">אין מנהלי כספים נוספים זמינים</p>
                )}

                {formData.additional_assigned_financial_manager_emails.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-horizon">
                    <p className="text-sm text-horizon-accent mb-2">מנהלים נבחרים:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.additional_assigned_financial_manager_emails.map(email => {
                        const manager = allFinancialManagers?.find(m => m.email === email);
                        return (
                          <Badge key={email} className="bg-horizon-primary text-white">
                            {manager?.full_name || email}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-horizon-card border-horizon">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-horizon-text mb-4">מידע עסקי מפורט</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="main_products_services" className="text-horizon-text">מוצרים ושירותים עיקריים</Label>
                  <Textarea
                    id="main_products_services"
                    value={formData.main_products_services}
                    onChange={(e) => handleChange('main_products_services', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    rows={3}
                    placeholder="תאר את המוצרים והשירותים העיקריים שלך..."
                  />
                </div>

                <div>
                  <Label htmlFor="bestselling_products" className="text-horizon-text">מוצרים נמכרים ביותר</Label>
                  <Textarea
                    id="bestselling_products"
                    value={formData.bestselling_products}
                    onChange={(e) => handleChange('bestselling_products', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    rows={2}
                    placeholder="אילו מוצרים נמכרים הכי טוב אצלך?"
                  />
                </div>

                <div>
                  <Label htmlFor="unwanted_products" className="text-horizon-text">מוצרים להעיף</Label>
                  <Textarea
                    id="unwanted_products"
                    value={formData.unwanted_products}
                    onChange={(e) => handleChange('unwanted_products', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    rows={2}
                    placeholder="אילו מוצרים תרצה להפסיק למכור?"
                  />
                </div>

                <div>
                  <Label htmlFor="target_audience" className="text-horizon-text">קהל יעד</Label>
                  <Textarea
                    id="target_audience"
                    value={formData.target_audience}
                    onChange={(e) => handleChange('target_audience', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    rows={2}
                    placeholder="מי הלקוחות שלך?"
                  />
                </div>

                <div>
                  <Label htmlFor="business_goals" className="text-horizon-text">יעדים עסקיים</Label>
                  <Textarea
                    id="business_goals"
                    value={formData.business_goals}
                    onChange={(e) => handleChange('business_goals', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    rows={3}
                    placeholder="מה היעדים העסקיים שלך?"
                  />
                </div>

                <div>
                  <Label htmlFor="main_challenges" className="text-horizon-text">אתגרים עיקריים</Label>
                  <Textarea
                    id="main_challenges"
                    value={formData.main_challenges}
                    onChange={(e) => handleChange('main_challenges', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    rows={3}
                    placeholder="מה האתגרים העיקריים שלך?"
                  />
                </div>

                <div>
                  <Label htmlFor="competitors" className="text-horizon-text">מתחרים עיקריים</Label>
                  <Textarea
                    id="competitors"
                    value={formData.competitors}
                    onChange={(e) => handleChange('competitors', e.target.value)}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                    rows={2}
                    placeholder="מי המתחרים העיקריים שלך?"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose} // Use onClose for cancel
              disabled={createMutation.isLoading} // Use mutation's loading state
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isLoading}
              className="btn-horizon-primary"
            >
              {createMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  יוצר לקוח ומפעיל אוטומציה...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 ml-2" />
                  צור לקוח והפעל אוטומציה
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
