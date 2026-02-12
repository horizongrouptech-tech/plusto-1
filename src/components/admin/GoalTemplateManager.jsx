import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit3, Trash2, Copy, Lightbulb, Loader2, ShieldAlert } from 'lucide-react';
import { canEditGoalTemplates } from '../utils/goalTemplatePermissions';

import { toast } from "sonner";
export default function GoalTemplateManager() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    template_name: '',
    category: 'כללי',
    goal_title: '',
    goal_description: '',
    default_duration_days: 90,
    success_metrics: '',
    suggested_tasks: []
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['goalTemplates'],
    queryFn: () => base44.entities.GoalTemplate.filter({ is_active: true }, '-usage_count')
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const canEdit = canEditGoalTemplates(currentUser);

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      category: template.category,
      goal_title: template.goal_title,
      goal_description: template.goal_description || '',
      default_duration_days: template.default_duration_days || 90,
      success_metrics: template.success_metrics || '',
      suggested_tasks: template.suggested_tasks || []
    });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      category: 'כללי',
      goal_title: '',
      goal_description: '',
      default_duration_days: 90,
      success_metrics: '',
      suggested_tasks: []
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.warning('אין לך הרשאות לערוך תבניות');
      return;
    }

    if (!formData.template_name || !formData.goal_title) {
      toast.warning('נא למלא שם תבנית וכותרת יעד');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...formData,
        created_by_email: currentUser?.email
      };

      if (editingTemplate) {
        await base44.entities.GoalTemplate.update(editingTemplate.id, dataToSave);
      } else {
        await base44.entities.GoalTemplate.create(dataToSave);
      }
      
      queryClient.invalidateQueries(['goalTemplates']);
      setShowModal(false);
    } catch (error) {
      toast.error('שגיאה בשמירה: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!canEdit) {
      toast.warning('אין לך הרשאות למחוק תבניות');
      return;
    }

    if (!confirm('האם למחוק את התבנית?')) return;

    try {
      await base44.entities.GoalTemplate.update(templateId, { is_active: false });
      queryClient.invalidateQueries(['goalTemplates']);
    } catch (error) {
      toast.error('שגיאה במחיקה: ' + error.message);
    }
  };

  const addTask = () => {
    setFormData({
      ...formData,
      suggested_tasks: [
        ...formData.suggested_tasks,
        { task_name: '', task_description: '', relative_days_from_start: 0 }
      ]
    });
  };

  const updateTask = (index, field, value) => {
    const updated = [...formData.suggested_tasks];
    updated[index][field] = value;
    setFormData({ ...formData, suggested_tasks: updated });
  };

  const removeTask = (index) => {
    setFormData({
      ...formData,
      suggested_tasks: formData.suggested_tasks.filter((_, i) => i !== index)
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-horizon-text flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-horizon-primary" />
                בנק יעדים קבועים
              </CardTitle>
              {!canEdit && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-xs">
                  <ShieldAlert className="w-3 h-3 ml-1" />
                  קריאה בלבד
                </Badge>
              )}
            </div>
            {canEdit && (
              <Button onClick={handleNew} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                תבנית חדשה
              </Button>
            )}
          </div>
          <p className="text-sm text-horizon-accent mt-2">
            {canEdit 
              ? 'נהל תבניות של יעדים נפוצים שניתן להוסיף בקלות ללקוחות'
              : 'צפה בתבניות יעדים זמינות - עריכה מוגבלת למנהלי מחלקה ואדמין'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card key={template.id} className="bg-horizon-card border-horizon hover:border-horizon-primary/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-horizon-text text-sm">{template.template_name}</h3>
                      <Badge className="mt-1 bg-horizon-primary/20 text-horizon-primary border-horizon-primary/30">
                        {template.category}
                      </Badge>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(template)}
                          className="h-7 w-7 text-horizon-accent hover:text-horizon-primary"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                          className="h-7 w-7 text-horizon-accent hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-horizon-text font-medium mb-2">{template.goal_title}</p>
                  {template.goal_description && (
                    <p className="text-xs text-horizon-accent line-clamp-2 mb-2">
                      {template.goal_description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-horizon-accent">
                    <span>{template.default_duration_days} ימים</span>
                    <span className="flex items-center gap-1">
                      <Copy className="w-3 h-3" />
                      נוצל {template.usage_count || 0} פעמים
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent">אין תבניות זמינות</p>
              <p className="text-sm text-horizon-accent/70 mb-4">צור תבנית ראשונה להתחלת עבודה</p>
              <Button onClick={handleNew} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                צור תבנית
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-horizon-dark border-horizon max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text">
              {editingTemplate ? 'עריכת תבנית' : 'תבנית חדשה'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-horizon-accent">שם התבנית *</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="לדוגמה: גיוס מנהלת משרד"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">קטגוריה</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="כוח_אדם">כוח אדם</SelectItem>
                  <SelectItem value="שיווק">שיווק</SelectItem>
                  <SelectItem value="מכירות">מכירות</SelectItem>
                  <SelectItem value="תפעול">תפעול</SelectItem>
                  <SelectItem value="פיננסי">פיננסי</SelectItem>
                  <SelectItem value="כללי">כללי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-horizon-accent">כותרת היעד *</Label>
              <Input
                value={formData.goal_title}
                onChange={(e) => setFormData({ ...formData, goal_title: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="הכותרת שתופיע כשם היעד"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">תיאור היעד</Label>
              <Textarea
                value={formData.goal_description}
                onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                rows={3}
                placeholder="תיאור מפורט של היעד"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">משך זמן (ימים)</Label>
              <Input
                type="number"
                value={formData.default_duration_days}
                onChange={(e) => setFormData({ ...formData, default_duration_days: parseInt(e.target.value) || 90 })}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">מדדי הצלחה</Label>
              <Textarea
                value={formData.success_metrics}
                onChange={(e) => setFormData({ ...formData, success_metrics: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                rows={2}
                placeholder="כיצד נמדוד הצלחת היעד"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-horizon-accent">משימות מוצעות</Label>
                <Button onClick={addTask} size="sm" variant="outline" className="text-xs">
                  <Plus className="w-3 h-3 ml-1" />
                  הוסף משימה
                </Button>
              </div>
              
              <div className="space-y-2">
                {formData.suggested_tasks.map((task, idx) => (
                  <div key={idx} className="bg-horizon-card/50 border border-horizon rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-horizon-accent">משימה {idx + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTask(idx)}
                        className="h-6 w-6 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={task.task_name}
                      onChange={(e) => updateTask(idx, 'task_name', e.target.value)}
                      placeholder="שם המשימה"
                      className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                    />
                    <Textarea
                      value={task.task_description}
                      onChange={(e) => updateTask(idx, 'task_description', e.target.value)}
                      placeholder="תיאור המשימה (אופציונלי)"
                      className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                      rows={2}
                    />
                    <div>
                      <Label className="text-xs text-horizon-accent">התחל אחרי (ימים)</Label>
                      <Input
                        type="number"
                        value={task.relative_days_from_start}
                        onChange={(e) => updateTask(idx, 'relative_days_from_start', parseInt(e.target.value) || 0)}
                        className="bg-horizon-dark border-horizon text-horizon-text text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                'שמור'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}