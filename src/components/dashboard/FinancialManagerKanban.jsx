import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { heIL } from 'date-fns/locale';

export default function FinancialManagerKanban({ currentUser, clients = [] }) {
  const [selectedTask, setSelectedTask] = useState(null);

  // טעינת כל המשימות עבור הלקוחות המשויכים
  const { data: allTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['financialManagerTasks', clients.map(c => c.email).join(',')],
    queryFn: async () => {
      if (clients.length === 0) return [];
      
      const allTasksArray = [];
      for (const client of clients) {
        try {
          const tasks = await base44.entities.CustomerGoal.filter({
            customer_email: client.email
          }, '-created_date');
          
          allTasksArray.push(...tasks.map(task => ({
            ...task,
            client_email: client.email,
            client_name: client.business_name || client.full_name
          })));
        } catch (error) {
          console.error(`Error loading tasks for client ${client.email}:`, error);
        }
      }
      return allTasksArray;
    },
    enabled: clients.length > 0
  });

  // קבוצת משימות לפי לקוח
  const tasksByClient = useMemo(() => {
    const grouped = {};
    clients.forEach(client => {
      grouped[client.email] = allTasks.filter(task => task.client_email === client.email);
    });
    return grouped;
  }, [allTasks, clients]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const statusLabels = {
    pending: 'ממתין',
    in_progress: 'בתהליך',
    completed: 'הושלם'
  };

  const priorityLabels = {
    high: 'גבוהה',
    medium: 'בינונית',
    low: 'נמוכה'
  };

  if (isLoadingTasks) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת */}
      <div>
        <h2 className="text-2xl font-bold text-horizon-text">ביצועי כנבן - לקוחות שלי</h2>
        <p className="text-sm text-horizon-accent mt-1">
          {clients.length} לקוחות | {allTasks.length} משימות
        </p>
      </div>

      {/* תצוגת Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
          {clients.map(client => (
            <div
              key={client.email}
              className="flex-shrink-0 w-96 bg-horizon-card rounded-lg border border-horizon p-4"
            >
              {/* כותרת עמודה */}
              <div className="mb-4 pb-4 border-b border-horizon">
                <h3 className="font-semibold text-horizon-text text-lg">
                  {client.business_name || client.full_name}
                </h3>
                <p className="text-xs text-horizon-accent mt-1">{client.email}</p>
                <div className="flex gap-2 mt-3">
                  {client.customer_group && (
                    <Badge variant="outline" className="text-xs border-horizon text-horizon-accent">
                      קבוצה {client.customer_group}
                    </Badge>
                  )}
                  {client.business_type && (
                    <Badge variant="outline" className="text-xs border-horizon text-horizon-accent">
                      {client.business_type}
                    </Badge>
                  )}
                </div>
              </div>

              {/* משימות בעמודה */}
              <div className="space-y-3 min-h-[200px]">
                {tasksByClient[client.email]?.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-horizon-accent text-sm">
                    אין משימות
                  </div>
                ) : (
                  tasksByClient[client.email]?.map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-horizon-dark rounded-lg border border-horizon/50 hover:border-horizon-primary/50 cursor-pointer transition-all hover:shadow-lg"
                      onClick={() => setSelectedTask(task)}
                    >
                      {/* שם משימה */}
                      <h4 className="font-medium text-horizon-text text-sm line-clamp-2">
                        {task.name || task.title || 'משימה ללא שם'}
                      </h4>

                      {/* מטא-מידע */}
                      <div className="mt-2 space-y-2 text-xs">
                        {/* סטטוס */}
                        <div className="flex gap-2 flex-wrap">
                          <Badge
                            className={`border ${getStatusColor(task.status)}`}
                            variant="outline"
                          >
                            {statusLabels[task.status] || task.status}
                          </Badge>
                          {task.priority && (
                            <Badge
                              className={`border ${getPriorityColor(task.priority)}`}
                              variant="outline"
                            >
                              {priorityLabels[task.priority] || task.priority}
                            </Badge>
                          )}
                        </div>

                        {/* תאריך יעד */}
                        {task.end_date && (
                          <div className="text-horizon-accent">
                            <span className="text-xs">יעד:</span>{' '}
                            <span className="text-horizon-text">
                              {new Date(task.end_date).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                        )}

                        {/* משויך ל */}
                        {task.assigned_to && (
                          <div className="text-horizon-accent">
                            <span className="text-xs">משויך ל:</span>{' '}
                            <span className="text-horizon-text text-xs truncate block">
                              {task.assigned_to}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* סטטיסטיקה בתחתית */}
              <div className="mt-4 pt-4 border-t border-horizon/30">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-horizon-accent">ממתין</p>
                    <p className="text-yellow-400 font-bold">
                      {tasksByClient[client.email]?.filter(t => t.status === 'pending').length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-horizon-accent">בתהליך</p>
                    <p className="text-blue-400 font-bold">
                      {tasksByClient[client.email]?.filter(t => t.status === 'in_progress').length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-horizon-accent">הושלם</p>
                    <p className="text-green-400 font-bold">
                      {tasksByClient[client.email]?.filter(t => t.status === 'completed').length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {clients.length === 0 && (
          <div className="flex items-center justify-center h-40 text-horizon-accent">
            אין לקוחות משויכים לך כעת
          </div>
        )}
      </div>
    </div>
  );
}