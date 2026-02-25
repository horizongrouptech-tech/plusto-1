import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ThumbsUp, 
  HelpCircle, 
  ThumbsDown, 
  MessageSquare, 
  CheckCircle2,
  Clock
} from "lucide-react";


import { toast } from "sonner";
import { RecommendationFeedback, User } from '@/api/entities';

export default function RecommendationFeedbackWidget({ recommendation, onFeedbackSubmitted }) {
  const [selectedRating, setSelectedRating] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const ratingOptions = [
    {
      value: 1,
      label: "בוצע / מעניין אותי",
      icon: ThumbsUp,
      color: "bg-green-500 hover:bg-green-600",
      description: "ההמלצה רלוונטית ויושמה או תיושם"
    },
    {
      value: 2,
      label: "צריך הבהרה / שיפור",
      icon: HelpCircle,
      color: "bg-yellow-500 hover:bg-yellow-600",
      description: "ההמלצה מעניינת אבל צריכה הסבר נוסף"
    },
    {
      value: 3,
      label: "לא רלוונטי עבורי",
      icon: ThumbsDown,
      color: "bg-red-500 hover:bg-red-600",
      description: "ההמלצה לא מתאימה לעסק שלי"
    }
  ];

  const handleSubmitFeedback = async () => {
    if (!selectedRating) return;

    setIsSubmitting(true);
    try {
      const user = await User.me();
      
      const feedbackData = {
        recommendation_id: recommendation.id,
        customer_email: user.email,
        rating: selectedRating,
        feedback_text: feedbackText.trim() || null,
        implementation_status: selectedRating === 1 ? 'implemented' : 
                             selectedRating === 2 ? 'needs_clarification' : 'not_implemented'
      };

      await RecommendationFeedback.create(feedbackData);
      setHasSubmitted(true);
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(feedbackData);
      }

    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("שגיאה בשליחת הפידבק. אנא נסה שוב.");
    }
    setIsSubmitting(false);
  };

  if (hasSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-medium">תודה על הפידבק!</p>
          <p className="text-green-600 text-sm">המידע שלך עוזר לנו לשפר את המערכת</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-horizon bg-horizon-card/30">
      <CardContent className="p-4" dir="rtl">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-horizon-primary" />
            <h4 className="font-semibold text-horizon-text">איך ההמלצה הזו עבורך?</h4>
          </div>

          {/* כפתורי דירוג */}
          <div className="space-y-2">
            {ratingOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedRating === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedRating(option.value)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-right ${
                    isSelected 
                      ? `${option.color} text-white border-transparent shadow-lg` 
                      : 'border-horizon hover:border-horizon-primary bg-horizon-card/50 text-horizon-text'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-horizon-primary'}`} />
                    <div className="text-right flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className={`text-sm ${isSelected ? 'text-white/80' : 'text-horizon-accent'}`}>
                        {option.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* תיבת הערות */}
          {selectedRating && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-horizon-text">
                הערות נוספות (אופציונלי)
              </label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  selectedRating === 2 
                    ? "איזה הבהרה תעזור לך? מה חסר בהמלצה?"
                    : selectedRating === 3
                    ? "מה הופך את ההמלצה ללא רלוונטית עבורך?"
                    : "איך ההמלצה עזרה לך? איזה תוצאות ראית?"
                }
                className="bg-horizon-card border-horizon text-horizon-text"
                rows={3}
              />
            </div>
          )}

          {/* כפתור שליחה */}
          {selectedRating && (
            <Button
              onClick={handleSubmitFeedback}
              disabled={isSubmitting}
              className="w-full btn-horizon-primary"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  שולח פידבק...
                </>
              ) : (
                'שלח פידבק'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}