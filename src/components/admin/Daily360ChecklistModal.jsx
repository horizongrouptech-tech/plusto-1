import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Circle, Loader2, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function Daily360ChecklistModal({ isOpen, onClose, customer, currentUser }) {
  const [checklist, setChecklist] = useState({
    financial_mapping: null,
    cash_sources: null,
    budget_tracking: null,
    inventory_status: null,
    supplier_relations: null,
    sales_tracking: null,
    goals_progress: null,
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkItems = [
    { key: 'financial_mapping', label: 'מיפוי כלכלי - איפה הכסף' },
    { key: 'cash_sources', label: 'מקורות מזומנים' },
    { key: 'budget_tracking', label: 'מעקב תקציבי' },
    { key: 'inventory_status', label: 'מצב מלאי' },
    { key: 'supplier_relations', label: 'קשרי ספקים' },
    { key: 'sales_tracking', label: 'מעקב מכירות' },
    { key: 'goals_progress', label: 'התקדמות יעדים' }
  ];

  useEffect(() => {
    if (isOpen && customer) {
      loadTodayChecklist();
    }
  }, [isOpen, customer]);

  const loadTodayChecklist = async () => {
    setIsLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const existing = await base44.entities.Daily360Checklist.filter({
        customer_email: customer.email,
        check_date: today
      });

      if (existing.length > 0) {
        setChecklist({
          financial_mapping: existing[0].financial_mapping,
          cash_sources: existing[0].cash_sources,
          budget_tracking: existing[0].budget_tracking,
          inventory_status: existing[0].inventory_status,
          supplier_relations: existing[0].supplier_relations,
          sales_tracking: existing[0].sales_tracking,
          goals_progress: existing[0].goals_progress,
          notes: existing[0].notes || ''
        });
      } else {
        setChecklist({
          financial_mapping: null,
          cash_sources: null,
          budget_tracking: null,
          inventory_status: null,
          supplier_relations: null,
          sales_tracking: null,
          goals_progress: null,
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key) => {
    setChecklist(prev => {
      const current = prev[key];
      let next = null;
      if (current === null) next = 'רצוי';
      else if (current === 'רצוי') next = 'מצוי';
      else next = null;
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const existing = await base44.entities.Daily360Checklist.filter({
        customer_email: customer.email,
        check_date: today
      });

      const data = {
        customer_email: customer.email,
        check_date: today,
        checked_by_email: currentUser.email,
        ...checklist
      };

      if (existing.length > 0) {
        await base44.entities.Daily360Checklist.update(existing[0].id, data);
      } else {
        await base44.entities.Daily360Checklist.create(data);
      }

      alert('צ\'קליסט נשמר בהצלחה');
      onClose();
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('שגיאה בשמירה');
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionPercentage = () => {
    const total = checkItems.length;
    const completed = checkItems.filter(item => checklist[item.key] !== null).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-horizon-dark border-horizon max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-horizon-text flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-horizon-primary" />
            צ'קליסט יומי 360 - {customer?.business_name || customer?.full_name}
          </DialogTitle>
          <div className="text-sm text-horizon-accent">
            {format(new Date(), 'dd/MM/yyyy', { locale: he })} | השלמה: {getCompletionPercentage()}%
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {checkItems.map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-horizon-card/30 rounded-lg border border-horizon">
                <span className="text-horizon-text font-medium">{item.label}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(item.key)}
                    className={`transition-all ${
                      checklist[item.key] === 'רצוי' 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : checklist[item.key] === 'מצוי'
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-gray-500/20 text-horizon-accent hover:bg-gray-500/40'
                    }`}
                  >
                    {checklist[item.key] === 'רצוי' ? (
                      <>
                        <CheckCircle className="w-4 h-4 ml-1" />
                        רצוי
                      </>
                    ) : checklist[item.key] === 'מצוי' ? (
                      <>
                        <Circle className="w-4 h-4 ml-1" />
                        מצוי
                      </>
                    ) : (
                      'לא סומן'
                    )}
                  </Button>
                </div>
              </div>
            ))}

            <div>
              <label className="text-sm text-horizon-accent mb-2 block">הערות</label>
              <Textarea
                value={checklist.notes}
                onChange={(e) => setChecklist({ ...checklist, notes: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                rows={3}
                placeholder="הערות נוספות..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-horizon">
              <Button variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'שמור צ\'קליסט'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}