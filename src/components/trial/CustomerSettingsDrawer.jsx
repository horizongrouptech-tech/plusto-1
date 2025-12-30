import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import {
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  Save,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerSettingsDrawer({ customer, isOpen, onClose }) {
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        business_name: customer.business_name || '',
        full_name: customer.full_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        business_type: customer.business_type || '',
        website_url: customer.website_url || '',
        customer_group: customer.customer_group || 'A',
        is_active: customer.is_active !== false,
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  const handleSave = async () => {
    if (!customer?.id) return;
    
    setIsSaving(true);
    try {
      await base44.entities.OnboardingRequest.update(customer.id, formData);
      onClose();
    } catch (error) {
      console.error("Error saving customer:", error);
      alert('שגיאה בשמירה');
    } finally {
      setIsSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] bg-horizon-card border-horizon overflow-y-auto">
        <SheetHeader className="border-b border-horizon pb-4 mb-4">
          <SheetTitle className="text-horizon-text flex items-center gap-2">
            <Building2 className="w-5 h-5 text-horizon-primary" />
            הגדרות לקוח
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* פרטי עסק */}
          <div className="space-y-4">
            <h3 className="font-semibold text-horizon-text flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              פרטי עסק
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label className="text-horizon-accent">שם העסק</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>
              
              <div>
                <Label className="text-horizon-accent">סוג עסק</Label>
                <Input
                  value={formData.business_type}
                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>
              
              <div>
                <Label className="text-horizon-accent">אתר אינטרנט</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* פרטי איש קשר */}
          <div className="space-y-4">
            <h3 className="font-semibold text-horizon-text flex items-center gap-2">
              <User className="w-4 h-4" />
              איש קשר
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label className="text-horizon-accent">שם מלא</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>
              
              <div>
                <Label className="text-horizon-accent">אימייל</Label>
                <Input
                  value={formData.email}
                  disabled
                  className="bg-horizon-dark/50 border-horizon text-horizon-accent"
                  dir="ltr"
                />
              </div>
              
              <div>
                <Label className="text-horizon-accent">טלפון</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* הגדרות */}
          <div className="space-y-4">
            <h3 className="font-semibold text-horizon-text">הגדרות</h3>
            
            <div className="space-y-3">
              <div>
                <Label className="text-horizon-accent">קבוצה</Label>
                <Select
                  value={formData.customer_group}
                  onValueChange={(value) => setFormData({ ...formData, customer_group: value })}
                >
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">קבוצה A</SelectItem>
                    <SelectItem value="B">קבוצה B</SelectItem>
                    <SelectItem value="C">קבוצה C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-horizon-accent">לקוח פעיל</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          </div>

          {/* הערות */}
          <div className="space-y-4">
            <h3 className="font-semibold text-horizon-text">הערות</h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-horizon-dark border-horizon text-horizon-text min-h-[100px]"
              placeholder="הערות על הלקוח..."
            />
          </div>

          {/* מידע נוסף */}
          <div className="space-y-2 pt-4 border-t border-horizon">
            <div className="flex items-center gap-2 text-sm text-horizon-accent">
              <Calendar className="w-4 h-4" />
              <span>נוצר: {customer.created_date ? format(new Date(customer.created_date), 'dd/MM/yyyy') : 'לא ידוע'}</span>
            </div>
          </div>

          {/* כפתור שמירה */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full btn-horizon-primary"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמור שינויים
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}