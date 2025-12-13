import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  DollarSign, 
  TrendingUp, 
  Target,
  Calendar,
  ListChecks,
  Edit,
  Send
} from "lucide-react";

export default function RecommendationViewModal({ 
  isOpen, 
  onClose, 
  recommendation,
  onEdit,
  onSendWhatsApp
}) {
  if (!recommendation) return null;

  const getCategoryBadge = (category) => {
    const categoryConfig = {
      pricing: { text: 'תמחור', color: 'bg-blue-500' },
      bundles: { text: 'בנדלים', color: 'bg-purple-500' },
      promotions: { text: 'מבצעים', color: 'bg-pink-500' },
      suppliers: { text: 'ספקים', color: 'bg-green-500' },
      inventory: { text: 'מלאי', color: 'bg-orange-500' },
      strategic_moves: { text: 'מהלכים אסטרטגיים', color: 'bg-red-500' }
    };
    const config = categoryConfig[category] || { text: category, color: 'bg-gray-500' };
    return <Badge className={`${config.color} text-white border-0`}>{config.text}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      high: { text: 'דחיפות גבוהה', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
      medium: { text: 'דחיפות בינונית', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      low: { text: 'דחיפות נמוכה', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Badge variant="outline" className={config.color}>{config.text}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-primary flex items-center gap-2">
            <Lightbulb className="w-6 h-6" />
            {recommendation.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* תגיות */}
          <div className="flex flex-wrap gap-2">
            {getCategoryBadge(recommendation.category)}
            {getPriorityBadge(recommendation.priority)}
            {recommendation.source && (
              <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                {recommendation.source === 'admin_generated' ? 'נוצרה ידנית' : 
                 recommendation.source === 'whatsapp_request' ? 'בקשה מוואטסאפ' : 
                 'נוצרה אוטומטית'}
              </Badge>
            )}
          </div>

          {/* תיאור מלא */}
          <div className="bg-horizon-card/50 p-4 rounded-lg border border-horizon">
            <h4 className="font-semibold text-horizon-text mb-2">תיאור ההמלצה:</h4>
            <p className="text-horizon-accent text-right leading-relaxed whitespace-pre-wrap">
              {recommendation.description}
            </p>
          </div>

          {/* נתונים פיננסיים */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendation.expected_profit > 0 && (
              <Card className="bg-green-500/10 border-green-500/20">
                <div className="p-4 text-center">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-400" />
                  <div className="text-sm text-green-400">רווח צפוי</div>
                  <div className="text-2xl font-bold text-green-300">
                    ₪{recommendation.expected_profit.toLocaleString()}
                  </div>
                </div>
              </Card>
            )}
            
            {recommendation.profit_percentage > 0 && (
              <Card className="bg-blue-500/10 border-blue-500/20">
                <div className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                  <div className="text-sm text-blue-400">שיפור צפוי</div>
                  <div className="text-2xl font-bold text-blue-300">
                    {recommendation.profit_percentage}%
                  </div>
                </div>
              </Card>
            )}

            {recommendation.implementation_effort && (
              <Card className="bg-purple-500/10 border-purple-500/20">
                <div className="p-4 text-center">
                  <Target className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                  <div className="text-sm text-purple-400">מאמץ יישום</div>
                  <div className="text-xl font-bold text-purple-300">
                    {recommendation.implementation_effort === 'high' ? 'גבוה' : 
                     recommendation.implementation_effort === 'medium' ? 'בינוני' : 'נמוך'}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* טווח זמן */}
          {recommendation.timeframe && (
            <div className="bg-horizon-card/30 p-4 rounded-lg border border-horizon">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-horizon-primary" />
                <h4 className="font-semibold text-horizon-text">טווח זמן ליישום:</h4>
              </div>
              <p className="text-horizon-accent text-right">{recommendation.timeframe}</p>
            </div>
          )}

          {/* שלבי פעולה */}
          {recommendation.action_steps && recommendation.action_steps.length > 0 && (
            <div className="bg-horizon-card/30 p-4 rounded-lg border border-horizon">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-5 h-5 text-horizon-primary" />
                <h4 className="font-semibold text-horizon-text">שלבי פעולה:</h4>
              </div>
              <ol className="space-y-2">
                {recommendation.action_steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-right">
                    <span className="bg-horizon-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-horizon-accent flex-1">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* מוצרים מושפעים */}
          {recommendation.affected_product_names && recommendation.affected_product_names.length > 0 && (
            <div className="bg-horizon-card/30 p-4 rounded-lg border border-horizon">
              <h4 className="font-semibold text-horizon-text mb-2">מוצרים מושפעים:</h4>
              <div className="flex flex-wrap gap-2">
                {recommendation.affected_product_names.map((productName, idx) => (
                  <Badge key={idx} variant="outline" className="border-horizon-primary text-horizon-primary">
                    {productName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* הערות מנהל */}
          {recommendation.admin_notes && (
            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
              <h4 className="font-semibold text-yellow-400 mb-2">הערות מנהל:</h4>
              <p className="text-horizon-accent text-right">{recommendation.admin_notes}</p>
            </div>
          )}
        </div>

        {/* ⭐ כפתורי פעולה - חדש! */}
        <DialogFooter className="border-t border-horizon pt-4">
          <div className="flex gap-3 w-full justify-end">
            {onEdit && (
              <Button
                onClick={() => {
                  onEdit(recommendation);
                  onClose();
                }}
                variant="outline"
                className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
              >
                <Edit className="w-4 h-4 ml-2" />
                ערוך המלצה
              </Button>
            )}
            
            {onSendWhatsApp && (
              <Button
                onClick={() => {
                  onSendWhatsApp(recommendation);
                  onClose();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="w-4 h-4 ml-2" />
                שדר לווטסאפ
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}