import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

import { toast } from "sonner";
import { Supplier } from '@/api/entities';

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

export default function EditSupplierModal({ isOpen, onClose, supplier, onUpdate }) {
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
    website_url: '',
    rating: 5,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && supplier) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        category: supplier.category || '',
        supplier_type: supplier.supplier_type || '',
        payment_terms: supplier.payment_terms || '',
        delivery_time: supplier.delivery_time || '',
        min_order: supplier.min_order || '',
        notes: supplier.notes || '',
        website_url: supplier.website_url || '',
        rating: supplier.rating || 5,
        is_active: supplier.is_active !== false,
      });
    }
  }, [isOpen, supplier]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.contact_person || !formData.category) {
      toast.warning('נא למלא: שם הספק, איש קשר וקטגוריה');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedData = {
        ...formData,
        min_order: formData.min_order ? parseFloat(formData.min_order) : null,
        rating: parseInt(formData.rating) || 5,
        phone: formData.phone || null,
        email: formData.email || null,
      };

      await Supplier.update(supplier.id, updatedData);
      
      // טעינת הספק המעודכן מה-DB כדי להחזיר את הנתונים העדכניים
      const updatedSuppliers = await Supplier.filter({ id: supplier.id });
      const updatedSupplier = updatedSuppliers && updatedSuppliers.length > 0 ? updatedSuppliers[0] : null;
      
      toast.success('הספק עודכן בהצלחה!');

      if (onUpdate) {
        onUpdate(updatedSupplier);
      }
      onClose();
    } catch (error) {
      console.error("Error updating supplier:", error);
      setError("שגיאה בעדכון הספק. אנא נסה שוב.");
      toast.error('שגיאה בעדכון הספק: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-primary">
            עריכת ספק: {supplier?.name}
          </DialogTitle>
          <DialogDescription className="text-horizon-accent">
            עדכן את פרטי הספק לפי הצורך.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm text-right">
            {error}
          </div>
        )}

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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-horizon-text">קטגוריה *</Label>
              <Select value={formData.category} onValueChange={(value) => handleChange('category', value)} disabled={isSubmitting}>
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
              <Select value={formData.supplier_type} onValueChange={(value) => handleChange('supplier_type', value)} disabled={isSubmitting}>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-horizon-text">כתובת</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="rating" className="text-horizon-text">דירוג (1-5 כוכבים)</Label>
              <Select value={(formData.rating || 5).toString()} onValueChange={(value) => handleChange('rating', parseInt(value))} disabled={isSubmitting}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((rate) => (
                    <SelectItem key={rate} value={rate.toString()}>{'⭐'.repeat(rate)} ({rate})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              placeholder="הערות נוספות על הספק..."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch id="is_active" dir="ltr" checked={formData.is_active} onCheckedChange={(checked) => handleChange('is_active', checked)} disabled={isSubmitting} />
            <Label htmlFor="is_active" className="text-horizon-text cursor-pointer">ספק פעיל</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.category || !formData.contact_person} className="btn-horizon-primary">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                'שמור שינויים'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
