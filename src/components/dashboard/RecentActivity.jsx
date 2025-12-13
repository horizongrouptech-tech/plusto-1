import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Package, 
  Lightbulb, 
  FileText, 
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from "lucide-react";

export default function RecentActivity({ 
  products = [], 
  recommendations = [], 
  businessMoves = [], 
  recentUploads = [], 
  uploads = [],
  isLoading,
  onViewRecommendation 
}) {
  const getRecentItems = () => {
    // וידוא שכל הפרמטרים הם מערכים תקינים
    const safeProducts = Array.isArray(products) ? products : [];
    const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
    const safeUploads = Array.isArray(recentUploads) || Array.isArray(uploads) ? 
      (recentUploads.length > 0 ? recentUploads : uploads || []) : [];

    const items = [
      ...safeProducts.slice(0, 3).map(p => ({
        type: 'product',
        title: p.name || 'מוצר ללא שם',
        subtitle: `רווח: ${p.margin_percentage ? p.margin_percentage.toFixed(1) : '0'}% | מחיר: ₪${p.selling_price?.toLocaleString() || '0'}`,
        time: p.created_date,
        icon: Package,
        color: 'blue'
      })),
      ...safeRecommendations.slice(0, 3).map(r => ({
        type: 'recommendation',
        title: r.title || 'המלצה ללא כותרת',
        subtitle: `פוטנציאל: ₪${r.expected_profit?.toLocaleString() || '0'} | ${r.category === 'pricing' ? 'תמחור' : r.category === 'inventory' ? 'מלאי' : r.category === 'marketing' ? 'שיווק' : r.category || 'כללי'}`,
        time: r.created_date,
        icon: Lightbulb,
        color: r.status === 'executed' ? 'green' : 'orange',
        status: r.status
      })),
      ...safeUploads.slice(0, 2).map(u => ({
        type: 'upload',
        title: u.filename || 'קובץ ללא שם',
        subtitle: `${u.products_count || 0} מוצרים נמצאו`,
        time: u.created_date,
        icon: FileText,
        color: u.status === 'analyzed' ? 'green' : u.status === 'failed' ? 'red' : 'blue',
        status: u.status
      }))
    ].filter(item => item.time) // סינון פריטים ללא תאריך
     .sort((a, b) => new Date(b.time) - new Date(a.time))
     .slice(0, 5);

    return items;
  };

  const getStatusIcon = (item) => {
    if (item.type === 'recommendation') {
      if (item.status === 'executed') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      if (item.status === 'pending') return <Clock className="w-4 h-4 text-amber-600" />;
    }
    if (item.type === 'upload') {
      if (item.status === 'analyzed') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      if (item.status === 'failed') return <AlertCircle className="w-4 h-4 text-red-600" />;
      if (item.status === 'processing') return <Clock className="w-4 h-4 text-blue-600" />;
    }
    return <TrendingUp className="w-4 h-4 text-gray-600" />;
  };

  const recentItems = getRecentItems();

  return (
    <Card className="card-horizon border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-horizon-text">
          <div className="p-2 rounded-lg bg-horizon-primary/10 border border-horizon-primary/20">
            <Clock className="w-5 h-5 text-horizon-primary" />
          </div>
          פעילות אחרונה
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-xl bg-horizon-card" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2 bg-horizon-card" />
                  <Skeleton className="h-3 w-1/2 bg-horizon-card" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-horizon-card" />
              </div>
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="text-center py-8 text-horizon-accent">
            <div className="p-3 rounded-xl bg-horizon-primary/10 border border-horizon-primary/20 w-fit mx-auto mb-3">
              <Package className="w-12 h-12 text-horizon-primary" />
            </div>
            <h3 className="text-lg font-medium mb-1 text-horizon-text">בואו נתחיל!</h3>
            <p className="text-sm">העלה קבצים או הוסף מוצרים כדי להתחיל לקבל תובנות</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-horizon-card transition-colors duration-200">
                <div className="p-2 rounded-xl bg-horizon-primary/10 border border-horizon-primary/20 shadow-sm">
                  <item.icon className="w-5 h-5 text-horizon-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-horizon-text">{item.title}</h4>
                    {getStatusIcon(item)}
                  </div>
                  <p className="text-sm text-horizon-accent">{item.subtitle}</p>
                </div>
                <div className="text-left">
                  <Badge variant="outline" className="text-xs border-gray-300 text-gray-600 bg-gray-50">
                    {item.time ? format(new Date(item.time), "dd/MM", { locale: he }) : 'N/A'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}