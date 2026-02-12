
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react"; // Corrected import: Added 'X'
import { base44 } from "@/api/base44Client";

import { toast } from "sonner";
export default function ManualRecommendationModal({ customer, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pricing',
    priority: 'medium',
    expected_profit: 0,
    action_steps: ['', '', '']
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

    const validSteps = formData.action_steps.filter(step => step.trim());
    if (validSteps.length < 3) {
      toast.warning('נא להוסיף לפחות 3 שלבי פעולה');
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.Recommendation.create({
        customer_email: customer.email,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        expected_profit: parseFloat(formData.expected_profit) || 0,
        action_steps: validSteps,
        status: 'pending',
        delivery_status: 'not_sent',
        source: 'admin_generated',
        admin_notes: 'המלצה שנוצרה ידנית על ידי מנהל המערכת'
      });

      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating manual recommendation:', error);
      toast.error('שגיאה ביצירת ההמלצה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: 'pricing',
      priority: 'medium',
      expected_profit: 0,
      action_steps: ['', '', '']
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-primary">
            יצירת המלצה ידנית - {customer?.business_name || customer?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          <div>
            <Label className="text-horizon-text mb-2 block">כותרת ההמלצה *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="לדוגמה: הורדת מחיר על מוצר X"
              className="bg-horizon-card border-horizon text-horizon-text"
            />
          </div>

          <div>
            <Label className="text-horizon-text mb-2 block">תיאור מפורט *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="תאר את ההמלצה בפירוט, כולל הסבר מדוע היא רלוונטית וכיצד היא תשפר את הרווחיות..."
              className="bg-horizon-card border-horizon text-horizon-text h-32"
            />
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

          <div className="flex justify-end gap-3 pt-4 border-t border-horizon">
            <Button onClick={handleClose} variant="outline" className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                'שמור המלצה'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
