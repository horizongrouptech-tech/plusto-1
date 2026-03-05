import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from '@tanstack/react-query';


import {
  Target,
  Edit,
  Building2,
  Archive,
  ArchiveRestore,
  Trash2
} from 'lucide-react';
import Ofek360Modal from '@/components/admin/Ofek360Modal';
import InlineEditableCustomerDetails from '@/components/admin/InlineEditableCustomerDetails';
import InlineEditableField from '@/components/admin/goals/InlineEditableField';
import { toast } from "sonner";
import { OnboardingRequest } from '@/api/entities';

export default function CustomerOverviewModal({
  customer,
  isOpen,
  onClose,
  onOpenSettings,
  onArchive,
  onUnarchive,
  onDelete,
  onCustomerUpdate
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ofek360Open, setOfek360Open] = useState(false);
  const queryClient = useQueryClient();

  if (!customer) return null;

  const handleFieldUpdate = async (field, value) => {
    try {
      await OnboardingRequest.update(customer.id, {
        [field]: value
      });
      queryClient.invalidateQueries(['activeCustomers']);
      onCustomerUpdate?.({ ...customer, [field]: value });
    } catch (error) {
      toast.error('שגיאה בעדכון: ' + error.message);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-horizon-primary" />
                סקירה כללית - {customer.business_name}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenSettings) {
                      onOpenSettings();
                    }
                  }}
                  className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך פרטים
                </Button>
                {customer.is_archived ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm('האם להוציא את הלקוח מארכיון?')) return;
                        if (onUnarchive) {
                          await onUnarchive(customer);
                        }
                      }}
                      className="border-green-500 text-green-400 hover:bg-green-500/10"
                    >
                      <ArchiveRestore className="w-4 h-4 ml-2" />
                      הוצא מארכיון
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      מחק לקוח
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm('האם להעביר את הלקוח לארכיון?')) return;
                      if (onArchive) {
                        await onArchive(customer);
                      }
                    }}
                    className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                  >
                    <Archive className="w-4 h-4 ml-2" />
                    העבר לארכיון
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-6">
          {/* כפתור אופק 360 */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              onClick={() => setOfek360Open(true)}
              className="bg-gradient-to-r from-horizon-primary to-horizon-secondary hover:from-horizon-primary/90 hover:to-horizon-secondary/90 text-white h-12 flex-1 min-w-[200px]"
            >
              <Target className="w-5 h-5 ml-2" />
              אופק 360 - צ'ק ליסט יומי
            </Button>
          </div>

          {/* פרטי לקוח עם עריכה משולבת */}
          <InlineEditableCustomerDetails 
            customer={customer}
            onUpdate={(updated) => onCustomerUpdate?.(updated)}
          />

          <Card className="card-horizon mt-4">
            <CardHeader>
              <CardTitle className="text-sm text-horizon-text">מוצרים ושירותים עיקריים</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEditableField
                value={customer.main_products_services || ''}
                onSave={(newValue) => handleFieldUpdate('main_products_services', newValue)}
                placeholder="הזן מוצרים ושירותים עיקריים"
                multiline={true}
              />
            </CardContent>
          </Card>

          <Card className="card-horizon mt-4">
            <CardHeader>
              <CardTitle className="text-sm text-horizon-text">יעדים עסקיים</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEditableField
                value={customer.business_goals || ''}
                onSave={(newValue) => handleFieldUpdate('business_goals', newValue)}
                placeholder="הזן יעדים עסקיים"
                multiline={true}
              />
            </CardContent>
          </Card>

          <Card className="card-horizon mt-4">
            <CardHeader>
              <CardTitle className="text-sm text-horizon-text">קהל יעד</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEditableField
                value={customer.target_audience || ''}
                onSave={(newValue) => handleFieldUpdate('target_audience', newValue)}
                placeholder="הזן קהל יעד"
                multiline={true}
              />
            </CardContent>
          </Card>

          </div>
        </DialogContent>
      </Dialog>

      {/* מודל אופק 360 */}
      {ofek360Open && (
        <Ofek360Modal
          customer={customer}
          isOpen={ofek360Open}
          onClose={() => setOfek360Open(false)}
        />
      )}

      {/* אישור מחיקת לקוח */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              מחיקת לקוח לצמיתות
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-horizon-accent">
              האם אתה בטוח שברצונך למחוק את <strong className="text-horizon-text">{customer?.business_name}</strong> וכל הנתונים הקשורים אליו?
            </p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              פעולה זו תמחק לצמיתות: המלצות, יעדים, קבצים, קטלוג, תזרים, ספקים, פגישות וכל המידע הנוסף. <strong>לא ניתן לשחזר את הנתונים.</strong>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-horizon text-horizon-accent"
              >
                ביטול
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  if (onDelete) {
                    await onDelete(customer);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק לצמיתות
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}