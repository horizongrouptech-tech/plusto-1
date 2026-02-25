import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';

import { format, parseISO, isToday, isPast } from 'date-fns';
import { Plus, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { CustomerGoal } from '@/api/entities';

export default function TaskBoardByCustomer({ customers = [], onTaskClick, currentUser, onAddTask }) {
  // טעינת כל המשימות של כל הלקוחות
  const { data: allTasks = [] } = useQuery({
    queryKey: ['allCustomersTasks'],
    queryFn: async () => {
      if (customers.length === 0) return [];
      
      const tasksPromises = customers.map(customer =>
        CustomerGoal.filter({
          customer_email: customer.email
        }, '-created_date')
      );
      
      const results = await Promise.all(tasksPromises);
      return results.flat();
    },
    enabled: customers.length > 0
  });

  // קיבוץ משימות לפי לקוח
  const tasksByCustomer = useMemo(() => {
    const grouped = {};
    customers.forEach(customer => {
      grouped[customer.email] = {
        customer,
        tasks: allTasks.filter(t => t.customer_email === customer.email)
      };
    });
    return grouped;
  }, [allTasks, customers]);

  // חישוב סטטוס משימה
  const getTaskStatus = (task) => {
    if (task.status === 'done') return 'completed';
    if (task.status === 'cancelled') return 'cancelled';
    if (!task.end_date) return 'open';
    
    const endDate = parseISO(task.end_date);
    if (isToday(endDate)) return 'today';
    if (isPast(endDate)) return 'overdue';
    return 'open';
  };

  const TaskCard = ({ task }) => {
    const status = getTaskStatus(task);
    const statusColors = {
      'overdue': 'border-red-500/50 bg-red-500/10',
      'today': 'border-orange-500/50 bg-orange-500/10',
      'completed': 'border-green-500/50 bg-green-500/10',
      'cancelled': 'border-gray-500/50 bg-gray-500/10',
      'open': 'border-blue-500/50 bg-blue-500/10'
    };

    const statusIcons = {
      'overdue': <AlertTriangle className="w-3 h-3 text-red-400" />,
      'today': <Clock className="w-3 h-3 text-orange-400" />,
      'completed': <CheckCircle2 className="w-3 h-3 text-green-400" />,
      'cancelled': <AlertTriangle className="w-3 h-3 text-gray-400" />,
      'open': <Clock className="w-3 h-3 text-blue-400" />
    };

    return (
      <Card 
        className={`border cursor-pointer hover:shadow-md transition-all ${statusColors[status]}`}
        onClick={() => onTaskClick?.(task)}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-horizon-text truncate">{task.name}</p>
              {task.end_date && (
                <p className="text-xs text-horizon-accent mt-1">
                  {format(parseISO(task.end_date), 'dd/MM')}
                </p>
              )}
            </div>
            {statusIcons[status]}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-horizon-accent">
        <p>אין לקוחות להצגה</p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full h-full" dir="rtl">
      <div className="flex gap-4 p-4">
        {customers.map(customer => {
          const data = tasksByCustomer[customer.email];
          const tasks = data?.tasks || [];
          
          return (
            <div 
              key={customer.email} 
              className="flex-shrink-0 w-80 bg-horizon-card/50 rounded-lg border border-horizon p-4"
            >
              {/* Header עמודה */}
              <div className="mb-4 pb-3 border-b border-horizon text-right">
                <h3 className="font-semibold text-horizon-text text-sm">{customer.business_name}</h3>
                <p className="text-xs text-horizon-accent">{customer.email}</p>
              </div>

              {/* רשימת משימות */}
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-xs text-horizon-accent text-center py-8">אין משימות</p>
                ) : (
                  tasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>

              {/* כפתור הוספה */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddTask?.(customer)}
                className="w-full mt-3 border-horizon text-horizon-primary hover:bg-horizon-primary/10"
              >
                <Plus className="w-3 h-3 ml-1" />
                הוסף משימה
              </Button>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}