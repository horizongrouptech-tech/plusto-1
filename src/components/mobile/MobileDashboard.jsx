import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Home, Target, DollarSign, AlertCircle, CheckCircle, Clock,
  TrendingUp, TrendingDown, Calendar, ChevronRight, Loader2,
  Bell, FileText, User, Settings, BarChart3, Wallet, Building2,
  Phone, Mail, Users, ListTodo, RefreshCw, LogOut, Zap,
  ArrowUp, ArrowDown, ChevronDown, Eye, MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

// ניווט תחתון
const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'ראשי' },
  { id: 'customers', icon: Users, label: 'לקוחות' },
  { id: 'tasks', icon: ListTodo, label: 'משימות' },
  { id: 'alerts', icon: Bell, label: 'התראות' }
];

export default function MobileDashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const isFinancialManager = currentUser?.user_type === 'financial_manager';

  // טעינת כל הלקוחות של המנהל
  const { data: myCustomers = [], isLoading: isLoadingCustomers, refetch: refetchCustomers } = useQuery({
    queryKey: ['mobileMyCustomers', currentUser?.email],
    queryFn: async () => {
      if (isAdmin) {
        // אדמין רואה את כל הלקוחות
        return await base44.entities.OnboardingRequest.filter({ 
          status: 'approved',
          is_active: true 
        });
      } else {
        // מנהל כספים רואה רק את הלקוחות שלו
        const [primary, additional] = await Promise.all([
          base44.entities.OnboardingRequest.filter({ 
            assigned_financial_manager_email: currentUser.email,
            status: 'approved',
            is_active: true 
          }),
          base44.entities.OnboardingRequest.filter({ 
            additional_financial_managers: { $contains: currentUser.email },
            status: 'approved',
            is_active: true 
          })
        ]);
        
        // מיזוג ומניעת כפילויות
        const allCustomers = [...primary];
        additional.forEach(c => {
          if (!allCustomers.find(existing => existing.id === c.id)) {
            allCustomers.push(c);
          }
        });
        return allCustomers;
      }
    },
    enabled: !!currentUser?.email
  });

  // טעינת כל המשימות של המנהל
  const { data: allTasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['mobileAllTasks', currentUser?.email],
    queryFn: async () => {
      const customerEmails = myCustomers.map(c => c.email);
      
      if (isAdmin) {
        const tasks = await base44.entities.CustomerGoal.filter({ 
          is_active: true 
        }, '-end_date');
        return tasks.filter(t => t.task_type !== 'daily_checklist_360');
      }
      
      const tasks = await base44.entities.CustomerGoal.filter({ 
        is_active: true 
      }, '-end_date');
      
      return tasks.filter(t => 
        t.task_type !== 'daily_checklist_360' && (
          t.assignee_email === currentUser.email ||
          customerEmails.includes(t.customer_email) ||
          t.tagged_users?.includes(currentUser.email)
        )
      );
    },
    enabled: !!currentUser?.email && myCustomers.length >= 0
  });

  // חישוב משימות להיום
  const todayTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allTasks.filter(task => {
      if (!task.end_date) return false;
      const taskDate = new Date(task.end_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime() && 
             task.status !== 'done' && 
             task.status !== 'cancelled';
    });
  }, [allTasks]);

  // משימות באיחור
  const delayedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allTasks.filter(task => {
      if (!task.end_date) return false;
      const taskDate = new Date(task.end_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate < today && 
             task.status !== 'done' && 
             task.status !== 'cancelled';
    });
  }, [allTasks]);

  // משימות השבוע
  const weekTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return allTasks.filter(task => {
      if (!task.end_date) return false;
      const taskDate = new Date(task.end_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate >= today && 
             taskDate <= weekEnd && 
             task.status !== 'done' && 
             task.status !== 'cancelled';
    });
  }, [allTasks]);

  // לקוחות עם פגישות היום (לפי שדה meeting_date אם קיים)
  const todayCustomers = useMemo(() => {
    // כרגע מציג את כל הלקוחות הפעילים - ניתן להרחיב בעתיד לפי פגישות
    return myCustomers.slice(0, 10);
  }, [myCustomers]);

  // פונקציות עזר
  const getCustomerTasks = (customerEmail) => {
    return allTasks.filter(t => t.customer_email === customerEmail);
  };

  const getCustomerOpenTasks = (customerEmail) => {
    return allTasks.filter(t => 
      t.customer_email === customerEmail && 
      t.status !== 'done' && 
      t.status !== 'cancelled'
    );
  };

  const getCustomerDelayedTasks = (customerEmail) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allTasks.filter(t => {
      if (t.customer_email !== customerEmail) return false;
      if (!t.end_date) return false;
      const taskDate = new Date(t.end_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate < today && t.status !== 'done' && t.status !== 'cancelled';
    });
  };

  const getStatusBadge = (status, endDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (endDate) {
      const dueDate = new Date(endDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today && status !== 'done') {
        return <Badge className="bg-red-500/20 text-red-400 text-[10px] px-1.5">באיחור</Badge>;
      }
    }
    
    const badges = {
      open: <Badge className="bg-gray-500/20 text-gray-400 text-[10px] px-1.5">פתוח</Badge>,
      in_progress: <Badge className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5">בביצוע</Badge>,
      done: <Badge className="bg-green-500/20 text-green-400 text-[10px] px-1.5">הושלם</Badge>,
      delayed: <Badge className="bg-red-500/20 text-red-400 text-[10px] px-1.5">באיחור</Badge>
    };
    return badges[status] || badges.open;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d)) return 'היום';
    if (isTomorrow(d)) return 'מחר';
    return format(d, 'dd/MM');
  };

  const handleRefresh = () => {
    refetchCustomers();
    refetchTasks();
  };

  const isLoading = isLoadingCustomers || isLoadingTasks;

  // תוכן לפי טאב
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-4 pb-24">
            {/* כותרת */}
            <div className="bg-gradient-to-l from-horizon-primary/30 to-horizon-secondary/10 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-horizon-text">
                    בוקר טוב, {currentUser?.full_name?.split(' ')[0] || 'משתמש'} 👋
                  </h1>
                  <p className="text-sm text-horizon-accent mt-1">
                    {format(new Date(), 'EEEE, d בMMMM', { locale: he })}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRefresh}
                  className="text-horizon-accent"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* סטטיסטיקות מהירות */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-blue-500/15 to-blue-600/5 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-300">לקוחות</p>
                      <p className="text-2xl font-bold text-blue-400">{myCustomers.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-400/40" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-500/15 to-orange-500/5 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-yellow-300">משימות היום</p>
                      <p className="text-2xl font-bold text-yellow-400">{todayTasks.length}</p>
                    </div>
                    <Target className="w-8 h-8 text-yellow-400/40" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/15 to-red-600/5 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-300">באיחור</p>
                      <p className="text-2xl font-bold text-red-400">{delayedTasks.length}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-400/40" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/15 to-emerald-500/5 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-300">השבוע</p>
                      <p className="text-2xl font-bold text-green-400">{weekTasks.length}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-400/40" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* התראות באיחור */}
            {delayedTasks.length > 0 && (
              <Card className="bg-red-500/10 border-red-500/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-red-400">{delayedTasks.length} משימות באיחור</p>
                      <p className="text-xs text-red-300/70">דורשות טיפול מיידי</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab('alerts')}
                      className="text-red-400"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* משימות להיום */}
            <Card className="card-horizon">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-horizon-text flex items-center gap-2">
                    <Target className="w-4 h-4 text-horizon-primary" />
                    משימות להיום
                  </CardTitle>
                  <Badge className="bg-horizon-primary/20 text-horizon-primary">{todayTasks.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-4">
                {todayTasks.length === 0 ? (
                  <div className="text-center py-6 text-horizon-accent">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400/50" />
                    <p className="text-sm">אין משימות להיום! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayTasks.slice(0, 5).map(task => {
                      const customer = myCustomers.find(c => c.email === task.customer_email);
                      return (
                        <div 
                          key={task.id}
                          className="flex items-center gap-3 p-3 bg-horizon-dark/50 rounded-xl"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-horizon-text text-sm truncate">{task.name}</p>
                            {customer && (
                              <p className="text-xs text-horizon-accent truncate">
                                {customer.business_name}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(task.status, task.end_date)}
                        </div>
                      );
                    })}
                    {todayTasks.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('tasks')}
                        className="w-full text-horizon-primary text-xs"
                      >
                        עוד {todayTasks.length - 5} משימות
                        <ChevronRight className="w-4 h-4 mr-1" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* לקוחות */}
            <Card className="card-horizon">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-horizon-text flex items-center gap-2">
                    <Users className="w-4 h-4 text-horizon-primary" />
                    הלקוחות שלי
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('customers')}
                    className="text-horizon-primary text-xs p-1"
                  >
                    הכל
                    <ChevronRight className="w-3 h-3 mr-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-4">
                <div className="space-y-2">
                  {myCustomers.slice(0, 4).map(customer => {
                    const openTasks = getCustomerOpenTasks(customer.email);
                    const delayed = getCustomerDelayedTasks(customer.email);
                    
                    return (
                      <div 
                        key={customer.id}
                        className="flex items-center gap-3 p-3 bg-horizon-dark/50 rounded-xl"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-horizon-primary/30 to-horizon-secondary/30 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-horizon-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-horizon-text text-sm truncate">
                            {customer.business_name}
                          </p>
                          <p className="text-xs text-horizon-accent">{customer.full_name}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-horizon-card text-horizon-accent text-[10px]">
                            {openTasks.length} משימות
                          </Badge>
                          {delayed.length > 0 && (
                            <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                              {delayed.length} באיחור
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* קישורים מהירים */}
            <div className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl('Admin')}>
                <Card className="card-horizon hover:border-horizon-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-horizon-primary/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-horizon-primary" />
                    </div>
                    <span className="text-sm font-medium text-horizon-text">ממשק ניהול</span>
                  </CardContent>
                </Card>
              </Link>
              
              <Card 
                className="card-horizon hover:border-horizon-primary/50 transition-colors cursor-pointer"
                onClick={onLogout}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-horizon-text">התנתקות</span>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'customers':
        return (
          <div className="space-y-4 pb-24">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-horizon-text">הלקוחות שלי ({myCustomers.length})</h2>
              <Button size="icon" variant="ghost" onClick={handleRefresh}>
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            {isLoadingCustomers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
              </div>
            ) : myCustomers.length === 0 ? (
              <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-horizon-accent/50" />
                  <p className="text-horizon-accent">אין לקוחות משויכים</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myCustomers.map(customer => {
                  const openTasks = getCustomerOpenTasks(customer.email);
                  const delayed = getCustomerDelayedTasks(customer.email);
                  const isExpanded = expandedCustomer === customer.id;
                  
                  return (
                    <Card key={customer.id} className="card-horizon overflow-hidden">
                      <CardContent className="p-0">
                        <button
                          onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                          className="w-full p-4 flex items-center gap-3 text-right"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-horizon-primary/30 to-horizon-secondary/30 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-horizon-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-horizon-text truncate">
                              {customer.business_name}
                            </p>
                            <p className="text-sm text-horizon-accent">{customer.full_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {delayed.length > 0 && (
                              <Badge className="bg-red-500/20 text-red-400 text-xs">
                                {delayed.length}
                              </Badge>
                            )}
                            <Badge className="bg-horizon-primary/20 text-horizon-primary text-xs">
                              {openTasks.length}
                            </Badge>
                            <ChevronDown className={`w-5 h-5 text-horizon-accent transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t border-horizon px-4 pb-4 pt-3 space-y-3 bg-horizon-dark/30">
                            {/* פרטי קשר */}
                            <div className="flex flex-wrap gap-3">
                              {customer.phone && (
                                <a 
                                  href={`tel:${customer.phone}`}
                                  className="flex items-center gap-2 text-sm text-horizon-primary"
                                >
                                  <Phone className="w-4 h-4" />
                                  {customer.phone}
                                </a>
                              )}
                              {customer.email && (
                                <a 
                                  href={`mailto:${customer.email}`}
                                  className="flex items-center gap-2 text-sm text-horizon-primary"
                                >
                                  <Mail className="w-4 h-4" />
                                  {customer.email}
                                </a>
                              )}
                            </div>
                            
                            {/* משימות פתוחות */}
                            {openTasks.length > 0 && (
                              <div>
                                <p className="text-xs text-horizon-accent mb-2">משימות פתוחות:</p>
                                <div className="space-y-1">
                                  {openTasks.slice(0, 3).map(task => (
                                    <div 
                                      key={task.id}
                                      className="flex items-center justify-between p-2 bg-horizon-card rounded-lg"
                                    >
                                      <span className="text-sm text-horizon-text truncate flex-1">
                                        {task.name}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {task.end_date && (
                                          <span className="text-xs text-horizon-accent">
                                            {formatDate(task.end_date)}
                                          </span>
                                        )}
                                        {getStatusBadge(task.status, task.end_date)}
                                      </div>
                                    </div>
                                  ))}
                                  {openTasks.length > 3 && (
                                    <p className="text-xs text-horizon-accent text-center pt-1">
                                      +{openTasks.length - 3} משימות נוספות
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* כפתור למעבר לממשק מלא */}
                            <Link 
                              to={`${createPageUrl('CustomerManagementNew')}?customer=${customer.email}`}
                              className="block"
                            >
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-horizon-primary/50 text-horizon-primary"
                              >
                                <Eye className="w-4 h-4 ml-2" />
                                צפייה בפרופיל מלא
                              </Button>
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-4 pb-24">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-horizon-text">כל המשימות</h2>
              <Badge className="bg-horizon-primary/20 text-horizon-primary">
                {allTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length} פתוחות
              </Badge>
            </div>

            {/* פילטר מהיר */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Badge 
                className={`cursor-pointer whitespace-nowrap ${todayTasks.length > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-horizon-card text-horizon-accent'}`}
              >
                היום ({todayTasks.length})
              </Badge>
              <Badge 
                className={`cursor-pointer whitespace-nowrap ${delayedTasks.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-horizon-card text-horizon-accent'}`}
              >
                באיחור ({delayedTasks.length})
              </Badge>
              <Badge className="cursor-pointer whitespace-nowrap bg-horizon-card text-horizon-accent">
                השבוע ({weekTasks.length})
              </Badge>
            </div>
            
            {isLoadingTasks ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
              </div>
            ) : allTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length === 0 ? (
              <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400/50" />
                  <p className="text-horizon-accent">אין משימות פתוחות!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {allTasks
                  .filter(t => t.status !== 'done' && t.status !== 'cancelled')
                  .sort((a, b) => {
                    if (!a.end_date) return 1;
                    if (!b.end_date) return -1;
                    return new Date(a.end_date) - new Date(b.end_date);
                  })
                  .map(task => {
                    const customer = myCustomers.find(c => c.email === task.customer_email);
                    return (
                      <Card key={task.id} className="card-horizon">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-horizon-text">{task.name}</p>
                              {customer && (
                                <p className="text-sm text-horizon-accent mt-1">
                                  <Building2 className="w-3 h-3 inline ml-1" />
                                  {customer.business_name}
                                </p>
                              )}
                              {task.end_date && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-horizon-accent">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(task.end_date)}
                                </div>
                              )}
                            </div>
                            {getStatusBadge(task.status, task.end_date)}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        );

      case 'alerts':
        return (
          <div className="space-y-4 pb-24">
            <h2 className="text-xl font-bold text-horizon-text">התראות ({delayedTasks.length})</h2>
            
            {delayedTasks.length === 0 ? (
              <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400/50" />
                  <p className="text-horizon-accent text-lg font-medium">מצוין! 🎉</p>
                  <p className="text-horizon-accent/70 text-sm">אין משימות באיחור</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {delayedTasks.map(task => {
                  const customer = myCustomers.find(c => c.email === task.customer_email);
                  const daysLate = task.end_date ? differenceInDays(new Date(), new Date(task.end_date)) : 0;
                  
                  return (
                    <Card key={task.id} className="bg-red-500/10 border-red-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-horizon-text">{task.name}</p>
                            {customer && (
                              <p className="text-sm text-horizon-accent mt-1">
                                {customer.business_name}
                              </p>
                            )}
                            <p className="text-sm text-red-400 mt-2">
                              <Clock className="w-3 h-3 inline ml-1" />
                              באיחור של {daysLate} {daysLate === 1 ? 'יום' : 'ימים'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-horizon-dark" dir="rtl">
      {/* תוכן ראשי */}
      <div className="p-4 pt-6">
        {renderContent()}
      </div>

      {/* ניווט תחתון */}
      <nav className="fixed bottom-0 left-0 right-0 bg-horizon-card/95 backdrop-blur-lg border-t border-horizon z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasAlerts = item.id === 'alerts' && delayedTasks.length > 0;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                  isActive ? 'text-horizon-primary' : 'text-horizon-accent'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-horizon-primary/20' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-horizon-primary' : ''}`} />
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
                {hasAlerts && (
                  <span className="absolute top-1 right-[calc(50%-4px)] min-w-[16px] h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center px-1">
                    {delayedTasks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Safe area for iPhone */}
        <div className="h-safe-area-inset-bottom bg-horizon-card" />
      </nav>
    </div>
  );
}
