import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Loader2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function CustomerTasksKanban({ customerEmail }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (customerEmail) {
      loadTasks();
    }
  }, [customerEmail]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const allGoals = await base44.entities.CustomerGoal.filter({
        customer_email: customerEmail,
        is_active: true
      });
      
      const subtasks = allGoals.filter(g => g.parent_id);
      setTasks(subtasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = {
    open: { title: 'פתוח', color: 'bg-gray-500' },
    in_progress: { title: 'בביצוע', color: 'bg-blue-500' },
    done: { title: 'הושלם', color: 'bg-green-500' },
    delayed: { title: 'באיחור', color: 'bg-red-500' }
  };

  const tasksByStatus = Object.keys(columns).reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status);
    return acc;
  }, {});

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    try {
      await base44.entities.CustomerGoal.update(draggableId, {
        status: destination.droppableId
      });
      await loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(columns).map(([status, { title, color }]) => (
          <Card key={status} className="card-horizon">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                {title} ({tasksByStatus[status].length})
              </CardTitle>
            </CardHeader>
            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <CardContent
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[400px] space-y-2 ${snapshot.isDraggingOver ? 'bg-horizon-primary/5' : ''}`}
                >
                  {tasksByStatus[status].map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-3 bg-horizon-card border border-horizon rounded-lg ${
                            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                          }`}
                        >
                          <h4 className="font-medium text-horizon-text text-sm mb-2">{task.name}</h4>
                          {task.end_date && (
                            <div className="flex items-center gap-1 text-xs text-horizon-accent mb-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.end_date), 'dd/MM/yyyy', { locale: he })}
                            </div>
                          )}
                          {task.assignee_email && (
                            <Badge variant="outline" className="text-xs">
                              <User className="w-3 h-3 ml-1" />
                              {task.assignee_email.split('@')[0]}
                            </Badge>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </CardContent>
              )}
            </Droppable>
          </Card>
        ))}
      </div>
    </DragDropContext>
  );
}