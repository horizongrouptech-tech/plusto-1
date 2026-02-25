import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WelcomeSection from '../components/dashboard/WelcomeSection';
import ClientList from '../components/dashboard/ClientList';
import DailyTasks from '../components/dashboard/DailyTasks';
import { OnboardingRequest, User } from '@/api/entities';

export default function Dashboard() {
    const { user, isLoadingAuth: isUserLoading } = useAuth();

    // ⭐ הוסף query ללקוחות
    const { data: clients = [], isLoading: isClientsLoading } = useQuery({
        queryKey: ['dashboardClients', user?.email],
        queryFn: async () => {
            if (!user) return [];
            
            if (user.role !== 'admin') {
                // מנהל כספים - טוען מ-OnboardingRequest (כולל מנהלים משניים!)
                const allOnboarding = await OnboardingRequest.list();
                return allOnboarding
                    .filter(req => 
                        req.assigned_financial_manager_email === user.email ||
                        req.additional_assigned_financial_manager_emails?.includes(user.email)  // ⭐ זה החלק הקריטי!
                    )
                    .map(req => ({
                        id: `onboarding_${req.id}`,
                        email: req.email,
                        business_name: req.business_name,
                        full_name: req.full_name,
                        business_type: req.business_type,
                        customer_group: req.customer_group,
                        source: 'onboarding'
                    }));
            }
            
            // אדמין - טוען מ-User entity
            const users = await User.filter({ 
                role: 'user', 
                user_type: 'regular' 
            });
            return users.map(u => ({
                id: u.id,
                email: u.email,
                business_name: u.business_name,
                full_name: u.full_name,
                business_type: u.business_type,
                customer_group: u.customer_group,
                source: 'user'
            }));
        },
        enabled: !!user?.email
    });

    if (isUserLoading || isClientsLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-horizon-dark">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center p-8 bg-horizon-dark text-horizon-text">
                שגיאה: לא ניתן לטעון את פרטי המשתמש.
            </div>
        );
    }

    const [isClientsCollapsed, setIsClientsCollapsed] = useState(true);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-horizon-dark min-h-screen" dir="rtl">
            <WelcomeSection user={user} />
            
            <div className="space-y-6">
                {/* משימות למעלה */}
                <div>
                    <DailyTasks user={user} />
                </div>
                
                {/* לקוחות למטה - סגור בדיפולט */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setIsClientsCollapsed(!isClientsCollapsed)}
                        className="border-horizon text-horizon-text"
                    >
                        {isClientsCollapsed ? 'הצג לקוחות' : 'הסתר לקוחות'}
                    </Button>
                </div>
                
                {!isClientsCollapsed && (
                    <div>
                        <ClientList clients={clients} />
                    </div>
                )}
            </div>
        </div>
    );
}