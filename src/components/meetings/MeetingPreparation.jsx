import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  ClipboardList, Calendar, CheckCircle2, Circle, AlertCircle,
  FileText, Target, Loader2, ChevronDown, ChevronUp, ListChecks,
  Clock, TrendingUp, AlertTriangle, ArrowLeft, Plus, RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays, isAfter } from 'date-fns';
import { he } from 'date-fns/locale';

// משימות דפולטיביות לפגישה ראשונה
const DEFAULT_FIRST_MEETING_TASKS = [
  { id: 'docs', title: 'איסוף מסמכים ראשוניים', description: 'דוחות כספיים, רווח והפסד, מאזן' },
  { id: 'questionnaire', title: 'שאלון הכרות', description: 'למלא שאלון הכרות עסקית מלא' },
  { id: 'suppliers', title: 'מיפוי ספקים', description: 'רשימת ספקים עיקריים ותנאי תשלום' },
  { id: 'revenue', title: 'מבנה ההכנסות', description: 'מקורות הכנסה עיקריים' },
  { id: 'bank', title: 'חשבונות בנק', description: 'גישה או דוחות מחשבונות הבנק' },
  { id: 'cashflow', title: 'סקירת תזרים', description: 'מצב התזרים הנוכחי' },
  { id: 'goals', title: 'יעדים ראשוניים', description: 'קביעת יעדים לעבודה משותפת' },
  { id: 'catalog', title: 'קטלוג מוצרים', description: 'יצירת או העלאת קטלוג' }
];

// משימות דפולטיביות לפגישה חוזרת
const DEFAULT_RECURRING_MEETING_TASKS = [
  { id: 'review_tasks', title: 'סקירת משימות פתוחות', description: 'לעבור על סטטוס המשימות מהפגישה הקודמת' },
  { id: 'cashflow_status', title: 'עדכון מצב תזרים', description: 'בדיקת מצב התזרים והתראות' },
  { id: 'kpis', title: 'בדיקת יעדים', description: 'התקדמות מול יעדים שנקבעו' },
  { id: 'issues', title: 'בעיות וחסמים', description: 'זיהוי בעיות חדשות שצריך לטפל בהן' },
  { id: 'next_steps', title: 'צעדים הבאים', description: 'הגדרת משימות לתקופה הקרובה' }
];

export default function MeetingPreparation({ customer, meetings = [], currentUser, onCreateSummary }) {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState(['previousMeeting', 'tasks', 'checklist', 'alerts']);
  const [checkedTasks, setCheckedTasks] = useState({});
  const [isMarkingFirstMeeting, setIsMarkingFirstMeeting] = useState(false);

  // בדיקה אם יש פגישה ראשונה (לפי סוג הפגישה או אם אין פגישות בכלל)
  const hasFirstMeeting = meetings.some(m => m.meeting_type === 'first');
  const isFirstMeeting = meetings.length === 0 && !hasFirstMeeting;
  const lastMeeting = meetings[0]; // כבר ממוינים לפי תאריך יורד

  // טעינת משימות פתוחות של הלקוח
  const { data: openTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['customerOpenTasks', customer?.email],
    queryFn: async () => {
      const tasks = await base44.entities.CustomerGoal.filter({
        customer_email: customer.email,
        is_active: true,
        status: { $in: ['open', 'in_progress'] }
      }, '-created_date');
      
      // סינון משימות שאינן סיכומי פגישות או צ'קליסטים
      return tasks.filter(t => 
        !['meeting_summary', 'daily_checklist', 'daily_checklist_360'].includes(t.task_type)
      );
    },
    enabled: !!customer?.email
  });

  // טעינת משימות שבאיחור
  const delayedTasks = useMemo(() => {
    const today = new Date();
    return openTasks.filter(task => {
      if (!task.end_date) return false;
      const endDate = new Date(task.end_date);
      return isAfter(today, endDate);
    });
  }, [openTasks]);

  // טעינת התראות תזרים
  const { data: cashflowAlerts = [] } = useQuery({
    queryKey: ['cashflowAlerts', customer?.email],
    queryFn: async () => {
      try {
        const cashflow = await base44.entities.CashFlow?.filter({
          customer_email: customer.email
        }, '-date');
        
        // חישוב התראות פשוט - בדיקה אם יש יתרה שלילית
        const alerts = [];
        if (cashflow && cashflow.length > 0) {
          const totalCredit = cashflow.reduce((sum, cf) => sum + (cf.credit || 0), 0);
          const totalDebit = cashflow.reduce((sum, cf) => sum + (cf.debit || 0), 0);
          const balance = totalCredit - totalDebit;
          
          if (balance < 0) {
            alerts.push({
              type: 'negative_balance',
              message: `יתרה שלילית: ₪${Math.abs(balance).toLocaleString()}`
            });
          }
        }
        return alerts;
      } catch (e) {
        return [];
      }
    },
    enabled: !!customer?.email && !isFirstMeeting
  });

  // חישוב משימות שהושלמו מאז הפגישה האחרונה
  const tasksSinceLastMeeting = useMemo(() => {
    if (!lastMeeting) return [];
    
    return openTasks.filter(task => {
      const taskDate = new Date(task.updated_date || task.created_date);
      const meetingDate = new Date(lastMeeting.meeting_date);
      return taskDate >= meetingDate;
    });
  }, [openTasks, lastMeeting]);

  // סימון "פגישה ראשונה הושלמה"
  const handleMarkFirstMeetingComplete = async () => {
    setIsMarkingFirstMeeting(true);
    try {
      // יצירת סיכום פגישה ראשונה ריק
      await base44.entities.CustomerGoal.create({
        customer_email: customer.email,
        name: `פגישה ראשונה - ${format(new Date(), 'dd/MM/yyyy')}`,
        task_type: 'meeting_summary',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        notes: 'פגישה ראשונה הושלמה (סומן ידנית)',
        assignee_email: currentUser?.email,
        status: 'done',
        is_active: true,
        priority: 'high'
      });
      
      queryClient.invalidateQueries(['customerMeetings', customer.email]);
    } catch (error) {
      console.error('Error marking first meeting:', error);
      alert('שגיאה בסימון פגישה ראשונה');
    } finally {
      setIsMarkingFirstMeeting(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleTask = (taskId) => {
    setCheckedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { label: 'פתוח', className: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
      in_progress: { label: 'בביצוע', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
      done: { label: 'הושלם', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
      delayed: { label: 'באיחור', className: 'bg-red-500/20 text-red-400 border-red-500/50' }
    };
    const config = statusConfig[status] || statusConfig.open;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // תצוגה לפגישה ראשונה
  if (isFirstMeeting) {
    return (
      <div className="space-y-4">
        <Card className="card-horizon bg-gradient-to-l from-purple-500/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-horizon-text">הכנה לפגישה ראשונה</h3>
                  <p className="text-sm text-horizon-accent">זו תהיה הפגישה הראשונה עם הלקוח</p>
                </div>
              </div>
              <Button 
                onClick={handleMarkFirstMeetingComplete}
                disabled={isMarkingFirstMeeting}
                variant="outline"
                className="border-green-500 text-green-400 hover:bg-green-500/10"
              >
                {isMarkingFirstMeeting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    פגישה ראשונה הושלמה
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('checklist')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
                <ListChecks className="w-5 h-5 text-horizon-primary" />
                צ'קליסט לפני הפגישה הראשונה
              </CardTitle>
              {expandedSections.includes('checklist') ? (
                <ChevronUp className="w-5 h-5 text-horizon-accent" />
              ) : (
                <ChevronDown className="w-5 h-5 text-horizon-accent" />
              )}
            </div>
          </CardHeader>
          {expandedSections.includes('checklist') && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {DEFAULT_FIRST_MEETING_TASKS.map((task, index) => (
                  <div 
                    key={task.id || index}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                      checkedTasks[task.id || index] 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : 'bg-horizon-card border border-horizon'
                    }`}
                  >
                    <Checkbox
                      checked={checkedTasks[task.id || index] || false}
                      onCheckedChange={() => toggleTask(task.id || index)}
                      className="mt-1 border-horizon-primary data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          checkedTasks[task.id || index] 
                            ? 'line-through text-horizon-accent' 
                            : 'text-horizon-text'
                        }`}>
                          {task.title}
                        </span>
                        {checkedTasks[task.id || index] && (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-horizon-accent mt-1">{task.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-horizon-card rounded-lg">
                <p className="text-sm text-horizon-accent">
                  ✅ {Object.values(checkedTasks).filter(Boolean).length} מתוך {DEFAULT_FIRST_MEETING_TASKS.length} משימות הושלמו
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* כפתור יצירת סיכום */}
        <Card className="card-horizon bg-gradient-to-l from-horizon-primary/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-horizon-accent">
                לאחר הפגישה, צור סיכום פגישה עם כל המידע החשוב
              </div>
              <Button onClick={onCreateSummary} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                צור סיכום פגישה
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // טעינת נתונים דינמיים לפגישה החוזרת
  const { data: cashflowData } = useQuery({
    queryKey: ['cashflowForMeeting', customer?.email],
    queryFn: async () => {
      try {
        const cashflow = await base44.entities.CashFlow?.filter({
          customer_email: customer.email
        }, '-date');
        
        if (!cashflow || cashflow.length === 0) return null;
        
        // חישוב יתרה מצטברת
        let balance = 0;
        const sorted = [...cashflow].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(cf => {
          balance += (cf.credit || 0) - (cf.debit || 0);
        });
        
        return {
          totalEntries: cashflow.length,
          balance: balance,
          lastEntryDate: cashflow[0]?.date
        };
      } catch (e) {
        return null;
      }
    },
    enabled: !!customer?.email && !isFirstMeeting
  });

  // טעינת יעדים
  const { data: goals = [] } = useQuery({
    queryKey: ['customerGoalsForMeeting', customer?.email],
    queryFn: async () => {
      try {
        const goals = await base44.entities.CustomerGoal.filter({
          customer_email: customer.email,
          is_active: true,
          task_type: { $ne: 'meeting_summary' }
        }, '-created_date');
        return goals.slice(0, 10);
      } catch (e) {
        return [];
      }
    },
    enabled: !!customer?.email && !isFirstMeeting
  });

  // תצוגה לפגישות המשך
  return (
    <div className="space-y-4">
      {/* כרטיס סיכום מהיר */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-horizon-card border-horizon">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-horizon-primary">{meetings.length}</p>
            <p className="text-xs text-horizon-accent">פגישות עד כה</p>
          </CardContent>
        </Card>
        <Card className="bg-horizon-card border-horizon">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{openTasks.length}</p>
            <p className="text-xs text-horizon-accent">משימות פתוחות</p>
          </CardContent>
        </Card>
        <Card className="bg-horizon-card border-horizon">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{delayedTasks.length}</p>
            <p className="text-xs text-horizon-accent">באיחור</p>
          </CardContent>
        </Card>
        <Card className="bg-horizon-card border-horizon">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{tasksSinceLastMeeting.length}</p>
            <p className="text-xs text-horizon-accent">עודכנו מאז הפגישה</p>
          </CardContent>
        </Card>
      </div>

      {/* התראות */}
      {(delayedTasks.length > 0 || cashflowAlerts.length > 0) && (
        <Card className="card-horizon border-l-4 border-l-red-500">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('alerts')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                נקודות לתשומת לב
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                  {delayedTasks.length + cashflowAlerts.length}
                </Badge>
              </CardTitle>
              {expandedSections.includes('alerts') ? (
                <ChevronUp className="w-5 h-5 text-horizon-accent" />
              ) : (
                <ChevronDown className="w-5 h-5 text-horizon-accent" />
              )}
            </div>
          </CardHeader>
          {expandedSections.includes('alerts') && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {delayedTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2 bg-red-500/10 rounded-lg">
                    <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-horizon-text text-sm">{task.name}</span>
                      <span className="text-red-400 text-xs mr-2">
                        באיחור של {differenceInDays(new Date(), new Date(task.end_date))} ימים
                      </span>
                    </div>
                  </div>
                ))}
                {cashflowAlerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-orange-500/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-horizon-text text-sm">{alert.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* סיכום הפגישה האחרונה */}
      <Card className="card-horizon">
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('previousMeeting')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-horizon-primary" />
              סיכום הפגישה האחרונה
            </CardTitle>
            {expandedSections.includes('previousMeeting') ? (
              <ChevronUp className="w-5 h-5 text-horizon-accent" />
            ) : (
              <ChevronDown className="w-5 h-5 text-horizon-accent" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('previousMeeting') && lastMeeting && (
          <CardContent className="pt-0">
            <div className="bg-horizon-card rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm text-horizon-accent">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(lastMeeting.meeting_date), 'dd MMMM yyyy', { locale: he })}
                </span>
                <span className="text-horizon-accent/50">•</span>
                <span>
                  {formatDistanceToNow(new Date(lastMeeting.meeting_date), { addSuffix: true, locale: he })}
                </span>
              </div>
              
              <p className="text-horizon-text">{lastMeeting.summary}</p>
              
              {lastMeeting.key_decisions && (
                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-horizon-text flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    החלטות מפתח
                  </h4>
                  <ul className="space-y-1">
                    {(Array.isArray(lastMeeting.key_decisions) 
                      ? lastMeeting.key_decisions 
                      : typeof lastMeeting.key_decisions === 'string' 
                        ? lastMeeting.key_decisions.split('\n')
                        : []
                    ).filter(d => d && d.trim()).map((decision, idx) => (
                      <li key={idx} className="text-sm text-horizon-accent flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* צ'קליסט לפגישה החוזרת - עם נתונים דינמיים */}
      <Card className="card-horizon">
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('checklist')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
              <ListChecks className="w-5 h-5 text-horizon-primary" />
              צ'קליסט הכנה לפגישה
            </CardTitle>
            {expandedSections.includes('checklist') ? (
              <ChevronUp className="w-5 h-5 text-horizon-accent" />
            ) : (
              <ChevronDown className="w-5 h-5 text-horizon-accent" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('checklist') && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* סקירת משימות פתוחות - עם נתונים אמיתיים */}
              <div 
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  checkedTasks['recurring_review_tasks'] 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-horizon-card border border-horizon'
                }`}
              >
                <Checkbox
                  checked={checkedTasks['recurring_review_tasks'] || false}
                  onCheckedChange={() => toggleTask('recurring_review_tasks')}
                  className="mt-1 border-horizon-primary data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      checkedTasks['recurring_review_tasks'] 
                        ? 'line-through text-horizon-accent' 
                        : 'text-horizon-text'
                    }`}>
                      סקירת משימות פתוחות
                    </span>
                    {checkedTasks['recurring_review_tasks'] && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {openTasks.length > 0 && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
                        {openTasks.length} פתוחות
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-horizon-accent mt-1">
                    לעבור על סטטוס המשימות מהפגישה הקודמת ({openTasks.length} משימות פתוחות)
                  </p>
                </div>
              </div>

              {/* עדכון מצב תזרים - עם נתונים אמיתיים */}
              <div 
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  checkedTasks['recurring_cashflow_status'] 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-horizon-card border border-horizon'
                }`}
              >
                <Checkbox
                  checked={checkedTasks['recurring_cashflow_status'] || false}
                  onCheckedChange={() => toggleTask('recurring_cashflow_status')}
                  className="mt-1 border-horizon-primary data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      checkedTasks['recurring_cashflow_status'] 
                        ? 'line-through text-horizon-accent' 
                        : 'text-horizon-text'
                    }`}>
                      עדכון מצב תזרים
                    </span>
                    {checkedTasks['recurring_cashflow_status'] && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {cashflowData && (
                      <Badge className={`text-xs ${
                        cashflowData.balance < 0 
                          ? 'bg-red-500/20 text-red-400 border-red-500/50' 
                          : 'bg-green-500/20 text-green-400 border-green-500/50'
                      }`}>
                        {cashflowData.balance < 0 ? 'יתרה שלילית' : 'יתרה חיובית'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-horizon-accent mt-1">
                    בדיקת מצב התזרים והתראות
                    {cashflowData && (
                      <span className="mr-2">
                        ({cashflowData.totalEntries} תנועות, יתרה: ₪{cashflowData.balance?.toLocaleString() || '0'})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* בדיקת יעדים - עם נתונים אמיתיים */}
              <div 
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  checkedTasks['recurring_kpis'] 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-horizon-card border border-horizon'
                }`}
              >
                <Checkbox
                  checked={checkedTasks['recurring_kpis'] || false}
                  onCheckedChange={() => toggleTask('recurring_kpis')}
                  className="mt-1 border-horizon-primary data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      checkedTasks['recurring_kpis'] 
                        ? 'line-through text-horizon-accent' 
                        : 'text-horizon-text'
                    }`}>
                      בדיקת יעדים
                    </span>
                    {checkedTasks['recurring_kpis'] && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {goals.length > 0 && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                        {goals.length} יעדים
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-horizon-accent mt-1">
                    התקדמות מול יעדים שנקבעו ({goals.length} יעדים פעילים)
                  </p>
                </div>
              </div>

              {/* בעיות וחסמים */}
              <div 
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  checkedTasks['recurring_issues'] 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-horizon-card border border-horizon'
                }`}
              >
                <Checkbox
                  checked={checkedTasks['recurring_issues'] || false}
                  onCheckedChange={() => toggleTask('recurring_issues')}
                  className="mt-1 border-horizon-primary data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      checkedTasks['recurring_issues'] 
                        ? 'line-through text-horizon-accent' 
                        : 'text-horizon-text'
                    }`}>
                      בעיות וחסמים
                    </span>
                    {checkedTasks['recurring_issues'] && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {(delayedTasks.length > 0 || cashflowAlerts.length > 0) && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                        {delayedTasks.length + cashflowAlerts.length} התראות
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-horizon-accent mt-1">
                    זיהוי בעיות חדשות שצריך לטפל בהן
                    {(delayedTasks.length > 0 || cashflowAlerts.length > 0) && (
                      <span className="mr-2">
                        ({delayedTasks.length} משימות באיחור, {cashflowAlerts.length} התראות תזרים)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* צעדים הבאים */}
              <div 
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  checkedTasks['recurring_next_steps'] 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-horizon-card border border-horizon'
                }`}
              >
                <Checkbox
                  checked={checkedTasks['recurring_next_steps'] || false}
                  onCheckedChange={() => toggleTask('recurring_next_steps')}
                  className="mt-1 border-horizon-primary data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      checkedTasks['recurring_next_steps'] 
                        ? 'line-through text-horizon-accent' 
                        : 'text-horizon-text'
                    }`}>
                      צעדים הבאים
                    </span>
                    {checkedTasks['recurring_next_steps'] && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <p className="text-sm text-horizon-accent mt-1">
                    הגדרת משימות לתקופה הקרובה
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-horizon-card rounded-lg">
              <p className="text-sm text-horizon-accent">
                ✅ {Object.keys(checkedTasks).filter(k => k.startsWith('recurring_') && checkedTasks[k]).length} מתוך 5 משימות הושלמו
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* משימות פתוחות */}
      <Card className="card-horizon">
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('tasks')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-horizon-primary" />
              משימות פתוחות ({openTasks.length})
            </CardTitle>
            {expandedSections.includes('tasks') ? (
              <ChevronUp className="w-5 h-5 text-horizon-accent" />
            ) : (
              <ChevronDown className="w-5 h-5 text-horizon-accent" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('tasks') && (
          <CardContent className="pt-0">
            {isLoadingTasks ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
              </div>
            ) : openTasks.length === 0 ? (
              <div className="text-center py-6 text-horizon-accent">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-400" />
                <p>אין משימות פתוחות! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openTasks.map((task) => {
                  const isDelayed = task.end_date && isAfter(new Date(), new Date(task.end_date));
                  return (
                    <div 
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isDelayed ? 'bg-red-500/5 border-red-500/30' : 'bg-horizon-card border-horizon'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-horizon-text">{task.name}</span>
                          {getStatusBadge(task.status)}
                          {isDelayed && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                              באיחור
                            </Badge>
                          )}
                        </div>
                        {task.end_date && (
                          <p className={`text-xs mt-1 ${isDelayed ? 'text-red-400' : 'text-horizon-accent'}`}>
                            יעד: {format(new Date(task.end_date), 'dd/MM/yyyy')}
                            {isDelayed && ` (${differenceInDays(new Date(), new Date(task.end_date))} ימים באיחור)`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* עדכונים מאז הפגישה האחרונה */}
      {tasksSinceLastMeeting.length > 0 && (
        <Card className="card-horizon border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-green-400" />
              התקדמות מאז הפגישה האחרונה ({tasksSinceLastMeeting.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {tasksSinceLastMeeting.slice(0, 5).map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center gap-3 p-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-horizon-text">{task.name}</span>
                  {getStatusBadge(task.status)}
                </div>
              ))}
              {tasksSinceLastMeeting.length > 5 && (
                <p className="text-sm text-horizon-accent text-center pt-2">
                  ועוד {tasksSinceLastMeeting.length - 5} עדכונים...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* כפתור יצירת סיכום */}
      <Card className="card-horizon bg-gradient-to-l from-horizon-primary/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-horizon-accent">
              לאחר הפגישה, צור סיכום פגישה עם כל המידע החשוב
            </div>
            <Button onClick={onCreateSummary} className="btn-horizon-primary">
              <Plus className="w-4 h-4 ml-2" />
              צור סיכום פגישה
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
