import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, AlertTriangle, Calendar, UserX, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import WelcomeSection from '../components/dashboard/WelcomeSection';
import ClientList from '../components/dashboard/ClientList';
import { OnboardingRequest, User, CustomerGoal, Meeting } from '@/api/entities';
import { format, isToday, parseISO } from 'date-fns';

export default function Dashboard() {
    const { user, isLoadingAuth: isUserLoading } = useAuth();
    const [isClientsCollapsed, setIsClientsCollapsed] = useState(true);

    // לקוחות — FM רואה רק את המוקצים לו, Admin רואה הכל
    const { data: clients = [], isLoading: isClientsLoading } = useQuery({
        queryKey: ['dashboardClients', user?.email],
        queryFn: async () => {
            if (!user) return [];
            if (user.role !== 'admin') {
                const allOnboarding = await OnboardingRequest.list();
                return allOnboarding
                    .filter(req =>
                        req.assigned_financial_manager_email === user.email ||
                        req.additional_assigned_financial_manager_emails?.includes(user.email)
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
            const users = await User.filter({ role: 'user', user_type: 'regular' });
            return users.map(u => ({
                id: u.id, email: u.email, business_name: u.business_name,
                full_name: u.full_name, business_type: u.business_type,
                customer_group: u.customer_group, source: 'user'
            }));
        },
        enabled: !!user?.email
    });

    // משימות באיחור
    const { data: overdueTasks = [] } = useQuery({
        queryKey: ['dashboardOverdue', user?.email],
        queryFn: async () => {
            const allTasks = await CustomerGoal.filter({
                assignee_email: user.email,
                is_active: true,
            }, '-end_date');
            return allTasks.filter(t => t.status === 'delayed');
        },
        enabled: !!user?.email,
        refetchInterval: 60000,
    });

    // פגישות היום — טוען הכל ומסנן client-side
    const { data: todayMeetings = [] } = useQuery({
        queryKey: ['dashboardMeetings'],
        queryFn: async () => {
            const allMeetings = await Meeting.list();
            const today = format(new Date(), 'yyyy-MM-dd');
            return allMeetings.filter(m => {
                const meetingDate = m.start_date || (m.meeting_date ? m.meeting_date.split('T')[0] : null);
                return meetingDate === today && m.status !== 'cancelled';
            });
        },
        enabled: !!user?.email,
        refetchInterval: 60000,
    });

    // לקוחות ללא פגישה מתוזמנת (scheduled/upcoming)
    const { data: clientsWithoutMeeting = [] } = useQuery({
        queryKey: ['dashboardNoMeeting', clients],
        queryFn: async () => {
            if (clients.length === 0) return [];
            const allMeetings = await Meeting.list();
            const today = format(new Date(), 'yyyy-MM-dd');
            // אימיילים של לקוחות שיש להם פגישה עתידית
            const clientsWithMeeting = new Set(
                allMeetings
                    .filter(m => {
                        const d = m.start_date || m.meeting_date?.split('T')[0];
                        return d >= today && m.status === 'scheduled';
                    })
                    .map(m => m.customer_email)
            );
            return clients.filter(c => !clientsWithMeeting.has(c.email));
        },
        enabled: clients.length > 0,
    });

    if (isUserLoading || isClientsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center p-8 text-horizon-text">
                שגיאה: לא ניתן לטעון את פרטי המשתמש.
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <WelcomeSection user={user} />

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* משימות באיחור */}
                <Card className="card-horizon">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <h3 className="text-sm font-bold text-horizon-text">משימות באיחור</h3>
                            </div>
                            <Badge
                                variant="outline"
                                className={`text-lg font-bold px-3 ${
                                    overdueTasks.length > 0
                                        ? 'text-red-500 border-red-300 bg-red-50'
                                        : 'text-green-600 border-green-300 bg-green-50'
                                }`}
                            >
                                {overdueTasks.length}
                            </Badge>
                        </div>
                        {overdueTasks.length > 0 ? (
                            <ul className="space-y-2 max-h-40 overflow-y-auto">
                                {overdueTasks.slice(0, 5).map(task => (
                                    <li key={task.id} className="flex items-center justify-between text-sm border-b border-horizon pb-1.5 last:border-0">
                                        <span className="text-horizon-text truncate flex-1">{task.name}</span>
                                        {task.end_date && (
                                            <span className="text-xs text-red-400 whitespace-nowrap mr-2">
                                                {format(parseISO(task.end_date), 'dd/MM')}
                                            </span>
                                        )}
                                    </li>
                                ))}
                                {overdueTasks.length > 5 && (
                                    <li className="text-xs text-horizon-accent text-center pt-1">
                                        +{overdueTasks.length - 5} נוספות
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <p className="text-sm text-green-600 text-center py-3">אין משימות באיחור</p>
                        )}
                    </CardContent>
                </Card>

                {/* פגישות היום */}
                <Card className="card-horizon">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                <h3 className="text-sm font-bold text-horizon-text">פגישות היום</h3>
                            </div>
                            <Badge
                                variant="outline"
                                className={`text-lg font-bold px-3 ${
                                    todayMeetings.length > 0
                                        ? 'text-blue-500 border-blue-300 bg-blue-50'
                                        : 'text-horizon-accent border-horizon'
                                }`}
                            >
                                {todayMeetings.length}
                            </Badge>
                        </div>
                        {todayMeetings.length > 0 ? (
                            <ul className="space-y-2 max-h-40 overflow-y-auto">
                                {todayMeetings.slice(0, 5).map(meeting => (
                                    <li key={meeting.id} className="flex items-center justify-between text-sm border-b border-horizon pb-1.5 last:border-0">
                                        <span className="text-horizon-text truncate flex-1">
                                            {meeting.subject || 'פגישה'}
                                        </span>
                                        {meeting.start_time && (
                                            <span className="text-xs text-blue-500 whitespace-nowrap mr-2">
                                                {meeting.start_time}
                                            </span>
                                        )}
                                    </li>
                                ))}
                                {todayMeetings.length > 5 && (
                                    <li className="text-xs text-horizon-accent text-center pt-1">
                                        +{todayMeetings.length - 5} נוספות
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <p className="text-sm text-horizon-accent text-center py-3">אין פגישות מתוכננות להיום</p>
                        )}
                    </CardContent>
                </Card>

                {/* לקוחות ללא פגישה */}
                <Card className="card-horizon">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <UserX className="w-5 h-5 text-orange-500" />
                                <h3 className="text-sm font-bold text-horizon-text">ללא פגישה קרובה</h3>
                            </div>
                            <Badge
                                variant="outline"
                                className={`text-lg font-bold px-3 ${
                                    clientsWithoutMeeting.length > 0
                                        ? 'text-orange-500 border-orange-300 bg-orange-50'
                                        : 'text-green-600 border-green-300 bg-green-50'
                                }`}
                            >
                                {clientsWithoutMeeting.length}
                            </Badge>
                        </div>
                        {clientsWithoutMeeting.length > 0 ? (
                            <ul className="space-y-2 max-h-40 overflow-y-auto">
                                {clientsWithoutMeeting.slice(0, 5).map(client => (
                                    <li key={client.id} className="text-sm border-b border-horizon pb-1.5 last:border-0">
                                        <span className="text-horizon-text truncate">
                                            {client.business_name || client.full_name}
                                        </span>
                                    </li>
                                ))}
                                {clientsWithoutMeeting.length > 5 && (
                                    <li className="text-xs text-horizon-accent text-center pt-1">
                                        +{clientsWithoutMeeting.length - 5} נוספים
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <p className="text-sm text-green-600 text-center py-3">כל הלקוחות עם פגישה מתוזמנת</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* לקוחות — collapsed by default */}
            <div>
                <Button
                    variant="outline"
                    onClick={() => setIsClientsCollapsed(!isClientsCollapsed)}
                    className="border-horizon text-horizon-text"
                >
                    {isClientsCollapsed ? (
                        <><ChevronDown className="w-4 h-4 ml-2" />הצג לקוחות ({clients.length})</>
                    ) : (
                        <><ChevronUp className="w-4 h-4 ml-2" />הסתר לקוחות</>
                    )}
                </Button>
            </div>

            {!isClientsCollapsed && <ClientList clients={clients} />}
        </div>
    );
}
