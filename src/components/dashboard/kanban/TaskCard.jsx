import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Target, Clock, CheckCircle2, RefreshCw, UserPlus, X } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useUsers } from '../../shared/UsersContext';

export default function TaskCard({ task, customer, parentGoal, onTaskClick, onMarkAsDone, isDragging }) {
  const [isUpdatingAssignees, setIsUpdatingAssignees] = useState(false);
  const { allUsers = [] } = useUsers();
  
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

  const handleAddAssignee = async (email) => {
    if (isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      const currentAssignees = task.assigned_users || [];
      if (!currentAssignees.includes(email)) {
        await base44.entities.CustomerGoal.update(task.id, {
          assigned_users: [...currentAssignees, email],
          is_active: task.is_active !== false
        });
      }
    } catch (error) {
      console.error('Error adding assignee:', error);
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  const handleRemoveAssignee = async (email) => {
    if (isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      const currentAssignees = task.assigned_users || [];
      await base44.entities.CustomerGoal.update(task.id, {
        assigned_users: currentAssignees.filter(e => e !== email),
        is_active: task.is_active !== false
      });
    } catch (error) {
      console.error('Error removing assignee:', error);
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  const assignedUsers = task.assigned_users || [];
  const availableUsers = allUsers.filter(u => !assignedUsers.includes(u.email));

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
        
        {/* אחראים - עם אפשרות עריכה */}
        <Popover>
          <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 justify-end cursor-pointer hover:bg-horizon-primary/10 rounded px-1 py-0.5 transition-colors">
              {assignedUsers.length > 0 ? (
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {assignedUsers.slice(0, 2).map(email => {
                    const user = allUsers.find(u => u.email === email);
                    return (
                      <span key={email} className="truncate">{user?.full_name || email}</span>
                    );
                  })}
                  {assignedUsers.length > 2 && <span>+{assignedUsers.length - 2}</span>}
                </div>
              ) : (
                <span className="text-gray-400">ללא אחראי</span>
              )}
              <UserPlus className="w-3 h-3 flex-shrink-0 text-horizon-primary" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-horizon-dark border-horizon p-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-horizon-text mb-2">אחראים על המשימה:</p>
              
              {assignedUsers.length > 0 && (
                <div className="space-y-1 mb-2">
                  {assignedUsers.map(email => {
                    const user = allUsers.find(u => u.email === email);
                    return (
                      <div key={email} className="flex items-center justify-between bg-horizon-card/50 rounded px-2 py-1">
                        <span className="text-xs text-horizon-text">{user?.full_name || email}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveAssignee(email)}
                          className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
                          disabled={isUpdatingAssignees}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {availableUsers.length > 0 && (
                <Select onValueChange={handleAddAssignee} disabled={isUpdatingAssignees}>
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text h-8 text-xs">
                    <SelectValue placeholder="הוסף אחראי..." />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-dark border-horizon">
                    {availableUsers.map(user => (
                      <SelectItem key={user.email} value={user.email} className="text-xs">
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </PopoverContent>
        </Popover>
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