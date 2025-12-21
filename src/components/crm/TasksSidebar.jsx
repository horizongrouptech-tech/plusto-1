import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Calendar, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import QuickTaskInput from './QuickTaskInput';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function TasksSidebar({ 
  tasks, 
  selectedClient,
  currentUserEmail,
  onTaskClick,
  onTaskCreated,
  isCollapsed,
  onToggleCollapse
}) {
  const [timeFilter, setTimeFilter] = useState('today');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekFromNow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  // סינון משימות לפי start_date (רק משימות שכבר התחילו)
  const activeTasks = useMemo(() => {
    return tasks.filter(task => {
      const startDate = task.start_date ? new Date(task.start_date) : null;
      if (!startDate) return true;
      startDate.setHours(0, 0, 0, 0);
      return startDate <= today;
    });
  }, [tasks, today]);

  const filteredTasks = useMemo(() => {
    return activeTasks.filter(task => {
      if (!task.end_date) return false;
      const endDate = new Date(task.end_date);
      endDate.setHours(0, 0, 0, 0);

      switch (timeFilter) {
        case 'today':
          return endDate.getTime() === today.getTime() && task.status !== 'done' && task.status !== 'cancelled';
        case 'week':
          return endDate >= today && endDate <= weekFromNow && task.status !== 'done' && task.status !== 'cancelled';
        case 'completed':
          return task.status === 'done';
        case 'delayed':
          return task.status === 'delayed';
        default:
          return true;
      }
    });
  }, [activeTasks, timeFilter, today, weekFromNow]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done': return CheckCircle2;
      case 'delayed': return AlertTriangle;
      case 'in_progress': return Clock;
      default: return Calendar;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'text-green-500';
      case 'delayed': return 'text-red-500';
      case 'in_progress': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-horizon-card border-r border-horizon flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-horizon-accent hover:text-horizon-primary"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-horizon-card border-r border-horizon flex flex-col h-full">
      <div className="p-4 border-b border-horizon">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-horizon-text">משימות</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-horizon-accent hover:text-horizon-primary"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        {selectedClient && (
          <QuickTaskInput
            customerEmail={selectedClient.email}
            assigneeEmail={currentUserEmail}
            onTaskCreated={onTaskCreated}
          />
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            variant={timeFilter === 'today' ? 'default' : 'outline'}
            onClick={() => setTimeFilter('today')}
            className={timeFilter === 'today' ? 'bg-horizon-primary text-white text-xs' : 'border-horizon text-horizon-accent text-xs'}
          >
            היום
          </Button>
          <Button
            size="sm"
            variant={timeFilter === 'week' ? 'default' : 'outline'}
            onClick={() => setTimeFilter('week')}
            className={timeFilter === 'week' ? 'bg-horizon-primary text-white text-xs' : 'border-horizon text-horizon-accent text-xs'}
          >
            השבוע
          </Button>
          <Button
            size="sm"
            variant={timeFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => setTimeFilter('completed')}
            className={timeFilter === 'completed' ? 'bg-green-500 text-white text-xs' : 'border-green-500 text-green-500 text-xs'}
          >
            הושלמו
          </Button>
          <Button
            size="sm"
            variant={timeFilter === 'delayed' ? 'default' : 'outline'}
            onClick={() => setTimeFilter('delayed')}
            className={timeFilter === 'delayed' ? 'bg-red-500 text-white text-xs' : 'border-red-500 text-red-500 text-xs'}
          >
            באיחור
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!selectedClient ? (
          <div className="text-center text-horizon-accent text-sm py-8">
            בחר לקוח להצגת משימות
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center text-horizon-accent text-sm py-8">
            אין משימות להצגה
          </div>
        ) : (
          filteredTasks.map(task => {
            const StatusIcon = getStatusIcon(task.status);
            return (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="p-3 bg-white dark:bg-horizon-dark rounded-lg border border-horizon hover:border-horizon-primary/50 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-2 mb-2">
                  <StatusIcon className={`w-4 h-4 mt-0.5 ${getStatusColor(task.status)}`} />
                  <div className="flex-1 text-right">
                    <p className="text-sm font-medium text-horizon-text">{task.name}</p>
                  </div>
                </div>
                {task.end_date && (
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-xs text-horizon-accent">
                      {format(new Date(task.end_date), 'dd/MM/yyyy', { locale: he })}
                    </span>
                    <Calendar className="w-3 h-3 text-horizon-accent" />
                  </div>
                )}
                {task.task_type === 'recurring' && (
                  <Badge className="bg-purple-500 text-white text-xs mt-2">
                    חוזר
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-horizon text-center text-xs text-horizon-accent">
        {filteredTasks.length} משימות
      </div>
    </div>
  );
}