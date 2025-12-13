import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Send, Loader2 } from 'lucide-react';

const RecommendationUpgradePromptModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-horizon-dark border-horizon text-horizon-text" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-text flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-horizon-primary" />
            שדרוג מונחה להמלצה
          </DialogTitle>
          <DialogDescription className="text-horizon-accent text-right pt-2">
            מה תרצה לשפר או לשנות בהמלצה? תן הנחיות ברורות לבינה המלאכותית כדי לקבל תוצאה מדויקת יותר.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="לדוגמה: 'נסח מחדש את ההמלצה בסגנון יותר אישי ופחות רשמי', 'הפוך את שלבי הביצוע ליותר קצרים וקונקרטיים', 'התמקד במוצר X והצע דרכים יצירתיות לשיווק שלו'..."
            className="min-h-[120px] bg-horizon-card border-horizon text-horizon-text text-right"
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>ביטול</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!prompt.trim() || isLoading}
            className="btn-horizon-primary"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מעבד בקשה...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 ml-2" />
                שדרג המלצה
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecommendationUpgradePromptModal;