import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Target, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function TaskCard({ task, customer, parentGoal, onTaskClick, onMarkAsDone, isDragging }) {
  const getCustomerGroupBadgeColor = (group) => {
    if (group === 'A') return 'bg-[#32acc1] text-white';
    if (group === 'B') return 'bg-[#fc9f67] text-white';
    return 'bg-gray-500 text-white';
  };

  const getPriorityColor = (status) => {
    switch (status) {
      case 'delayed': return 'border-r-4 border-red-500';
      case 'in_progress': return 'border-r-4 border-yellow-500';
      case 'done': return 'border-r-4 border-green-500';
      default: return 'border-r-4 border-blue-500';
    }
  };

  return (
    <div
      className={`bg-horizon-card rounded-lg p-3 border border-horizon hover:border-horizon-primary/50 transition-all cursor-pointer ${getPriorityColor(task.status)} ${
        isDragging ? 'opacity-50 rotate-2 shadow-2xl' : 'shadow-sm hover:shadow-md'
      }`}
      onClick={() => onTaskClick(task)}
    >
      {/* כותרת המשימה */}
      <h4 className="font-semibold text-horizon-text text-right mb-2 line-clamp-2">
        {task.name}
      </h4>

      {/* תגיות */}
      <div className="flex flex-wrap gap-1 mb-3">
        {task.task_type === 'recurring' && (
          <Badge className="bg-purple-500 text-white text-xs">
            <RefreshCw className="w-3 h-3 ml-1" />
            {task.recurrence_pattern === 'daily' && 'יומי'}
            {task.recurrence_pattern === 'weekly' && 'שבועי'}
            {task.recurrence_pattern === 'monthly' && 'חודשי'}
            {task.recurrence_pattern === 'specific_days' && 'ימים נבחרים'}
          </Badge>
        )}
        {customer && (
          <Badge className={`${getCustomerGroupBadgeColor(customer.customer_group)} text-xs`}>
            קבוצה {customer.customer_group}
          </Badge>
        )}
        {task.due_time && (
          <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
            <Clock className="w-3 h-3 ml-1" />
            {task.due_time}
          </Badge>
        )}
      </div>

      {/* פרטים */}
      <div className="space-y-1 text-xs text-horizon-accent">
        {customer && (
          <div className="flex items-center gap-1 justify-end">
            <span className="truncate">{customer.business_name || customer.full_name}</span>
            <User className="w-3 h-3 flex-shrink-0" />
          </div>
        )}
        {task.end_date && (
          <div className="flex items-center gap-1 justify-end">
            <span>{format(new Date(task.end_date), 'dd/MM/yyyy', { locale: he })}</span>
            <Calendar className="w-3 h-3 flex-shrink-0" />
          </div>
        )}
        {parentGoal && (
          <div className="flex items-center gap-1 justify-end">
            <span className="truncate">{parentGoal.name}</span>
            <Target className="w-3 h-3 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* כפתור סיום מהיר */}
      {task.status !== 'done' && (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsDone(task.id);
          }}
          className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white h-8"
        >
          <CheckCircle2 className="w-4 h-4 ml-1" />
          סיים
        </Button>
      )}
    </div>
  );
}