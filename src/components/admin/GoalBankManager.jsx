import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Edit3, Trash2, Copy, Loader2 } from 'lucide-react';

export default function GoalBankManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    estimated_duration_days: 30,
    success_metrics: '',
    action_steps: ['']
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['goalTemplates'],
    queryFn: () => base44.entities.GoalTemplate.filter({ is_active: true }, '-usage_count')
  });

  const categoryLabels = {
    financial: 'פיננסי',
    operational: 'תפעולי',
    marketing: 'שיווק',
    sales: 'מכירות',
    hr: 'משאבי אנוש',
    strategic: 'אסטרטגי',
    other: 'אחר'
  };

  const canCreate = currentUser && 
    (currentUser.role === 'admin' || 
     ['ofek@horizon.org.il', 'omer@horizon.org.il', 'shneaper@horizon.org.il'].includes(currentUser.email));

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      category: 'other',
      estimated_duration_days: 30,
      success_metrics: '',
      action_steps: ['']
    });
    setShowModal(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      estimated_duration_days: template.estimated_duration_days || 30,
      success_metrics: template.success_metrics || '',
      action_steps: template.action_steps || ['']
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('נא למלא שם לתבנית');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        action_steps: formData.action_steps.filter(s => s.trim()),
        created_by_email: currentUser.email
      };

      if (editingTemplate) {
        await base44.entities.GoalTemplate.update(editingTemplate.id, data);
      } else {
        await base44.entities.GoalTemplate.create(data);
      }

      queryClient.invalidateQueries(['goalTemplates']);
      setShowModal(false);
    } catch (error) {
      alert('שגיאה בשמירה: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm('האם למחוק את התבנית?')) return;

    try {
      await base44.entities.GoalTemplate.update(templateId, { is_active: false });
      queryClient.invalidateQueries(['goalTemplates']);
    } catch (error) {
      alert('שגיאה במחיקה: ' + error.message);
    }
  };

  const handleUseTemplate = async (template, customerEmail) => {
    if (!customerEmail) {
      alert('נא לבחור לקוח');
      return;
    }

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (template.estimated_duration_days || 30));

      await base44.entities.CustomerGoal.create({
        customer_email: customerEmail,
        name: template.name,
        notes: template.description,
        status: 'open',
        end_date: endDate.toISOString().split('T')[0],
        success_metrics: template.success_metrics
      });

      await base44.entities.GoalTemplate.update(template.id, {
        usage_count: (template.usage_count || 0) + 1
      });

      queryClient.invalidateQueries(['goalTemplates']);
      alert('יעד נוצר בהצלחה מהתבנית!');
    } catch (error) {
      alert('שגיאה ביצירת יעד: ' + error.message);
    }
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
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Target className="w-5 h-5 text-horizon-primary" />
              בנק יעדים
            </CardTitle>
            {canCreate && (
              <Button onClick={handleNew} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                הוסף תבנית
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent">אין תבניות יעדים</p>
              {canCreate && (
                <Button onClick={handleNew} className="btn-horizon-primary mt-4">
                  <Plus className="w-4 h-4 ml-2" />
                  צור תבנית ראשונה
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card key={template.id} className="bg-horizon-card border-horizon">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-horizon-text">{template.name}</h3>
                        <Badge className="text-xs bg-horizon-primary/20 text-horizon-primary mt-2">
                          {categoryLabels[template.category]}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {template.usage_count || 0} שימושים
                      </Badge>
                    </div>

                    {template.description && (
                      <p className="text-sm text-horizon-accent mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    <div className="text-xs text-horizon-accent/70 mb-3">
                      משך משוער: {template.estimated_duration_days || 30} ימים
                    </div>

                    <div className="flex gap-2">
                      {canCreate && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            className="flex-1 text-horizon-primary hover:bg-horizon-primary/10"
                          >
                            <Edit3 className="w-3 h-3 ml-1" />
                            ערוך
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            className="text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-horizon-dark border-horizon max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text">
              {editingTemplate ? 'עריכת תבנית יעד' : 'תבנית יעד חדשה'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-horizon-accent text-sm mb-2 block">שם היעד *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="לדוגמה: שיפור שולי רווח ב-10%"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">קטגוריה</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-horizon-accent text-sm mb-2 block">משך משוער (ימים)</label>
                <Input
                  type="number"
                  value={formData.estimated_duration_days}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_days: parseInt(e.target.value) || 30 })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
            </div>

            <div>
              <label className="text-horizon-accent text-sm mb-2 block">תיאור</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                rows={3}
              />
            </div>

            <div>
              <label className="text-horizon-accent text-sm mb-2 block">מדדי הצלחה</label>
              <Input
                value={formData.success_metrics}
                onChange={(e) => setFormData({ ...formData, success_metrics: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="לדוגמה: הגדלת מכירות ב-15%"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-horizon-accent text-sm">שלבי ביצוע</label>
                <Button
                  size="sm"
                  onClick={() => setFormData({ ...formData, action_steps: [...formData.action_steps, ''] })}
                  className="btn-horizon-secondary h-7"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  הוסף שלב
                </Button>
              </div>
              <div className="space-y-2">
                {formData.action_steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-horizon-accent mt-2">{idx + 1}.</span>
                    <Input
                      value={step}
                      onChange={(e) => {
                        const newSteps = [...formData.action_steps];
                        newSteps[idx] = e.target.value;
                        setFormData({ ...formData, action_steps: newSteps });
                      }}
                      className="bg-horizon-card border-horizon text-horizon-text flex-1"
                    />
                    {formData.action_steps.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormData({ 
                          ...formData, 
                          action_steps: formData.action_steps.filter((_, i) => i !== idx) 
                        })}
                        className="text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
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