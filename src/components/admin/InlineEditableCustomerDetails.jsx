import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from '@tanstack/react-query';

import InlineEditableField from '@/components/admin/goals/InlineEditableField';

import { toast } from "sonner";
import { OnboardingRequest } from '@/api/entities';

export default function InlineEditableCustomerDetails({ customer, onUpdate }) {
  const queryClient = useQueryClient();

  const handleFieldSave = async (field, value) => {
    try {
      await OnboardingRequest.update(customer.id, {
        [field]: value
      });

      queryClient.invalidateQueries(['activeCustomers']);

      if (onUpdate) {
        onUpdate({ ...customer, [field]: value });
      }
    } catch (error) {
      toast.error('שגיאה בעדכון: ' + error.message);
    }
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
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-horizon-text mb-3">פרטי לקוח</h3>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-right" dir="rtl">
          {fields.map(field => (
            <div key={field.key}>
              <label className="text-xs text-horizon-accent block mb-0.5">{field.label}</label>
              <InlineEditableField
                value={customer[field.key] || ''}
                onSave={(value) => handleFieldSave(field.key, value)}
                type={field.type}
                placeholder={field.label}
                className="text-sm font-medium"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
