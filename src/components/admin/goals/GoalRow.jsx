import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  GripVertical,
  Calendar as CalendarIcon,
  User as UserIcon,
  Save,
  X,
  Trash2,
  MessageSquare,
  Edit,
  Check,
  UserPlus,
  Target,
  ListChecks } from
'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { he } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import GoalCommentsModal from './GoalCommentsModal';
import { syncTaskToFireberry } from '@/functions/syncTaskToFireberry';
import InlineEditableField from './InlineEditableField';
import GoalDependencySelector from '../GoalDependencySelector';

import { toast } from "sonner";
export default function GoalRow({ goal, users, refreshData, allGoals, isParent = false, isDragging = false, actionsSlot = null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState(goal);
  const [isSaving, setIsSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isUpdatingAssignees, setIsUpdatingAssignees] = useState(false);
  const [quickEditMode, setQuickEditMode] = useState(null); // 'name', 'date', 'notes'
  const [newExternalAssignee, setNewExternalAssignee] = useState('');
  const [newExternalAssigneeEdit, setNewExternalAssigneeEdit] = useState('');
  const [notesPopoverOpen, setNotesPopoverOpen] = useState(false);

  // Helper function to normalize external_responsible to array
  const getExternalResponsible = (externalResp) => {
    if (!externalResp) return [];
    if (Array.isArray(externalResp)) return externalResp;
    // Old data is string - convert to array
    return [externalResp];
  };

  const statusOptions = [
  { value: 'open', label: 'פתוח', color: 'bg-gray-500', badgeClass: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30' },
  { value: 'in_progress', label: 'בביצוע', color: 'bg-blue-500', badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  { value: 'done', label: 'הושלם', color: 'bg-green-500', badgeClass: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30' },
  { value: 'delayed', label: 'באיחור', color: 'bg-red-500', badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30' },
  { value: 'cancelled', label: 'בוטל', color: 'bg-gray-400', badgeClass: 'bg-gray-400/20 text-gray-700 dark:text-gray-300 border-gray-400/30' }];


  const getStatusColor = (status) => {
    return statusOptions.find((opt) => opt.value === status)?.color || 'bg-gray-500';
  };

  const getStatusLabel = (status) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

  const handleDateInputChange = (field, value) => {
    const normalized = value ? normalizeDate(value) : null;
    setEditedGoal({ ...editedGoal, [field]: normalized || value });
  };

  const normalizeDate = (dateString) => {
    if (!dateString) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    }

    try {
      const parsed = new Date(dateString);
      if (isValid(parsed)) {
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      }
    } catch (e) {
      console.warn('Invalid date format:', dateString);
    }

    return dateString;
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      let d;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        d = new Date(dateString);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        d = parse(dateString, 'dd/MM/yyyy', new Date(), { locale: he });
      } else {
        return dateString;
      }
      return isValid(d) ? format(d, 'd MMM yyyy', { locale: he }) : dateString;
    } catch {
      return dateString;
    }
  };

  const displayDate = (dateString) => {
    if (!dateString) return '';
    try {
      let d;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        d = new Date(dateString);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        d = parse(dateString, 'dd/MM/yyyy', new Date(), { locale: he });
      } else {
        return dateString;
      }
      return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: he }) : dateString;
    } catch {
      return dateString;
    }
  };

  const getDateForCalendar = (dateString) => {
    if (!dateString) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const d = new Date(dateString);
      return isValid(d) ? d : undefined;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      try {
        const parsed = parse(dateString, 'dd/MM/yyyy', new Date(), { locale: he });
        return isValid(parsed) ? parsed : undefined;
      } catch (_) {}
    }
    return undefined;
  };
  const handleQuickStatusChange = async (newStatus) => {
    try {
      await base44.entities.CustomerGoal.update(goal.id, {
        status: newStatus,
        is_active: goal.is_active !== false
      });

      // רענון מיידי
      if (refreshData) {
        refreshData();
      }

      // סנכרון לפיירברי ברקע - לא ממתינים, לא חוסם
      syncTaskToFireberry({ taskId: goal.id }).catch((error) => {
        console.error('Failed to sync to Fireberry:', error);
      });
    } catch (error) {
      console.error("Error updating status:", error);
      // לא מציג alert כדי לא לחסום את הממשק
      console.error('שגיאה בעדכון הסטטוס:', error.message);
    }
  };

  const handleSave = async () => {
    if (!editedGoal.name) {
      toast.warning('יש להזין שם ליעד/משימה');
      return;
    }

    if (!editedGoal.end_date) {
      toast.warning('יש להזין תאריך סיום - זהו שדה חובה');
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.CustomerGoal.update(goal.id, {
        name: editedGoal.name,
        status: editedGoal.status,
        start_date: normalizeDate(editedGoal.start_date),
        end_date: normalizeDate(editedGoal.end_date),
        assignee_email: editedGoal.assignee_email,
        external_responsible: editedGoal.external_responsible,
        notes: editedGoal.notes,
        due_time: editedGoal.due_time,
        is_active: goal.is_active !== false
      });

      // רענון מיידי - לא ממתינים
      refreshData();
      setIsEditing(false);

      // סנכרון לפיירברי ברקע - לא ממתינים, לא חוסם
      syncTaskToFireberry({ taskId: goal.id }).catch((error) => {
        console.error('Failed to sync to Fireberry:', error);
      });
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error('שגיאה בעדכון היעד');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    // ⚠️ בדיקה קריטית - האם זו משימה או יעד?
    const isSubtask = !!goal.parent_id;

    // אם זו משימה (לא יעד ראשי) - מחיקה פשוטה
    if (isSubtask) {
      if (!confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${goal.name}"?`)) {
        return;
      }

      try {
        console.log('🗑️ Deleting subtask:', goal.id, goal.name);

        // ✅ FIX: Ensure end_date is valid before update
        const deletePayload = { is_active: false };
        if (!goal.end_date || goal.end_date === '' || goal.end_date === 'null' || goal.end_date === 'undefined') {
          deletePayload.end_date = goal.start_date || new Date().toISOString().split('T')[0];
          console.log('⚠️ Missing end_date, using fallback:', deletePayload.end_date);
        }

        await base44.entities.CustomerGoal.update(goal.id, deletePayload);
        await refreshData();
        console.log('✅ Subtask deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting subtask:', error);
        toast.error('שגיאה במחיקת המשימה: ' + error.message);
      }
      return;
    }

    // זה יעד ראשי - בדיקה אם יש תת-משימות
    const subtasks = allGoals.filter((t) => t.parent_id === goal.id);

    if (subtasks.length > 0) {
      const confirmMessage = `⚠️ ליעד "${goal.name}" יש ${subtasks.length} תת-משימות.\n\nמה תרצה לעשות?\n\n✅ לחץ "אישור" למחוק את היעד כולל כל התת-משימות\n❌ לחץ "ביטול" לבטל את הפעולה (ניתן למחוק משימות בנפרד)`;

      if (!confirm(confirmMessage)) {
        return;
      }

      try {
        console.log('🗑️ Deleting goal with subtasks:', goal.id, goal.name, `(${subtasks.length} subtasks)`);

        // מחיקת כל התת-משימות
        for (const subtask of subtasks) {
          const subtaskPayload = { is_active: false };
          if (!subtask.end_date || subtask.end_date === '' || subtask.end_date === 'null' || subtask.end_date === 'undefined') {
            subtaskPayload.end_date = subtask.start_date || new Date().toISOString().split('T')[0];
            console.log('  ⚠️ Subtask missing end_date, using fallback:', subtaskPayload.end_date);
          }
          await base44.entities.CustomerGoal.update(subtask.id, subtaskPayload);
          console.log('  ↳ Deleted subtask:', subtask.id, subtask.name);
        }

        // מחיקת היעד עצמו
        const goalPayload = { is_active: false };
        if (!goal.end_date || goal.end_date === '' || goal.end_date === 'null' || goal.end_date === 'undefined') {
          goalPayload.end_date = goal.start_date || new Date().toISOString().split('T')[0];
          console.log('⚠️ Goal missing end_date, using fallback:', goalPayload.end_date);
        }
        await base44.entities.CustomerGoal.update(goal.id, goalPayload);
        console.log('✅ Goal and all subtasks deleted successfully');

        await refreshData();
        toast.success('היעד וכל התת-משימות נמחקו בהצלחה');
      } catch (error) {
        console.error('❌ Error deleting goal with subtasks:', error);
        toast.error('שגיאה במחיקת היעד: ' + error.message);
      }
    } else {
      // יעד ללא תת-משימות
      if (!confirm(`האם אתה בטוח שברצונך למחוק את היעד "${goal.name}"?`)) {
        return;
      }

      try {
        console.log('🗑️ Deleting goal without subtasks:', goal.id, goal.name);

        // ✅ FIX: Ensure end_date is valid before update
        const deletePayload = { is_active: false };
        if (!goal.end_date || goal.end_date === '' || goal.end_date === 'null' || goal.end_date === 'undefined') {
          deletePayload.end_date = goal.start_date || new Date().toISOString().split('T')[0];
          console.log('⚠️ Missing end_date, using fallback:', deletePayload.end_date);
        }

        await base44.entities.CustomerGoal.update(goal.id, deletePayload);
        await refreshData();
        console.log('✅ Goal deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting goal:', error);
        toast.error('שגיאה במחיקת היעד: ' + error.message);
      }
    }
  };

  const handleAddAssignee = async (email) => {
    if (isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      const currentAssignees = goal.assigned_users || [];
      if (!currentAssignees.includes(email)) {
        await base44.entities.CustomerGoal.update(goal.id, {
          assigned_users: [...currentAssignees, email]
        });
        await refreshData();
      }
    } catch (error) {
      console.error('Error adding assignee:', error);
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  const handleRemoveAssignee = async (email) => {
    if (isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      const currentAssignees = goal.assigned_users || [];
      await base44.entities.CustomerGoal.update(goal.id, {
        assigned_users: currentAssignees.filter((e) => e !== email)
      });
      await refreshData();
    } catch (error) {
      console.error('Error removing assignee:', error);
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  // הסרת אחראי אוטומטי (assignee_email) – מוצג ברשימה אך לא ב-assigned_users
  const handleRemoveAssigneeEmail = async () => {
    if (isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      await base44.entities.CustomerGoal.update(goal.id, {
        assignee_email: null,
        is_active: goal.is_active !== false
      });
      await refreshData();
    } catch (error) {
      console.error('Error removing assignee_email:', error);
      toast.error('שגיאה בהסרת האחראי');
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  const handleAddExternalAssignee = async () => {
    if (!newExternalAssignee.trim() || isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      const currentExternal = getExternalResponsible(goal.external_responsible);
      await base44.entities.CustomerGoal.update(goal.id, {
        external_responsible: [...currentExternal, newExternalAssignee.trim()]
      });
      setNewExternalAssignee('');
      await refreshData();
    } catch (error) {
      console.error('Error adding external assignee:', error);
      toast.error('שגיאה בהוספת אחראי חיצוני: ' + error.message);
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  const handleRemoveExternalAssignee = async (indexToRemove) => {
    if (isUpdatingAssignees) return;
    setIsUpdatingAssignees(true);
    try {
      const currentExternal = getExternalResponsible(goal.external_responsible);
      await base44.entities.CustomerGoal.update(goal.id, {
        external_responsible: currentExternal.filter((_, idx) => idx !== indexToRemove)
      });
      await refreshData();
    } catch (error) {
      console.error('Error removing external assignee:', error);
      toast.error('שגיאה בהסרת אחראי חיצוני: ' + error.message);
    } finally {
      setIsUpdatingAssignees(false);
    }
  };

  const handleCancel = () => {
    setEditedGoal(goal);
    setIsEditing(false);
  };

  const handleQuickSave = async (field, value) => {
    try {
      // תיקון: נורמליזציה של תאריכים לפורמט ISO
      let finalValue = value;
      if (field.includes('date') && value) {
        finalValue = normalizeDate(value);

        // ולידציה: תאריך התחלה חייב להיות לפני תאריך סיום
        if (field === 'start_date' && goal.end_date) {
          const startDate = new Date(finalValue);
          const endDate = new Date(goal.end_date);
          if (startDate > endDate) {
            toast.warning('תאריך התחלה חייב להיות לפני תאריך הסיום');
            return;
          }
        } else if (field === 'end_date' && goal.start_date) {
          const startDate = new Date(goal.start_date);
          const endDate = new Date(finalValue);
          if (endDate < startDate) {
            toast.warning('תאריך סיום חייב להיות אחרי תאריך ההתחלה');
            return;
          }
        }
      }

      const updateData = { [field]: finalValue };
      await base44.entities.CustomerGoal.update(goal.id, updateData);
      refreshData();

      // סנכרון לפיירברי ברקע
      syncTaskToFireberry({ taskId: goal.id }).catch((error) => {
        console.error('Failed to sync to Fireberry:', error);
      });
    } catch (error) {
      console.error("Error in quick save:", error);
      toast.error('שגיאה בשמירה: ' + error.message);
    }
  };

  if (isEditing) {
    return (
      <div className={`bg-horizon-card/50 border border-horizon-primary rounded-lg p-4 space-y-4 ${isDragging ? 'opacity-50' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-sm text-horizon-accent mb-2 block">שם {isParent ? 'היעד' : 'המשימה'}</label>
                        <Input
              value={editedGoal.name || ''}
              onChange={(e) => setEditedGoal({ ...editedGoal, name: e.target.value })}
              className="bg-horizon-card border-horizon text-horizon-text"
              placeholder="הזן שם..." />

                    </div>

                    <div>
                        <label className="text-sm text-horizon-accent mb-2 block">סטטוס</label>
                        <Select
              value={editedGoal.status || 'open'}
              onValueChange={(value) => setEditedGoal({ ...editedGoal, status: value })}>

                            <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((option) =>
                <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                                            {option.label}
                                        </div>
                                    </SelectItem>
                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm text-horizon-accent mb-2 block">אחראי (בחר ממערכת)</label>
                        <Select
              value={editedGoal.assignee_email || ''}
              onValueChange={(value) => setEditedGoal({ ...editedGoal, assignee_email: value || null })}>

                            <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                <SelectValue placeholder="בחר אחראי" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">ללא אחראי</SelectItem>
                                {users.map((user) => (
                                  <SelectItem key={user.email} value={user.email}>
                                    {user.full_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm text-horizon-accent mb-2 block">אחראים חיצוניים (טקסט חופשי)</label>
                        <div className="space-y-2">
                            {getExternalResponsible(editedGoal.external_responsible).length > 0 &&
              <div className="space-y-1">
                                    {getExternalResponsible(editedGoal.external_responsible).map((name, idx) =>
                <div key={idx} className="flex items-center justify-between bg-horizon-card/50 rounded px-2 py-1">
                                            <span className="text-xs text-horizon-text">{name}</span>
                                            <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const currentExternal = getExternalResponsible(editedGoal.external_responsible);
                      const newExternal = currentExternal.filter((_, i) => i !== idx);
                      setEditedGoal({ ...editedGoal, external_responsible: newExternal });
                    }}
                    className="h-5 w-5 p-0 !text-red-400 !bg-red-500/10 border border-red-500/30 hover:!bg-red-500/20 rounded">

                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                )}
                                </div>
              }
                            <div className="flex gap-2">
                                <Input
                  value={newExternalAssigneeEdit}
                  onChange={(e) => setNewExternalAssigneeEdit(e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="הזן שם (רו״ח, יועץ וכו') ולחץ הוסף"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newExternalAssigneeEdit.trim()) {
                        const currentExternal = getExternalResponsible(editedGoal.external_responsible);
                        setEditedGoal({
                          ...editedGoal,
                          external_responsible: [...currentExternal, newExternalAssigneeEdit.trim()]
                        });
                        setNewExternalAssigneeEdit('');
                      }
                    }
                  }} />

                                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (newExternalAssigneeEdit.trim()) {
                      const currentExternal = getExternalResponsible(editedGoal.external_responsible);
                      setEditedGoal({
                        ...editedGoal,
                        external_responsible: [...currentExternal, newExternalAssigneeEdit.trim()]
                      });
                      setNewExternalAssigneeEdit('');
                    }
                  }}
                  disabled={!newExternalAssigneeEdit.trim()}
                  className="btn-horizon-primary h-9">

                                    הוסף
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-horizon-accent mt-1">השתמש בשדה זה לאחראים שאינם רשומים במערכת (רו״ח, יועצים, וכו')</p>
                    </div>

                    <div>
                        <label className="text-sm text-horizon-accent mb-2 block">תאריך התחלה</label>
                        <div className="flex gap-2">
                            <Input
                type="text"
                value={displayDate(editedGoal.start_date)}
                onChange={(e) => handleDateInputChange('start_date', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="flex-1 bg-horizon-card border-horizon text-horizon-text" />

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="bg-horizon-card border-horizon text-horizon-text shrink-0">
                                        <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon">
                                    <Calendar
                    mode="single"
                    selected={getDateForCalendar(editedGoal.start_date)}
                    onSelect={(date) => setEditedGoal({
                      ...editedGoal,
                      start_date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null
                    })}
                    locale={he}
                    className="text-horizon-text" />

                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-horizon-accent mb-2 block">תאריך יעד *</label>
                        <div className="flex gap-2">
                            <Input
                type="text"
                value={displayDate(editedGoal.end_date)}
                onChange={(e) => handleDateInputChange('end_date', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="flex-1 bg-horizon-card border-horizon text-horizon-text"
                required />

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="bg-horizon-card border-horizon text-horizon-text shrink-0">
                                        <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon">
                                    <Calendar
                    mode="single"
                    selected={getDateForCalendar(editedGoal.end_date)}
                    onSelect={(date) => setEditedGoal({
                      ...editedGoal,
                      end_date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null
                    })}
                    locale={he}
                    className="text-horizon-text" />

                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {!isParent &&
          <div>
                            <label className="text-sm text-horizon-accent mb-2 block">שעת יעד (אופציונלי)</label>
                            <Input
              type="time"
              value={editedGoal.due_time || ''}
              onChange={(e) => setEditedGoal({ ...editedGoal, due_time: e.target.value })}
              className="bg-horizon-card border-horizon text-horizon-text" />

                        </div>
          }

                    <div className="md:col-span-2">
                        <label className="text-sm text-horizon-accent mb-2 block">הערות</label>
                        <Textarea
              value={editedGoal.notes || ''}
              onChange={(e) => setEditedGoal({ ...editedGoal, notes: e.target.value })}
              className="bg-horizon-card border-horizon text-horizon-text h-20"
              placeholder="הוסף הערות..." />

                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
            onClick={handleCancel}
            variant="outline"
            size="sm"
            className="border-horizon text-horizon-text"
            disabled={isSaving}>

                        <X className="w-4 h-4 ml-1" />
                        ביטול
                    </Button>
                    <Button
            onClick={handleSave}
            size="sm"
            className="btn-horizon-primary"
            disabled={isSaving}>

                        {isSaving ?
            <>
                                <span className="ml-2">שומר...</span>
                                <span className="animate-spin">⏳</span>
                            </> :

            <>
                                <Save className="w-4 h-4 ml-1" />
                                שמור
                            </>
            }
                    </Button>
                </div>
            </div>);

  }

  const gridCols = 'minmax(0, 280px) auto minmax(80px, 140px) auto 120px auto auto auto 140px';

  return (
    <div
      className={`grid items-center gap-x-2 gap-y-0 p-2 rounded-lg transition-all min-w-0 ${isDragging ? 'opacity-50' : ''} ${
        isParent
          ? 'bg-horizon-card/60 border border-horizon-primary/40 font-semibold hover:border-horizon-primary/60'
          : 'bg-horizon-card/20 border border-horizon/50 ps-6 hover:border-horizon-primary/30'
      }`}
      style={{ gridTemplateColumns: gridCols }}
    >
      {/* 1. שם היעד + אייקון + נקודה */}
      <div className="flex items-center gap-1.5 min-w-0">
        {isParent ? (
          <Target className="w-4 h-4 text-horizon-primary shrink-0" />
        ) : (
          <ListChecks className="w-3 h-3 text-horizon-accent shrink-0" />
        )}
        <div className={`w-3 h-3 rounded-full ${getStatusColor(goal.status)} shrink-0`} />
        <InlineEditableField
          value={goal.name}
          displayValue={<span className="text-horizon-text line-clamp-2 break-words block" title={goal.name}>{goal.name}</span>}
          onSave={(newValue) => handleQuickSave('name', newValue)}
          placeholder="הזן שם..."
          className="flex-1 min-w-0"
        />
      </div>

      {/* 7. סטטוס */}
      <div className="flex items-center shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button className="focus:outline-none">
              <Badge className={`${getStatusColor(goal.status)} text-white cursor-pointer hover:opacity-80 transition-opacity text-xs`}>
                {getStatusLabel(goal.status)}
              </Badge>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 bg-horizon-dark border-horizon" dir="rtl">
            <div className="space-y-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQuickStatusChange(option.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-right transition-colors ${
                    goal.status === option.value ? 'bg-horizon-primary/20 text-horizon-primary' : 'text-horizon-text hover:bg-horizon-card'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${option.color}`} />
                  <span className="text-sm">{option.label}</span>
                  {goal.status === option.value && <Check className="w-4 h-4 mr-auto" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 6. אחראים + הוספת אחראי */}
      <div className="flex items-center gap-1 text-sm text-horizon-text min-w-0 shrink-0">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {(goal.assigned_users || []).slice(0, 2).map((email) => {
            const user = users.find((u) => u.email === email);
            return (
              <Badge key={email} className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs border-blue-500/30">
                {user?.full_name || email.split('@')[0]}
              </Badge>
            );
          })}
          {(goal.assigned_users || []).length > 2 && (
            <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs border-blue-500/30">+{(goal.assigned_users || []).length - 2}</Badge>
          )}
          {getExternalResponsible(goal.external_responsible).map((name, idx) => (
            <Badge key={`ext-${idx}`} className="bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs border-purple-500/30">{name}</Badge>
          ))}
          {!(goal.assigned_users || []).length && !getExternalResponsible(goal.external_responsible).length && goal.assignee_email && (
            <Badge className="bg-gray-500/20 text-gray-700 dark:text-gray-300 text-xs border-gray-500/30">
              {users.find((u) => u.email === goal.assignee_email)?.full_name || goal.assignee_email.split('@')[0]}
            </Badge>
          )}
          {!(goal.assigned_users || []).length && !getExternalResponsible(goal.external_responsible).length && !goal.assignee_email && (
            <span className="text-gray-400 text-xs">ללא אחראי</span>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="hover:bg-horizon-primary/10 rounded p-1">
              <UserPlus className="w-3 h-3 text-horizon-primary" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-horizon-dark border-horizon p-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-horizon-text mb-2">משתמשי מערכת:</p>
                {goal.assignee_email && !(goal.assigned_users || []).includes(goal.assignee_email) && (
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between bg-horizon-card/50 rounded px-2 py-1">
                      <span className="text-xs text-horizon-text">{users.find((u) => u.email === goal.assignee_email)?.full_name || goal.assignee_email.split('@')[0]}</span>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveAssigneeEmail()} title="הסר אחראי" aria-label="הסר אחראי" className="h-5 w-5 p-0 !text-red-400 !bg-red-500/10 border border-red-500/30 hover:!bg-red-500/20 rounded shrink-0" disabled={isUpdatingAssignees}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                )}
                {(goal.assigned_users || []).length > 0 && (
                  <div className="space-y-1 mb-2">
                    {goal.assigned_users.map((email) => {
                      const user = users.find((u) => u.email === email);
                      return (
                        <div key={email} className="flex items-center justify-between bg-horizon-card/50 rounded px-2 py-1">
                          <span className="text-xs text-horizon-text">{user?.full_name || email}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveAssignee(email)} title="הסר אחראי" aria-label="הסר אחראי" className="h-5 w-5 p-0 !text-red-400 !bg-red-500/10 border border-red-500/30 hover:!bg-red-500/20 rounded shrink-0" disabled={isUpdatingAssignees}><X className="w-3 h-3" /></Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Select onValueChange={handleAddAssignee} disabled={isUpdatingAssignees}>
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text h-8 text-xs"><SelectValue placeholder="הוסף משתמש מערכת..." /></SelectTrigger>
                  <SelectContent className="bg-horizon-dark border-horizon">
                    {users.filter((u) => !(goal.assigned_users || []).includes(u.email) && !(goal.assignee_email && u.email === goal.assignee_email)).map((user) => (
                      <SelectItem key={user.email} value={user.email} className="text-xs">{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="border-t border-horizon pt-3">
                <p className="text-xs font-semibold text-horizon-text mb-2">אחראים חיצוניים:</p>
                {getExternalResponsible(goal.external_responsible).length > 0 && (
                  <div className="space-y-1 mb-2">
                    {getExternalResponsible(goal.external_responsible).map((name, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-horizon-card/50 rounded px-2 py-1">
                        <span className="text-xs text-horizon-text">{name}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveExternalAssignee(idx)} title="הסר אחראי" aria-label="הסר אחראי" className="h-5 w-5 p-0 !text-red-400 !bg-red-500/10 border border-red-500/30 hover:!bg-red-500/20 rounded shrink-0" disabled={isUpdatingAssignees}><X className="w-3 h-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input placeholder="הזן שם (רו״ח, יועץ וכו')" value={newExternalAssignee} onChange={(e) => setNewExternalAssignee(e.target.value)} className="bg-horizon-card border-horizon text-horizon-text h-8 text-xs" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddExternalAssignee(); } }} />
                  <Button size="sm" onClick={handleAddExternalAssignee} disabled={!newExternalAssignee.trim() || isUpdatingAssignees} className="h-8 text-xs btn-horizon-primary">הוסף</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 5. תאריך יעד */}
      <div className="flex items-center gap-1 text-sm text-horizon-accent shrink-0">
        <InlineEditableField
          value={goal.end_date}
          displayValue={
            goal.end_date ? (
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 shrink-0" />
                <span>{formatDateDisplay(goal.end_date)}</span>
                {goal.due_time && <span className="mr-1 text-horizon-accent">{goal.due_time}</span>}
              </div>
            ) : (
              <span className="text-gray-400">ללא תאריך</span>
            )
          }
          onSave={(newValue) => handleQuickSave('end_date', newValue)}
          type="date"
        />
      </div>

      {/* 5. תלות/שיוך - תמיד מקום כדי ליישר תאריך וסטטוס */}
      <div className="min-w-0">
        {isParent ? (
          <GoalDependencySelector goal={goal} allGoals={allGoals} refreshData={refreshData} />
        ) : null}
      </div>

      {/* 3. הערות ותגובות (מקום אחד) */}
      <Popover open={notesPopoverOpen} onOpenChange={setNotesPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="text-horizon-accent hover:text-horizon-text shrink-0" title="הערות ותגובות">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-horizon-dark border-horizon" dir="rtl">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-horizon-text">הערות:</p>
            <InlineEditableField
              value={goal.notes}
              displayValue={<p className="text-sm text-horizon-accent">{goal.notes || '—'}</p>}
              onSave={(newValue) => handleQuickSave('notes', newValue)}
              multiline={true}
              placeholder="הוסף הערות..."
            />
            <div className="border-t border-horizon pt-2">
              <Button variant="outline" size="sm" className="w-full border-horizon text-horizon-primary hover:bg-horizon-primary/10" onClick={() => { setNotesPopoverOpen(false); setShowComments(true); }}>
                <MessageSquare className="w-4 h-4 ml-2" />
                פתח דיונים ותגובות
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* עריכה, מחק */}
      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-horizon-primary hover:bg-horizon-primary/20 shrink-0 justify-self-start" title="עריכה מלאה">
        <Edit className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/20 shrink-0 justify-self-start" title="מחק">
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* 9. פעולות יעד (n) + הוסף משימה – רק כש־actionsSlot מסופק */}
      <div className="flex items-center justify-end min-w-0">
        {actionsSlot}
      </div>

      {showComments && <GoalCommentsModal goal={goal} isOpen={showComments} onClose={() => setShowComments(false)} />}
    </div>
  );

}