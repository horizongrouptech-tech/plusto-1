import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { XCircle, GitBranch } from 'lucide-react';

export default function IrrelevantRecommendationsModal({ isOpen, onClose, recommendations, customerEmail, onUpgradeRecommendation }) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const categoryTranslations = {
    pricing: "תמחור",
    bundles: "בנדלים",
    promotions: "מבצעים",
    suppliers: "ספקים",
    marketing: "שיווק",
    inventory: "מלאי",
    operations: "תפעול",
    strategic_moves: "מהלכים אסטרטגיים"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <XCircle />
            המלצות שסומנו כ"לא רלוונטיות"
          </DialogTitle>
          <DialogDescription className="text-horizon-accent">
            ניתן ללחוץ על המלצה כדי לערוך, לשדרג ולשלוח אותה מחדש.
            <br/>
            לקוח: <span className="font-semibold text-horizon-text">{customerEmail}</span> | סה"כ: {recommendations.length} המלצות.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto p-1">
          {recommendations.map(rec => (
            <div 
              key={rec.id} 
              className="p-4 rounded-lg bg-horizon-card border border-horizon hover:border-horizon-primary hover:bg-horizon-card/80 transition-all duration-200 cursor-pointer"
              onClick={() => onUpgradeRecommendation(rec)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-horizon-text">{rec.title}</h4>
                  <p className="text-sm text-red-300 mt-1">
                    <span className="font-medium">פידבק:</span> {rec.feedback_text || 'לא נמסר פידבק טקסטואלי'}
                  </p>
                </div>
                <Badge className="bg-horizon-secondary text-white flex-shrink-0">
                  <GitBranch className="w-3 h-3 ml-1" />
                  {categoryTranslations[rec.category] || rec.category}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}