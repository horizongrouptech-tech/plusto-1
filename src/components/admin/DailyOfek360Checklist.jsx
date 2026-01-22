import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { 
  Target, Loader2, CheckCircle, Circle, MessageSquare, Edit2, 
  Plus, Trash2, Save, X, Calendar, TrendingUp, BarChart3,
  ChevronDown, ChevronUp, AlertCircle, Info
} from 'lucide-react';

// הגדרת סעיפי הצ'קליסט היומי - מבוסס על מודל אופק 360
const DAILY_CHECKLIST_CATEGORIES = [
  {
    id: 'cashflow',
    title: 'תזרים מזומנים',
    description: 'בדיקת מצב תזרים יומי, זיהוי בורות קרובים, תכנון תשלומים',
    icon: '💰',
    color: 'green'
  },
  {
    id: 'profitability',
    title: 'רווחיות',
    description: 'מעקב אחר מרווחים, בדיקת עלויות ומכירות',
    icon: '📈',
    color: 'blue'
  },
  {
    id: 'business_tree',
    title: 'עץ עסק',
    description: 'מעקב אחר מבנה ארגוני, תפקידים ותגמולים',
    icon: '🌳',
    color: 'purple'
  },
  {
    id: 'credit_funding',
    title: 'אשראי וגיוס',
    description: 'ניהול צרכי אשראי, מעקב אחר גיוסים',
    icon: '🏦',
    color: 'orange'
  },
  {
    id: 'budget',
    title: 'תקציב',
    description: 'בקרה תקציבית, תכנון מול ביצוע',
    icon: '📊',
    color: 'cyan'
  },
  {
    id: 'tax_accounting',
    title: 'מס וחשבונאות',
    description: 'מעקב מס, בקרה על רו"ח',
    icon: '📋',
    color: 'pink'
  },
  {
    id: 'collection_payments',
    title: 'גבייה ותשלומים',
    description: 'מעקב גביה, ניהול תשלומים',
    icon: '💳',
    color: 'indigo'
  },
  {
    id: 'profit_centers',
    title: 'מרכזי רווח',
    description: 'ניתוח הצעות ערך, תמחורים',
    icon: '🎯',
    color: 'amber'
  }
];

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// קומפוננטת סעיף בודד עם מצב רצוי/מצוי
function ChecklistItemCard({ item, category, onUpdate, isExpanded, onToggleExpand, isUpdating }) {
  const statusColors = {
    desired: 'bg-green-500/20 border-green-500/50 text-green-400',
    current: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    not_checked: 'bg-gray-500/20 border-gray-500/50 text-gray-400'
  };

  const categoryColors = {
    green: 'border-l-green-500',
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
    orange: 'border-l-orange-500',
    cyan: 'border-l-cyan-500',
    pink: 'border-l-pink-500',
    indigo: 'border-l-indigo-500',
    amber: 'border-l-amber-500'
  };

  const handleStatusChange = (newStatus) => {
    onUpdate(category.id, 'status', newStatus);
    // פתיחה אוטומטית של ההערות אם בחרו "מצב מצוי"
    if (newStatus === 'current' && !isExpanded) {
      onToggleExpand(category.id);
    }
  };

  return (
    <Card className={`bg-horizon-card border-horizon border-l-4 ${categoryColors[category.color]} transition-all hover:shadow-lg`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{category.icon}</span>
              <h4 className="font-semibold text-horizon-text">{category.title}</h4>
            </div>
            <p className="text-sm text-horizon-accent mb-3">{category.description}</p>
            
            {/* כפתורי מצב רצוי/מצוי עם הסבר */}
            <div className="flex gap-2 mb-3 items-center flex-wrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={item.status === 'desired' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('desired')}
                      disabled={isUpdating}
                      className={item.status === 'desired' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-500/50 text-green-400 hover:bg-green-500/10'}
                    >
                      {isUpdating && item.status === 'desired' ? (
                        <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 ml-1" />
                      )}
                      מצב רצוי
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-green-600 text-white">
                    <p className="max-w-xs">המצב האידיאלי שאליו אתה רוצה להגיע</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={item.status === 'current' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('current')}
                      disabled={isUpdating}
                      className={item.status === 'current' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10'}
                    >
                      {isUpdating && item.status === 'current' ? (
                        <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                      ) : (
                        <Circle className="w-4 h-4 ml-1" />
                      )}
                      מצב מצוי
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-blue-600 text-white">
                    <p className="max-w-xs">המצב הנוכחי שלך בתחום זה - תאר בהערות מה הסיטואציה כיום</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {item.status === 'current' && !item.notes && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs animate-pulse">
                  <AlertCircle className="w-3 h-3 ml-1" />
                  הוסף הערות
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand(category.id)}
            className="text-horizon-accent"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* שדה הערות מורחב */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-horizon">
            <Label className="text-horizon-accent text-sm mb-2 block">
              <MessageSquare className="w-4 h-4 inline ml-1" />
              {item.status === 'current' ? 'תאר את המצב הנוכחי בתחום זה' : `הערות עבור ${category.title}`}
            </Label>
            <Textarea
              value={item.notes || ''}
              onChange={(e) => onUpdate(category.id, 'notes', e.target.value)}
              placeholder={
                item.status === 'current' 
                  ? 'מה המצב הנוכחי? מה הבעיות? מה צריך לשפר?'
                  : `רשום הערות לגבי ${category.title}...`
              }
              className="bg-horizon-dark border-horizon text-horizon-text min-h-[80px]"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// קומפוננטת סיכום חודשי
function MonthlySummary({ checklistHistory, selectedMonth, selectedYear }) {
  const monthlyStats = useMemo(() => {
    if (!checklistHistory || checklistHistory.length === 0) {
      return { desiredPercentage: 0, totalDays: 0, desiredDays: 0, currentDays: 0, byCategory: {} };
    }

    // סינון רק ימי עבודה (לא שישי-שבת)
    const workDays = checklistHistory.filter(day => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      const month = date.getMonth();
      const year = date.getFullYear();
      return dayOfWeek !== 5 && dayOfWeek !== 6 && month === selectedMonth && year === selectedYear;
    });

    const byCategory = {};
    DAILY_CHECKLIST_CATEGORIES.forEach(cat => {
      const categoryDays = workDays.filter(day => {
        const catItem = day.items?.find(i => i.category_id === cat.id);
        return catItem?.status === 'desired';
      });
      byCategory[cat.id] = {
        desired: categoryDays.length,
        total: workDays.length,
        percentage: workDays.length > 0 ? Math.round((categoryDays.length / workDays.length) * 100) : 0
      };
    });

    const totalDesiredChecks = workDays.reduce((sum, day) => {
      return sum + (day.items?.filter(i => i.status === 'desired').length || 0);
    }, 0);

    const totalPossibleChecks = workDays.length * DAILY_CHECKLIST_CATEGORIES.length;
    const overallPercentage = totalPossibleChecks > 0 ? Math.round((totalDesiredChecks / totalPossibleChecks) * 100) : 0;

    return {
      desiredPercentage: overallPercentage,
      totalDays: workDays.length,
      desiredDays: totalDesiredChecks,
      currentDays: totalPossibleChecks - totalDesiredChecks,
      byCategory
    };
  }, [checklistHistory, selectedMonth, selectedYear]);

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-horizon-primary" />
          סיכום חודשי - {MONTH_NAMES[selectedMonth]} {selectedYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* אחוז כללי */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-horizon-primary mb-2">
            {monthlyStats.desiredPercentage}%
          </div>
          <p className="text-horizon-accent">מצב רצוי מתוך ימי העבודה</p>
          <p className="text-sm text-horizon-accent mt-1">
            ({monthlyStats.totalDays} ימי עבודה, ללא שישי-שבת)
          </p>
        </div>

        {/* פירוט לפי קטגוריה */}
        <div className="space-y-3">
          {DAILY_CHECKLIST_CATEGORIES.map(cat => {
            const stats = monthlyStats.byCategory[cat.id] || { percentage: 0, desired: 0, total: 0 };
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-xl w-8">{cat.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-horizon-text">{cat.title}</span>
                    <span className="text-sm font-semibold text-horizon-primary">{stats.percentage}%</span>
                  </div>
                  <div className="w-full bg-horizon-dark rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-horizon-primary to-horizon-secondary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailyOfek360Checklist({ customer, isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('daily');
  const [expandedItems, setExpandedItems] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [updatingItemId, setUpdatingItemId] = useState(null);
  
  // בדיקת הרשאות: רק אדמין ומנהל מחלקה יכולים לערוך
  const canEdit = currentUser?.role === 'admin' || currentUser?.user_type === 'department_head';

  const today = new Date().toISOString().split('T')[0];

  // טעינת צ'קליסט יומי
  const { data: todayChecklist, isLoading: isLoadingToday } = useQuery({
    queryKey: ['dailyChecklist360', customer?.email, today],
    queryFn: async () => {
      const checklists = await base44.entities.DailyChecklist360.filter({
        customer_email: customer.email,
        date: today
      });

      if (checklists && checklists.length > 0) {
        return checklists[0];
      }

      // יצירת צ'קליסט חדש
      const newChecklist = {
        customer_email: customer.email,
        date: today,
        items: DAILY_CHECKLIST_CATEGORIES.map(cat => ({
          category_id: cat.id,
          status: 'not_checked',
          notes: ''
        })),
        general_notes: '',
        created_by: currentUser?.email
      };

      const created = await base44.entities.DailyChecklist360.create(newChecklist);
      return created;
    },
    enabled: isOpen && !!customer?.email
  });

  // טעינת היסטוריית צ'קליסט לחודש הנבחר
  const { data: checklistHistory = [] } = useQuery({
    queryKey: ['dailyChecklistHistory360', customer?.email, selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
      
      return await base44.entities.DailyChecklist360.filter({
        customer_email: customer.email,
        date: { $gte: startDate, $lte: endDate }
      });
    },
    enabled: isOpen && !!customer?.email && activeTab === 'monthly'
  });

  // Mutation לעדכון סעיף בצ'קליסט עם optimistic updates
  const updateItemMutation = useMutation({
    mutationFn: async ({ categoryId, field, value }) => {
      if (!todayChecklist) return;

      const updatedItems = todayChecklist.items.map(item => {
        if (item.category_id === categoryId) {
          return { ...item, [field]: value };
        }
        return item;
      });

      await base44.entities.DailyChecklist360.update(todayChecklist.id, {
        items: updatedItems,
        last_updated_by: currentUser?.email
      });

      return { categoryId, field, value, updatedItems };
    },
    onMutate: async ({ categoryId, field, value }) => {
      // ביטול queries קודמים
      await queryClient.cancelQueries(['dailyChecklist360', customer?.email, today]);
      
      // שמירת snapshot של הנתונים הקודמים
      const previousChecklist = queryClient.getQueryData(['dailyChecklist360', customer?.email, today]);
      
      // עדכון אופטימיסטי של ה-cache
      queryClient.setQueryData(['dailyChecklist360', customer?.email, today], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map(item => {
            if (item.category_id === categoryId) {
              return { ...item, [field]: value };
            }
            return item;
          })
        };
      });

      setUpdatingItemId(categoryId);
      
      return { previousChecklist };
    },
    onSuccess: (data) => {
      if (data?.field === 'status') {
        toast.success('הסטטוס עודכן בהצלחה', {
          description: `הסעיף עודכן ל${data.value === 'desired' ? 'מצב רצוי' : 'מצב מצוי'}`,
          duration: 2000
        });
      }
    },
    onError: (error, variables, context) => {
      // שחזור הנתונים הקודמים במקרה של שגיאה
      if (context?.previousChecklist) {
        queryClient.setQueryData(
          ['dailyChecklist360', customer?.email, today],
          context.previousChecklist
        );
      }
      console.error('Error updating checklist item:', error);
      toast.error('שגיאה בעדכון הסעיף', {
        description: 'נסה שוב',
        duration: 3000
      });
    },
    onSettled: () => {
      setUpdatingItemId(null);
      queryClient.invalidateQueries(['dailyChecklist360', customer?.email, today]);
    }
  });

  const handleUpdateItem = (categoryId, field, value) => {
    updateItemMutation.mutate({ categoryId, field, value });
  };

  // Mutation לשמירת הערות כלליות
  const saveNotesMutation = useMutation({
    mutationFn: async (notes) => {
      if (!todayChecklist) return;

      await base44.entities.DailyChecklist360.update(todayChecklist.id, {
        general_notes: notes,
        last_updated_by: currentUser?.email
      });

      return notes;
    },
    onSuccess: () => {
      toast.success('ההערות נשמרו בהצלחה', { duration: 2000 });
      queryClient.invalidateQueries(['dailyChecklist360', customer?.email, today]);
    },
    onError: (error) => {
      console.error('Error saving notes:', error);
      toast.error('שגיאה בשמירת הערות', {
        description: 'נסה שוב',
        duration: 3000
      });
    }
  });

  const handleSaveGeneralNotes = (notes) => {
    saveNotesMutation.mutate(notes);
  };

  const toggleExpand = (categoryId) => {
    setExpandedItems(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // חישוב התקדמות יומית
  const dailyProgress = useMemo(() => {
    if (!todayChecklist?.items) return { desired: 0, current: 0, percentage: 0 };
    
    const desired = todayChecklist.items.filter(i => i.status === 'desired').length;
    const total = todayChecklist.items.length;
    
    return {
      desired,
      current: todayChecklist.items.filter(i => i.status === 'current').length,
      percentage: total > 0 ? Math.round((desired / total) * 100) : 0
    };
  }, [todayChecklist]);

  if (isLoadingToday) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl bg-horizon-dark border-horizon" dir="rtl">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-horizon-primary ml-3" />
            <span className="text-horizon-text">טוען צ'קליסט יומי...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text flex items-center gap-3">
            <Target className="w-6 h-6 text-horizon-primary" />
            צ'קליסט יומי - אופק 360
          </DialogTitle>
          <p className="text-sm text-horizon-accent mt-2">
            {customer?.business_name || customer?.full_name} | {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-horizon-card">
            <TabsTrigger 
              value="daily" 
              className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white"
            >
              <Calendar className="w-4 h-4 ml-2" />
              צ'קליסט יומי
            </TabsTrigger>
            <TabsTrigger 
              value="monthly"
              className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4 ml-2" />
              סיכום חודשי
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4 space-y-4">
            {/* הסבר המושגים */}
            <Card className="bg-gradient-to-l from-blue-500/10 to-purple-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-2">
                    <p className="text-horizon-text font-semibold">הסבר המושגים:</p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">רצוי</Badge>
                        <span className="text-horizon-accent">= המצב האידיאלי שאליך אתה רוצה להגיע</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">מצוי</Badge>
                        <span className="text-horizon-accent">= המצב הנוכחי שלך (תאר בהערות מה הסיטואציה כיום)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* כרטיס התקדמות יומית */}
            <Card className="card-horizon bg-gradient-to-l from-horizon-primary/10 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-horizon-text font-semibold">התקדמות יומית</span>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      <CheckCircle className="w-3 h-3 ml-1" />
                      רצוי: {dailyProgress.desired}
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                      <Circle className="w-3 h-3 ml-1" />
                      מצוי: {dailyProgress.current}
                    </Badge>
                    <span className="text-2xl font-bold text-horizon-primary">{dailyProgress.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-horizon-card rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-horizon-primary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${dailyProgress.percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* סעיפי הצ'קליסט */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DAILY_CHECKLIST_CATEGORIES.map(category => {
                const item = todayChecklist?.items?.find(i => i.category_id === category.id) || {
                  category_id: category.id,
                  status: 'not_checked',
                  notes: ''
                };
                
                return (
                  <ChecklistItemCard
                    key={category.id}
                    item={item}
                    category={category}
                    onUpdate={handleUpdateItem}
                    isExpanded={expandedItems.includes(category.id)}
                    onToggleExpand={toggleExpand}
                    isUpdating={updatingItemId === category.id}
                  />
                );
              })}
            </div>

            {/* הערות כלליות */}
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
                  <MessageSquare className="w-4 h-4 text-horizon-primary" />
                  הערות ותובנות יומיות כלליות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  defaultValue={todayChecklist?.general_notes || todayChecklist?.notes || ''}
                  onBlur={(e) => handleSaveGeneralNotes(e.target.value)}
                  placeholder="רשום כאן תובנות כלליות, בעיות שזוהו, או דברים שצריך לעקוב אחריהם..."
                  className="bg-horizon-card border-horizon text-horizon-text min-h-[100px]"
                />
                {saveNotesMutation.isPending && (
                  <div className="flex items-center gap-2 text-horizon-accent text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    שומר...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* הודעת השלמה */}
            {dailyProgress.percentage === 100 && (
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
                  <h3 className="text-xl font-bold text-green-400 mb-2">כל הסעיפים במצב רצוי!</h3>
                  <p className="text-horizon-accent">
                    מצוין! כל הבקרות היומיות הושלמו בהצלחה.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="mt-4 space-y-4">
            {/* בורר חודש ושנה */}
            <Card className="card-horizon">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-horizon-accent">חודש:</Label>
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-32 bg-horizon-card border-horizon text-horizon-text">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((name, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-horizon-accent">שנה:</Label>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-24 bg-horizon-card border-horizon text-horizon-text">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* סיכום חודשי */}
            <MonthlySummary 
              checklistHistory={checklistHistory}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />

            {/* היסטוריית ימים */}
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-horizon-primary" />
                  היסטוריית ימים
                </CardTitle>
              </CardHeader>
              <CardContent>
                {checklistHistory.length === 0 ? (
                  <div className="text-center py-8 text-horizon-accent">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>אין נתונים לחודש זה</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {checklistHistory.map((day, idx) => {
                      const desiredCount = day.items?.filter(i => i.status === 'desired').length || 0;
                      const totalCount = day.items?.length || DAILY_CHECKLIST_CATEGORIES.length;
                      const percentage = Math.round((desiredCount / totalCount) * 100);
                      const date = new Date(day.date);
                      const dayOfWeek = date.getDay();
                      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                      
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isWeekend ? 'bg-gray-500/10 opacity-50' : 'bg-horizon-card'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-horizon-text font-medium">
                              {date.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' })}
                            </span>
                            {isWeekend && (
                              <Badge variant="outline" className="text-gray-400 border-gray-400 text-xs">
                                סוף שבוע
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-horizon-dark rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  percentage >= 75 ? 'bg-green-500' : 
                                  percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${
                              percentage >= 75 ? 'text-green-400' : 
                              percentage >= 50 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}