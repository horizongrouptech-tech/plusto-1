import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, FileText, ClipboardList, Plus, Edit3, Trash2, 
  Eye, Loader2, Clock, User, CheckCircle2, AlertCircle,
  Play, Download, MessageSquare, Sparkles, Wand2
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import MeetingPreparation from './MeetingPreparation';
import MeetingSummaryViewer from './MeetingSummaryViewer';

export default function MeetingsTab({ customer, currentUser }) {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('summaries');
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [showSmartInputModal, setShowSmartInputModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState({
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_type: 'regular',
    summary: '',
    key_decisions: '',
    action_items: '',
    notes: ''
  });
  const [smartInput, setSmartInput] = useState('');

  // טעינת פגישות - תמיד משתמש ב-CustomerGoal
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['customerMeetings', customer?.email],
    queryFn: async () => {
      // השתמש תמיד ב-CustomerGoal כי MeetingSummary לא קיים
      const goals = await base44.entities.CustomerGoal.filter({
        customer_email: customer.email,
        task_type: 'meeting_summary',
        is_active: true
      }, '-start_date');
      
      return goals.map(g => ({
        id: g.id,
        meeting_date: g.start_date,
        summary: g.notes || g.description || '',
        key_decisions: g.success_metrics || '',
        action_items: g.checklist_items || '',
        meeting_type: g.priority === 'high' ? 'first' : 'regular',
        notes: g.additional_notes || '',
        created_by: g.assignee_email
      }));
    },
    enabled: !!customer?.email
  });

  // פענוח חכם של סיכום פגישה - מפרק טקסט חופשי לשדות
  const parseSmartInput = (text) => {
    // חיפוש משימות - דפוסים מורחבים
    const taskPatterns = [
      /^[-*•]\s*(.+)$/gm,                    // שורות שמתחילות ב-, *, •
      /^(\d+)[.)]\s*(.+)$/gm,                // מספר נקודה או סוגריים
      /משימה[:\s]+(.+)$/gmi,                 // "משימה:"
      /לעשות[:\s]+(.+)$/gmi,                 // "לעשות:"
      /action[:\s]+(.+)$/gmi,                // "action:"
      /^לבצע[:\s]+(.+)$/gmi,                 // "לבצע:"
      /^צריך[:\s]+(.+)$/gmi,                 // "צריך:"
      /^נדרש[:\s]+(.+)$/gmi,                 // "נדרש:"
      /^טו[ד]?[א]?[ק]?[:\s]+(.+)$/gmi,       // "טודק" / "טוד" / "טו"
      /^TODO[:\s]+(.+)$/gmi,                 // "TODO:"
      /^\.\s*(.+)$/gm,                       // שורה שמתחילה בנקודה
      /^→\s*(.+)$/gm,                         // חץ ימינה
      /^>\s*(.+)$/gm                          // סימן גדול מ
    ];
    
    // חיפוש החלטות - דפוסים מורחבים
    const decisionPatterns = [
      /הוחלט[:\s]+(.+)$/gmi,                 // "הוחלט:"
      /החלטה[:\s]+(.+)$/gmi,                 // "החלטה:"
      /סוכם[:\s]+(.+)$/gmi,                  // "סוכם:"
      /decision[:\s]+(.+)$/gmi,               // "decision:"
      /^נקבע[:\s]+(.+)$/gmi,                 // "נקבע:"
      /^סיכום[:\s]+(.+)$/gmi,                // "סיכום:"
      /^החלטנו[:\s]+(.+)$/gmi,               // "החלטנו:"
      /^✓\s*(.+)$/gm,                         // סימן V
      /^✅\s*(.+)$/gm                         // אימוג'י V
    ];

    let summary = text;
    let decisions = [];
    let tasks = [];
    const usedLines = new Set();

    // חילוץ החלטות
    decisionPatterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        const decision = match[1]?.trim();
        if (decision && decision.length > 2 && !usedLines.has(match[0])) {
          decisions.push(decision);
          usedLines.add(match[0]);
        }
      }
    });

    // חילוץ משימות
    taskPatterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        const task = match[2]?.trim() || match[1]?.trim();
        if (task && task.length > 2 && !usedLines.has(match[0])) {
          tasks.push(task);
          usedLines.add(match[0]);
        }
      }
    });

    // ניקוי הסיכום - הסרת שורות שזוהו כמשימות או החלטות
    const lines = summary.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true; // שמירת שורות ריקות
      
      // בדיקה אם השורה היא משימה או החלטה
      const isTask = tasks.some(t => trimmed.includes(t) || t.includes(trimmed));
      const isDecision = decisions.some(d => trimmed.includes(d) || d.includes(trimmed));
      
      // בדיקה אם השורה מתחילה בדפוס של משימה/החלטה
      const startsWithTaskPattern = taskPatterns.some(p => {
        const regex = new RegExp(p.source, p.flags);
        return regex.test(trimmed);
      });
      const startsWithDecisionPattern = decisionPatterns.some(p => {
        const regex = new RegExp(p.source, p.flags);
        return regex.test(trimmed);
      });
      
      return !isTask && !isDecision && !startsWithTaskPattern && !startsWithDecisionPattern;
    });

    summary = cleanedLines.join('\n').trim();

    // אם הסיכום ריק, נשתמש בטקסט המקורי (פחות משימות והחלטות)
    if (!summary && (tasks.length > 0 || decisions.length > 0)) {
      summary = text.split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && !tasks.some(t => trimmed.includes(t)) && !decisions.some(d => trimmed.includes(d));
        })
        .join('\n')
        .trim();
    }

    return {
      summary: summary || (tasks.length === 0 && decisions.length === 0 ? text : ''),
      key_decisions: decisions.length > 0 ? decisions.join('\n') : '',
      action_items: tasks.length > 0 ? tasks.join('\n') : ''
    };
  };

  // טיפול בקלט חכם
  const handleSmartParse = () => {
    if (!smartInput.trim()) {
      alert('נא להזין טקסט');
      return;
    }

    setIsParsing(true);
    
    // פענוח הטקסט
    const parsed = parseSmartInput(smartInput);
    
    setNewMeetingForm(prev => ({
      ...prev,
      summary: parsed.summary,
      key_decisions: parsed.key_decisions,
      action_items: parsed.action_items
    }));
    
    setIsParsing(false);
    setShowSmartInputModal(false);
    setShowNewMeetingModal(true);
  };

  // יצירת סיכום פגישה חדש - תמיד ב-CustomerGoal
  const handleCreateMeeting = async () => {
    if (!newMeetingForm.summary.trim()) {
      alert('נא להזין סיכום פגישה');
      return;
    }

    setIsCreating(true);
    try {
      // תמיד שימוש ב-CustomerGoal
      await base44.entities.CustomerGoal.create({
        customer_email: customer.email,
        name: `סיכום פגישה - ${format(new Date(newMeetingForm.meeting_date), 'dd/MM/yyyy')}`,
        task_type: 'meeting_summary',
        start_date: newMeetingForm.meeting_date,
        end_date: newMeetingForm.meeting_date,
        notes: newMeetingForm.summary,
        success_metrics: newMeetingForm.key_decisions,
        checklist_items: newMeetingForm.action_items ? 
          newMeetingForm.action_items.split('\n').filter(a => a.trim()) : [],
        additional_notes: newMeetingForm.notes,
        assignee_email: currentUser?.email,
        status: 'done',
        is_active: true,
        priority: newMeetingForm.meeting_type === 'first' ? 'high' : 'normal'
      });
      
      queryClient.invalidateQueries(['customerMeetings', customer.email]);
      setShowNewMeetingModal(false);
      setSmartInput('');
      setNewMeetingForm({
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_type: 'regular',
        summary: '',
        key_decisions: '',
        action_items: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('שגיאה ביצירת סיכום פגישה: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // מחיקת פגישה
  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm('האם למחוק את סיכום הפגישה?')) return;

    try {
      await base44.entities.CustomerGoal.update(meetingId, { is_active: false });
      queryClient.invalidateQueries(['customerMeetings', customer.email]);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('שגיאה במחיקת סיכום הפגישה');
    }
  };

  const getMeetingTypeLabel = (type) => {
    const labels = {
      first: 'פגישה ראשונה',
      regular: 'פגישה שוטפת',
      followup: 'פגישת מעקב',
      closing: 'פגישת סיכום'
    };
    return labels[type] || 'פגישה';
  };

  const getMeetingTypeColor = (type) => {
    const colors = {
      first: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      regular: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      followup: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      closing: 'bg-green-500/20 text-green-400 border-green-500/50'
    };
    return colors[type] || colors.regular;
  };

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Calendar className="w-5 h-5 text-horizon-primary" />
              פגישות - {customer.business_name || customer.full_name}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowSmartInputModal(true)} 
                variant="outline"
                className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
              >
                <Wand2 className="w-4 h-4 ml-2" />
                סיכום חכם
              </Button>
              <Button onClick={() => setShowNewMeetingModal(true)} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                סיכום פגישה
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="grid w-full grid-cols-2 bg-horizon-card">
              <TabsTrigger 
                value="summaries" 
                className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white"
              >
                <FileText className="w-4 h-4 ml-2" />
                סיכומי פגישות ({meetings.length})
              </TabsTrigger>
              <TabsTrigger 
                value="preparation"
                className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white"
              >
                <ClipboardList className="w-4 h-4 ml-2" />
                הכנה לפגישה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summaries" className="mt-4">
              {meetings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
                  <h3 className="text-lg font-semibold text-horizon-text mb-2">אין סיכומי פגישות</h3>
                  <p className="text-horizon-accent mb-4">צור סיכום לפגישה הראשונה</p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={() => setShowSmartInputModal(true)} 
                      variant="outline"
                      className="border-horizon-primary text-horizon-primary"
                    >
                      <Wand2 className="w-4 h-4 ml-2" />
                      סיכום חכם
                    </Button>
                    <Button onClick={() => setShowNewMeetingModal(true)} className="btn-horizon-primary">
                      <Plus className="w-4 h-4 ml-2" />
                      סיכום פגישה
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <Card 
                      key={meeting.id}
                      className="bg-horizon-card border-horizon hover:border-horizon-primary/50 transition-all cursor-pointer"
                      onClick={() => setSelectedMeeting(meeting)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={getMeetingTypeColor(meeting.meeting_type)}>
                                {getMeetingTypeLabel(meeting.meeting_type)}
                              </Badge>
                              <span className="text-horizon-accent text-sm flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(meeting.meeting_date), 'dd MMMM yyyy', { locale: he })}
                              </span>
                            </div>
                            <p className="text-horizon-text line-clamp-2">
                              {meeting.summary}
                            </p>
                            {meeting.key_decisions && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-horizon-accent">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                {Array.isArray(meeting.key_decisions) 
                                  ? `${meeting.key_decisions.length} החלטות`
                                  : typeof meeting.key_decisions === 'string' && meeting.key_decisions.trim()
                                    ? `${meeting.key_decisions.split('\n').filter(d => d.trim()).length} החלטות`
                                    : 'החלטות'
                                }
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMeeting(meeting);
                              }}
                              className="text-horizon-accent hover:text-horizon-primary"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeeting(meeting.id);
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preparation" className="mt-4">
              <MeetingPreparation 
                customer={customer} 
                meetings={meetings}
                currentUser={currentUser}
                onCreateSummary={() => setShowNewMeetingModal(true)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* מודל קלט חכם */}
      <Dialog open={showSmartInputModal} onOpenChange={setShowSmartInputModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-horizon-primary" />
              סיכום פגישה חכם
            </DialogTitle>
            <DialogDescription className="text-horizon-accent">
              כתוב את כל מה שקרה בפגישה בטקסט חופשי, והמערכת תפרק אוטומטית לסיכום, החלטות ומשימות
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-horizon-text mb-1">טיפים לכתיבה:</p>
                  <ul className="text-horizon-accent space-y-1 list-disc pr-4">
                    <li>כתוב משימות עם מקף (-) או כוכבית (*) בתחילת השורה</li>
                    <li>כתוב "הוחלט:" או "החלטה:" לפני החלטות</li>
                    <li>שאר הטקסט יהפוך לסיכום הפגישה</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="text-horizon-accent text-sm mb-2 block">
                כתוב את סיכום הפגישה בטקסט חופשי
              </label>
              <Textarea
                value={smartInput}
                onChange={(e) => setSmartInput(e.target.value)}
                placeholder={`דוגמה:
דיברנו על מצב התזרים של החודש, יש בעיה בגביה מלקוח X.

הוחלט: להתקשר ללקוח X עד סוף השבוע
הוחלט: להכין דוח תזרים שבועי

משימות:
- לשלוח מכתב התראה ללקוח X
- לתאם פגישה עם רו"ח
- להכין תחזית לרבעון הבא`}
                className="bg-horizon-card border-horizon text-horizon-text min-h-[250px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowSmartInputModal(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button 
              onClick={handleSmartParse}
              disabled={isParsing || !smartInput.trim()}
              className="btn-horizon-primary"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מעבד...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 ml-2" />
                  פענח והמשך
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* מודל יצירת סיכום פגישה */}
      <Dialog open={showNewMeetingModal} onOpenChange={setShowNewMeetingModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              <Plus className="w-5 h-5 text-horizon-primary" />
              סיכום פגישה חדש
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">תאריך הפגישה</label>
                <Input
                  type="date"
                  value={newMeetingForm.meeting_date}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, meeting_date: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">סוג פגישה</label>
                <select
                  value={newMeetingForm.meeting_type}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, meeting_type: e.target.value })}
                  className="w-full bg-horizon-card border border-horizon rounded-md p-2 text-horizon-text"
                >
                  <option value="first">פגישה ראשונה</option>
                  <option value="regular">פגישה שוטפת</option>
                  <option value="followup">פגישת מעקב</option>
                  <option value="closing">פגישת סיכום</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-horizon-accent text-sm mb-2 block">סיכום הפגישה *</label>
              <Textarea
                value={newMeetingForm.summary}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, summary: e.target.value })}
                placeholder="תאר את הנקודות העיקריות שעלו בפגישה..."
                className="bg-horizon-card border-horizon text-horizon-text min-h-[120px]"
              />
            </div>

            <div>
              <label className="text-horizon-accent text-sm mb-2 block">
                <CheckCircle2 className="w-4 h-4 inline ml-1 text-green-400" />
                החלטות מפתח (שורה לכל החלטה)
              </label>
              <Textarea
                value={newMeetingForm.key_decisions}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, key_decisions: e.target.value })}
                placeholder="לדוגמה:&#10;לבדוק חלופות ספקים&#10;להכין תחזית לרבעון הבא"
                className="bg-horizon-card border-horizon text-horizon-text min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-horizon-accent text-sm mb-2 block">
                <ClipboardList className="w-4 h-4 inline ml-1 text-blue-400" />
                משימות לביצוע (שורה לכל משימה)
              </label>
              <Textarea
                value={newMeetingForm.action_items}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, action_items: e.target.value })}
                placeholder="לדוגמה:&#10;לשלוח דוחות עדכניים&#10;לתאם פגישה עם רו&quot;ח"
                className="bg-horizon-card border-horizon text-horizon-text min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-horizon-accent text-sm mb-2 block">הערות נוספות</label>
              <Textarea
                value={newMeetingForm.notes}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, notes: e.target.value })}
                placeholder="הערות פנימיות או מידע נוסף..."
                className="bg-horizon-card border-horizon text-horizon-text"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowNewMeetingModal(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button 
              onClick={handleCreateMeeting}
              disabled={isCreating}
              className="btn-horizon-primary"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-2" />
                  צור סיכום
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* מודל צפייה בסיכום פגישה */}
      {selectedMeeting && (
        <MeetingSummaryViewer
          meeting={selectedMeeting}
          isOpen={!!selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </div>
  );
}
