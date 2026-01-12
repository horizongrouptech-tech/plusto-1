import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, Loader2, CheckCircle, Circle, MessageSquare, Edit2, Plus, Trash2, Save, X } from 'lucide-react';

const DAILY_CHECKLIST_ITEMS = [
  {
    id: 'morning_review',
    title: 'סקירת בוקר - תזרים מזומנים',
    description: 'בדיקת מצב תזרים יומי, זיהוי בורות קרובים, תכנון תשלומים',
    category: 'financial'
  },
  {
    id: 'tasks_priorities',
    title: 'עדכון משימות ועדיפויות',
    description: 'סימון משימות להיום, התאמת עדיפויות לפי דחיפות',
    category: 'tasks'
  },
  {
    id: 'customer_contact',
    title: 'יצירת קשר עם לקוח',
    description: 'מעקב אחר לקוח אחד מהקבוצה היומית, עדכון התקדמות',
    category: 'client'
  },
  {
    id: 'data_update',
    title: 'עדכון נתונים',
    description: 'הזנת נתונים חדשים שהתקבלו, עדכון קטלוג/מלאי',
    category: 'data'
  },
  {
    id: 'recommendations_review',
    title: 'סקירת המלצות פעילות',
    description: 'מעקב אחר יישום המלצות, זיהוי המלצות חדשות נדרשות',
    category: 'recommendations'
  },
  {
    id: 'goals_progress',
    title: 'התקדמות ביעדים',
    description: 'עדכון סטטוס יעדים, זיהוי חסמים וצווארי בקבוק',
    category: 'goals'
  },
  {
    id: 'alerts_review',
    title: 'טיפול בהתראות',
    description: 'טיפול בהתראות מהמערכת, משימות באיחור, תזרים שלילי',
    category: 'alerts'
  },
  {
    id: 'evening_summary',
    title: 'סיכום יום',
    description: 'רישום תובנות, תוצאות, והכנה ליום המחר',
    category: 'summary'
  }
];

export default function DailyOfek360Checklist({ customer, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState([]);

  const today = new Date().toISOString().split('T')[0];

  // טעינת צ'ק ליסט יומי
  const { data: checklistData, isLoading, error } = useQuery({
    queryKey: ['dailyChecklist', customer?.email, today],
    queryFn: async () => {
      console.log('Fetching daily checklist for:', customer.email, today);
      
      const checklists = await base44.entities.CustomerGoal.filter({
        customer_email: customer.email,
        task_type: 'daily_checklist',
        start_date: today
      });

      console.log('Found checklists:', checklists);

      if (checklists && checklists.length > 0) {
        console.log('Returning existing checklist:', checklists[0]);
        return checklists[0];
      }

      // יצירת צ'ק ליסט חדש ליום
      console.log('Creating new checklist for today');
      const newChecklist = await base44.entities.CustomerGoal.create({
        customer_email: customer.email,
        name: `צ'ק ליסט יומי - ${new Date().toLocaleDateString('he-IL')}`,
        task_type: 'daily_checklist',
        start_date: today,
        end_date: today,
        status: 'in_progress',
        is_active: true,
        notes: '',
        checklist_items: DAILY_CHECKLIST_ITEMS.map(item => ({
          ...item,
          completed: false,
          completed_at: null,
          notes: ''
        }))
      });

      console.log('New checklist created:', newChecklist);
      return newChecklist;
    },
    enabled: isOpen && !!customer?.email,
    retry: 1
  });

  const handleToggleItem = async (itemId) => {
    if (!checklistData) return;

    const updatedItems = checklistData.checklist_items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          completed: !item.completed,
          completed_at: !item.completed ? new Date().toISOString() : null
        };
      }
      return item;
    });

    const completedCount = updatedItems.filter(i => i.completed).length;
    const newStatus = completedCount === updatedItems.length ? 'done' : 'in_progress';

    try {
      await base44.entities.CustomerGoal.update(checklistData.id, {
        checklist_items: updatedItems,
        status: newStatus
      });

      queryClient.invalidateQueries(['dailyChecklist', customer.email, today]);
    } catch (error) {
      console.error('Error updating checklist:', error);
      alert('שגיאה בעדכון הצ\'ק ליסט');
    }
  };

  const handleSaveNotes = async () => {
    if (!checklistData) return;

    try {
      await base44.entities.CustomerGoal.update(checklistData.id, {
        notes: notes
      });

      queryClient.invalidateQueries(['dailyChecklist', customer.email, today]);
      alert('הערות נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('שגיאה בשמירת הערות');
    }
  };

  const handleEditModeToggle = () => {
    if (!isEditMode) {
      setEditedItems([...(checklistData?.checklist_items || DAILY_CHECKLIST_ITEMS.map(item => ({ ...item, completed: false, completed_at: null, notes: '' })))]);
    }
    setIsEditMode(!isEditMode);
  };

  const handleAddItem = () => {
    const newItem = {
      id: `custom_${Date.now()}`,
      title: '',
      description: '',
      category: 'custom',
      completed: false,
      completed_at: null,
      notes: ''
    };
    setEditedItems([...editedItems, newItem]);
  };

  const handleRemoveItem = (itemId) => {
    setEditedItems(editedItems.filter(item => item.id !== itemId));
  };

  const handleItemChange = (itemId, field, value) => {
    setEditedItems(editedItems.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveEditedChecklist = async () => {
    if (!checklistData) return;

    try {
      await base44.entities.CustomerGoal.update(checklistData.id, {
        checklist_items: editedItems
      });

      queryClient.invalidateQueries(['dailyChecklist', customer.email, today]);
      setIsEditMode(false);
      alert('הצ\'ק ליסט עודכן בהצלחה');
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('שגיאה בשמירת הצ\'ק ליסט');
    }
  };

  const completedItems = checklistData?.checklist_items?.filter(i => i.completed).length || 0;
  const totalItems = checklistData?.checklist_items?.length || DAILY_CHECKLIST_ITEMS.length;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl bg-horizon-dark border-horizon" dir="rtl">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-horizon-primary ml-3" />
            <span className="text-horizon-text">טוען צ'ק ליסט יומי...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl bg-horizon-dark border-horizon" dir="rtl">
          <div className="p-6 text-center">
            <p className="text-red-400 mb-4">שגיאה בטעינת הצ'ק ליסט: {error.message}</p>
            <Button onClick={() => queryClient.invalidateQueries(['dailyChecklist', customer?.email, today])} className="btn-horizon-primary">
              נסה שוב
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl text-horizon-text flex items-center gap-3">
                <Target className="w-6 h-6 text-horizon-primary" />
                צ'ק ליסט יומי - אופק 360
              </DialogTitle>
              <p className="text-sm text-horizon-accent mt-2">
                {customer?.business_name || customer?.full_name} | {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Button
              onClick={handleEditModeToggle}
              variant="outline"
              className="border-horizon-primary text-horizon-primary"
              size="sm"
            >
              {isEditMode ? (
                <>
                  <X className="w-4 h-4 ml-1" />
                  ביטול
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 ml-1" />
                  עריכה
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* התקדמות כללית */}
        <Card className="card-horizon">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-horizon-text font-semibold">התקדמות יומית</span>
              <span className="text-2xl font-bold text-horizon-primary">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-horizon-card rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-horizon-primary to-horizon-secondary h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-sm text-horizon-accent mt-2 text-center">
              {completedItems} מתוך {totalItems} משימות הושלמו
            </p>
          </CardContent>
        </Card>

        {/* פריטי הצ'ק ליסט */}
        <div className="space-y-3">
          {!checklistData?.checklist_items || checklistData.checklist_items.length === 0 ? (
            <Card className="bg-horizon-card border-horizon">
              <CardContent className="p-6 text-center">
                <Circle className="w-12 h-12 mx-auto text-horizon-accent mb-3" />
                <p className="text-horizon-accent">טוען משימות...</p>
              </CardContent>
            </Card>
          ) : isEditMode ? (
            <>
              {editedItems.map((item, index) => (
                <Card key={item.id} className="bg-horizon-card border-horizon">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-horizon-accent font-semibold mt-2">{index + 1}.</span>
                      <div className="flex-1 space-y-3">
                        <Input
                          value={item.title}
                          onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                          placeholder="כותרת המשימה"
                          className="bg-horizon-card border-horizon text-horizon-text"
                        />
                        <Textarea
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="תיאור המשימה"
                          className="bg-horizon-card border-horizon text-horizon-text"
                          rows={2}
                        />
                      </div>
                      <Button
                        onClick={() => handleRemoveItem(item.id)}
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                onClick={handleAddItem}
                variant="outline"
                className="w-full border-dashed border-horizon-primary text-horizon-primary"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף משימה
              </Button>
              <Button
                onClick={handleSaveEditedChecklist}
                className="btn-horizon-primary w-full"
              >
                <Save className="w-4 h-4 ml-2" />
                שמור שינויים
              </Button>
            </>
          ) : (
            checklistData?.checklist_items?.map((item, index) => {
              const isCompleted = item.completed;
              
              return (
                <Card 
                  key={item.id}
                  className={`${
                    isCompleted 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-horizon-card border-horizon'
                  } transition-all hover:border-horizon-primary/50`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        className="mt-1 border-horizon-primary data-[state=checked]:bg-horizon-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold ${isCompleted ? 'line-through text-horizon-accent' : 'text-horizon-text'}`}>
                            {index + 1}. {item.title}
                          </span>
                          {isCompleted && (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        <p className="text-sm text-horizon-accent">
                          {item.description}
                        </p>
                        {item.completed_at && (
                          <p className="text-xs text-green-400 mt-2">
                            ✓ הושלם ב-{new Date(item.completed_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* הערות יומיות */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-horizon-primary" />
              הערות והתובנות יומיות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notes || checklistData?.notes || ''}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="רשום כאן תובנות, בעיות שזוהו, או דברים שצריך לעקוב אחריהם..."
              className="bg-horizon-card border-horizon text-horizon-text min-h-[100px]"
            />
            <Button
              onClick={handleSaveNotes}
              className="btn-horizon-primary w-full"
            >
              שמור הערות
            </Button>
          </CardContent>
        </Card>

        {/* סטטוס השלמה */}
        {progressPercentage === 100 && (
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
              <h3 className="text-xl font-bold text-green-400 mb-2">יום עבודה מצוין!</h3>
              <p className="text-horizon-accent">
                השלמת את כל משימות הצ'ק ליסט היומי. המשך כך!
              </p>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}