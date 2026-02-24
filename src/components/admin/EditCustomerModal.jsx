
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Save, UserCog, User, Users } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from "sonner";

export default function EditCustomerModal({ isOpen, onClose, customer, onCustomerUpdated }) {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        secondary_phone: '',
        business_name: '',
        business_type: '',
        company_size: '',
        monthly_revenue: '',
        business_city: '',
        address_street: '',
        address_number: '',
        address_zip: '',
        tax_id: '',
        establishment_date: '',
        status: 'active',
        main_products_services: '',
        target_audience: '',
        business_goals: '',
        website_url: '',
        customer_group: '',
        assigned_financial_manager_email: '',
        additional_assigned_financial_manager_emails: [],
        general_notes: ''
    });
    // Removed isSaving state as useMutation provides isLoading
    const { user: currentUser } = useAuth();
    const [isOnboardingSource, setIsOnboardingSource] = useState(false);

    // טעינת רשימת מנהלי כספים (רק לאדמין)
    const { data: allFinancialManagers = [] } = useQuery({
        queryKey: ['allFinancialManagers'],
        queryFn: async () => {
            if (currentUser?.role !== 'admin') return [];
            
            const allUsers = await base44.entities.User.filter({
                user_type: 'financial_manager',
                is_approved_by_admin: true
            });
            return allUsers;
        },
        enabled: currentUser?.role === 'admin',
        staleTime: 5 * 60 * 1000
    });

    useEffect(() => {
        if (customer) {
            setFormData({
                full_name: customer.full_name || '',
                email: customer.email || '',
                phone: customer.phone || '',
                secondary_phone: customer.secondary_phone || '',
                business_name: customer.business_name || '',
                business_type: customer.business_type || '',
                company_size: customer.company_size || '',
                monthly_revenue: customer.monthly_revenue || '',
                business_city: customer.address?.city || customer.business_city || '',
                address_street: customer.address?.street || customer.address_street || '',
                address_number: customer.address?.number || customer.address_number || '',
                address_zip: customer.address?.zip || customer.address_zip || '',
                tax_id: customer.tax_id || '',
                establishment_date: customer.establishment_date || '',
                status: customer.status || 'active',
                main_products_services: customer.main_products || customer.main_products_services || '',
                target_audience: customer.target_customers || customer.target_audience || '',
                business_goals: customer.business_goals || '',
                website_url: customer.website_url || '',
                customer_group: customer.customer_group || '',
                assigned_financial_manager_email: customer.assigned_financial_manager_email || '',
                additional_assigned_financial_manager_emails: customer.additional_assigned_financial_manager_emails || [],
                general_notes: customer.general_notes || ''
            });
            // זיהוי לקוח אונבורדינג - בדוק מספר דרכים
            const isOnboarding = 
                customer.source === 'onboarding' || 
                customer.status !== undefined || // OnboardingRequest יש לו status
                (customer.main_products_services !== undefined && customer.main_products === undefined); // OnboardingRequest משתמש ב-main_products_services במקום main_products
            setIsOnboardingSource(isOnboarding);
        }
    }, [customer]);

    // Helper for input changes
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAdditionalManagersChange = (selectedEmails) => {
        setFormData(prev => ({
            ...prev,
            additional_assigned_financial_manager_emails: selectedEmails
        }));
    };

    const updateMutation = useMutation({
        mutationFn: async (dataToUpdate) => {
            let recordId = customer.id;
            if (typeof recordId === 'string' && recordId.startsWith('onboarding_')) {
                recordId = recordId.replace('onboarding_', '');
            }
            if (!recordId) {
                throw new Error("Customer ID is missing.");
            }

            const isOnboardingCustomer = 
                customer?.source === 'onboarding' || 
                customer?.status !== undefined ||
                (customer?.main_products_services !== undefined && customer?.main_products === undefined);

            if (isOnboardingCustomer) {
                // עדכון OnboardingRequest עם כל השדות
                const onboardingUpdateData = {
                    full_name: dataToUpdate.full_name,
                    email: dataToUpdate.email,
                    phone: dataToUpdate.phone,
                    secondary_phone: dataToUpdate.secondary_phone || null,
                    business_name: dataToUpdate.business_name,
                    business_type: dataToUpdate.business_type,
                    company_size: dataToUpdate.company_size,
                    monthly_revenue: dataToUpdate.monthly_revenue ? parseFloat(dataToUpdate.monthly_revenue) : null,
                    business_city: dataToUpdate.business_city,
                    address_street: dataToUpdate.address_street || null,
                    address_number: dataToUpdate.address_number || null,
                    address_zip: dataToUpdate.address_zip || null,
                    tax_id: dataToUpdate.tax_id || null,
                    establishment_date: dataToUpdate.establishment_date || null,
                    status: dataToUpdate.status || 'active',
                    main_products_services: dataToUpdate.main_products_services,
                    target_audience: dataToUpdate.target_audience,
                    business_goals: dataToUpdate.business_goals,
                    website_url: dataToUpdate.website_url,
                    customer_group: dataToUpdate.customer_group || null,
                    assigned_financial_manager_email: dataToUpdate.assigned_financial_manager_email || null,
                    additional_assigned_financial_manager_emails: dataToUpdate.additional_assigned_financial_manager_emails || [],
                    general_notes: dataToUpdate.general_notes || null
                };
                const updated = await base44.entities.OnboardingRequest.update(recordId, onboardingUpdateData);
                
                // החזר את האובייקט המעודכן עם הנתונים החדשים
                return {
                    ...customer,
                    ...updated,
                    id: `onboarding_${updated.id}`, // שמור על הקידומת
                    source: 'onboarding',
                    is_onboarding_record_only: true
                };
            } else {
                // עדכון User עם כל השדות
                const userUpdateData = {
                    full_name: dataToUpdate.full_name,
                    email: dataToUpdate.email,
                    phone: dataToUpdate.phone,
                    secondary_phone: dataToUpdate.secondary_phone || null,
                    business_name: dataToUpdate.business_name,
                    business_type: dataToUpdate.business_type,
                    customer_group: dataToUpdate.customer_group || null,
                    company_size: dataToUpdate.company_size,
                    monthly_revenue: dataToUpdate.monthly_revenue ? parseFloat(dataToUpdate.monthly_revenue) : null,
                    main_products: dataToUpdate.main_products_services,
                    business_goals: dataToUpdate.business_goals,
                    target_customers: dataToUpdate.target_audience,
                    website_url: dataToUpdate.website_url,
                    tax_id: dataToUpdate.tax_id || null,
                    establishment_date: dataToUpdate.establishment_date || null,
                    status: dataToUpdate.status || 'active',
                    general_notes: dataToUpdate.general_notes || null,
                    assigned_financial_manager_email: dataToUpdate.assigned_financial_manager_email || null,
                    additional_assigned_financial_manager_emails: dataToUpdate.additional_assigned_financial_manager_emails || [],
                    address: {
                        city: dataToUpdate.business_city,
                        street: dataToUpdate.address_street || null,
                        number: dataToUpdate.address_number || null,
                        zip: dataToUpdate.address_zip || null
                    }
                };
                const updated = await base44.entities.User.update(recordId, userUpdateData);
                
                // החזר את האובייקט המעודכן
                return {
                    ...customer,
                    ...updated,
                    source: 'user'
                };
            }
        },
        onSuccess: (updatedCustomer) => {
            toast.success('פרטי הלקוח עודכנו בהצלחה');
            // העבר את הנתונים המעודכנים ל-parent
            if (onCustomerUpdated) {
                onCustomerUpdated(updatedCustomer);
            }
            onClose();
        },
        onError: (error) => {
            console.error('Error updating customer:', error);
            toast.error('שגיאה בעדכון פרטי הלקוח: ' + (error.message || 'שגיאה לא ידועה'));
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await updateMutation.mutateAsync(formData);
    };

    const isAdmin = currentUser?.role === 'admin';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-horizon-dark text-horizon-text border-horizon max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-xl text-horizon-text text-right">
                        עריכת פרטי לקוח
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {/* NEW SECTION: Additional Financial Managers - ONLY FOR ADMIN */}
                    {isAdmin && (
                        <div className="bg-gradient-to-br from-horizon-primary/10 to-horizon-secondary/10 border-2 border-horizon-primary/30 rounded-xl p-5 space-y-4 shadow-lg">
                            <div className="flex items-center gap-2 text-horizon-primary mb-3">
                                <Users className="w-6 h-6" />
                                <span className="font-bold text-lg">שיוך מנהלי כספים</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {/* Primary Financial Manager */}
                                <div>
                                    <Label htmlFor="assigned_financial_manager_email" className="text-horizon-accent text-right block font-semibold mb-2">
                                        מנהל כספים ראשי
                                    </Label>
                                    <Select 
                                        value={formData.assigned_financial_manager_email || ''} 
                                        onValueChange={(value) => handleInputChange('assigned_financial_manager_email', value === 'null' ? null : value)}
                                    >
                                        <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text h-12 text-base">
                                            <SelectValue>
                                                {formData.assigned_financial_manager_email ? (
                                                    <div className="flex items-center gap-3 justify-end">
                                                        <span className="font-medium">
                                                            {allFinancialManagers.find(m => m.email === formData.assigned_financial_manager_email)?.full_name || formData.assigned_financial_manager_email}
                                                        </span>
                                                        <div className="bg-horizon-primary/20 p-1.5 rounded-full">
                                                            <User className="w-4 h-4 text-horizon-primary" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 justify-end text-horizon-accent">
                                                        <span>ללא שיוך</span>
                                                        <Users className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-horizon-dark border-horizon">
                                            <SelectItem value="null" className="text-right cursor-pointer hover:bg-horizon-card/50">
                                                <div className="flex items-center gap-3 justify-end w-full py-2">
                                                    <span className="text-horizon-accent font-medium">ללא שיוך</span>
                                                    <div className="bg-gray-500/20 p-1.5 rounded-full">
                                                        <Users className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                </div>
                                            </SelectItem>
                                            {allFinancialManagers.map(manager => (
                                                <SelectItem 
                                                    key={manager.email} 
                                                    value={manager.email}
                                                    className="text-right cursor-pointer hover:bg-horizon-primary/20 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 justify-end w-full py-2">
                                                        <div className="text-right">
                                                            <div className="font-semibold text-horizon-text">{manager.full_name}</div>
                                                            <div className="text-xs text-horizon-accent">{manager.email}</div>
                                                        </div>
                                                        <div className="bg-horizon-primary/20 p-2 rounded-full">
                                                            <User className="w-5 h-5 text-horizon-primary" />
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="bg-horizon-card/30 rounded-lg p-3 mt-2">
                                        <p className="text-sm text-horizon-accent text-right flex items-start gap-2">
                                            <UserCog className="w-4 h-4 mt-0.5 flex-shrink-0 text-horizon-primary" />
                                            <span>מנהל כספים ראשי אחראי על ניהול שוטף וטיפול בלקוח זה.</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Additional Financial Managers */}
                                <div>
                                    <Label className="text-horizon-accent mb-2 block font-semibold">
                                        מנהלי כספים נוספים (אופציונלי)
                                    </Label>
                                    <p className="text-sm text-horizon-accent mb-3 text-right">
                                        בחר מנהלי כספים נוספים שיוכלו לצפות ולנהל לקוח זה.
                                    </p>
                                    
                                    {allFinancialManagers && allFinancialManagers.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-horizon-card/20 rounded-lg border border-horizon/30">
                                            {allFinancialManagers
                                                .filter(manager => manager.email !== formData.assigned_financial_manager_email)
                                                .map(manager => (
                                                    <div key={manager.email} className="flex items-center gap-3 justify-end">
                                                        <label 
                                                            htmlFor={`edit-manager-${manager.email}`}
                                                            className="text-horizon-text cursor-pointer text-sm font-medium"
                                                        >
                                                            {manager.full_name} ({manager.email})
                                                        </label>
                                                        <input
                                                            type="checkbox"
                                                            id={`edit-manager-${manager.email}`}
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
                                                            className="w-4 h-4 text-horizon-primary bg-horizon-card border-horizon rounded focus:ring-horizon-primary/50"
                                                        />
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-horizon-accent text-right">אין מנהלי כספים נוספים זמינים.</p>
                                    )}

                                    {formData.additional_assigned_financial_manager_emails.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-horizon/30">
                                            <p className="text-sm text-horizon-accent mb-2 text-right">מנהלים נוספים שנבחרו:</p>
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                {formData.additional_assigned_financial_manager_emails.map(email => {
                                                    const manager = allFinancialManagers?.find(m => m.email === email);
                                                    return (
                                                        <Badge key={email} className="bg-horizon-primary text-white text-sm">
                                                            {manager?.full_name || email}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-horizon-card/30 rounded-lg p-3 mt-2">
                                <p className="text-sm text-horizon-accent text-right flex items-start gap-2">
                                    <Users className="w-4 h-4 mt-0.5 flex-shrink-0 text-horizon-primary" />
                                    <span>מנהלי כספים נוספים יקבלו גישה לצפייה וניהול של לקוח זה במערכת.</span>
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="full_name" className="text-horizon-text text-right block">שם מלא</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => handleInputChange('full_name', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="email" className="text-horizon-text text-right block">דוא"ל</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="business_name" className="text-horizon-text text-right block">שם העסק</Label>
                            <Input
                                id="business_name"
                                value={formData.business_name}
                                onChange={(e) => handleInputChange('business_name', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone" className="text-horizon-text text-right block">טלפון</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="business_type" className="text-horizon-text text-right block">סוג עסק</Label>
                            <Select value={formData.business_type} onValueChange={(value) => handleInputChange('business_type', value)}>
                                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                    <SelectValue placeholder="בחר סוג עסק" />
                                </SelectTrigger>
                                <SelectContent className="bg-horizon-dark border-horizon">
                                    <SelectItem value="retail">קמעונאות</SelectItem>
                                    <SelectItem value="wholesale">סיטונאות</SelectItem>
                                    <SelectItem value="manufacturing">ייצור</SelectItem>
                                    <SelectItem value="import">יבוא</SelectItem>
                                    <SelectItem value="export">יצוא</SelectItem>
                                    <SelectItem value="services">שירותים</SelectItem>
                                    <SelectItem value="restaurant">מסעדה</SelectItem>
                                    <SelectItem value="fashion">אופנה</SelectItem>
                                    <SelectItem value="tech">טכנולוגיה</SelectItem>
                                    <SelectItem value="other">אחר</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="company_size" className="text-horizon-text text-right block">גודל החברה</Label>
                            <Select value={formData.company_size} onValueChange={(value) => handleInputChange('company_size', value)}>
                                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                    <SelectValue placeholder="בחר גודל" />
                                </SelectTrigger>
                                <SelectContent className="bg-horizon-dark border-horizon">
                                    <SelectItem value="1-10">1-10 עובדים</SelectItem>
                                    <SelectItem value="11-50">11-50 עובדים</SelectItem>
                                    <SelectItem value="51-200">51-200 עובדים</SelectItem>
                                    <SelectItem value="200+">200+ עובדים</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="monthly_revenue" className="text-horizon-text text-right block">מחזור חודשי (₪)</Label>
                            <Input
                                id="monthly_revenue"
                                type="number"
                                value={formData.monthly_revenue}
                                onChange={(e) => handleInputChange('monthly_revenue', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="business_city" className="text-horizon-text text-right block">עיר</Label>
                            <Input
                                id="business_city"
                                value={formData.business_city}
                                onChange={(e) => handleInputChange('business_city', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="address_street" className="text-horizon-text text-right block">רחוב</Label>
                            <Input
                                id="address_street"
                                value={formData.address_street}
                                onChange={(e) => handleInputChange('address_street', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="address_number" className="text-horizon-text text-right block">מספר בית</Label>
                            <Input
                                id="address_number"
                                value={formData.address_number}
                                onChange={(e) => handleInputChange('address_number', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="address_zip" className="text-horizon-text text-right block">מיקוד</Label>
                            <Input
                                id="address_zip"
                                value={formData.address_zip}
                                onChange={(e) => handleInputChange('address_zip', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="secondary_phone" className="text-horizon-text text-right block">טלפון נוסף</Label>
                            <Input
                                id="secondary_phone"
                                value={formData.secondary_phone}
                                onChange={(e) => handleInputChange('secondary_phone', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="tax_id" className="text-horizon-text text-right block">ח.פ/ע.מ</Label>
                            <Input
                                id="tax_id"
                                value={formData.tax_id}
                                onChange={(e) => handleInputChange('tax_id', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="establishment_date" className="text-horizon-text text-right block">תאריך הקמה</Label>
                            <Input
                                id="establishment_date"
                                type="date"
                                value={formData.establishment_date}
                                onChange={(e) => handleInputChange('establishment_date', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="status" className="text-horizon-text text-right block">סטטוס</Label>
                            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                    <SelectValue placeholder="בחר סטטוס" />
                                </SelectTrigger>
                                <SelectContent className="bg-horizon-dark border-horizon">
                                    <SelectItem value="active">פעיל</SelectItem>
                                    <SelectItem value="inactive">לא פעיל</SelectItem>
                                    <SelectItem value="archived">בארכיון</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="customer_group" className="text-horizon-text text-right block">קבוצת ניהול</Label>
                            <Select value={formData.customer_group || ''} onValueChange={(value) => handleInputChange('customer_group', value === 'null' ? null : value)}>
                                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                    <SelectValue placeholder="בחר קבוצה" />
                                </SelectTrigger>
                                <SelectContent className="bg-horizon-dark border-horizon">
                                    <SelectItem value="null" className="text-right cursor-pointer hover:bg-horizon-card/50">ללא קבוצה</SelectItem>
                                    <SelectItem value="A">קבוצה A (ראשון ורביעי)</SelectItem>
                                    <SelectItem value="B">קבוצה B (שני וחמישי)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="main_products_services" className="text-horizon-text text-right block">מוצרים/שירותים עיקריים</Label>
                            <Input
                                id="main_products_services"
                                value={formData.main_products_services}
                                onChange={(e) => handleInputChange('main_products_services', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="target_audience" className="text-horizon-text text-right block">קהל יעד</Label>
                            <Input
                                id="target_audience"
                                value={formData.target_audience}
                                onChange={(e) => handleInputChange('target_audience', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="business_goals" className="text-horizon-text text-right block">יעדים עסקיים</Label>
                            <Input
                                id="business_goals"
                                value={formData.business_goals}
                                onChange={(e) => handleInputChange('business_goals', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="website_url" className="text-horizon-text text-right block">כתובת אתר</Label>
                            <Input
                                id="website_url"
                                type="url"
                                value={formData.website_url}
                                onChange={(e) => handleInputChange('website_url', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="general_notes" className="text-horizon-text text-right block">הערות כלליות</Label>
                            <Textarea
                                id="general_notes"
                                value={formData.general_notes}
                                onChange={(e) => handleInputChange('general_notes', e.target.value)}
                                className="bg-horizon-card border-horizon text-horizon-text min-h-[100px]"
                                placeholder="הוסף הערות כלליות על הלקוח..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
                            ביטול
                        </Button>
                        <Button type="submit" disabled={updateMutation.isLoading} className="bg-horizon-primary hover:bg-horizon-primary/90">
                            {updateMutation.isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    שומר...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 ml-2" />
                                    שמור שינויים
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
