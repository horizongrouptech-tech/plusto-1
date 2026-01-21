import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Target, Download, BookOpen } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GoalGroup from './goals/GoalGroup';
import GoalsSummaryDashboard from './goals/GoalsSummaryDashboard';
import { useQuery } from '@tanstack/react-query';
import { generateGoalsHTML } from '../shared/generateGoalsHTML';
import { openPrintWindow } from '../shared/printUtils';
import GoalTemplateSelector from '../trial/GoalTemplateSelector';

export default function CustomerGoalsGantt({ customer }) {
    const [goals, setGoals] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [collapsedGoals, setCollapsedGoals] = useState(() => {
        const initial = {};
        return initial;
    });
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

    const fetchData = useCallback(async (showLoadingSpinner = true) => {
        if (!customer?.email) {
            setIsLoading(false);
            return;
        }
        if (showLoadingSpinner) {
            setIsLoading(true);
        }
        try {
            const [goalsData, userData] = await Promise.all([
                base44.entities.CustomerGoal.filter({ customer_email: customer.email, is_active: true }, 'order_index'),
                showLoadingSpinner ? base44.auth.me() : Promise.resolve(currentUser)
            ]);
            // סינון משימות צ'קליסט יומי
            setGoals(goalsData.filter(g => g.task_type !== 'daily_checklist_360'));
            if (showLoadingSpinner) {
                setCurrentUser(userData);
            }
        } catch (error) {
            console.error("Error fetching goals data:", error);
        } finally {
            if (showLoadingSpinner) {
                setIsLoading(false);
            }
        }
    }, [customer?.email, currentUser]);

    useEffect(() => {
        if (customer?.email) {
            fetchData(true);
        }
    }, [customer?.email]);

    // טעינת פרטי מנהל הכספים המשויך ללקוח (אם קיים)
    const { data: financialManager } = useQuery({
        queryKey: ['financialManager', customer?.assigned_financial_manager_email],
        queryFn: async () => {
            if (!customer?.assigned_financial_manager_email) return null;
            try {
                const manager = await base44.entities.User.filter({
                    email: customer.assigned_financial_manager_email,
                    user_type: 'financial_manager'
                });
                return manager.length > 0 ? manager[0] : null;
            } catch (error) {
                console.error("Error fetching financial manager:", error);
                return null;
            }
        },
        enabled: !!customer?.assigned_financial_manager_email,
        staleTime: 10 * 60 * 1000 // 10 דקות
    });

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

        const topLevelGoals = goals.filter(g => !g.parent_id).sort((a,b) => a.order_index - b.order_index);
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
            
            await base44.entities.CustomerGoal.create({
                customer_email: customer.email,
                name: "יעד חדש (לחץ לעריכה)",
                status: 'open',
                order_index: newOrderIndex,
                end_date: defaultEndDate.toISOString().split('T')[0] // פורמט YYYY-MM-DD
            });
            await fetchData(false);
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
            alert('שגיאה בייצוא PDF');
        }
    };

    const assignableUsers = useMemo(() => {
        if (!currentUser || !customer) return [];
        
        const users = [
            { email: currentUser.email, full_name: `${currentUser.full_name} (אני)` },
            { email: customer.email, full_name: customer.business_name || customer.full_name }
        ];
        
        // הוספת מנהל הכספים המשויך ללקוח (אם קיים)
        if (financialManager) {
            users.push({
                email: financialManager.email,
                full_name: financialManager.full_name
            });
        }
        
        return users;
    }, [currentUser, customer, financialManager]);

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

            const updatedGoals = [...goals];
            reorderedGoals.forEach((goal, index) => {
                const goalIndex = updatedGoals.findIndex(g => g.id === goal.id);
                if (goalIndex !== -1) {
                    updatedGoals[goalIndex] = { ...updatedGoals[goalIndex], order_index: index };
                }
            });
            setGoals(updatedGoals);

            const updatePromises = reorderedGoals.map((goal, index) => 
                base44.entities.CustomerGoal.update(goal.id, { order_index: index })
            );
            
            await Promise.all(updatePromises);
            
        } catch (error) {
            console.error("Error reordering goals:", error);
            await fetchData(false);
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
        <div className="p-4 md:p-6" dir="rtl">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
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
                            className={`space-y-4 min-h-[100px] ${snapshot.isDraggingOver ? 'bg-horizon-primary/5 rounded-xl' : ''}`}
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
                                                    refreshData={() => fetchData(false)}
                                                    allGoals={goals}
                                                    isDragging={snapshot.isDragging}
                                                    isCollapsed={collapsedGoals[goal.id]}
                                                    onToggleCollapse={() => setCollapsedGoals(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
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
                    onGoalCreated={() => fetchData(false)}
                />
            )}
        </div>
    );
}