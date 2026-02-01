import React, { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { base44 } from '@/api/base44Client';
import {
  ChevronLeft,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Loader2,
  Lightbulb,
  List
} from 'lucide-react';
import { format, isToday, isPast, isFuture, parseISO } from 'date-fns';
import GoalTemplateSelector from '@/components/trial/GoalTemplateSelector';

export default function TasksPanel({ customer, tasks, isLoading, onRefresh, onCollapse, onTaskClick, allUsers, currentUser }) {
  const [newTaskName, setNewTaskName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showGoalTemplateSelector, setShowGoalTemplateSelector] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'goals', 'tasks'

  // סינון משימות לפי תאריך התחלה - רק משימות שהתאריך שלהן הגיע
  const relevantTasks = useMemo(() => {
    const now = new Date();
    let filtered = tasks.filter(task => {
      // אם אין תאריך התחלה - הצג
      if (!task.start_date) return true;
      // אם תאריך ההתחלה עבר או היום - הצג
      const startDate = parseISO(task.start_date);
      return startDate <= now;
    });

    // החל סינון לפי סוג משימה
    if (filterType === 'goals') {
      filtered = filtered.filter(task => task.task_type === 'goal');
    } else if (filterType === 'tasks') {
      filtered = filtered.filter(task => task.task_type !== 'goal' && task.task_type !== 'meeting');
    }

    return filtered;
  }, [tasks, filterType]);

  // קיבוץ משימות לפי סטטוס
  const groupedTasks = useMemo(() => {
    const today = new Date();
    
    const todayTasks = relevantTasks.filter(t => {
      if (t.status === 'done' || t.status === 'cancelled') return false;
      if (!t.end_date) return false;
      return isToday(parseISO(t.end_date));
    });

    const overdueTasks = relevantTasks.filter(t => {
      if (t.status === 'done' || t.status === 'cancelled') return false;
      if (!t.end_date) return false;
      const endDate = parseISO(t.end_date);
      return isPast(endDate) && !isToday(endDate);
    });

    const inProgressTasks = relevantTasks.filter(t => 
      t.status === 'in_progress'
    );

    const openTasks = relevantTasks.filter(t => {
      if (t.status !== 'open') return false;
      if (!t.end_date) return true;
      const endDate = parseISO(t.end_date);
      return !isPast(endDate) && !isToday(endDate);
    });

    const completedTasks = relevantTasks.filter(t => 
      t.status === 'done'
    ).slice(0, 5); // רק 5 אחרונות

    return { todayTasks, overdueTasks, inProgressTasks, openTasks, completedTasks };
  }, [relevantTasks]);

  const handleAddTask = async (e, currentUser) => {
    e.preventDefault();
    if (!newTaskName.trim() || !customer?.email) return;

    setIsAdding(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // ברירת מחדל - 14 יום (שבועיים) מהיום

      await base44.entities.CustomerGoal.create({
        customer_email: customer.email,
        name: newTaskName.trim(),
        status: 'open',
        task_type: 'one_time',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        assignee_email: currentUser?.email,
        assigned_users: currentUser?.email ? [currentUser.email] : [],
        is_active: true
      });

      setNewTaskName('');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error adding task:", error);
      alert('שגיאה בהוספת משימה');
    } finally {
      setIsAdding(false);
    }
  };

  const handleMarkDone = async (taskId) => {
    try {
      await base44.entities.CustomerGoal.update(taskId, { status: 'done' });
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error marking task done:", error);
      alert('שגיאה בעדכון משימה');
    }
  };

  const TaskItem = ({ task, onClick }) => (
    <div 
      className="bg-horizon-card/50 border border-horizon rounded-lg p-3 hover:border-horizon-primary/50 group cursor-pointer transition-all"
      onClick={() => onClick(task)}
      dir="rtl"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm text-horizon-text font-medium mb-1 break-words">{task.name}</p>
          <div className="flex flex-wrap gap-1 items-center justify-end">
            {task.end_date && (
              <div className="flex items-center gap-1 text-xs text-horizon-accent">
                <Clock className="w-3 h-3" />
                <span>{format(parseISO(task.end_date), 'dd/MM')}</span>
              </div>
            )}
            {task.due_time && (
              <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-400">
                {task.due_time}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleMarkDone(task.id);
          }}
          className="h-7 w-7 text-horizon-accent hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const TaskSection = ({ title, icon: Icon, tasks, color }) => {
    if (tasks.length === 0) return null;
    
    return (
      <div className="mb-4" dir="rtl">
        <div className={`flex items-center gap-2 mb-3 ${color} text-right`}>
          <Icon className="w-4 h-4" />
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="outline" className={`text-xs ${color} border-current`}>
            {tasks.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </div>
      </div>
    );
  };

  if (!customer) {
    return (
      <div className="flex flex-col h-full" dir="rtl">
        <div className="p-4 border-b border-horizon flex items-center justify-between">
          <h2 className="font-bold text-horizon-text flex items-center gap-2 text-right">
            <Target className="w-5 h-5 text-horizon-primary" />
            משימות
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className="text-horizon-accent hover:text-horizon-text h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-horizon-accent">
          <p className="text-sm">בחר לקוח לצפייה במשימות</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-horizon">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-horizon-text flex items-center gap-2 text-right">
            <Target className="w-5 h-5 text-horizon-primary" />
            משימות
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className="text-horizon-accent hover:text-horizon-text h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* פילטר סוג משימות */}
        <div className="flex gap-2 mb-3" dir="rtl">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className={filterType === 'all' 
              ? 'bg-horizon-primary text-white flex-1' 
              : 'border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10 flex-1'}
          >
            <List className="w-4 h-4 ml-1" />
            הכל
          </Button>
          <Button
            variant={filterType === 'goals' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('goals')}
            className={filterType === 'goals' 
              ? 'bg-horizon-primary text-white flex-1' 
              : 'border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10 flex-1'}
          >
            <Target className="w-4 h-4 ml-1" />
            יעדים
          </Button>
          <Button
            variant={filterType === 'tasks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('tasks')}
            className={filterType === 'tasks' 
              ? 'bg-horizon-primary text-white flex-1' 
              : 'border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10 flex-1'}
          >
            <CheckCircle2 className="w-4 h-4 ml-1" />
            משימות
          </Button>
        </div>

        {/* הוספת משימה מהירה */}
        <form onSubmit={(e) => handleAddTask(e, currentUser)} className="flex gap-2 mb-3">
          <Input
            placeholder="משימה חדשה..."
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            className="flex-1 bg-horizon-dark border-horizon text-horizon-text placeholder:text-horizon-accent text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isAdding || !newTaskName.trim()}
            className="bg-horizon-primary hover:bg-horizon-primary/90"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </form>

        {/* כפתור בחירה מבנק יעדים */}
        <Button
          onClick={() => setShowGoalTemplateSelector(true)}
          variant="outline"
          className="w-full border-horizon-primary/50 text-horizon-primary hover:bg-horizon-primary/10 text-sm"
          size="sm"
        >
          <Lightbulb className="w-4 h-4 ml-2" />
          בחר יעד מבנק היעדים
        </Button>
      </div>

      {/* רשימת משימות */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <TaskSection
            title="באיחור"
            icon={AlertTriangle}
            tasks={groupedTasks.overdueTasks}
            color="text-red-400"
          />
          
          <TaskSection
            title="היום"
            icon={Clock}
            tasks={groupedTasks.todayTasks}
            color="text-orange-400"
          />
          
          <TaskSection
            title="בביצוע"
            icon={Target}
            tasks={groupedTasks.inProgressTasks}
            color="text-blue-400"
          />
          
          <TaskSection
            title="לביצוע"
            icon={Clock}
            tasks={groupedTasks.openTasks}
            color="text-horizon-accent"
          />
          
          <TaskSection
            title="הושלמו לאחרונה"
            icon={CheckCircle2}
            tasks={groupedTasks.completedTasks}
            color="text-green-400"
          />

          {relevantTasks.length === 0 && (
            <div className="text-center py-8 text-horizon-accent">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">אין משימות</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-horizon bg-horizon-dark/50">
        <p className="text-xs text-horizon-accent text-center">
          {relevantTasks.length} משימות פעילות
        </p>
      </div>

      {/* מודל בחירת תבנית */}
      <GoalTemplateSelector
        customer={customer}
        isOpen={showGoalTemplateSelector}
        onClose={() => setShowGoalTemplateSelector(false)}
        onGoalCreated={() => {
          setShowGoalTemplateSelector(false);
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}