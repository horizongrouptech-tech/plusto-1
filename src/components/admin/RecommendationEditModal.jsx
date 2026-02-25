
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Loader2 } from "lucide-react";


import { toast } from "sonner";
import { Recommendation } from '@/api/entities';
const MAX_DESCRIPTION_CHARS = 1024;

export default function RecommendationEditModal({ isOpen, onClose, recommendation, customer, onSave }) {
  const [formData, setFormData] = useState({
    title: recommendation?.title || '',
    description: recommendation?.description || '',
    category: recommendation?.category || 'pricing',
    priority: recommendation?.priority || 'medium',
    expected_profit: recommendation?.expected_profit || 0,
    profit_percentage: recommendation?.profit_percentage || 0,
    implementation_effort: recommendation?.implementation_effort || 'medium',
    timeframe: recommendation?.timeframe || '',
    action_steps: recommendation?.action_steps || ['', '', ''],
    admin_notes: recommendation?.admin_notes || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      action_steps: [...prev.action_steps, '']
    }));
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...formData.action_steps];
    newSteps[index] = value;
    setFormData(prev => ({ ...prev, action_steps: newSteps }));
  };

  const handleRemoveStep = (index) => {
    setFormData(prev => ({
      ...prev,
      action_steps: prev.action_steps.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.warning('נא למלא כותרת ותיאור');
      return;
    }

    // בדיקת מגבלת תווים
    if (formData.description.length > MAX_DESCRIPTION_CHARS) {
      toast.warning(`תיאור ההמלצה חורג ממגבלת ${MAX_DESCRIPTION_CHARS} תווים. נא לקצר.`);
      return;
    }

    const validSteps = formData.action_steps.filter(step => step.trim());
    if (validSteps.length < 3) {
      toast.warning('נא להוסיף לפחות 3 שלבי פעולה');
      return;
    }

    setIsSaving(true);
    try {
      await Recommendation.update(recommendation.id, {
        ...formData,
        action_steps: validSteps,
        expected_profit: parseFloat(formData.expected_profit) || 0,
        profit_percentage: parseFloat(formData.profit_percentage) || 0
      });

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error updating recommendation:', error);
      toast.error('שגיאה בעדכון ההמלצה');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-primary">
            עריכת המלצה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          <div>
            <Label className="text-horizon-text mb-2 block">כותרת ההמלצה *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="כותרת ההמלצה"
              className="bg-horizon-card border-horizon text-horizon-text"
            />
          </div>

          <div>
            <Label className="text-horizon-text mb-2 block">תיאור מפורט *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => {
                const newValue = e.target.value;
                // חותך את הטקסט אם הוא חורג מהמגבלה
                setFormData(prev => ({
                  ...prev,
                  description: newValue.length > MAX_DESCRIPTION_CHARS
                    ? newValue.substring(0, MAX_DESCRIPTION_CHARS)
                    : newValue
                }));
              }}
              placeholder="תאר את ההמלצה בפירוט..."
              className="bg-horizon-card border-horizon text-horizon-text h-32"
            />
            <div className="flex justify-between items-center mt-1">
              <p className={`text-sm ${
                formData.description.length > MAX_DESCRIPTION_CHARS * 0.9
                  ? 'text-red-400 font-bold'
                  : formData.description.length > MAX_DESCRIPTION_CHARS * 0.8
                  ? 'text-yellow-400'
                  : 'text-horizon-accent'
              }`} dir="ltr">
                {formData.description.length} / {MAX_DESCRIPTION_CHARS}
              </p>
              <p className={`text-xs ${
                formData.description.length > MAX_DESCRIPTION_CHARS * 0.9
                  ? 'text-red-400'
                  : 'text-horizon-accent'
              }`} dir="rtl">
                נותרו {MAX_DESCRIPTION_CHARS - formData.description.length} תווים
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-horizon-text mb-2 block">קטגוריה *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  <SelectItem value="pricing">תמחור</SelectItem>
                  <SelectItem value="bundles">בנדלים</SelectItem>
                  <SelectItem value="promotions">מבצעים</SelectItem>
                  <SelectItem value="suppliers">ספקים</SelectItem>
                  <SelectItem value="inventory">מלאי</SelectItem>
                  <SelectItem value="strategic_moves">מהלכים אסטרטגיים</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-horizon-text mb-2 block">עדיפות *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="medium">בינונית</SelectItem>
                  <SelectItem value="low">נמוכה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-horizon-text mb-2 block">רווח צפוי (₪)</Label>
              <Input
                type="number"
                value={formData.expected_profit}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_profit: e.target.value }))}
                placeholder="0"
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            <div>
              <Label className="text-horizon-text mb-2 block">שיפור צפוי (%)</Label>
              <Input
                type="number"
                value={formData.profit_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, profit_percentage: e.target.value }))}
                placeholder="0"
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-horizon-text mb-2 block">מאמץ יישום</Label>
              <Select value={formData.implementation_effort} onValueChange={(value) => setFormData(prev => ({ ...prev, implementation_effort: value }))}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  <SelectItem value="low">נמוך</SelectItem>
                  <SelectItem value="medium">בינוני</SelectItem>
                  <SelectItem value="high">גבוה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-horizon-text mb-2 block">טווח זמן</Label>
              <Input
                value={formData.timeframe}
                onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value }))}
                placeholder="לדוגמה: 2-4 שבועות"
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          <div>
            <Label className="text-horizon-text mb-2 block">שלבי ביצוע * (לפחות 3)</Label>
            <div className="space-y-3">
              {formData.action_steps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-horizon-accent font-bold mt-2">{index + 1}.</span>
                  <Input
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    placeholder={`שלב ${index + 1}`}
                    className="bg-horizon-card border-horizon text-horizon-text flex-1"
                  />
                  {formData.action_steps.length > 3 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStep(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStep}
              className="mt-3 border-horizon text-horizon-text"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף שלב
            </Button>
          </div>

          <div>
            <Label className="text-horizon-text mb-2 block">הערות מנהל (אופציונלי)</Label>
            <Textarea
              value={formData.admin_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
              placeholder="הערות פנימיות למנהלי המערכת..."
              className="bg-horizon-card border-horizon text-horizon-text h-24"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-horizon">
            <Button onClick={onClose} variant="outline" className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                'שמור שינויים'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
