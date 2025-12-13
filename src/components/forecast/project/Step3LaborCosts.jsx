import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Users } from 'lucide-react';
import { formatCurrency } from '../manual/utils/numberFormatter';

export default function Step3LaborCosts({ projectData, onUpdate, onNext, onBack }) {
  const [laborCosts, setLaborCosts] = useState(projectData.labor_costs || {
    num_workers: 0,
    cost_per_worker_per_day: 0,
    project_duration_days: 0,
    total_labor_cost: 0
  });

  const handleChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const updated = { ...laborCosts, [field]: numValue };
    
    // חישוב אוטומטי של סה"כ
    updated.total_labor_cost = 
      updated.num_workers * 
      updated.cost_per_worker_per_day * 
      updated.project_duration_days;
    
    setLaborCosts(updated);
  };

  const handleNext = () => {
    onUpdate({ labor_costs: laborCosts });
    onNext();
  };

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2">
          <Users className="w-6 h-6 text-horizon-primary" />
          עלויות עובדים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>מספר עובדים</Label>
            <Input
              type="number"
              value={laborCosts.num_workers}
              onChange={(e) => handleChange('num_workers', e.target.value)}
              min="0"
              className="text-horizon-text"
            />
            <p className="text-xs text-horizon-accent">כמה עובדים יעבדו בפרויקט?</p>
          </div>

          <div className="space-y-2">
            <Label>עלות יומית לעובד (₪)</Label>
            <Input
              type="number"
              value={laborCosts.cost_per_worker_per_day}
              onChange={(e) => handleChange('cost_per_worker_per_day', e.target.value)}
              min="0"
              step="10"
              className="text-horizon-text"
            />
            <p className="text-xs text-horizon-accent">כמה עולה עובד אחד ליום?</p>
          </div>

          <div className="space-y-2">
            <Label>משך הפרויקט (ימים)</Label>
            <Input
              type="number"
              value={laborCosts.project_duration_days}
              onChange={(e) => handleChange('project_duration_days', e.target.value)}
              min="0"
              className="text-horizon-text"
            />
            <p className="text-xs text-horizon-accent">כמה ימי עבודה?</p>
          </div>
        </div>

        {/* סיכום עלויות עובדים */}
        <div className="bg-gradient-to-br from-horizon-primary/10 to-horizon-secondary/10 rounded-xl p-6 border-2 border-horizon">
          <div className="text-center">
            <div className="text-sm text-horizon-accent mb-2">סה"כ עלויות עובדים</div>
            <div className="text-4xl font-bold text-horizon-primary">
              {formatCurrency(laborCosts.total_labor_cost)}
            </div>
            <div className="text-xs text-horizon-accent mt-3 space-y-1">
              <p>{laborCosts.num_workers} עובדים × {formatCurrency(laborCosts.cost_per_worker_per_day)} ליום</p>
              <p>× {laborCosts.project_duration_days} ימים</p>
            </div>
          </div>
        </div>

        {/* חישוב עלויות מצטברות */}
        {projectData.products && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-horizon">
            <div className="text-center p-4 bg-horizon-card rounded-lg">
              <div className="text-xs text-horizon-accent mb-1">עלויות חומרים</div>
              <div className="text-lg font-semibold text-horizon-text">
                {formatCurrency(projectData.products.reduce((sum, p) => sum + (p.total_cost || 0), 0))}
              </div>
            </div>
            <div className="text-center p-4 bg-horizon-card rounded-lg">
              <div className="text-xs text-horizon-accent mb-1">עלויות עובדים</div>
              <div className="text-lg font-semibold text-horizon-text">
                {formatCurrency(laborCosts.total_labor_cost)}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-horizon">
          <Button onClick={onBack} variant="outline" className="border-horizon">
            <ArrowRight className="w-4 h-4 ml-2" />
            חזור
          </Button>
          <Button onClick={handleNext} className="btn-horizon-primary">
            המשך לרווח רצוי
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}