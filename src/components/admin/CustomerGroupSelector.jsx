import React, { useState } from 'react';
import { Loader2, Users, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from "sonner";
import { OnboardingRequest } from '@/api/entities';

export default function CustomerGroupSelector({ customer, onUpdate, compact = false }) {
    const [selectedGroup, setSelectedGroup] = useState(customer?.customer_group || '');
    const [isSaving, setIsSaving] = useState(false);

    // שמירה אוטומטית בלחיצה על קבוצה
    const handleSelect = async (group) => {
        if (!customer || group === selectedGroup || isSaving) return;

        setSelectedGroup(group);
        setIsSaving(true);
        try {
            let onboardingId = customer.id;
            if (typeof onboardingId === 'string' && onboardingId.startsWith('onboarding_')) {
                onboardingId = onboardingId.replace('onboarding_', '');
            }

            await OnboardingRequest.update(onboardingId, {
                customer_group: group
            });

            if (onUpdate) {
                onUpdate();
            }

            const groupName = group === 'A' ? 'ראשון ורביעי' : 'שני וחמישי';
            toast.success(`קבוצה ${group} (${groupName}) נשמרה`);
        } catch (error) {
            // שחזור הבחירה הקודמת במקרה של שגיאה
            setSelectedGroup(customer?.customer_group || '');
            console.error('[CustomerGroupSelector] Error:', error);
            toast.error('שגיאה בעדכון קבוצה: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // גרסה קומפקטית — שורה אחת עם כפתורי A/B
    if (compact) {
        return (
            <div className="flex items-center gap-2" dir="rtl">
                <Users className="w-4 h-4 text-horizon-accent flex-shrink-0" />
                <span className="text-xs text-horizon-accent">קבוצה:</span>
                <button
                    type="button"
                    onClick={() => handleSelect('A')}
                    disabled={isSaving}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedGroup === 'A'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-horizon-card text-horizon-accent border border-horizon hover:border-blue-400'
                    }`}
                >
                    A
                </button>
                <button
                    type="button"
                    onClick={() => handleSelect('B')}
                    disabled={isSaving}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedGroup === 'B'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                            : 'bg-horizon-card text-horizon-accent border border-horizon hover:border-purple-400'
                    }`}
                >
                    B
                </button>
                {isSaving && <Loader2 className="w-3 h-3 animate-spin text-horizon-accent" />}
            </div>
        );
    }

    // גרסה מלאה — כרטיס עם שתי קוביות בחירה
    return (
        <Card className="card-horizon">
            <CardContent className="p-4 space-y-3" dir="rtl">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-horizon-primary" />
                    <h3 className="text-sm font-semibold text-horizon-text">שיוך לקבוצת ניהול</h3>
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin text-horizon-accent" />}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => handleSelect('A')}
                        disabled={isSaving}
                        className={`p-3 rounded-xl border-2 transition-all ${
                            selectedGroup === 'A'
                                ? 'border-blue-500 bg-blue-500/20 shadow-md'
                                : 'border-horizon hover:border-blue-400 bg-horizon-card'
                        }`}
                    >
                        <div className="text-center">
                            <div className={`text-xl font-bold mb-1 ${selectedGroup === 'A' ? 'text-blue-400' : 'text-horizon-text'}`}>
                                קבוצה A
                            </div>
                            <div className={`flex items-center justify-center gap-1 text-xs ${selectedGroup === 'A' ? 'text-blue-300' : 'text-horizon-accent'}`}>
                                <Calendar className="w-3 h-3" />
                                ראשון • רביעי
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelect('B')}
                        disabled={isSaving}
                        className={`p-3 rounded-xl border-2 transition-all ${
                            selectedGroup === 'B'
                                ? 'border-purple-500 bg-purple-500/20 shadow-md'
                                : 'border-horizon hover:border-purple-400 bg-horizon-card'
                        }`}
                    >
                        <div className="text-center">
                            <div className={`text-xl font-bold mb-1 ${selectedGroup === 'B' ? 'text-purple-400' : 'text-horizon-text'}`}>
                                קבוצה B
                            </div>
                            <div className={`flex items-center justify-center gap-1 text-xs ${selectedGroup === 'B' ? 'text-purple-300' : 'text-horizon-accent'}`}>
                                <Calendar className="w-3 h-3" />
                                שני • חמישי
                            </div>
                        </div>
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
