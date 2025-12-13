
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, History } from "lucide-react";
import { generateDeeperInsights } from "@/functions/generateDeeperInsights";
import { FileUpload } from '@/entities/FileUpload';

export default function DeeperInsightsModal({ isOpen, onClose, fileData, onInsightsUpdated }) {
  const [specificQuery, setSpecificQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newInsights, setNewInsights] = useState(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setNewInsights(null);

    try {
      const { data, error: apiError } = await generateDeeperInsights({ fileId: fileData.id, specificQuery });
      
      if (apiError || !data.success) {
        throw new Error(apiError?.message || data.error || 'Failed to generate insights.');
      }
      
      setNewInsights(data.insights);
      
      // רענון הנתונים של הקובץ כדי לטעון את היסטוריית התובנות המעודכנת
      const updatedFile = await FileUpload.get(fileData.id);
      if (onInsightsUpdated) {
        onInsightsUpdated(updatedFile);
      }

    } catch (err) {
      console.error("Error generating deeper insights:", err);
      setError(`שגיאה ביצירת תובנות: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const hasHistory = fileData.extra_ai_insights && Object.keys(fileData.extra_ai_insights).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-horizon-primary"/>
            הפקת תובנות נוספות
          </DialogTitle>
          <DialogDescription className="text-right text-horizon-accent">
            הזן שאלה ספציפית לניתוח, או השאר ריק לקבלת תובנות כלליות על בסיס הניתוח הקיים.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <label htmlFor="specific-query" className="text-sm font-medium text-horizon-accent block mb-2 text-right">בקשה/שאלה ספציפית (אופציונלי):</label>
            <Textarea
              id="specific-query"
              value={specificQuery}
              onChange={(e) => setSpecificQuery(e.target.value)}
              placeholder="לדוגמה: 'מהם הסיכונים הפיננסיים העיקריים?', 'הצע שיפורים בתמחור המוצרים', 'נתח את יעילות השיווק'..."
              className="bg-horizon-card border-horizon text-horizon-text resize-none"
              rows={3}
            />
          </div>

          <Button onClick={handleGenerate} disabled={isLoading} className="w-full btn-horizon-secondary">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מפיק תובנה מעמיקה...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 ml-2" />
                הפק תובנה מעמיקה
              </>
            )}
          </Button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {newInsights && (
          <div className="mt-4 p-4 border-t border-horizon">
            <h4 className="text-lg font-semibold mb-2 text-horizon-primary text-right">תובנות חדשות:</h4>
            <div className="p-3 bg-horizon-card/50 rounded-lg text-right max-h-[200px] overflow-y-auto space-y-3">
              {Object.entries(newInsights).map(([title, content]) => (
                <div key={title} className="mb-3">
                  <p className="font-bold text-horizon-text">{title}</p>
                  <p className="text-sm text-horizon-accent whitespace-pre-wrap">{content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasHistory && (
          <div className="mt-4 pt-4 border-t border-horizon">
            <h4 className="text-lg font-semibold mb-2 text-horizon-accent flex items-center gap-2 text-right">
              <History className="w-5 h-5"/>
              היסטוריית תובנות
            </h4>
            <div className="p-4 bg-horizon-card/30 rounded-lg space-y-4 max-h-[200px] overflow-y-auto">
              {Object.entries(fileData.extra_ai_insights).reverse().map(([key, value]) => (
                <div key={key} className="p-3 bg-horizon-card/50 rounded-lg text-right">
                  {Object.entries(value).map(([insightTitle, insightContent]) => (
                    <div key={insightTitle} className="mb-2 last:mb-0">
                      <p className="font-semibold text-horizon-text text-sm">{insightTitle}</p>
                      <p className="text-xs text-horizon-accent whitespace-pre-wrap">{insightContent}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button onClick={onClose} variant="outline" className="border-horizon text-horizon-accent hover:bg-horizon-card">
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
