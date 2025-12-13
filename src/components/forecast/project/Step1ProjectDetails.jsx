import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Step1ProjectDetails({ projectData, onUpdate, onNext, onBack }) {
  const handleChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  const canProceed = projectData.project_name && projectData.forecast_year;

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2">
          <FileText className="w-6 h-6 text-horizon-primary" />
          פרטי הפרויקט
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>שם הפרויקט *</Label>
          <Input
            value={projectData.project_name || ''}
            onChange={(e) => handleChange('project_name', e.target.value)}
            placeholder="לדוגמה: בניית בניין מגורים ברחוב הרצל"
            className="text-horizon-text"
          />
        </div>

        <div className="space-y-2">
          <Label>תיאור הפרויקט</Label>
          <Textarea
            value={projectData.project_description || ''}
            onChange={(e) => handleChange('project_description', e.target.value)}
            placeholder="תאר את הפרויקט, היקפו ופרטים רלוונטיים..."
            rows={4}
            className="text-horizon-text"
          />
        </div>

        <div className="space-y-2">
          <Label>שנת ביצוע *</Label>
          <Input
            type="number"
            value={projectData.forecast_year || new Date().getFullYear()}
            onChange={(e) => handleChange('forecast_year', parseInt(e.target.value))}
            className="text-horizon-text"
          />
        </div>

        <div className="flex justify-between pt-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-horizon text-horizon-accent"
          >
            חזור
          </Button>
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="btn-horizon-primary"
          >
            המשך לבחירת מוצרים
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}