import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Star,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

import { toast } from "sonner";
import { sendWhatsAppMessage } from '@/api/functions';

export default function RecommendationCard({ 
  recommendation, 
  isAdmin = false, 
  onViewDetails, 
  onSaveRecommendation, 
  onMarkExecuted,
  showRating = false,
  customerPhone = null // נוסף לצורך שליחת וואטסאפ
}) {
  const [isWhatsAppSending, setIsWhatsAppSending] = useState(false);

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    low: "bg-blue-100 text-blue-800 border-blue-200"
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    saved: "bg-blue-100 text-blue-800",
    executed: "bg-green-100 text-green-800",
    dismissed: "bg-red-100 text-red-800",
    published_by_admin: "bg-purple-100 text-purple-800"
  };

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

  const handleWhatsAppSend = async () => {
    if (!customerPhone) {
      toast.warning('מספר טלפון לא זמין עבור לקוח זה');
      return;
    }

    setIsWhatsAppSending(true);
    try {
      const response = await sendWhatsAppMessage({
        phoneNumber: customerPhone,
        customerEmail: recommendation.customer_email,
        recommendation: recommendation,
        templateType: 'auto' // בחירה אוטומטית של תבנית בהתאם לתוכן
      });

      if (response.data.success) {
        toast.success(`הודעת וואטסאפ נשלחה בהצלחה!
תבנית שנבחרה: ${response.data.templateUsed}
מזהה הודעה: ${response.data.messageId}`);
      } else {
        throw new Error(response.data.error || 'שגיאה לא ידועה');
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast.error(`שגיאה בשליחת הודעת וואטסאפ: ${error.message}`);
    } finally {
      setIsWhatsAppSending(false);
    }
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return Math.round(value).toLocaleString();
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 mb-2 leading-tight">
              {recommendation.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className={priorityColors[recommendation.priority]}>
                {recommendation.priority === 'high' ? 'עדיפות גבוהה' : 
                 recommendation.priority === 'medium' ? 'עדיפות בינונית' : 'עדיפות נמוכה'}
              </Badge>
              <Badge variant="outline" className={statusColors[recommendation.status]}>
                {recommendation.status === 'executed' ? 'בוצע' :
                 recommendation.status === 'saved' ? 'נשמר' :
                 recommendation.status === 'published_by_admin' ? 'פורסם' : 'ממתין'}
              </Badge>
              {recommendation.category && (
                <Badge variant="outline" className="border-purple-200 text-purple-700">
                  {categoryTranslations[recommendation.category] || recommendation.category}
                </Badge>
              )}
            </div>
          </div>
          {recommendation.status === 'executed' && (
            <CheckCircle2 className="w-6 h-6 text-green-600 ml-2" />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {recommendation.description}
        </p>

        {recommendation.expected_profit && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div>
              <span className="text-sm text-green-700 font-medium">רווח צפוי</span>
              <div className="text-lg font-bold text-green-800">
                ₪{formatNumber(recommendation.expected_profit)}
              </div>
            </div>
          </div>
        )}

        {recommendation.affected_product_names && recommendation.affected_product_names.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">מוצרים מושפעים:</p>
            <div className="flex flex-wrap gap-1">
              {recommendation.affected_product_names.slice(0, 3).map((product, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {product}
                </Badge>
              ))}
              {recommendation.affected_product_names.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recommendation.affected_product_names.length - 3} נוספים
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Clock className="w-4 h-4" />
          <span>נוצר ב-{format(new Date(recommendation.created_date), 'dd/MM/yyyy', { locale: he })}</span>
          {recommendation.timeframe && (
            <>
              <span>•</span>
              <span>זמן יישום: {recommendation.timeframe}</span>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails(recommendation)}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              פרטים
            </Button>
          )}

          {!isAdmin && customerPhone && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleWhatsAppSend}
              disabled={isWhatsAppSending}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              {isWhatsAppSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              {isWhatsAppSending ? 'שולח...' : 'שלח לוואטסאפ'}
            </Button>
          )}
          
          {isAdmin && customerPhone && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleWhatsAppSend}
              disabled={isWhatsAppSending}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              {isWhatsAppSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              {isWhatsAppSending ? 'שולח...' : 'שלח לוואטסאפ'}
            </Button>
          )}

          {recommendation.status !== 'executed' && onMarkExecuted && (
            <Button 
              size="sm" 
              onClick={() => onMarkExecuted(recommendation)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              סמן כבוצע
            </Button>
          )}
        </div>

        {showRating && onSaveRecommendation && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">דרג את ההמלצה:</p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSaveRecommendation(recommendation.id, 1)}
                className="flex-1 text-xs hover:bg-green-50"
              >
                <Star className="w-3 h-3 mr-1" />
                מועיל
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSaveRecommendation(recommendation.id, 2)}
                className="flex-1 text-xs hover:bg-yellow-50"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                צריך הבהרה
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSaveRecommendation(recommendation.id, 3)}
                className="flex-1 text-xs hover:bg-red-50"
              >
                לא רלוונטי
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}