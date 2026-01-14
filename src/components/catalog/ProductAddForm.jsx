import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Barcode, DollarSign, TrendingUp, Calculator } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProductAddForm({ 
  customer, 
  selectedCatalogId, 
  onProductAdded, 
  isOpen, 
  onClose 
}) {
  const [formData, setFormData] = useState({
    product_name: '',
    barcode: '',
    cost_price: 0,
    selling_price: 0,
    category: '',
    supplier: '',
    inventory: 0,
    monthly_sales: 0,
    gross_profit: 0,
    profit_percentage: 0
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // חישוב אוטומטי של רווח ורווחיות
  useEffect(() => {
    const cost = parseFloat(formData.cost_price) || 0;
    const sell = parseFloat(formData.selling_price) || 0;
    const profit = sell - cost;
    const profitPercentage = sell > 0 ? ((profit / sell) * 100) : 0;
    
    setFormData(prev => ({
      ...prev,
      gross_profit: profit,
      profit_percentage: profitPercentage
    }));
  }, [formData.cost_price, formData.selling_price]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.product_name || formData.product_name.trim() === '') {
      newErrors.product_name = 'שם המוצר חובה';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!selectedCatalogId) {
      alert('יש לבחור קטלוג תחילה');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const productData = {
        customer_email: customer.email,
        catalog_id: selectedCatalogId,
        product_name: formData.product_name.trim(),
        barcode: formData.barcode || '',
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        category: formData.category || '',
        supplier: formData.supplier || '',
        inventory: parseInt(formData.inventory) || 0,
        monthly_sales: parseInt(formData.monthly_sales) || 0,
        gross_profit: formData.gross_profit,
        profit_percentage: formData.profit_percentage,
        data_source: 'manual_entry',
        data_quality: 'partial',
        is_active: true
      };

      const newProduct = await base44.entities.ProductCatalog.create(productData);

      if (newProduct && typeof onProductAdded === 'function') {
        onProductAdded(newProduct);
      }

      // איפוס הטופס
      setFormData({
        product_name: '',
        barcode: '',
        cost_price: 0,
        selling_price: 0,
        category: '',
        supplier: '',
        inventory: 0,
        monthly_sales: 0,
        gross_profit: 0,
        profit_percentage: 0
      });
      setErrors({});
      
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('שגיאה בהוספת המוצר: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProfitabilityNote = () => {
    const percentage = formData.profit_percentage;
    if (percentage >= 40) return { text: '40%+ - רווחיות מעולה', color: 'text-green-400' };
    if (percentage >= 20) return { text: '20-40% - רווחיות סבירה', color: 'text-yellow-400' };
    return { text: 'מתחת ל-20% - רווחיות נמוכה', color: 'text-red-400' };
  };

  const profitNote = getProfitabilityNote();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl dir-rtl bg-horizon-dark border-horizon text-horizon-text max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-text text-right">
            הוסף מוצר חדש
          </DialogTitle>
          <DialogDescription className="text-horizon-accent text-right">
            הזן פרטים למוצר חדש. רק שם המוצר הוא חובה.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* שם מוצר - חובה */}
          <div className="space-y-2">
            <Label htmlFor="product_name" className="text-right text-horizon-text flex items-center gap-2">
              <Package className="w-4 h-4 text-horizon-primary" />
              שם מוצר <span className="text-red-400">*</span>
            </Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="bg-horizon-card border-horizon text-horizon-text text-right"
              placeholder="הזן שם מוצר..."
              dir="rtl"
            />
            {errors.product_name && (
              <p className="text-red-400 text-sm text-right">{errors.product_name}</p>
            )}
          </div>

          {/* Grid של 2 עמודות - כמו בעריכה */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ברקוד */}
            <div className="space-y-2">
              <Label htmlFor="barcode" className="text-right text-horizon-text flex items-center gap-2">
                <Barcode className="w-4 h-4 text-horizon-accent" />
                ברקוד
              </Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text text-right"
                placeholder="EAN/ברקוד (אופציונלי)"
                dir="rtl"
              />
            </div>

            {/* קטגוריה */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-right text-horizon-text">
                קטגוריה
              </Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text text-right"
                placeholder="קטגוריה (אופציונלי)"
                dir="rtl"
              />
            </div>

            {/* מחיר קנייה */}
            <div className="space-y-2">
              <Label htmlFor="cost_price" className="text-right text-horizon-text flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-horizon-accent" />
                מחיר קנייה (ש"ח)
              </Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                className="bg-horizon-card border-horizon text-horizon-text text-right"
                dir="rtl"
              />
            </div>

            {/* מחיר מכירה */}
            <div className="space-y-2">
              <Label htmlFor="selling_price" className="text-right text-horizon-text flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-horizon-accent" />
                מחיר מכירה (ש"ח)
              </Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                className="bg-horizon-card border-horizon text-horizon-text text-right"
                dir="rtl"
              />
            </div>

            {/* ספק */}
            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-right text-horizon-text">
                ספק
              </Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text text-right"
                placeholder="שם ספק (אופציונלי)"
                dir="rtl"
              />
            </div>

            {/* כמות במלאי */}
            <div className="space-y-2">
              <Label htmlFor="inventory" className="text-right text-horizon-text">
                כמות במלאי
              </Label>
              <Input
                id="inventory"
                type="number"
                value={formData.inventory}
                onChange={(e) => setFormData({ ...formData, inventory: parseInt(e.target.value) || 0 })}
                className="bg-horizon-card border-horizon text-horizon-text text-right"
                dir="rtl"
              />
            </div>

            {/* מכירות חודשיות */}
            <div className="space-y-2">
              <Label htmlFor="monthly_sales" className="text-right text-horizon-text">
                מכירות חודשיות
              </Label>
              <Input
                id="monthly_sales"
                type="number"
                value={formData.monthly_sales}
                onChange={(e) => setFormData({ ...formData, monthly_sales: parseInt(e.target.value) || 0 })}
                className="bg-horizon-card border-horizon text-horizon-text text-right"
                dir="rtl"
              />
            </div>
          </div>

          {/* קטע מחירים ורווחיות - כמו בעריכה */}
          <div className="bg-horizon-card/30 border border-horizon rounded-lg p-6 mt-6">
            <div className="flex items-center gap-2 mb-4 justify-end">
              <h3 className="text-lg font-semibold text-horizon-text">מחירים ורווחיות</h3>
              <Calculator className="w-5 h-5 text-horizon-primary" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-horizon-dark/50 rounded-lg">
                <p className="text-sm text-horizon-accent mb-2">רווח גולמי</p>
                <p className="text-2xl font-bold text-horizon-text">
                  ₪{Math.round(formData.gross_profit).toLocaleString()}
                </p>
              </div>
              
              <div className="text-center p-4 bg-horizon-dark/50 rounded-lg">
                <p className="text-sm text-horizon-accent mb-2">אחוז רווח</p>
                <p className={`text-2xl font-bold ${
                  formData.profit_percentage >= 40 ? 'text-green-400' :
                  formData.profit_percentage >= 20 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  <TrendingUp className="w-5 h-5 inline ml-2" />
                  {formData.profit_percentage.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Badge 
                variant="outline" 
                className={`${profitNote.color} border-current text-sm py-2 px-4`}
              >
                {profitNote.text}
              </Badge>
            </div>
          </div>
        </form>

        <DialogFooter className="flex gap-3 justify-end pt-4 border-t border-horizon">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-horizon-accent text-horizon-accent hover:bg-horizon-card"
          >
            ביטול
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.product_name.trim()}
            className="btn-horizon-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מוסיף מוצר...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 ml-2" />
                הוסף מוצר
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}