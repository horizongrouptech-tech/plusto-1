import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, FileText, ClipboardList, Plus, Edit3, Trash2, 
  Eye, Loader2, Clock, User, CheckCircle2, AlertCircle,
  Play, Download, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import MeetingPreparation from './MeetingPreparation';
import MeetingSummaryViewer from './MeetingSummaryViewer';

export default function MeetingsTab({ customer, currentUser }) {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('summaries');
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState({
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_type: 'regular',
    summary: '',
    key_decisions: '',
    action_items: '',
    notes: ''
  });

  // טעינת פגישות
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['customerMeetings', customer?.email],
    queryFn: async () => {
      // נסה לטעון מישות MeetingSummary
      if (base44.entities.MeetingSummary) {
        return await base44.entities.MeetingSummary.filter({
          customer_email: customer.email
        }, '-meeting_date');
      }
      
      // fallback - שימוש ב-CustomerGoal עם task_type מיוחד
      const goals = await base44.entities.CustomerGoal.filter({
        customer_email: customer.email,
        task_type: 'meeting_summary'
      }, '-start_date');
      
      return goals.map(g => ({
        id: g.id,
        meeting_date: g.start_date,
        summary: g.notes,
        key_decisions: g.success_metrics,
        action_items: g.description,
        meeting_type: 'regular',
        created_by: g.assignee_email
      }));
    },
    enabled: !!customer?.email
  });

  // יצירת סיכום פגישה חדש
  const handleCreateMeeting = async () => {
    if (!newMeetingForm.summary.trim()) {
      alert('נא להזין סיכום פגישה');
      return;
    }

    setIsCreating(true);
    try {
      if (base44.entities.MeetingSummary) {
        await base44.entities.MeetingSummary.create({
          customer_email: customer.email,
          ...newMeetingForm,
          key_decisions: newMeetingForm.key_decisions.split('\n').filter(d => d.trim()),
          action_items: newMeetingForm.action_items.split('\n').filter(a => a.trim()),
          created_by: currentUser?.email
        });
      } else {
        // fallback
        await base44.entities.CustomerGoal.create({
          customer_email: customer.email,
          name: `סיכום פגישה - ${format(new Date(newMeetingForm.meeting_date), 'dd/MM/yyyy')}`,
          task_type: 'meeting_summary',
          start_date: newMeetingForm.meeting_date,
          end_date: newMeetingForm.meeting_date,
          notes: newMeetingForm.summary,
          success_metrics: newMeetingForm.key_decisions,
          description: newMeetingForm.action_items,
          assignee_email: currentUser?.email,
          status: 'done',
          is_active: true
        });
      }
      
      queryClient.invalidateQueries(['customerMeetings', customer.email]);
      setShowNewMeetingModal(false);
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
      alert('שגיאה ביצירת סיכום פגישה');
    } finally {
      setIsCreating(false);
    }
  };

  // מחיקת פגישה
  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm('האם למחוק את סיכום הפגישה?')) return;

    try {
      if (base44.entities.MeetingSummary) {
        await base44.entities.MeetingSummary.delete(meetingId);
      } else {
        await base44.entities.CustomerGoal.update(meetingId, { is_active: false });
      }
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
            <Button onClick={() => setShowNewMeetingModal(true)} className="btn-horizon-primary">
              <Plus className="w-4 h-4 ml-2" />
              סיכום פגישה חדש
            </Button>
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
                  <Button onClick={() => setShowNewMeetingModal(true)} className="btn-horizon-primary">
                    <Plus className="w-4 h-4 ml-2" />
                    סיכום פגישה חדש
                  </Button>
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
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
