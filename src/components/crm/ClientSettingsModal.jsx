import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ClientSettingsModal({ client, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        business_name: client.business_name || '',
        full_name: client.full_name || '',
        email: client.email || '',
        phone: client.phone || '',
        business_type: client.business_type || 'other',
        customer_group: client.customer_group || '',
        assigned_financial_manager_email: client.assigned_financial_manager_email || '',
      });
    }
  }, [client]);

  const handleSave = async () => {
    if (!client) return;
    
    setIsSaving(true);
    try {
      await onSave(client.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('שגיאה בשמירת פרטי הלקוח');
    } finally {
      setIsSaving(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-xl">הגדרות לקוח</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-right block mb-2">שם העסק</Label>
            <Input
              value={formData.business_name || ''}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="bg-horizon-card border-horizon text-horizon-text text-right"
            />
          </div>

          <div>
            <Label className="text-right block mb-2">שם הבעלים</Label>
            <Input
              value={formData.full_name || ''}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="bg-horizon-card border-horizon text-horizon-text text-right"
            />
          </div>

          <div>
            <Label className="text-right block mb-2">אימייל</Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-horizon-card border-horizon text-horizon-text text-right"
            />
          </div>

          <div>
            <Label className="text-right block mb-2">טלפון</Label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-horizon-card border-horizon text-horizon-text text-right"
            />
          </div>

          <div>
            <Label className="text-right block mb-2">סוג עסק</Label>
            <Select
              value={formData.business_type || 'other'}
              onValueChange={(value) => setFormData({ ...formData, business_type: value })}
            >
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="wholesale">סיטונאות</SelectItem>
                <SelectItem value="retail">קמעונאות</SelectItem>
                <SelectItem value="restaurant">מסעדה</SelectItem>
                <SelectItem value="services">שירותים</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-right block mb-2">קבוצת לקוח</Label>
            <Select
              value={formData.customer_group || ''}
              onValueChange={(value) => setFormData({ ...formData, customer_group: value })}
            >
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text text-right">
                <SelectValue placeholder="בחר קבוצה" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-dark border-horizon">
                <SelectItem value="A">קבוצה A</SelectItem>
                <SelectItem value="B">קבוצה B</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-horizon-primary"
          >
            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}