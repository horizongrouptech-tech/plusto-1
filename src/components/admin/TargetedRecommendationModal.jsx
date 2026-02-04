import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Globe, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Package,
  TrendingUp
} from "lucide-react";
import { generateTargetedRecommendation } from "@/components/logic/targetedRecommendationEngine";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ProductCatalog } from '@/entities/ProductCatalog';

export default function TargetedRecommendationModal({ customer, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    productName: '',
    productDescription: '',
    issueReason: ''
  });
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generationResult, setGenerationResult] = useState(null);

  // טעינת מוצרים מהקטלוג
  const { data: catalogProducts = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['catalogProducts', customer?.email],
    queryFn: async () => {
      // טען את הקטלוג הפעיל
      const catalogs = await base44.entities.Catalog.filter({
        created_by: customer.email,
        is_active: true
      }, '-created_date');
      
      if (catalogs.length === 0) return [];
      
      const activeCatalog = catalogs[0];
      
      // טען מוצרים מהקטלוג (עד 500 ראשונים)
      const products = await ProductCatalog.filter({
        customer_email: customer.email,
        catalog_id: activeCatalog.id,
        is_active: true
      }, '-created_date', 500);
      
      return products;
    },
    enabled: !!customer?.email && isOpen
  });

  const issueReasons = [
    { value: 'low_profitability', label: 'חוסר רווחיות' },
    { value: 'slow_sales', label: 'קיפאון במכירות' },
    { value: 'old_inventory', label: 'מלאי ישן' },
    { value: 'pricing_issues', label: 'מחירים לא תחרותיים' },
    { value: 'supplier_problems', label: 'בעיות עם ספקים' },
    { value: 'market_competition', label: 'תחרות חזקה בשוק' },
    { value: 'seasonal_decline', label: 'ירידה עונתית' },
    { value: 'bundling_opportunity', label: 'הזדמנות לחבילות' },
    { value: 'other', label: 'אחר' }
  ];

  const handleGenerate = async () => {
    if (!selectedProductId && !formData.productName.trim()) {
      alert('נא לבחור מוצר מהקטלוג או להזין שם מוצר');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('מתחיל יצירת המלצה ממוקדת...');
    setGenerationResult(null);

    try {
      const result = await generateTargetedRecommendation(
        customer,
        formData,
        (progress, step) => {
          setProgress(progress);
          setCurrentStep(step);
        }
      );

      setGenerationResult(result);
      
      if (result.success) {
        setProgress(100);
        setCurrentStep('ההמלצה נוצרה בהצלחה!');
      } else {
        setCurrentStep(`שגיאה: ${result.error}`);
      }

    } catch (error) {
      console.error("Error generating targeted recommendation:", error);
      setGenerationResult({
        success: false,
        error: error.message
      });
      setCurrentStep(`שגיאה: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setFormData({ productName: '', productDescription: '', issueReason: '' });
    setSelectedProductId('');
    setCustomProductName('');
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('');
    setGenerationResult(null);
    onClose();
  };

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-text mb-4 flex items-center gap-3">
            <Target className="w-6 h-6 text-horizon-primary" />
            יצירת המלצה ממוקדת - {customer?.business_name || customer?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {!generationResult && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-primary">פרטי המוצר להמלצה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-horizon-text mb-2">
                    בחר מוצר מהקטלוג *
                  </label>
                  <Select 
                    value={selectedProductId} 
                    onValueChange={(value) => {
                      setSelectedProductId(value);
                      if (value === 'custom') {
                        setCustomProductName('');
                        setFormData(prev => ({ ...prev, productName: '', productDescription: '' }));
                      } else {
                        const product = catalogProducts.find(p => p.id === value);
                        if (product) {
                          setFormData(prev => ({
                            ...prev,
                            productName: product.product_name,
                            productDescription: `${product.category || ''} - מחיר: ₪${product.selling_price || 0}`
                          }));
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder={isLoadingProducts ? "טוען מוצרים..." : "בחר מוצר מהקטלוג"} />
                    </SelectTrigger>
                    <SelectContent className="bg-horizon-card border-horizon">
                      <SelectItem value="custom" className="text-horizon-text">+ הזן מוצר חדש ידנית</SelectItem>
                      {catalogProducts.map(product => (
                        <SelectItem key={product.id} value={product.id} className="text-horizon-text">
                          {product.product_name} {product.category ? `(${product.category})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedProductId === 'custom' && (
                    <div className="mt-2">
                      <Input
                        value={customProductName}
                        onChange={(e) => {
                          setCustomProductName(e.target.value);
                          setFormData(prev => ({ ...prev, productName: e.target.value }));
                        }}
                        placeholder="הזן שם מוצר חדש..."
                        className="bg-horizon-card border-horizon text-horizon-text"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-horizon-text mb-2">
                    תיאור כללי של המוצר
                  </label>
                  <Textarea
                    value={formData.productDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                    placeholder="תאר את המוצר: קטגוריה, מאפיינים, יעד שימוש, מחיר משוער וכו'..."
                    className="bg-horizon-card border-horizon text-horizon-text h-24"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-horizon-text mb-2">
                    סיבת הבקשה להמלצה *
                  </label>
                  <Select 
                    value={formData.issueReason} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, issueReason: value }))}
                  >
                    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר סיבה להמלצה" />
                    </SelectTrigger>
                    <SelectContent className="bg-horizon-card border-horizon">
                      {issueReasons.map(reason => (
                        <SelectItem key={reason.value} value={reason.value} className="text-horizon-text">
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-primary flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מייצר המלצה ממוקדת...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-horizon-accent">{currentStep}</span>
                  <span className="text-sm font-bold text-horizon-text">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full h-2 bg-horizon-card/50" />
              </CardContent>
            </Card>
          )}

          {generationResult && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-primary flex items-center gap-2">
                  {generationResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  {generationResult.success ? 'המלצה נוצרה בהצלחה!' : 'יצירת ההמלצה נכשלה'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generationResult.success ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          {generationResult.foundInCatalog ? (
                            <Package className="w-4 h-4 text-green-400" />
                          ) : (
                            <Globe className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="font-semibold text-horizon-text">
                            {generationResult.foundInCatalog ? 'נמצא בקטלוג' : 'חיפוש חיצוני'}
                          </span>
                        </div>
                        <p className="text-sm text-horizon-accent">
                          {generationResult.foundInCatalog 
                            ? 'המוצר נמצא בקטלוג הקיים והמלצה נוצרה על בסיס נתונים פנימיים'
                            : 'המלצה נוצרה על בסיס מחקר שוק וניתוח AI מתקדם'
                          }
                        </p>
                      </div>
                      
                      <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <span className="font-semibold text-horizon-text">פוטנציאל רווח</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-400">
                          ₪{generationResult.recommendation?.expected_profit?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-horizon-card/30 p-4 rounded-lg">
                      <h4 className="font-semibold text-horizon-text mb-2">
                        {generationResult.recommendation?.title}
                      </h4>
                      <p className="text-horizon-accent text-sm">
                        {generationResult.recommendation?.description?.substring(0, 200)}...
                      </p>
                    </div>

                    <Badge className="bg-purple-500 text-white">
                      המלצה ממוקדת
                    </Badge>
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400">{generationResult.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-horizon">
            {!generationResult ? (
              <>
                <Button onClick={handleClose} variant="outline" className="border-horizon text-horizon-text">
                  ביטול
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || (!selectedProductId && !formData.productName.trim()) || !formData.issueReason}
                  className="btn-horizon-primary"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מייצר המלצה...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 ml-2" />
                      צור המלצה ממוקדת
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleClose} variant="outline" className="border-horizon text-horizon-text">
                  סגור
                </Button>
                {generationResult.success && (
                  <Button onClick={handleSuccess} className="btn-horizon-primary">
                    <CheckCircle className="w-4 h-4 ml-2" />
                    סיים
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}