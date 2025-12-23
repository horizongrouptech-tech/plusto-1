import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Target,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  ListTodo,
  LayoutGrid,
  Link as LinkIcon,
  Circle,
  AlertCircle,
  Download,
  Edit,
  Save,
  UserPlus,
  Mail,
  Trash2,
  X,
  ChevronDown,
  ChevronUp } from
"lucide-react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import CustomerGoalsGantt from './CustomerGoalsGantt';
import { generateGoalsHTML } from '../shared/generateGoalsHTML';
import { openPrintWindow } from '../shared/printUtils';
import { syncTaskToFireberry } from '@/functions/syncTaskToFireberry';
import { useUsers } from '../shared/UsersContext';

export default function GoalsAndTasksDashboard({ customer }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [showGanttView, setShowGanttView] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [activeStatFilter, setActiveStatFilter] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // טעינת יעדים ומשימות מ-CustomerGoal
  const { data: allGoals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['customerGoals', customer?.email],
    queryFn: () => base44.entities.CustomerGoal.filter({
      customer_email: customer.email,
      is_active: true
    }, 'order_index'),
    enabled: !!customer?.email,
    staleTime: 5 * 60 * 1000, // 5 דקות cache - הארכה
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // זיהוי יעדים - פריט הוא יעד אם:
  // 1. יש לו task_type === 'goal' או
  // 2. יש לו תת-משימות (פריטים אחרים עם parent_id שלו)
  const identifyGoals = useMemo(() => {
    const goalsWithSubtasks = allGoals.filter((g) =>
    allGoals.some((t) => t.parent_id === g.id)
    );
    const explicitGoals = allGoals.filter((g) => g.task_type === 'goal');
    const parentGoalIds = new Set([...goalsWithSubtasks.map((g) => g.id), ...explicitGoals.map((g) => g.id)]);
    return { parentGoalIds, parentGoals: allGoals.filter((g) => parentGoalIds.has(g.id)) };
  }, [allGoals]);

  // חישוב סטטיסטיקות
  const stats = useMemo(() => {
    const { parentGoals, parentGoalIds } = identifyGoals;
    const allTasks = allGoals.filter((g) => !parentGoalIds.has(g.id));
    const tasks = allTasks.filter((g) => g.parent_id); // sub-tasks
    const tasksNotLinkedToGoal = allTasks.filter((g) => !g.parent_id); // standalone tasks

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

    return {
      totalGoals: parentGoals.length,
      openGoals: parentGoals.filter((g) => g.status === 'open' || g.status === 'in_progress').length,
      completedGoals: parentGoals.filter((g) => g.status === 'done').length,
      delayedGoals: parentGoals.filter((g) => g.status === 'delayed').length,

      totalTasks: allTasks.length,
      openTasks: allTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length,
      completedTasks: allTasks.filter((t) => t.status === 'done').length,
      delayedTasks: allTasks.filter((t) => t.status === 'delayed').length,

      tasksToday: allTasks.filter((t) => {
        if (!t.end_date) return false;
        const endDate = new Date(t.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate.getTime() === today.getTime() && t.status !== 'done' && t.status !== 'cancelled';
      }).length,

      tasksThisWeek: allTasks.filter((t) => {
        if (!t.end_date) return false;
        const endDate = new Date(t.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today && endDate <= thisWeekEnd && t.status !== 'done' && t.status !== 'cancelled';
      }).length,

      linkedToGoals: allTasks.filter((t) => t.parent_id).length,
      notLinkedToGoals: allTasks.filter((t) => !t.parent_id).length
    };
  }, [allGoals, identifyGoals]);

  // סינון משימות לפי הקטגוריה שנבחרה
  const filteredTasks = useMemo(() => {
    const { parentGoalIds } = identifyGoals;
    const allTasks = allGoals.filter((g) => !parentGoalIds.has(g.id));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

    switch (activeStatFilter) {
      case 'today':
        return allTasks.filter((t) => {
          if (!t.end_date) return false;
          const endDate = new Date(t.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate.getTime() === today.getTime() && t.status !== 'done' && t.status !== 'cancelled';
        });
      case 'week':
        return allTasks.filter((t) => {
          if (!t.end_date) return false;
          const endDate = new Date(t.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate >= today && endDate <= thisWeekEnd && t.status !== 'done' && t.status !== 'cancelled';
        });
      case 'delayed':
        return allTasks.filter((t) => t.status === 'delayed');
      case 'open':
        return allTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
      case 'linked':
        return allTasks.filter((t) => t.parent_id);
      case 'notLinked':
        return allTasks.filter((t) => !t.parent_id);
      default:
        return allTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
    }
  }, [allGoals, activeStatFilter, identifyGoals]);

  // חישוב יעדים פתוחים - צריך להיות לפני כל return מותנה
  const openParentGoals = useMemo(() => {
    const { parentGoals } = identifyGoals;
    return parentGoals.filter((g) => g.status !== 'done' && g.status !== 'cancelled');
  }, [identifyGoals]);

  const getStatusDisplay = (status) => {
    const statusConfig = {
      open: { label: 'פתוח', icon: Circle, color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
      in_progress: { label: 'בביצוע', icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
      done: { label: 'הושלם', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/20' },
      delayed: { label: 'באיחור', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/20' },
      cancelled: { label: 'בוטל', icon: Circle, color: 'text-gray-500', bgColor: 'bg-gray-500/20' }
    };
    return statusConfig[status] || statusConfig.open;
  };

  const handleMarkAsDone = async (taskId) => {
    try {
      await base44.entities.CustomerGoal.update(taskId, { status: 'done' });

      // רענון מיידי
      queryClient.invalidateQueries(['customerGoals', customer.email]);

      // סנכרון לפיירברי ברקע - לא חוסם (לא ממתינים)
      syncTaskToFireberry({ taskId }).catch(error => {
        console.error('Failed to sync to Fireberry:', error);
      });
    } catch (error) {
      console.error('Error marking task as done:', error);
    }
  };

  const handleDeleteTask = async (taskId, taskName) => {
    // בדיקה אם יש תת-משימות ליעד הזה
    const subtasks = allGoals.filter((t) => t.parent_id === taskId);
    
    if (subtasks.length > 0) {
      const confirmMessage = `ליעד "${taskName}" יש ${subtasks.length} תת-משימות.\n\nמה תרצה לעשות?\n\nלחץ "אישור" למחוק את היעד וכל התת-משימות\nלחץ "ביטול" להסיר את השיוך של התת-משימות (הן יישארו כמשימות עצמאיות)`;
      
      const deleteSubtasks = confirm(confirmMessage);
      
      try {
        if (deleteSubtasks) {
          // מחק את כל התת-משימות ואז את היעד
          for (const subtask of subtasks) {
            await base44.entities.CustomerGoal.delete(subtask.id);
          }
          await base44.entities.CustomerGoal.delete(taskId);
          alert('היעד וכל התת-משימות נמחקו בהצלחה');
        } else {
          // הסר את השיוך של התת-משימות ואז מחק את היעד
          for (const subtask of subtasks) {
            await base44.entities.CustomerGoal.update(subtask.id, { parent_id: null });
          }
          await base44.entities.CustomerGoal.delete(taskId);
          alert('היעד נמחק והתת-משימות הפכו לעצמאיות');
        }
        await queryClient.invalidateQueries(['customerGoals', customer.email]);
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('שגיאה במחיקת היעד: ' + error.message);
      }
    } else {
      // אין תת-משימות - מחיקה רגילה
      if (!confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${taskName}"?\nפעולה זו אינה ניתנת לביטול.`)) {
        return;
      }

      try {
        await base44.entities.CustomerGoal.delete(taskId);
        await queryClient.invalidateQueries(['customerGoals', customer.email]);
        alert('המשימה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('שגיאה במחיקת המשימה: ' + error.message);
      }
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleExportPDF = () => {
    try {
      const htmlContent = generateGoalsHTML(allGoals, customer);
      openPrintWindow(htmlContent, `יעדים_${customer.business_name || customer.email}`);
    } catch (error) {
      console.error('Error exporting goals PDF:', error);
      alert('שגיאה בייצוא PDF');
    }
  };

  if (showGanttView) {
    return (
      <div dir="rtl">
        <div className="mb-4">
          <Button
            onClick={() => setShowGanttView(false)}
            variant="outline"
            className="border-horizon text-horizon-accent">

            חזור לדשבורד יעדים ומשימות
          </Button>
        </div>
        <CustomerGoalsGantt customer={customer} />
      </div>);

  }

  if (isLoadingGoals) {
    return (
      <div className="flex items-center justify-center p-8 text-horizon-accent">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        טוען יעדים ומשימות...
      </div>);

  }

  const { parentGoals, parentGoalIds } = identifyGoals;

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* כותרת וכפתורי פעולה */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-horizon-text flex items-center gap-3">
          <Target className="text-horizon-primary" />
          יעדים ומשימות
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="border-green-500 text-green-400 hover:bg-green-500/10">

            <Download className="w-4 h-4 ml-2" />
            ייצא PDF
          </Button>
          <Button
            onClick={() => setShowGanttView(true)}
            variant="outline"
            className="border-horizon-primary text-horizon-primary">

            <LayoutGrid className="w-4 h-4 ml-2" />
            גאנט יעדים מלא
          </Button>
          <Button onClick={() => setShowCreateGoalModal(true)} className="btn-horizon-primary">
            <Plus className="w-4 h-4 ml-2" />
            הוסף יעד חדש
          </Button>
          <Button onClick={() => setShowCreateTaskModal(true)} className="bg-horizon-secondary hover:bg-horizon-secondary/90 text-white">
            <Plus className="w-4 h-4 ml-2" />
            הוסף משימה חדשה
          </Button>
        </div>
      </div>

      {/* קוביות סטטיסטיקה */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card
          className={`card-horizon cursor-pointer transition-all ${activeStatFilter === 'today' ? 'ring-2 ring-horizon-primary' : ''}`}
          onClick={() => setActiveStatFilter(activeStatFilter === 'today' ? null : 'today')}>

          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">משימות להיום</p>
                <p className="text-2xl font-bold text-horizon-primary">{stats.tasksToday}</p>
              </div>
              <Calendar className="w-8 h-8 text-horizon-primary" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`card-horizon cursor-pointer transition-all ${activeStatFilter === 'delayed' ? 'ring-2 ring-horizon-primary' : ''}`}
          onClick={() => setActiveStatFilter(activeStatFilter === 'delayed' ? null : 'delayed')}>

          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">משימות באיחור</p>
                <p className="text-2xl font-bold text-red-400">{stats.delayedTasks}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">יעדים באיחור</p>
                <p className="text-2xl font-bold text-green-400">{stats.openGoals}</p>
              </div>
              <Target className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* סטטיסטיקות יעדים */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">סה"כ יעדים</p>
                <p className="text-2xl font-bold text-horizon-text">{stats.totalGoals}</p>
              </div>
              <Target className="w-8 h-8 text-horizon-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">יעדים פתוחים</p>
                <p className="text-2xl font-bold text-blue-400">{stats.openGoals}</p>
              </div>
              <Circle className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">יעדים שהושלמו</p>
                <p className="text-2xl font-bold text-green-400">{stats.completedGoals}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">יעדים באיחור</p>
                <p className="text-2xl font-bold text-red-400">{stats.delayedGoals}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* רשימת משימות מסוננת */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-horizon-primary" />
            {activeStatFilter === 'today' && 'משימות להיום'}
            {activeStatFilter === 'week' && 'משימות השבוע'}
            {activeStatFilter === 'delayed' && 'משימות באיחור'}
            {activeStatFilter === 'open' && 'כל המשימות הפתוחות'}
            {activeStatFilter === 'linked' && 'משימות משויכות ליעדים'}
            {activeStatFilter === 'notLinked' && 'משימות שאינן משויכות ליעדים'}
            {!activeStatFilter && 'כל המשימות הפתוחות'}
            <Badge className="bg-horizon-primary/20 text-horizon-primary mr-2">{filteredTasks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ?
          <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="text-horizon-accent">אין משימות בקטגוריה זו - מצוין!</p>
            </div> :

          <div className="space-y-3">
              {filteredTasks.map((task) => {
              const statusDisplay = getStatusDisplay(task.status);
              const StatusIcon = statusDisplay.icon;
              const parentGoal = task.parent_id ? allGoals.find((g) => g.id === task.parent_id) : null;

              return (
                <div
                  key={task.id}
                  className="bg-horizon-card/50 p-4 rounded-lg border border-horizon hover:border-horizon-primary/50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    if (e.target.closest('button')) return;
                    handleEditTask(task);
                  }}>

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-horizon-text mb-1">{task.name}</h4>
                        {task.notes &&
                      <p className="text-sm text-horizon-accent mb-2">{task.notes}</p>
                      }
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusDisplay.bgColor}>
                            <StatusIcon className={`w-3 h-3 ml-1 ${statusDisplay.color}`} />
                            <span className={statusDisplay.color}>{statusDisplay.label}</span>
                          </Badge>
                          {task.end_date &&
                        <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                              <Calendar className="w-3 h-3 ml-1" />
                              {format(new Date(task.end_date), 'dd/MM/yyyy', { locale: he })}
                            </Badge>
                        }
                          {parentGoal &&
                        <Badge className="bg-purple-500/20 text-purple-400">
                              <LinkIcon className="w-3 h-3 ml-1" />
                              {parentGoal.name}
                            </Badge>
                        }
                          {task.assignee_email &&
                        <Badge variant="outline" className="border-horizon text-horizon-accent">
                              {task.assignee_email}
                            </Badge>
                        }
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {task.status !== 'done' &&
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsDone(task.id);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white">

                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        }
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id, task.name);
                          }}
                          className="text-red-500 hover:bg-red-500/10">

                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>);

            })}
            </div>
          }
        </CardContent>
      </Card>

      {/* רשימת יעדים */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
            <Target className="w-5 h-5 text-horizon-primary" />
            יעדים מרכזיים
            <Badge className="bg-horizon-primary/20 text-horizon-primary mr-2">{stats.totalGoals}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openParentGoals.length === 0 ?
          <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-horizon-accent">אין יעדים פתוחים להצגה.</p>
            </div> :

          <div className="space-y-3">
              {openParentGoals.map((goal) => {
              const statusDisplay = getStatusDisplay(goal.status);
              const StatusIcon = statusDisplay.icon;
              const subtasks = allGoals.filter((t) => t.parent_id === goal.id);
              const completedSubtasks = subtasks.filter((t) => t.status === 'done').length;
              const progress = subtasks.length > 0 ? completedSubtasks / subtasks.length * 100 : goal.status === 'done' ? 100 : 0;

              return (
                <div key={goal.id} className="bg-horizon-card/50 p-4 rounded-lg border border-horizon hover:border-horizon-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 cursor-pointer" onClick={() => handleEditTask(goal)}>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-horizon-text">{goal.name}</h4>
                          {subtasks.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedGoals(prev => ({ ...prev, [goal.id]: !prev[goal.id] }));
                              }}
                              className="h-6 text-horizon-accent hover:text-horizon-primary"
                            >
                              {expandedGoals[goal.id] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-horizon-accent mb-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 ${statusDisplay.color}`} />
                            <span>{statusDisplay.label}</span>
                          </div>
                          {(goal.start_date || goal.end_date) &&
                        <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {goal.start_date ? format(new Date(goal.start_date), 'dd/MM/yy', { locale: he }) : '?'} - {goal.end_date ? format(new Date(goal.end_date), 'dd/MM/yy', { locale: he }) : '?'}
                              </span>
                            </div>
                        }
                          <div className="flex items-center gap-2">
                            <ListTodo className="w-4 h-4" />
                            <span>{subtasks.length} משימות</span>
                          </div>
                        </div>
                        {subtasks.length > 0 && (
                          <div>
                            <div className="w-full bg-horizon-card rounded-full h-2.5">
                              <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                            </div>
                            <p className="text-xs text-horizon-accent mt-1">{Math.round(progress)}% הושלם ({completedSubtasks}/{subtasks.length})</p>
                          </div>
                        )}
                        
                        {/* תת-משימות - סגורות בברירת מחדל */}
                        {expandedGoals[goal.id] && subtasks.length > 0 && (
                          <div className="mt-4 pr-6 space-y-2 border-r-2 border-horizon-primary/30">
                            {subtasks.map((subtask) => {
                              const subtaskStatusDisplay = getStatusDisplay(subtask.status);
                              const SubtaskIcon = subtaskStatusDisplay.icon;
                              return (
                                <div
                                  key={subtask.id}
                                  className="bg-horizon-card/30 p-3 rounded-lg border border-horizon/50 hover:border-horizon-primary/30 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    if (e.target.closest('button')) return;
                                    handleEditTask(subtask);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <SubtaskIcon className={`w-4 h-4 ${subtaskStatusDisplay.color}`} />
                                      <span className="text-sm text-horizon-text">{subtask.name}</span>
                                    </div>
                                    {subtask.end_date && (
                                      <span className="text-xs text-horizon-accent">
                                        {format(new Date(subtask.end_date), 'dd/MM', { locale: he })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(goal);
                        }}
                        className="text-horizon-primary">

                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(goal.id, goal.name);
                          }}
                          className="text-red-500 hover:bg-red-500/10">

                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>);

            })}
            </div>
          }
        </CardContent>
      </Card>

      {/* מודל יצירת משימה */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        customer={customer}
        currentUser={currentUser}
        allGoals={parentGoals}
        onSuccess={() => {
          queryClient.invalidateQueries(['customerGoals', customer.email]);
          setShowCreateTaskModal(false);
        }} />


      {/* מודל יצירת יעד */}
      <CreateGoalModal
        isOpen={showCreateGoalModal}
        onClose={() => setShowCreateGoalModal(false)}
        customer={customer}
        currentUser={currentUser}
        existingGoalsCount={parentGoals.length}
        onSuccess={() => {
          queryClient.invalidateQueries(['customerGoals', customer.email]);
          setShowCreateGoalModal(false);
        }} />

      
      {/* מודל עריכת משימה */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={editingTask}
        currentUser={currentUser}
        allGoals={parentGoals}
        onSuccess={() => {
          queryClient.invalidateQueries(['customerGoals', customer.email]);
          setIsEditModalOpen(false);
          setEditingTask(null);
        }} />

    </div>);

}

// מודל יצירת משימה חדשה
function CreateTaskModal({ isOpen, onClose, customer, currentUser, allGoals, onSuccess }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('09:00');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [parentGoalId, setParentGoalId] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [status, setStatus] = useState('open');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // שימוש ב-Context במקום query מקומי
  const { allUsers = [] } = useUsers();

  // סינון משתמשים לפי הלוגיקה: משתמשים רגילים + מנהלי כספים המשויכים ללקוח
  const relevantUsers = useMemo(() => {
    if (!customer || !allUsers || allUsers.length === 0) return [];

    const assignedPrimary = customer.assigned_financial_manager_email;
    const assignedAdditional = customer.additional_assigned_financial_manager_emails || [];

    // אם אין מנהלי כספים משויכים - להציג רק משתמשים רגילים
    if (!assignedPrimary && assignedAdditional.length === 0) {
      return allUsers.filter((u) => u.user_type !== 'financial_manager');
    }

    // משתמשים רגילים + מנהלי כספים משויכים בלבד
    return allUsers.filter((u) => {
      // אם זה לא מנהל כספים - להציג
      if (u.user_type !== 'financial_manager') return true;

      // אם זה מנהל כספים - להציג רק אם הוא משויך ללקוח
      return u.email === assignedPrimary || assignedAdditional.includes(u.email);
    });
  }, [allUsers, customer]);

  useEffect(() => {
    if (currentUser && !assigneeEmail) {
      setAssigneeEmail(currentUser.email);
    }
  }, [currentUser, assigneeEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('יש להזין שם למשימה');
      return;
    }
    if (!startDate) {
      alert('יש להזין תאריך התחלה');
      return;
    }
    if (!endDate) {
      alert('יש להזין תאריך סיום');
      return;
    }

    setIsSubmitting(true);
    try {
      // שילוב תאריך ושעה ל-end_date_time
      const endDateTime = endDate && endTime ? `${endDate}T${endTime}:00` : null;
      // שילוב תאריך ושעה ל-reminder_date
      const reminderDateTime = reminderDate && reminderTime ? `${reminderDate}T${reminderTime}:00` : null;

      const newTask = await base44.entities.CustomerGoal.create({
        customer_email: customer.email,
        name: name.trim(),
        notes,
        start_date: startDate,
        end_date: endDate,
        end_date_time: endDateTime,
        reminder_date: reminderDateTime,
        parent_id: parentGoalId && parentGoalId !== 'no_goal' ? parentGoalId : null,
        status,
        assignee_email: assigneeEmail || currentUser?.email,
        tagged_users: taggedUsers,
        task_type: 'one_time',
        is_active: true,
        order_index: 0
      });

      // שליחת נוטיפיקציות ומיילים ברקע - לא חוסם
      Promise.all(taggedUsers.map(async (taggedEmail) => {
        try {
          await base44.entities.Notification.create({
            recipient_email: taggedEmail,
            sender_email: currentUser?.email,
            type: 'tagged_in_task',
            title: `תויגת במשימה: ${name.trim()}`,
            message: `${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך במשימה "${name.trim()}"`,
            related_entity_id: newTask.id,
            related_entity_type: 'CustomerGoal',
            priority: 'high'
          });

          await base44.integrations.Core.SendEmail({
            to: taggedEmail,
            subject: `תויגת במשימה חדשה - ${name.trim()}`,
            body: `שלום,\n\n${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך במשימה חדשה:\n\nשם המשימה: ${name.trim()}\nתאריך יעד: ${endDate}\n\n${notes ? `פרטים: ${notes}\n\n` : ''}היכנס למערכת לצפייה ועדכון.`
          });
        } catch (error) {
          console.error('Error sending notification/email to tagged user:', error);
        }
      })).catch(console.error);

      // סנכרון לפיירברי ברקע - לא חוסם
      syncTaskToFireberry({ taskId: newTask.id }).catch(error => {
        console.error('Failed to sync new task to Fireberry:', error);
      });

      // Reset form
      setName('');
      setNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
      setEndTime('09:00');
      setReminderDate('');
      setReminderTime('09:00');
      setParentGoalId('');
      setStatus('open');
      setAssigneeEmail(currentUser?.email || '');
      setTaggedUsers([]);

      onSuccess();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('שגיאה ביצירת המשימה');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-primary flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            הוסף משימה חדשה
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label className="text-right block mb-2 text-horizon-text">שם המשימה *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="הזן שם למשימה..."
              className="bg-horizon-card border-horizon text-horizon-text"
              required />

          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">תיאור / הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים..."
              className="bg-horizon-card border-horizon text-horizon-text h-20" />

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך התחלה *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required />

            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך סיום *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required />

            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שעת יעד</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-horizon-card border-horizon text-horizon-text" />

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך תזכורת</Label>
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text" />

            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">שעת תזכורת</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text" />

            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שיוך ליעד (אופציונלי)</Label>
            <Select value={parentGoalId || 'no_goal'} onValueChange={setParentGoalId}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר יעד לשיוך..." />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="no_goal">ללא שיוך ליעד</SelectItem>
                {allGoals.map((goal) =>
                <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-horizon-accent mt-1">אם יש יעד קיים, אפשר לשייך את המשימה אליו</p>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">אחראי</Label>
            <Select value={assigneeEmail} onValueChange={setAssigneeEmail}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר אחראי" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                {relevantUsers.map((u) =>
                <SelectItem key={u.id} value={u.email}>
                    {u.full_name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">סטטוס</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="open">פתוח</SelectItem>
                <SelectItem value="in_progress">בביצוע</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-horizon-primary" />
              תיוג משתמשים (יקבלו נוטיפיקציה ומייל)
            </Label>
            <div className="space-y-2">
              <Select
                value=""
                onValueChange={(email) => {
                  if (email && !taggedUsers.includes(email)) {
                    setTaggedUsers([...taggedUsers, email]);
                  }
                }}>

                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="בחר משתמש לתיוג..." />
                </SelectTrigger>
                <SelectContent className="bg-horizon-dark border-horizon">
                  {relevantUsers.
                  filter((u) => !taggedUsers.includes(u.email)).
                  map((u) =>
                  <SelectItem key={u.id} value={u.email}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                  )
                  }
                </SelectContent>
              </Select>
              {taggedUsers.length > 0 &&
              <div className="flex flex-wrap gap-2">
                  {taggedUsers.map((email) => {
                  const user = relevantUsers.find((u) => u.email === email);
                  return (
                    <Badge key={email} className="bg-horizon-primary/20 text-horizon-primary flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user?.full_name || email}
                        <button
                        onClick={() => setTaggedUsers(taggedUsers.filter((e) => e !== email))}
                        className="mr-1 hover:bg-red-500/20 rounded-full p-0.5">

                          <X className="w-3 h-3" />
                        </button>
                      </Badge>);

                })}
                </div>
              }
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting} className="btn-horizon-primary">
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              צור משימה
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);

}

// מודל עריכת משימה
function EditTaskModal({ isOpen, onClose, task, currentUser, allGoals, onSuccess }) {
  const [editedTask, setEditedTask] = useState(null);
  const [endTime, setEndTime] = useState('09:00');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // שימוש ב-Context במקום query מקומי
  const { allUsers = [] } = useUsers();

  // קבלת נתוני הלקוח לצורך סינון
  const { data: customerData } = useQuery({
    queryKey: ['customerForEdit', task?.customer_email],
    queryFn: async () => {
      if (!task?.customer_email) return null;
      const customers = await base44.entities.OnboardingRequest.filter({ email: task.customer_email });
      return customers[0] || null;
    },
    enabled: isOpen && !!task?.customer_email
  });

  // סינון משתמשים
  const relevantUsers = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];

    // אם אין נתוני לקוח עדיין, להציג את כל המשתמשים
    if (!customerData) return allUsers;

    const assignedPrimary = customerData.assigned_financial_manager_email;
    const assignedAdditional = customerData.additional_assigned_financial_manager_emails || [];

    if (!assignedPrimary && assignedAdditional.length === 0) {
      return allUsers.filter((u) => u.user_type !== 'financial_manager');
    }

    return allUsers.filter((u) => {
      if (u.user_type !== 'financial_manager') return true;
      return u.email === assignedPrimary || assignedAdditional.includes(u.email);
    });
  }, [allUsers, customerData]);

  useEffect(() => {
    if (task) {
      // חילוץ שעה מ-end_date_time אם קיים
      let time = '09:00';
      if (task.end_date_time) {
        try {
          const dateTime = new Date(task.end_date_time);
          time = format(dateTime, 'HH:mm');
        } catch (e) {
          console.error('Error parsing end_date_time:', e);
        }
      }

      // חילוץ תאריך ושעה מ-reminder_date אם קיים
      let reminderDateStr = '';
      let reminderTimeStr = '09:00';
      if (task.reminder_date) {
        try {
          const reminderDateTime = new Date(task.reminder_date);
          reminderDateStr = format(reminderDateTime, 'yyyy-MM-dd');
          reminderTimeStr = format(reminderDateTime, 'HH:mm');
        } catch (e) {
          console.error('Error parsing reminder_date:', e);
        }
      }

      setEditedTask({
        ...task,
        start_date: task.start_date ? format(new Date(task.start_date), 'yyyy-MM-dd') : '',
        end_date: task.end_date ? format(new Date(task.end_date), 'yyyy-MM-dd') : '',
        reminder_date_only: reminderDateStr
      });
      setEndTime(time);
      setReminderTime(reminderTimeStr);
      setTaggedUsers(task.tagged_users || []);
    }
  }, [task]);

  const handleFieldChange = (field, value) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editedTask || !editedTask.name.trim()) {
      alert('יש להזין שם למשימה');
      return;
    }
    if (!editedTask.start_date || !editedTask.end_date) {
      alert('יש להזין תאריכי התחלה וסיום');
      return;
    }

    setIsSubmitting(true);
    try {
      const { id, reminder_date_only, ...dataToUpdate } = editedTask;
      if (dataToUpdate.parent_id === 'no_goal') {
        dataToUpdate.parent_id = null;
      }

      // שילוב תאריך ושעה ל-end_date_time
      if (dataToUpdate.end_date && endTime) {
        dataToUpdate.end_date_time = `${dataToUpdate.end_date}T${endTime}:00`;
      }

      // שילוב תאריך ושעה ל-reminder_date
      if (reminder_date_only && reminderTime) {
        dataToUpdate.reminder_date = `${reminder_date_only}T${reminderTime}:00`;
      } else if (!reminder_date_only) {
        dataToUpdate.reminder_date = null;
      }

      dataToUpdate.tagged_users = taggedUsers;

      const oldTaggedUsers = task.tagged_users || [];
      const newlyTagged = taggedUsers.filter((email) => !oldTaggedUsers.includes(email));

      await base44.entities.CustomerGoal.update(id, dataToUpdate);

      // עדכון מיידי ב-UI
      onSuccess();

      // שליחת נוטיפיקציות ומיילים ברקע - לא חוסם
      Promise.all(newlyTagged.map(async (taggedEmail) => {
        try {
          await base44.entities.Notification.create({
            recipient_email: taggedEmail,
            sender_email: currentUser?.email,
            type: 'tagged_in_task',
            title: `תויגת במשימה: ${dataToUpdate.name}`,
            message: `${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך במשימה "${dataToUpdate.name}"`,
            related_entity_id: id,
            related_entity_type: 'CustomerGoal',
            priority: 'high'
          });

          await base44.integrations.Core.SendEmail({
            to: taggedEmail,
            subject: `תויגת במשימה - ${dataToUpdate.name}`,
            body: `שלום,\n\n${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך במשימה:\n\nשם המשימה: ${dataToUpdate.name}\nתאריך יעד: ${dataToUpdate.end_date}\n\n${dataToUpdate.notes ? `פרטים: ${dataToUpdate.notes}\n\n` : ''}היכנס למערכת לצפייה ועדכון.`
          });
        } catch (error) {
          console.error('Error sending notification/email to tagged user:', error);
        }
      })).catch(console.error);

      // סנכרון לפיירברי ברקע - לא חוסם
      syncTaskToFireberry({ taskId: id }).catch(error => {
        console.error('Failed to sync to Fireberry:', error);
      });
    } catch (error) {
      console.error('Error updating task:', error);
      alert('שגיאה בעדכון המשימה');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !editedTask) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-primary flex items-center gap-2">
            <Edit className="w-5 h-5" />
            עריכת משימה
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label className="text-right block mb-2 text-horizon-text">שם המשימה *</Label>
            <Input
              value={editedTask.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="הזן שם למשימה..."
              className="bg-horizon-card border-horizon text-horizon-text"
              required />

          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">תיאור / הערות</Label>
            <Textarea
              value={editedTask.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="פרטים נוספים..."
              className="bg-horizon-card border-horizon text-horizon-text h-20" />

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך התחלה *</Label>
              <Input
                type="date"
                value={editedTask.start_date}
                onChange={(e) => handleFieldChange('start_date', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required />

            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך סיום *</Label>
              <Input
                type="date"
                value={editedTask.end_date}
                onChange={(e) => handleFieldChange('end_date', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required />

            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שעת יעד</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-horizon-card border-horizon text-horizon-text" />

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך תזכורת</Label>
              <Input
                type="date"
                value={editedTask.reminder_date_only || ''}
                onChange={(e) => handleFieldChange('reminder_date_only', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text" />

            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">שעת תזכורת</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text" />

            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שיוך ליעד (אופציונלי)</Label>
            <Select value={editedTask.parent_id || 'no_goal'} onValueChange={(value) => handleFieldChange('parent_id', value)}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר יעד לשיוך..." />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="no_goal">ללא שיוך ליעד</SelectItem>
                {allGoals.map((goal) =>
                <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">אחראי</Label>
            <Select value={editedTask.assignee_email || ''} onValueChange={(value) => handleFieldChange('assignee_email', value)}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר אחראי" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                {relevantUsers.map((u) =>
                <SelectItem key={u.id} value={u.email}>
                    {u.full_name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">סטטוס</Label>
            <Select value={editedTask.status} onValueChange={(value) => handleFieldChange('status', value)}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="open">פתוח</SelectItem>
                <SelectItem value="in_progress">בביצוע</SelectItem>
                <SelectItem value="done">הושלם</SelectItem>
                <SelectItem value="delayed">באיחור</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-horizon-primary" />
              תיוג משתמשים (יקבלו נוטיפיקציה ומייל)
            </Label>
            <div className="space-y-2">
              <Select
                value=""
                onValueChange={(email) => {
                  if (email && !taggedUsers.includes(email)) {
                    setTaggedUsers([...taggedUsers, email]);
                  }
                }}>

                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="בחר משתמש לתיוג..." />
                </SelectTrigger>
                <SelectContent className="bg-horizon-dark border-horizon">
                  {relevantUsers.
                  filter((u) => !taggedUsers.includes(u.email)).
                  map((u) =>
                  <SelectItem key={u.id} value={u.email}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                  )
                  }
                </SelectContent>
              </Select>
              {taggedUsers.length > 0 &&
              <div className="flex flex-wrap gap-2">
                  {taggedUsers.map((email) => {
                  const user = relevantUsers.find((u) => u.email === email);
                  return (
                    <Badge key={email} className="bg-horizon-primary/20 text-horizon-primary flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user?.full_name || email}
                        <button
                        onClick={() => setTaggedUsers(taggedUsers.filter((e) => e !== email))}
                        className="mr-1 hover:bg-red-500/20 rounded-full p-0.5">

                          <X className="w-3 h-3" />
                        </button>
                      </Badge>);

                })}
                </div>
              }
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting} className="btn-horizon-primary">
              {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              שמור שינויים
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);

}

// מודל יצירת יעד חדש
function CreateGoalModal({ isOpen, onClose, customer, currentUser, existingGoalsCount, onSuccess }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('17:00');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [responsibleUsers, setResponsibleUsers] = useState([]);
  const [externalResponsible, setExternalResponsible] = useState('');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // שימוש ב-Context במקום query מקומי
  const { allUsers = [] } = useUsers();

  // סינון משתמשים
  const relevantUsers = useMemo(() => {
    if (!customer || !allUsers || allUsers.length === 0) return [];

    const assignedPrimary = customer.assigned_financial_manager_email;
    const assignedAdditional = customer.additional_assigned_financial_manager_emails || [];

    if (!assignedPrimary && assignedAdditional.length === 0) {
      return allUsers.filter((u) => u.user_type !== 'financial_manager');
    }

    return allUsers.filter((u) => {
      if (u.user_type !== 'financial_manager') return true;
      return u.email === assignedPrimary || assignedAdditional.includes(u.email);
    });
  }, [allUsers, customer]);

  useEffect(() => {
    if (currentUser && !assigneeEmail) {
      setAssigneeEmail(currentUser.email);
    }
  }, [currentUser, assigneeEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('יש להזין שם ליעד');
      return;
    }

    setIsSubmitting(true);
    try {
      // שילוב תאריך ושעה ל-end_date_time
      const endDateTime = endDate && endTime ? `${endDate}T${endTime}:00` : null;
      // שילוב תאריך ושעה ל-reminder_date
      const reminderDateTime = reminderDate && reminderTime ? `${reminderDate}T${reminderTime}:00` : null;

      const newGoal = await base44.entities.CustomerGoal.create({
        customer_email: customer.email,
        name: name.trim(),
        notes,
        start_date: startDate || null,
        end_date: endDate || null,
        end_date_time: endDateTime,
        reminder_date: reminderDateTime,
        status: 'open',
        assignee_email: assigneeEmail || currentUser?.email,
        responsible_users: responsibleUsers,
        external_responsible: externalResponsible.trim() || null,
        tagged_users: taggedUsers,
        is_active: true,
        order_index: existingGoalsCount,
        task_type: 'goal'
      });

      // עדכון מיידי
      onSuccess();

      // שליחת נוטיפיקציות למנהל הכספים המשויך ללקוח - ברקע
      if (customer.assigned_financial_manager_email && customer.assigned_financial_manager_email !== currentUser?.email) {
        Promise.resolve().then(async () => {
          try {
            await base44.entities.Notification.create({
              recipient_email: customer.assigned_financial_manager_email,
              sender_email: currentUser?.email,
              type: 'new_goal_created',
              title: `יעד חדש נוצר: ${name.trim()}`,
              message: `${currentUser?.full_name || currentUser?.email} יצר/יצרה יעד חדש "${name.trim()}" עבור הלקוח ${customer.business_name || customer.full_name}`,
              related_entity_id: newGoal.id,
              related_entity_type: 'CustomerGoal',
              priority: 'high'
            });

            await base44.integrations.Core.SendEmail({
              to: customer.assigned_financial_manager_email,
              subject: `יעד חדש נוצר - ${name.trim()}`,
              body: `שלום,\n\n${currentUser?.full_name || currentUser?.email} יצר/יצרה יעד חדש:\n\nשם היעד: ${name.trim()}\nלקוח: ${customer.business_name || customer.full_name}\nתאריך יעד: ${endDate || 'לא הוגדר'}\n\n${notes ? `פרטים: ${notes}\n\n` : ''}היכנס למערכת לצפייה ועדכון.`
            });
          } catch (error) {
            console.error('Error sending notification to financial manager:', error);
          }
        }).catch(console.error);
      }

      // שליחת התראה לאחראי היעד (אם שונה מהמשתמש הנוכחי ומנהל הכספים)
      if (assigneeEmail && assigneeEmail !== currentUser?.email && assigneeEmail !== customer.assigned_financial_manager_email) {
        Promise.resolve().then(async () => {
          try {
            await base44.entities.Notification.create({
              recipient_email: assigneeEmail,
              sender_email: currentUser?.email,
              type: 'assigned_to_goal',
              title: `שויכת ליעד: ${name.trim()}`,
              message: `${currentUser?.full_name || currentUser?.email} שייך/שייכה אותך כאחראי/ת על היעד "${name.trim()}"`,
              related_entity_id: newGoal.id,
              related_entity_type: 'CustomerGoal',
              priority: 'high'
            });

            await base44.integrations.Core.SendEmail({
              to: assigneeEmail,
              subject: `שויכת ליעד חדש - ${name.trim()}`,
              body: `שלום,\n\n${currentUser?.full_name || currentUser?.email} שייך/שייכה אותך כאחראי/ת על היעד:\n\nשם היעד: ${name.trim()}\nלקוח: ${customer.business_name || customer.full_name}\nתאריך יעד: ${endDate || 'לא הוגדר'}\n\n${notes ? `פרטים: ${notes}\n\n` : ''}היכנס למערכת לצפייה ועדכון.`
            });
          } catch (error) {
            console.error('Error sending notification to assignee:', error);
          }
        }).catch(console.error);
      }

      // שליחת נוטיפיקציות ומיילים ברקע - לא חוסם
      Promise.all(taggedUsers.map(async (taggedEmail) => {
        try {
          await base44.entities.Notification.create({
            recipient_email: taggedEmail,
            sender_email: currentUser?.email,
            type: 'tagged_in_goal',
            title: `תויגת ביעד: ${name.trim()}`,
            message: `${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך ביעד "${name.trim()}"`,
            related_entity_id: newGoal.id,
            related_entity_type: 'CustomerGoal',
            priority: 'high'
          });

          await base44.integrations.Core.SendEmail({
            to: taggedEmail,
            subject: `תויגת ביעד חדש - ${name.trim()}`,
            body: `שלום,\n\n${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך ביעד חדש:\n\nשם היעד: ${name.trim()}\nתאריך יעד: ${endDate}\n\n${notes ? `פרטים: ${notes}\n\n` : ''}היכנס למערכת לצפייה ועדכון.`
          });
        } catch (error) {
          console.error('Error sending notification/email to tagged user:', error);
        }
      })).catch(console.error);

      // סנכרון לפיירברי ברקע - לא חוסם
      syncTaskToFireberry({ taskId: newGoal.id }).catch(error => {
        console.error('Failed to sync new goal to Fireberry:', error);
      });

      setName('');
      setNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setEndTime('17:00');
      setReminderDate('');
      setReminderTime('09:00');
      setAssigneeEmail(currentUser?.email || '');
      setResponsibleUsers([]);
      setExternalResponsible('');
      setTaggedUsers([]);

      onSuccess();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('שגיאה ביצירת היעד');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-primary flex items-center gap-2">
            <Target className="w-5 h-5" />
            הוסף יעד חדש
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label className="text-right block mb-2 text-horizon-text">שם היעד *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="הזן שם ליעד..."
              className="bg-horizon-card border-horizon text-horizon-text"
              required />

          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">תיאור / הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים על היעד..."
              className="bg-horizon-card border-horizon text-horizon-text h-20" />

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך התחלה</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text" />

            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך יעד</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text" />

            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שעת יעד</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-horizon-card border-horizon text-horizon-text" />

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך תזכורת</Label>
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text" />

            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">שעת תזכורת</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text" />

            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">אחראי ביצוע</Label>
            <Select value={assigneeEmail} onValueChange={setAssigneeEmail}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר אחראי" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                {relevantUsers.map((u) =>
                <SelectItem key={u.id} value={u.email}>
                    {u.full_name} {u.user_type === 'financial_manager' ? '(מנהל)' : ''}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-horizon-primary" />
              אחראים על היעד (מנהלי כספים)
            </Label>
            <div className="space-y-2">
              <Select
                value=""
                onValueChange={(email) => {
                  if (email && !responsibleUsers.includes(email)) {
                    setResponsibleUsers([...responsibleUsers, email]);
                  }
                }}>

                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="הוסף מנהל כספים אחראי..." />
                </SelectTrigger>
                <SelectContent className="bg-horizon-dark border-horizon">
                  {relevantUsers.
                  filter((u) => u.user_type === 'financial_manager' && !responsibleUsers.includes(u.email)).
                  map((u) =>
                  <SelectItem key={u.id} value={u.email}>
                        {u.full_name}
                      </SelectItem>
                  )
                  }
                </SelectContent>
              </Select>
              {responsibleUsers.length > 0 &&
              <div className="flex flex-wrap gap-2">
                  {responsibleUsers.map((email) => {
                  const user = relevantUsers.find((u) => u.email === email);
                  return (
                    <Badge key={email} className="bg-blue-500/20 text-blue-400 flex items-center gap-1">
                        {user?.full_name || email}
                        <button
                        onClick={() => setResponsibleUsers(responsibleUsers.filter((e) => e !== email))}
                        className="mr-1 hover:bg-red-500/20 rounded-full p-0.5">

                          <X className="w-3 h-3" />
                        </button>
                      </Badge>);

                })}
                </div>
              }
            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">אחראים חיצוניים (רו״ח, יועצים וכו׳)</Label>
            <Input
              value={externalResponsible}
              onChange={(e) => setExternalResponsible(e.target.value)}
              placeholder="למשל: רואה חשבון - משה כהן, יועץ עסקי - דני לוי"
              className="bg-horizon-card border-horizon text-horizon-text" />

          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-horizon-primary" />
              תיוג משתמשים (יקבלו נוטיפיקציה ומייל)
            </Label>
            <div className="space-y-2">
              <Select
                value=""
                onValueChange={(email) => {
                  if (email && !taggedUsers.includes(email)) {
                    setTaggedUsers([...taggedUsers, email]);
                  }
                }}>

                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="בחר משתמש לתיוג..." />
                </SelectTrigger>
                <SelectContent className="bg-horizon-dark border-horizon">
                  {relevantUsers.
                  filter((u) => !taggedUsers.includes(u.email)).
                  map((u) =>
                  <SelectItem key={u.id} value={u.email}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                  )
                  }
                </SelectContent>
              </Select>
              {taggedUsers.length > 0 &&
              <div className="flex flex-wrap gap-2">
                  {taggedUsers.map((email) => {
                  const user = relevantUsers.find((u) => u.email === email);
                  return (
                    <Badge key={email} className="bg-horizon-primary/20 text-horizon-primary flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user?.full_name || email}
                        <button
                        onClick={() => setTaggedUsers(taggedUsers.filter((e) => e !== email))}
                        className="mr-1 hover:bg-red-500/20 rounded-full p-0.5">

                          <X className="w-3 h-3" />
                        </button>
                      </Badge>);

                })}
                </div>
              }
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting} className="btn-horizon-primary">
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              צור יעד
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);

}