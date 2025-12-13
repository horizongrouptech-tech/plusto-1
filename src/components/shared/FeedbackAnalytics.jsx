import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, TrendingUp, HelpCircle, XCircle } from "lucide-react";

export default function FeedbackAnalytics({ feedbackData }) {
  if (!feedbackData || feedbackData.total_feedbacks === 0) {
    return (
      <div className="text-center py-8" dir="rtl">
        <p className="text-horizon-accent">אין נתוני פידבק זמינים.</p>
      </div>
    );
  }

  return (
    <Card className="card-horizon" dir="rtl">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2 text-right">
          <MessageSquare className="w-5 h-5 text-horizon-primary" />
          ניתוח פידבקים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-green-400"/>
                <p className="text-2xl font-bold text-green-400">{feedbackData.rating_distribution[1] || 0}</p>
              </div>
              <p className="text-sm text-green-300">בוצע/מעניין</p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <HelpCircle className="w-5 h-5 text-yellow-400"/>
                <p className="text-2xl font-bold text-yellow-400">{feedbackData.rating_distribution[2] || 0}</p>
              </div>
              <p className="text-sm text-yellow-300">צריך הבהרה</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-5 h-5 text-red-400"/>
                <p className="text-2xl font-bold text-red-400">{feedbackData.rating_distribution[3] || 0}</p>
              </div>
              <p className="text-sm text-red-300">לא רלוונטי</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-horizon">
            <span className="text-horizon-accent">דירוג ממוצע:</span>
            <span className="font-bold text-horizon-primary">{feedbackData.avg_rating}/3</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-horizon-accent">אחוז יישום:</span>
            <span className="font-bold text-green-400">{feedbackData.implementation_rate}%</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-horizon-accent">סה"כ פידבקים:</span>
            <span className="font-bold text-horizon-text">{feedbackData.total_feedbacks}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}