import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import WelcomeSection from '../components/dashboard/WelcomeSection';
import ClientList from '../components/dashboard/ClientList';
import DailyTasks from '../components/dashboard/DailyTasks';

export default function Dashboard() {
    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    // ⭐ הוסף query ללקוחות
    const { data: clients = [], isLoading: isClientsLoading } = useQuery({
        queryKey: ['dashboardClients', user?.email],
        queryFn: async () => {
            if (!user) return [];
            
            if (user.role !== 'admin') {
                // מנהל כספים - טוען מ-OnboardingRequest (כולל מנהלים משניים!)
                const allOnboarding = await base44.entities.OnboardingRequest.list();
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
            const users = await base44.entities.User.filter({ 
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

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-horizon-dark min-h-screen" dir="rtl">
            <WelcomeSection user={user} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <DailyTasks user={user} />
                </div>
                <div className="lg:col-span-1">
                    <ClientList clients={clients} />
                </div>
            </div>
        </div>
    );
}