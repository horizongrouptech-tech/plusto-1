import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";

import { toast } from "sonner";
export default function ProductEditModal({ product, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    product_name: '',
    barcode: '',
    cost_price: 0,
    selling_price: 0,
    category: '',
    supplier: '',
    inventory: 0,
    monthly_sales: 0,
    supplier_item_code: '',
    secondary_category: '',
    parent_item_code: '',
    store_price: 0,
    gross_profit: 0,
    profit_percentage: 0,
    data_quality: 'complete',
    needs_review: false
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      // וידוא שכל הערכים המספריים הם אכן מספרים ולא null/undefined
      setFormData({
        product_name: product.product_name || '',
        barcode: product.barcode || '',
        cost_price: parseFloat(product.cost_price) || 0,
        selling_price: parseFloat(product.selling_price) || 0,
        category: product.category || '',
        supplier: product.supplier || '',
        inventory: parseFloat(product.inventory) || 0,
        monthly_sales: parseFloat(product.monthly_sales) || 0,
        supplier_item_code: product.supplier_item_code || '',
        secondary_category: product.secondary_category || '',
        parent_item_code: product.parent_item_code || '',
        store_price: parseFloat(product.store_price) || 0,
        gross_profit: parseFloat(product.gross_profit) || 0,
        profit_percentage: parseFloat(product.profit_percentage) || 0,
        data_quality: product.data_quality || 'complete',
        needs_review: product.needs_review || false
      });
    }
  }, [product]);

  const calculateProfitMetrics = (costPrice, sellingPrice) => {
    const cost = parseFloat(costPrice) || 0;
    const selling = parseFloat(sellingPrice) || 0;
    
    const grossProfit = selling - cost;
    const profitPercentage = cost > 0 ? ((grossProfit / cost) * 100) : 0;
    
    return {
      gross_profit: grossProfit,
      profit_percentage: profitPercentage
    };
  };

  const handleInputChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };

    if (field === 'cost_price' || field === 'selling_price') {
      const metrics = calculateProfitMetrics(
        field === 'cost_price' ? value : formData.cost_price,
        field === 'selling_price' ? value : formData.selling_price
      );
      newFormData.gross_profit = metrics.gross_profit;
      newFormData.profit_percentage = metrics.profit_percentage;
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        ...product,
        ...formData,
        // וידוא שכל הערכים המספריים נשמרים כמספרים
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        inventory: parseFloat(formData.inventory) || 0,
        monthly_sales: parseFloat(formData.monthly_sales) || 0,
        store_price: parseFloat(formData.store_price) || 0,
        gross_profit: parseFloat(formData.gross_profit) || 0,
        profit_percentage: parseFloat(formData.profit_percentage) || 0
      });
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('שגיאה בשמירת המוצר');
    } finally {
      setIsSaving(false);
    }
  };

  if (!product) return null;

  const getProfitColor = (percentage) => {
    const profit = parseFloat(percentage) || 0;
    if (profit >= 30) return 'text-green-400';
    if (profit >= 15) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-text">
            עריכת מוצר: {product.product_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* פרטי מוצר בסיסיים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product_name" className="text-horizon-text">שם המוצר *</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => handleInputChange('product_name', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode" className="text-horizon-text">ברקוד</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          {/* מחירים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price" className="text-horizon-text">מחיר קנייה (₪)</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={(parseFloat(formData.cost_price) || 0).toFixed(2)}
                onChange={(e) => handleInputChange('cost_price', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selling_price" className="text-horizon-text">מחיר מכירה (₪)</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={(parseFloat(formData.selling_price) || 0).toFixed(2)}
                onChange={(e) => handleInputChange('selling_price', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          {/* תצוגת רווח מחושבת */}
          <div className="bg-horizon-card/30 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-horizon-accent">רווח גולמי:</span>
              <span className={`text-lg font-bold ${getProfitColor(formData.profit_percentage)}`}>
                ₪{(parseFloat(formData.gross_profit) || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-horizon-accent">אחוז רווח:</span>
              <span className={`text-lg font-bold ${getProfitColor(formData.profit_percentage)}`}>
                {(parseFloat(formData.profit_percentage) || 0).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* קטגוריה וספק */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-horizon-text">קטגוריה</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-horizon-text">ספק</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          {/* מלאי ומכירות */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inventory" className="text-horizon-text">מלאי</Label>
              <Input
                id="inventory"
                type="number"
                value={(parseFloat(formData.inventory) || 0).toFixed(0)}
                onChange={(e) => handleInputChange('inventory', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_sales" className="text-horizon-text">מכירות חודשיות</Label>
              <Input
                id="monthly_sales"
                type="number"
                value={(parseFloat(formData.monthly_sales) || 0).toFixed(0)}
                onChange={(e) => handleInputChange('monthly_sales', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          {/* פרטים נוספים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_item_code" className="text-horizon-text">קוד פריט ספק</Label>
              <Input
                id="supplier_item_code"
                value={formData.supplier_item_code}
                onChange={(e) => handleInputChange('supplier_item_code', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_price" className="text-horizon-text">מחיר בחנות (₪)</Label>
              <Input
                id="store_price"
                type="number"
                step="0.01"
                value={(parseFloat(formData.store_price) || 0).toFixed(2)}
                onChange={(e) => handleInputChange('store_price', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          {/* קטגוריה משנית וקוד פריט אב */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="secondary_category" className="text-horizon-text">קטגוריה משנית</Label>
              <Input
                id="secondary_category"
                value={formData.secondary_category}
                onChange={(e) => handleInputChange('secondary_category', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_item_code" className="text-horizon-text">קוד פריט אב</Label>
              <Input
                id="parent_item_code"
                value={formData.parent_item_code}
                onChange={(e) => handleInputChange('parent_item_code', e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          {/* איכות נתונים וסטטוס */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_quality" className="text-horizon-text">איכות נתונים</Label>
              <Select 
                value={formData.data_quality} 
                onValueChange={(value) => handleInputChange('data_quality', value)}
              >
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">נתונים מלאים</SelectItem>
                  <SelectItem value="partial">נתונים חלקיים</SelectItem>
                  <SelectItem value="incomplete">נתונים חסרים</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.needs_review}
                  onChange={(e) => handleInputChange('needs_review', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-horizon-text">דורש בדיקה</span>
              </label>
            </div>
          </div>

          {/* התראה אם הרווח נמוך */}
          {(parseFloat(formData.profit_percentage) || 0) < 15 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">אחוז הרווח נמוך מהמומלץ</p>
                <p className="text-xs text-horizon-accent mt-1">
                  מומלץ לשמור על אחוז רווח של לפחות 15-20% לעסק בריא
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="border-horizon-accent text-horizon-accent"
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="btn-horizon-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                'שמור שינויים'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}