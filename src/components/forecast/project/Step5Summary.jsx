import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Save, CheckCircle, Package, Users, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../manual/utils/numberFormatter';

export default function Step5Summary({ projectData, onSave, onBack, isSaving }) {
  const laborCosts = projectData.labor_costs || {};
  
  // חישוב עלויות ומחירי מכירה של חומרים
  const totalMaterialsCost = (projectData.products || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalMaterialsRevenue = (projectData.products || []).reduce((sum, p) => sum + (p.total_revenue || p.total_cost || 0), 0);
  const totalMaterialsProfit = totalMaterialsRevenue - totalMaterialsCost;
  
  const totalLabor = parseFloat(laborCosts.total_labor_cost || 0);
  const totalCost = totalMaterialsCost + totalLabor;
  
  const marginPercent = parseFloat(projectData.desired_margin_percentage || 0);
  // נוסחת Margin על עלות העבודה בלבד (החומרים כבר מתומחרים)
  const laborWithMargin = marginPercent < 100 ? totalLabor / (1 - (marginPercent / 100)) : totalLabor;
  const laborProfit = laborWithMargin - totalLabor;
  
  // מחיר סופי = מחיר מכירת חומרים + עלות עבודה עם מרג'ין
  const finalPrice = totalMaterialsRevenue + laborWithMargin;
  const profitAmount = totalMaterialsProfit + laborProfit;

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-500" />
          סיכום תחזית הפרויקט
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* פרטי הפרויקט */}
        <div className="bg-horizon-card rounded-lg p-6 border border-horizon">
          <h3 className="font-semibold text-horizon-text mb-4">פרטי הפרויקט</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-horizon-accent">שם הפרויקט:</span>
              <span className="font-medium text-horizon-text">{projectData.project_name}</span>
            </div>
            {projectData.project_description && (
              <div>
                <span className="text-horizon-accent">תיאור:</span>
                <p className="text-horizon-text mt-1">{projectData.project_description}</p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-horizon-accent">שנת ביצוע:</span>
              <span className="font-medium text-horizon-text">{projectData.forecast_year}</span>
            </div>
          </div>
        </div>

        {/* מוצרים וחומרים */}
        <div className="bg-horizon-card rounded-lg p-6 border border-horizon">
          <h3 className="font-semibold text-horizon-text mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-horizon-primary" />
            מוצרים וחומרים
          </h3>
          <div className="space-y-2 mb-4">
            {(projectData.products || []).map((product, idx) => {
              const productProfit = (product.total_revenue || 0) - (product.total_cost || 0);
              return (
                <div key={idx} className="flex justify-between text-sm gap-4">
                  <span className="text-horizon-text flex-1">{product.product_name}</span>
                  <span className="text-horizon-accent">
                    {product.quantity} יח' × עלות {formatCurrency(product.unit_price)} = {formatCurrency(product.total_cost)}
                  </span>
                  <span className="text-horizon-accent">
                    מכירה: {formatCurrency(product.selling_price || product.unit_price)}
                  </span>
                  <span className={`font-medium ${productProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    רווח: {formatCurrency(productProfit)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="space-y-1 border-t border-horizon pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-horizon-accent">סה"כ עלות חומרים:</span>
              <span className="text-horizon-text">{formatCurrency(totalMaterialsCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-horizon-accent">סה"כ מחיר מכירת חומרים:</span>
              <span className="text-horizon-text">{formatCurrency(totalMaterialsRevenue)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className={totalMaterialsProfit >= 0 ? 'text-green-500' : 'text-red-500'}>רווח מחומרים:</span>
              <span className={totalMaterialsProfit >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(totalMaterialsProfit)}</span>
            </div>
          </div>
        </div>

        {/* עלויות עובדים */}
        <div className="bg-horizon-card rounded-lg p-6 border border-horizon">
          <h3 className="font-semibold text-horizon-text mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-horizon-primary" />
            עלויות עובדים
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-horizon-accent">מספר עובדים:</span>
              <span className="text-horizon-text">{laborCosts.num_workers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-horizon-accent">עלות יומית לעובד:</span>
              <span className="text-horizon-text">{formatCurrency(laborCosts.cost_per_worker_per_day || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-horizon-accent">משך הפרויקט:</span>
              <span className="text-horizon-text">{laborCosts.project_duration_days} ימים</span>
            </div>
          </div>
          <div className="flex justify-between font-semibold text-horizon-primary border-t border-horizon pt-2 mt-2">
            <span>סה"כ עובדים:</span>
            <span>{formatCurrency(totalLabor)}</span>
          </div>
        </div>

        {/* תמחור סופי */}
        <div className="bg-gradient-to-br from-horizon-primary/20 to-horizon-secondary/20 rounded-xl p-6 border-2 border-horizon-primary">
          <h3 className="font-semibold text-horizon-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-horizon-primary" />
            תמחור סופי
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-horizon-accent">סה"כ עלויות ישירות:</span>
              <span className="font-semibold text-horizon-text">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-horizon pb-2">
              <span className="text-horizon-accent">(עלות חומרים: {formatCurrency(totalMaterialsCost)} + עלות עובדים: {formatCurrency(totalLabor)})</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-horizon-accent">מחיר מכירת חומרים (לפי מחירים שהוזנו):</span>
              <span className="font-semibold text-horizon-text">{formatCurrency(totalMaterialsRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-horizon-accent">רווח מחומרים:</span>
              <span className={`font-semibold ${totalMaterialsProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(totalMaterialsProfit)}</span>
            </div>
            
            <div className="border-t border-horizon pt-2">
              <div className="flex justify-between">
                <span className="text-horizon-accent">אחוז מרג'ין על עבודה:</span>
                <span className="font-semibold text-horizon-text">{marginPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-horizon-accent">מחיר עבודה ללקוח:</span>
                <span className="font-semibold text-horizon-text">{formatCurrency(laborWithMargin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-horizon-accent">רווח מעבודה:</span>
                <span className="font-semibold text-green-500">{formatCurrency(laborProfit)}</span>
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold border-t-2 border-horizon-primary pt-3">
              <span className={profitAmount >= 0 ? 'text-green-600' : 'text-red-500'}>סה"כ רווח מהפרויקט:</span>
              <span className={profitAmount >= 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(profitAmount)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold">
              <span className="text-horizon-primary">מחיר סופי ללקוח:</span>
              <span className="text-horizon-primary">{formatCurrency(finalPrice)}</span>
            </div>
            <p className="text-xs text-horizon-accent text-center mt-2">
              * מחיר סופי = מחיר מכירת חומרים + עלות עבודה עם מרג'ין
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-horizon">
          <Button onClick={onBack} variant="outline" className="border-horizon">
            <ArrowRight className="w-4 h-4 ml-2" />
            חזור
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isSaving}
            className="btn-horizon-primary"
          >
            {isSaving ? (
              <>שומר...</>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמור תחזית
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}