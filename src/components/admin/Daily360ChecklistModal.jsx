import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Circle, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const checklist360Items = [
  { key: 'financial_mapping', label: 'מיפוי כלכלי - איפה הכסף?' },
  { key: 'cash_sources', label: 'מקורות מזומנים' },
  { key: 'budget_tracking', label: 'מעקב תקציב' },
  { key: 'profit_margins', label: 'שולי רווח' },
  { key: 'inventory_status', label: 'מצב מלאי' },
  { key: 'supplier_payments', label: 'תשלומי ספקים' },
  { key: 'customer_collections', label: 'גביית לקוחות' },
  { key: 'tax_compliance', label: 'תאימות מס' },
  { key: 'financial_reports', label: 'דוחות כספיים' }
];

export default function Daily360ChecklistModal({ customer, isOpen, onClose }) {
  const [checklistData, setChecklistData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [todayDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (isOpen && customer?.email) {
      loadTodayChecklist();
    }
  }, [isOpen, customer?.email]);

  const loadTodayChecklist = async () => {
    setIsLoading(true);
    try {
      const existing = await base44.entities.Daily360Checklist.filter({
        customer_email: customer.email,
        check_date: todayDate
      });

      if (existing && existing.length > 0) {
        // טען צ'קליסט קיים
        const data = {};
        checklist360Items.forEach(item => {
          data[item.key] = existing[0][item.key] || false;
        });
        setChecklistData(data);
      } else {
        // צ'קליסט ריק
        const emptyData = {};
        checklist360Items.forEach(item => {
          emptyData[item.key] = false;
        });
        setChecklistData(emptyData);
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key) => {
    setChecklistData(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const existing = await base44.entities.Daily360Checklist.filter({
        customer_email: customer.email,
        check_date: todayDate
      });

      const dataToSave = {
        customer_email: customer.email,
        check_date: todayDate,
        ...checklistData
      };

      if (existing && existing.length > 0) {
        await base44.entities.Daily360Checklist.update(existing[0].id, dataToSave);
      } else {
        await base44.entities.Daily360Checklist.create(dataToSave);
      }

      alert('הצ\'קליסט נשמר בהצלחה!');
      onClose();
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('שגיאה בשמירת הצ\'קליסט: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const completedCount = Object.values(checklistData).filter(v => v === true).length;
  const totalCount = checklist360Items.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-horizon-dark border-horizon max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle className="text-horizon-text text-xl">
              צ'קליסט יומי - אופק 360
            </DialogTitle>
            <div className="flex items-center justify-between">
              <p className="text-sm text-horizon-accent">
                {customer?.business_name || customer?.full_name}
              </p>
              <Badge className="bg-horizon-primary text-white">
                {format(new Date(), 'dd/MM/yyyy', { locale: he })}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Bar */}
            <Card className="bg-horizon-card/30 border-horizon">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-horizon-accent">התקדמות יומית</span>
                  <span className="text-lg font-bold text-horizon-text">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <div className="w-full bg-horizon-dark rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#32acc1] to-[#83ddec] h-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-horizon-accent mt-2 text-center">
                  {completionPercentage}% הושלם
                </p>
              </CardContent>
            </Card>

            {/* Checklist Items */}
            <div className="space-y-2">
              {checklist360Items.map((item, index) => {
                const isChecked = checklistData[item.key] === true;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key)}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                        : 'bg-horizon-card border-horizon hover:border-horizon-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        {isChecked ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <Circle className="w-6 h-6 text-horizon-accent" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isChecked ? 'text-green-300' : 'text-horizon-text'}`}>
                          {item.label}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={isChecked ? 'border-green-500 text-green-400' : 'border-horizon text-horizon-accent'}
                    >
                      {isChecked ? 'רצוי ✓' : 'מצוי'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-horizon">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-horizon text-horizon-text"
            disabled={isSaving}
          >
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-horizon-primary"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמור
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}