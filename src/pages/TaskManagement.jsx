import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Search,
  Settings,
  FileText,
  Lightbulb,
  Package,
  TrendingUp,
  Target,
  Truck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Building2
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import CustomerFileUploadManager from '@/components/admin/CustomerFileUploadManager';
import CustomerGoalsGantt from '@/components/admin/CustomerGoalsGantt';
import CustomerSuppliersTab from '@/components/admin/CustomerSuppliersTab';
import { format } from 'date-fns';

export default function TaskManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('files');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // טעינת משתמש נוכחי
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  // בדיקת הרשאות - רק אדמין
  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/Admin" replace />;
  }

  // טעינת לקוחות
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['crmCustomers'],
    queryFn: async () => {
      const onboardingRequests = await base44.entities.OnboardingRequest.filter({ is_active: true });
      return onboardingRequests;
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000
  });

  // טעינת משימות ללקוח הנבחר
  const { data: customerTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['customerTasks', selectedCustomer?.email],
    queryFn: async () => {
      if (!selectedCustomer?.email) return [];
      const tasks = await base44.entities.CustomerGoal.filter({
        customer_email: selectedCustomer.email,
        is_active: true
      }, 'order_index');
      return tasks;
    },
    enabled: !!selectedCustomer?.email,
    staleTime: 2 * 60 * 1000
  });

  // סינון לקוחות
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // סינון לפי קבוצה
    if (groupFilter !== 'all') {
      filtered = filtered.filter(c => c.customer_group === groupFilter);
    }

    // סינון לפי חיפוש
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.business_name?.toLowerCase().includes(search) ||
        c.full_name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [customers, groupFilter, searchTerm]);

  // בחירה אוטומטית של לקוח ראשון
  useEffect(() => {
    if (filteredCustomers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(filteredCustomers[0]);
    }
  }, [filteredCustomers]);

  // קטגוריזציה של משימות לפי תאריך
  const categorizedTasks = useMemo(() => {
    if (!customerTasks.length) return { today: [], thisWeek: [], future: [], delayed: [], completed: [] };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return {
      today: customerTasks.filter(t => {
        if (t.status === 'done' || t.status === 'cancelled') return false;
        const endDate = t.end_date ? new Date(t.end_date) : null;
        return endDate && endDate >= todayStart && endDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      }),
      thisWeek: customerTasks.filter(t => {
        if (t.status === 'done' || t.status === 'cancelled') return false;
        const endDate = t.end_date ? new Date(t.end_date) : null;
        return endDate && endDate >= new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) && endDate < weekEnd;
      }),
      future: customerTasks.filter(t => {
        if (t.status === 'done' || t.status === 'cancelled') return false;
        const endDate = t.end_date ? new Date(t.end_date) : null;
        return endDate && endDate >= weekEnd;
      }),
      delayed: customerTasks.filter(t => t.status === 'delayed'),
      completed: customerTasks.filter(t => t.status === 'done')
    };
  }, [customerTasks]);

  const tabs = [
    { id: 'files', label: 'קבצים', icon: FileText },
    { id: 'recommendations', label: 'המלצות', icon: Lightbulb },
    { id: 'catalog', label: 'קטלוג', icon: Package },
    { id: 'forecast', label: 'תוכנית עסקית', icon: TrendingUp },
    { id: 'goals', label: 'יעדים', icon: Target },
    { id: 'suppliers', label: 'ספקים', icon: Truck },
    { id: 'cashflow', label: 'תזרים', icon: BarChart3 }
  ];

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-horizon-dark">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-horizon-dark flex flex-col overflow-hidden" dir="rtl">
      {/* כותרת עליונה */}
      <div className="bg-horizon-card border-b border-horizon p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-horizon-text">דף ניסיון - מערכת CRM למנהלי כספים</h1>
        <Badge className="bg-purple-500 text-white px-4 py-2">גרסת ניסיון</Badge>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* פאנל לקוחות - ימין */}
        {showRightPanel && (
          <div className="w-80 bg-horizon-card border-l border-horizon flex flex-col">
            {/* חיפוש וסינון */}
            <div className="p-4 border-b border-horizon space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש לקוח..."
                  className="pr-10 bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={groupFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setGroupFilter('all')}
                  className={groupFilter === 'all' ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}
                >
                  הכל
                </Button>
                <Button
                  size="sm"
                  variant={groupFilter === 'A' ? 'default' : 'outline'}
                  onClick={() => setGroupFilter('A')}
                  className={groupFilter === 'A' ? 'bg-[#32acc1] text-white' : 'border-horizon text-horizon-accent'}
                >
                  קבוצה A
                </Button>
                <Button
                  size="sm"
                  variant={groupFilter === 'B' ? 'default' : 'outline'}
                  onClick={() => setGroupFilter('B')}
                  className={groupFilter === 'B' ? 'bg-[#fc9f67] text-white' : 'border-horizon text-horizon-accent'}
                >
                  קבוצה B
                </Button>
              </div>
            </div>

            {/* רשימת לקוחות */}
            <ScrollArea className="flex-1">
              {isLoadingCustomers ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedCustomer?.id === customer.id
                          ? 'bg-horizon-primary text-white shadow-lg'
                          : 'bg-horizon-dark hover:bg-horizon-card/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`font-semibold text-sm ${
                            selectedCustomer?.id === customer.id ? 'text-white' : 'text-horizon-text'
                          }`}>
                            {customer.business_name || customer.full_name}
                          </h4>
                          <p className={`text-xs mt-1 ${
                            selectedCustomer?.id === customer.id ? 'text-white/80' : 'text-horizon-accent'
                          }`}>
                            {customer.full_name}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-xs ${
                              customer.customer_group === 'A'
                                ? 'bg-[#32acc1] text-white'
                                : customer.customer_group === 'B'
                                ? 'bg-[#fc9f67] text-white'
                                : 'bg-gray-500 text-white'
                            }`}
                          >
                            {customer.customer_group || '-'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-6 w-6 p-0 ${
                              selectedCustomer?.id === customer.id ? 'text-white hover:text-white/80' : 'text-horizon-accent hover:text-horizon-primary'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSettingsModal(true);
                            }}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* כפתור כיווץ/הרחבה - ימין */}
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="w-6 bg-horizon-card border-l border-horizon hover:bg-horizon-primary/20 flex items-center justify-center transition-colors"
        >
          {showRightPanel ? <ChevronRight className="w-4 h-4 text-horizon-accent" /> : <ChevronLeft className="w-4 h-4 text-horizon-accent" />}
        </button>

        {/* אזור עבודה מרכזי */}
        <div className="flex-1 flex flex-col overflow-hidden bg-horizon-dark">
          {selectedCustomer ? (
            <>
              {/* פרטי לקוח מהירים */}
              <div className="bg-horizon-card border-b border-horizon p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-horizon-text">
                      {selectedCustomer.business_name || selectedCustomer.full_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-horizon-accent">{selectedCustomer.email}</span>
                      <Badge className={selectedCustomer.customer_group === 'A' ? 'bg-[#32acc1]' : 'bg-[#fc9f67]'}>
                        קבוצה {selectedCustomer.customer_group}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSettingsModal(true)}
                    className="border-horizon text-horizon-accent"
                  >
                    <Settings className="w-4 h-4 ml-2" />
                    הגדרות לקוח
                  </Button>
                </div>
              </div>

              {/* טאבים */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-horizon-card border-b border-horizon px-3 py-2">
                  <TabsList className="bg-horizon-dark/50">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white"
                        >
                          <Icon className="w-4 h-4 ml-2" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                {/* תוכן הטאבים */}
                <div className="flex-1 overflow-auto">
                  <TabsContent value="files" className="h-full m-0 p-4">
                    <CustomerFileUploadManager customer={selectedCustomer} />
                  </TabsContent>

                  <TabsContent value="recommendations" className="h-full m-0 p-4">
                    <Card className="card-horizon">
                      <CardHeader>
                        <CardTitle className="text-horizon-text">המלצות</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-horizon-accent">אזור המלצות - בפיתוח</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="catalog" className="h-full m-0 p-4">
                    <Card className="card-horizon">
                      <CardHeader>
                        <CardTitle className="text-horizon-text">קטלוג מוצרים</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-horizon-accent">קטלוג מוצרים - בפיתוח</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="forecast" className="h-full m-0 p-4">
                    <Card className="card-horizon">
                      <CardHeader>
                        <CardTitle className="text-horizon-text">תוכנית עסקית</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-horizon-accent">תוכנית עסקית - בפיתוח</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="goals" className="h-full m-0 p-0">
                    <CustomerGoalsGantt customer={selectedCustomer} />
                  </TabsContent>

                  <TabsContent value="suppliers" className="h-full m-0 p-4">
                    <CustomerSuppliersTab customer={selectedCustomer} />
                  </TabsContent>

                  <TabsContent value="cashflow" className="h-full m-0 p-4">
                    <Card className="card-horizon">
                      <CardHeader>
                        <CardTitle className="text-horizon-text">תזרים מזומנים</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-horizon-accent">תזרים מזומנים - בפיתוח (ממתין לקבצי דוגמה)</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
                <p className="text-horizon-accent text-lg">בחר לקוח מהרשימה</p>
              </div>
            </div>
          )}
        </div>

        {/* כפתור כיווץ/הרחבה - שמאל */}
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className="w-6 bg-horizon-card border-r border-horizon hover:bg-horizon-primary/20 flex items-center justify-center transition-colors"
        >
          {showLeftPanel ? <ChevronLeft className="w-4 h-4 text-horizon-accent" /> : <ChevronRight className="w-4 h-4 text-horizon-accent" />}
        </button>

        {/* פאנל משימות - שמאל */}
        {showLeftPanel && selectedCustomer && (
          <div className="w-80 bg-horizon-card border-r border-horizon flex flex-col">
            <div className="p-4 border-b border-horizon">
              <h3 className="font-semibold text-horizon-text mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-horizon-primary" />
                משימות
              </h3>
            </div>

            <ScrollArea className="flex-1 p-4">
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* משימות להיום */}
                  {categorizedTasks.today.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-red-400" />
                        <h4 className="text-sm font-semibold text-red-400">היום ({categorizedTasks.today.length})</h4>
                      </div>
                      <div className="space-y-2">
                        {categorizedTasks.today.map(task => (
                          <TaskMiniCard key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* משימות השבוע */}
                  {categorizedTasks.thisWeek.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <h4 className="text-sm font-semibold text-blue-400">השבוע ({categorizedTasks.thisWeek.length})</h4>
                      </div>
                      <div className="space-y-2">
                        {categorizedTasks.thisWeek.map(task => (
                          <TaskMiniCard key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* משימות באיחור */}
                  {categorizedTasks.delayed.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <h4 className="text-sm font-semibold text-orange-400">באיחור ({categorizedTasks.delayed.length})</h4>
                      </div>
                      <div className="space-y-2">
                        {categorizedTasks.delayed.map(task => (
                          <TaskMiniCard key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* משימות עתידיות */}
                  {categorizedTasks.future.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-semibold text-purple-400">עתידיות ({categorizedTasks.future.length})</h4>
                      </div>
                      <div className="space-y-2">
                        {categorizedTasks.future.map(task => (
                          <TaskMiniCard key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* משימות שהושלמו */}
                  {categorizedTasks.completed.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <h4 className="text-sm font-semibold text-green-400">הושלמו ({categorizedTasks.completed.length})</h4>
                      </div>
                      <div className="space-y-2">
                        {categorizedTasks.completed.slice(0, 5).map(task => (
                          <TaskMiniCard key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}

                  {customerTasks.length === 0 && (
                    <div className="text-center py-8 text-horizon-accent text-sm">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      אין משימות ללקוח זה
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

// קומפוננטת כרטיס משימה מיני
function TaskMiniCard({ task }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'delayed': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="bg-horizon-dark border border-horizon rounded-lg p-2 hover:border-horizon-primary/50 transition-colors">
      <div className="flex items-start gap-2">
        {getStatusIcon(task.status)}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-horizon-text truncate">{task.name}</p>
          {task.end_date && (
            <p className="text-xs text-horizon-accent mt-1">
              {format(new Date(task.end_date), 'dd/MM/yyyy')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}