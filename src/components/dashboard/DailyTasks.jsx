import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckSquare, Square, AlertTriangle, Calendar, ClipboardCheck, Filter, X, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, isToday, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { syncTaskToFireberry } from '@/functions/syncTaskToFireberry';

const TaskItem = ({ task, onUpdateStatus }) => {
    const isDelayed = task.status === 'delayed';
    
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isDelayed ? 'border-red-500/40 bg-red-500/10 hover:bg-red-500/20' : 'border-horizon-border hover:bg-horizon-card'}`}>
            <button 
                onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'open' : 'done')} 
                className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-horizon-primary rounded"
            >
                {task.status === 'done' ? 
                    <CheckSquare className="w-5 h-5 text-green-500" /> : 
                    <Square className="w-5 h-5 text-horizon-accent hover:text-horizon-primary" />
                }
            </button>
            <div className="flex-1 text-right">
                <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-horizon-accent' : 'text-horizon-text'}`}>
                    {task.name}
                </p>
                <p className="text-xs text-horizon-accent">{task.customer_email}</p>
            </div>
            {task.end_date && (
                <Badge variant="outline" className={`text-xs whitespace-nowrap ${isDelayed ? 'text-red-400 border-red-400' : 'text-horizon-accent border-horizon'}`}>
                    {isDelayed && <AlertTriangle className="w-3 h-3 ml-1" />}
                    {format(parseISO(task.end_date), 'dd/MM/yy')}
                </Badge>
            )}
        </div>
    );
};

export default function DailyTasks({ user }) {
    const queryClient = useQueryClient();
    const [clientFilter, setClientFilter] = useState('all');
    
    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['dailyTasks', user?.email],
        queryFn: () => base44.entities.CustomerGoal.filter({ 
            assignee_email: user.email, 
            is_active: true,
        }, '-end_date'),
        enabled: !!user?.email,
        refetchInterval: 30000, // רענון אוטומטי כל 30 שניות
    });

    const { data: clients, isLoading: isLoadingClients } = useQuery({
        queryKey: ['allClientsForFilter'],
        queryFn: () => base44.entities.User.filter({ role: 'user', is_active: true }),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ taskId, status }) => {
            await base44.entities.CustomerGoal.update(taskId, { status });
            // סנכרון לפיירברי
            try {
                await syncTaskToFireberry({ taskId });
            } catch (error) {
                console.error('Failed to sync to Fireberry:', error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['dailyTasks', user?.email]);
        },
    });

    const handleUpdateStatus = (taskId, status) => {
        updateMutation.mutate({ taskId, status });
    };

    const isLoading = isLoadingTasks || isLoadingClients;

    const filteredTasks = tasks?.filter(task => {
        if (clientFilter === 'all') return true;
        return task.customer_email === clientFilter;
    }) || [];

    const overdueTasks = filteredTasks.filter(t => t.status === 'delayed') || [];
    const todayTasks = filteredTasks.filter(t => t.status !== 'done' && t.status !== 'delayed' && t.end_date && isToday(parseISO(t.end_date))) || [];
    const recurringTasks = filteredTasks.filter(t => t.task_type === 'recurring' && t.status !== 'done') || [];


    return (
        <Card className="card-horizon h-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-horizon-primary" />
                        משימות יומיות
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-horizon-accent" />
                        <Select value={clientFilter} onValueChange={setClientFilter}>
                            <SelectTrigger className="w-[180px] bg-horizon-card border-horizon text-sm h-9">
                                <SelectValue placeholder="סנן לפי לקוח" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">כל הלקוחות</SelectItem>
                                {clients?.map(c => (
                                    <SelectItem key={c.id} value={c.email}>
                                        {c.business_name || c.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {clientFilter !== 'all' && (
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setClientFilter('all')}>
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <div className="text-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-horizon-primary" />
                    </div>
                ) : (
                    <>
                        <div>
                            <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-3 px-1">
                                <AlertTriangle className="w-4 h-4" />
                                משימות בדיליי ({overdueTasks.length})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {overdueTasks.length > 0 ? (
                                    overdueTasks.map(task => <TaskItem key={task.id} task={task} onUpdateStatus={handleUpdateStatus} />)
                                ) : (
                                    <p className="text-sm text-horizon-accent text-center py-4">אין משימות בדיליי.</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 mb-3 px-1">
                                <Calendar className="w-4 h-4" />
                                משימות להיום ({todayTasks.length})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {todayTasks.length > 0 ? (
                                    todayTasks.map(task => <TaskItem key={task.id} task={task} onUpdateStatus={handleUpdateStatus} />)
                                ) : (
                                    <p className="text-sm text-horizon-accent text-center py-4">אין משימות להיום.</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2 mb-3 px-1">
                                <RefreshCw className="w-4 h-4" />
                                משימות קבועות ({recurringTasks.length})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {recurringTasks.length > 0 ? (
                                    recurringTasks.map(task => <TaskItem key={task.id} task={task} onUpdateStatus={handleUpdateStatus} />)
                                ) : (
                                    <p className="text-sm text-horizon-accent text-center py-4">אין משימות קבועות.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}