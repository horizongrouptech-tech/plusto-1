import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function InventoryRecommendationsWidget({ products = [], zReports = [] }) {
  const recommendations = useMemo(() => {
    const recs = {
      overstocked: [],
      understocked: [],
      deadStock: [],
      missing: []
    };

    products.forEach(product => {
      const inventory = product.inventory || 0;
      const monthlySales = product.monthly_sales || 0;

      // מלאי גבוה (מעל 6 חודשים)
      if (inventory > 0 && monthlySales > 0 && (inventory / monthlySales) > 6) {
        recs.overstocked.push({
          ...product,
          monthsOfInventory: Math.round(inventory / monthlySales)
        });
      }

      // מלאי נמוך (פחות משבועיים)
      if (monthlySales > 0 && inventory > 0 && inventory < (monthlySales / 2)) {
        recs.understocked.push({
          ...product,
          daysOfInventory: Math.round((inventory / monthlySales) * 30)
        });
      }

      // מלאי מת (אין מכירות אבל יש מלאי)
      if (inventory > 5 && monthlySales === 0) {
        recs.deadStock.push(product);
      }
    });

    // מוצרים במכירות שלא בקטלוג
    const catalogNames = new Set(products.map(p => p.product_name?.toLowerCase()));
    const salesProducts = new Set();
    
    zReports.forEach(z => {
      (z.detailed_products || []).forEach(p => {
        const name = p.product_name?.toLowerCase();
        if (name && !catalogNames.has(name)) {
          salesProducts.add(p.product_name);
        }
      });
    });

    recs.missing = Array.from(salesProducts);

    return recs;
  }, [products, zReports]);

  const totalAlerts = recommendations.overstocked.length + 
                      recommendations.understocked.length + 
                      recommendations.deadStock.length + 
                      recommendations.missing.length;

  if (totalAlerts === 0) {
    return null;
  }

  return (
    <Card className="card-horizon border-r-4 border-r-yellow-500">
      <CardHeader>
        <CardTitle className="text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          התראות מלאי והמלצות ({totalAlerts})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* עודף מלאי */}
        {recommendations.overstocked.length > 0 && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-400">עודף מלאי ({recommendations.overstocked.length})</span>
            </div>
            <div className="space-y-1">
              {recommendations.overstocked.slice(0, 3).map((p, idx) => (
                <div key={idx} className="text-xs text-horizon-accent">
                  • {p.product_name}: {p.inventory} יח' ({p.monthsOfInventory} חודשים)
                </div>
              ))}
              {recommendations.overstocked.length > 3 && (
                <div className="text-xs text-horizon-accent">ועוד {recommendations.overstocked.length - 3}...</div>
              )}
            </div>
            <Badge className="mt-2 bg-orange-500 text-white text-xs">
              מומלץ: מבצע פינוי מלאי
            </Badge>
          </div>
        )}

        {/* חוסר במלאי */}
        {recommendations.understocked.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">חוסר במלאי ({recommendations.understocked.length})</span>
            </div>
            <div className="space-y-1">
              {recommendations.understocked.slice(0, 3).map((p, idx) => (
                <div key={idx} className="text-xs text-horizon-accent">
                  • {p.product_name}: רק {p.inventory} יח' ({p.daysOfInventory} ימים)
                </div>
              ))}
              {recommendations.understocked.length > 3 && (
                <div className="text-xs text-horizon-accent">ועוד {recommendations.understocked.length - 3}...</div>
              )}
            </div>
            <Badge className="mt-2 bg-red-500 text-white text-xs">
              דחוף: הזמן מהספק
            </Badge>
          </div>
        )}

        {/* מוצרים מתים */}
        {recommendations.deadStock.length > 0 && (
          <div className="p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-400">מלאי מת ({recommendations.deadStock.length})</span>
            </div>
            <div className="space-y-1">
              {recommendations.deadStock.slice(0, 3).map((p, idx) => (
                <div key={idx} className="text-xs text-horizon-accent">
                  • {p.product_name}: {p.inventory} יח' - אין מכירות
                </div>
              ))}
              {recommendations.deadStock.length > 3 && (
                <div className="text-xs text-horizon-accent">ועוד {recommendations.deadStock.length - 3}...</div>
              )}
            </div>
            <Badge className="mt-2 bg-gray-500 text-white text-xs">
              שקול: חיסול או החזרה
            </Badge>
          </div>
        )}

        {/* מוצרים חסרים */}
        {recommendations.missing.length > 0 && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">חסרים בקטלוג ({recommendations.missing.length})</span>
            </div>
            <div className="space-y-1">
              {recommendations.missing.slice(0, 3).map((name, idx) => (
                <div key={idx} className="text-xs text-horizon-accent">
                  • {name}
                </div>
              ))}
              {recommendations.missing.length > 3 && (
                <div className="text-xs text-horizon-accent">ועוד {recommendations.missing.length - 3}...</div>
              )}
            </div>
            <Badge className="mt-2 bg-blue-500 text-white text-xs">
              הוסף לקטלוג
            </Badge>
          </div>
        )}

        {/* כפתור לדף המלצות */}
        <Link to={createPageUrl('Recommendations')}>
          <Button className="w-full btn-horizon-primary mt-2" size="sm">
            צפה בכל ההמלצות
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}