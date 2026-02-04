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
import { toast } from 'sonner';

export default function UnifiedTaskModal({ 
  isOpen, 
  onClose, 
  customer, 
  currentUser, 
  allGoals = [], 
  onSuccess,
  existingTask = null,
  mode = 'create' // 'create' או 'edit'
}) {
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
  const [isStandalone, setIsStandalone] = useState(false);

  const { allUsers = [] } = useUsers();

  const relevantUsers = useMemo(() => {
    if (!customer || !allUsers || allUsers.length === 0) return [];

    const assignedPrimary = customer.assigned_financial_manager_email;
    const assignedAdditional = customer.additional_assigned_financial_manager_emails || [];

    if (!assignedPrimary && assignedAdditional.length === 0) {
      return allUsers.filter((u) => u.user_type !== 'financial_manager');
    }

    return allUsers.filter((u) => {
      if (u.user_type !== 'financial_manager') return true;
      return u.email === assignedPrimary || assignedAdditional.includes(u.email);
    });
  }, [allUsers, customer]);

  useEffect(() => {
    if (mode === 'edit' && existingTask) {
      setName(existingTask.name || '');
      setNotes(existingTask.notes || '');
      setStartDate(existingTask.start_date || new Date().toISOString().split('T')[0]);
      setEndDate(existingTask.end_date || new Date().toISOString().split('T')[0]);
      setEndTime(existingTask.due_time || '09:00');
      
      if (existingTask.reminder_date) {
        const reminderDateTime = new Date(existingTask.reminder_date);
        setReminderDate(reminderDateTime.toISOString().split('T')[0]);
        setReminderTime(reminderDateTime.toTimeString().slice(0, 5));
      }
      
      setParentGoalId(existingTask.parent_id || '');
      setAssigneeEmail(existingTask.assignee_email || '');
      setTaggedUsers(existingTask.tagged_users || []);
      setStatus(existingTask.status || 'open');
      setIsStandalone(!existingTask.parent_id);
    } else if (currentUser && !assigneeEmail) {
      setAssigneeEmail(currentUser.email);
    }
  }, [mode, existingTask, currentUser, assigneeEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('יש להזין שם למשימה');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('יש להזין תאריכים');
      return;
    }

    setIsSubmitting(true);
    try {
      const endDateTime = endDate && endTime ? `${endDate}T${endTime}:00` : null;
      const reminderDateTime = reminderDate && reminderTime ? `${reminderDate}T${reminderTime}:00` : null;

      const taskData = {
        customer_email: customer.email,
        name: name.trim(),
        notes,
        start_date: startDate,
        end_date: endDate,
        end_date_time: endDateTime,
        reminder_date: reminderDateTime,
        parent_id: (!isStandalone && parentGoalId && parentGoalId !== 'no_goal') ? parentGoalId : null,
        status,
        assignee_email: assigneeEmail || currentUser?.email,
        tagged_users: taggedUsers,
        task_type: 'one_time',
        is_active: true,
        order_index: 0
      };

      let savedTask;
      if (mode === 'edit' && existingTask) {
        await base44.entities.CustomerGoal.update(existingTask.id, taskData);
        savedTask = { ...existingTask, ...taskData };
        toast.success('המשימה עודכנה בהצלחה');
      } else {
        savedTask = await base44.entities.CustomerGoal.create(taskData);
        toast.success('המשימה נוצרה בהצלחה');
        
        // נוטיפיקציות רק ביצירה
        Promise.all(taggedUsers.map(async (taggedEmail) => {
          try {
            await base44.entities.Notification.create({
              recipient_email: taggedEmail,
              sender_email: currentUser?.email,
              type: 'tagged_in_task',
              title: `תויגת במשימה: ${name.trim()}`,
              message: `${currentUser?.full_name || currentUser?.email} תייג/תייגה אותך במשימה "${name.trim()}"`,
              related_entity_id: savedTask.id,
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
      }

      // סנכרון לפיירברי
      syncTaskToFireberry({ taskId: savedTask.id }).catch(error => {
        console.error('Failed to sync task to Fireberry:', error);
      });

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('שגיאה בשמירת המשימה: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
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
    setIsStandalone(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-primary flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            {mode === 'edit' ? 'עריכת משימה' : 'הוסף משימה חדשה'}
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
              className="bg-horizon-card border-horizon text-horizon-text"
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
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-horizon-text">שיוך ליעד</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsStandalone(!isStandalone)}
                className="text-horizon-accent text-xs"
              >
                {isStandalone ? 'קשור ליעד' : 'משימה עצמאית'}
              </Button>
            </div>
            {!isStandalone && (
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
            )}
            {isStandalone && (
              <Badge className="bg-horizon-primary/20 text-horizon-primary">
                משימה עצמאית - ללא שיוך ליעד
              </Badge>
            )}
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
                          type="button"
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
              {mode === 'edit' ? 'שמור שינויים' : 'צור משימה'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}