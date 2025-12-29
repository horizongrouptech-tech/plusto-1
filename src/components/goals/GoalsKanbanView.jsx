import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GoalCard from './GoalCard';

export default function GoalsKanbanView({ 
  goals = [], 
  onStatusChange,
  onEdit,
  onView,
  onDelete,
  onMarkComplete,
  allUsers = []
}) {
  const columns = {
    open: {
      id: 'open',
      title: 'פתוח',
      icon: '📝',
      color: 'bg-gray-500/20 border-gray-500/30'
    },
    in_progress: {
      id: 'in_progress',
      title: 'בביצוע',
      icon: '🔄',
      color: 'bg-blue-500/20 border-blue-500/30'
    },
    done: {
      id: 'done',
      title: 'הושלם',
      icon: '✅',
      color: 'bg-green-500/20 border-green-500/30'
    },
    delayed: {
      id: 'delayed',
      title: 'באיחור',
      icon: '⏰',
      color: 'bg-red-500/20 border-red-500/30'
    },
    cancelled: {
      id: 'cancelled',
      title: 'בוטל',
      icon: '❌',
      color: 'bg-gray-400/20 border-gray-400/30'
    }
  };

  const groupedGoals = useMemo(() => {
    const grouped = {};
    Object.keys(columns).forEach(status => {
      grouped[status] = goals.filter(g => g.status === status);
    });
    return grouped;
  }, [goals]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    
    if (onStatusChange) {
      onStatusChange(draggableId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.values(columns).map(column => (
          <div key={column.id} className="flex flex-col">
            <Card className={`${column.color} border-2 mb-3 sticky top-0 z-10`}>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{column.icon}</span>
                    <h3 className="font-bold text-horizon-text">{column.title}</h3>
                  </div>
                  <Badge className="bg-horizon-dark/50 text-horizon-text">
                    {groupedGoals[column.id]?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-3 min-h-[200px] p-2 rounded-xl transition-colors ${
                    snapshot.isDraggingOver ? 'bg-horizon-primary/10' : 'bg-transparent'
                  }`}
                >
                  {groupedGoals[column.id]?.map((goal, index) => (
                    <Draggable key={goal.id} draggableId={goal.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`transition-all ${
                            snapshot.isDragging ? 'rotate-3 scale-105 shadow-2xl' : ''
                          }`}
                        >
                          <GoalCard
                            goal={goal}
                            onEdit={onEdit}
                            onView={onView}
                            onDelete={onDelete}
                            onMarkComplete={onMarkComplete}
                            allUsers={allUsers}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {groupedGoals[column.id]?.length === 0 && (
                    <div className="text-center p-8 text-horizon-accent text-sm">
                      אין יעדים בסטטוס זה
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}