import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Building, Star } from "lucide-react";

import { toast } from "sonner";
import { requestSupplierQuote } from '@/api/functions';

export default function SupplierQuoteRequestModal({ isOpen, onClose, supplier, onQuoteRequested }) {
  const [formData, setFormData] = useState({
    request_details: '',
    request_type: 'quote_request',
    estimated_value: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestTypes = [
    { value: 'quote_request', label: 'בקשת הצעת מחיר' },
    { value: 'service_inquiry', label: 'בירור שירות' },
    { value: 'product_inquiry', label: 'בירור מוצר' },
    { value: 'partnership', label: 'הצעת שותפות' },
    { value: 'other', label: 'אחר' }
  ];

  const priorities = [
    { value: 'low', label: 'נמוכה', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'בינונית', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'גבוהה', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'דחופה', color: 'bg-red-100 text-red-800' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.request_details.trim()) {
      toast.warning('נא להזין פרטי בקשה');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData = {
        supplier_id: supplier.id,
        request_details: formData.request_details,
        request_type: formData.request_type,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        priority: formData.priority
      };

      const { data, error } = await requestSupplierQuote(requestData);

      if (error || !data.success) {
        throw new Error(data.error || 'שליחת הבקשה נכשלה');
      }

      if (onQuoteRequested) {
        onQuoteRequested(data.lead_id);
      }

      toast.success('הבקשה נשלחה בהצלחה לספק!');
      onClose();
      
      // Reset form
      setFormData({
        request_details: '',
        request_type: 'quote_request',
        estimated_value: '',
        priority: 'medium'
      });

    } catch (error) {
      console.error("Error sending quote request:", error);
      toast.error('שגיאה בשליחת הבקשה: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Send className="w-5 h-5 text-blue-600" />
            בקשת הצעת מחיר מ-{supplier.name}
          </DialogTitle>
        </DialogHeader>

        {/* פרטי ספק */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-4 h-4 text-gray-600" />
                <span className="font-medium">{supplier.name}</span>
              </div>
              <p className="text-sm text-gray-600">קטגוריה: {supplier.category}</p>
              <p className="text-sm text-gray-600">איש קשר: {supplier.contact_person}</p>
              {supplier.delivery_time && (
                <p className="text-sm text-gray-600">זמן אספקה: {supplier.delivery_time}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{supplier.rating || 5}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="request_type">סוג בקשה</Label>
            <Select
              value={formData.request_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, request_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {requestTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="request_details">פרטי הבקשה *</Label>
            <Textarea
              id="request_details"
              value={formData.request_details}
              onChange={(e) => setFormData(prev => ({ ...prev, request_details: e.target.value }))}
              placeholder="פרט את הבקשה שלך: סוג המוצר/שירות, כמות, מפרט טכני, לוח זמנים וכל פרט רלוונטי אחר..."
              className="text-right h-32"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimated_value">שווי משוער (₪)</Label>
              <Input
                id="estimated_value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                placeholder="10000"
                className="text-right"
              />
            </div>

            <div>
              <Label htmlFor="priority">עדיפות</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={priority.color}>{priority.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <strong>💡 טיפ:</strong> ככל שתהיה יותר ספציפי בפרטי הבקשה, כך תקבל הצעת מחיר מדויקת ואיכותית יותר.
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  שלח בקשה
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}