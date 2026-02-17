import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GoalRow from './GoalRow';
import { base44 } from '@/api/base44Client';

import { toast } from "sonner";
export default function GoalGroup({ goal, subtasks, users, refreshData, allGoals, isDragging, isCollapsed, onToggleCollapse, onExpandAfterAdd }) {
    const [isExpanded, setIsExpanded] = useState(!isCollapsed);

    // סנכרון עם state מהקומפוננטה האב
    React.useEffect(() => {
        setIsExpanded(!isCollapsed);
    }, [isCollapsed]);

    const handleAddSubtask = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        
        try {
            const newOrderIndex = subtasks.length;
            
            // יצירת תאריך יעד ברירת מחדל - 30 ימים מהיום
            const defaultEndDate = new Date();
            defaultEndDate.setDate(defaultEndDate.getDate() + 30);
            
            const newSubtask = await base44.entities.CustomerGoal.create({
                customer_email: goal.customer_email,
                parent_id: goal.id,
                name: "משימה חדשה (לחץ לעריכה)",
                status: 'open',
                assignee_email: goal.assignee_email,
                order_index: newOrderIndex,
                end_date: defaultEndDate.toISOString().split('T')[0] // פורמט YYYY-MM-DD - שדה חובה!
            });
            
            if (newSubtask) {
                await refreshData();
                onExpandAfterAdd?.();
            }
        } catch (error) {
            console.error("Error adding subtask:", error);
            toast.error("שגיאה בהוספת המשימה. נסה שוב.");
        }
    };

    const handleDragEnd = async (result) => {
        const { destination, source } = result;

        if (!destination || destination.index === source.index) {
            return;
        }

        try {
            const reorderedSubtasks = Array.from(subtasks);
            const [movedSubtask] = reorderedSubtasks.splice(source.index, 1);
            reorderedSubtasks.splice(destination.index, 0, movedSubtask);

            const updatePromises = reorderedSubtasks.map((subtask, index) => 
                base44.entities.CustomerGoal.update(subtask.id, { order_index: index })
            );
            
            await Promise.all(updatePromises);
            await refreshData();
            
        } catch (error) {
            console.error("Error reordering subtasks:", error);
            await refreshData();
        }
    };

    const goalActionsSlot = (
        <div className="flex items-center gap-1.5 shrink-0">
            {subtasks.length > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e?.stopPropagation();
                        setIsExpanded(!isExpanded);
                        if (onToggleCollapse) onToggleCollapse();
                    }}
                    className="text-horizon-accent hover:text-horizon-text px-2 py-1.5 min-h-8"
                    title={isExpanded ? 'סגור משימות' : 'הצג משימות'}
                >
                    <span className="mr-1">({subtasks.length})</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
            )}
            <Button
                onClick={handleAddSubtask}
                size="sm"
                variant="outline"
                className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary hover:text-white"
            >
                <Plus className="w-4 h-4 ml-1" />
                הוסף משימה
            </Button>
        </div>
    );

    return (
        <Card className={`card-horizon ${isDragging ? 'opacity-50' : ''}`}>
            <div className="p-2 space-y-2">
                <div className="min-w-0">
                    <GoalRow
                        goal={goal}
                        users={users}
                        refreshData={refreshData}
                        allGoals={allGoals}
                        isParent={true}
                        actionsSlot={goalActionsSlot}
                    />
                </div>

                {isExpanded && subtasks.length > 0 && (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId={`subtasks-${goal.id}`} type="SUBTASK">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="pr-6 space-y-1.5 border-r border-horizon/40 bg-horizon-card/5 rounded-r-md pl-2"
                                >
                                    {subtasks.map((subtask, index) => (
                                        <Draggable 
                                            key={subtask.id} 
                                            draggableId={subtask.id} 
                                            index={index}
                                        >
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
                                                    className={`${snapshot.isDragging ? 'z-50' : ''}`}
                                                >
                                                    <GoalRow
                                                        key={subtask.id}
                                                        goal={subtask}
                                                        users={users}
                                                        refreshData={refreshData}
                                                        allGoals={allGoals}
                                                        isParent={false}
                                                        isDragging={snapshot.isDragging}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </div>
        </Card>
    );
}