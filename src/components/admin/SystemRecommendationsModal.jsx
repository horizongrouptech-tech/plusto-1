import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export default function SystemRecommendationsModal({ isOpen, onClose, onGenerate, isLoading }) {
  const handleGenerateClick = () => {
    // תמיד שולח את כל הקטגוריות - המערכת תיצר 1-2 מכל אחת
    const allCategories = ['pricing', 'promotions', 'bundles', 'suppliers', 'inventory', 'strategic_moves'];
    onGenerate(allCategories);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-horizon-primary flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            יצירת המלצות מערכת אוטומטיות
          </DialogTitle>
          <DialogDescription className="text-right text-horizon-accent">
            המערכת תייצר באופן אוטומטי 1-2 המלצות מכל סוג:
            <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
              <li>תמחור מוצרים</li>
              <li>מבצעים שוטפים</li>
              <li>באנדלים וחבילות</li>
              <li>אופטימיזציית ספקים</li>
              <li>ניהול מלאי</li>
              <li>מהלכים אסטרטגיים</li>
            </ul>
            <p className="mt-3 text-xs">
              סה"כ: 6-12 המלצות מבוססות AI ייווצרו עבור הלקוח
            </p>
          </DialogDescription>
        </DialogHeader>

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
                יוצר המלצות...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 ml-2" />
                צור המלצות מערכת
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}