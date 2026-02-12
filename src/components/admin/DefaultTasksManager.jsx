import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { 
  ListChecks, Plus, Edit3, Trash2, Save, X, Loader2, 
  GripVertical, CheckCircle2, AlertCircle 
} from 'lucide-react';

// משימות דפולטיביות ללקוחות חדשים
const DEFAULT_INITIAL_TASKS = [
  { title: 'איסוף מסמכים ראשוניים', description: 'לבקש מהלקוח דוחות כספיים, דו"ח רווח והפסד, מאזן' },
  { title: 'הכנת שאלון הכרות', description: 'למלא שאלון הכרות עסקית מלא עם הלקוח' },
  { title: 'מיפוי ספקים', description: 'לקבל רשימת ספקים עיקריים ותנאי תשלום' },
  { title: 'הבנת מבנה ההכנסות', description: 'למפות את מקורות ההכנסה העיקריים' },
  { title: 'בדיקת חשבונות בנק', description: 'לקבל גישה או דוחות מחשבונות הבנק' },
  { title: 'סקירת תזרים נוכחי', description: 'להבין את מצב התזרים הנוכחי' },
  { title: 'הגדרת יעדים ראשוניים', description: 'לקבוע יעדים ראשונים לעבודה משותפת' },
  { title: 'יצירת קטלוג מוצרים/שירותים', description: 'להעלות או ליצור קטלוג מוצרים' }
];

export default function DefaultTasksManager({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  // בדיקת הרשאות
  const canEdit = currentUser?.role === 'admin' || currentUser?.user_type === 'department_head';

  // טעינת משימות דפולטיביות מהמערכת
  const { data: savedTasks, isLoading } = useQuery({
    queryKey: ['defaultOnboardingTasks'],
    queryFn: async () => {
      try {
        // נסה לטעון מישות SystemSettings או AppConfig
        const settings = await base44.entities.SystemSettings?.filter({ 
          setting_key: 'default_onboarding_tasks' 
        });
        
        if (settings && settings.length > 0) {
          const parsed = JSON.parse(settings[0].setting_value || '[]');
          setTasks(parsed);
          return parsed;
        }
      } catch (e) {
        console.log('No SystemSettings entity, using defaults');
      }
      
      // fallback לברירת מחדל
      setTasks(DEFAULT_INITIAL_TASKS);
      return DEFAULT_INITIAL_TASKS;
    },
    enabled: isOpen
  });

  const handleAddTask = () => {
    setTasks([...tasks, { title: '', description: '' }]);
    setEditingIndex(tasks.length);
    setEditForm({ title: '', description: '' });
  };

  const handleEditTask = (index) => {
    setEditingIndex(index);
    setEditForm({ ...tasks[index] });
  };

  const handleSaveTask = () => {
    if (!editForm.title.trim()) {
      toast.warning('נא להזין כותרת למשימה');
      return;
    }

    const updatedTasks = [...tasks];
    updatedTasks[editingIndex] = editForm;
    setTasks(updatedTasks);
    setEditingIndex(null);
    setEditForm({ title: '', description: '' });
  };

  const handleDeleteTask = (index) => {
    if (!confirm('האם למחוק את המשימה?')) return;
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    // אם זו משימה חדשה ריקה, מחק אותה
    if (tasks[editingIndex]?.title === '' && tasks[editingIndex]?.description === '') {
      setTasks(tasks.filter((_, i) => i !== editingIndex));
    }
    setEditingIndex(null);
    setEditForm({ title: '', description: '' });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // נסה לשמור ב-SystemSettings
      const existingSettings = await base44.entities.SystemSettings?.filter({ 
        setting_key: 'default_onboarding_tasks' 
      });
      
      if (existingSettings && existingSettings.length > 0) {
        await base44.entities.SystemSettings.update(existingSettings[0].id, {
          setting_value: JSON.stringify(tasks)
        });
      } else if (base44.entities.SystemSettings) {
        await base44.entities.SystemSettings.create({
          setting_key: 'default_onboarding_tasks',
          setting_value: JSON.stringify(tasks),
          description: 'משימות דפולטיביות ללקוחות חדשים'
        });
      }
      
      queryClient.invalidateQueries(['defaultOnboardingTasks']);
      toast.success('המשימות נשמרו בהצלחה!');
    } catch (error) {
      console.error('Error saving default tasks:', error);
      toast.error('שגיאה בשמירת המשימות');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (!confirm('האם לאפס את הרשימה למשימות ברירת המחדל?')) return;
    setTasks(DEFAULT_INITIAL_TASKS);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl bg-horizon-dark border-horizon" dir="rtl">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-horizon-primary ml-3" />
            <span className="text-horizon-text">טוען משימות...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text flex items-center gap-3">
            <ListChecks className="w-6 h-6 text-horizon-primary" />
            משימות דפולטיביות ללקוחות חדשים
          </DialogTitle>
          <p className="text-sm text-horizon-accent mt-2">
            משימות אלו יוצגו אוטומטית בהכנה לפגישה ראשונה עם כל לקוח חדש
          </p>
        </DialogHeader>

        <Card className="card-horizon">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-horizon-text text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-horizon-primary" />
                רשימת משימות ({tasks.length})
              </CardTitle>
              {canEdit && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResetToDefaults}
                    className="border-horizon text-horizon-accent hover:text-horizon-text"
                  >
                    איפוס לברירת מחדל
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleAddTask}
                    className="btn-horizon-primary"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף משימה
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-horizon-accent">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>אין משימות דפולטיביות</p>
                {canEdit && (
                  <Button onClick={handleAddTask} className="mt-4 btn-horizon-primary">
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף משימה ראשונה
                  </Button>
                )}
              </div>
            ) : (
              tasks.map((task, index) => (
                <div 
                  key={index}
                  className="bg-horizon-card border border-horizon rounded-lg p-4 hover:border-horizon-primary/50 transition-all"
                >
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="כותרת המשימה"
                        className="bg-horizon-dark border-horizon text-horizon-text"
                        autoFocus
                      />
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="תיאור המשימה (אופציונלי)"
                        className="bg-horizon-dark border-horizon text-horizon-text"
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="border-horizon text-horizon-accent"
                        >
                          <X className="w-4 h-4 ml-1" />
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveTask}
                          className="btn-horizon-primary"
                        >
                          <Save className="w-4 h-4 ml-1" />
                          שמור
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        <GripVertical className="w-4 h-4 text-horizon-accent cursor-grab" />
                        <Badge variant="outline" className="text-horizon-primary border-horizon-primary">
                          {index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-horizon-text">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-horizon-accent mt-1">{task.description}</p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTask(index)}
                            className="text-horizon-accent hover:text-horizon-primary"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTask(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {canEdit && tasks.length > 0 && (
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button 
              onClick={handleSaveAll} 
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
                  שמור את כל השינויים
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
