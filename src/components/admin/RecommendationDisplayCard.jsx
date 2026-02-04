import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  DollarSign,
  Lightbulb,
  Archive,
  Edit,
  Trash2,
  MoreVertical,
  MessageCircle,
  Wand2,
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RecommendationDisplayCard({ 
  recommendation, 
  onView,
  onEdit,
  onUpgrade,
  onDelete,
  onArchive,
  onSendToCustomer,
  isAdmin = false 
}) {
  const [isUpdating, setIsUpdating] = useState(false);

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

  const getSourceBadge = (source) => {
    const sourceConfig = {
      admin_generated: { text: 'נוצרה ידנית', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
      whatsapp_request: { text: 'בקשה מוואטסאפ', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      automatic_engine: { text: 'נוצרה אוטומטית', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
    };
    const config = sourceConfig[source] || { text: source, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    return <Badge variant="outline" className={config.color}>{config.text}</Badge>;
  };

  const handleAction = async (action) => {
    setIsUpdating(true);
    try {
      await action();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card 
      className="card-horizon hover:shadow-xl transition-all duration-300 border-r-4 cursor-pointer flex flex-col min-h-[280px]" 
      style={{ borderRightColor: recommendation.priority === 'high' ? '#ef4444' : '#3b82f6' }}
      onClick={() => onView && onView(recommendation)}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg text-horizon-text text-right mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-horizon-primary" />
              {recommendation.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {getCategoryBadge(recommendation.category)}
              {getPriorityBadge(recommendation.priority)}
              {recommendation.source && getSourceBadge(recommendation.source)}
            </div>
          </div>
          
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-horizon-dark border-horizon">
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); handleAction(() => onEdit(recommendation)); }} 
                  className="text-horizon-text cursor-pointer"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך המלצה
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); handleAction(() => onUpgrade(recommendation)); }} 
                  className="text-horizon-text cursor-pointer"
                >
                  <Wand2 className="w-4 h-4 ml-2" />
                  שדרג המלצה
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); handleAction(() => onSendToCustomer(recommendation)); }} 
                  className="text-horizon-text cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 ml-2" />
                  שלח לוואטסאפ
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-horizon" />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); handleAction(() => onArchive(recommendation.id)); }} 
                  className="text-yellow-400 cursor-pointer"
                >
                  <Archive className="w-4 h-4 ml-2" />
                  העבר לארכיון
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); handleAction(() => onDelete(recommendation.id)); }}
                  className="text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק המלצה
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col">
        <div className="flex-1">
          <p className="text-horizon-accent text-sm text-right line-clamp-3 mb-3">
            {recommendation.description}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {recommendation.expected_profit > 0 && (
              <div className="bg-green-500/10 p-3 rounded-lg text-center border border-green-500/20">
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-green-400" />
                <div className="text-sm text-green-400">רווח צפוי</div>
                <div className="text-lg font-bold text-green-300">
                  ₪{recommendation.expected_profit.toLocaleString()}
                </div>
              </div>
            )}
            
            {recommendation.profit_percentage > 0 && (
              <div className="bg-blue-500/10 p-3 rounded-lg text-center border border-blue-500/20">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                <div className="text-sm text-blue-400">שיפור צפוי</div>
                <div className="text-lg font-bold text-blue-300">
                  {recommendation.profit_percentage}%
                </div>
              </div>
            )}
          </div>

          {/* מקור ההמלצה */}
          {recommendation.trigger_condition && (
            <div className="mt-2 text-xs text-horizon-accent text-right bg-horizon-card/50 p-2 rounded">
              💡 <span className="font-medium">מקור ההמלצה:</span>{' '}
              {recommendation.trigger_condition === 'margin_too_low' ? 'ניתוח מרווחי רווח בקטלוג' :
               recommendation.trigger_condition === 'sales_decline' ? 'ניתוח מגמות מכירות מדוחות Z' :
               recommendation.trigger_condition === 'inventory_high' ? 'ניתוח רמות מלאי' :
               recommendation.trigger_condition === 'supplier_price_change' ? 'השוואת מחירי ספקים' :
               recommendation.trigger_condition}
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-horizon">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onView && onView(recommendation); }}
            className="w-full text-horizon-primary hover:text-horizon-primary/80 border-horizon-primary hover:bg-horizon-primary/10"
          >
            <Eye className="w-4 h-4 ml-2" />
            לחץ לצפייה מלאה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}