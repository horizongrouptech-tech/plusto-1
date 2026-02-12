import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Save,
  X,
  Trash2,
  Calendar as CalendarIcon,
  User,
  Clock,
  Loader2,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import GoalCommentsModal from '@/components/admin/goals/GoalCommentsModal';
import MentionInput from '@/components/shared/MentionInput';
import GoalDependenciesSelector from './GoalDependenciesSelector';
import { toast } from "sonner";

export default function TaskDetailsModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  allUsers = [],
  customer = null,
  currentUser = null
}) {
  const queryClient = useQueryClient();
  const [editedTask, setEditedTask] = useState(task || {
    customer_email: customer?.email,
    assignee_email: currentUser?.email,
    assigned_users: currentUser?.email ? [currentUser.email] : []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // טעינת כל היעדים עבור selector התלויות
  const { data: allGoals = [] } = useQuery({
    queryKey: ['customerGoals', customer?.email],
    queryFn: () => base44.entities.CustomerGoal.filter({
      customer_email: customer?.email,
      is_active: true
    }),
    enabled: !!customer?.email && isOpen
  });

  useEffect(() => {
    if (task) {
      setEditedTask(task);
    } else if (!task && customer && currentUser) {
      // משימה חדשה - הגדרת ברירות מחדל
      setEditedTask({
        customer_email: customer.email,
        assignee_email: currentUser.email,
        assigned_users: [currentUser.email]
      });
    }
  }, [task, customer, currentUser]);

  const statusOptions = [
    { value: 'open', label: 'פתוח', color: 'bg-gray-500' },
    { value: 'in_progress', label: 'בביצוע', color: 'bg-blue-500' },
    { value: 'done', label: 'הושלם', color: 'bg-green-500' },
    { value: 'delayed', label: 'באיחור', color: 'bg-red-500' },
    { value: 'cancelled', label: 'בוטל', color: 'bg-gray-400' }
  ];

  const handleSave = async () => {
    if (!editedTask.name?.trim()) {
      toast.warning('יש להזין שם למשימה');
      return;
    }

    if (!editedTask.end_date) {
      toast.warning('יש להזין תאריך יעד');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        name: editedTask.name,
        status: editedTask.status,
        start_date: editedTask.start_date,
        end_date: editedTask.end_date,
        assignee_email: editedTask.assignee_email,
        notes: editedTask.notes,
        due_time: editedTask.due_time,
        customer_email: editedTask.customer_email || customer?.email,
        depends_on_goal_ids: editedTask.depends_on_goal_ids || []
      };

      await base44.entities.CustomerGoal.update(task.id, dataToSave);

      queryClient.invalidateQueries(['customerGoals', customer?.email]);
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error('שגיאה בשמירת המשימה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) return;

    try {
      await base44.entities.CustomerGoal.delete(task.id);
      queryClient.invalidateQueries(['customerGoals', customer?.email]);
      if (onDelete) onDelete();
      onClose();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error('שגיאה במחיקת המשימה');
    }
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-horizon-primary" />
              פרטי משימה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* שם המשימה */}
            <div>
              <label className="text-sm text-horizon-accent mb-2 block">שם המשימה *</label>
              <Input
                value={editedTask.name || ''}
                onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="הזן שם למשימה..."
              />
            </div>

            {/* סטטוס */}
            <div>
              <label className="text-sm text-horizon-accent mb-2 block">סטטוס</label>
              <Select
                value={editedTask.status || 'open'}
                onValueChange={(value) => setEditedTask({ ...editedTask, status: value })}
              >
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-horizon-dark border-horizon">
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* תאריכים */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-horizon-accent mb-2 block">תאריך התחלה</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-horizon-card border-horizon text-horizon-text"
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {editedTask.start_date ? format(new Date(editedTask.start_date), 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon">
                    <Calendar
                      mode="single"
                      selected={editedTask.start_date ? new Date(editedTask.start_date) : undefined}
                      onSelect={(date) => setEditedTask({ 
                        ...editedTask, 
                        start_date: date ? date.toISOString().split('T')[0] : null 
                      })}
                      locale={he}
                      className="text-horizon-text"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm text-horizon-accent mb-2 block">תאריך יעד *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-horizon-card border-horizon text-horizon-text"
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {editedTask.end_date ? format(new Date(editedTask.end_date), 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon">
                    <Calendar
                      mode="single"
                      selected={editedTask.end_date ? new Date(editedTask.end_date) : undefined}
                      onSelect={(date) => setEditedTask({ 
                        ...editedTask, 
                        end_date: date ? date.toISOString().split('T')[0] : null 
                      })}
                      locale={he}
                      className="text-horizon-text"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* שעת יעד */}
            <div>
              <label className="text-sm text-horizon-accent mb-2 block">שעת יעד (אופציונלי)</label>
              <Input
                type="time"
                value={editedTask.due_time || ''}
                onChange={(e) => setEditedTask({ ...editedTask, due_time: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            {/* אחראי */}
            {allUsers.length > 0 && (
              <div>
                <label className="text-sm text-horizon-accent mb-2 block">אחראי</label>
                <Select
                  value={editedTask.assignee_email || ''}
                  onValueChange={(value) => setEditedTask({ ...editedTask, assignee_email: value })}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue placeholder="בחר אחראי" />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-dark border-horizon">
                    <SelectItem value={null}>ללא אחראי</SelectItem>
                    {allUsers.map(user => (
                      <SelectItem key={user.email} value={user.email}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* תלויות ביעדים - רק ליעדים ראשיים */}
            {(!task?.parent_id || task?.task_type === 'goal') && (
              <div>
                <GoalDependenciesSelector
                  goals={allGoals}
                  currentGoalId={task?.id}
                  selectedDependencies={editedTask.depends_on_goal_ids || []}
                  onChange={(deps) => setEditedTask({ ...editedTask, depends_on_goal_ids: deps })}
                />
              </div>
            )}

            {/* הערות */}
            <div>
              <label className="text-sm text-horizon-accent mb-2 block">הערות</label>
              <MentionInput
                value={editedTask.notes || ''}
                onChange={(val) => setEditedTask({ ...editedTask, notes: val })}
                customerEmail={task?.customer_email}
                placeholder="הוסף הערות ותייג משתמשים..."
                className="min-h-[100px]"
              />
            </div>

            {/* כפתור הערות ותגובות */}
            <Button
              variant="outline"
              onClick={() => setShowComments(true)}
              className="w-full border-horizon text-horizon-primary hover:bg-horizon-primary/10"
            >
              <MessageSquare className="w-4 h-4 ml-2" />
              הערות ותגובות
            </Button>
          </div>

          <DialogFooter className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק משימה
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-horizon text-horizon-text"
                disabled={isSaving}
              >
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-horizon-primary"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    שמור
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      {showComments && task && (
        <GoalCommentsModal
          goal={task}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}