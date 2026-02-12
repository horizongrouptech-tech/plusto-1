import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Lightbulb
} from "lucide-react";
import { generateGeneralRecommendation } from "@/components/logic/generalRecommendationEngine";

import { toast } from "sonner";
export default function GeneralRecommendationModal({ customer, isOpen, onClose, onSuccess }) {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generationResult, setGenerationResult] = useState(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.warning('נא להזין תיאור להמלצה');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('מתחיל יצירת המלצה כללית...');
    setGenerationResult(null);

    try {
      const result = await generateGeneralRecommendation(
        customer,
        description,
        (progress, step) => {
          setProgress(progress);
          setCurrentStep(step);
        }
      );

      setGenerationResult(result);
      
      if (result.success) {
        setProgress(100);
        setCurrentStep('ההמלצה נוצרה בהצלחה!');
      } else {
        setCurrentStep(`שגיאה: ${result.error}`);
      }

    } catch (error) {
      console.error("Error generating general recommendation:", error);
      setGenerationResult({
        success: false,
        error: error.message
      });
      setCurrentStep(`שגיאה: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('');
    setGenerationResult(null);
    onClose();
  };

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-text mb-4 flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-horizon-primary" />
            יצירת המלצה כללית לפי תיאור - {customer?.business_name || customer?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {!generationResult && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-primary">תיאור ההמלצה המבוקשת</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-horizon-text mb-2">
                    תאר את ההמלצה שברצונך ליצור *
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="לדוגמה: אני רוצה להמליץ ללקוח לקנות דרך האתר במקום וולט, או: דרכים לשפר את המכירות באמצעות שיווק דיגיטלי, או: המלצות כללית לשיפור הרווחיות..."
                    className="bg-horizon-card border-horizon text-horizon-text h-32"
                  />
                  <p className="text-xs text-horizon-accent mt-2">
                    תאר בפירוט את ההמלצה שברצונך ליצור. המערכת תייצר המלצה מפורטת עם שלבי פעולה.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-primary flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מייצר המלצה כללית...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-horizon-accent">{currentStep}</span>
                  <span className="text-sm font-bold text-horizon-text">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full h-2 bg-horizon-card/50" />
              </CardContent>
            </Card>
          )}

          {generationResult && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-primary flex items-center gap-2">
                  {generationResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  {generationResult.success ? 'המלצה נוצרה בהצלחה!' : 'יצירת ההמלצה נכשלה'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generationResult.success ? (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-green-400" />
                        <span className="font-semibold text-horizon-text">המלצה כללית נוצרה</span>
                      </div>
                      <p className="text-sm text-horizon-accent">
                        ההמלצה נוצרה בהצלחה על בסיס התיאור שסופק
                      </p>
                    </div>

                    <div className="bg-horizon-card/30 p-4 rounded-lg">
                      <h4 className="font-semibold text-horizon-text mb-2">
                        {generationResult.recommendation?.title}
                      </h4>
                      <p className="text-horizon-accent text-sm">
                        {generationResult.recommendation?.description?.substring(0, 200)}...
                      </p>
                    </div>

                    <Badge className="bg-blue-500 text-white">
                      המלצה כללית
                    </Badge>
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400">{generationResult.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-horizon">
            {!generationResult ? (
              <>
                <Button onClick={handleClose} variant="outline" className="border-horizon text-horizon-text">
                  ביטול
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !description.trim()}
                  className="btn-horizon-primary"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מייצר המלצה...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 ml-2" />
                      צור המלצה לפי תיאור
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleClose} variant="outline" className="border-horizon text-horizon-text">
                  סגור
                </Button>
                {generationResult.success && (
                  <Button onClick={handleSuccess} className="btn-horizon-primary">
                    <CheckCircle className="w-4 h-4 ml-2" />
                    סיים
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}