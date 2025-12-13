import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, X } from "lucide-react";
import { Supplier } from "@/entities/Supplier";

export default function EditSupplierModal({ isOpen, onClose, supplier, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    payment_terms: '',
    delivery_time: '',
    min_order: '',
    rating: 5,
    notes: '',
    is_active: true,
    is_partner_supplier: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && supplier) {
      setFormData({
        name: supplier.name || '',
        category: supplier.category || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        payment_terms: supplier.payment_terms || '',
        delivery_time: supplier.delivery_time || '',
        min_order: supplier.min_order || '',
        rating: supplier.rating || 5,
        notes: supplier.notes || '',
        is_active: supplier.is_active !== false,
        is_partner_supplier: supplier.is_partner_supplier || false,
      });
    }
  }, [isOpen, supplier]);

  const categories = [
    'חומרי גלם', 'אריזה ועיצוב', 'לוגיסטיקה ושילוח', 'שיווק ופרסום',
    'טכנולוגיה ומערכות מידע', 'שירותים מקצועיים', 'ציוד ומכונות',
    'תחזוקה ותיקונים', 'ייעוץ עסקי', 'שירותים פיננסיים', 'אחר'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updatedData = {
        ...formData,
        min_order: formData.min_order ? parseFloat(formData.min_order) : null,
        rating: parseInt(formData.rating),
      };

      await Supplier.update(supplier.id, updatedData);
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (error) {
      console.error("Error updating supplier:", error);
      setError("שגיאה בעדכון הספק. אנא נסה שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-horizon-primary text-2xl">
            עריכת ספק: {supplier?.name}
          </DialogTitle>
          <DialogDescription className="text-right text-horizon-accent">
            עדכן את פרטי הספק לפי הצורך.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-horizon-text">שם הספק *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="שם החברה" required className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-horizon-text">תחום התמחות *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} disabled={isSubmitting}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text"><SelectValue placeholder="בחר תחום" /></SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon text-horizon-text">
                  {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person" className="text-horizon-text">איש קשר *</Label>
              <Input id="contact_person" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} placeholder="שם איש הקשר" required className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-horizon-text">טלפון *</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="050-1234567" required className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-horizon-text">אימייל</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contact@supplier.com" className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address" className="text-horizon-text">כתובת</Label>
            <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="כתובת הספק" className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_terms" className="text-horizon-text">תנאי תשלום</Label>
              <Input id="payment_terms" value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} placeholder="לדוגמה: שוטף+30" className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_time" className="text-horizon-text">זמן אספקה</Label>
              <Input id="delivery_time" value={formData.delivery_time} onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })} placeholder="לדוגמה: 7 ימי עסקים" className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="min_order" className="text-horizon-text">הזמנה מינימלית (₪)</Label>
            <Input id="min_order" type="number" value={formData.min_order} onChange={(e) => setFormData({ ...formData, min_order: e.target.value })} placeholder="1000" className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating" className="text-horizon-text">דירוג (1-5 כוכבים)</Label>
            <Select value={formData.rating.toString()} onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })} disabled={isSubmitting}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-horizon-card border-horizon text-horizon-text">
                {[1, 2, 3, 4, 5].map((rate) => (<SelectItem key={rate} value={rate.toString()}>{'⭐'.repeat(rate)} ({rate})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-horizon-text">הערות</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="הערות נוספות על הספק..." rows={3} className="bg-horizon-card border-horizon text-horizon-text" disabled={isSubmitting} />
          </div>

          <div className="flex justify-end space-x-6 pt-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="is_active" className="text-horizon-text">ספק פעיל</Label>
              <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} disabled={isSubmitting} />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="is_partner_supplier" className="text-horizon-text">ספק שותף</Label>
              <Switch id="is_partner_supplier" checked={formData.is_partner_supplier} onCheckedChange={(checked) => setFormData({ ...formData, is_partner_supplier: checked })} disabled={isSubmitting} />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="border-horizon-accent text-horizon-accent hover:bg-horizon-card">
              <X className="w-4 h-4 ml-1" /> ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.category || !formData.contact_person || !formData.phone} className="btn-horizon-primary">
              {isSubmitting ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" /> שומר...</>) : (<><Save className="ml-2 h-4 w-4" /> שמור שינויים</>)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}