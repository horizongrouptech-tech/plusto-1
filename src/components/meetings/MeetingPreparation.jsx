import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  ClipboardList, Calendar, CheckCircle2, Circle, AlertCircle,
  FileText, Target, Loader2, ChevronDown, ChevronUp, ListChecks
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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

export default function MeetingPreparation({ customer, meetings = [], currentUser }) {
  const [expandedSections, setExpandedSections] = useState(['previousMeeting', 'tasks', 'checklist']);
  const [checkedTasks, setCheckedTasks] = useState({});

  const isFirstMeeting = meetings.length === 0;
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
    enabled: !!customer?.email && !isFirstMeeting
  });

  // טעינת משימות דפולטיביות מהמערכת
  const { data: defaultTasks = DEFAULT_FIRST_MEETING_TASKS } = useQuery({
    queryKey: ['defaultOnboardingTasks'],
    queryFn: async () => {
      try {
        const settings = await base44.entities.SystemSettings?.filter({ 
          setting_key: 'default_onboarding_tasks' 
        });
        if (settings && settings.length > 0) {
          return JSON.parse(settings[0].setting_value || '[]');
        }
      } catch (e) {
        console.log('Using default tasks');
      }
      return DEFAULT_FIRST_MEETING_TASKS;
    },
    enabled: isFirstMeeting
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

  if (isFirstMeeting) {
    // תצוגה לפגישה ראשונה
    return (
      <div className="space-y-4">
        <Card className="card-horizon bg-gradient-to-l from-purple-500/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-horizon-text">הכנה לפגישה ראשונה</h3>
                <p className="text-sm text-horizon-accent">זו תהיה הפגישה הראשונה עם הלקוח</p>
              </div>
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
                {defaultTasks.map((task, index) => (
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
                  ✅ {Object.values(checkedTasks).filter(Boolean).length} מתוך {defaultTasks.length} משימות הושלמו
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  // תצוגה לפגישות המשך
  return (
    <div className="space-y-4">
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
                      : lastMeeting.key_decisions.split('\n')
                    ).filter(d => d.trim()).map((decision, idx) => (
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
                {openTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-horizon-card rounded-lg border border-horizon"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-horizon-text">{task.name}</span>
                        {getStatusBadge(task.status)}
                      </div>
                      {task.end_date && (
                        <p className="text-xs text-horizon-accent mt-1">
                          יעד: {format(new Date(task.end_date), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
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
              <CheckCircle2 className="w-5 h-5 text-green-400" />
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
    </div>
  );
}
