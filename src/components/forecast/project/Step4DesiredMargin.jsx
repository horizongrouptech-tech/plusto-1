import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../manual/utils/numberFormatter';

export default function Step4DesiredMargin({ projectData, onUpdate, onNext, onBack }) {
  const [margin, setMargin] = useState(projectData.desired_margin_percentage || 50);

  // חישובים
  const totalMaterialsCost = (projectData.products || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalLaborCost = projectData.labor_costs?.total_labor_cost || 0;
  const totalCost = totalMaterialsCost + totalLaborCost;
  const finalPrice = totalCost * (1 + margin / 100);
  const profitAmount = finalPrice - totalCost;

  const handleNext = () => {
    onUpdate({ 
      desired_margin_percentage: margin,
      calculated: {
        total_materials_cost: totalMaterialsCost,
        total_labor_cost: totalLaborCost,
        total_cost: totalCost,
        final_price: finalPrice,
        profit_amount: profitAmount
      }
    });
    onNext();
  };

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-horizon-primary" />
          הגדרת רווח גולמי רצוי
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>אחוז רווח גולמי רצוי (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
                min="0"
                max="200"
                step="5"
                className="w-24 text-center"
              />
              <span className="text-horizon-accent">%</span>
            </div>
          </div>

          <Slider
            value={[margin]}
            onValueChange={(value) => setMargin(value[0])}
            min={0}
            max={200}
            step={5}
            className="py-4"
          />

          <div className="flex justify-between text-xs text-horizon-accent">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>

        {/* סיכום פירוט */}
        <div className="space-y-4 border-t border-horizon pt-6">
          <div className="flex justify-between py-3 border-b border-horizon">
            <span className="text-horizon-accent">עלויות חומרים</span>
            <span className="font-medium text-horizon-text">{formatCurrency(totalMaterialsCost)}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-horizon">
            <span className="text-horizon-accent">עלויות עובדים</span>
            <span className="font-medium text-horizon-text">{formatCurrency(totalLaborCost)}</span>
          </div>
          <div className="flex justify-between py-3 border-b-2 border-horizon-primary">
            <span className="font-semibold text-horizon-text">סה"כ עלויות</span>
            <span className="font-semibold text-horizon-text">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex justify-between py-3 bg-horizon-secondary/10 rounded-lg px-4">
            <span className="font-semibold text-horizon-text">רווח מתוכנן ({margin}%)</span>
            <span className="font-semibold text-green-600">{formatCurrency(profitAmount)}</span>
          </div>
        </div>

        {/* מחיר סופי */}
        <div className="bg-gradient-to-br from-horizon-primary to-horizon-secondary rounded-xl p-8 text-center">
          <div className="text-sm text-white/80 mb-2">מחיר סופי לפרויקט</div>
          <div className="text-5xl font-bold text-white mb-2">
            {formatCurrency(finalPrice)}
          </div>
          <div className="text-xs text-white/70">
            (כולל רווח גולמי של {margin}%)
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-horizon">
          <Button onClick={onBack} variant="outline" className="border-horizon">
            <ArrowRight className="w-4 h-4 ml-2" />
            חזור
          </Button>
          <Button onClick={handleNext} className="btn-horizon-primary">
            סיכום סופי
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}