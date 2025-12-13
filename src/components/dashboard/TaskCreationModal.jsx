import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, Circle, Clock, CheckCircle2, AlertCircle, Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

export default function TaskCreationModal({ isOpen, onClose, currentUser, isAdmin, customers, taskToEdit }) {
  const queryClient = useQueryClient();

  // State for form fields
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderDate, setReminderDate] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState(currentUser.email);
  const [customerEmail, setCustomerEmail] = useState('');
  const [status, setStatus] = useState('open');

  // טעינת כל המשתמשים (עבור בחירת גורם מבצע)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: isOpen // Load only when modal is open
  });

  // Effect to reset form fields
  useEffect(() => {
    if (taskToEdit) {
      setName(taskToEdit.name || '');
      setNotes(taskToEdit.notes || '');
      setStartDate(taskToEdit.start_date ? taskToEdit.start_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setEndDate(taskToEdit.end_date ? taskToEdit.end_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setReminderDate(taskToEdit.reminder_date ? taskToEdit.reminder_date.split('T')[0] : '');
      setAssigneeEmail(taskToEdit.assignee_email || currentUser.email);
      setCustomerEmail(taskToEdit.customer_email || '');
      setStatus(taskToEdit.status || 'open');
    } else {
      setName('');
      setNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
      setReminderDate('');
      setAssigneeEmail(currentUser.email);
      setCustomerEmail('');
      setStatus('open');
    }
  }, [taskToEdit, currentUser, isOpen]);

  // Helper function for status display with icons and colors
  const getStatusDisplay = (statusValue) => {
    const statusConfig = {
      open: { label: 'פתוח', icon: Circle, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
      in_progress: { label: 'בביצוע', icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
      done: { label: 'הושלם', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
      delayed: { label: 'באיחור', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' }
    };
    return statusConfig[statusValue] || statusConfig.open;
  };

  // Mutation for creating a task
  const createTaskMutation = useMutation({
    mutationFn: (newTaskData) => base44.entities.CustomerGoal.create(newTaskData),
    onSuccess: () => {
      queryClient.invalidateQueries(['dailyTasks']); // Invalidate relevant queries
      onClose(); // Close modal on success
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      alert('שגיאה ביצירת המשימה: ' + error.message);
    },
  });

  // Mutation for updating a task
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updatedTaskData }) => base44.entities.CustomerGoal.update(id, updatedTaskData),
    onSuccess: () => {
      queryClient.invalidateQueries(['dailyTasks']); // Invalidate relevant queries
      onClose(); // Close modal on success
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      alert('שגיאה בעדכון המשימה: ' + error.message);
    },
  });

  // Handle form submission for both creation and editing
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name) {
      alert('יש להזין שם למשימה');
      return;
    }

    if (!customerEmail) {
      alert('יש לבחור לקוח - כל משימה חייבת להיות משויכת ללקוח');
      return;
    }

    if (!endDate) {
      alert('יש להזין תאריך סיום - זהו שדה חובה');
      return;
    }

    const taskPayload = {
      name,
      notes,
      status,
      start_date: startDate,
      end_date: endDate,
      reminder_date: reminderDate || null,
      assignee_email: assigneeEmail,
      customer_email: customerEmail || null,
      task_type: 'one_time',
      is_active: true
    };

    if (taskToEdit) {
      // If taskToEdit exists, perform an update
      updateTaskMutation.mutate({ id: taskToEdit.id, updatedTaskData: taskPayload });
    } else {
      // Otherwise, perform a creation
      createTaskMutation.mutate(taskPayload);
    }
  };

  // Prepare customer data for the select input
  const availableCustomers = customers || []; // Changed allCustomers to customers

  // Prepare assignable users data. For simplicity, only currentUser is assignable.
  // In a real app, this would be a list of users from the backend.
  const assignableUsers = [currentUser];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-xl font-bold text-horizon-primary flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {taskToEdit ? 'עריכת משימה' : 'יצירת משימה חדשה'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* שם המשימה */}
          <div>
            <Label htmlFor="taskName" className="text-right block mb-2 text-horizon-text">שם המשימה *</Label>
            <Input
              id="taskName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: בדיקת דוחות כספיים ללקוח X"
              className="bg-horizon-card border-horizon text-horizon-text"
              required
            />
          </div>

          {/* הערות */}
          <div>
            <Label htmlFor="taskNotes" className="text-right block mb-2 text-horizon-text">הערות</Label>
            <Textarea
              id="taskNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים על המשימה..."
              className="bg-horizon-card border-horizon text-horizon-text h-24"
            />
          </div>

          {/* תאריכים */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="startDate" className="text-right block mb-2 text-horizon-text text-xs">תאריך התחלה</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text px-2"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-right block mb-2 text-horizon-text text-xs">תאריך יעד *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text px-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="reminderDate" className="text-right block mb-2 text-horizon-text text-xs flex items-center gap-1">
                <Bell className="w-3 h-3" /> תזכורת
              </Label>
              <Input
                id="reminderDate"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text px-2"
              />
            </div>
          </div>

          {/* שיוך ללקוח - שדה חובה */}
          <div>
            <Label htmlFor="customer" className="text-right block mb-2 text-horizon-text">
              לקוח *
            </Label>
            <Select
              value={customerEmail}
              onValueChange={setCustomerEmail}
              containerClassName="w-full"
            >
              <SelectTrigger className="w-full min-w-[350px] bg-horizon-card border-horizon text-horizon-text text-right">
                <SelectValue placeholder="בחר לקוח">
                  {customerEmail ? (
                    (() => {
                      const selected = availableCustomers.find(c => c.email === customerEmail);
                      return selected ? (
                        <div className="flex flex-col items-end w-full">
                          <span className="font-medium text-horizon-text">{selected.business_name || selected.full_name}</span>
                          <span className="text-xs text-horizon-accent">{selected.email}</span>
                        </div>
                      ) : 'בחר לקוח';
                    })()
                  ) : 'בחר לקוח'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-full min-w-[350px] max-h-[300px] bg-horizon-dark border-horizon">
                {availableCustomers.map(customer => (
                  <SelectItem 
                    key={customer.id || customer.email} 
                    value={customer.email} 
                    className="text-right hover:bg-horizon-primary/20 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col items-end w-full py-2 gap-1">
                      <span className="font-semibold text-horizon-text text-base">
                        {customer.business_name || customer.full_name}
                      </span>
                      <span className="text-xs text-horizon-accent">{customer.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-horizon-accent mt-1 text-right">
              חובה לבחור לקוח - כל משימה חייבת להיות משויכת ללקוח.
            </p>
          </div>

          {/* אחראי (גורם מבצע) */}
          <div>
            <Label htmlFor="assignee" className="text-right block mb-2 text-horizon-text">
              גורם מבצע (אחראי)
            </Label>
            <Select value={assigneeEmail} onValueChange={setAssigneeEmail}>
              <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text text-right">
                <SelectValue placeholder="בחר גורם מבצע" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon max-h-[200px]">
                {allUsers.map((user) => (
                  <SelectItem key={user.id || user.email} value={user.email} className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-medium">{user.full_name || 'משתמש ללא שם'}</span>
                      <span className="text-xs text-horizon-accent">{user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* סטטוס */}
          <div>
            <Label htmlFor="status" className="text-right block mb-2 text-horizon-text">
              סטטוס
            </Label>
            <Select
              value={status}
              onValueChange={setStatus}
            >
              <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text text-right">
                <SelectValue>
                  {(() => {
                    const display = getStatusDisplay(status);
                    const StatusIcon = display.icon;
                    return (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="font-medium">{display.label}</span>
                        <StatusIcon className={`w-5 h-5 ${display.color}`} />
                      </div>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                {['open', 'in_progress', 'done', 'delayed'].map((statusValue) => {
                  const display = getStatusDisplay(statusValue);
                  const StatusIcon = display.icon;
                  return (
                    <SelectItem 
                      key={statusValue} 
                      value={statusValue} 
                      className={`text-right cursor-pointer ${display.bgColor} hover:opacity-80 transition-opacity`}
                    >
                      <div className="flex items-center gap-3 justify-end w-full py-1">
                        <span className={`font-medium text-base ${display.color}`}>{display.label}</span>
                        <StatusIcon className={`w-5 h-5 ${display.color}`} />
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isLoading || updateTaskMutation.isLoading}
              className="btn-horizon-primary"
            >
              {(createTaskMutation.isLoading || updateTaskMutation.isLoading) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {taskToEdit ? 'שמור שינויים' : 'צור משימה'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}