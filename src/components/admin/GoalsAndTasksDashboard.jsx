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
  Save
} from "lucide-react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import CustomerGoalsGantt from './CustomerGoalsGantt';
import { generateGoalsHTML } from '../shared/generateGoalsHTML';
import { openPrintWindow } from '../shared/printUtils';
import { syncTaskToFireberry } from '@/functions/syncTaskToFireberry';

export default function GoalsAndTasksDashboard({ customer }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [showGanttView, setShowGanttView] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [activeStatFilter, setActiveStatFilter] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
    refetchInterval: 30000 // רענון אוטומטי כל 30 שניות לקבלת עדכונים מפיירברי
  });

  // זיהוי יעדים - פריט הוא יעד אם:
  // 1. יש לו task_type === 'goal' או
  // 2. יש לו תת-משימות (פריטים אחרים עם parent_id שלו)
  const identifyGoals = useMemo(() => {
    const goalsWithSubtasks = allGoals.filter(g => 
      allGoals.some(t => t.parent_id === g.id)
    );
    const explicitGoals = allGoals.filter(g => g.task_type === 'goal');
    const parentGoalIds = new Set([...goalsWithSubtasks.map(g => g.id), ...explicitGoals.map(g => g.id)]);
    return { parentGoalIds, parentGoals: allGoals.filter(g => parentGoalIds.has(g.id)) };
  }, [allGoals]);

  // חישוב סטטיסטיקות
  const stats = useMemo(() => {
    const { parentGoals, parentGoalIds } = identifyGoals;
    const allTasks = allGoals.filter(g => !parentGoalIds.has(g.id));
    const tasks = allTasks.filter(g => g.parent_id); // sub-tasks
    const tasksNotLinkedToGoal = allTasks.filter(g => !g.parent_id); // standalone tasks

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
    
    return {
      totalGoals: parentGoals.length,
      openGoals: parentGoals.filter(g => g.status === 'open' || g.status === 'in_progress').length,
      completedGoals: parentGoals.filter(g => g.status === 'done').length,
      delayedGoals: parentGoals.filter(g => g.status === 'delayed').length,
      
      totalTasks: allTasks.length,
      openTasks: allTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length,
      completedTasks: allTasks.filter(t => t.status === 'done').length,
      delayedTasks: allTasks.filter(t => t.status === 'delayed').length,
      
      tasksToday: allTasks.filter(t => {
        if (!t.end_date) return false;
        const endDate = new Date(t.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate.getTime() === today.getTime() && t.status !== 'done' && t.status !== 'cancelled';
      }).length,
      
      tasksThisWeek: allTasks.filter(t => {
        if (!t.end_date) return false;
        const endDate = new Date(t.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today && endDate <= thisWeekEnd && t.status !== 'done' && t.status !== 'cancelled';
      }).length,

      linkedToGoals: allTasks.filter(t => t.parent_id).length,
      notLinkedToGoals: allTasks.filter(t => !t.parent_id).length
    };
  }, [allGoals, identifyGoals]);

  // סינון משימות לפי הקטגוריה שנבחרה
  const filteredTasks = useMemo(() => {
    const { parentGoalIds } = identifyGoals;
    const allTasks = allGoals.filter(g => !parentGoalIds.has(g.id));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

    switch (activeStatFilter) {
      case 'today':
        return allTasks.filter(t => {
          if (!t.end_date) return false;
          const endDate = new Date(t.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate.getTime() === today.getTime() && t.status !== 'done' && t.status !== 'cancelled';
        });
      case 'week':
        return allTasks.filter(t => {
          if (!t.end_date) return false;
          const endDate = new Date(t.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate >= today && endDate <= thisWeekEnd && t.status !== 'done' && t.status !== 'cancelled';
        });
      case 'delayed':
        return allTasks.filter(t => t.status === 'delayed');
      case 'open':
        return allTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
      case 'linked':
        return allTasks.filter(t => t.parent_id);
      case 'notLinked':
        return allTasks.filter(t => !t.parent_id);
      default:
        return allTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    }
  }, [allGoals, activeStatFilter, identifyGoals]);

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

      // סנכרון לפיירברי
      try {
        await syncTaskToFireberry({ taskId });
      } catch (error) {
        console.error('Failed to sync to Fireberry:', error);
      }

      // רענון הנתונים רק אחרי שהסנכרון הושלם
      queryClient.invalidateQueries(['customerGoals', customer.email]);
    } catch (error) {
      console.error('Error marking task as done:', error);
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
            className="border-horizon text-horizon-accent"
          >
            חזור לדשבורד יעדים ומשימות
          </Button>
        </div>
        <CustomerGoalsGantt customer={customer} />
      </div>
    );
  }

  if (isLoadingGoals) {
    return (
      <div className="flex items-center justify-center p-8 text-horizon-accent">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        טוען יעדים ומשימות...
      </div>
    );
  }

  const { parentGoals } = identifyGoals;
  const openParentGoals = parentGoals.filter(g => g.status !== 'done' && g.status !== 'cancelled');

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
            className="border-green-500 text-green-400 hover:bg-green-500/10"
          >
            <Download className="w-4 h-4 ml-2" />
            ייצא PDF
          </Button>
          <Button 
            onClick={() => setShowGanttView(true)} 
            variant="outline" 
            className="border-horizon-primary text-horizon-primary"
          >
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card 
          className={`card-horizon cursor-pointer transition-all ${activeStatFilter === 'today' ? 'ring-2 ring-horizon-primary' : ''}`}
          onClick={() => setActiveStatFilter(activeStatFilter === 'today' ? null : 'today')}
        >
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
          className={`card-horizon cursor-pointer transition-all ${activeStatFilter === 'week' ? 'ring-2 ring-horizon-primary' : ''}`}
          onClick={() => setActiveStatFilter(activeStatFilter === 'week' ? null : 'week')}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">משימות השבוע</p>
                <p className="text-2xl font-bold text-blue-400">{stats.tasksThisWeek}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`card-horizon cursor-pointer transition-all ${activeStatFilter === 'delayed' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setActiveStatFilter(activeStatFilter === 'delayed' ? null : 'delayed')}
        >
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

        <Card 
          className={`card-horizon cursor-pointer transition-all ${activeStatFilter === 'open' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setActiveStatFilter(activeStatFilter === 'open' ? null : 'open')}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">משימות פתוחות</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.openTasks}</p>
              </div>
              <ListTodo className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`card-horizon cursor-pointer transition-all ${activeStatFilter === 'linked' ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setActiveStatFilter(activeStatFilter === 'linked' ? null : 'linked')}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">משויכות ליעדים</p>
                <p className="text-2xl font-bold text-purple-400">{stats.linkedToGoals}</p>
              </div>
              <LinkIcon className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`card-horizon cursor-pointer transition-all ${activeStatFilter === 'notLinked' ? 'ring-2 ring-gray-500' : ''}`}
          onClick={() => setActiveStatFilter(activeStatFilter === 'notLinked' ? null : 'notLinked')}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">לא משויכות</p>
                <p className="text-2xl font-bold text-gray-400">{stats.notLinkedToGoals}</p>
              </div>
              <Circle className="w-8 h-8 text-gray-400" />
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
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="text-horizon-accent">אין משימות בקטגוריה זו - מצוין!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(task => {
                const statusDisplay = getStatusDisplay(task.status);
                const StatusIcon = statusDisplay.icon;
                const parentGoal = task.parent_id ? allGoals.find(g => g.id === task.parent_id) : null;
                
                return (
                  <div 
                    key={task.id} 
                    className="bg-horizon-card/50 p-4 rounded-lg border border-horizon hover:border-horizon-primary/50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      handleEditTask(task);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-horizon-text mb-1">{task.name}</h4>
                        {task.notes && (
                          <p className="text-sm text-horizon-accent mb-2">{task.notes}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusDisplay.bgColor}>
                            <StatusIcon className={`w-3 h-3 ml-1 ${statusDisplay.color}`} />
                            <span className={statusDisplay.color}>{statusDisplay.label}</span>
                          </Badge>
                          {task.end_date && (
                            <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                              <Calendar className="w-3 h-3 ml-1" />
                              {format(new Date(task.end_date), 'dd/MM/yyyy', { locale: he })}
                            </Badge>
                          )}
                          {parentGoal && (
                            <Badge className="bg-purple-500/20 text-purple-400">
                              <LinkIcon className="w-3 h-3 ml-1" />
                              {parentGoal.name}
                            </Badge>
                          )}
                          {task.assignee_email && (
                            <Badge variant="outline" className="border-horizon text-horizon-accent">
                              {task.assignee_email}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {task.status !== 'done' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsDone(task.id);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
          {openParentGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-horizon-accent">אין יעדים פתוחים להצגה.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openParentGoals.map(goal => {
                const statusDisplay = getStatusDisplay(goal.status);
                const StatusIcon = statusDisplay.icon;
                const subtasks = allGoals.filter(t => t.parent_id === goal.id);
                const completedSubtasks = subtasks.filter(t => t.status === 'done').length;
                const progress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : (goal.status === 'done' ? 100 : 0);

                return (
                  <div key={goal.id} className="bg-horizon-card/50 p-4 rounded-lg border border-horizon hover:border-horizon-primary/50 transition-colors cursor-pointer" onClick={() => handleEditTask(goal)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-horizon-text mb-2">{goal.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-horizon-accent mb-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 ${statusDisplay.color}`} />
                            <span>{statusDisplay.label}</span>
                          </div>
                          {(goal.start_date || goal.end_date) && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {goal.start_date ? format(new Date(goal.start_date), 'dd/MM/yy', { locale: he }) : '?'} - {goal.end_date ? format(new Date(goal.end_date), 'dd/MM/yy', { locale: he }) : '?'}
                              </span>
                            </div>
                          )}
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
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                              e.stopPropagation();
                              handleEditTask(goal);
                          }}
                          className="text-horizon-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
        }}
      />

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
        }}
      />
      
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
        }}
      />
    </div>
  );
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
  const [status, setStatus] = useState('open');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForTask'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      // סינון רק משתמשים שקיימים בטבלת User
      return users.filter(u => u.email && u.full_name);
    },
    enabled: isOpen
  });

  // סינון משתמשים לפי הלוגיקה: משתמשים רגילים + מנהלי כספים המשויכים ללקוח
  const relevantUsers = useMemo(() => {
    if (!customer || !allUsers || allUsers.length === 0) return [];
    
    const assignedPrimary = customer.assigned_financial_manager_email;
    const assignedAdditional = customer.additional_assigned_financial_manager_emails || [];
    
    // אם אין מנהלי כספים משויכים - להציג רק משתמשים רגילים
    if (!assignedPrimary && assignedAdditional.length === 0) {
      return allUsers.filter(u => u.user_type !== 'financial_manager');
    }
    
    // משתמשים רגילים + מנהלי כספים משויכים בלבד
    return allUsers.filter(u => {
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
        parent_id: (parentGoalId && parentGoalId !== 'no_goal') ? parentGoalId : null,
        status,
        assignee_email: assigneeEmail || currentUser?.email,
        task_type: 'one_time',
        is_active: true,
        order_index: 0
      });

      // סנכרון לפיירברי
      try {
        const { syncTaskToFireberry } = await import('@/functions/syncTaskToFireberry');
        await syncTaskToFireberry({ taskId: newTask.id });
      } catch (error) {
        console.error('Failed to sync new task to Fireberry:', error);
      }

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
              required
            />
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">תיאור / הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים..."
              className="bg-horizon-card border-horizon text-horizon-text h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך התחלה *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required
              />
            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך סיום *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שעת יעד</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-horizon-card border-horizon text-horizon-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך תזכורת</Label>
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">שעת תזכורת</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
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
                {allGoals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                ))}
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
                {relevantUsers.map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name}
                  </SelectItem>
                ))}
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
    </Dialog>
  );
}

// מודל עריכת משימה
function EditTaskModal({ isOpen, onClose, task, currentUser, allGoals, onSuccess }) {
  const [editedTask, setEditedTask] = useState(null);
  const [endTime, setEndTime] = useState('09:00');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForEdit'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      // סינון רק משתמשים שקיימים בטבלת User
      return users.filter(u => u.email && u.full_name);
    },
    enabled: isOpen
  });

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
      return allUsers.filter(u => u.user_type !== 'financial_manager');
    }
    
    return allUsers.filter(u => {
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
        reminder_date_only: reminderDateStr,
      });
      setEndTime(time);
      setReminderTime(reminderTimeStr);
    }
  }, [task]);

  const handleFieldChange = (field, value) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
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

      await base44.entities.CustomerGoal.update(id, dataToUpdate);

      // סנכרון לפיירברי
      try {
        await syncTaskToFireberry({ taskId: id });
      } catch (error) {
        console.error('Failed to sync to Fireberry:', error);
      }

      // המתנה קצרה לוודא שהעדכון התקבל
      await new Promise(resolve => setTimeout(resolve, 500));

      onSuccess();
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
              required
            />
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">תיאור / הערות</Label>
            <Textarea
              value={editedTask.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="פרטים נוספים..."
              className="bg-horizon-card border-horizon text-horizon-text h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך התחלה *</Label>
              <Input
                type="date"
                value={editedTask.start_date}
                onChange={(e) => handleFieldChange('start_date', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required
              />
            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך סיום *</Label>
              <Input
                type="date"
                value={editedTask.end_date}
                onChange={(e) => handleFieldChange('end_date', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שעת יעד</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-horizon-card border-horizon text-horizon-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך תזכורת</Label>
              <Input
                type="date"
                value={editedTask.reminder_date_only || ''}
                onChange={(e) => handleFieldChange('reminder_date_only', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">שעת תזכורת</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
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
                {allGoals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                ))}
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
                {relevantUsers.map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name}
                  </SelectItem>
                ))}
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
    </Dialog>
  );
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForGoal'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      // סינון רק משתמשים שקיימים בטבלת User
      return users.filter(u => u.email && u.full_name);
    },
    enabled: isOpen
  });

  // סינון משתמשים
  const relevantUsers = useMemo(() => {
    if (!customer || !allUsers || allUsers.length === 0) return [];
    
    const assignedPrimary = customer.assigned_financial_manager_email;
    const assignedAdditional = customer.additional_assigned_financial_manager_emails || [];
    
    if (!assignedPrimary && assignedAdditional.length === 0) {
      return allUsers.filter(u => u.user_type !== 'financial_manager');
    }
    
    return allUsers.filter(u => {
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
        is_active: true,
        order_index: existingGoalsCount,
        task_type: 'goal'
      });

      // סנכרון לפיירברי
      try {
        const { syncTaskToFireberry } = await import('@/functions/syncTaskToFireberry');
        await syncTaskToFireberry({ taskId: newGoal.id });
      } catch (error) {
        console.error('Failed to sync new goal to Fireberry:', error);
      }

      setName('');
      setNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setEndTime('17:00');
      setReminderDate('');
      setReminderTime('09:00');
      setAssigneeEmail(currentUser?.email || '');

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
              required
            />
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">תיאור / הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים על היעד..."
              className="bg-horizon-card border-horizon text-horizon-text h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך התחלה</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך יעד</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שעת יעד</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-horizon-card border-horizon text-horizon-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך תזכורת</Label>
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">שעת תזכורת</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">אחראי</Label>
            <Select value={assigneeEmail} onValueChange={setAssigneeEmail}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר אחראי" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                {relevantUsers.map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name} {u.user_type === 'financial_manager' ? '(מנהל)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    </Dialog>
  );
}