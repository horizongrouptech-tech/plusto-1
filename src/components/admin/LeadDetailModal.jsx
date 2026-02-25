import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { 
  Phone, Mail, Building2, Calendar, User, Save, 
  Loader2, Clock, MessageSquare, FileText, History
} from 'lucide-react';
import { format } from 'date-fns';

import { toast } from "sonner";
import { Lead } from '@/api/entities';
const STAGES = [
  { value: 'new', label: 'חדש' },
  { value: 'contacted', label: 'נוצר קשר' },
  { value: 'quote_sent', label: 'הצעה נשלחה' },
  { value: 'meeting_scheduled', label: 'פגישה נקבעה' },
  { value: 'tasting_scheduled', label: 'טעימה נקבעה' },
  { value: 'in_negotiation', label: 'במשא ומתן' },
  { value: 'closed_won', label: 'נסגר בהצלחה' },
  { value: 'closed_lost', label: 'אבוד' },
  { value: 'no_response', label: 'אין מענה' }
];

const PRIORITIES = [
  { value: 'low', label: 'נמוכה' },
  { value: 'medium', label: 'בינונית' },
  { value: 'high', label: 'גבוהה' },
  { value: 'urgent', label: 'דחופה' }
];

const CATEGORIES = [
  { value: 'working_meeting', label: 'פגישת עבודה' },
  { value: 'club_membership', label: 'מועדון לקוחות' },
  { value: 'general', label: 'כללי' },
  { value: 'supplier_lead', label: 'ליד ספק' },
  { value: 'premium_consultation', label: 'ייעוץ פרימיום' }
];

export default function LeadDetailModal({ 
  lead, 
  isOpen, 
  onClose, 
  onUpdate,
  managers = [],
  isAdmin = false 
}) {
  const [formData, setFormData] = useState({
    customer_name: lead.customer_name || '',
    customer_email: lead.customer_email || '',
    customer_phone: lead.customer_phone || '',
    business_name: lead.business_name || '',
    request_details: lead.request_details || '',
    stage: lead.stage || 'new',
    priority: lead.priority || 'medium',
    lead_category: lead.lead_category || 'general',
    assigned_manager_email: lead.assigned_manager_email || '',
    next_action: lead.next_action || '',
    next_action_date: lead.next_action_date || '',
    notes: lead.notes || '',
    estimated_value: lead.estimated_value || '',
    lost_reason: lead.lost_reason || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = { ...formData };
      if (updateData.estimated_value) {
        updateData.estimated_value = parseFloat(updateData.estimated_value);
      }
      
      // Update contact attempt count if stage changed to contacted
      if (formData.stage === 'contacted' && lead.stage === 'new') {
        updateData.first_contact_date = new Date().toISOString();
        updateData.contact_attempts = (lead.contact_attempts || 0) + 1;
      }
      
      // Set conversion date if closed won
      if (formData.stage === 'closed_won' && lead.stage !== 'closed_won') {
        updateData.conversion_date = new Date().toISOString();
      }
      
      updateData.last_contact_date = new Date().toISOString();
      
      await Lead.update(lead.id, updateData);
      onUpdate();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('שגיאה בעדכון הליד');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-horizon-card border-horizon text-horizon-text max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5 text-horizon-primary" />
            פרטי ליד: {lead.customer_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-horizon-dark border border-horizon">
            <TabsTrigger value="details" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
              פרטים
            </TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
              פעולות
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
              היסטוריה
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-horizon-accent">שם הלקוח</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>
              <div>
                <Label className="text-horizon-accent">שם העסק</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>
              <div>
                <Label className="text-horizon-accent">טלפון</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => handleChange('customer_phone', e.target.value)}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>
              <div>
                <Label className="text-horizon-accent">אימייל</Label>
                <Input
                  value={formData.customer_email}
                  onChange={(e) => handleChange('customer_email', e.target.value)}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                />
              </div>
            </div>

            <div>
              <Label className="text-horizon-accent">פרטי הבקשה</Label>
              <Textarea
                value={formData.request_details}
                onChange={(e) => handleChange('request_details', e.target.value)}
                className="bg-horizon-dark border-horizon text-horizon-text min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-horizon-accent">שלב</Label>
                <Select value={formData.stage} onValueChange={(v) => handleChange('stage', v)}>
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    {STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-horizon-text">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-horizon-accent">עדיפות</Label>
                <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-horizon-text">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-horizon-accent">קטגוריה</Label>
                <Select value={formData.lead_category} onValueChange={(v) => handleChange('lead_category', v)}>
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value} className="text-horizon-text">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isAdmin && managers.length > 0 && (
              <div>
                <Label className="text-horizon-accent">מנהל כספים משויך</Label>
                <Select value={formData.assigned_manager_email} onValueChange={(v) => handleChange('assigned_manager_email', v)}>
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue placeholder="בחר מנהל" />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    {managers.map(m => (
                      <SelectItem key={m.email} value={m.email} className="text-horizon-text">
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-horizon-accent">שווי משוער (₪)</Label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => handleChange('estimated_value', e.target.value)}
                className="bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>

            {formData.stage === 'closed_lost' && (
              <div>
                <Label className="text-horizon-accent">סיבת אובדן</Label>
                <Textarea
                  value={formData.lost_reason}
                  onChange={(e) => handleChange('lost_reason', e.target.value)}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                  placeholder="מדוע הליד לא הומר?"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4">
            <div>
              <Label className="text-horizon-accent">פעולה הבאה</Label>
              <Input
                value={formData.next_action}
                onChange={(e) => handleChange('next_action', e.target.value)}
                className="bg-horizon-dark border-horizon text-horizon-text"
                placeholder="לדוגמה: להתקשר, לשלוח הצעה..."
              />
            </div>
            <div>
              <Label className="text-horizon-accent">תאריך פעולה הבאה</Label>
              <Input
                type="date"
                value={formData.next_action_date}
                onChange={(e) => handleChange('next_action_date', e.target.value)}
                className="bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>
            <div>
              <Label className="text-horizon-accent">הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="bg-horizon-dark border-horizon text-horizon-text min-h-[150px]"
                placeholder="הערות פנימיות לגבי הליד..."
              />
            </div>

            <div className="flex gap-2">
              {lead.customer_phone && (
                <Button
                  variant="outline"
                  className="border-horizon text-horizon-text"
                  onClick={() => window.open(`tel:${lead.customer_phone}`)}
                >
                  <Phone className="w-4 h-4 ml-2" />
                  התקשר
                </Button>
              )}
              {lead.customer_phone && (
                <Button
                  variant="outline"
                  className="border-green-500 text-green-500"
                  onClick={() => window.open(`https://wa.me/${lead.customer_phone.replace(/\D/g, '')}`)}
                >
                  <MessageSquare className="w-4 h-4 ml-2" />
                  וואטסאפ
                </Button>
              )}
              {lead.customer_email && (
                <Button
                  variant="outline"
                  className="border-horizon text-horizon-text"
                  onClick={() => window.open(`mailto:${lead.customer_email}`)}
                >
                  <Mail className="w-4 h-4 ml-2" />
                  שלח מייל
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-horizon-dark rounded-lg">
                <Calendar className="w-4 h-4 text-horizon-accent" />
                <div>
                  <p className="text-sm text-horizon-text">תאריך יצירה</p>
                  <p className="text-horizon-accent text-sm">
                    {lead.created_date ? format(new Date(lead.created_date), 'dd/MM/yyyy HH:mm') : 'לא ידוע'}
                  </p>
                </div>
              </div>
              
              {lead.first_contact_date && (
                <div className="flex items-center gap-3 p-3 bg-horizon-dark rounded-lg">
                  <Phone className="w-4 h-4 text-horizon-accent" />
                  <div>
                    <p className="text-sm text-horizon-text">קשר ראשון</p>
                    <p className="text-horizon-accent text-sm">
                      {format(new Date(lead.first_contact_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}
              
              {lead.last_contact_date && (
                <div className="flex items-center gap-3 p-3 bg-horizon-dark rounded-lg">
                  <Clock className="w-4 h-4 text-horizon-accent" />
                  <div>
                    <p className="text-sm text-horizon-text">קשר אחרון</p>
                    <p className="text-horizon-accent text-sm">
                      {format(new Date(lead.last_contact_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}
              
              {lead.contact_attempts > 0 && (
                <div className="flex items-center gap-3 p-3 bg-horizon-dark rounded-lg">
                  <History className="w-4 h-4 text-horizon-accent" />
                  <div>
                    <p className="text-sm text-horizon-text">ניסיונות יצירת קשר</p>
                    <p className="text-horizon-accent text-sm">{lead.contact_attempts}</p>
                  </div>
                </div>
              )}
              
              {lead.conversion_date && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <Building2 className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-sm text-green-400">הומר ללקוח</p>
                    <p className="text-green-300 text-sm">
                      {format(new Date(lead.conversion_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              )}
              
              {lead.lead_source && (
                <div className="flex items-center gap-3 p-3 bg-horizon-dark rounded-lg">
                  <FileText className="w-4 h-4 text-horizon-accent" />
                  <div>
                    <p className="text-sm text-horizon-text">מקור הליד</p>
                    <p className="text-horizon-accent text-sm">{lead.lead_source}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}