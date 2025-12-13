import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, Package, TrendingUp, FileText, 
  Globe, MessageSquare, Lightbulb, Target 
} from "lucide-react";

export default function QuickActions({ onNavigate, className = "" }) {
  const quickActions = [
    {
      icon: Upload,
      title: "העלה קבצים",
      description: "העלה קבצי מלאי ומכירות",
      page: "FileUpload",
      variant: "primary"
    },
    {
      icon: Package,
      title: "הוסף מוצר",
      description: "הוסף מוצר חדש למערכת",
      page: "AddProduct",
      variant: "secondary"
    },
    {
      icon: Lightbulb,
      title: "המלצות",
      description: "צפה בהמלצות חדשות",
      page: "Recommendations",
      variant: "outline"
    },
    {
      icon: Target,
      title: "מהלכים אסטרטגיים",
      description: "בצע מהלכים לטווח ארוך",
      page: "ActionBank",
      variant: "outline"
    },
    {
      icon: TrendingUp,
      title: "ניתוח ספקים",
      description: "השווה מחירי ספקים",
      page: "SupplierAnalysis",
      variant: "outline"
    },
    {
      icon: Globe,
      title: "סריקת אתר",
      description: "סרוק את האתר שלך",
      page: "WebsiteScan",
      variant: "outline"
    },
    {
      icon: FileText,
      title: "תזרים פיננסי",
      description: "נתח תזרים ורווחיות",
      page: "FinancialFlow",
      variant: "outline"
    },
    {
      icon: MessageSquare,
      title: "פתח פנייה",
      description: "צור קשר עם התמיכה",
      page: "SupportTicket",
      variant: "outline"
    }
  ];

  const getButtonClass = (variant) => {
    switch (variant) {
      case 'primary':
        return 'btn-brand-primary';
      case 'secondary':
        return 'btn-brand-secondary';
      case 'outline':
        return 'btn-brand-outline';
      default:
        return 'btn-brand-primary';
    }
  };

  return (
    <Card className={`card-horizon ${className}`}>
      <CardHeader>
        <CardTitle className="text-horizon-text">פעולות מהירות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                onClick={() => onNavigate(action.page)}
                className={`h-auto p-4 flex flex-col items-center gap-3 ${getButtonClass(action.variant)}`}
              >
                <Icon className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-90 mt-1">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}