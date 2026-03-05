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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy, AlertCircle } from "lucide-react";
import { FileUpload, ProductCatalog, Recommendation } from '@/api/entities';
import { openRouterAPI } from '@/api/integrations';


export default function GoalOrientedRecommendationModal({ customer, isOpen, onClose, onSuccess }) {
  const [goalDescription, setGoalDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('strategic_moves');
  const [priority, setPriority] = useState('high');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'strategic_moves', label: 'מהלכים אסטרטגיים' },
    { value: 'pricing', label: 'תמחור' },
    { value: 'bundles', label: 'באנדלים' },
    { value: 'suppliers', label: 'ספקים' },
    { value: 'promotions', label: 'מבצעים' },
    { value: 'inventory', label: 'מלאי' }
  ];

  const handleGenerate = async () => {
    if (!goalDescription.trim()) {
      setError('אנא הזן תיאור של היעד העסקי');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // שליפת נתוני לקוח רלוונטיים
      const [catalogItems, files, existingRecommendations] = await Promise.all([
        ProductCatalog.filter({ customer_email: customer.email, is_active: true }).catch(() => []),
        FileUpload.filter({ customer_email: customer.email, status: 'analyzed' }, '-created_date', 5).catch(() => []),
        Recommendation.filter({ customer_email: customer.email }, '-created_date', 10).catch(() => [])
      ]);

      const contextData = {
        business_name: customer.business_name,
        business_type: customer.business_type,
        catalog_size: catalogItems.length,
        has_catalog: catalogItems.length > 0,
        recent_files_count: files.length,
        existing_recommendations_count: existingRecommendations.length
      };

      // יצירת prompt ל-AI
      const prompt = `
אתה יועץ עסקי אסטרטגי מומחה. משימתך היא ליצור המלצה מפורטת ומעשית עבור עסק שרוצה להשיג יעד ספציפי.

**פרטי העסק:**
- שם העסק: ${customer.business_name}
- סוג העסק: ${customer.business_type || 'לא צוין'}
- מספר מוצרים בקטלוג: ${contextData.catalog_size}
- קבצים נותחו: ${contextData.recent_files_count}
- המלצות קודמות: ${contextData.existing_recommendations_count}

**היעד העסקי שהלקוח רוצה להשיג:**
"${goalDescription}"

**הקטגוריה שנבחרה להמלצה:** ${selectedCategory}

**צור המלצה מפורטת שכוללת:**
1. כותרת ממוקדת ומושכת (title)
2. תיאור מלא ומפורט של ההמלצה (description) - לפחות 150 מילים
3. 5-7 צעדי פעולה קונקרטיים (action_steps) - צעדים מעשיים שהלקוח יכול לעשות
4. הערכת רווח צפוי בשקלים (expected_profit) - הערכה ריאלית
5. אחוז שיפור רווחיות צפוי (profit_percentage) - 0-100
6. רמת מאמץ יישום (implementation_effort) - low/medium/high
7. טווח זמן ליישום (timeframe) - תיאור טקסטואלי
8. נימוק מפורט מדוע ההמלצה תעזור להשיג את היעד (reasoning)

**חשוב:**
- ההמלצה חייבת להיות ממוקדת ומעשית
- צעדי הפעולה חייבים להיות קונקרטיים ולא כלליים
- הערכות הרווח חייבות להיות ריאליות ומבוססות
- כל הטקסט בעברית
      `;

      const recommendationSchema = {
        type: "object",
        properties: {
          title: { type: "string", description: "כותרת ההמלצה" },
          description: { type: "string", description: "תיאור מפורט של ההמלצה" },
          action_steps: { 
            type: "array", 
            items: { type: "string" },
            description: "רשימת צעדי פעולה קונקרטיים"
          },
          expected_profit: { type: "number", description: "רווח צפוי בשקלים" },
          profit_percentage: { type: "number", description: "אחוז שיפור רווחיות" },
          implementation_effort: { 
            type: "string", 
            enum: ["low", "medium", "high"],
            description: "רמת מאמץ יישום"
          },
          timeframe: { type: "string", description: "טווח זמן ליישום" },
          reasoning: { type: "string", description: "נימוק מדוע ההמלצה תעזור להשיג את היעד" }
        },
        required: ["title", "description", "action_steps", "expected_profit", "implementation_effort", "timeframe"]
      };

      const aiResponse = await openRouterAPI({
        prompt: prompt,
        response_json_schema: recommendationSchema
      });

      // יצירת ההמלצה במערכת
      await Recommendation.create({
        customer_email: customer.email,
        title: aiResponse.title,
        description: aiResponse.description,
        category: selectedCategory,
        source: 'goal_oriented',
        priority: priority,
        expected_profit: aiResponse.expected_profit || 0,
        profit_percentage: aiResponse.profit_percentage || 0,
        implementation_effort: aiResponse.implementation_effort,
        timeframe: aiResponse.timeframe,
        action_steps: aiResponse.action_steps || [],
        status: 'pending',
        trigger_condition: 'goal_based_request',
        related_data: {
          goal_description: goalDescription,
          ai_reasoning: aiResponse.reasoning || '',
          generated_date: new Date().toISOString()
        }
      });

      onSuccess();
    } catch (err) {
      console.error('Error generating goal-oriented recommendation:', err);
      setError('שגיאה ביצירת ההמלצה: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-horizon-primary flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            יצירת המלצה מבוססת יעד עסקי
          </DialogTitle>
          <DialogDescription className="text-right text-horizon-accent">
            תאר את היעד העסקי שאתה רוצה להשיג והמערכת תייצר המלצה מפורטת ומעשית
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-horizon-text">
              תאר את היעד העסקי הרצוי
            </Label>
            <Textarea
              id="goal"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              placeholder="לדוגמה: רוצה לצאת לזכיינות ולהרחיב את העסק ל-3 סניפים נוספים תוך שנה, או: צמצום תלות בפלטפורמת VolT והגדלת מכירות ישירות ללקוחות"
              className="min-h-[120px] bg-horizon-card border-horizon text-horizon-text resize-none"
              disabled={isGenerating}
            />
            <p className="text-xs text-horizon-accent">
              תאר את היעד בפירוט - ככל שתהיה מדויק יותר, ההמלצה תהיה ממוקדת ומעשית יותר
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-horizon-text">קטגוריית המלצה</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isGenerating}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon" dir="rtl">
                  {categories.map(cat => (
                    <SelectItem 
                      key={cat.value} 
                      value={cat.value}
                      className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer"
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-horizon-text">עדיפות</Label>
              <Select value={priority} onValueChange={setPriority} disabled={isGenerating}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon" dir="rtl">
                  <SelectItem value="high" className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer">
                    גבוהה
                  </SelectItem>
                  <SelectItem value="medium" className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer">
                    בינונית
                  </SelectItem>
                  <SelectItem value="low" className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer">
                    נמוכה
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-horizon">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-horizon-accent text-horizon-accent hover:bg-horizon-card"
            disabled={isGenerating}
          >
            ביטול
          </Button>
          <Button
            onClick={handleGenerate}
            className="btn-horizon-primary"
            disabled={isGenerating || !goalDescription.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מייצר המלצה...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4 ml-2" />
                צור המלצה על בסיס יעד
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}