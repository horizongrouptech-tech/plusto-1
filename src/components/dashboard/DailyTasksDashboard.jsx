import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lightbulb,
  Clock, // New icon for tasks
  Circle, // Icon for 'open' status
  AlertCircle, // Icon for 'delayed' status
  Loader2 // NEW: Import TrendingUp icon for overall stats
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
// TaskCreationModal removed - tasks are created only from customer card

// New imports for task editing modal and table
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

// New imports for tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// פונקציה לקבלת קבוצת העבודה היומית
const getTodayWorkGroup = () => {
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  switch(dayOfWeek) {
    case 0: // ראשון
    case 3: // רביעי
      return { groups: ['A'], message: 'היום יום עבודה על לקוחות מקבוצה A' };
    case 1: // שני
    case 4: // חמישי
      return { groups: ['B'], message: 'היום יום עבודה על לקוחות מקבוצה B' };
    case 2: // שלישי
      return { groups: ['A', 'B'], message: 'היום יום שלישי - מומלץ לעבוד על לקוחות מקבוצה A ו-B' };
    default: // שישי ושבת
      return { groups: [], message: 'סוף שבוע - אין לקוחות מוגדרים לעבודה' };
  }
};

// פונקציה לקבלת שם יום בעברית
const getHebrewDayName = () => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[new Date().getDay()];
};

export default function DailyTasksDashboard({ currentUser, isAdmin }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editedTaskData, setEditedTaskData] = useState({});

  const todayWorkGroup = getTodayWorkGroup();
  const queryClient = useQueryClient();

  // טעינת לקוחות
  const { data: allCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['allCustomers', currentUser.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        // אדמין רואה את כל הלקוחות שהם לא אדמינים או מנהלי כספים פעילים
        const users = await base44.entities.User.filter({
          role: { $ne: 'admin' },
          user_type: { $ne: 'financial_manager' },
          is_active: true
        });
        return users;
      } else {
        // ⭐ מנהל כספים - טוען כל OnboardingRequests ומסנן בצד הלקוח (כולל מנהלים משניים!)
        const allOnboardingReqs = await base44.entities.OnboardingRequest.list();
        const onboardingReqs = allOnboardingReqs.filter(req =>
          req.assigned_financial_manager_email === currentUser.email ||
          (req.additional_assigned_financial_manager_emails && req.additional_assigned_financial_manager_emails.includes(currentUser.email))
        );

        return onboardingReqs.map(req => ({
          id: req.id,
          email: req.email,
          full_name: req.full_name,
          business_name: req.business_name,
          customer_group: req.customer_group,
          assigned_financial_manager_email: req.assigned_financial_manager_email,
          business_type: req.business_type,
        }));
      }
    }
  });

  // סינון לקוחות לפי קבוצת העבודה של היום ומנהל הכספים הנוכחי
  const todaysClients = useMemo(() => {
    if (!allCustomers.length || todayWorkGroup.groups.length === 0) return [];

    return allCustomers.filter(customer => {
      // אם זה מנהל כספים, להציג רק את הלקוחות המשויכים אליו
      // עבור אדמין, השדה assigned_financial_manager_email לא רלוונטי לסינון הראשוני
      // עבור מנהל כספים, ה-queryFn כבר סינן לפי מנהל הכספים, כך שכל הלקוחות ב-allCustomers כבר משויכים אליו.
      const isAssignedToMe = isAdmin || customer.assigned_financial_manager_email === currentUser.email;

      // בדיקה אם הלקוח בקבוצת העבודה של היום
      const isInTodaysGroup = todayWorkGroup.groups.includes(customer.customer_group);

      return isAssignedToMe && isInTodaysGroup;
    });
  }, [allCustomers, todayWorkGroup, currentUser, isAdmin]);

  // טעינת משימות (כל המשימות הפעילות עבור המשתמש/אדמין)
  // מנהל כספים רואה רק משימות שמשויכות אליו
  const { data: goals = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['allRelevantTasks', currentUser.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        // Admin sees all active tasks
        return await base44.entities.CustomerGoal.filter({ is_active: true }, 'order_index');
      } else {
        // מנהל כספים רואה רק משימות שמשויכות אליו (assignee_email)
        // או משימות על לקוחות שהוא מנהל שלהם
        const myTasks = await base44.entities.CustomerGoal.filter({ 
          is_active: true, 
          assignee_email: currentUser.email 
        }, 'order_index');
        
        // גם טוען משימות של לקוחות שהמנהל כספים אחראי עליהם
        const myCustomers = allCustomers.map(c => c.email);
        const customerTasks = await base44.entities.CustomerGoal.filter({ 
          is_active: true 
        }, 'order_index');
        
        // מסנן רק משימות שמשויכות אליו או על לקוחות שלו
        const relevantTasks = customerTasks.filter(task => 
          task.assignee_email === currentUser.email || 
          myCustomers.includes(task.customer_email)
        );
        
        return relevantTasks;
      }
    },
    enabled: !!allCustomers.length || isAdmin
  });

  // טעינת המלצות לסטטיסטיקות
  const { data: allRecommendations = [] } = useQuery({
    queryKey: ['allRecommendationsForStats', currentUser.email, isAdmin],
    queryFn: async () => {
      const filter = isAdmin
        ? { status: { $ne: 'archived' } }
        : { 
            assignee_email: currentUser.email,
            status: { $ne: 'archived' }
          };
      return await base44.entities.Recommendation.filter(filter);
    }
  });

  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekFromNowDate = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 999); // Include the entire 7th day
    return d;
  }, [todayDate]);

  // All tasks for today, regardless of status, used for stats calculation
  const allTodaysTasksForStats = useMemo(() => {
    return (goals || []).filter(task => {
      if (!task.end_date) return false;
      const endDate = new Date(task.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() === todayDate.getTime();
    });
  }, [goals, todayDate]);

  // Tasks for today (for tabs), excluding done/cancelled
  const todayTasksForTabs = useMemo(() => {
    return (allTodaysTasksForStats || []).filter(task =>
      task.status !== 'done' && task.status !== 'cancelled'
    );
  }, [allTodaysTasksForStats]);

  // Tasks for this week (for tabs), excluding done/cancelled
  const thisWeekTasksForTabs = useMemo(() => {
    return (goals || []).filter(task => {
      if (!task.end_date) return false;
      const endDate = new Date(task.end_date);
      endDate.setHours(0, 0, 0, 0); // Compare dates without time
      return endDate >= todayDate && endDate <= weekFromNowDate &&
             task.status !== 'done' && task.status !== 'cancelled';
    });
  }, [goals, todayDate, weekFromNowDate]);

  // חישוב סטטיסטיקות כוללות לשורת סיכום
  const overallStats = useMemo(() => {
    const totalPotentialProfit = allRecommendations.reduce((sum, rec) => 
      sum + (rec.expected_profit || 0), 0
    );

    return {
      totalClients: allCustomers.length,
      totalRecommendations: allRecommendations.length,
      totalPotentialProfit: totalPotentialProfit
    };
  }, [allCustomers, allRecommendations]);


  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updateData }) => base44.entities.CustomerGoal.update(taskId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['allRelevantTasks']); // Invalidate the broader query
      setIsTaskModalOpen(false);
      setSelectedTask(null);
      alert('המשימה עודכנה בהצלחה!');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      alert('שגיאה בעדכון המשימה: ' + error.message);
    }
  });

  const markTaskAsDoneMutation = useMutation({
    mutationFn: (taskId) => base44.entities.CustomerGoal.update(taskId, { status: 'done' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allRelevantTasks']);
      alert('המשימה הושלמה בהצלחה!');
    },
    onError: (error) => {
      console.error('Error marking task as done:', error);
      alert('שגיאה בהשלמת המשימה: ' + error.message);
    }
  });

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setEditedTaskData({
      name: task.name,
      status: task.status,
      notes: task.notes || '',
      end_date: task.end_date ? format(new Date(task.end_date), 'yyyy-MM-dd') : '', // Format date for input type="date"
      due_time: task.due_time || ''
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = () => {
    if (!selectedTask) return;
    updateTaskMutation.mutate({
      taskId: selectedTask.id,
      updateData: editedTaskData
    });
  };

  const handleMarkAsDone = (taskId) => {
    if (confirm('האם אתה בטוח שברצונך לסמן משימה זו כהושלמה?')) {
      markTaskAsDoneMutation.mutate(taskId);
    }
  };


  const getStatusDisplay = (status) => {
    const statusConfig = {
      open: { label: 'פתוח', icon: Circle, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
      in_progress: { label: 'בביצוע', icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
      done: { label: 'הושלם', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
      delayed: { label: 'באיחור', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' }
    };
    return statusConfig[status] || statusConfig.open;
  };

  // סטטיסטיקות
  const stats = useMemo(() => {
    return {
      totalClients: todaysClients.length,
      // Use allTodaysTasksForStats for accurate counts of done/pending/delayed for today
      completedTasks: allTodaysTasksForStats.filter(t => t.status === 'done').length,
      pendingTasks: allTodaysTasksForStats.filter(t => t.status !== 'done' && t.status !== 'cancelled').length,
      delayedTasks: allTodaysTasksForStats.filter(t => t.status === 'delayed').length
    };
  }, [todaysClients, allTodaysTasksForStats]);

  if (customersLoading || tasksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-horizon-accent">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* כותרת ותאריך */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-horizon-text flex items-center gap-2">
            <Calendar className="w-6 h-6 text-horizon-primary" />
            משימות יומיות - {getHebrewDayName()}
          </h2>
          <p className="text-horizon-accent mt-1">
            {new Date().toLocaleDateString('he-IL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
{/* כפתור יצירת משימה הוסר - יש להקים משימות מתוך כרטיס הלקוח */}
      </div>

      {/* המלצת קבוצת עבודה */}
      <Alert className="bg-horizon-primary/10 border-horizon-primary/30">
        <Lightbulb className="w-5 h-5 text-horizon-primary" />
        <AlertDescription className="text-horizon-text text-lg font-medium">
          {todayWorkGroup.message}
        </AlertDescription>
      </Alert>

      {/* סטטיסטיקות מהירות */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">לקוחות להיום</p>
                <p className="text-2xl font-bold text-horizon-primary">{stats.totalClients}</p>
              </div>
              <Users className="w-8 h-8 text-horizon-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">משימות ממתינות</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingTasks}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm text-horizon-accent">משימות שהושלמו</p>
                <p className="text-2xl font-bold text-green-400">{stats.completedTasks}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
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
      </div>

      {/* לקוחות להיום */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-horizon-text">
            <Users className="w-5 h-5 text-horizon-primary" />
            לקוחות לעבודה היום ({todaysClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaysClients.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysClients.map(client => (
                <Card key={client.id} className="bg-horizon-card/30 border-horizon hover:border-horizon-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-right">
                        <h4 className="font-semibold text-horizon-text">
                          {client.business_name || client.full_name}
                        </h4>
                        <p className="text-sm text-horizon-accent">{client.email}</p>
                      </div>
                      <Badge className="bg-horizon-primary text-white">
                        קבוצה {client.customer_group}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-horizon-accent">
                        {client.business_type || 'לא צוין'}
                      </span>
                      {(() => {
                        const inferred = isAdmin
                          ? 'user'
                          : (client?.id?.startsWith('onboarding_') ? 'onboarding' : 'user');
                        return (
                          <Link to={createPageUrl('CustomerManagement') + `?clientId=${client.id}&source=${inferred}`}>
                            <Button size="sm" variant="outline" className="border-horizon-primary text-horizon-primary">
                              <ArrowLeft className="w-4 h-4 ml-1" />
                              מעבר ללקוח
                            </Button>
                          </Link>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-horizon-accent mb-3" />
              <p className="text-horizon-accent">אין לקוחות מוגדרים לעבודה היום</p>
              <p className="text-sm text-horizon-accent mt-1">
                {todayWorkGroup.groups.length === 0
                  ? 'היום סוף שבוע'
                  : 'לא נמצאו לקוחות בקבוצת העבודה של היום'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* משימות - טאבים */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-xl text-horizon-text">משימות</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="today" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 bg-horizon-card/50">
              <TabsTrigger 
                value="today" 
                className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all"
              >
                משימות היום ({todayTasksForTabs.length})
              </TabsTrigger>
              <TabsTrigger 
                value="week" 
                className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all"
              >
                משימות השבוע ({thisWeekTasksForTabs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-3 mt-4">
              {tasksLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-horizon-primary" />
                  <p className="text-horizon-accent mt-2">טוען משימות...</p>
                </div>
              ) : todayTasksForTabs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="text-horizon-accent">אין משימות להיום - מצוין!</p>
                </div>
              ) : (
                todayTasksForTabs.map(task => (
                  <div key={task.id} className="bg-horizon-card/50 p-4 rounded-lg border border-horizon hover:border-horizon-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 cursor-pointer" onClick={() => handleTaskClick(task)}>
                        <h4 className="font-medium text-horizon-text mb-1">{task.name}</h4>
                        {task.notes && (
                          <p className="text-sm text-horizon-accent">{task.notes}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="border-horizon-accent text-horizon-accent text-xs">
                            {task.assignee_email || 'לא משויך'}
                          </Badge>
                          {task.due_time && (
                            <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                              {task.due_time}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsDone(task.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={markTaskAsDoneMutation.isLoading}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="week" className="space-y-3 mt-4">
              {tasksLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-horizon-primary" />
                  <p className="text-horizon-accent mt-2">טוען משימות...</p>
                </div>
              ) : thisWeekTasksForTabs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="text-horizon-accent">אין משימות לשבוע הקרוב - מצוין!</p>
                </div>
              ) : (
                thisWeekTasksForTabs.map(task => (
                  <div key={task.id} className="bg-horizon-card/50 p-4 rounded-lg border border-horizon hover:border-horizon-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 cursor-pointer" onClick={() => handleTaskClick(task)}>
                        <h4 className="font-medium text-horizon-text mb-1">{task.name}</h4>
                        {task.notes && (
                          <p className="text-sm text-horizon-accent">{task.notes}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="border-horizon-accent text-horizon-accent text-xs">
                            יעד: {task.end_date ? format(new Date(task.end_date), 'dd/MM/yyyy', { locale: he }) : 'לא הוגדר'}
                          </Badge>
                          <Badge variant="outline" className="border-horizon-accent text-horizon-accent text-xs">
                            {task.assignee_email || 'לא משויך'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsDone(task.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={markTaskAsDoneMutation.isLoading}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


{/* מודל יצירת משימה הוסר - משימות מוקמות רק מתוך כרטיס לקוח */}

      {/* מודאל עריכת משימה */}
      {selectedTask && (
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right text-xl">עריכת משימה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-right block mb-2 text-horizon-text">שם המשימה</Label>
                <input
                  type="text"
                  value={editedTaskData.name || ''}
                  onChange={(e) => setEditedTaskData({ ...editedTaskData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text text-right"
                />
              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text">סטטוס</Label>
                <Select
                  value={editedTaskData.status}
                  onValueChange={(value) => setEditedTaskData({ ...editedTaskData, status: value })}
                >
                  <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text text-right">
                    <SelectValue>
                      {(() => {
                        const display = getStatusDisplay(editedTaskData.status);
                        const StatusIcon = display.icon;
                        return (
                          <div className="flex items-center gap-2 justify-end">
                            <span className="font-medium">{display.label}</span>
                            <StatusIcon className={`w-5 h-5 ${display.color}`} />
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-dark border-horizon">
                    {['open', 'in_progress', 'done', 'delayed'].map((statusValue) => {
                      const display = getStatusDisplay(statusValue);
                      const StatusIcon = display.icon;
                      return (
                        <SelectItem
                          key={statusValue}
                          value={statusValue}
                          className={`text-right cursor-pointer ${display.bgColor} hover:opacity-80 transition-opacity`}
                        >
                          <div className="flex items-center gap-3 justify-end w-full py-1">
                            <span className={`font-medium text-base ${display.color}`}>{display.label}</span>
                            <StatusIcon className={`w-5 h-5 ${display.color}`} />
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text">תאריך יעד</Label>
                <input
                  type="date"
                  value={editedTaskData.end_date || ''}
                  onChange={(e) => setEditedTaskData({ ...editedTaskData, end_date: e.target.value })}
                  className="w-full px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text text-right"
                />
              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text">שעת יעד (אופציונלי)</Label>
                <input
                  type="time"
                  value={editedTaskData.due_time || ''}
                  onChange={(e) => setEditedTaskData({ ...editedTaskData, due_time: e.target.value })}
                  className="w-full px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text text-right"
                />
              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text">הערות</Label>
                <Textarea
                  value={editedTaskData.notes || ''}
                  onChange={(e) => setEditedTaskData({ ...editedTaskData, notes: e.target.value })}
                  className="w-full bg-horizon-card border-horizon text-horizon-text text-right min-h-[100px]"
                  placeholder="הוסף הערות למשימה..."
                />
              </div>

              {selectedTask && (
                <div className="bg-horizon-card/30 p-3 rounded-lg text-sm text-horizon-accent">
                  <p><strong>לקוח:</strong> {selectedTask.customer_email}</p>
                  <p><strong>אחראי:</strong> {selectedTask.assignee_email || 'לא שויך'}</p>
                  <p><strong>נוצר ב:</strong> {format(new Date(selectedTask.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTaskModalOpen(false)}
                className="border-horizon text-horizon-text"
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={handleSaveTask}
                disabled={updateTaskMutation.isLoading}
                className="btn-horizon-primary"
              >
                {updateTaskMutation.isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                שמור שינויים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}