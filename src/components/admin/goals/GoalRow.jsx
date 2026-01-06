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
    UserPlus
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse, isValid } from 'date-fns';
import { he } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import GoalCommentsModal from './GoalCommentsModal';
import { syncTaskToFireberry } from '@/functions/syncTaskToFireberry';

export default function GoalRow({ goal, users, refreshData, allGoals, isParent = false, isDragging = false }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedGoal, setEditedGoal] = useState(goal);
    const [isSaving, setIsSaving] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [isUpdatingAssignees, setIsUpdatingAssignees] = useState(false);
    
    // ✅ Inline editing states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState(goal.name);
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState(goal.notes || '');

    const statusOptions = [
        { value: 'open', label: 'פתוח', color: 'bg-gray-500', badgeClass: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30' },
        { value: 'in_progress', label: 'בביצוע', color: 'bg-blue-500', badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30' },
        { value: 'done', label: 'הושלם', color: 'bg-green-500', badgeClass: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30' },
        { value: 'delayed', label: 'באיחור', color: 'bg-red-500', badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30' },
        { value: 'cancelled', label: 'בוטל', color: 'bg-gray-400', badgeClass: 'bg-gray-400/20 text-gray-700 dark:text-gray-300 border-gray-400/30' }
    ];

    const getStatusColor = (status) => {
        return statusOptions.find(opt => opt.value === status)?.color || 'bg-gray-500';
    };

    const getStatusLabel = (status) => {
        return statusOptions.find(opt => opt.value === status)?.label || status;
    };

    const handleDateInputChange = (field, value) => {
        setEditedGoal({ ...editedGoal, [field]: value });
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

    const displayDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isValid(date)) {
                return format(date, 'dd/MM/yyyy');
            }
        } catch (e) {
            // אם זה לא תאריך תקין, פשוט החזר את המחרוזת
        }
        return dateString;
    };

    const handleQuickStatusChange = async (newStatus) => {
        try {
            await base44.entities.CustomerGoal.update(goal.id, { status: newStatus });
            
            // רענון מיידי
            if (refreshData) {
                refreshData();
            }
            
            // סנכרון לפיירברי ברקע - לא ממתינים, לא חוסם
            syncTaskToFireberry({ taskId: goal.id }).catch(error => {
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
            alert('יש להזין שם ליעד/משימה');
            return;
        }
        
        if (!editedGoal.end_date) {
            alert('יש להזין תאריך סיום - זהו שדה חובה');
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
                notes: editedGoal.notes,
                due_time: editedGoal.due_time
            });
            
            // רענון מיידי - לא ממתינים
            refreshData();
            setIsEditing(false);
            
            // סנכרון לפיירברי ברקע - לא ממתינים, לא חוסם
            syncTaskToFireberry({ taskId: goal.id }).catch(error => {
                console.error('Failed to sync to Fireberry:', error);
            });
        } catch (error) {
            console.error("Error updating goal:", error);
            alert('שגיאה בעדכון היעד');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        // ✅ FIX: בדיקה אם זו משימה או יעד
        const isTask = !!goal.parent_id;
        const subtasks = allGoals.filter((t) => t.parent_id === goal.id);
        
        console.log('🗑️ GoalRow Delete:', {
          id: goal.id,
          name: goal.name,
          isTask,
          hasSubtasks: subtasks.length
        });
        
        if (isTask) {
          // ✅ מחיקת משימה - ללא תת-משימות
          if (!confirm(`האם למחוק את המשימה "${goal.name}"?`)) return;
          
          try {
            await base44.entities.CustomerGoal.update(goal.id, { is_active: false });
            await refreshData();
          } catch (error) {
            console.error("Error deleting task:", error);
            alert('שגיאה במחיקת המשימה: ' + error.message);
          }
        } else if (subtasks.length > 0) {
          // ✅ מחיקת יעד עם משימות
          const confirmMessage = `ליעד "${goal.name}" יש ${subtasks.length} תת-משימות.\n\nמה תרצה לעשות?\n\nלחץ "אישור" למחוק את היעד וכל התת-משימות\nלחץ "ביטול" להסיר את השיוך של התת-משימות (הן יישארו כמשימות עצמאיות)`;
          
          const deleteSubtasks = confirm(confirmMessage);
          
          try {
            if (deleteSubtasks) {
              for (const subtask of subtasks) {
                await base44.entities.CustomerGoal.update(subtask.id, { is_active: false });
              }
            } else {
              for (const subtask of subtasks) {
                await base44.entities.CustomerGoal.update(subtask.id, { parent_id: null });
              }
            }
            await base44.entities.CustomerGoal.update(goal.id, { is_active: false });
            await refreshData();
          } catch (error) {
            console.error('Error deleting goal:', error);
            alert('שגיאה במחיקת היעד: ' + error.message);
          }
        } else {
          // ✅ מחיקת יעד ללא משימות
          if (!confirm(`האם למחוק את היעד "${goal.name}"?`)) return;

          try {
            await base44.entities.CustomerGoal.update(goal.id, { is_active: false });
            await refreshData();
          } catch (error) {
            console.error("Error deleting goal:", error);
            alert('שגיאה במחיקת היעד: ' + error.message);
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
                assigned_users: currentAssignees.filter(e => e !== email)
            });
            await refreshData();
        } catch (error) {
            console.error('Error removing assignee:', error);
        } finally {
            setIsUpdatingAssignees(false);
        }
    };

    const handleCancel = () => {
        setEditedGoal(goal);
        setIsEditing(false);
    };

    // ✅ עריכה מהירה של שדות בודדים
    const handleQuickUpdate = async (updates) => {
        try {
            await base44.entities.CustomerGoal.update(goal.id, updates);
            await refreshData();
            
            // סנכרון לפיירברי ברקע
            syncTaskToFireberry({ taskId: goal.id }).catch(console.error);
        } catch (error) {
            console.error('Error in quick update:', error);
            alert('שגיאה בעדכון: ' + error.message);
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
                            placeholder="הזן שם..."
                        />
                    </div>

                    <div>
                        <label className="text-sm text-horizon-accent mb-2 block">סטטוס</label>
                        <Select
                            value={editedGoal.status || 'open'}
                            onValueChange={(value) => setEditedGoal({ ...editedGoal, status: value })}
                        >
                            <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
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

                    <div>
                        <label className="text-sm text-horizon-accent mb-2 block">אחראי</label>
                        <Select
                            value={editedGoal.assignee_email || ''}
                            onValueChange={(value) => setEditedGoal({ ...editedGoal, assignee_email: value })}
                        >
                            <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                <SelectValue placeholder="בחר אחראי" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.email} value={user.email}>
                                        {user.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm text-horizon-accent mb-2 block">תאריך התחלה</label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={displayDate(editedGoal.start_date)}
                                onChange={(e) => handleDateInputChange('start_date', e.target.value)}
                                placeholder="DD/MM/YYYY"
                                className="flex-1 bg-horizon-card border-horizon text-horizon-text"
                            />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="bg-horizon-card border-horizon text-horizon-text shrink-0">
                                        <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon">
                                    <Calendar
                                        mode="single"
                                        selected={editedGoal.start_date ? new Date(editedGoal.start_date) : undefined}
                                        onSelect={(date) => setEditedGoal({ 
                                            ...editedGoal, 
                                            start_date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null 
                                        })}
                                        locale={he}
                                        className="text-horizon-text"
                                    />
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
                                required
                            />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="bg-horizon-card border-horizon text-horizon-text shrink-0">
                                        <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon">
                                    <Calendar
                                        mode="single"
                                        selected={editedGoal.end_date ? new Date(editedGoal.end_date) : undefined}
                                        onSelect={(date) => setEditedGoal({ 
                                            ...editedGoal, 
                                            end_date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null 
                                        })}
                                        locale={he}
                                        className="text-horizon-text"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {!isParent && (
                        <div>
                            <label className="text-sm text-horizon-accent mb-2 block">שעת יעד (אופציונלי)</label>
                            <Input
                                type="time"
                                value={editedGoal.due_time || ''}
                                onChange={(e) => setEditedGoal({ ...editedGoal, due_time: e.target.value })}
                                className="bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="text-sm text-horizon-accent mb-2 block">הערות</label>
                        <Textarea
                            value={editedGoal.notes || ''}
                            onChange={(e) => setEditedGoal({ ...editedGoal, notes: e.target.value })}
                            className="bg-horizon-card border-horizon text-horizon-text h-20"
                            placeholder="הוסף הערות..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        onClick={handleCancel}
                        variant="outline"
                        size="sm"
                        className="border-horizon text-horizon-text"
                        disabled={isSaving}
                    >
                        <X className="w-4 h-4 ml-1" />
                        ביטול
                    </Button>
                    <Button
                        onClick={handleSave}
                        size="sm"
                        className="btn-horizon-primary"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <span className="ml-2">שומר...</span>
                                <span className="animate-spin">⏳</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 ml-1" />
                                שמור
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-3 p-3 bg-horizon-card/30 border border-horizon rounded-lg hover:border-horizon-primary/50 transition-all ${isDragging ? 'opacity-50' : ''} ${isParent ? 'font-semibold' : ''}`}>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                {/* ✅ עריכה מהירה של שם */}
                <div className="md:col-span-2 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(goal.status)} flex-shrink-0`}></div>
                    {isEditingTitle ? (
                        <Input
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={async () => {
                                if (tempTitle !== goal.name && tempTitle.trim()) {
                                    await handleQuickUpdate({ name: tempTitle });
                                } else {
                                    setTempTitle(goal.name);
                                }
                                setIsEditingTitle(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur();
                                if (e.key === 'Escape') {
                                    setTempTitle(goal.name);
                                    setIsEditingTitle(false);
                                }
                            }}
                            autoFocus
                            className="text-sm font-medium bg-horizon-dark border-horizon-primary text-horizon-text"
                        />
                    ) : (
                        <span 
                            onClick={() => setIsEditingTitle(true)}
                            className="text-horizon-text cursor-pointer hover:bg-horizon-primary/10 px-2 py-1 rounded transition-colors flex-1"
                        >
                            {goal.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 text-sm text-horizon-accent">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="focus:outline-none">
                                <Badge className={`${getStatusColor(goal.status)} text-white cursor-pointer hover:opacity-80 transition-opacity`}>
                                    {getStatusLabel(goal.status)}
                                </Badge>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 bg-horizon-dark border-horizon" dir="rtl">
                            <div className="space-y-1">
                                {statusOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleQuickStatusChange(option.value)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-right transition-colors ${
                                            goal.status === option.value 
                                                ? 'bg-horizon-primary/20 text-horizon-primary' 
                                                : 'text-horizon-text hover:bg-horizon-card'
                                        }`}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                                        <span className="text-sm">{option.label}</span>
                                        {goal.status === option.value && (
                                            <Check className="w-4 h-4 mr-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-2 text-sm text-horizon-text">
                    <Popover>
                        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1 cursor-pointer hover:bg-horizon-primary/10 rounded px-2 py-1 transition-colors" title={goal.assignee_email || 'ללא אחראי'}>
                                {(goal.assigned_users || []).length > 0 ? (
                                    <div className="flex items-center gap-1">
                                        {goal.assigned_users.slice(0, 2).map(email => {
                                            const user = users.find(u => u.email === email);
                                            return <span key={email} className="text-xs text-horizon-text">{user?.full_name || 'משתמש'}</span>;
                                        })}
                                        {goal.assigned_users.length > 2 && <span className="text-xs">+{goal.assigned_users.length - 2}</span>}
                                    </div>
                                ) : goal.assignee_email ? (
                                    <span className="text-horizon-text">{users.find(u => u.email === goal.assignee_email)?.full_name || 'משתמש'}</span>
                                ) : (
                                    <span className="text-gray-400">ללא אחראי</span>
                                )}
                                <UserPlus className="w-3 h-3 text-horizon-primary" />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-horizon-dark border-horizon p-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-horizon-text">אחראים:</p>
                                {(goal.assigned_users || []).length > 0 && (
                                    <div className="space-y-1">
                                        {goal.assigned_users.map(email => {
                                            const user = users.find(u => u.email === email);
                                            return (
                                                <div key={email} className="flex items-center justify-between bg-horizon-card/50 rounded px-2 py-1">
                                                    <span className="text-xs text-horizon-text">{user?.full_name || email}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveAssignee(email)}
                                                        className="h-5 w-5 p-0 text-red-400"
                                                        disabled={isUpdatingAssignees}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                {users.filter(u => !(goal.assigned_users || []).includes(u.email)).length > 0 && (
                                    <Select onValueChange={handleAddAssignee} disabled={isUpdatingAssignees}>
                                        <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text h-8 text-xs">
                                            <SelectValue placeholder="הוסף אחראי..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-horizon-dark border-horizon">
                                            {users.filter(u => !(goal.assigned_users || []).includes(u.email)).map(user => (
                                                <SelectItem key={user.email} value={user.email} className="text-xs">
                                                    {user.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* ✅ עריכה מהירה של תאריך */}
                <div className="flex items-center gap-2 text-sm text-horizon-accent">
                    {isEditingDate ? (
                        <Input
                            type="date"
                            value={goal.end_date || ''}
                            onChange={async (e) => {
                                if (e.target.value) {
                                    await handleQuickUpdate({ end_date: e.target.value });
                                }
                                setIsEditingDate(false);
                            }}
                            onBlur={() => setIsEditingDate(false)}
                            autoFocus
                            className="w-36 h-8 text-xs bg-horizon-dark border-horizon-primary text-horizon-text"
                        />
                    ) : goal.end_date ? (
                        <div 
                            className="flex items-center gap-1 cursor-pointer hover:bg-horizon-primary/10 px-2 py-1 rounded transition-colors"
                            onClick={() => setIsEditingDate(true)}
                        >
                            <CalendarIcon className="w-3 h-3" />
                            <span>{format(new Date(goal.end_date), 'dd/MM/yyyy', { locale: he })}</span>
                            {goal.due_time && <span className="mr-1">{goal.due_time}</span>}
                        </div>
                    ) : (
                        <span 
                            onClick={() => setIsEditingDate(true)}
                            className="text-xs text-horizon-accent cursor-pointer hover:bg-horizon-primary/10 px-2 py-1 rounded"
                        >
                            הוסף תאריך
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1">
                {/* ✅ עריכה מהירה של תיאור */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-horizon-accent hover:text-horizon-text"
                            title="הערות"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-horizon-dark border-horizon p-3" dir="rtl">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-horizon-text">תיאור/הערות:</label>
                            {isEditingDesc ? (
                                <Textarea
                                    value={tempDesc}
                                    onChange={(e) => setTempDesc(e.target.value)}
                                    onBlur={async () => {
                                        if (tempDesc !== (goal.notes || '')) {
                                            await handleQuickUpdate({ notes: tempDesc });
                                        }
                                        setIsEditingDesc(false);
                                    }}
                                    rows={4}
                                    autoFocus
                                    className="bg-horizon-card border-horizon text-horizon-text text-xs"
                                />
                            ) : (
                                <p 
                                    onClick={() => setIsEditingDesc(true)}
                                    className="text-xs text-horizon-accent bg-horizon-card/50 p-2 rounded cursor-pointer hover:bg-horizon-card transition-colors min-h-[60px]"
                                >
                                    {goal.notes || 'הוסף תיאור...'}
                                </p>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowComments(true)}
                                className="w-full border-horizon text-horizon-text h-7 text-xs"
                            >
                                פתח דיונים מלאים
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-horizon-primary hover:text-horizon-primary hover:bg-horizon-primary/20"
                    title="עריכה מלאה"
                >
                    <Edit className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    title="מחק"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {showComments && (
                <GoalCommentsModal
                    goal={goal}
                    isOpen={showComments}
                    onClose={() => setShowComments(false)}
                />
            )}
        </div>
    );
}