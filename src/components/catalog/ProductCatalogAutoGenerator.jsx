import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Lightbulb, RefreshCw, AlertTriangle, Sparkles, Target, Package } from "lucide-react";
import { generateCatalog } from '@/api/functions';


export default function ProductCatalogAutoGenerator({
  customer,
  onGenerationStart,
  disabled = false,
  selectedCatalogId
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generationData, setGenerationData] = useState({
    business_type: customer?.business_type || 'retail',
    target_audience: customer?.target_customers || '',
    business_focus: customer?.main_products || '',
    product_count: 200,
    price_range: 'mixed',
    include_categories: '',
    exclude_categories: '',
    special_requirements: ''
  });

  const handleGenerate = async () => {
    if (!selectedCatalogId) {
      setError('יש לבחור קטלוג תחילה');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const { data, error: responseError } = await generateCatalog({
        customer_email: customer.email,
        catalog_id: selectedCatalogId,
        business_type: generationData.business_type,
        product_count: generationData.product_count,
        generation_metadata: {
          target_audience: generationData.target_audience,
          business_focus: generationData.business_focus,
          price_range: generationData.price_range,
          include_categories: generationData.include_categories,
          exclude_categories: generationData.exclude_categories,
          special_requirements: generationData.special_requirements
        }
      });

      if (responseError) {
        throw new Error(responseError.message || 'שגיאה כללית בקריאה לשרת');
      }

      if (data.success && data.process_id) {
        if (onGenerationStart) {
          onGenerationStart(data.process_id, `קטלוג (${generationData.product_count} מוצרים)`);
        }

        setGenerationData({
          business_type: 'retail',
          price_range: 'mixed',
          target_audience: '',
          business_focus: '',
          product_count: 200,
          include_categories: '',
          exclude_categories: '',
          special_requirements: ''
        });
      } else {
        throw new Error(data.error || 'שגיאה ביצירת הקטלוג');
      }

    } catch (err) {
      console.error('Error generating catalog:', err);
      setError(`שגיאה ביצירת הקטלוג: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!customer) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
          <p className="text-horizon-accent">לא נמצאו נתוני לקוח</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="card-horizon overflow-hidden">
        {/* כותרת מעוצבת עם גרדיאנט */}
        <div className="bg-gradient-to-r from-[#32acc1] to-[#83ddec] p-6">
          <CardTitle className="text-2xl text-white flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span>יצירת קטלוג אוטומטית באמצעות AI</span>
          </CardTitle>
          <p className="text-white/90 mt-2 font-medium">
            צור קטלוג מוצרים מותאם אישית לעסק שלך תוך דקות ספורות
          </p>
        </div>

        <CardContent className="p-8 space-y-8">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <AlertDescription className="text-red-300 font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {/* שדות בסיס - סוג עסק וטווח מחירים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-horizon-text text-base font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-horizon-primary" />
                סוג העסק
              </Label>
              <Select
                value={generationData.business_type}
                onValueChange={(value) => setGenerationData({ ...generationData, business_type: value })}
                disabled={disabled || isGenerating}
              >
                <SelectTrigger className="bg-horizon-card/50 border-2 border-horizon hover:border-horizon-primary/50 text-horizon-text h-12 transition-all">
                  <SelectValue placeholder="בחר סוג עסק..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">קמעונות</SelectItem>
                  <SelectItem value="wholesale">סיטונאות</SelectItem>
                  <SelectItem value="restaurant">מסעדה/בית קפה</SelectItem>
                  <SelectItem value="services">שירותים</SelectItem>
                  <SelectItem value="fashion">אופנה</SelectItem>
                  <SelectItem value="tech">טכנולוגיה</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-horizon-text text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-horizon-primary" />
                טווח מחירים
              </Label>
              <Select
                value={generationData.price_range}
                onValueChange={(value) => setGenerationData({ ...generationData, price_range: value })}
                disabled={disabled || isGenerating}
              >
                <SelectTrigger className="bg-horizon-card/50 border-2 border-horizon hover:border-horizon-primary/50 text-horizon-text h-12 transition-all">
                  <SelectValue placeholder="בחר טווח מחירים..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">מעורב (כל המחירים)</SelectItem>
                  <SelectItem value="budget">זול (₪0-50)</SelectItem>
                  <SelectItem value="medium">בינוני (₪50-250)</SelectItem>
                  <SelectItem value="premium">יקר (₪250+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* קהל יעד והתמחות */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-horizon-text text-base font-semibold">
                קהל יעד
              </Label>
              <Input
                placeholder="לדוגמה: משפחות, צעירים, מקצוענים..."
                value={generationData.target_audience}
                onChange={(e) => setGenerationData({ ...generationData, target_audience: e.target.value })}
                className="bg-horizon-card/50 border-2 border-horizon hover:border-horizon-primary/50 text-horizon-text h-12 transition-all focus:border-horizon-primary"
                disabled={disabled || isGenerating}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-horizon-text text-base font-semibold">
                התמחות העסק
              </Label>
              <Input
                placeholder="לדוגמה: מוצרי ניקוי, אופנה, אלקטרוניקה..."
                value={generationData.business_focus}
                onChange={(e) => setGenerationData({ ...generationData, business_focus: e.target.value })}
                className="bg-horizon-card/50 border-2 border-horizon hover:border-horizon-primary/50 text-horizon-text h-12 transition-all focus:border-horizon-primary"
                disabled={disabled || isGenerating}
              />
            </div>
          </div>

          {/* כמות מוצרים - עיצוב משופר */}
          <div className="space-y-4 bg-gradient-to-br from-[#32acc1]/5 to-[#fc9f67]/5 p-6 rounded-xl border-2 border-horizon">
            <Label className="text-horizon-text text-base font-semibold flex items-center justify-between">
              <span>כמות מוצרים ליצירה</span>
              <Badge className="bg-horizon-primary text-white text-lg px-4 py-1">
                {generationData.product_count}
              </Badge>
            </Label>
            <Slider
              value={[generationData.product_count]}
              onValueChange={(value) => setGenerationData({ ...generationData, product_count: value[0] })}
              max={10000}
              min={50}
              step={50}
              disabled={disabled || isGenerating}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-horizon-accent font-medium">
              <span>10,000</span>
              <span>50</span>
            </div>
          </div>

          {/* קטגוריות לכלול/להחריג */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-horizon-text text-base font-semibold text-green-400 flex items-center gap-2">
                <span className="bg-green-500/20 p-1 rounded">✓</span>
                קטגוריות לכלול
              </Label>
              <Input
                placeholder="לדוגמה: משקאות, חטיפים, מוצרי ניקוי"
                value={generationData.include_categories}
                onChange={(e) => setGenerationData({ ...generationData, include_categories: e.target.value })}
                className="bg-horizon-card/50 border-2 border-green-500/30 hover:border-green-500/50 text-horizon-text h-12 transition-all focus:border-green-500"
                disabled={disabled || isGenerating}
              />
              <p className="text-xs text-horizon-accent">הפרד בפסיקים בין קטגוריות</p>
            </div>

            <div className="space-y-3">
              <Label className="text-horizon-text text-base font-semibold text-red-400 flex items-center gap-2">
                <span className="bg-red-500/20 p-1 rounded">✗</span>
                קטגוריות להחריג
              </Label>
              <Input
                placeholder="לדוגמה: אלכוהול, טבק"
                value={generationData.exclude_categories}
                onChange={(e) => setGenerationData({ ...generationData, exclude_categories: e.target.value })}
                className="bg-horizon-card/50 border-2 border-red-500/30 hover:border-red-500/50 text-horizon-text h-12 transition-all focus:border-red-500"
                disabled={disabled || isGenerating}
              />
              <p className="text-xs text-horizon-accent">הפרד בפסיקים בין קטגוריות</p>
            </div>
          </div>

          {/* דרישות מיוחדות */}
          <div className="space-y-3">
            <Label className="text-horizon-text text-base font-semibold">
              דרישות מיוחדות
            </Label>
            <Textarea
              placeholder="לדוגמה: מוצרים כשרים בלבד, ללא גלוטן, אורגני, מותאם לילדים..."
              value={generationData.special_requirements}
              onChange={(e) => setGenerationData({ ...generationData, special_requirements: e.target.value })}
              className="bg-horizon-card/50 border-2 border-horizon hover:border-horizon-primary/50 text-horizon-text transition-all focus:border-horizon-primary resize-none"
              rows={4}
              disabled={disabled || isGenerating}
            />
          </div>

          {/* כפתור יצירה */}
          <div className="pt-4 border-t-2 border-horizon">
            <Button
              onClick={handleGenerate}
              disabled={disabled || isGenerating || !selectedCatalogId}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#32acc1] to-[#83ddec] hover:from-[#2a98ad] hover:to-[#6fccd9] text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 ml-3 animate-spin" />
                  <span>יוצר קטלוג חכם... אנא המתן</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 ml-3" />
                  <span>צור קטלוג אוטומטי עם AI</span>
                </>
              )}
            </Button>
          </div>

          {/* טיפים */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 rounded-xl border-2 border-blue-500/20">
            <h4 className="font-bold text-lg text-horizon-text mb-4 flex items-center gap-2">
              <div className="bg-gradient-to-r from-[#32acc1] to-[#83ddec] p-2 rounded-lg">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              טיפים ליצירת קטלוג איכותי
            </h4>
            <ul className="text-sm text-horizon-text space-y-3 pr-6 list-none">
              <li className="flex items-start gap-3">
                <span className="bg-[#32acc1] text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">1</span>
                <span><strong className="text-horizon-primary">הגדר בדיוק את קהל היעד וההתמחות</strong> - ככל שהמידע מדויק יותר, כך הקטלוג יהיה רלוונטי יותר</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-[#32acc1] text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">2</span>
                <span><strong className="text-horizon-primary">התהליך ייקח מספר דקות</strong> - בהתאם לכמות המוצרים שבחרת (כ-30 שניות ל-100 מוצרים)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-[#32acc1] text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">3</span>
                <span><strong className="text-horizon-primary">ניתן לערוך ולהתאים</strong> - תוכל לערוך, למחוק ולהוסיף מוצרים אחרי היצירה</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-[#32acc1] text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">4</span>
                <span><strong className="text-horizon-primary">השתמש בדרישות מיוחדות</strong> - ציין העדפות כמו כשרות, אורגני, או מגבלות אחרות</span>
              </li>
            </ul>
          </div>

          {!selectedCatalogId && (
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <AlertDescription className="text-yellow-300 font-medium">
                יש לבחור או ליצור קטלוג תחילה כדי להתחיל את תהליך הייצור האוטומטי
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}