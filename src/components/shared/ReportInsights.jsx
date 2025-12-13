import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  DollarSign,
  Package
} from 'lucide-react';

export default function ReportInsights({ reportType, data }) {
  const { headers = [], rows = [] } = data || {};

  const getInsights = () => {
    switch (reportType) {
      case 'inventory_report':
        return getInventoryInsights();
      case 'sales_report':
        return getSalesInsights();
      case 'promotions_report':
        return getPromotionsInsights();
      default:
        return getGenericInsights();
    }
  };

  const getInventoryInsights = () => {
    if (rows.length === 0) return [];

    const totalValue = rows.reduce((sum, row) => sum + (row.inventory * (row.cost_price || 0)), 0);
    const lowStockItems = rows.filter(row => (row.inventory || 0) < 10).length;
    const categories = [...new Set(rows.map(row => row.category).filter(Boolean))];
    
    return [
      {
        type: 'info',
        icon: Package,
        title: 'ניתוח מלאי',
        description: `סה"כ ${rows.length} מוצרים במלאי בערך של ₪${totalValue.toLocaleString()}`,
        color: 'text-blue-400'
      },
      {
        type: lowStockItems > 0 ? 'warning' : 'success',
        icon: AlertTriangle,
        title: 'מלאי נמוך',
        description: `${lowStockItems} מוצרים עם מלאי נמוך (פחות מ-10 יחידות)`,
        color: lowStockItems > 0 ? 'text-orange-400' : 'text-green-400'
      },
      {
        type: 'tip',
        icon: Lightbulb,
        title: 'המלצה',
        description: `המלאי מחולק ל-${categories.length} קטגוריות. שקול לבדוק מוצרים עם מלאי נמוך`,
        color: 'text-yellow-400'
      }
    ];
  };

  const getSalesInsights = () => {
    if (rows.length === 0) return [];

    const totalRevenue = rows.reduce((sum, row) => sum + (row.revenue || 0), 0);
    const totalQuantity = rows.reduce((sum, row) => sum + (row.quantity_sold || 0), 0);
    
    return [
      {
        type: 'success',
        icon: TrendingUp,
        title: 'ביצועי מכירות',
        description: `סה"כ מכירות: ₪${totalRevenue.toLocaleString()} (${totalQuantity.toLocaleString()} יחידות)`,
        color: 'text-green-400'
      },
      {
        type: 'tip',
        icon: Target,
        title: 'הזדמנות',
        description: 'שקול לקדם מוצרים עם ביצועים נמוכים או להוסיף מבצעים',
        color: 'text-yellow-400'
      }
    ];
  };

  const getPromotionsInsights = () => {
    if (rows.length === 0) return [];

    const activePromotions = rows.filter(row => row.status === 'active').length;
    const totalDiscount = rows.reduce((sum, row) => sum + (row.discount_amount || 0), 0);
    
    return [
      {
        type: 'info',
        icon: TrendingUp,
        title: 'מבצעים פעילים',
        description: `${activePromotions} מבצעים פעילים מתוך ${rows.length} סה"כ`,
        color: 'text-blue-400'
      },
      {
        type: 'success',
        icon: DollarSign,
        title: 'הנחה כוללת',
        description: `סה"כ הנחה שניתנה: ₪${totalDiscount.toLocaleString()}`,
        color: 'text-green-400'
      }
    ];
  };

  const getGenericInsights = () => {
    return [
      {
        type: 'info',
        icon: Package,
        title: 'נתונים זמינים',
        description: `${rows.length} שורות נתונים זמינות לניתוח`,
        color: 'text-blue-400'
      },
      {
        type: 'tip',
        icon: Lightbulb,
        title: 'טיפ',
        description: 'השתמש בסינון כדי למצוא מידע ספציפי',
        color: 'text-yellow-400'
      }
    ];
  };

  const insights = getInsights();

  if (insights.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-lg font-semibold text-horizon-text flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        תובנות מקצועיות
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <Card key={index} className="card-horizon border-l-4 border-l-horizon-primary">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <IconComponent className={`w-5 h-5 mt-0.5 ${insight.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-horizon-text">{insight.title}</h4>
                      <Badge 
                        variant={insight.type === 'warning' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {insight.type === 'warning' ? 'אזהרה' : 
                         insight.type === 'success' ? 'הצלחה' : 
                         insight.type === 'tip' ? 'טיפ' : 'מידע'}
                      </Badge>
                    </div>
                    <p className="text-sm text-horizon-accent">{insight.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}