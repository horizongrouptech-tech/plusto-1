import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger } from
"@/components/ui/accordion";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Target, CheckCircle, Circle, AlertCircle, MessageSquare, Send } from 'lucide-react';
import MentionInput from '@/components/shared/MentionInput';

// נתוני השלבים מתוך ה-PDF - עדכון מדויק למלל המקורי
const OFEK_360_STEPS = [
{
  step_number: 1,
  step_title: 'מיפוי כלכלי - "איפה הכסף"',
  current_state_description: 'נתונים מפוזרים',
  desired_state_description: 'תמונה מלאה - איסוף כלל הנתונים הנדרשים, התחמשות וחיבור החתיכות בפאזל לכדי תובנות שמתורגמות לתכנית הבראה ותוצאות ללקוח - להבין עד הסוף מה צריך לתקן עכשיו כשרואים הכל ומבינים את "מסע הכסף" בעסק ובחיים'
},
{
  step_number: 2,
  step_title: 'תזרים מזומנים וקטגוריות',
  current_state_description: 'אין עוגנים, אין תכנית תשלומים לספקים, תזרים שלילי או לא יציב. כסף יוצא, כסף נכנס - לא ברור ממי ולמי, כמה ולמה ומה עסקי מה אישי',
  desired_state_description: 'עוגנים קבועים (מינימום), נטרול ספקים רעילים (תנאי תשלום לא טובים), תכנון 3 חודשים קדימה לפחות ברזולוציה גבוהה, התרעה על בורות מתקרבים מספיק זמן מראש, פילוח של כמה כסף נכנס וממה, כמה יוצא ועל מה וניטור מגמות שדורשות תיקון או שימור'
},
{
  step_number: 3,
  step_title: 'עץ עסק ומודלי תגמול ושכר',
  current_state_description: 'אין הירככיה ברורה, כל אחד פועל על "עיוור" בלי הגדרות תפקיד ברורות, בלי מודל תגמול, בלי אופק פיתוח (הירככית וכלכלית)',
  desired_state_description: 'עץ עסק ברור. מי תחת מי, הגדרות תפקיד, הדדיות בין תפקידים, מודל תגמול מתפתח, אופק פיתוח ברור, אפשרות לגיוסים מתוכננים בתזמון ובדרך הנכונה / פיטורים של מעכבי תמרור'
},
{
  step_number: 4,
  step_title: 'ניתוח צרכי אשראי וגיוס מזומנים',
  current_state_description: '"כדור שלג שאיבד שליטה במורד הגבעה" / מהלכים תקועים כי אין כסף',
  desired_state_description: 'צורך ברור ותכנית פעולה משכנעת מספיק לשימוש בכסף חיצוני (m.p.o) בעת הבשלה - תיק בטיפול מקצועי של הורייזן פתרונות אשראי'
},
{
  step_number: 5,
  step_title: 'תקציב',
  current_state_description: 'ללא תכנון, שולפים מהמותן, אין שיקול דעת ודחיית סיפוקים',
  desired_state_description: '"תכנון מול ביצוע" חודשי - תקציב שנתי עם בקרה חודשית על מימוש ובהלימה ליעדים והמשימות שאני מתכוון להשיג (דגש על כסף כי מדיד אבל לא רק)'
},
{
  step_number: 6,
  step_title: 'תכנון מס ובקרה על רואה החשבון',
  current_state_description: 'אין תכנון מס, מקדמות לא תואמות, חובות פתוחים לרשויות, דו"חות לא מאורגנים / חסרים',
  desired_state_description: 'בניית אסטרטגיית מס שמגבה את התכנית לצמיחת העסק, מקדמות, יצרת "דף חלק", תאימות בין הדוחות החשבונאיים לחשבונות הבנק'
},
{
  step_number: 7,
  step_title: 'סיסטם גבייה ופתרונות תשלום',
  current_state_description: 'חוסר עקביות, עושים טובות, בוחרים בדרך הגבייה והתשלום הקלה ולא הנכונה',
  desired_state_description: 'מדיניות גבייה, פתרונות תשלום תואמים ותזמון ברור וגמיש בהתאם להצעות הערך השונות'
},
{
  step_number: 8,
  step_title: 'מרכזי רווח (הצעות ערך) ותמחורים',
  current_state_description: 'מוכרים מוצרים ובמחירים שנקבעים לפי תחושת בטן - יכול להיות רווח טוב, אבל אפשר יותר',
  desired_state_description: 'מיפוי כלל הצעות הערך והתאמתן לקהלי היעד השונים, איתור "הסוס המנצח", דיוק / השמדת הצעות קיימות, יצירת הצעות חדשות ומבודלות, תמחורים שהופכים את העניין למשתלם'
},
{
  step_number: 9,
  step_title: 'פיתוח עסקי מתוך המספרים והכסף',
  current_state_description: 'אין חזון או יעדים עסקיים ואישיים ברורים ומרגשים, צמיחה איטית / דעיכה במקום צמיחה מאסיבית, אין את "השלב הבא"',
  desired_state_description: 'גאנט - חזון ויעדים ברורים עם דד ליינים, משימות שמובילות להשגת יעדים, פעולות שמוציאות מאזור הנוחות ועם "סיכון משתלם", גדילה בעשרות ומאות אחוזים בחודש או שנה (בהתאם לעסק) ולא צמיחה דרדלה'
},
{
  step_number: 10,
  step_title: 'התמדה',
  current_state_description: 'הלקוח ומנהל הכספים לא סיימו לעבוד על כל השלבים במסגרת המודל או לחזור עליהם יותר מפעם אחת',
  desired_state_description: 'בקרה שוטפת ואחיזה - יצירת מנגנון קבוע של בקרות יומית, שבועית וחודשית וחזרתיות (במקרה הזה חזרתיות הכרחית). הלקוח ומנהל הכספים הריצו את המודל שוב ושוב תוך שימוש בכל הכלים העומדים לרשותכם בלי יוצא מן הכלל, מנהל הכספים חזק בעניינים'
}];


const MONTH_NAMES = [
'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];


// קומפוננטת תא חודשי עם פופאובר
function MonthlyStatusCell({ step, stepIndex, month, year, currentUser, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const monthStatus = (step.monthly_status || []).find(
    (ms) => ms.month === month && ms.year === year
  );

  const currentStatus = monthStatus?.status || 'current';
  const comments = monthStatus?.comments || [];

  const statusColors = {
    'desired': 'bg-green-500 hover:bg-green-600',
    'current': 'bg-blue-500 hover:bg-blue-600',
    'not_applicable': 'bg-gray-500 hover:bg-gray-600'
  };

  const statusIcons = {
    'desired': <CheckCircle className="w-3 h-3 text-white" />,
    'current': <Circle className="w-3 h-3 text-white" />,
    'not_applicable': <AlertCircle className="w-3 h-3 text-white" />
  };

  const handleStatusChange = async (newStatus) => {
    await onUpdate(stepIndex, month, year, newStatus, null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSaving(true);
    try {
      await onUpdate(stepIndex, month, year, currentStatus, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all ${statusColors[currentStatus]} ${comments.length > 0 ? 'ring-2 ring-yellow-400' : ''}`}>

          {statusIcons[currentStatus]}
          {comments.length > 0 &&
          <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[10px] bg-yellow-400 text-black">
              {comments.length}
            </Badge>
          }
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-horizon-dark border-horizon text-horizon-text" dir="rtl">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-horizon-text mb-2">
              {MONTH_NAMES[month - 1]} {year} - שלב {step.step_number}
            </h4>
            <p className="text-xs text-horizon-accent">{step.step_title}</p>
          </div>

          {/* בחירת סטטוס */}
          <div className="space-y-2">
            <Label className="text-horizon-text">סטטוס</Label>
            <RadioGroup value={currentStatus} onValueChange={handleStatusChange}>
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="current"
                  id={`current-${stepIndex}-${month}`}
                  className="border-blue-500 text-blue-500" />

                <Label htmlFor={`current-${stepIndex}-${month}`} className="text-sm cursor-pointer">
                  מצב מצוי
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="desired"
                  id={`desired-${stepIndex}-${month}`}
                  className="border-green-500 text-green-500" />

                <Label htmlFor={`desired-${stepIndex}-${month}`} className="text-sm cursor-pointer">
                  מצב רצוי
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="not_applicable"
                  id={`na-${stepIndex}-${month}`}
                  className="border-gray-500 text-gray-500" />

                <Label htmlFor={`na-${stepIndex}-${month}`} className="text-sm cursor-pointer">
                  לא רלוונטי
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* הערות קיימות */}
          {comments.length > 0 &&
          <div className="space-y-2 max-h-40 overflow-y-auto">
              <Label className="text-horizon-text flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                הערות ({comments.length})
              </Label>
              {comments.map((comment, idx) =>
            <div key={idx} className="bg-horizon-card/50 rounded-lg p-3 space-y-1">
                  <p className="text-sm text-horizon-text">{comment.text}</p>
                  <div className="text-xs text-horizon-accent flex justify-between">
                    <span>{comment.author_name || comment.author_email}</span>
                    <span>{new Date(comment.timestamp).toLocaleString('he-IL')}</span>
                  </div>
                </div>
            )}
            </div>
          }

          {/* הוספת הערה חדשה */}
          <div className="space-y-2">
            <Label className="text-horizon-text">הוסף הערה</Label>
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              customerEmail={step.customer_email}
              placeholder="כתוב הערה ותייג משתמשים עם @..."
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAddComment}
              disabled={isSaving || !newComment.trim()}
              className="w-full btn-horizon-primary">

              {isSaving ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              <>
                  <Send className="w-4 h-4 ml-2" />
                  שלח הערה
                </>
              }
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>);

}

export default function Ofek360Modal({ customer, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // טעינת נתוני המודל
  const { data: modelData, isLoading } = useQuery({
    queryKey: ['ofek360Model', customer.email],
    queryFn: async () => {
      const models = await base44.entities.Ofek360Model.filter({ customer_email: customer.email });

      if (models && models.length > 0) {
        return models[0];
      }

      // אם אין מודל קיים, ניצור אחד חדש עם נתוני ברירת מחדל
      const initialStepsData = OFEK_360_STEPS.map((step) => ({
        ...step,
        monthly_status: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          year: selectedYear,
          status: 'current',
          comments: []
        }))
      }));

      const currentUser = await base44.auth.me();
      const newModel = await base44.entities.Ofek360Model.create({
        customer_email: customer.email,
        customer_source: customer.source || 'user',
        current_year: selectedYear,
        steps_data: initialStepsData,
        last_updated_by: currentUser.email
      });

      return newModel;
    },
    enabled: isOpen && !!customer?.email
  });

  // טעינת המשתמש הנוכחי
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  // עדכון סטטוס חודש והוספת הערה
  const handleUpdateMonthlyStatus = async (stepIndex, month, year, newStatus, commentText = null) => {
    if (!modelData || !currentUser) return;

    const updatedStepsData = [...modelData.steps_data];
    const step = updatedStepsData[stepIndex];

    let updatedMonthlyStatus = [...(step.monthly_status || [])];
    const existingMonthIndex = updatedMonthlyStatus.findIndex(
      (ms) => ms.month === month && ms.year === year
    );

    let monthStatusToUpdate;
    if (existingMonthIndex !== -1) {
      monthStatusToUpdate = {
        ...updatedMonthlyStatus[existingMonthIndex],
        status: newStatus,
        updated_by_email: currentUser.email,
        updated_at: new Date().toISOString()
      };
      updatedMonthlyStatus[existingMonthIndex] = monthStatusToUpdate;
    } else {
      monthStatusToUpdate = {
        month,
        year,
        status: newStatus,
        updated_by_email: currentUser.email,
        updated_at: new Date().toISOString(),
        comments: []
      };
      updatedMonthlyStatus.push(monthStatusToUpdate);
    }

    // הוספת הערה אם קיימת
    if (commentText) {
      if (!monthStatusToUpdate.comments) {
        monthStatusToUpdate.comments = [];
      }
      monthStatusToUpdate.comments.push({
        text: commentText,
        timestamp: new Date().toISOString(),
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email
      });
    }

    step.monthly_status = updatedMonthlyStatus;

    try {
      await base44.entities.Ofek360Model.update(modelData.id, {
        steps_data: updatedStepsData,
        last_updated_by: currentUser.email
      });

      // רענון הנתונים
      queryClient.invalidateQueries(['ofek360Model', customer.email]);
    } catch (error) {
      console.error('Error updating monthly status:', error);
      alert('שגיאה בעדכון הסטטוס החודשי');
    }
  };

  // חישוב סטטיסטיקות
  const calculateProgress = () => {
    if (!modelData?.steps_data) return { current: 0, desired: 0, total: 0, percentage: 0 };

    let totalMonths = 0;
    let desiredMonths = 0;

    modelData.steps_data.forEach((step) => {
      (step.monthly_status || []).forEach((monthData) => {
        if (monthData.year === selectedYear) {
          totalMonths++;
          if (monthData.status === 'desired') {
            desiredMonths++;
          }
        }
      });
    });

    const progressPercentage = totalMonths > 0 ? Math.round(desiredMonths / totalMonths * 100) : 0;

    return {
      current: totalMonths - desiredMonths,
      desired: desiredMonths,
      total: totalMonths,
      percentage: progressPercentage
    };
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl bg-horizon-dark border-horizon max-h-[90vh] overflow-y-auto" dir="rtl">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-horizon-primary ml-3" />
            <span className="text-horizon-text">טוען את מודל אופק 360...</span>
          </div>
        </DialogContent>
      </Dialog>);

  }

  const progress = calculateProgress();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl bg-horizon-dark border-horizon max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text text-right flex items-center gap-3">
            <Target className="w-7 h-7 text-horizon-primary" />
            מודל אופק 360 - הצ'ק ליסט
          </DialogTitle>
          <p className="text-horizon-accent text-right mt-2">
            "מהמצוי לרצוי – 10 שלבים לשליטה בכסף ויצירת איכות ורמת חיים באמצעות העסק"
          </p>
        </DialogHeader>

        {/* בורר שנה */}
        <Card className="card-horizon mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <Label className="text-horizon-text font-semibold">בחר שנה:</Label>
              <div className="flex gap-2">
                <Button
                  variant={selectedYear === 2025 ? 'default' : 'outline'}
                  onClick={() => setSelectedYear(2025)}
                  className={selectedYear === 2025 ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-text'}
                >
                  2025
                </Button>
                <Button
                  variant={selectedYear === 2026 ? 'default' : 'outline'}
                  onClick={() => setSelectedYear(2026)}
                  className={selectedYear === 2026 ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-text'}
                >
                  2026
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* אינדיקטור התקדמות כללי */}
        <Card className="card-horizon mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-horizon-text">התקדמות כוללת - {selectedYear}</h3>
                <Badge className="bg-horizon-primary text-white text-lg px-4 py-1">
                  {progress.percentage}%
                </Badge>
              </div>
              <Progress value={progress.percentage} className="h-3" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-horizon-accent">סה"כ נקודות מעקב</p>
                  <p className="text-2xl font-bold text-horizon-text">{progress.total}</p>
                </div>
                <div>
                  <p className="text-sm text-horizon-accent">הושלמו (מצב רצוי)</p>
                  <p className="text-2xl font-bold text-green-400">{progress.desired}</p>
                </div>
                <div>
                  <p className="text-sm text-horizon-accent">בביצוע (מצב מצוי)</p>
                  <p className="text-2xl font-bold text-blue-400">{progress.current}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* השלבים */}
        <Accordion type="multiple" className="w-full space-y-4" dir="rtl">
          {modelData?.steps_data?.map((step, stepIndex) => {
            const stepMonthlyStatus = step.monthly_status || [];
            const stepDesiredCount = stepMonthlyStatus.filter(
              (ms) => ms.year === selectedYear && ms.status === 'desired'
            ).length;
            const stepProgress = Math.round(stepDesiredCount / 12 * 100);

            return (
              <AccordionItem
                key={step.step_number}
                value={step.step_number.toString()}
                className="card-horizon border-0">

                <AccordionTrigger className="hover:no-underline p-0">
                  <CardHeader className="w-full p-6 text-right">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                          <Badge className="bg-horizon-primary text-white">שלב {step.step_number}</Badge>
                          {step.step_title}
                        </CardTitle>
                        <div className="mt-2 flex items-center gap-3">
                          <Progress value={stepProgress} className="h-2 flex-1" />
                          <span className="text-sm text-horizon-accent whitespace-nowrap">
                            {stepProgress}% הושלם
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                
                <AccordionContent className="pb-6 px-6">
                  <CardContent className="space-y-4 p-0">
                    {/* תיאורי מצב */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Circle className="w-4 h-4 text-blue-400" />
                          <h4 className="font-semibold text-horizon-text">מצב מצוי</h4>
                        </div>
                        <p className="text-sm text-horizon-accent leading-relaxed">
                          {step.current_state_description}
                        </p>
                      </div>
                      
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <h4 className="font-semibold text-horizon-text">מצב רצוי</h4>
                        </div>
                        <p className="text-sm text-horizon-accent leading-relaxed">
                          {step.desired_state_description}
                        </p>
                      </div>
                    </div>

                    {/* מעקב חודשי */}
                    <div className="bg-horizon-card/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-horizon-text mb-3 flex items-center gap-2">
                        מעקב חודשי - {selectedYear}
                        <Badge variant="outline" className="text-horizon-text border-horizon mr-auto">
                          לחץ על כל חודש לעריכת סטטוס והוספת הערות
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) =>
                        <div key={month} className="flex flex-col items-center gap-2">
                            <div className="text-xs text-horizon-accent text-center font-medium">
                              {MONTH_NAMES[month - 1]}
                            </div>
                            <MonthlyStatusCell
                            step={step}
                            stepIndex={stepIndex}
                            month={month}
                            year={selectedYear}
                            currentUser={currentUser}
                            onUpdate={handleUpdateMonthlyStatus} />

                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>);

          })}
        </Accordion>

        {/* תצוגת עדכון אחרון */}
        {modelData?.last_updated_by &&
        <div className="text-center text-sm text-horizon-accent mt-4">
            עודכן לאחרונה על ידי: {modelData.last_updated_by} | {new Date(modelData.updated_date).toLocaleString('he-IL')}
          </div>
        }
      </DialogContent>
    </Dialog>);

}