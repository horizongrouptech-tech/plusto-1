import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Search,
  Settings,
  FolderOpen,
  Lightbulb,
  Package,
  FileText,
  Target,
  Truck,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// קומפוננטת כרטיס לקוח
function CustomerCard({ customer, isSelected, onClick }) {
  const groupColor = customer.customer_group === 'A' 
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
    : 'bg-purple-500/20 text-purple-400 border-purple-500/30';

  return (
    <div 
      onClick={onClick}
      className={`p-4 border-b border-horizon cursor-pointer transition-all hover:bg-horizon-card/50 ${
        isSelected ? 'bg-horizon-primary/10 border-r-4 border-r-horizon-primary' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-horizon-text truncate">
            {customer.business_name || 'ללא שם עסק'}
          </h3>
          <p className="text-sm text-horizon-accent truncate">
            {customer.full_name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={`${groupColor} text-xs`}>
            קבוצה {customer.customer_group || '-'}
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-horizon-accent hover:text-horizon-primary"
            onClick={(e) => {
              e.stopPropagation();
              // פתיחת הגדרות לקוח
            }}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// קומפוננטת משימה
function TaskItem({ task, onMarkDone }) {
  const statusColors = {
    open: 'border-r-gray-400',
    in_progress: 'border-r-blue-400',
    done: 'border-r-green-400',
    delayed: 'border-r-red-400'
  };

  const statusLabels = {
    open: 'לביצוע',
    in_progress: 'בביצוע',
    done: 'הושלם',
    delayed: 'באיחור'
  };

  const isOverdue = task.end_date && new Date(task.end_date) < new Date() && task.status !== 'done';

  return (
    <div className={`p-3 bg-horizon-card/50 rounded-lg border-r-4 ${statusColors[task.status]} mb-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-horizon-text">{task.name}</p>
          {task.end_date && (
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 text-horizon-accent" />
              <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-horizon-accent'}`}>
                {format(new Date(task.end_date), 'dd/MM/yy')}
              </span>
            </div>
          )}
        </div>
        {task.status !== 'done' && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-green-400 hover:bg-green-500/10"
            onClick={() => onMarkDone(task.id)}
          >
            <CheckCircle2 className="w-3 h-3 ml-1" />
            סיים
          </Button>
        )}
      </div>
    </div>
  );
}

export default function TestCRMDashboard() {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('files');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  const queryClient = useQueryClient();

  // שליפת המשתמש הנוכחי
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // שליפת כל הלקוחות המשויכים למנהל הכספים
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['crmCustomers', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      
      // מנהלי כספים רואים רק לקוחות משויכים אליהם
      // אדמינים רואים הכל
      const filter = currentUser.role === 'admin' 
        ? { status: 'approved', is_active: true }
        : { assigned_financial_manager_email: currentUser.email, status: 'approved', is_active: true };
      
      return base44.entities.OnboardingRequest.filter(filter, 'business_name');
    },
    enabled: !!currentUser?.email
  });

  // סינון לקוחות
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = !searchTerm || 
        customer.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGroup = groupFilter === 'all' || customer.customer_group === groupFilter;
      
      return matchesSearch && matchesGroup;
    });
  }, [customers, searchTerm, groupFilter]);

  // בחירת לקוח ראשון אם לא נבחר
  useEffect(() => {
    if (!selectedCustomerId && filteredCustomers.length > 0) {
      setSelectedCustomerId(filteredCustomers[0].id);
    }
  }, [filteredCustomers, selectedCustomerId]);

  // הלקוח הנבחר
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // שליפת משימות הלקוח הנבחר
  const { data: customerTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['customerTasks', selectedCustomer?.email],
    queryFn: () => {
      if (!selectedCustomer?.email) return [];
      return base44.entities.CustomerGoal.filter(
        { customer_email: selectedCustomer.email, is_active: true },
        'end_date'
      );
    },
    enabled: !!selectedCustomer?.email
  });

  // סינון משימות לפי תאריך התחלה
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return customerTasks.filter(task => {
      // אם יש תאריך התחלה ועדיין לא הגיע - לא להציג
      if (task.start_date) {
        const startDate = new Date(task.start_date);
        startDate.setHours(0, 0, 0, 0);
        if (startDate > today) return false;
      }
      return true;
    });
  }, [customerTasks]);

  // קיבוץ משימות לפי סטטוס
  const tasksByStatus = useMemo(() => {
    const result = {
      today: [],
      upcoming: [],
      overdue: [],
      done: []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach(task => {
      if (task.status === 'done') {
        result.done.push(task);
      } else if (task.status === 'delayed') {
        result.overdue.push(task);
      } else if (task.end_date) {
        const endDate = new Date(task.end_date);
        endDate.setHours(0, 0, 0, 0);
        
        if (endDate < today) {
          result.overdue.push(task);
        } else if (endDate.getTime() === today.getTime()) {
          result.today.push(task);
        } else {
          result.upcoming.push(task);
        }
      } else {
        result.upcoming.push(task);
      }
    });

    return result;
  }, [filteredTasks]);

  // סימון משימה כהושלמה
  const handleMarkDone = async (taskId) => {
    try {
      await base44.entities.CustomerGoal.update(taskId, { status: 'done' });
      queryClient.invalidateQueries(['customerTasks', selectedCustomer?.email]);
    } catch (error) {
      console.error('Error marking task as done:', error);
    }
  };

  // הוספת משימה מהירה
  const handleQuickAddTask = async () => {
    if (!selectedCustomer?.email) return;
    
    const taskName = prompt('שם המשימה:');
    if (!taskName) return;

    try {
      await base44.entities.CustomerGoal.create({
        customer_email: selectedCustomer.email,
        name: taskName,
        status: 'open',
        task_type: 'one_time',
        is_active: true
      });
      queryClient.invalidateQueries(['customerTasks', selectedCustomer?.email]);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-horizon-dark">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-horizon-dark overflow-hidden" dir="rtl">
      {/* פאנל לקוחות - צד ימין */}
      <div className={`transition-all duration-300 border-l border-horizon bg-horizon-dark flex flex-col ${
        rightPanelCollapsed ? 'w-12' : 'w-72'
      }`}>
        {/* כפתור כיווץ */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="absolute top-1/2 -left-3 z-10 h-6 w-6 rounded-full bg-horizon-card border border-horizon shadow-lg"
        >
          {rightPanelCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </Button>

        {!rightPanelCollapsed && (
          <>
            {/* כותרת וסינון */}
            <div className="p-4 border-b border-horizon">
              <h2 className="font-bold text-lg text-horizon-text mb-3">לקוחות</h2>
              
              {/* חיפוש */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-horizon-accent" />
                <Input
                  placeholder="חיפוש לקוח..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 bg-horizon-card border-horizon text-horizon-text"
                />
              </div>

              {/* סינון קבוצות */}
              <div className="flex gap-1">
                <Button
                  variant={groupFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGroupFilter('all')}
                  className={groupFilter === 'all' ? 'bg-horizon-primary text-white' : 'text-horizon-accent'}
                >
                  הכל
                </Button>
                <Button
                  variant={groupFilter === 'A' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGroupFilter('A')}
                  className={groupFilter === 'A' ? 'bg-blue-500 text-white' : 'text-horizon-accent'}
                >
                  קבוצה A
                </Button>
                <Button
                  variant={groupFilter === 'B' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGroupFilter('B')}
                  className={groupFilter === 'B' ? 'bg-purple-500 text-white' : 'text-horizon-accent'}
                >
                  קבוצה B
                </Button>
              </div>
            </div>

            {/* רשימת לקוחות */}
            <ScrollArea className="flex-1">
              {filteredCustomers.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  isSelected={customer.id === selectedCustomerId}
                  onClick={() => setSelectedCustomerId(customer.id)}
                />
              ))}

              {filteredCustomers.length === 0 && (
                <div className="p-4 text-center text-horizon-accent">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>לא נמצאו לקוחות</p>
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </div>

      {/* לוח עבודה - מרכז */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* כותרת לוח עבודה */}
        <div className="p-4 border-b border-horizon bg-horizon-card/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-horizon-text">לוח עבודה</h1>
              {selectedCustomer && (
                <p className="text-sm text-horizon-accent">
                  {selectedCustomer.business_name} - {selectedCustomer.full_name}
                </p>
              )}
            </div>
            
            {selectedCustomer && (
              <Link to={createPageUrl(`CustomerManagement?id=${selectedCustomer.id}`)}>
                <Button variant="outline" className="border-horizon text-horizon-text">
                  <ArrowRight className="w-4 h-4 ml-2" />
                  ניהול מלא
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* טאבים */}
        {selectedCustomer ? (
          <div className="flex-1 overflow-hidden p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="bg-horizon-card/50 p-1 justify-start mb-4">
                <TabsTrigger value="files" className="data-[state=active]:bg-horizon-primary">
                  <FolderOpen className="w-4 h-4 ml-2" />
                  קבצים
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="data-[state=active]:bg-horizon-primary">
                  <Lightbulb className="w-4 h-4 ml-2" />
                  המלצות
                </TabsTrigger>
                <TabsTrigger value="catalog" className="data-[state=active]:bg-horizon-primary">
                  <Package className="w-4 h-4 ml-2" />
                  קטלוג
                </TabsTrigger>
                <TabsTrigger value="plan" className="data-[state=active]:bg-horizon-primary">
                  <FileText className="w-4 h-4 ml-2" />
                  תוכנית עסקית
                </TabsTrigger>
                <TabsTrigger value="goals" className="data-[state=active]:bg-horizon-primary">
                  <Target className="w-4 h-4 ml-2" />
                  יעדים
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="data-[state=active]:bg-horizon-primary">
                  <Truck className="w-4 h-4 ml-2" />
                  ספקים
                </TabsTrigger>
                <TabsTrigger value="cashflow" className="data-[state=active]:bg-horizon-primary">
                  <DollarSign className="w-4 h-4 ml-2" />
                  תזרים
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto">
                <TabsContent value="files" className="h-full m-0">
                  <Card className="card-horizon h-full">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">קבצים ומסמכים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-horizon-accent">
                        <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>אזור ניהול קבצים של הלקוח</p>
                        <p className="text-sm mt-2">בקרוב: העלאה וצפייה בקבצים</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recommendations" className="h-full m-0">
                  <Card className="card-horizon h-full">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">המלצות</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-horizon-accent">
                        <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>אזור המלצות עסקיות</p>
                        <p className="text-sm mt-2">בקרוב: יצירה וניהול המלצות</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="catalog" className="h-full m-0">
                  <Card className="card-horizon h-full">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">קטלוג מוצרים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-horizon-accent">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>אזור ניהול קטלוג</p>
                        <p className="text-sm mt-2">בקרוב: קטלוג מוצרים מלא</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="plan" className="h-full m-0">
                  <Card className="card-horizon h-full">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">תוכנית עסקית</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-horizon-accent">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>אזור תוכנית עסקית</p>
                        <p className="text-sm mt-2">בקרוב: תחזיות ותוכניות</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="goals" className="h-full m-0">
                  <Card className="card-horizon h-full">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">יעדים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-horizon-accent">
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>אזור ניהול יעדים</p>
                        <p className="text-sm mt-2">בקרוב: גאנט יעדים מלא</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="suppliers" className="h-full m-0">
                  <Card className="card-horizon h-full">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">ספקים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-horizon-accent">
                        <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>אזור ניהול ספקים</p>
                        <p className="text-sm mt-2">בקרוב: ניתוח ספקים</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="cashflow" className="h-full m-0">
                  <Card className="card-horizon h-full">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">תזרים מזומנים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-horizon-accent">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>אזור תזרים מזומנים</p>
                        <p className="text-sm mt-2">בקרוב: ניתוח תזרים</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-horizon-accent">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">בחר לקוח כדי להתחיל</p>
            </div>
          </div>
        )}
      </div>

      {/* פאנל משימות - צד שמאל */}
      <div className={`transition-all duration-300 border-r border-horizon bg-horizon-dark flex flex-col ${
        leftPanelCollapsed ? 'w-12' : 'w-80'
      }`}>
        {/* כפתור כיווץ */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          className="absolute top-1/2 -right-3 z-10 h-6 w-6 rounded-full bg-horizon-card border border-horizon shadow-lg"
        >
          {leftPanelCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </Button>

        {!leftPanelCollapsed && selectedCustomer && (
          <>
            {/* כותרת משימות */}
            <div className="p-4 border-b border-horizon">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-horizon-text">משימות</h2>
                <Button 
                  size="sm" 
                  className="btn-horizon-primary h-8"
                  onClick={handleQuickAddTask}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף
                </Button>
              </div>
            </div>

            {/* רשימת משימות */}
            <ScrollArea className="flex-1 p-4">
              {tasksLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
                </div>
              ) : (
                <>
                  {/* היום */}
                  {tasksByStatus.today.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold text-blue-400">היום</span>
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                          {tasksByStatus.today.length}
                        </Badge>
                      </div>
                      {tasksByStatus.today.map(task => (
                        <TaskItem key={task.id} task={task} onMarkDone={handleMarkDone} />
                      ))}
                    </div>
                  )}

                  {/* באיחור */}
                  {tasksByStatus.overdue.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-semibold text-red-400">באיחור</span>
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          {tasksByStatus.overdue.length}
                        </Badge>
                      </div>
                      {tasksByStatus.overdue.map(task => (
                        <TaskItem key={task.id} task={task} onMarkDone={handleMarkDone} />
                      ))}
                    </div>
                  )}

                  {/* בקרוב */}
                  {tasksByStatus.upcoming.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-horizon-accent" />
                        <span className="text-sm font-semibold text-horizon-accent">בקרוב</span>
                        <Badge className="bg-horizon-card text-horizon-accent text-xs">
                          {tasksByStatus.upcoming.length}
                        </Badge>
                      </div>
                      {tasksByStatus.upcoming.map(task => (
                        <TaskItem key={task.id} task={task} onMarkDone={handleMarkDone} />
                      ))}
                    </div>
                  )}

                  {/* הושלמו */}
                  {tasksByStatus.done.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-green-400">הושלמו</span>
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          {tasksByStatus.done.length}
                        </Badge>
                      </div>
                      {tasksByStatus.done.slice(0, 5).map(task => (
                        <TaskItem key={task.id} task={task} onMarkDone={handleMarkDone} />
                      ))}
                    </div>
                  )}

                  {filteredTasks.length === 0 && (
                    <div className="text-center py-8 text-horizon-accent">
                      <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">אין משימות</p>
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}