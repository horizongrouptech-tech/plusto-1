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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, MessageCircle, CheckCircle } from "lucide-react";
import { enhanceRecommendationWithPrompt } from "@/components/logic/targetedRecommendationEngine";



import { toast } from "sonner";
import { Recommendation } from '@/api/entities';
import { sendWhatsAppMessage } from '@/api/functions';
export default function RecommendationUpgradeModal({ 
  isOpen, 
  recommendation, 
  customer, 
  onClose, 
  onUpgraded,
  isFromIrrelevantModal = false // רק עבור המסלול של המלצות לא רלוונטיות
}) {
  const [prompt, setPrompt] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState(null);
  const [upgradedRecommendation, setUpgradedRecommendation] = useState(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  const handleUpgrade = async () => {
    if (!prompt.trim()) {
      setError("נא להזין הנחיות לשדרוג.");
      return;
    }
    setIsUpgrading(true);
    setError(null);

    try {
      const enhancedData = await enhanceRecommendationWithPrompt(recommendation, prompt, customer);

      if (!enhancedData || !enhancedData.title) {
        throw new Error("השדרוג לא החזיר תוצאה תקינה.");
      }

      const finalRecommendation = {
        ...recommendation,
        title: enhancedData.title,
        description: enhancedData.description,
        category: enhancedData.category || recommendation.category,
        expected_profit: enhancedData.expected_profit,
        profit_percentage: enhancedData.profit_percentage,
        action_steps: enhancedData.action_steps,
        priority: enhancedData.priority,
        implementation_effort: enhancedData.implementation_effort,
        timeframe: enhancedData.timeframe,
        last_upgraded: new Date().toISOString(),
        related_data: {
          ...recommendation.related_data,
          ...(enhancedData.related_data || {}),
          upgrade_prompt: prompt,
        },
      };

      await Recommendation.update(recommendation.id, finalRecommendation);
      
      if (onUpgraded && typeof onUpgraded === 'function') {
        onUpgraded(finalRecommendation);
      }

      // אם זה מגיע ממסלול המלצות לא רלוונטיות, להציג את התוצאה
      if (isFromIrrelevantModal) {
        setUpgradedRecommendation(finalRecommendation);
      } else {
        // במסלול רגיל, לסגור את המודאל
        onClose();
      }
      
    } catch (err) {
      console.error("Failed to upgrade recommendation:", err);
      setError(err.message || "שגיאה בשדרוג ההמלצה. נסה שוב.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!upgradedRecommendation || !customer) return;
    
    setIsSendingWhatsApp(true);
    try {
      const { data, error } = await sendWhatsAppMessage({
        customer_email: customer.email,
        recommendation_id: upgradedRecommendation.id,
        message_type: 'recommendation_upgraded'
      });

      if (error || !data.success) {
        throw new Error(data.error || 'שליחת הוואטסאפ נכשלה');
      }

      setWhatsAppSent(true);
      // עדכון סטטוס המשלוח של ההמלצה
      await Recommendation.update(upgradedRecommendation.id, {
        delivery_status: 'sent'
      });

    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      toast.error(`שגיאה בשליחת הוואטסאפ: ${error.message}`);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };
  
  const handleClose = () => {
    setPrompt('');
    setError(null);
    setIsUpgrading(false);
    setUpgradedRecommendation(null);
    setIsSendingWhatsApp(false);
    setWhatsAppSent(false);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  // אם ההמלצה שודרגה ואנחנו במסלול לא רלוונטי, להציג את התוצאה
  if (upgradedRecommendation && isFromIrrelevantModal) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] dir-rtl bg-horizon-dark border-horizon text-white">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <CheckCircle className="text-green-400" />
              המלצה שודרגה בהצלחה!
            </DialogTitle>
            <DialogDescription className="text-right text-horizon-accent pt-2">
              ההמלצה עודכנה בהתאם להנחיות שלך. ניתן כעת לשלוח אותה ללקוח דרך וואטסאפ.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h4 className="font-semibold text-green-400 mb-2">כותרת מעודכנת:</h4>
              <p className="text-horizon-text">{upgradedRecommendation.title}</p>
            </div>
            
            <div className="bg-horizon-card/50 rounded-lg p-4">
              <h4 className="font-semibold text-horizon-text mb-2">תיאור מעודכן:</h4>
              <p className="text-horizon-accent text-sm leading-relaxed">
                {upgradedRecommendation.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-horizon-card/30 p-3 rounded-lg">
                <span className="text-horizon-accent text-sm">רווח צפוי:</span>
                <div className="font-bold text-green-400">
                  ₪{upgradedRecommendation.expected_profit?.toLocaleString()}
                </div>
              </div>
              <div className="bg-horizon-card/30 p-3 rounded-lg">
                <span className="text-horizon-accent text-sm">עדיפות:</span>
                <div className="font-bold text-horizon-text">
                  {upgradedRecommendation.priority === 'high' ? 'גבוהה' : 
                   upgradedRecommendation.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                </div>
              </div>
            </div>

            {upgradedRecommendation.action_steps && upgradedRecommendation.action_steps.length > 0 && (
              <div className="bg-horizon-card/30 p-4 rounded-lg">
                <h4 className="font-semibold text-horizon-text mb-2">שלבי פעולה מעודכנים:</h4>
                <ol className="text-horizon-accent text-sm space-y-1">
                  {upgradedRecommendation.action_steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="bg-horizon-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 sm:justify-start">
            {whatsAppSent ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span>נשלח בהצלחה לוואטסאפ!</span>
              </div>
            ) : (
              <Button
                onClick={handleSendWhatsApp}
                disabled={isSendingWhatsApp}
                className="btn-horizon-secondary"
              >
                {isSendingWhatsApp ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-span" />
                    שולח...
                  </>
                ) : (
                  <>
                    <MessageCircle className="ml-2 h-4 w-4" />
                    שלח לוואטסאפ
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} className="border-horizon-accent text-horizon-accent">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // המסך הרגיל של הזנת הנחיות
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] dir-rtl bg-horizon-dark border-horizon text-white">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Wand2 className="text-horizon-primary" />
            שדרג המלצה
          </DialogTitle>
          <DialogDescription className="text-right text-horizon-accent pt-2">
            תאר במילים שלך כיצד תרצה לשנות ולשפר את ההמלצה. המערכת תנתח את ההנחיות שלך ותעדכן את ההמלצה בהתאם.
            <br/>
            לדוגמה: "הפוך את שלבי הפעולה לממוקדים יותר במכירות אונליין", "הדגש את היתרון התחרותי מול המתחרה X", "שנה את הטון ליותר דחוף".
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h4 className="font-semibold mb-2 text-right">המלצה מקורית:</h4>
          <div className="p-3 bg-horizon-card/50 rounded-md border border-horizon text-sm text-horizon-accent text-right">
             <strong>{recommendation?.title}</strong>
             <p className="mt-1 line-clamp-2">{recommendation?.description}</p>
          </div>
        </div>

        <div className="space-y-2">
           <label htmlFor="upgrade-prompt" className="text-right block font-medium text-horizon-text">
             הנחיות לשדרוג:
           </label>
           <Textarea
             id="upgrade-prompt"
             placeholder="כתוב כאן את השינויים הרצויים..."
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
             className="min-h-[120px] bg-horizon-card border-horizon text-horizon-text text-right"
             disabled={isUpgrading}
           />
        </div>

        {error && <p className="text-red-400 text-sm text-right mt-2">{error}</p>}

        <DialogFooter className="mt-4 sm:justify-start">
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading || !prompt.trim()}
            className="btn-horizon-primary"
          >
            {isUpgrading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                משדרג...
              </>
            ) : (
              <>
                <Wand2 className="ml-2 h-4 w-4" />
                שדרג ועדכן
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isUpgrading} className="border-horizon-accent text-horizon-accent">
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}