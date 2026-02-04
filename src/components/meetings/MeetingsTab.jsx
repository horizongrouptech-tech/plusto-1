import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, FileText, ClipboardList, Plus, Edit3, Trash2, 
  Eye, Loader2, Clock, User, CheckCircle2, AlertCircle,
  Play, Download, MessageSquare, Sparkles, Wand2, Video,
  Phone, MapPin, CalendarPlus, CalendarCheck, CalendarX,
  ChevronDown, ChevronUp, Target, AlertTriangle, Users,
  Send, Link as LinkIcon, ExternalLink, Copy
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, isToday, isTomorrow, addDays, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { useGlobalToast } from '@/components/utils/useGlobalToast';

// סטטוסים אפשריים לפגישה
const MEETING_STATUSES = [
  { value: 'scheduled', label: 'נקבעה', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: CalendarCheck },
  { value: 'completed', label: 'בוצעה', color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle2 },
  { value: 'cancelled', label: 'בוטלה', color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: CalendarX },
  { value: 'rescheduled', label: 'נדחתה', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock }
];

// ערוצי פגישה
const MEETING_CHANNELS = [
  { value: 'zoom', label: 'זום', icon: Video },
  { value: 'office', label: 'פגישה פיזית', icon: MapPin },
  { value: 'phone', label: 'טלפון', icon: Phone },
  { value: 'teams', label: 'Teams', icon: Video },
  { value: 'google_meet', label: 'Google Meet', icon: Video }
];

export default function MeetingsTab({ customer, currentUser }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showWarning } = useGlobalToast();
  const [activeSubTab, setActiveSubTab] = useState('upcoming');
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showMeetingDetailsModal, setShowMeetingDetailsModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // טופס פגישה חדשה
  const [newMeetingForm, setNewMeetingForm] = useState({
    subject: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_date: new Date().toISOString().split('T')[0],
    end_time: '11:00',
    channel: 'zoom',
    location: '',
    location_details: '',
    status: 'scheduled',
    description: '',
    send_reminder: true,
    invite_customer: true,
    // שדות סיכום
    participants: '',
    main_points: ['', '', '', '', ''],
    tasks: '',
    next_meeting_date: '',
    whatsapp_summary: ''
  });

  // טעינת פגישות
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['customerMeetings', customer?.email],
    queryFn: async () => {
      const goals = await base44.entities.CustomerGoal.filter({
        customer_email: customer.email,
        task_type: { $in: ['meeting', 'meeting_summary'] },
        is_active: true
      }, '-start_date');
      
      return goals.map(g => {
        // פענוח נתונים נוספים מ-additional_notes (JSON)
        let additionalData = {};
        try {
          if (g.additional_notes && g.additional_notes.startsWith('{')) {
            additionalData = JSON.parse(g.additional_notes);
          }
        } catch (e) {
          // אם זה לא JSON, נשמור כתיאור
          additionalData.description = g.additional_notes;
        }

        return {
          id: g.id,
          subject: g.name || '',
          start_date: g.start_date,
          start_time: additionalData.start_time || '10:00',
          end_date: g.end_date || g.start_date,
          end_time: additionalData.end_time || '11:00',
          channel: additionalData.channel || 'zoom',
          location: additionalData.location || '',
          location_details: additionalData.location_details || '',
          status: g.status === 'done' ? 'completed' : (g.status === 'cancelled' ? 'cancelled' : 'scheduled'),
          description: additionalData.description || g.description || '',
          participants: additionalData.participants || '',
          main_points: additionalData.main_points || ['', '', '', '', ''],
          tasks: additionalData.tasks || '',
          next_meeting_date: additionalData.next_meeting_date || '',
          whatsapp_summary: additionalData.whatsapp_summary || '',
          google_event_id: additionalData.google_event_id || '',
          send_reminder: additionalData.send_reminder !== false,
          invite_customer: additionalData.invite_customer !== false,
          created_by: g.assignee_email,
          created_date: g.created_date,
          _raw: g
        };
      });
    },
    enabled: !!customer?.email
  });

  // חלוקת פגישות לקטגוריות
  const categorizedMeetings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const future = meetings.filter(m => {
      const meetingDate = new Date(m.start_date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate >= today && m.status !== 'cancelled' && m.status !== 'completed';
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    const past = meetings.filter(m => {
      const meetingDate = new Date(m.start_date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate < today || m.status === 'completed';
    }).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    const cancelled = meetings.filter(m => m.status === 'cancelled');
    
    return { future, past, cancelled, all: meetings };
  }, [meetings]);

  // הפגישה הבאה
  const nextMeeting = categorizedMeetings.future[0];

  // חישוב מספר הפגישה הבאה
  const getNextMeetingNumber = useMemo(() => {
    if (!meetings || meetings.length === 0) return 1;
    
    // מצא את המספר הגבוה ביותר
    const numbers = meetings
      .map(m => {
        const match = m.subject?.match(/פגישת ניהול כספים מספר (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    
    return numbers.length > 0 ? Math.max(...numbers) + 1 : meetings.length + 1;
  }, [meetings]);

  // יצירת פגישה חדשה
  const handleCreateMeeting = async () => {
    setIsCreating(true);
    try {
      // נושא קבוע: פגישת ניהול כספים מספר X, [שם הלקוח]
      const meetingNumber = getNextMeetingNumber;
      // פורמט קבוע - לא ניתן לשינוי
      const finalSubject = `פגישת ניהול כספים מספר ${meetingNumber}, ${customer.business_name || customer.full_name}`;

      // בניית אובייקט נתונים נוספים
      const additionalData = {
        start_time: newMeetingForm.start_time,
        end_time: newMeetingForm.end_time,
        channel: newMeetingForm.channel,
        location: newMeetingForm.location,
        location_details: newMeetingForm.location_details,
        description: newMeetingForm.description,
        participants: newMeetingForm.participants,
        main_points: newMeetingForm.main_points,
        tasks: newMeetingForm.tasks,
        next_meeting_date: newMeetingForm.next_meeting_date,
        whatsapp_summary: newMeetingForm.whatsapp_summary,
        send_reminder: newMeetingForm.send_reminder,
        invite_customer: newMeetingForm.invite_customer
      };

      // יצירת הפגישה
      const newMeeting = await base44.entities.CustomerGoal.create({
        customer_email: customer.email,
        name: finalSubject,
        task_type: 'meeting',
        start_date: newMeetingForm.start_date,
        end_date: newMeetingForm.end_date,
        description: newMeetingForm.description,
        additional_notes: JSON.stringify(additionalData),
        assignee_email: currentUser?.email,
        status: 'open',
        is_active: true,
        priority: 'high'
      });

      // אם צריך לזמן בגוגל קלנדר
      if (newMeetingForm.invite_customer || newMeetingForm.send_reminder) {
        try {
          const { data: calendarResult, error: calendarError } = await base44.functions.invoke('scheduleMeeting', {
            meeting_id: newMeeting.id,
            customer_email: customer.email,
            financial_manager_email: currentUser?.email,
            subject: finalSubject,
            start_datetime: `${newMeetingForm.start_date}T${newMeetingForm.start_time}:00`,
            end_datetime: `${newMeetingForm.end_date}T${newMeetingForm.end_time}:00`,
            location: newMeetingForm.channel === 'office' ? newMeetingForm.location : newMeetingForm.channel,
            description: newMeetingForm.description,
            invite_customer: newMeetingForm.invite_customer,
            send_reminder: newMeetingForm.send_reminder,
            customer_name: customer.business_name || customer.full_name
          });

          if (calendarError) {
            console.error('Calendar error:', calendarError);
            // לא נכשיל את יצירת הפגישה, רק נדווח
          } else if (calendarResult?.event_id) {
            // עדכון ה-google_event_id
            additionalData.google_event_id = calendarResult.event_id;
            await base44.entities.CustomerGoal.update(newMeeting.id, {
              additional_notes: JSON.stringify(additionalData)
            });
          }
        } catch (calendarError) {
          console.error('Error scheduling Google Calendar event:', calendarError);
          // לא נכשיל את יצירת הפגישה אם הקלנדר נכשל
        }
      }
      
      queryClient.invalidateQueries(['customerMeetings', customer.email]);
      setShowNewMeetingModal(false);
      resetNewMeetingForm();
      showSuccess('הפגישה נוצרה בהצלחה!');
    } catch (error) {
      console.error('Error creating meeting:', error);
      showError('שגיאה ביצירת פגישה: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // עדכון פגישה
  const handleUpdateMeeting = async () => {
    if (!selectedMeeting) return;
    
    setIsSaving(true);
    try {
      const additionalData = {
        start_time: selectedMeeting.start_time,
        end_time: selectedMeeting.end_time,
        channel: selectedMeeting.channel,
        location: selectedMeeting.location,
        location_details: selectedMeeting.location_details,
        description: selectedMeeting.description,
        participants: selectedMeeting.participants,
        main_points: selectedMeeting.main_points,
        tasks: selectedMeeting.tasks,
        next_meeting_date: selectedMeeting.next_meeting_date,
        whatsapp_summary: selectedMeeting.whatsapp_summary,
        google_event_id: selectedMeeting.google_event_id,
        send_reminder: selectedMeeting.send_reminder,
        invite_customer: selectedMeeting.invite_customer
      };

      await base44.entities.CustomerGoal.update(selectedMeeting.id, {
        name: selectedMeeting.subject,
        start_date: selectedMeeting.start_date,
        end_date: selectedMeeting.end_date,
        description: selectedMeeting.description,
        additional_notes: JSON.stringify(additionalData),
        status: selectedMeeting.status === 'completed' ? 'done' : (selectedMeeting.status === 'cancelled' ? 'cancelled' : 'open')
      });
      
      queryClient.invalidateQueries(['customerMeetings', customer.email]);
      setShowMeetingDetailsModal(false);
      setSelectedMeeting(null);
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert('שגיאה בעדכון פגישה');
    } finally {
      setIsSaving(false);
    }
  };

  // מחיקת פגישה
  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm('האם למחוק את הפגישה?')) return;

    try {
      await base44.entities.CustomerGoal.update(meetingId, { is_active: false });
      queryClient.invalidateQueries(['customerMeetings', customer.email]);
      setShowMeetingDetailsModal(false);
      setSelectedMeeting(null);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      showError('שגיאה במחיקת הפגישה');
    }
  };

  // שליחת סיכום לווצאפ
  const handleSendWhatsAppSummary = async () => {
    if (!selectedMeeting?.whatsapp_summary) {
      showWarning('נא למלא את סיכום הווצאפ לפני השליחה');
      return;
    }

    try {
      await base44.functions.invoke('sendWhatsAppMessage', {
        phoneNumber: customer.phone,
        customerEmail: customer.email,
        message: selectedMeeting.whatsapp_summary,
        templateType: 'meeting_summary'
      });
      showSuccess('הסיכום נשלח בהצלחה לווטסאפ!');
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      showError('שגיאה בשליחת הסיכום לווצאפ');
    }
  };

  // יצירת תבנית סיכום פגישה
  const getMeetingSummaryTemplate = () => {
    const dateStr = new Date().toLocaleDateString('he-IL');
    return `סיכום פגישה מתאריך: ${dateStr}

נוכחים בפגישה:

עיקרי הדברים שעלו:
1.
2.
3.
4.
5.

משימות:

תאריך פגישה הבאה: טרם נקבעה`;
  };

  // איפוס טופס
  const resetNewMeetingForm = () => {
    setNewMeetingForm({
      subject: '',
      start_date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_date: new Date().toISOString().split('T')[0],
      end_time: '11:00',
      channel: 'zoom',
      location: '',
      location_details: '',
      status: 'scheduled',
      description: '',
      send_reminder: true,
      invite_customer: true,
      participants: '',
      main_points: ['', '', '', '', ''],
      tasks: '',
      next_meeting_date: '',
      whatsapp_summary: getMeetingSummaryTemplate()
    });
  };

  // פתיחת פרטי פגישה
  const openMeetingDetails = (meeting) => {
    setSelectedMeeting({ ...meeting });
    setShowMeetingDetailsModal(true);
  };

  // עדכון נקודה עיקרית
  const updateMainPoint = (index, value, isNew = false) => {
    if (isNew) {
      setNewMeetingForm(prev => {
        const points = [...prev.main_points];
        points[index] = value;
        return { ...prev, main_points: points };
      });
    } else {
      setSelectedMeeting(prev => {
        const points = [...(prev.main_points || ['', '', '', '', ''])];
        points[index] = value;
        return { ...prev, main_points: points };
      });
    }
  };

  // יצירת סיכום פגישה בפורמט הנדרש
  const generateMeetingSummary = (meeting) => {
    const meetingDate = format(new Date(meeting.start_date), 'dd/MM/yyyy', { locale: he });
    
    return `סיכום פגישה מתאריך: ${meetingDate}

נוכחים בפגישה:
${meeting.participants || 'לא צוין'}

עיקרי הדברים שעלו:
${(meeting.main_points || ['', '', '', '', '']).map((point, idx) => `${idx + 1}. ${point || ''}`).join('\n')}

משימות:
${meeting.tasks || 'לא צוין'}

תאריך פגישה הבאה: ${meeting.next_meeting_date ? format(new Date(meeting.next_meeting_date), 'dd/MM/yyyy', { locale: he }) : 'טרם נקבעה'}`;
  };

  // קבלת אייקון וצבע סטטוס
  const getStatusConfig = (status) => {
    return MEETING_STATUSES.find(s => s.value === status) || MEETING_STATUSES[0];
  };

  // קבלת אייקון ערוץ
  const getChannelConfig = (channel) => {
    return MEETING_CHANNELS.find(c => c.value === channel) || MEETING_CHANNELS[0];
  };

  // רנדור כרטיס פגישה
  const renderMeetingCard = (meeting) => {
    const meetingDate = new Date(meeting.start_date);
    const statusConfig = getStatusConfig(meeting.status);
    const channelConfig = getChannelConfig(meeting.channel);
    const StatusIcon = statusConfig.icon;
    const ChannelIcon = channelConfig.icon;
    
    return (
      <Card 
        key={meeting.id}
        className={`bg-horizon-card border-horizon hover:border-horizon-primary/50 transition-all cursor-pointer ${
          meeting.status === 'cancelled' ? 'opacity-60' : ''
        }`}
        onClick={() => openMeetingDetails(meeting)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* תאריך ושעה */}
            <div className="flex-shrink-0 text-center bg-horizon-dark/50 rounded-lg p-3 min-w-[90px]">
              <p className="text-2xl font-bold text-horizon-primary">
                {format(meetingDate, 'dd')}
              </p>
              <p className="text-sm text-horizon-accent">
                {format(meetingDate, 'MMM yyyy', { locale: he })}
              </p>
              <p className="text-xs text-horizon-text mt-1 font-medium">
                {meeting.start_time} - {meeting.end_time}
              </p>
            </div>

            {/* פרטי פגישה */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge className={statusConfig.color}>
                  <StatusIcon className="w-3 h-3 ml-1" />
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className="border-horizon text-horizon-accent">
                  <ChannelIcon className="w-3 h-3 ml-1" />
                  {channelConfig.label}
                </Badge>
                {isToday(meetingDate) && meeting.status === 'scheduled' && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">היום!</Badge>
                )}
              </div>

              <h3 className="font-semibold text-horizon-text mb-1 truncate text-lg">
                {meeting.subject || 'פגישת ניהול כספים'}
              </h3>

              <div className="flex items-center gap-4 text-sm text-horizon-accent">
                {meeting.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {meeting.location}
                  </span>
                )}
                {meeting.google_event_id && (
                  <span className="flex items-center gap-1 text-green-400">
                    <CalendarCheck className="w-3 h-3" />
                    מסונכרן
                  </span>
                )}
              </div>

              {meeting.description && (
                <p className="text-sm text-horizon-accent mt-2 line-clamp-1">
                  {meeting.description}
                </p>
              )}
            </div>

            {/* כפתור צפייה */}
            <Button
              size="sm"
              variant="ghost"
              className="text-horizon-primary"
              onClick={(e) => {
                e.stopPropagation();
                openMeetingDetails(meeting);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
      {/* כותרת עם כפתור פגישה חדשה */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Calendar className="w-5 h-5 text-horizon-primary" />
              ניהול פגישות - {customer.business_name || customer.full_name}
            </CardTitle>
            <Button onClick={() => setShowNewMeetingModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
              <CalendarPlus className="w-4 h-4 ml-2" />
              פגישה חדשה
            </Button>
          </div>
        </CardHeader>

        {/* סיכום מהיר */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-horizon-dark/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{categorizedMeetings.future.length}</p>
              <p className="text-xs text-horizon-accent">פגישות קרובות</p>
            </div>
            <div className="bg-horizon-dark/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{categorizedMeetings.past.filter(m => m.status === 'completed').length}</p>
              <p className="text-xs text-horizon-accent">בוצעו</p>
            </div>
            <div className="bg-horizon-dark/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-horizon-text">{meetings.length}</p>
              <p className="text-xs text-horizon-accent">סה"כ</p>
            </div>
            <div className="bg-horizon-dark/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{categorizedMeetings.cancelled.length}</p>
              <p className="text-xs text-horizon-accent">בוטלו</p>
            </div>
          </div>

          {/* הפגישה הבאה */}
          {nextMeeting && (
            <div className="bg-gradient-to-l from-horizon-primary/20 to-transparent rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">הפגישה הבאה:</p>
                  <p className="font-semibold text-horizon-text">
                    {nextMeeting.subject || 'פגישת ניהול כספים'} - {format(new Date(nextMeeting.start_date), 'EEEE, dd/MM', { locale: he })} 
                    {' '}בשעה {nextMeeting.start_time}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openMeetingDetails(nextMeeting)}
                  className="bg-horizon-primary hover:bg-horizon-primary/90 text-white"
                >
                  <Eye className="w-4 h-4 ml-2" />
                  פרטי פגישה
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* טאבים */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-3 bg-horizon-card">
          <TabsTrigger 
            value="upcoming" 
            className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white"
          >
            <CalendarCheck className="w-4 h-4 ml-2" />
            קרובות ({categorizedMeetings.future.length})
          </TabsTrigger>
          <TabsTrigger 
            value="past"
            className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white"
          >
            <CheckCircle2 className="w-4 h-4 ml-2" />
            שבוצעו ({categorizedMeetings.past.length})
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white"
          >
            <Calendar className="w-4 h-4 ml-2" />
            הכל ({meetings.length})
          </TabsTrigger>
        </TabsList>

        {/* פגישות קרובות */}
        <TabsContent value="upcoming" className="mt-4">
          {categorizedMeetings.future.length === 0 ? (
            <Card className="card-horizon">
              <CardContent className="p-8 text-center">
                <CalendarCheck className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
                <h3 className="text-lg font-semibold text-horizon-text mb-2">אין פגישות קרובות</h3>
                <p className="text-horizon-accent mb-4">קבע פגישה חדשה עם הלקוח</p>
                <Button onClick={() => setShowNewMeetingModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <CalendarPlus className="w-4 h-4 ml-2" />
                  קבע פגישה
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {categorizedMeetings.future.map(renderMeetingCard)}
            </div>
          )}
        </TabsContent>

        {/* פגישות שבוצעו */}
        <TabsContent value="past" className="mt-4">
          {categorizedMeetings.past.length === 0 ? (
            <Card className="card-horizon">
              <CardContent className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
                <h3 className="text-lg font-semibold text-horizon-text mb-2">אין פגישות קודמות</h3>
                <p className="text-horizon-accent">פגישות שבוצעו יופיעו כאן</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {categorizedMeetings.past.map(renderMeetingCard)}
            </div>
          )}
        </TabsContent>

        {/* כל הפגישות */}
        <TabsContent value="all" className="mt-4">
          {meetings.length === 0 ? (
            <Card className="card-horizon">
              <CardContent className="p-8 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
                <h3 className="text-lg font-semibold text-horizon-text mb-2">אין פגישות</h3>
                <p className="text-horizon-accent mb-4">לחץ על "פגישה חדשה" כדי לקבוע את הפגישה הראשונה</p>
                <Button onClick={() => setShowNewMeetingModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <CalendarPlus className="w-4 h-4 ml-2" />
                  קבע פגישה חדשה
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {meetings.map(renderMeetingCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* מודל פגישה חדשה */}
      <Dialog open={showNewMeetingModal} onOpenChange={setShowNewMeetingModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2 text-xl">
              <CalendarPlus className="w-6 h-6 text-orange-500" />
              פגישה חדשה - פגישת ניהול כספים
            </DialogTitle>
            <DialogDescription className="text-horizon-accent">
              {customer.business_name || customer.full_name} ~ {currentUser?.full_name || 'מנהל כספים'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* נושא - פורמט קבוע */}
            <div>
              <Label className="text-horizon-text mb-2 block font-medium">נושא הפגישה</Label>
              <div className="bg-horizon-card/50 border border-horizon rounded-md p-3 text-horizon-text">
                {`פגישת ניהול כספים מספר ${getNextMeetingNumber}, ${customer.business_name || customer.full_name}`}
              </div>
              <p className="text-xs text-horizon-accent mt-1">הנושא נקבע אוטומטית לפי מספר הפגישה ושם הלקוח</p>
            </div>

            {/* תאריך ושעת התחלה */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-horizon-text mb-2 block font-medium">תאריך התחלה *</Label>
                <Input
                  type="date"
                  value={newMeetingForm.start_date}
                  onChange={(e) => setNewMeetingForm({ 
                    ...newMeetingForm, 
                    start_date: e.target.value,
                    end_date: e.target.value // עדכון אוטומטי של תאריך סיום
                  })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <Label className="text-horizon-text mb-2 block font-medium">שעת התחלה *</Label>
                <Input
                  type="time"
                  value={newMeetingForm.start_time}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, start_time: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
            </div>

            {/* תאריך ושעת סיום */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-horizon-text mb-2 block font-medium">תאריך סיום *</Label>
                <Input
                  type="date"
                  value={newMeetingForm.end_date}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, end_date: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <Label className="text-horizon-text mb-2 block font-medium">שעת סיום *</Label>
                <Input
                  type="time"
                  value={newMeetingForm.end_time}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, end_time: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
            </div>

            {/* ערוץ פגישה */}
            <div>
              <Label className="text-horizon-text mb-2 block font-medium">ערוץ פגישה</Label>
              <Select 
                value={newMeetingForm.channel} 
                onValueChange={(value) => setNewMeetingForm({ ...newMeetingForm, channel: value })}
              >
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-horizon-dark border-horizon">
                  {MEETING_CHANNELS.map(channel => (
                    <SelectItem key={channel.value} value={channel.value}>
                      <div className="flex items-center gap-2">
                        <channel.icon className="w-4 h-4" />
                        {channel.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* מיקום - רק אם פגישה פיזית */}
            {newMeetingForm.channel === 'office' && (
              <div>
                <Label className="text-horizon-text mb-2 block font-medium">מיקום</Label>
                <Input
                  value={newMeetingForm.location}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, location: e.target.value })}
                  placeholder="כתובת הפגישה"
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
            )}

            {/* תיאור */}
            <div>
              <Label className="text-horizon-text mb-2 block font-medium">תיאור / הערות מקדימות</Label>
              <Textarea
                value={newMeetingForm.description}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, description: e.target.value })}
                placeholder="נושאים לדיון, הכנות נדרשות..."
                className="bg-horizon-card border-horizon text-horizon-text min-h-[80px]"
              />
            </div>

            {/* אפשרויות זימון */}
            <div className="bg-horizon-card/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-horizon-text flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-horizon-primary" />
                אפשרויות זימון
              </h4>
              
              <div className="flex items-center gap-3">
                <Checkbox
                  id="invite_customer"
                  checked={newMeetingForm.invite_customer}
                  onCheckedChange={(checked) => setNewMeetingForm(prev => ({ ...prev, invite_customer: !!checked }))}
                  className="border-horizon-primary data-[state=checked]:bg-horizon-primary data-[state=checked]:text-white"
                />
                <Label htmlFor="invite_customer" className="text-horizon-text cursor-pointer">
                  שלח זימון ללקוח ({customer.email})
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="send_reminder"
                  checked={newMeetingForm.send_reminder}
                  onCheckedChange={(checked) => setNewMeetingForm(prev => ({ ...prev, send_reminder: !!checked }))}
                  className="border-horizon-primary data-[state=checked]:bg-horizon-primary data-[state=checked]:text-white"
                />
                <Label htmlFor="send_reminder" className="text-horizon-text cursor-pointer">
                  שלח תזכורת לפני הפגישה
                </Label>
              </div>

              <p className="text-xs text-horizon-accent">
                * הזימון יישלח דרך אימייל לכתובות המייל של מנהל הכספים והלקוח
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewMeetingModal(false);
                resetNewMeetingForm();
              }}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button 
              onClick={handleCreateMeeting}
              disabled={isCreating}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  יוצר פגישה...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4 ml-2" />
                  צור פגישה
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* מודל פרטי פגישה ועריכה */}
      <Dialog open={showMeetingDetailsModal} onOpenChange={(open) => {
        if (!open) {
          setShowMeetingDetailsModal(false);
          setSelectedMeeting(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="text-horizon-text flex items-center gap-2 text-xl">
                  <Calendar className="w-6 h-6 text-horizon-primary" />
                  פרטי פגישה
                </DialogTitle>
                <DialogDescription className="text-horizon-accent">
                  {customer.business_name || customer.full_name} ~ {currentUser?.full_name || 'מנהל כספים'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* פרטי פעילות - Header */}
                <div className="bg-horizon-card/30 rounded-lg p-4 border border-horizon">
                  <h3 className="text-horizon-primary font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    פרטי פעילות
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* תאריך התחלה */}
                    <div>
                      <Label className="text-horizon-accent text-sm">תאריך התחלה</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="date"
                          value={selectedMeeting.start_date}
                          onChange={(e) => setSelectedMeeting({ ...selectedMeeting, start_date: e.target.value })}
                          className="bg-horizon-card border-horizon text-horizon-text flex-1"
                        />
                        <Input
                          type="time"
                          value={selectedMeeting.start_time}
                          onChange={(e) => setSelectedMeeting({ ...selectedMeeting, start_time: e.target.value })}
                          className="bg-horizon-card border-horizon text-horizon-text w-24"
                        />
                      </div>
                    </div>

                    {/* תאריך סיום */}
                    <div>
                      <Label className="text-horizon-accent text-sm">תאריך סיום</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="date"
                          value={selectedMeeting.end_date}
                          onChange={(e) => setSelectedMeeting({ ...selectedMeeting, end_date: e.target.value })}
                          className="bg-horizon-card border-horizon text-horizon-text flex-1"
                        />
                        <Input
                          type="time"
                          value={selectedMeeting.end_time}
                          onChange={(e) => setSelectedMeeting({ ...selectedMeeting, end_time: e.target.value })}
                          className="bg-horizon-card border-horizon text-horizon-text w-24"
                        />
                      </div>
                    </div>

                    {/* נושא */}
                    <div className="col-span-2">
                      <Label className="text-horizon-accent text-sm">נושא</Label>
                      <Input
                        value={selectedMeeting.subject}
                        onChange={(e) => setSelectedMeeting({ ...selectedMeeting, subject: e.target.value })}
                        className="bg-horizon-card border-horizon text-horizon-text mt-1"
                      />
                    </div>

                    {/* ערוץ פגישה */}
                    <div>
                      <Label className="text-horizon-accent text-sm">ערוץ פגישה</Label>
                      <Select 
                        value={selectedMeeting.channel} 
                        onValueChange={(value) => setSelectedMeeting({ ...selectedMeeting, channel: value })}
                      >
                        <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-horizon-dark border-horizon">
                          {MEETING_CHANNELS.map(channel => (
                            <SelectItem key={channel.value} value={channel.value}>
                              {channel.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* סטטוס */}
                    <div>
                      <Label className="text-horizon-accent text-sm">סטטוס</Label>
                      <Select 
                        value={selectedMeeting.status} 
                        onValueChange={(value) => setSelectedMeeting({ ...selectedMeeting, status: value })}
                      >
                        <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-horizon-dark border-horizon">
                          {MEETING_STATUSES.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              <div className="flex items-center gap-2">
                                <status.icon className="w-4 h-4" />
                                {status.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* מי נפגש */}
                    <div>
                      <Label className="text-horizon-accent text-sm">מי נפגש</Label>
                      <p className="text-horizon-primary mt-1">{currentUser?.full_name || 'מנהל כספים'}</p>
                    </div>

                    {/* לקוח */}
                    <div>
                      <Label className="text-horizon-accent text-sm">לקוח</Label>
                      <p className="text-horizon-primary mt-1">{customer.business_name || customer.full_name}</p>
                    </div>

                    {/* מיקום */}
                    {selectedMeeting.channel === 'office' && (
                      <div className="col-span-2">
                        <Label className="text-horizon-accent text-sm">מיקום</Label>
                        <Input
                          value={selectedMeeting.location || ''}
                          onChange={(e) => setSelectedMeeting({ ...selectedMeeting, location: e.target.value })}
                          placeholder="כתובת הפגישה"
                          className="bg-horizon-card border-horizon text-horizon-text mt-1"
                        />
                      </div>
                    )}

                    {/* תיאור */}
                    <div className="col-span-2">
                      <Label className="text-horizon-accent text-sm">תיאור</Label>
                      <Textarea
                        value={selectedMeeting.description || ''}
                        onChange={(e) => setSelectedMeeting({ ...selectedMeeting, description: e.target.value })}
                        placeholder="תיאור הפגישה..."
                        className="bg-horizon-card border-horizon text-horizon-text mt-1 min-h-[60px]"
                      />
                    </div>
                  </div>
                </div>

                {/* סיכום פגישה */}
                <div className="bg-horizon-card/30 rounded-lg p-4 border border-horizon">
                  <h3 className="text-horizon-primary font-semibold mb-4 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    סיכום פגישה
                  </h3>

                  {/* נוכחים בפגישה */}
                  <div className="mb-4">
                    <Label className="text-horizon-text font-medium">*נוכחים בפגישה:*</Label>
                    <Input
                      value={selectedMeeting.participants || ''}
                      onChange={(e) => setSelectedMeeting({ ...selectedMeeting, participants: e.target.value })}
                      placeholder="שמות המשתתפים בפגישה"
                      className="bg-horizon-card border-horizon text-horizon-text mt-1"
                    />
                  </div>

                  {/* עיקרי הדברים שעלו */}
                  <div className="mb-4">
                    <Label className="text-horizon-text font-medium">*עיקרי הדברים שעלו:*</Label>
                    <div className="space-y-2 mt-2">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-horizon-accent w-6">{index + 1}.</span>
                          <Input
                            value={(selectedMeeting.main_points || [])[index] || ''}
                            onChange={(e) => updateMainPoint(index, e.target.value)}
                            placeholder={`נקודה ${index + 1}`}
                            className="bg-horizon-card border-horizon text-horizon-text flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* משימות */}
                  <div className="mb-4">
                    <Label className="text-horizon-text font-medium">*משימות:*</Label>
                    <Textarea
                      value={selectedMeeting.tasks || ''}
                      onChange={(e) => setSelectedMeeting({ ...selectedMeeting, tasks: e.target.value })}
                      placeholder="משימות שנקבעו בפגישה..."
                      className="bg-horizon-card border-horizon text-horizon-text mt-1 min-h-[80px]"
                    />
                  </div>

                  {/* תאריך פגישה הבאה */}
                  <div className="mb-4">
                    <Label className="text-horizon-text font-medium">*תאריך פגישה הבאה:*</Label>
                    <Input
                      type="date"
                      value={selectedMeeting.next_meeting_date || ''}
                      onChange={(e) => setSelectedMeeting({ ...selectedMeeting, next_meeting_date: e.target.value })}
                      className="bg-horizon-card border-horizon text-horizon-text mt-1 w-48"
                    />
                    {!selectedMeeting.next_meeting_date && (
                      <span className="text-horizon-accent text-sm mr-2">טרם נקבעה</span>
                    )}
                  </div>

                  {/* סיכום לווצאפ */}
                  <div>
                    <Label className="text-horizon-text font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-400" />
                      סיכום לווצאפ
                    </Label>
                    <Textarea
                      value={selectedMeeting.whatsapp_summary || ''}
                      onChange={(e) => setSelectedMeeting({ ...selectedMeeting, whatsapp_summary: e.target.value })}
                      placeholder="סיכום קצר לשליחה בווצאפ ללקוח..."
                      className="bg-horizon-card border-horizon text-horizon-text mt-1 min-h-[100px]"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const summary = generateMeetingSummary(selectedMeeting);
                          navigator.clipboard.writeText(summary);
                          showSuccess('הסיכום הועתק ללוח');
                        }}
                        className="border-horizon text-horizon-text"
                      >
                        <Copy className="w-4 h-4 ml-2" />
                        העתק סיכום
                      </Button>
                      {customer.phone && (
                        <Button
                          size="sm"
                          onClick={handleSendWhatsAppSummary}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={!selectedMeeting.whatsapp_summary}
                        >
                          <Send className="w-4 h-4 ml-2" />
                          שלח לווצאפ
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* מידע נוסף */}
                <div className="bg-horizon-card/30 rounded-lg p-4 border border-horizon">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-horizon-accent">נוצר על ידי:</span>
                      <span className="text-horizon-primary mr-2">{selectedMeeting.created_by || currentUser?.full_name}</span>
                    </div>
                    {selectedMeeting.created_date && (
                      <div>
                        <span className="text-horizon-accent">נוצר בתאריך:</span>
                        <span className="text-horizon-text mr-2">
                          {format(new Date(selectedMeeting.created_date), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    {selectedMeeting.google_event_id && (
                      <div className="col-span-2">
                        <span className="text-horizon-accent">מזהה אירוע בגוגל:</span>
                        <span className="text-horizon-text mr-2 font-mono text-xs">{selectedMeeting.google_event_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex justify-between items-center border-t border-horizon pt-4">
                <Button
                  variant="ghost"
                  onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק פגישה
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowMeetingDetailsModal(false);
                      setSelectedMeeting(null);
                    }}
                    className="border-horizon text-horizon-text"
                  >
                    ביטול
                  </Button>
                  <Button 
                    onClick={handleUpdateMeeting}
                    disabled={isSaving}
                    className="btn-horizon-primary"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                        שמור שינויים
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}