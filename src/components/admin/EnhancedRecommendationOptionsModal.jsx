import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function EnhancedRecommendationOptionsModal({ isOpen, onClose, onGenerate, isLoading }) {
  const [selectedCategories, setSelectedCategories] = useState([]);

  const allCategories = [
    { value: 'pricing', label: 'תמחור' },
    { value: 'promotions', label: 'מבצעים שוטפים' },
    { value: 'bundles', label: 'בנדלים' },
    { value: 'suppliers', label: 'ספקים' },
    { value: 'inventory', label: 'מלאי' },
    { value: 'strategic_moves', label: 'מהלכים אסטרטגיים' },
  ];

  const handleCheckboxChange = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleGenerateClick = () => {
    // אם לא נבחרה אף קטגוריה, נחזיר את כל הקטגוריות
    const categoriesToGenerate = selectedCategories.length > 0 ? selectedCategories : allCategories.map(cat => cat.value);
    onGenerate(categoriesToGenerate);
    onClose(); // סגור את המודאל לאחר ההפעלה
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-horizon-primary">בחר סוגי המלצות ליצירה</DialogTitle>
          <DialogDescription className="text-right text-horizon-accent">
            בחר קטגוריות ספציפיות של המלצות שהמערכת תיצור עבור הלקוח.
            <br />
            אם לא תבחר אף קטגוריה, המערכת תיצור המלצות מכל הסוגים.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {allCategories.map(category => (
            <div key={category.value} className="flex items-center space-x-2 justify-end">
              <Label htmlFor={category.value} className="text-horizon-text cursor-pointer">{category.label}</Label>
              <Checkbox
                id={category.value}
                checked={selectedCategories.includes(category.value)}
                onCheckedChange={() => handleCheckboxChange(category.value)}
                className="bg-horizon-card border-horizon text-horizon-primary"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-horizon">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-horizon-accent text-horizon-accent hover:bg-horizon-card"
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            onClick={handleGenerateClick}
            className="btn-horizon-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                יוצר...
              </>
            ) : (
              "צור המלצות"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}