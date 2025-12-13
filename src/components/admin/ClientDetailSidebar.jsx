
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Building, Calendar, FileText, Lightbulb, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ClientDetailSidebar({ client, allUsers }) {
    const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
    const [customerGroup, setCustomerGroup] = useState(''); // New state to manage the selected group locally
    const queryClient = useQueryClient();

    // Initialize customerGroup when client prop changes
    useEffect(() => {
        if (client) {
            setCustomerGroup(client.raw?.customer_group || 'לא משויך');
        }
    }, [client]);

    // טעינת מספר קבצים
    const { data: filesCount = 0 } = useQuery({
        queryKey: ['clientFiles', client?.email],
        queryFn: async () => {
            if (!client?.email) return 0;
            const files = await base44.entities.FileUpload.filter({ customer_email: client.email });
            return files.length;
        },
        enabled: !!client?.email
    });

    // טעינת מספר המלצות
    const { data: recsCount = 0 } = useQuery({
        queryKey: ['clientRecs', client?.email],
        queryFn: async () => {
            if (!client?.email) return 0;
            const recs = await base44.entities.Recommendation.filter({ customer_email: client.email });
            return recs.length;
        },
        enabled: !!client?.email
    });

    if (!client) {
        return (
            <Card className="card-horizon" dir="rtl">
                <CardContent className="p-6 text-center text-horizon-accent">
                    בחר לקוח מהרשימה לצפייה בפרטים
                </CardContent>
            </Card>
        );
    }

    const handleGroupChange = async (newGroup) => {
        if (!client) return;
        
        setIsUpdatingGroup(true);
        try {
            // זיהוי סוג הלקוח והישות הנכונה
            let entityToUpdate;
            let recordId = client.id;

            // בדיקה אם זה לקוח אונבורדינג
            const isOnboardingCustomer = 
                client.is_onboarding_record_only || 
                (client.id && client.id.startsWith('onboarding_')) ||
                client.source === 'onboarding';

            if (isOnboardingCustomer) {
                // הסרת קידומת אם קיימת
                if (recordId && recordId.startsWith('onboarding_')) {
                    recordId = recordId.replace('onboarding_', '');
                }
                entityToUpdate = base44.entities.OnboardingRequest;
            } else if (client.source === 'customer_contact') {
                entityToUpdate = base44.entities.CustomerContact;
            } else {
                // ברירת מחדל - User entity
                entityToUpdate = base44.entities.User;
            }

            // ביצוע העדכון
            await entityToUpdate.update(recordId, {
                customer_group: newGroup
            });

            setCustomerGroup(newGroup); // Update local state
            
            // Note: The previous implementation included `queryClient.invalidateQueries(['allAdminClientsAndOnboarding']);`
            // This has been removed as per the outline. If other parts of the app rely on a full refetch
            // after this update, consider re-adding the invalidation.
            
            const groupName = newGroup === 'A' ? 'ראשון ורביעי' : 'שני וחמישי';
            alert(`הלקוח שויך בהצלחה לקבוצה ${newGroup} (${groupName})`);
        } catch (error) {
            console.error('[components/admin/ClientDetailSidebar.js] Error updating customer group:', error);
            alert('שגיאה בעדכון קבוצת הלקוח: ' + error.message);
        } finally {
            setIsUpdatingGroup(false);
        }
    };

    const getManagerName = () => {
        if (!client.raw?.assigned_financial_manager_email || !allUsers) return client.manager;
        const manager = allUsers.find(u => u.email === client.raw.assigned_financial_manager_email);
        return manager?.full_name || client.manager;
    };

    return (
        <Card className="card-horizon sticky top-6" dir="rtl">
            <CardHeader>
                <CardTitle className="text-horizon-text text-right">פרטי לקוח</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-right">
                    <div className="flex items-center gap-2 mb-2 justify-end">
                        <span className="font-semibold text-lg text-horizon-text">{client.name}</span>
                        <Building className="w-5 h-5 text-horizon-primary" />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 justify-end text-horizon-accent">
                            <span>{client.email}</span>
                            <Mail className="w-4 h-4" />
                        </div>
                        
                        {client.raw?.phone && (
                            <div className="flex items-center gap-2 justify-end text-horizon-accent">
                                <span>{client.raw.phone}</span>
                                <Phone className="w-4 h-4" />
                            </div>
                        )}
                        
                        {client.raw?.business_type && (
                            <div className="flex items-center gap-2 justify-end text-horizon-accent">
                                <span>סוג עסק: {client.raw.business_type}</span>
                                <Building className="w-4 h-4" />
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2 justify-end text-horizon-accent">
                            <span>מנהל כספים: {getManagerName()}</span>
                            <User className="w-4 h-4" />
                        </div>

                        {/* שיוך קבוצת לקוח */}
                        <div className="pt-3 border-t border-horizon">
                            <div className="flex items-center gap-2 justify-end mb-2">
                                <span className="text-horizon-text font-medium">קבוצת עבודה:</span>
                                <Users className="w-4 h-4 text-horizon-primary" />
                            </div>
                            <Select
                                value={customerGroup} // Use the local state for the value
                                onValueChange={handleGroupChange}
                                disabled={isUpdatingGroup}
                            >
                                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text text-right">
                                    <SelectValue placeholder="בחר קבוצה..." />
                                </SelectTrigger>
                                <SelectContent className="bg-horizon-card border-horizon">
                                    <SelectItem value="A" className="text-right">קבוצה A - עבודה בימים ראשון ורביעי</SelectItem>
                                    <SelectItem value="B" className="text-right">קבוצה B - עבודה בימים שני וחמישי</SelectItem>
                                    <SelectItem value="לא משויך" className="text-right">ללא שיוך לקבוצה</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-horizon-accent mt-2 text-right">
                                קבוצה A: עבודה בימים ראשון ורביעי<br />
                                קבוצה B: עבודה בימים שני וחמישי<br />
                                שלישי: עבודה על שתי הקבוצות
                            </p>
                        </div>
                        
                        {client.raw?.created_date && (
                            <div className="flex items-center gap-2 justify-end text-horizon-accent pt-2">
                                <span>תאריך הצטרפות: {new Date(client.raw.created_date).toLocaleDateString('he-IL')}</span>
                                <Calendar className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-horizon">
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-horizon-card/30 p-3 rounded-lg">
                            <FileText className="w-6 h-6 text-horizon-primary mx-auto mb-1" />
                            <p className="text-xl font-bold text-horizon-text">
                                {client.source === 'onboarding' ? '0' : filesCount}
                            </p>
                            <p className="text-xs text-horizon-accent">קבצים</p>
                        </div>
                        <div className="bg-horizon-card/30 p-3 rounded-lg">
                            <Lightbulb className="w-6 h-6 text-horizon-primary mx-auto mb-1" />
                            <p className="text-xl font-bold text-horizon-text">
                                {client.source === 'onboarding' ? '0' : recsCount}
                            </p>
                            <p className="text-xs text-horizon-accent">המלצות</p>
                        </div>
                    </div>
                </div>

                {client.isActive && (
                    <div className="pt-2">
                        <Badge className="bg-green-500/20 text-green-400 w-full justify-center">
                            לקוח פעיל
                        </Badge>
                    </div>
                )}
                {!client.isActive && (
                    <div className="pt-2">
                        <Badge className="bg-red-500/20 text-red-400 w-full justify-center">
                            בארכיון
                        </Badge>
                    </div>
                )}
                {client.source === 'onboarding' && (
                    <div className="pt-2">
                        <Badge className="bg-yellow-500/20 text-yellow-400 w-full justify-center">
                            סטטוס: {client.onboardingStatus || 'ממתין'}
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
