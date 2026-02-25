import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Target, Download, BookOpen } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GoalGroup from './goals/GoalGroup';
import GoalsSummaryDashboard from './goals/GoalsSummaryDashboard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { generateGoalsHTML } from '../shared/generateGoalsHTML';
import { openPrintWindow } from '../shared/printUtils';
import GoalTemplateSelector from '../trial/GoalTemplateSelector';
import { useUsers } from '../shared/UsersContext';

import { toast } from "sonner";
import { CustomerGoal } from '@/api/entities';
export default function CustomerGoalsGantt({ customer }) {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();
    const [collapsedGoals, setCollapsedGoals] = useState(() => {
        const initial = {};
        return initial;
    });
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

    const { data: rawGoals = [], isLoading } = useQuery({
        queryKey: ['customerGoals', customer?.email],
        queryFn: async () => {
            const goalsData = await CustomerGoal.filter({ customer_email: customer.email, is_active: true }, 'order_index');
            return goalsData;
        },
        enabled: !!customer?.email
    });

    const goals = useMemo(() =>
        rawGoals.filter(g => g.task_type !== 'daily_checklist_360' && g.is_active !== false),
        [rawGoals]
    );

    const refreshData = useCallback(() => {
        queryClient.invalidateQueries(['customerGoals', customer?.email]);
    }, [queryClient, customer?.email]);

    const { topLevelGoals, subtasksByGoal } = useMemo(() => {
        const calculateParentGoalStatus = (subtasks) => {
            if (!subtasks || subtasks.length === 0) {
                return 'open';
            }

            const anyDelayed = subtasks.some(st => st.status === 'delayed');
            const anyInProgress = subtasks.some(st => st.status === 'in_progress');
            const anyOpen = subtasks.some(st => st.status === 'open');

            if (anyDelayed) return 'delayed';
            if (anyInProgress) return 'in_progress';
            if (subtasks.every(st => st.status === 'done')) return 'done';
            if (anyOpen) return 'open';
            if (subtasks.every(st => st.status === 'cancelled')) return 'cancelled';

            return 'open';
        };

        // זיהוי יעדים אמיתיים: task_type === 'goal' או שיש תת-משימות (פריטים עם parent_id שמצביע אליו)
        const explicitGoals = goals.filter(g => g.task_type === 'goal');
        const goalsWithSubtasks = goals.filter(g => goals.some(t => t.parent_id === g.id));
        const parentGoalIds = new Set([
            ...explicitGoals.map(g => g.id),
            ...goalsWithSubtasks.map(g => g.id)
        ]);
        const topLevelGoals = goals
            .filter(g => !g.parent_id && parentGoalIds.has(g.id))
            .sort((a, b) => a.order_index - b.order_index);
        const subtasksByGoal = goals.reduce((acc, goal) => {
            if (goal.parent_id) {
                if (!acc[goal.parent_id]) {
                    acc[goal.parent_id] = [];
                }
                acc[goal.parent_id].push(goal);
            }
            return acc;
        }, {});

        for (const goalId in subtasksByGoal) {
            subtasksByGoal[goalId].sort((a,b) => a.order_index - b.order_index);
        }

        const updatedTopLevelGoals = topLevelGoals.map(goal => {
            const subtasks = subtasksByGoal[goal.id] || [];
            return {
                ...goal,
                status: calculateParentGoalStatus(subtasks)
            };
        });

        return { topLevelGoals: updatedTopLevelGoals, subtasksByGoal };
    }, [goals]);

    const toggleAllGoals = useCallback((shouldCollapse) => {
        const newState = {};
        topLevelGoals.forEach(goal => {
            newState[goal.id] = shouldCollapse;
        });
        setCollapsedGoals(newState);
    }, [topLevelGoals]);

    useEffect(() => {
        if (topLevelGoals.length > 0) {
            const initial = {};
            topLevelGoals.forEach(goal => {
                initial[goal.id] = true;
            });
            setCollapsedGoals(initial);
        }
    }, [topLevelGoals.length]);

    const handleAddGoal = async () => {
        try {
            const newOrderIndex = goals.filter(g => !g.parent_id).length;
            const defaultEndDate = new Date();
            defaultEndDate.setDate(defaultEndDate.getDate() + 30); // 30 ימים מהיום
            
            await CustomerGoal.create({
                customer_email: customer.email,
                name: "יעד חדש (לחץ לעריכה)",
                status: 'open',
                task_type: 'goal',
                assignee_email: customer?.assigned_financial_manager_email,
                order_index: newOrderIndex,
                end_date: defaultEndDate.toISOString().split('T')[0] // פורמט YYYY-MM-DD
            });
            refreshData();
        } catch (error) {
            console.error("Error adding new goal:", error);
        }
    };

    const handleExportPDF = () => {
        try {
            const htmlContent = generateGoalsHTML(goals, customer);
            openPrintWindow(htmlContent, `יעדים_${customer.business_name || customer.email}`);
        } catch (error) {
            console.error('Error exporting goals PDF:', error);
            toast.error('שגיאה בייצוא PDF');
        }
    };

    // רשימת אחראים = כל מי שיש לו גישה לתיק (מנהלי כספים + אדמינים + לקוח)
    const { allUsers = [], financialManagers = [], isAdmin } = useUsers();

    const assignableUsers = useMemo(() => {
        if (!currentUser || !customer) return [];

        const existing = new Set();
        const users = [];

        const add = (email, full_name) => {
            if (email && full_name && !existing.has(email)) {
                existing.add(email);
                users.push({ email, full_name });
            }
        };

        add(currentUser.email, `${currentUser.full_name} (אני)`);
        add(customer.email, customer.business_name || customer.full_name);

        if (isAdmin) {
            allUsers.forEach((u) => add(u.email, u.full_name));
        } else {
            financialManagers.forEach((u) => add(u.email, u.full_name));
        }

        return users;
    }, [currentUser, customer, isAdmin, allUsers, financialManagers]);

    const summaryStats = useMemo(() => {
        const allSubtasks = Object.values(subtasksByGoal).flat();

        const getStats = (items) => ({
            total: items.length,
            done: items.filter(g => g.status === 'done').length,
            in_progress: items.filter(g => g.status === 'in_progress').length,
            delayed: items.filter(g => g.status === 'delayed').length,
        });

        return {
            goalStats: getStats(topLevelGoals),
            subtaskStats: getStats(allSubtasks)
        };
    }, [topLevelGoals, subtasksByGoal]);

    const handleDragEnd = async (result) => {
        const { destination, source } = result;

        if (!destination || destination.index === source.index) {
            return;
        }

        try {
            const reorderedGoals = Array.from(topLevelGoals);
            const [movedGoal] = reorderedGoals.splice(source.index, 1);
            reorderedGoals.splice(destination.index, 0, movedGoal);

            const updatePromises = reorderedGoals.map((goal, index) => 
                CustomerGoal.update(goal.id, { order_index: index })
            );
            
            await Promise.all(updatePromises);
            refreshData();
        } catch (error) {
            console.error("Error reordering goals:", error);
            refreshData();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-horizon-accent">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                טוען יעדים...
            </div>
        );
    }

    return (
        <div className="min-w-[360px]" dir="rtl">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                 <h2 className="text-2xl font-bold text-horizon-text flex items-center gap-3">
                    <Target className="text-horizon-primary" />
                    גאנט יעדים
                </h2>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        onClick={() => toggleAllGoals(!Object.values(collapsedGoals).every(v => v))}
                        variant="outline"
                        size="sm"
                        className="border-horizon text-horizon-accent h-11"
                    >
                        {Object.values(collapsedGoals).every(v => v) ? 'פתח הכל' : 'סגור הכל'}
                    </Button>
                    <Button 
                        onClick={handleExportPDF}
                        variant="outline"
                        className="border-green-500 text-green-400 hover:bg-green-500/10 h-11"
                    >
                        <Download className="w-4 h-4 ml-2" />
                        ייצא ל-PDF
                    </Button>
                    <Button
                        onClick={() => setShowTemplateSelector(true)}
                        variant="outline"
                        className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10 h-11"
                    >
                        <BookOpen className="w-4 h-4 ml-2" />
                        בנק יעדים
                    </Button>
                    <Button onClick={handleAddGoal} className="btn-horizon-primary h-11">
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף יעד חדש
                    </Button>
                </div>
            </div>
            
            {goals.length > 0 && <GoalsSummaryDashboard goalStats={summaryStats.goalStats} subtaskStats={summaryStats.subtaskStats} />}

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="goals-list" type="GOAL">
                    {(provided, snapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`space-y-3 min-h-[100px] ${snapshot.isDraggingOver ? 'bg-horizon-primary/5 rounded-xl' : ''}`}
                        >
                            {topLevelGoals.length === 0 && !isLoading ? (
                                <div className="text-center py-16 border-2 border-dashed border-horizon-card rounded-xl">
                                    <Target className="mx-auto h-12 w-12 text-horizon-accent" />
                                    <h3 className="mt-2 text-lg font-medium text-horizon-text">אין עדיין יעדים ללקוח זה</h3>
                                    <p className="mt-1 text-sm text-horizon-accent">התחל על ידי הוספת יעד חדש.</p>
                                </div>
                            ) : (
                                topLevelGoals.map((goal, index) => (
                                    <Draggable key={goal.id} draggableId={goal.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                    transform: snapshot.isDragging
                                                        ? provided.draggableProps.style?.transform
                                                        : 'translate(0px, 0px)',
                                                }}
                                                className={`transition-all duration-200 ${
                                                    snapshot.isDragging ? 'z-50' : 'z-auto'
                                                }`}
                                            >
                                                <GoalGroup
                                                    key={goal.id}
                                                    goal={goal}
                                                    subtasks={subtasksByGoal[goal.id] || []}
                                                    users={assignableUsers}
                                                    refreshData={refreshData}
                                                    allGoals={goals}
                                                    isDragging={snapshot.isDragging}
                                                    isCollapsed={collapsedGoals[goal.id]}
                                                    onToggleCollapse={() => setCollapsedGoals(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                                                    onExpandAfterAdd={() => setCollapsedGoals(prev => ({ ...prev, [goal.id]: false }))}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {showTemplateSelector && (
                <GoalTemplateSelector
                    customer={customer}
                    isOpen={showTemplateSelector}
                    onClose={() => setShowTemplateSelector(false)}
                    onGoalCreated={refreshData}
                />
            )}
        </div>
    );
}