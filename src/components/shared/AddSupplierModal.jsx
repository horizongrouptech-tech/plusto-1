
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const SUPPLIER_CATEGORIES = [
  'מזון',
  'טכנולוגיה',
  'אופנה',
  'ניקיון',
  'שירותים',
  'לוגיסטיקה',
  'אריזות',
  'משרדי',
  'כללי'
];

const SUPPLIER_TYPES = [
  'רואה חשבון',
  'הנהלת חשבונות',
  'ספק בשר',
  'ספק ירקות',
  'ספק מוצרי ניקיון',
  'ספק אריזות',
  'ספק שירותים',
  'ספק טכנולוגיה',
  'ספק לוגיסטיקה',
  'ספק כללי'
];

export default function AddSupplierModal({ isOpen, onClose, onSupplierAdded, currentUser, customerEmail }) {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    category: '',
    supplier_type: '',
    payment_terms: '',
    delivery_time: '',
    min_order: '',
    notes: '',
    website_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ וולידציה מעודכנת - רק שם, איש קשר וקטגוריה חובה
    if (!formData.name || !formData.contact_person || !formData.category) {
      alert('נא למלא: שם הספק, איש קשר וקטגוריה');
      return;
    }

    setIsSubmitting(true);
    try {
      const supplierData = {
        ...formData,
        min_order: formData.min_order ? parseFloat(formData.min_order) : 0,
        phone: formData.phone || null, // ✅ אופציונלי
        email: formData.email || null, // ✅ אופציונלי
        is_active: true,
        added_by_full_name: currentUser?.full_name || currentUser?.email,
        source: 'manual',
        customer_emails: customerEmail ? [customerEmail] : []
      };

      await base44.entities.Supplier.create(supplierData);
      
      alert('הספק נוסף בהצלחה!');
      
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        category: '',
        supplier_type: '',
        payment_terms: '',
        delivery_time: '',
        min_order: '',
        notes: '',
        website_url: ''
      });
      
      if (onSupplierAdded) {
        onSupplierAdded();
      }
      
      onClose();
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('שגיאה בהוספת הספק: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-primary">הוסף ספק חדש</DialogTitle>
          <DialogDescription className="text-horizon-accent">
            {customerEmail ? 'הספק ישויך אוטומטית ללקוח הנוכחי' : 'מלא את פרטי הספק. שדות עם * הם חובה'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-horizon-text">שם הספק *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required
              />
            </div>

            <div>
              <Label htmlFor="contact_person" className="text-horizon-text">איש קשר *</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-horizon-text">טלפון (אופציונלי)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="לדוגמה: 050-1234567"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-horizon-text">אימייל (אופציונלי)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="לדוגמה: info@supplier.com"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-horizon-text">קטגוריה *</Label>
              <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="supplier_type" className="text-horizon-text">סוג ספק</Label>
              <Select value={formData.supplier_type} onValueChange={(value) => handleChange('supplier_type', value)}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="בחר סוג ספק" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="website_url" className="text-horizon-text">אתר אינטרנט</Label>
              <Input
                id="website_url"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="payment_terms" className="text-horizon-text">תנאי תשלום</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => handleChange('payment_terms', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="לדוגמה: שוטף+30"
              />
            </div>

            <div>
              <Label htmlFor="delivery_time" className="text-horizon-text">זמן אספקה</Label>
              <Input
                id="delivery_time"
                value={formData.delivery_time}
                onChange={(e) => handleChange('delivery_time', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="לדוגמה: 3-5 ימי עסקים"
              />
            </div>

            <div>
              <Label htmlFor="min_order" className="text-horizon-text">הזמנה מינימלית (₪)</Label>
              <Input
                id="min_order"
                type="number"
                value={formData.min_order}
                onChange={(e) => handleChange('min_order', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-horizon-text">כתובת</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-horizon-text">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="bg-horizon-card border-horizon text-horizon-text"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting} className="btn-horizon-primary">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                'הוסף ספק'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
