import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListTodo, Loader2, Save, UserPlus, Mail, X, CalendarIcon } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useUsers } from './UsersContext';
import { syncTaskToFireberry } from '@/functions/syncTaskToFireberry';
import { toast } from "sonner";

export default function CreateTaskModal({ isOpen, onClose, customer, currentUser, allGoals = [], onSuccess }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('09:00');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [parentGoalId, setParentGoalId] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [status, setStatus] = useState('open');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // שימוש ב-Context במקום query מקומי
  const { allUsers = [] } = useUsers();

  // סינון משתמשים לפי הלוגיקה: משתמשים רגילים + מנהלי כספים המשויכים ללקוח
  const relevantUsers = useMemo(() => {
    if (!customer || !allUsers || allUsers.length === 0) return [];

    const assignedPrimary = customer.assigned_financial_manager_email;
    const assignedAdditional = customer.additional_assigned_financial_manager_emails || [];

    // אם אין מנהלי כספים משויכים - להציג רק משתמשים רגילים
    if (!assignedPrimary && assignedAdditional.length === 0) {
      return allUsers.filter((u) => u.user_type !== 'financial_manager');
    }

    // משתמשים רגילים + מנהלי כספים משויכים בלבד
    return allUsers.filter((u) => {
      // אם זה לא מנהל כספים - להציג
      if (u.user_type !== 'financial_manager') return true;

      // אם זה מנהל כספים - להציג רק אם הוא משויך ללקוח
      return u.email === assignedPrimary || assignedAdditional.includes(u.email);
    });
  }, [allUsers, customer]);

  useEffect(() => {
    if (!assigneeEmail && (customer || currentUser)) {
      setAssigneeEmail(customer?.assigned_financial_manager_email || currentUser?.email || '');
    }
  }, [currentUser, customer, assigneeEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('יש להזין שם למשימה');
      return;
    }
    if (!startDate) {
      toast.warning('יש להזין תאריך התחלה');
      return;
    }
    if (!endDate) {
      toast.warning('יש להזין תאריך סיום');
      return;
    }

    setIsSubmitting(true);
    try {
      // שילוב תאריך ושעה ל-end_date_time
      const endDateTime = endDate && endTime ? `${endDate}T${endTime}:00` : null;
      // שילוב תאריך ושעה ל-reminder_date
      const reminderDateTime = reminderDate && reminderTime ? `${reminderDate}T${reminderTime}:00` : null;

      const newTask = await base44.entities.CustomerGoal.create({
        customer_email: customer.email,
        name: name.trim(),
        notes,
        start_date: startDate,
        end_date: endDate,
        end_date_time: endDateTime,
        reminder_date: reminderDateTime,
        parent_id: parentGoalId && parentGoalId !== 'no_goal' ? parentGoalId : null,
        status,
        assignee_email: assigneeEmail || customer?.assigned_financial_manager_email || currentUser?.email,
        tagged_users: taggedUsers,
        task_type: 'one_time',
        is_active: true,
        order_index: 0
      });

      // שליחת נוטיפיקציות ומיילים ברקע - לא חוסם
      Promise.all(taggedUsers.map(async (taggedEmail) => {
        try {
          await base44.entities.Notification.create({
            recipient_email: taggedEmail,
            sender_email: currentUser?.email,
            type: 'tagged_in_task',
            title: `תויגת במשימה: ${name.trim()}`,
            message: `${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך במשימה "${name.trim()}"`,
            related_entity_id: newTask.id,
            related_entity_type: 'CustomerGoal',
            priority: 'high'
          });

          await base44.integrations.Core.SendEmail({
            to: taggedEmail,
            subject: `תויגת במשימה חדשה - ${name.trim()}`,
            body: `שלום,\n\n${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך במשימה חדשה:\n\nשם המשימה: ${name.trim()}\nתאריך יעד: ${endDate}\n\n${notes ? `פרטים: ${notes}\n\n` : ''}היכנס למערכת לצפייה ועדכון.`
          });
        } catch (error) {
          console.error('Error sending notification/email to tagged user:', error);
        }
      })).catch(console.error);

      // סנכרון לפיירברי ברקע - לא חוסם
      syncTaskToFireberry({ taskId: newTask.id }).catch(error => {
        console.error('Failed to sync new task to Fireberry:', error);
      });

      // Reset form
      setName('');
      setNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
      setEndTime('09:00');
      setReminderDate('');
      setReminderTime('09:00');
      setParentGoalId('');
      setStatus('open');
      setAssigneeEmail(currentUser?.email || '');
      setTaggedUsers([]);

      onSuccess();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('שגיאה ביצירת המשימה');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-primary flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            הוסף משימה חדשה
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label className="text-right block mb-2 text-horizon-text">שם המשימה *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="הזן שם למשימה..."
              className="bg-horizon-card border-horizon text-horizon-text"
              required
            />
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">תיאור / הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים..."
              className="bg-horizon-card border-horizon text-horizon-text h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך התחלה *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-end text-right bg-horizon-card border-horizon text-horizon-text"
                  >
                    {startDate ? (
                      format(new Date(startDate), 'dd/MM/yyyy', { locale: he })
                    ) : (
                      <span className="text-horizon-accent">בחר תאריך</span>
                    )}
                    <CalendarIcon className="w-4 h-4 mr-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon" align="end">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
                      }
                    }}
                    locale={he}
                    className="text-horizon-text"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך סיום *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-end text-right bg-horizon-card border-horizon text-horizon-text"
                  >
                    {endDate ? (
                      format(new Date(endDate), 'dd/MM/yyyy', { locale: he })
                    ) : (
                      <span className="text-horizon-accent">בחר תאריך</span>
                    )}
                    <CalendarIcon className="w-4 h-4 mr-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon" align="end">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
                      }
                    }}
                    locale={he}
                    className="text-horizon-text"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שעת יעד</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-horizon-card border-horizon text-horizon-text [color-scheme:dark]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-right block mb-2 text-horizon-text">תאריך תזכורת</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-end text-right bg-horizon-card border-horizon text-horizon-text"
                  >
                    {reminderDate ? (
                      format(new Date(reminderDate), 'dd/MM/yyyy', { locale: he })
                    ) : (
                      <span className="text-horizon-accent">בחר תאריך</span>
                    )}
                    <CalendarIcon className="w-4 h-4 mr-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon" align="end">
                  <Calendar
                    mode="single"
                    selected={reminderDate ? new Date(reminderDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setReminderDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
                      }
                    }}
                    locale={he}
                    className="text-horizon-text"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-right block mb-2 text-horizon-text">שעת תזכורת</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">שיוך ליעד (אופציונלי)</Label>
            <Select value={parentGoalId || 'no_goal'} onValueChange={setParentGoalId}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר יעד לשיוך..." />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="no_goal">ללא שיוך ליעד</SelectItem>
                {allGoals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">אחראי</Label>
            <Select value={assigneeEmail || ''} onValueChange={setAssigneeEmail}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר אחראי" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                {relevantUsers.map((u) => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text">סטטוס</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="open">פתוח</SelectItem>
                <SelectItem value="in_progress">בביצוע</SelectItem>
                <SelectItem value="done">הושלם</SelectItem>
                <SelectItem value="delayed">באיחור</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2 text-horizon-text flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-horizon-primary" />
              תיוג משתמשים (יקבלו נוטיפיקציה ומייל)
            </Label>
            <div className="space-y-2">
              <Select
                value=""
                onValueChange={(email) => {
                  if (email && !taggedUsers.includes(email)) {
                    setTaggedUsers([...taggedUsers, email]);
                  }
                }}
              >
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="בחר משתמש לתיוג..." />
                </SelectTrigger>
                <SelectContent className="bg-horizon-dark border-horizon">
                  {relevantUsers
                    .filter((u) => !taggedUsers.includes(u.email))
                    .map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {taggedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {taggedUsers.map((email) => {
                    const user = relevantUsers.find((u) => u.email === email);
                    return (
                      <Badge key={email} className="bg-horizon-primary/20 text-horizon-primary flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user?.full_name || email}
                        <button
                          onClick={() => setTaggedUsers(taggedUsers.filter((e) => e !== email))}
                          className="mr-1 hover:bg-red-500/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting} className="btn-horizon-primary">
              {isSubmitting ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              צור משימה
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}