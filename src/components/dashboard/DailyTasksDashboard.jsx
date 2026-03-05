import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarLucide,
  Users,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Clock,
  Target,
  Circle,
  AlertCircle,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  User as UserIcon,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  ListChecks
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
import CreateTaskModal from '../shared/CreateTaskModal';

import { toast } from "sonner";
import { CustomerGoal, OnboardingRequest, Recommendation, User } from '@/api/entities';
import { generateRecurringTasks } from '@/api/functions';

const getTodayWorkGroup = () => {
  const dayOfWeek = new Date().getDay();
  switch (dayOfWeek) {
    case 0: case 3: return { groups: ['A'], message: 'היום יום עבודה על לקוחות מקבוצה A' };
    case 1: case 4: return { groups: ['B'], message: 'היום יום עבודה על לקוחות מקבוצה B' };
    case 2: return { groups: ['A', 'B'], message: 'היום יום שלישי - מומלץ לעבוד על לקוחות מקבוצה A ו-B' };
    default: return { groups: [], message: 'סוף שבוע - אין לקוחות מוגדרים לעבודה' };
  }
};

const getHebrewDayName = () => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[new Date().getDay()];
};

// גרדיאנטים לעמודות לקוחות — מבוססי branding (teal + orange + variations)
const CUSTOMER_GRADIENTS = [
  'from-[#32acc1] to-[#1e90b0]',
  'from-[#fc9f67] to-[#e67e3c]',
  'from-[#38A169] to-[#2F855A]',
  'from-[#4299e1] to-[#3182ce]',
  'from-[#9F7AEA] to-[#805AD5]',
  'from-[#ED64A6] to-[#D53F8C]',
];

export default function DailyTasksDashboard({ currentUser, isAdmin }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editedTaskData, setEditedTaskData] = useState({});
  const [groupFilter, setGroupFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [financialManagerFilter, setFinancialManagerFilter] = useState('all');
  const [isClientsExpanded, setIsClientsExpanded] = useState(false);
  const [customerForNewTask, setCustomerForNewTask] = useState(null);

  const todayWorkGroup = getTodayWorkGroup();
  const queryClient = useQueryClient();

  // טעינת לקוחות
  const { data: allCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['allCustomers', currentUser.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const onboardingReqs = await OnboardingRequest.filter({
          is_active: true,
          is_archived: { $ne: true }
        });
        return onboardingReqs.map((req) => ({
          id: req.id, email: req.email, full_name: req.full_name,
          business_name: req.business_name, customer_group: req.customer_group,
          assigned_financial_manager_email: req.assigned_financial_manager_email,
          business_type: req.business_type
        }));
      } else {
        const allOnboardingReqs = await OnboardingRequest.filter({
          is_active: true,
          is_archived: { $ne: true }
        });
        const onboardingReqs = allOnboardingReqs.filter((req) =>
          req.assigned_financial_manager_email === currentUser.email ||
          req.additional_assigned_financial_manager_emails?.includes(currentUser.email)
        );
        return onboardingReqs.map((req) => ({
          id: req.id, email: req.email, full_name: req.full_name,
          business_name: req.business_name, customer_group: req.customer_group,
          assigned_financial_manager_email: req.assigned_financial_manager_email,
          business_type: req.business_type
        }));
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const todaysClients = useMemo(() => {
    if (!allCustomers.length) return [];
    if (isAdmin) return allCustomers;
    if (todayWorkGroup.groups.length === 0) return [];
    return allCustomers.filter((customer) =>
      todayWorkGroup.groups.includes(customer.customer_group)
    );
  }, [allCustomers, todayWorkGroup, isAdmin]);

  const { data: goals = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['allRelevantTasks', currentUser.email, isAdmin],
    queryFn: async () => {
      const filterByParentGoals = (tasks) => {
        const explicitGoals = tasks.filter(t => t.task_type === 'goal');
        const goalsWithSubtasks = tasks.filter(t => tasks.some(other => other.parent_id === t.id));
        const parentGoalIds = new Set([...explicitGoals.map(t => t.id), ...goalsWithSubtasks.map(t => t.id)]);
        return tasks.filter(t =>
          t.task_type !== 'daily_checklist_360' && !parentGoalIds.has(t.id)
        );
      };

      if (isAdmin) {
        const allTasks = await CustomerGoal.filter({ is_active: true }, 'order_index');
        return filterByParentGoals(allTasks);
      } else {
        const myCustomers = allCustomers.map((c) => c.email);
        const customerTasks = await CustomerGoal.filter({ is_active: true }, 'order_index');
        const tasksOnly = filterByParentGoals(customerTasks);
        return tasksOnly.filter((task) =>
          task.assignee_email === currentUser.email ||
          myCustomers.includes(task.customer_email)
        );
      }
    },
    enabled: !!allCustomers.length || isAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

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

  const { data: financialManagers = [] } = useQuery({
    queryKey: ['financialManagers'],
    queryFn: async () => {
      if (!isAdmin) return [];
      const allUsers = await User.list();
      return allUsers.filter(u => u.user_type === 'financial_manager');
    },
    enabled: isAdmin,
    staleTime: 10 * 60 * 1000
  });

  const filteredTasksByGroup = useMemo(() => {
    let filtered = activeTasks;
    if (groupFilter !== 'all') {
      filtered = filtered.filter((task) => {
        const customer = allCustomers.find((c) => c.email === task.customer_email);
        if (groupFilter === 'no_group') return !customer?.customer_group || customer.customer_group === '';
        return customer?.customer_group === groupFilter;
      });
    }
    if (customerFilter !== 'all') {
      filtered = filtered.filter((task) => task.customer_email === customerFilter);
    }
    if (isAdmin && financialManagerFilter !== 'all') {
      filtered = filtered.filter((task) => task.assignee_email === financialManagerFilter);
    }
    return filtered;
  }, [activeTasks, groupFilter, customerFilter, financialManagerFilter, allCustomers, isAdmin]);

  const tasksByStatus = useMemo(() => ({
    open: filteredTasksByGroup.filter((t) => t.status === 'open'),
    in_progress: filteredTasksByGroup.filter((t) => t.status === 'in_progress'),
    done: filteredTasksByGroup.filter((t) => t.status === 'done'),
    delayed: filteredTasksByGroup.filter((t) => t.status === 'delayed'),
    cancelled: filteredTasksByGroup.filter((t) => t.status === 'cancelled')
  }), [filteredTasksByGroup]);

  const filteredCustomersForColumns = useMemo(() => {
    let list = allCustomers.filter((c) => {
      if (groupFilter === 'all') return true;
      if (groupFilter === 'no_group') return !c.customer_group || c.customer_group === '';
      return c.customer_group === groupFilter;
    });
    if (customerFilter !== 'all') {
      list = list.filter((c) => c.email === customerFilter);
    }
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

  // סטטוס sections
  const ACTIVE_STATUS_SECTIONS = [
    { key: 'delayed', label: 'באיחור', dotColor: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400' },
    { key: 'in_progress', label: 'בביצוע', dotColor: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
    { key: 'open', label: 'לביצוע', dotColor: 'bg-slate-400', textColor: 'text-slate-500 dark:text-slate-400' }
  ];

  const tasksByCustomer = useMemo(() => {
    const byEmail = {};
    filteredCustomersForColumns.forEach((c) => {
      byEmail[c.email] = { delayed: [], in_progress: [], open: [], completed: [] };
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

  const completedTasks = useMemo(() => {
    return (goals || []).filter((t) => t.status === 'done');
  }, [goals]);

  const { data: allRecommendations = [] } = useQuery({
    queryKey: ['allRecommendationsForStats', currentUser.email, isAdmin],
    queryFn: async () => {
      const filter = isAdmin
        ? { status: { $ne: 'archived' } }
        : { assignee_email: currentUser.email, status: { $ne: 'archived' } };
      return await Recommendation.filter(filter);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const stats = useMemo(() => ({
    totalTasks: filteredTasksByGroup.filter(t => t.status !== 'done').length,
    open: tasksByStatus.open.length,
    in_progress: tasksByStatus.in_progress.length,
    done: completedTasks.length,
    delayed: tasksByStatus.delayed.length
  }), [filteredTasksByGroup, tasksByStatus, completedTasks]);

  // === Mutations ===

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updateData }) => {
      const originalTask = goals.find(g => g.id === taskId);
      return CustomerGoal.update(taskId, {
        ...updateData,
        is_active: originalTask?.is_active !== false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allRelevantTasks']);
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
        await CustomerGoal.update(taskId, {
          status: 'done',
          last_completed_at: new Date().toISOString(),
          times_completed: (task.times_completed || 0) + 1,
          is_active: true
        });
        try { await generateRecurringTasks({}); } catch (error) {
          console.error('Error generating next occurrence:', error);
        }
      } else {
        await CustomerGoal.update(taskId, {
          status: 'done',
          is_active: task?.is_active !== false
        });
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

  const handleDragEnd = async (result) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId.split('__').pop();
    const taskId = draggableId;

    queryClient.setQueryData(
      ['allRelevantTasks', currentUser.email, isAdmin],
      (old) => old?.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );

    try {
      const task = goals.find(g => g.id === taskId);
      await CustomerGoal.update(taskId, {
        status: newStatus,
        is_active: task?.is_active !== false
      });
      toast.success('הסטטוס עודכן');
    } catch (error) {
      console.error('Error updating task status via drag:', error);
      toast.error('שגיאה בעדכון סטטוס');
      queryClient.invalidateQueries(['allRelevantTasks']);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setEditedTaskData({
      name: task.name,
      status: task.status,
      notes: task.notes || '',
      end_date: task.end_date ? format(new Date(task.end_date), 'yyyy-MM-dd') : '',
      due_time: task.due_time || ''
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = () => {
    if (!selectedTask) return;
    updateTaskMutation.mutate({ taskId: selectedTask.id, updateData: editedTaskData });
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
        await CustomerGoal.update(taskId, { status: 'open', is_active: true });
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
      open: { label: 'פתוח', icon: Circle, color: 'text-slate-500', bgColor: 'bg-slate-50 dark:bg-horizon-surface' },
      in_progress: { label: 'בתהליך', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-500/10' },
      done: { label: 'הושלם', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10' },
      delayed: { label: 'ממתין', icon: AlertCircle, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-500/10' }
    };
    return statusConfig[status] || statusConfig.open;
  };

  if (customersLoading || tasksLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#32acc1]" />
        <span className="text-gray-500 text-sm">טוען לוח משימות...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">

      {/* ========== HERO HEADER — גרדיאנט סגול ========== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#32acc1] via-[#1e90b0] to-[#176e87] px-6 py-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">ניהול משימות לקוחות</h2>
              <p className="text-white/70 text-sm mt-0.5">לוח זמנים חכם וממוין לכל לקוח</p>
            </div>
          </div>
          <Button
            onClick={() => setCustomerForNewTask(filteredCustomersForColumns[0] || null)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0 rounded-xl px-5 h-10"
            disabled={filteredCustomersForColumns.length === 0}
          >
            <Plus className="w-4 h-4 ml-2" />
            <Sparkles className="w-4 h-4 ml-1" />
            משימה חדשה
          </Button>
        </div>
        {/* דקורציה */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      </div>

      {/* ========== KPI CARDS ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { value: stats.totalTasks, label: 'סה"כ משימות', icon: ListChecks, iconBg: 'bg-[#32acc1]/10', iconColor: 'text-[#1e90b0] dark:text-[#32acc1]' },
          { value: stats.in_progress, label: 'בתהליך', icon: Clock, iconBg: 'bg-[#fc9f67]/10', iconColor: 'text-[#e67e3c] dark:text-[#fc9f67]' },
          { value: completedTasks.length, label: 'הושלמו', icon: CheckCircle2, iconBg: 'bg-emerald-100 dark:bg-emerald-500/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
          { value: filteredCustomersForColumns.length, label: 'לקוחות פעילים', icon: Users, iconBg: 'bg-[#32acc1]/10', iconColor: 'text-[#1e90b0] dark:text-[#32acc1]' },
        ].map(({ value, label, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white dark:bg-horizon-card rounded-2xl border border-gray-100 dark:border-horizon p-5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-horizon-text">{value}</div>
              <div className="text-sm text-gray-500 dark:text-horizon-accent mt-1">{label}</div>
            </div>
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ========== FILTERS — compact ========== */}
      <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-horizon-card border border-gray-100 dark:border-horizon rounded-2xl px-5 py-3 shadow-sm">
        <Filter className="w-4 h-4 text-gray-400" />

        <div className="flex gap-1.5">
          {[
            { key: 'all', label: 'הכל' },
            { key: 'A', label: 'A' },
            { key: 'B', label: 'B' },
            { key: 'no_group', label: 'ללא' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setGroupFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                groupFilter === key
                  ? 'bg-[#32acc1] text-white shadow-sm'
                  : 'text-gray-500 dark:text-horizon-accent hover:bg-gray-100 dark:hover:bg-horizon-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 dark:bg-horizon hidden sm:block" />

        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[170px] h-8 bg-transparent border-gray-200 dark:border-horizon text-gray-700 dark:text-horizon-text text-xs rounded-lg">
            <SelectValue placeholder="כל הלקוחות" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-horizon-dark border-gray-200 dark:border-horizon max-h-[300px]">
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

        {isAdmin && financialManagers.length > 0 && (
          <>
            <div className="w-px h-5 bg-gray-200 dark:bg-horizon hidden sm:block" />
            <Select value={financialManagerFilter} onValueChange={setFinancialManagerFilter}>
              <SelectTrigger className="w-[170px] h-8 bg-transparent border-gray-200 dark:border-horizon text-gray-700 dark:text-horizon-text text-xs rounded-lg">
                <SelectValue placeholder="כל המנהלים" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-horizon-dark border-gray-200 dark:border-horizon max-h-[300px]">
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
      </div>

      {/* ========== KANBAN BOARD ========== */}
      {filteredCustomersForColumns.length === 0 ? (
        <div className="bg-white dark:bg-horizon-card rounded-2xl border border-gray-100 dark:border-horizon py-20 text-center shadow-sm">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-horizon-accent" />
          <p className="font-medium text-gray-700 dark:text-horizon-text text-sm">אין לקוחות בהתאם לסינון</p>
          <p className="text-xs mt-1 text-gray-400 dark:text-horizon-accent">נסה לשנות את סינון הקבוצה או הלקוח</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-5 overflow-x-auto pb-4 -mx-2 px-2">
            {filteredCustomersForColumns.map((customer, colIndex) => {
              const bucket = tasksByCustomer[customer.email] || {
                delayed: [], in_progress: [], open: [], completed: []
              };
              const activeCount = bucket.delayed.length + bucket.in_progress.length + bucket.open.length;
              const totalCount = activeCount + bucket.completed.length;
              const completionPct = totalCount > 0 ? Math.round((bucket.completed.length / totalCount) * 100) : 0;
              const gradient = CUSTOMER_GRADIENTS[colIndex % CUSTOMER_GRADIENTS.length];

              return (
                <div key={customer.email} className="flex-shrink-0 w-[320px]">

                  {/* כותרת לקוח — כרטיס גרדיאנט */}
                  <div className={`bg-gradient-to-l ${gradient} rounded-2xl p-4 text-white mb-3 shadow-lg`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm">
                        <Users className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-base truncate flex-1" title={customer.business_name || customer.full_name}>
                        {customer.business_name || customer.full_name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between text-sm text-white/80">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {activeCount} משימות
                      </span>
                      <span>{completionPct}% הושלם</span>
                    </div>
                    {/* Progress bar */}
                    {totalCount > 0 && (
                      <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/80 rounded-full transition-all duration-500"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* כפתור הוספת משימה */}
                  <button
                    type="button"
                    onClick={() => setCustomerForNewTask(customer)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-horizon text-gray-400 dark:text-horizon-accent hover:text-[#32acc1] hover:border-[#32acc1]/40 dark:hover:border-[#32acc1]/50 hover:bg-[#32acc1]/5 transition-all duration-150 cursor-pointer text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    משימה חדשה
                  </button>

                  {/* אזור משימות */}
                  <div className="space-y-1 min-h-[180px] max-h-[calc(100vh-500px)] overflow-y-auto pr-1">
                    {activeCount === 0 && bucket.completed.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 opacity-40">
                        <CheckCircle2 className="w-8 h-8 text-gray-300 dark:text-horizon-accent mb-2" />
                        <p className="text-sm text-gray-400 dark:text-horizon-accent">אין משימות</p>
                      </div>
                    ) : (
                      <>
                        {ACTIVE_STATUS_SECTIONS.map(({ key, label, dotColor, textColor }) => {
                          if (bucket[key].length === 0) return null;
                          return (
                            <div key={key}>
                              <div className="flex items-center gap-2 py-2 px-1">
                                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
                                <span className="text-[10px] text-gray-400 dark:text-horizon-accent">({bucket[key].length})</span>
                              </div>
                              <Droppable droppableId={`${customer.email}__${key}`}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`space-y-2 min-h-[36px] rounded-xl transition-all duration-200 ${
                                      snapshot.isDraggingOver
                                        ? 'bg-[#32acc1]/5 ring-2 ring-[#32acc1]/20 ring-inset p-2'
                                        : 'p-0.5'
                                    }`}
                                  >
                                    {bucket[key].map((task, index) => {
                                      const parentGoal = task.parent_id ? goals.find((g) => g.id === task.parent_id) : null;
                                      return (
                                        <TaskCard
                                          key={task.id}
                                          task={task}
                                          customer={customer}
                                          parentGoal={parentGoal}
                                          onTaskClick={handleTaskClick}
                                          onMarkAsDone={handleMarkAsDone}
                                          index={index}
                                        />
                                      );
                                    })}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          );
                        })}

                        {/* הושלמו */}
                        {bucket.completed.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-horizon">
                            <div className="flex items-center gap-2 py-1.5 px-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">הושלמו</span>
                              <span className="text-[10px] text-gray-400 dark:text-horizon-accent">({bucket.completed.length})</span>
                            </div>
                            <Droppable droppableId={`${customer.email}__done`}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`space-y-2 min-h-[36px] rounded-xl transition-all duration-200 ${
                                    snapshot.isDraggingOver
                                      ? 'bg-emerald-50 dark:bg-emerald-500/5 ring-2 ring-emerald-300 dark:ring-emerald-500/20 ring-inset p-2'
                                      : 'p-0.5'
                                  }`}
                                >
                                  {bucket.completed.map((task, index) => {
                                    const parentGoal = task.parent_id ? goals.find((g) => g.id === task.parent_id) : null;
                                    return (
                                      <TaskCard
                                        key={task.id}
                                        task={task}
                                        customer={customer}
                                        parentGoal={parentGoal}
                                        onTaskClick={handleTaskClick}
                                        onMarkAsDone={handleMarkAsDone}
                                        index={index}
                                      />
                                    );
                                  })}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* ========== MODALS ========== */}

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

      {selectedTask && (
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-horizon-dark text-gray-900 dark:text-horizon-text border-gray-200 dark:border-horizon rounded-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right text-lg font-bold">עריכת משימה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-right block mb-1.5 text-xs text-gray-500 dark:text-horizon-accent">שם המשימה</Label>
                <input
                  type="text"
                  value={editedTaskData.name || ''}
                  onChange={(e) => setEditedTaskData({ ...editedTaskData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-horizon-card border border-gray-200 dark:border-horizon rounded-xl text-gray-900 dark:text-horizon-text text-right text-sm focus:border-[#32acc1] focus:ring-2 focus:ring-[#32acc1]/15 outline-none transition-all"
                />
              </div>

              <div>
                <Label className="text-right block mb-1.5 text-xs text-gray-500 dark:text-horizon-accent">סטטוס</Label>
                <Select
                  value={editedTaskData.status}
                  onValueChange={(value) => setEditedTaskData({ ...editedTaskData, status: value })}>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-horizon-card border-gray-200 dark:border-horizon text-gray-900 dark:text-horizon-text text-right text-sm rounded-xl">
                    <SelectValue>
                      {(() => {
                        const display = getStatusDisplay(editedTaskData.status);
                        const StatusIcon = display.icon;
                        return (
                          <div className="flex items-center gap-2 justify-end">
                            <span className="font-medium text-sm">{display.label}</span>
                            <StatusIcon className={`w-4 h-4 ${display.color}`} />
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-horizon-dark border-gray-200 dark:border-horizon rounded-xl">
                    {['open', 'in_progress', 'done', 'delayed'].map((statusValue) => {
                      const display = getStatusDisplay(statusValue);
                      const StatusIcon = display.icon;
                      return (
                        <SelectItem key={statusValue} value={statusValue} className="text-right cursor-pointer rounded-lg">
                          <div className="flex items-center gap-2 justify-end w-full py-0.5">
                            <span className={`text-sm ${display.color}`}>{display.label}</span>
                            <StatusIcon className={`w-4 h-4 ${display.color}`} />
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-right block mb-1.5 text-xs text-gray-500 dark:text-horizon-accent">תאריך יעד</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline"
                        className="w-full justify-end text-right bg-gray-50 dark:bg-horizon-card border-gray-200 dark:border-horizon text-gray-900 dark:text-horizon-text text-sm rounded-xl">
                        {editedTaskData.end_date ? (
                          format(new Date(editedTaskData.end_date), 'dd/MM/yyyy', { locale: he })
                        ) : (
                          <span className="text-gray-400 dark:text-horizon-accent">בחר תאריך</span>
                        )}
                        <CalendarIcon className="w-3.5 h-3.5 mr-2 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-horizon-card border-gray-200 dark:border-horizon rounded-xl" align="end">
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
                        className="text-gray-900 dark:text-horizon-text"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-right block mb-1.5 text-xs text-gray-500 dark:text-horizon-accent">שעת יעד</Label>
                  <input
                    type="time"
                    value={editedTaskData.due_time || ''}
                    onChange={(e) => setEditedTaskData({ ...editedTaskData, due_time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-horizon-card border border-gray-200 dark:border-horizon rounded-xl text-gray-900 dark:text-horizon-text text-right text-sm focus:border-[#32acc1] focus:ring-2 focus:ring-[#32acc1]/15 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <Label className="text-right block mb-1.5 text-xs text-gray-500 dark:text-horizon-accent">הערות</Label>
                <Textarea
                  value={editedTaskData.notes || ''}
                  onChange={(e) => setEditedTaskData({ ...editedTaskData, notes: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-horizon-card border-gray-200 dark:border-horizon text-gray-900 dark:text-horizon-text text-right text-sm min-h-[80px] rounded-xl focus:border-[#32acc1] focus:ring-2 focus:ring-[#32acc1]/15"
                  placeholder="הוסף הערות למשימה..."
                />
              </div>

              {selectedTask && (
                <div className="bg-gray-50 dark:bg-horizon-surface/50 rounded-xl p-3 text-xs text-gray-500 dark:text-horizon-accent space-y-1">
                  <p><span className="text-gray-700 dark:text-horizon-text font-medium">לקוח:</span> {selectedTask.customer_email}</p>
                  <p><span className="text-gray-700 dark:text-horizon-text font-medium">אחראי:</span> {selectedTask.assignee_email || 'לא שויך'}</p>
                  <p><span className="text-gray-700 dark:text-horizon-text font-medium">נוצר:</span> {format(new Date(selectedTask.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button type="button" variant="outline"
                onClick={() => setIsTaskModalOpen(false)}
                className="border-gray-200 dark:border-horizon text-gray-500 dark:text-horizon-accent text-sm rounded-xl">
                ביטול
              </Button>
              <Button type="button" onClick={handleSaveTask}
                disabled={updateTaskMutation.isLoading}
                className="bg-[#1e90b0] hover:bg-[#176e87] text-white text-sm rounded-xl">
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
