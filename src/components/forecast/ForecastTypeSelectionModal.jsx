import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Edit3, TrendingUp, FileSpreadsheet, CheckCircle, Package } from 'lucide-react';
import { toast } from "sonner";

export default function ForecastTypeSelectionModal({
  isOpen,
  onClose,
  onSelectAutomatic,
  onSelectManual,
  onSelectProject,
  customer
}) {
  const [forecastName, setForecastName] = useState('');
  const [forecastYear, setForecastYear] = useState(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState(null);

  const handleContinue = () => {
    if (!forecastName.trim()) {
      toast.warning('יש להזין שם לתחזית');
      return;
    }

    const forecastData = {
      forecast_name: forecastName,
      forecast_year: forecastYear,
      customer_email: customer.email
    };

    if (selectedType === 'automatic') {
      onSelectAutomatic(forecastData);
    } else if (selectedType === 'manual') {
      onSelectManual(forecastData);
    } else if (selectedType === 'project') {
      onSelectProject(forecastData);
    }

    // Reset
    setForecastName('');
    setForecastYear(new Date().getFullYear());
    setSelectedType(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-horizon-primary" />
            צור תחזית עסקית חדשה
          </DialogTitle>
          <DialogDescription className="text-horizon-accent text-right">
            בחר את סוג התחזית שברצונך ליצור
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* פרטי תחזית בסיסיים */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="forecastName" className="text-horizon-text">שם התחזית</Label>
              <Input
                id="forecastName"
                value={forecastName}
                onChange={(e) => setForecastName(e.target.value)}
                placeholder='לדוגמה: "תחזית 2024", "תכנית צמיחה Q1"'
                className="bg-horizon-card border-horizon text-horizon-text mt-1"
              />
            </div>

            <div>
              <Label htmlFor="forecastYear" className="text-horizon-text">שנת התחזית</Label>
              <Input
                id="forecastYear"
                type="number"
                value={forecastYear}
                onChange={(e) => setForecastYear(parseInt(e.target.value))}
                className="bg-horizon-card border-horizon text-horizon-text mt-1"
              />
            </div>
          </div>

          {/* בחירת סוג תחזית */}
          <div className="space-y-3">
            <Label className="text-horizon-text text-lg">סוג התחזית</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* תחזית אוטומטית */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedType === 'automatic'
                    ? 'border-2 border-horizon-primary bg-horizon-primary/10 shadow-lg'
                    : 'border border-horizon hover:border-horizon-primary/50'
                }`}
                onClick={() => setSelectedType('automatic')}
              >
                <CardContent className={`p-6 text-center transition-all relative ${
                  selectedType === 'automatic' 
                    ? 'bg-horizon-primary/5' 
                    : 'bg-white'
                }`}>
                  {selectedType === 'automatic' && (
                    <div className="absolute top-3 left-3">
                      <CheckCircle className="w-6 h-6 text-horizon-primary" />
                    </div>
                  )}
                  <Bot className="w-12 h-12 mx-auto mb-3 text-horizon-primary" />
                  <h3 className="text-lg font-semibold text-horizon-text mb-2">תחזית אוטומטית (AI)</h3>
                  <p className="text-sm text-horizon-accent">
                    המערכת תיצור תחזית מפורטת באמצעות בינה מלאכותית על בסיס הנתונים העסקיים שלך
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-horizon-accent">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>מומלץ למשתמשים חדשים</span>
                  </div>
                </CardContent>
              </Card>

              {/* תחזית ידנית */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedType === 'manual'
                    ? 'border-2 border-horizon-secondary bg-horizon-secondary/10 shadow-lg'
                    : 'border border-horizon hover:border-horizon-secondary/50'
                }`}
                onClick={() => setSelectedType('manual')}
              >
                <CardContent className={`p-6 text-center transition-all relative ${
                  selectedType === 'manual' 
                    ? 'bg-horizon-secondary/5' 
                    : 'bg-white'
                }`}>
                  {selectedType === 'manual' && (
                    <div className="absolute top-3 left-3">
                      <CheckCircle className="w-6 h-6 text-horizon-secondary" />
                    </div>
                  )}
                  <Edit3 className="w-12 h-12 mx-auto mb-3 text-horizon-secondary" />
                  <h3 className="text-lg font-semibold text-horizon-text mb-2">תחזית ידנית מפורטת</h3>
                  <p className="text-sm text-horizon-accent">
                    הזן את כל הנתונים באופן ידני או העלה קובץ Excel עם התחזית המפורטת שלך
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-horizon-accent">
                    <Edit3 className="w-4 h-4" />
                    <span>שליטה מלאה בנתונים</span>
                  </div>
                </CardContent>
              </Card>

              {/* תחזית פרויקטים */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedType === 'project'
                    ? 'border-2 border-orange-500 bg-orange-500/10 shadow-lg'
                    : 'border border-horizon hover:border-orange-500/50'
                }`}
                onClick={() => setSelectedType('project')}
              >
                <CardContent className={`p-6 text-center transition-all relative ${
                  selectedType === 'project' 
                    ? 'bg-orange-500/5' 
                    : 'bg-white'
                }`}>
                  {selectedType === 'project' && (
                    <div className="absolute top-3 left-3">
                      <CheckCircle className="w-6 h-6 text-orange-500" />
                    </div>
                  )}
                  <Package className="w-12 h-12 mx-auto mb-3 text-orange-500" />
                  <h3 className="text-lg font-semibold text-horizon-text mb-2">תחזית פרויקטים</h3>
                  <p className="text-sm text-horizon-accent">
                    תמחור מדויק לפרויקטי בנייה וקבלנות על בסיס חומרים, עובדים ורווח רצוי
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-horizon-accent">
                    🏗️
                    <span>מתאים לקבלנים ובנייה</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-horizon">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-horizon text-horizon-text"
          >
            ביטול
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedType || !forecastName.trim()}
            className="btn-horizon-primary"
          >
            המשך
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}