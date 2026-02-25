import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from '@tanstack/react-query';

import { Loader2, Edit2, Save, X } from 'lucide-react';
import InlineEditableField from '@/components/admin/goals/InlineEditableField';

import { toast } from "sonner";
import { OnboardingRequest } from '@/api/entities';
export default function InlineEditableCustomerDetails({ customer, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleFieldSave = async (field, value) => {
    setIsSaving(true);
    try {
      // עדכון OnboardingRequest
      await OnboardingRequest.update(customer.id, {
        [field]: value
      });

      // עדכון User אם צריך
      if (field === 'email' && customer.email !== value) {
        // לא יכולים לעדכן אימייל ישירות - צריך עדכון משתמש
        // כאן נעשה עדכון ב-OnboardingRequest בלבד
      }

      queryClient.invalidateQueries(['activeCustomers']);
      
      if (onUpdate) {
        onUpdate({ ...customer, [field]: value });
      }
    } catch (error) {
      toast.error('שגיאה בעדכון: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const fields = [
    { key: 'business_name', label: 'שם העסק', type: 'text' },
    { key: 'full_name', label: 'שם המנהל', type: 'text' },
    { key: 'phone', label: 'טלפון', type: 'tel' },
    { key: 'business_type', label: 'סוג עסק', type: 'text' },
    { key: 'company_size', label: 'גודל חברה', type: 'text' },
    { key: 'monthly_revenue', label: 'מחזור חודשי', type: 'number' },
    { key: 'business_city', label: 'עיר', type: 'text' },
    { key: 'website_url', label: 'אתר אינטרנט', type: 'url' }
  ];

  return (
    <Card className="card-horizon">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-horizon-text">פרטי לקוח</h3>
          <Button
            size="sm"
            variant={isEditing ? 'default' : 'outline'}
            onClick={() => setIsEditing(!isEditing)}
            disabled={isSaving}
            className={isEditing ? 'bg-horizon-primary text-white' : ''}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEditing ? (
              <>
                <Save className="w-3 h-3 ml-1" />
                סיים עריכה
              </>
            ) : (
              <>
                <Edit2 className="w-3 h-3 ml-1" />
                ערוך
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-right" dir="rtl">
          {fields.map(field => (
            <div key={field.key}>
              <label className="text-sm text-horizon-accent block mb-1">{field.label}</label>
              {isEditing ? (
                <InlineEditableField
                  value={customer[field.key] || ''}
                  onSave={(value) => {
                    if (field.key === 'email' && value && !validateEmail(value)) {
                      toast.warning('אימייל לא תקין');
                      return;
                    }
                    handleFieldSave(field.key, value);
                  }}
                  type={field.type}
                  placeholder={field.label}
                />
              ) : (
                <p className="text-horizon-text font-medium">
                  {customer[field.key] || 'לא צוין'}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}