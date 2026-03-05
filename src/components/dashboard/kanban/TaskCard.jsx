import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Target, Clock, CheckCircle2, RefreshCw, UserPlus, X } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

import { useUsers } from '../../shared/UsersContext';
import { CustomerGoal } from '@/api/entities';

// Status badge — צבעים + label
const STATUS_BADGE = {
  delayed: { label: 'ממתין', bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  in_progress: { label: 'בתהליך', bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  done: { label: 'הושלם', bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  open: { label: 'לביצוע', bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
};

// Priority dot color — עיגול צבעוני בצד הכרטיס
const PRIORITY_DOT = {
  delayed: 'bg-rose-500',
  in_progress: 'bg-amber-500',
  done: 'bg-emerald-500',
  open: 'bg-blue-400',
};

export default function TaskCard({ task, customer, parentGoal, onTaskClick, onMarkAsDone, index }) {
  const [isUpdatingAssignees, setIsUpdatingAssignees] = useState(false);
  const { allUsers = [] } = useUsers();

  const handleAddAssignee = async (email) => {
    if (isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      const currentAssignees = task.assigned_users || [];
      if (!currentAssignees.includes(email)) {
        await CustomerGoal.update(task.id, {
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
      await CustomerGoal.update(task.id, {
        assigned_users: currentAssignees.filter(e => e !== email),
        is_active: task.is_active !== false
      });
    } catch (error) {
      console.error('Error removing assignee:', error);
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  const handleRemoveAssigneeEmail = async () => {
    if (isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      await CustomerGoal.update(task.id, {
        assignee_email: null,
        is_active: task.is_active !== false
      });
    } catch (error) {
      console.error('Error removing assignee_email:', error);
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  const assignedUsers = task.assigned_users || [];
  const hasAssigneeEmail = task.assignee_email && !assignedUsers.includes(task.assignee_email);
  const displayAssignees = hasAssigneeEmail
    ? [task.assignee_email, ...assignedUsers]
    : assignedUsers;
  const availableUsers = allUsers.filter(
    u => !assignedUsers.includes(u.email) && (!task.assignee_email || u.email !== task.assignee_email)
  );

  const isDone = task.status === 'done';
  const badge = STATUS_BADGE[task.status] || STATUS_BADGE.open;
  const priorityDot = PRIORITY_DOT[task.status] || PRIORITY_DOT.open;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            relative bg-white dark:bg-horizon-card rounded-xl p-4 border border-gray-100 dark:border-horizon
            transition-all duration-200 cursor-grab
            hover:shadow-md hover:border-gray-200 dark:hover:border-horizon-primary/30
            ${isDone ? 'opacity-60' : ''}
            ${snapshot.isDragging
              ? 'shadow-xl shadow-[#32acc1]/10 rotate-1 scale-[1.02] cursor-grabbing ring-2 ring-[#32acc1]/30'
              : 'shadow-sm'
            }
          `}
          onClick={() => onTaskClick(task)}
        >
          {/* Priority dot — עיגול צבעוני בפינה */}
          <div className={`absolute top-4 left-4 w-2.5 h-2.5 rounded-full ${priorityDot}`} />

          {/* שם המשימה */}
          <h4 className={`font-semibold text-sm text-gray-800 dark:text-horizon-text text-right mb-1.5 line-clamp-2 leading-snug pr-0 pl-5 ${isDone ? 'line-through' : ''}`}>
            {task.name}
          </h4>

          {/* תיאור/הערות — אם יש */}
          {task.notes && (
            <p className="text-xs text-gray-400 dark:text-horizon-accent text-right mb-3 line-clamp-2 pl-5">
              {task.notes}
            </p>
          )}

          {/* שורת מידע — תאריך + שעה + badge סטטוס */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-horizon-accent">
              {task.end_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(task.end_date), 'd.M.yyyy', { locale: he })}
                </span>
              )}
              {task.due_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {task.due_time}
                </span>
              )}
            </div>

            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>

          {/* שורת תגיות + אחראי */}
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50 dark:border-horizon/50">
            <div className="flex items-center gap-1.5">
              {task.task_type === 'recurring' && (
                <span className="inline-flex items-center gap-0.5 bg-[#32acc1]/10 text-[#1e90b0] dark:text-[#32acc1] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  <RefreshCw className="w-2.5 h-2.5" />
                  {task.recurrence_pattern === 'daily' && 'יומי'}
                  {task.recurrence_pattern === 'weekly' && 'שבועי'}
                  {task.recurrence_pattern === 'monthly' && 'חודשי'}
                  {task.recurrence_pattern === 'specific_days' && 'ימים'}
                </span>
              )}
              {parentGoal && (
                <span className="inline-flex items-center gap-0.5 bg-gray-100 dark:bg-horizon-surface text-gray-500 dark:text-horizon-accent text-[10px] px-1.5 py-0.5 rounded-full max-w-[80px] truncate" title={parentGoal.name}>
                  <Target className="w-2.5 h-2.5 flex-shrink-0" />
                  {parentGoal.name}
                </span>
              )}
            </div>

            {/* אחראים */}
            <Popover>
              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-horizon-accent hover:text-[#32acc1] transition-colors duration-150 cursor-pointer rounded-full px-1.5 py-0.5 hover:bg-[#32acc1]/5">
                  <UserPlus className="w-3 h-3 flex-shrink-0" />
                  {displayAssignees.length > 0 ? (
                    <span className="truncate max-w-[70px]">
                      {(() => {
                        const firstUser = allUsers.find(u => u.email === displayAssignees[0]);
                        return firstUser?.full_name?.split(' ')[0] || displayAssignees[0]?.split('@')[0];
                      })()}
                      {displayAssignees.length > 1 && ` +${displayAssignees.length - 1}`}
                    </span>
                  ) : (
                    <span>ללא אחראי</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 bg-white dark:bg-horizon-dark border-gray-200 dark:border-horizon p-3 rounded-xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-horizon-text mb-2">אחראים:</p>

                  {hasAssigneeEmail && (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-horizon-card rounded-lg px-2 py-1.5">
                      <span className="text-xs text-gray-700 dark:text-horizon-text">
                        {allUsers.find(u => u.email === task.assignee_email)?.full_name || task.assignee_email?.split('@')[0]}
                      </span>
                      <Button size="sm" variant="ghost"
                        onClick={() => handleRemoveAssigneeEmail()}
                        className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
                        disabled={isUpdatingAssignees}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {assignedUsers.map(email => {
                    const user = allUsers.find(u => u.email === email);
                    return (
                      <div key={email} className="flex items-center justify-between bg-gray-50 dark:bg-horizon-card rounded-lg px-2 py-1.5">
                        <span className="text-xs text-gray-700 dark:text-horizon-text">{user?.full_name || email}</span>
                        <Button size="sm" variant="ghost"
                          onClick={() => handleRemoveAssignee(email)}
                          className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
                          disabled={isUpdatingAssignees}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}

                  {availableUsers.length > 0 && (
                    <Select onValueChange={handleAddAssignee} disabled={isUpdatingAssignees}>
                      <SelectTrigger className="bg-gray-50 dark:bg-horizon-card border-gray-200 dark:border-horizon text-gray-700 dark:text-horizon-text h-7 text-xs rounded-lg">
                        <SelectValue placeholder="הוסף אחראי..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-horizon-dark border-gray-200 dark:border-horizon rounded-xl">
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

          {/* כפתור סיום */}
          {!isDone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsDone(task.id);
              }}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-600/20 transition-all duration-150 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              סיים
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}
