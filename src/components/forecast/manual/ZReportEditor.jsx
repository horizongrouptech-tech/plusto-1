import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Save, X, Trash2, Plus, AlertCircle, Calculator } from "lucide-react";
import { formatCurrency } from './utils/numberFormatter';

export default function ZReportEditor({ 
  isOpen, 
  onClose, 
  zReport, 
  monthName,
  services,
  onSave,
  onDelete
}) {
  const [editedProducts, setEditedProducts] = useState(() => {
    const products = zReport?.detailed_products || [];
    
    if (products.length === 0) {
      console.warn('⚠️ No detailed products in Z report - cannot edit');
    }
    
    return products.map((p, idx) => ({
      product_name: p.product_name || '',
      barcode: p.barcode || '',
      quantity_sold: p.quantity_sold || 0,
      unit_price: p.unit_price || 0,
      revenue_with_vat: p.revenue_with_vat || 0,
      mapped_service: p.mapped_service || '',
      tempId: `product-${idx}-${Date.now()}`
    }));
  });

  const [hasChanges, setHasChanges] = useState(false);

  // חישוב סיכום
  const summary = useMemo(() => {
    const totalQty = editedProducts.reduce((sum, p) => sum + (p.quantity_sold || 0), 0);
    const totalRevenue = editedProducts.reduce((sum, p) => sum + (p.revenue_with_vat || 0), 0);
    const totalRevenueNoVat = totalRevenue / 1.17;
    
    return {
      products_count: editedProducts.length,
      total_quantity: totalQty,
      total_revenue_with_vat: totalRevenue,
      total_revenue_no_vat: totalRevenueNoVat
    };
  }, [editedProducts]);

  const handleUpdateProduct = (tempId, field, value) => {
    setEditedProducts(prev => prev.map(p => {
      if (p.tempId !== tempId) return p;
      
      const updated = { ...p };
      
      if (field === 'quantity_sold') {
        updated.quantity_sold = parseFloat(value) || 0;
        // חישוב מחדש של revenue
        if (updated.unit_price) {
          updated.revenue_with_vat = updated.quantity_sold * updated.unit_price;
        }
      } else if (field === 'unit_price') {
        updated.unit_price = parseFloat(value) || 0;
        // חישוב מחדש של revenue
        updated.revenue_with_vat = updated.quantity_sold * updated.unit_price;
      } else if (field === 'revenue_with_vat') {
        updated.revenue_with_vat = parseFloat(value) || 0;
        // חישוב מחדש של unit price
        if (updated.quantity_sold > 0) {
          updated.unit_price = updated.revenue_with_vat / updated.quantity_sold;
        }
      } else {
        updated[field] = value;
      }
      
      return updated;
    }));
    
    setHasChanges(true);
  };

  const handleDeleteProduct = (tempId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מוצר זה?')) return;
    
    setEditedProducts(prev => prev.filter(p => p.tempId !== tempId));
    setHasChanges(true);
  };

  const handleAddProduct = () => {
    const newProduct = {
      tempId: `product-new-${Date.now()}`,
      product_name: '',
      barcode: '',
      quantity_sold: 0,
      unit_price: 0,
      revenue_with_vat: 0,
      mapped_service: ''
    };
    
    setEditedProducts(prev => [...prev, newProduct]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // בדיקת תקינות
    const invalidProducts = editedProducts.filter(p => 
      !p.product_name || p.quantity_sold < 0 || p.revenue_with_vat < 0
    );
    
    if (invalidProducts.length > 0) {
      alert('⚠️ יש מוצרים עם נתונים לא תקינים. אנא מלא את כל השדות החובה.');
      return;
    }

    try {
      // ✅ אם יש z_report_id - עדכן בישות ZReportProduct
      if (zReport.z_report_id) {
        console.log('💾 Updating products in ZReportProduct entity...');
        
        // מחק את המוצרים הישנים
        await base44.entities.ZReportProduct.delete({
          z_report_id: zReport.z_report_id
        });

        // צור רשומות חדשות
        const zReportProductRecords = editedProducts.map(p => ({
          z_report_id: zReport.z_report_id,
          customer_email: zReport.customer_email,
          product_name: p.product_name,
          barcode: p.barcode || '',
          quantity_sold: p.quantity_sold,
          unit_price: p.unit_price,
          revenue_with_vat: p.revenue_with_vat,
          mapped_service: p.mapped_service,
          month_assigned: zReport.month_assigned
        }));

        // שמור ב-batches של 500
        const BATCH_SIZE = 500;
        for (let i = 0; i < zReportProductRecords.length; i += BATCH_SIZE) {
          const batch = zReportProductRecords.slice(i, i + BATCH_SIZE);
          await base44.entities.ZReportProduct.bulkCreate(batch);
        }
        
        console.log(`✅ Updated ${zReportProductRecords.length} products in ZReportProduct`);
      }

      // יצירת דוח מעודכן (metadata בלבד אם יש z_report_id)
      const updatedReport = {
        ...zReport,
        products_updated: editedProducts.length,
        total_revenue: summary.total_revenue_with_vat,
        last_edited_date: new Date().toISOString(),
        products_count: editedProducts.length,
        // שמור detailed_products רק אם אין z_report_id (backward compatibility)
        ...(zReport.z_report_id ? {} : {
          detailed_products: editedProducts.map(p => {
            const { tempId, ...productData } = p;
            return productData;
          })
        })
      };

      await onSave(updatedReport);
      
    } catch (error) {
      console.error('❌ Error saving Z-report:', error);
      alert('שגיאה בשמירה: ' + error.message);
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-horizon-dark text-horizon-text border-horizon">
        <DialogHeader>
          <DialogTitle className="text-horizon-text flex items-center gap-2">
            <Calculator className="w-5 h-5 text-horizon-primary" />
            עריכת דוח Z - {monthName}
          </DialogTitle>
          <p className="text-sm text-horizon-accent">
            {zReport?.file_name} | הועלה ב-{new Date(zReport?.upload_date).toLocaleDateString('he-IL')}
          </p>
        </DialogHeader>

        {/* סיכום כספי עדכני */}
        <div className="bg-horizon-card/50 border border-horizon-primary/30 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-horizon-accent mb-1">מוצרים</p>
              <p className="text-lg font-bold text-horizon-text">{summary.products_count}</p>
            </div>
            <div>
              <p className="text-xs text-horizon-accent mb-1">כמות כוללת</p>
              <p className="text-lg font-bold text-horizon-text">{summary.total_quantity.toLocaleString('he-IL')}</p>
            </div>
            <div>
              <p className="text-xs text-horizon-accent mb-1">מחזור כולל מע"מ</p>
              <p className="text-lg font-bold text-horizon-primary">{formatCurrency(summary.total_revenue_with_vat, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-horizon-accent mb-1">מחזור ללא מע"מ</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(summary.total_revenue_no_vat, 0)}</p>
            </div>
          </div>
        </div>

        {hasChanges && (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-horizon-text">
              יש שינויים שלא נשמרו - לא לשכוח ללחוץ "שמור שינויים"
            </AlertDescription>
          </Alert>
        )}

        {/* טבלת עריכה */}
        <div className="overflow-auto max-h-[50vh] border border-horizon rounded-lg">
          <table className="w-full text-sm" dir="rtl">
            <thead className="sticky top-0 bg-horizon-card border-b-2 border-horizon">
              <tr>
                <th className="p-2 text-right text-horizon-accent font-semibold">שם מוצר</th>
                <th className="p-2 text-right text-horizon-accent font-semibold">ברקוד</th>
                <th className="p-2 text-right text-horizon-accent font-semibold">כמות נמכרה</th>
                <th className="p-2 text-right text-horizon-accent font-semibold">מחיר יחידה</th>
                <th className="p-2 text-right text-horizon-accent font-semibold">מחזור כולל</th>
                <th className="p-2 text-center text-horizon-accent font-semibold">שירות ממופה</th>
                <th className="p-2 text-center text-horizon-accent font-semibold w-16">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {editedProducts.map((product, idx) => (
                <tr 
                  key={product.tempId} 
                  className={`border-b border-horizon hover:bg-horizon-card/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-horizon-card/10' : ''
                  }`}
                >
                  <td className="p-2">
                    <Input
                      value={product.product_name}
                      onChange={(e) => handleUpdateProduct(product.tempId, 'product_name', e.target.value)}
                      className="bg-horizon-card border-horizon text-horizon-text h-8 text-sm"
                      placeholder="שם המוצר"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={product.barcode || ''}
                      onChange={(e) => handleUpdateProduct(product.tempId, 'barcode', e.target.value)}
                      className="bg-horizon-card border-horizon text-horizon-text h-8 text-sm w-32"
                      placeholder="ברקוד"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={parseFloat(product.quantity_sold).toFixed(2)}
                      onChange={(e) => handleUpdateProduct(product.tempId, 'quantity_sold', e.target.value)}
                      className="bg-horizon-card border-horizon text-horizon-text h-8 text-sm w-24"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={parseFloat(product.unit_price || 0).toFixed(2)}
                      onChange={(e) => handleUpdateProduct(product.tempId, 'unit_price', e.target.value)}
                      className="bg-horizon-card border-horizon text-horizon-text h-8 text-sm w-24"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={parseFloat(product.revenue_with_vat).toFixed(2)}
                      onChange={(e) => handleUpdateProduct(product.tempId, 'revenue_with_vat', e.target.value)}
                      className="bg-horizon-card border-green-400/30 text-green-400 h-8 text-sm font-bold w-28"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant="outline" className="border-blue-400/50 text-blue-400 text-xs">
                      {product.mapped_service || 'לא ממופה'}
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProduct(product.tempId)}
                      className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* כפתור הוספת מוצר */}
        <Button
          onClick={handleAddProduct}
          variant="outline"
          className="w-full border-dashed border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף מוצר חדש
        </Button>

        <DialogFooter>
          <div className="flex justify-between items-center w-full gap-3">
            <div>
              {onDelete && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('האם למחוק את דוח Z זה לצמיתות?')) {
                      onDelete(zReport);
                      onClose();
                    }
                  }}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק דוח
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-horizon text-horizon-text"
              >
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="btn-horizon-primary"
              >
                <Save className="w-4 h-4 ml-2" />
                שמור שינויים
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}