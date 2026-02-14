import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Calendar as CalendarLucide,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowLeft,
  Lightbulb,
  Clock,
  Target,
  ListTodo,
  Circle,
  AlertCircle,
  Loader2,
  TrendingUp,
  Filter,
  LayoutGrid,
  CheckSquare,
  XCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CalendarIcon,
  User as UserIcon // Added User as UserIcon import
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

import TaskCard from './kanban/TaskCard';
import CompletedTasksModal from './kanban/CompletedTasksModal';
import GoalBankManager from '../admin/GoalBankManager';
import CreateTaskModal from '../shared/CreateTaskModal';


import { toast } from "sonner";
// פונקציה לקבלת קבוצת העבודה היומית
const getTodayWorkGroup = () => {
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  switch (dayOfWeek) {
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

// פונקציה לקבלת צבע תגית קבוצת לקוח
const getCustomerGroupBadgeColor = (group) => {
  if (group === 'A') return 'bg-[#32acc1] text-white';
  if (group === 'B') return 'bg-[#fc9f67] text-white';
  return 'bg-gray-500 text-white';
};

export default function DailyTasksDashboard({ currentUser, isAdmin }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editedTaskData, setEditedTaskData] = useState({});
  const [groupFilter, setGroupFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [financialManagerFilter, setFinancialManagerFilter] = useState('all'); // Added new state for financial manager filter
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [isClientsExpanded, setIsClientsExpanded] = useState(false); // Default: collapsed
  const [showGoalBankModal, setShowGoalBankModal] = useState(false);
  const [customerForNewTask, setCustomerForNewTask] = useState(null);

  const todayWorkGroup = getTodayWorkGroup();
  const queryClient = useQueryClient();

  // טעינת לקוחות
  const { data: allCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['allCustomers', currentUser.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        // אדמין רואה את כל OnboardingRequests הפעילים ושלא בארכיון
        const onboardingReqs = await base44.entities.OnboardingRequest.filter({ 
          is_active: true,
          is_archived: { $ne: true }
        });
        
        return onboardingReqs.map((req) => ({
          id: req.id,
          email: req.email,
          full_name: req.full_name,
          business_name: req.business_name,
          customer_group: req.customer_group,
          assigned_financial_manager_email: req.assigned_financial_manager_email,
          business_type: req.business_type
        }));
      } else {
        // ⭐ מנהל כספים - טוען כל OnboardingRequests ומסנן בצד הלקוח (כולל מנהלים משניים!)
        const allOnboardingReqs = await base44.entities.OnboardingRequest.filter({ 
          is_active: true,
          is_archived: { $ne: true }
        });
        const onboardingReqs = allOnboardingReqs.filter((req) =>
          req.assigned_financial_manager_email === currentUser.email ||
          req.additional_assigned_financial_manager_emails?.includes(currentUser.email)
        );

        return onboardingReqs.map((req) => ({
          id: req.id,
          email: req.email,
          full_name: req.full_name,
          business_name: req.business_name,
          customer_group: req.customer_group,
          assigned_financial_manager_email: req.assigned_financial_manager_email,
          business_type: req.business_type
        }));
      }
    },
    staleTime: 5 * 60 * 1000, // 5 דקות cache
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // סינון לקוחות לפי קבוצת העבודה של היום ומנהל הכספים הנוכחי
  const todaysClients = useMemo(() => {
    if (!allCustomers.length) return [];

    // עבור אדמין - להציג את כל הלקוחות תמיד
    if (isAdmin) {
      return allCustomers;
    }

    // עבור מנהל כספים - לסנן לפי קבוצת העבודה של היום
    if (todayWorkGroup.groups.length === 0) return [];

    return allCustomers.filter((customer) => {
      // בדיקה אם הלקוח בקבוצת העבודה של היום
      const isInTodaysGroup = todayWorkGroup.groups.includes(customer.customer_group);
      return isInTodaysGroup;
    });
  }, [allCustomers, todayWorkGroup, isAdmin]);

  // טעינת כל המשימות הפעילות
  const { data: goals = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['allRelevantTasks', currentUser.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const allTasks = await base44.entities.CustomerGoal.filter({ is_active: true }, 'order_index');
        // סינון משימות צ'קליסט יומי
        return allTasks.filter(t => t.task_type !== 'daily_checklist_360' && t.task_type !== 'goal');
      } else {
        const myCustomers = allCustomers.map((c) => c.email);
        const customerTasks = await base44.entities.CustomerGoal.filter({
          is_active: true
        }, 'order_index');

        const relevantTasks = customerTasks.filter((task) =>
          // סינון משימות צ'קליסט יומי ויעדים – מציגים רק משימות
          task.task_type !== 'daily_checklist_360' && task.task_type !== 'goal' && (
            task.assignee_email === currentUser.email ||
            myCustomers.includes(task.customer_email)
          )
        );

        return relevantTasks;
      }
    },
    enabled: !!allCustomers.length || isAdmin,
    staleTime: 5 * 60 * 1000, // 5 דקות cache
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // סינון משימות פעילות בלבד (start_date התחיל)
  const activeTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (goals || []).filter((task) => {
      const startDate = task.start_date ? new Date(task.start_date) : null;
      if (!startDate) return true;
      startDate.setHours(0, 0, 0, 0);
      return startDate <= today;
    });
  }, [goals]);

  // טעינת מנהלי כספים (רק לאדמין)
  const { data: financialManagers = [] } = useQuery({
    queryKey: ['financialManagers'],
    queryFn: async () => {
      if (!isAdmin) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'financial_manager');
    },
    enabled: isAdmin,
    staleTime: 10 * 60 * 1000
  });

  // סינון לפי קבוצת לקוחות, לקוח ספציפי ומנהל כספים
  const filteredTasksByGroup = useMemo(() => {
    let filtered = activeTasks;

    // סינון לפי קבוצה
    if (groupFilter !== 'all') {
      filtered = filtered.filter((task) => {
        const customer = allCustomers.find((c) => c.email === task.customer_email);
        if (groupFilter === 'no_group') {
          return !customer?.customer_group || customer.customer_group === '';
        }
        return customer?.customer_group === groupFilter;
      });
    }

    // סינון לפי לקוח
    if (customerFilter !== 'all') {
      filtered = filtered.filter((task) => task.customer_email === customerFilter);
    }

    // סינון לפי מנהל כספים (אדמין בלבד)
    if (isAdmin && financialManagerFilter !== 'all') {
      filtered = filtered.filter((task) => task.assignee_email === financialManagerFilter);
    }

    return filtered;
  }, [activeTasks, groupFilter, customerFilter, financialManagerFilter, allCustomers, isAdmin]);

  // חלוקת משימות לפי סטטוס (לסטטיסטיקות)
  const tasksByStatus = useMemo(() => {
    return {
      open: filteredTasksByGroup.filter((t) => t.status === 'open'),
      in_progress: filteredTasksByGroup.filter((t) => t.status === 'in_progress'),
      done: filteredTasksByGroup.filter((t) => t.status === 'done'),
      delayed: filteredTasksByGroup.filter((t) => t.status === 'delayed'),
      cancelled: filteredTasksByGroup.filter((t) => t.status === 'cancelled')
    };
  }, [filteredTasksByGroup]);

  // לקוחות לעמודות הלוח: סינון לפי קבוצה/לקוח, מיון לפי תאריך סיום קרוב
  const filteredCustomersForColumns = useMemo(() => {
    let list = allCustomers.filter((c) => {
      if (groupFilter === 'all') return true;
      if (groupFilter === 'no_group') return !c.customer_group || c.customer_group === '';
      return c.customer_group === groupFilter;
    });
    if (customerFilter !== 'all') {
      list = list.filter((c) => c.email === customerFilter);
    }
    const taskCountByEmail = {};
    filteredTasksByGroup.forEach((t) => {
      taskCountByEmail[t.customer_email] = (taskCountByEmail[t.customer_email] || 0) + 1;
    });
    const getNearestEndDate = (email) => {
      const tasks = filteredTasksByGroup.filter((t) => t.customer_email === email);
      if (!tasks.length) return null;
      const withDate = tasks.filter((t) => t.end_date).map((t) => new Date(t.end_date).getTime());
      return withDate.length ? Math.min(...withDate) : null;
    };
    return [...list].sort((a, b) => {
      const dateA = getNearestEndDate(a.email);
      const dateB = getNearestEndDate(b.email);
      if (dateA != null && dateB != null) return dateA - dateB;
      if (dateA != null) return -1;
      if (dateB != null) return 1;
      return (a.business_name || a.full_name || '').localeCompare(b.business_name || b.full_name || '');
    });
  }, [allCustomers, groupFilter, customerFilter, filteredTasksByGroup]);

  // סדר וכותרת לכל סוג סטטוס (פעיל) – להפרדה ויזואלית בעמודה (בוטל לא מוצג)
  const ACTIVE_STATUS_SECTIONS = [
    { key: 'delayed', label: 'באיחור', colorClass: 'border-red-500/50 bg-red-500/10 text-red-700' },
    { key: 'in_progress', label: 'בביצוע', colorClass: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700' },
    { key: 'open', label: 'לביצוע', colorClass: 'border-blue-500/50 bg-blue-500/10 text-blue-700' }
  ];

  // קיבוץ משימות לפי לקוח ולפי סטטוס: delayed, in_progress, open, cancelled, completed – ממוין לפי תאריך בכל קבוצה
  const tasksByCustomer = useMemo(() => {
    const byEmail = {};
    filteredCustomersForColumns.forEach((c) => {
      byEmail[c.email] = {
        delayed: [], in_progress: [], open: [],
        completed: []
      };
    });
    const sortByEndDate = (a, b) => {
      if (!a.end_date) return 1;
      if (!b.end_date) return -1;
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    };
    filteredTasksByGroup.forEach((task) => {
      const bucket = byEmail[task.customer_email];
      if (!bucket) return;
      if (task.status === 'done') bucket.completed.push(task);
      else if (task.status !== 'cancelled' && bucket[task.status] !== undefined) bucket[task.status].push(task);
    });
    Object.keys(byEmail).forEach((email) => {
      ACTIVE_STATUS_SECTIONS.forEach(({ key }) => byEmail[email][key].sort(sortByEndDate));
      byEmail[email].completed.sort(sortByEndDate);
    });
    return byEmail;
  }, [filteredTasksByGroup, filteredCustomersForColumns]);

  // כל המשימות שהושלמו (לא משנה תאריך)
  const completedTasks = useMemo(() => {
    return (goals || []).filter((t) => t.status === 'done');
  }, [goals]);

  // טעינת המלצות לסטטיסטיקות
  const { data: allRecommendations = [] } = useQuery({
    queryKey: ['allRecommendationsForStats', currentUser.email, isAdmin],
    queryFn: async () => {
      const filter = isAdmin ?
        { status: { $ne: 'archived' } } :
        {
          assignee_email: currentUser.email,
          status: { $ne: 'archived' }
        };
      return await base44.entities.Recommendation.filter(filter);
    },
    staleTime: 5 * 60 * 1000, // 5 דקות cache
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
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
    return (goals || []).filter((task) => {
      if (!task.end_date) return false;
      const endDate = new Date(task.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() === todayDate.getTime();
    });
  }, [goals, todayDate]);

  // Tasks for today (for tabs), excluding done/cancelled
  const todayTasksForTabs = useMemo(() => {
    return (allTodaysTasksForStats || []).filter((task) =>
    task.status !== 'done' && task.status !== 'cancelled'
    );
  }, [allTodaysTasksForStats]);

  // Tasks for this week (for tabs), excluding done/cancelled
  const thisWeekTasksForTabs = useMemo(() => {
    return (goals || []).filter((task) => {
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
      toast.success('המשימה עודכנה בהצלחה!');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('שגיאה בעדכון המשימה: ' + error.message);
    }
  });

  const markTaskAsDoneMutation = useMutation({
    mutationFn: async (taskId) => {
      const task = goals.find(g => g.id === taskId);
      
      if (task?.task_type === 'recurring') {
        // משימה חוזרת - עדכן עם תאריך השלמה
        await base44.entities.CustomerGoal.update(taskId, {
          status: 'done',
          last_completed_at: new Date().toISOString(),
          times_completed: (task.times_completed || 0) + 1
        });
        
        // קרא לפונקציה ליצירת המשימה הבאה
        try {
          await base44.functions.invoke('generateRecurringTasks', {});
        } catch (error) {
          console.error('Error generating next occurrence:', error);
        }
      } else {
        // משימה רגילה
        await base44.entities.CustomerGoal.update(taskId, { status: 'done' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allRelevantTasks']);
      toast.success('המשימה הושלמה בהצלחה!');
    },
    onError: (error) => {
      console.error('Error marking task as done:', error);
      toast.error('שגיאה בהשלמת המשימה: ' + error.message);
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
    const task = goals.find(g => g.id === taskId);
    const confirmMsg = task?.task_type === 'recurring' 
      ? 'המשימה תסומן כהושלמה ותיווצר מחדש למועד הבא. להמשיך?'
      : 'האם אתה בטוח שברצונך לסמן משימה זו כהושלמה?';
    
    if (confirm(confirmMsg)) {
      markTaskAsDoneMutation.mutate(taskId);
    }
  };

  const handleRestoreTask = async (taskId) => {
    if (confirm('האם לשחזר את המשימה למצב "פתוח"?')) {
      try {
        await base44.entities.CustomerGoal.update(taskId, { status: 'open' });
        queryClient.invalidateQueries(['allRelevantTasks']);
        toast.success('המשימה שוחזרה בהצלחה!');
      } catch (error) {
        console.error('Error restoring task:', error);
        toast.error('שגיאה בשחזור המשימה');
      }
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

  // סטטיסטיקות מעודכנות
  const stats = useMemo(() => {
    return {
      totalTasks: filteredTasksByGroup.length,
      open: tasksByStatus.open.length,
      in_progress: tasksByStatus.in_progress.length,
      done: completedTasks.length,
      delayed: tasksByStatus.delayed.length
    };
  }, [filteredTasksByGroup, tasksByStatus, completedTasks]);

  if (customersLoading || tasksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-horizon-accent">טוען נתונים...</div>
      </div>);

  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת וכפתורים */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-horizon-text flex items-center gap-2">לוח משימות</h2>
          <p className="text-horizon-accent mt-1">
            לוח משימות לפי לקוח – גלול לצפייה בכל הלקוחות
          </p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || currentUser?.user_type === 'financial_manager') && (
            <Button
              onClick={() => setShowGoalBankModal(true)}
              variant="outline"
              className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
            >
              <BookOpen className="w-4 h-4 ml-2" />
              בנק יעדים
            </Button>
          )}
          <Button
            onClick={() => setShowCompletedModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white">

            <CheckSquare className="w-4 h-4 ml-2" />
            משימות שהושלמו ({completedTasks.length})
          </Button>
        </div>
      </div>

      {/* הודעת יום העבודה */}
      {!isAdmin && todayWorkGroup.groups.length > 0 &&
      <Card className="card-horizon bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarLucide className="w-5 h-5 text-horizon-primary" />
            <span className="text-horizon-text font-medium text-right">
              היום יום עבודה על לקוחות מקבוצה: {todayWorkGroup.groups.join(' ו-')} - יום {getHebrewDayName()}
            </span>
          </CardContent>
        </Card>
      }

      {/* פילטרים */}
      <Card className="card-horizon">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-horizon-primary" />
              <span className="text-sm font-medium text-horizon-text">סינון לפי קבוצה:</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={groupFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setGroupFilter('all')}
                className={groupFilter === 'all' ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}>

                הכל
              </Button>
              <Button
                size="sm"
                variant={groupFilter === 'A' ? 'default' : 'outline'}
                onClick={() => setGroupFilter('A')}
                className={groupFilter === 'A' ? 'bg-[#32acc1] text-white' : 'border-[#32acc1] text-[#32acc1]'}>

                קבוצה A
              </Button>
              <Button
                size="sm"
                variant={groupFilter === 'B' ? 'default' : 'outline'}
                onClick={() => setGroupFilter('B')}
                className={groupFilter === 'B' ? 'bg-[#fc9f67] text-white' : 'border-[#fc9f67] text-[#fc9f67]'}>

                קבוצה B
              </Button>
              <Button
                size="sm"
                variant={groupFilter === 'no_group' ? 'default' : 'outline'}
                onClick={() => setGroupFilter('no_group')}
                className={groupFilter === 'no_group' ? 'bg-gray-500 text-white' : 'border-gray-400 text-gray-400'}>

                ללא שיוך
              </Button>
            </div>

            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm font-medium text-horizon-text">מיון יעדים:</span>
            </div>
            <p className="text-xs text-horizon-accent">
              יעדים ממוינים מהקרוב לרחוק לפי תאריך סיום
            </p>

            {/* סינון לפי לקוח */}
            <div className="flex items-center gap-2 mr-4">
              <Users className="w-4 h-4 text-horizon-primary" />
              <span className="text-sm font-medium text-horizon-text">סינון לפי לקוח:</span>
            </div>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[200px] bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="כל הלקוחות" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon max-h-[300px]">
                <SelectItem value="all">כל הלקוחות</SelectItem>
                {allCustomers
                  .sort((a, b) => (a.business_name || a.full_name || '').localeCompare(b.business_name || b.full_name || ''))
                  .map((customer) => (
                    <SelectItem key={customer.email} value={customer.email}>
                      {customer.business_name || customer.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* סינון לפי מנהל כספים (אדמין בלבד) */}
            {isAdmin && financialManagers.length > 0 && (
              <>
                <div className="flex items-center gap-2 mr-4">
                  <UserIcon className="w-4 h-4 text-horizon-primary" />
                  <span className="text-sm font-medium text-horizon-text">סינון לפי מנהל כספים:</span>
                </div>
                <Select value={financialManagerFilter} onValueChange={setFinancialManagerFilter}>
                  <SelectTrigger className="w-[200px] bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue placeholder="כל המנהלים" />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-dark border-horizon max-h-[300px]">
                    <SelectItem value="all">כל המנהלים</SelectItem>
                    {financialManagers.map((manager) => (
                      <SelectItem key={manager.email} value={manager.email}>
                        {manager.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <div className="mr-auto flex gap-4 text-sm text-horizon-accent">
              <span>סה"כ משימות פעילות: <span className="font-bold text-horizon-primary">{stats.totalTasks}</span></span>
              <span>סה"כ לקוחות: <span className="font-bold text-horizon-primary">{filteredCustomersForColumns.length}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* לוח משימות לפי לקוח */}
      {tasksLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-horizon-primary mb-4" />
          <p className="text-horizon-accent">טוען לוח משימות...</p>
        </div>
      ) : filteredCustomersForColumns.length === 0 ? (
        <Card className="card-horizon">
          <CardContent className="py-12 text-center text-horizon-accent">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">אין לקוחות בהתאם לסינון</p>
            <p className="text-sm mt-1">נסה לשנות את סינון הקבוצה או הלקוח</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {filteredCustomersForColumns.map((customer) => {
            const bucket = tasksByCustomer[customer.email] || {
              delayed: [], in_progress: [], open: [], completed: []
            };
            const totalCount = bucket.delayed.length + bucket.in_progress.length + bucket.open.length + bucket.completed.length;
            const headerColor = customer.customer_group === 'A'
              ? 'bg-[#32acc1] text-white'
              : customer.customer_group === 'B'
                ? 'bg-[#fc9f67] text-white'
                : 'bg-gray-500 text-white';
            return (
              <div key={customer.email} className="flex-shrink-0 w-80">
                <div className="bg-horizon-card/50 rounded-lg border border-horizon">
                  <div className={`p-4 border-b border-horizon rounded-t-lg flex items-center justify-between ${headerColor}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-5 h-5 flex-shrink-0" />
                      <h3 className="font-bold text-base truncate" title={customer.business_name || customer.full_name}>
                        {customer.business_name || customer.full_name}
                      </h3>
                    </div>
                    <Badge className="bg-white/20 text-white flex-shrink-0">
                      {totalCount}
                    </Badge>
                  </div>
                  <div className="p-3 border-b border-horizon">
                    <Button
                      type="button"
                      onClick={() => setCustomerForNewTask(customer)}
                      className="w-full bg-horizon-secondary hover:bg-horizon-secondary/90 text-white"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף משימה חדשה
                    </Button>
                  </div>
                  <div className="p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
                    {totalCount === 0 ? (
                      <p className="text-sm text-horizon-accent text-center py-8">אין משימות</p>
                    ) : (
                      <>
                        {ACTIVE_STATUS_SECTIONS.map(({ key, label, colorClass }) =>
                          bucket[key].length > 0 ? (
                            <div key={key}>
                              <div className={`border rounded px-2 py-1.5 text-center text-xs font-medium ${colorClass}`}>
                                {label} ({bucket[key].length})
                              </div>
                              <div className="space-y-2 mt-2">
                                {bucket[key].map((task) => {
                                  const parentGoal = task.parent_id ? goals.find((g) => g.id === task.parent_id) : null;
                                  return (
                                    <TaskCard
                                      key={task.id}
                                      task={task}
                                      customer={customer}
                                      parentGoal={parentGoal}
                                      onTaskClick={handleTaskClick}
                                      onMarkAsDone={handleMarkAsDone}
                                      isDragging={false}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ) : null
                        )}
                        {bucket.completed.length > 0 && (
                          <>
                            <div className="border-t-2 border-horizon mt-4 pt-3 bg-horizon-primary/5 rounded px-2 py-2 text-center">
                              <p className="text-xs font-medium text-horizon-accent">משימות שהושלמו ({bucket.completed.length})</p>
                            </div>
                            <div className="space-y-2 mt-2">
                              {bucket.completed.map((task) => {
                                const parentGoal = task.parent_id ? goals.find((g) => g.id === task.parent_id) : null;
                                return (
                                  <TaskCard
                                    key={task.id}
                                    task={task}
                                    customer={customer}
                                    parentGoal={parentGoal}
                                    onTaskClick={handleTaskClick}
                                    onMarkAsDone={handleMarkAsDone}
                                    isDragging={false}
                                  />
                                );
                              })}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* טבלת לקוחות לעבודה היום */}
      {todaysClients.length > 0 && (
        <Card className="card-horizon bg-white border-2 border-[#e1e8ed]">
          <CardHeader className="border-b border-[#e1e8ed] bg-gradient-to-l from-[#32acc1]/5 to-[#fc9f67]/5">
            <CardTitle className="text-horizon-text flex items-center justify-between text-right">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-horizon-primary" />
                {isAdmin ? `כל הלקוחות (${todaysClients.length})` : `לקוחות לעבודה היום (${todaysClients.length})`}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsClientsExpanded(!isClientsExpanded)}
                className="text-horizon-accent hover:text-horizon-primary"
              >
                {isClientsExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          {isClientsExpanded && (
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todaysClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-white rounded-xl border-2 border-[#e1e8ed] p-4 hover:shadow-md hover:border-[#32acc1]/30 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 text-right">
                        <h4 className="font-bold text-[#121725] text-base">
                          {client.business_name || client.full_name}
                        </h4>
                      </div>
                      <Badge className={`${getCustomerGroupBadgeColor(client.customer_group)} font-semibold text-sm px-3 py-1`}>
                        קבוצה {client.customer_group}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#5a6c7d] mb-2 text-right">{client.email}</p>
                    <div className="text-xs text-[#5a6c7d] mb-3 text-right">
                      {client.business_type || 'other'}
                    </div>
                    <div className="space-y-2">
                      <Link to={createPageUrl('CustomerManagementNew') + `?clientId=${client.id}`}>
                        <Button
                          size="sm"
                          className="w-full bg-[#32acc1] hover:bg-[#32acc1]/90 text-white rounded-lg h-9"
                        >
                          <ArrowLeft className="w-4 h-4 ml-2" />
                          מעבר ללקוח
                        </Button>
                      </Link>
                      {client.fireberry_account_id && (
                        <a
                          href={`https://plusto.fireberry.com/Account/Account/frm_account_information.aspx?id=${client.fireberry_account_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block', width: '100%' }}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-[#32acc1] text-[#32acc1] hover:bg-[#32acc1]/10 rounded-lg h-9"
                          >
                            פתח בפיירברי
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
      
      {/* מודאל משימות שהושלמו */}
      <CompletedTasksModal
        isOpen={showCompletedModal}
        onClose={() => setShowCompletedModal(false)}
        completedTasks={completedTasks}
        allCustomers={allCustomers}
        allGoals={goals}
        onRestoreTask={handleRestoreTask} />

      {/* מודאל הוספת משימה חדשה (מתוך עמודת לקוח) */}
      <CreateTaskModal
        isOpen={!!customerForNewTask}
        onClose={() => setCustomerForNewTask(null)}
        customer={customerForNewTask}
        currentUser={currentUser}
        allGoals={customerForNewTask ? goals.filter((g) => g.customer_email === customerForNewTask.email && g.task_type === 'goal') : []}
        onSuccess={() => {
          queryClient.invalidateQueries(['allRelevantTasks']);
          setCustomerForNewTask(null);
        }}
      />

      {/* מודל בנק יעדים */}
      <Dialog open={showGoalBankModal} onOpenChange={setShowGoalBankModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-horizon-text flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-horizon-primary" />
              בנק יעדים
            </DialogTitle>
          </DialogHeader>
          <GoalBankManager currentUser={currentUser} />
        </DialogContent>
      </Dialog>

      {/* מודאל עריכת משימה */}
      {selectedTask &&
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
                className="w-full px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text text-right" />

              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text">סטטוס</Label>
                <Select
                value={editedTaskData.status}
                onValueChange={(value) => setEditedTaskData({ ...editedTaskData, status: value })}>

                  <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text text-right">
                    <SelectValue>
                      {(() => {
                      const display = getStatusDisplay(editedTaskData.status);
                      const StatusIcon = display.icon;
                      return (
                        <div className="flex items-center gap-2 justify-end">
                            <span className="font-medium">{display.label}</span>
                            <StatusIcon className={`w-5 h-5 ${display.color}`} />
                          </div>);

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
                        className={`text-right cursor-pointer ${display.bgColor} hover:opacity-80 transition-opacity`}>

                          <div className="flex items-center gap-3 justify-end w-full py-1">
                            <span className={`font-medium text-base ${display.color}`}>{display.label}</span>
                            <StatusIcon className={`w-5 h-5 ${display.color}`} />
                          </div>
                        </SelectItem>);

                  })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text">תאריך יעד</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-end text-right bg-horizon-card border-horizon text-horizon-text"
                    >
                      {editedTaskData.end_date ? (
                        format(new Date(editedTaskData.end_date), 'dd/MM/yyyy', { locale: he })
                      ) : (
                        <span className="text-horizon-accent">בחר תאריך</span>
                      )}
                      <CalendarIcon className="w-4 h-4 mr-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon" align="end">
                    <Calendar
                      mode="single"
                      selected={editedTaskData.end_date ? new Date(editedTaskData.end_date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          setEditedTaskData({ ...editedTaskData, end_date: formatted });
                        }
                      }}
                      locale={he}
                      className="text-horizon-text"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text">שעת יעד (אופציונלי)</Label>
                <input
                type="time"
                value={editedTaskData.due_time || ''}
                onChange={(e) => setEditedTaskData({ ...editedTaskData, due_time: e.target.value })}
                className="w-full px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text text-right" />

              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text">הערות</Label>
                <Textarea
                value={editedTaskData.notes || ''}
                onChange={(e) => setEditedTaskData({ ...editedTaskData, notes: e.target.value })}
                className="w-full bg-horizon-card border-horizon text-horizon-text text-right min-h-[100px]"
                placeholder="הוסף הערות למשימה..." />

              </div>

              {selectedTask &&
            <div className="bg-horizon-card/30 p-3 rounded-lg text-sm text-horizon-accent">
                  <p><strong>לקוח:</strong> {selectedTask.customer_email}</p>
                  <p><strong>אחראי:</strong> {selectedTask.assignee_email || 'לא שויך'}</p>
                  <p><strong>נוצר ב:</strong> {format(new Date(selectedTask.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                </div>
            }
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
              type="button"
              variant="outline"
              onClick={() => setIsTaskModalOpen(false)}
              className="border-horizon text-horizon-text">

                ביטול
              </Button>
              <Button
              type="button"
              onClick={handleSaveTask}
              disabled={updateTaskMutation.isLoading}
              className="btn-horizon-primary">

                {updateTaskMutation.isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                שמור שינויים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    </div>);

}