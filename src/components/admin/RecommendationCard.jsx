import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Archive, Edit3, Eye, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
// Assuming User and Recommendation entities are still needed for broader context if not explicitly removed,
// though their direct use in this component's new logic (handleSendWhatsApp) is gone.
// For now, keeping them as they were in the original file, just in case they are used elsewhere
// or are considered part of the overall file's required imports.
// However, the outline clearly removes the WhatsApp functionality, so these specific entity imports
// related to that functionality can be removed if strictly adhering to the outline's implied changes.
// The outline doesn't explicitly remove these. Given the drastic change in component purpose,
// it's safer to remove imports that are no longer directly used by the component's functionality
// as outlined, to keep the file clean.
// User and Recommendation entities are not used in the new component's logic.
// sendWhatsAppMessage is also not used. Removing them.

// Placeholder for AdminRatingWidget. In a real application, this would likely be a separate
// component imported from another file (e.g., import AdminRatingWidget from './AdminRatingWidget';).
// Since the outline doesn't provide its definition or an import path, it's defined here
// to ensure the component is functional and compiles.
const AdminRatingWidget = ({ recommendation, onRatingUpdate, isUpdating }) => {
  return (
    <div className="admin-rating-widget p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        דירוג מנהל: <span className="font-semibold">{recommendation.admin_rating || 'לא נקבע'}</span>
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onRatingUpdate(recommendation.id, Math.floor(Math.random() * 5) + 1)} // Example: update with a random rating
        disabled={isUpdating}
        className="mt-2 text-xs border-blue-500 text-blue-400 hover:bg-blue-500/10"
      >
        {isUpdating ? 'מעדכן...' : 'עדכן דירוג (דמה)'}
      </Button>
    </div>
  );
};


// Helper functions (implied by the outline but not present in the original code,
// so they need to be added for the new JSX structure to work)
const getPriorityColor = (priority) => {
    switch (priority) {
        case 'high': return 'bg-red-500';
        case 'medium': return 'bg-yellow-500';
        case 'low': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
};

const getCategoryIcon = (category) => {
    switch (category) {
        case 'pricing': return '💰';
        case 'bundles': return '🎁';
        case 'promotions': return '✨';
        case 'suppliers': return '🤝';
        case 'strategic_moves': return '🚀';
        default: return '🏷️';
    }
};

const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '₪0';
    return `₪${amount.toLocaleString()}`;
};


export default function RecommendationCard({ 
  recommendation, 
  onUpgrade, 
  onView, 
  onArchive,
  onRatingUpdate,
  isUpdating = false,
  customer
}) {
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const handleSendWhatsApp = async () => {
    if (!customer?.phone && !customer?.email) {
      toast.error('לא נמצא מספר טלפון או אימייל ללקוח');
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const message = `*${recommendation.title}*\n\n${recommendation.description}\n\n💰 רווח צפוי: ₪${recommendation.expected_profit?.toLocaleString() || 0}`;
      
      await base44.functions.invoke('sendWhatsAppMessage', {
        to: customer.phone || customer.email,
        message: message,
        customerEmail: customer.email
      });
      
      toast.success('ההמלצה נשלחה בהצלחה לוואטסאפ');
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('שגיאה בשליחת ההמלצה');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <Card className="card-horizon hover:shadow-lg transition-all duration-300 min-h-[280px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg text-horizon-text text-right mb-2">
              {recommendation.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2 justify-end">
              <Badge className={getPriorityColor(recommendation.priority)}>
                {recommendation.priority === 'high' ? 'גבוהה' : 
                 recommendation.priority === 'medium' ? 'בינונית' : 'נמוכה'}
              </Badge>
              <Badge variant="outline" className="border-horizon-secondary text-horizon-accent">
                {getCategoryIcon(recommendation.category)}
                {' '} {/* Add a space for readability between icon and text */}
                {recommendation.category === 'pricing' ? 'תמחור' :
                 recommendation.category === 'bundles' ? 'חבילות' :
                 recommendation.category === 'promotions' ? 'מבצעים' :
                 recommendation.category === 'suppliers' ? 'ספקים' :
                 recommendation.category === 'strategic_moves' ? 'מהלכים אסטרטגיים' :
                 recommendation.category}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        <p className="text-sm text-horizon-accent text-right line-clamp-3">
          {recommendation.description}
        </p>

        {recommendation.expected_profit && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(recommendation.expected_profit)}
              </div>
              <p className="text-xs text-green-300">רווח צפוי</p>
            </div>
          </div>
        )}

        {/* Admin Rating Widget */}
        <AdminRatingWidget 
          recommendation={recommendation}
          onRatingUpdate={onRatingUpdate}
          isUpdating={isUpdating}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-3 border-t border-horizon mt-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(recommendation)}
            className="border-horizon text-horizon-text hover:bg-horizon-card"
          >
            <Eye className="w-4 h-4 ml-1" />
            צפה
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendWhatsApp}
            disabled={isSendingWhatsApp}
            className="border-green-500 text-green-400 hover:bg-green-500/10"
          >
            {isSendingWhatsApp ? (
              <Loader2 className="w-4 h-4 ml-1 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4 ml-1" />
            )}
            וואטסאפ
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpgrade(recommendation)}
            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
          >
            <Edit3 className="w-4 h-4 ml-1" />
            שדרג
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onArchive(recommendation)}
            className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
          >
            <Archive className="w-4 h-4 ml-1" />
            ארכיון
          </Button>
        </div>

        {/* לחץ לצפייה מלאה */}
        <div 
          className="text-center pt-2 cursor-pointer"
          onClick={() => onView(recommendation)}
        >
          <span className="text-xs text-horizon-accent hover:text-horizon-primary transition-colors">
            לחץ לצפייה מלאה →
          </span>
        </div>
      </CardContent>
    </Card>
  );
}