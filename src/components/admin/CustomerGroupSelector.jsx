import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

import { Loader2, Save, Users, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { toast } from "sonner";
import { OnboardingRequest } from '@/api/entities';
export default function CustomerGroupSelector({ customer, onUpdate }) {
    const [selectedGroup, setSelectedGroup] = useState(customer?.customer_group || '');
    const [isSaving, setIsSaving] = useState(false);

    // בדיקה אם הלקוח הוא OnboardingRequest (רק הם צריכים קבוצה)
    const isOnboardingCustomer = 
        customer?.is_onboarding_record_only || 
        customer?.id?.startsWith('onboarding_') ||
        customer?.source === 'onboarding';

    // אם זה לא לקוח אונבורדינג, לא מציגים את הקומפוננטה
    if (!isOnboardingCustomer) {
        return null;
    }

    const handleSave = async () => {
        if (!customer || !selectedGroup) return;
        
        setIsSaving(true);
        try {
            // קבלת ה-ID האמיתי של OnboardingRequest
            let onboardingId = customer.id;
            
            // אם ה-ID מתחיל ב-onboarding_, נסיר את הקידומת
            if (onboardingId.startsWith('onboarding_')) {
                onboardingId = onboardingId.replace('onboarding_', '');
            }

            // עדכון ישות OnboardingRequest בלבד
            await OnboardingRequest.update(onboardingId, {
                customer_group: selectedGroup
            });

            if (onUpdate) {
                onUpdate();
            }

            // הצגת הודעת הצלחה
            const groupName = selectedGroup === 'A' ? 'ראשון ורביעי' : 'שני וחמישי';
            toast.success(`קבוצת הלקוח עודכנה בהצלחה!\nהלקוח משויך כעת לקבוצה ${selectedGroup} (${groupName})`);
        } catch (error) {
            console.error('[components/admin/CustomerGroupSelector.js] Error updating customer group:', error);
            toast.error('שגיאה בעדכון קבוצת הלקוח: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const groupInfo = {
        'A': { name: 'קבוצה A', days: 'ראשון ורביעי', color: 'bg-blue-500', borderColor: 'border-blue-500', textColor: 'text-blue-500', bgLight: 'bg-blue-500/10' },
        'B': { name: 'קבוצה B', days: 'שני וחמישי', color: 'bg-purple-500', borderColor: 'border-purple-500', textColor: 'text-purple-500', bgLight: 'bg-purple-500/10' }
    };

    const currentGroupInfo = groupInfo[selectedGroup] || null;

    return (
        <Card className="card-horizon">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-horizon-text text-right">
                    <Users className="w-5 h-5 text-horizon-primary" />
                    שיוך לקבוצת ניהול
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" dir="rtl">
                {/* הסבר על שיטת הקבוצות */}
                <Alert className="bg-horizon-primary/10 border-horizon-primary/30">
                    <Info className="w-4 h-4 text-horizon-primary" />
                    <AlertDescription className="text-horizon-text text-right text-sm">
                        <strong>מהי שיטת הקבוצות?</strong>
                        <br />
                        חלוקת הלקוחות לקבוצות A ו-B מאפשרת ניהול ממוקד ויעיל:
                        <ul className="mr-4 mt-2 space-y-1">
                            <li>• <strong>קבוצה A</strong> - ניהול בימים ראשון ורביעי</li>
                            <li>• <strong>קבוצה B</strong> - ניהול בימים שני וחמישי</li>
                            <li>• יום שלישי - שתי הקבוצות יחד</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                {/* קוביות בחירת קבוצה */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setSelectedGroup('A')}
                        disabled={isSaving}
                        className={`p-6 rounded-xl border-2 transition-all relative overflow-hidden ${
                            selectedGroup === 'A'
                                ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                                : 'border-horizon hover:border-blue-400 bg-horizon-card hover:bg-blue-500/5'
                        }`}
                    >
                        <div className="text-center relative z-10">
                            <div className={`text-3xl font-bold mb-2 ${
                                selectedGroup === 'A' ? 'text-blue-400' : 'text-horizon-text'
                            }`}>
                                קבוצה A
                            </div>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Calendar className={`w-4 h-4 ${
                                    selectedGroup === 'A' ? 'text-blue-400' : 'text-horizon-accent'
                                }`} />
                                <div className={`text-sm font-medium ${
                                    selectedGroup === 'A' ? 'text-blue-300' : 'text-horizon-accent'
                                }`}>
                                    ימי ניהול
                                </div>
                            </div>
                            <div className={`text-lg font-semibold ${
                                selectedGroup === 'A' ? 'text-blue-400' : 'text-horizon-accent'
                            }`}>
                                ראשון • רביעי
                            </div>
                        </div>
                        {selectedGroup === 'A' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedGroup('B')}
                        disabled={isSaving}
                        className={`p-6 rounded-xl border-2 transition-all relative overflow-hidden ${
                            selectedGroup === 'B'
                                ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                                : 'border-horizon hover:border-purple-400 bg-horizon-card hover:bg-purple-500/5'
                        }`}
                    >
                        <div className="text-center relative z-10">
                            <div className={`text-3xl font-bold mb-2 ${
                                selectedGroup === 'B' ? 'text-purple-400' : 'text-horizon-text'
                            }`}>
                                קבוצה B
                            </div>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Calendar className={`w-4 h-4 ${
                                    selectedGroup === 'B' ? 'text-purple-400' : 'text-horizon-accent'
                                }`} />
                                <div className={`text-sm font-medium ${
                                    selectedGroup === 'B' ? 'text-purple-300' : 'text-horizon-accent'
                                }`}>
                                    ימי ניהול
                                </div>
                            </div>
                            <div className={`text-lg font-semibold ${
                                selectedGroup === 'B' ? 'text-purple-400' : 'text-horizon-accent'
                            }`}>
                                שני • חמישי
                            </div>
                        </div>
                        {selectedGroup === 'B' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
                        )}
                    </button>
                </div>

                {/* סיכום הבחירה */}
                {currentGroupInfo && (
                    <div className={`p-4 rounded-lg ${currentGroupInfo.bgLight} border ${currentGroupInfo.borderColor}/30`}>
                        <p className={`text-sm text-center font-medium ${currentGroupInfo.textColor}`}>
                            ✓ הלקוח ישויך ל{currentGroupInfo.name}
                            <br />
                            <span className="text-xs opacity-80">
                                ימי ניהול מתוכננים: {currentGroupInfo.days}
                            </span>
                        </p>
                    </div>
                )}

                {/* כפתור שמירה */}
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !selectedGroup || selectedGroup === customer?.customer_group}
                    className="w-full bg-horizon-primary hover:bg-horizon-primary/90"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            שומר קבוצה...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 ml-2" />
                            שמור שיוך לקבוצה
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}