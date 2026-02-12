import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, Package, Trash2, Plus, Search, DollarSign, Calculator } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../manual/utils/numberFormatter';
import { toast } from "sonner";

export default function Step2SelectProducts({ projectData, onUpdate, onNext, onBack, customer }) {
  const [selectedProducts, setSelectedProducts] = useState(projectData.products || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputMode, setInputMode] = useState(projectData.input_mode || 'manual');
  
  // הזנה ידנית
  const [manualRevenue, setManualRevenue] = useState(projectData.manual_revenue || 0);
  const [manualMaterialsCost, setManualMaterialsCost] = useState(projectData.manual_materials_cost || 0);

  const { data: catalogs = [] } = useQuery({
    queryKey: ['catalogs', customer.email],
    queryFn: () => base44.entities.Catalog.filter({ customer_email: customer.email })
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['catalogProducts', customer.email],
    queryFn: async () => {
      if (catalogs.length === 0) return [];
      const catalogIds = catalogs.map(c => c.id);
      const products = await Promise.all(
        catalogIds.map(id => base44.entities.ProductCatalog.filter({ catalog_id: id }))
      );
      return products.flat();
    },
    enabled: catalogs.length > 0
  });

  const filteredProducts = allProducts.filter(p => 
    p.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = (product) => {
    const existing = selectedProducts.find(p => p.product_id === product.id);
    if (existing) {
      toast.warning('מוצר זה כבר נוסף לרשימה');
      return;
    }

    const newProduct = {
      product_id: product.id,
      product_name: product.product_name,
      quantity: 1,
      unit_price: product.cost_price || 0,
      selling_price: product.selling_price || product.cost_price || 0, // מחיר מכירה (ניתן לעריכה)
      total_cost: product.cost_price || 0,
      total_revenue: product.selling_price || product.cost_price || 0
    };

    setSelectedProducts([...selectedProducts, newProduct]);
  };

  const handleUpdateQuantity = (productId, quantity) => {
    const updated = selectedProducts.map(p => {
      if (p.product_id === productId) {
        const qty = parseFloat(quantity) || 0;
        return {
          ...p,
          quantity: qty,
          total_cost: qty * p.unit_price,
          total_revenue: qty * (p.selling_price || p.unit_price)
        };
      }
      return p;
    });
    setSelectedProducts(updated);
  };

  const handleUpdateSellingPrice = (productId, sellingPrice) => {
    const updated = selectedProducts.map(p => {
      if (p.product_id === productId) {
        const price = parseFloat(sellingPrice) || 0;
        return {
          ...p,
          selling_price: price,
          total_revenue: p.quantity * price
        };
      }
      return p;
    });
    setSelectedProducts(updated);
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const handleNext = () => {
    if (inputMode === 'manual') {
      onUpdate({ 
        input_mode: 'manual',
        manual_revenue: manualRevenue,
        manual_materials_cost: manualMaterialsCost,
        products: []
      });
    } else {
      onUpdate({ 
        input_mode: 'catalog',
        products: selectedProducts,
        manual_revenue: 0,
        manual_materials_cost: 0
      });
    }
    onNext();
  };

  const totalMaterialsCost = inputMode === 'manual' 
    ? manualMaterialsCost 
    : selectedProducts.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalMaterialsRevenue = inputMode === 'manual' 
    ? manualRevenue 
    : selectedProducts.reduce((sum, p) => sum + (p.total_revenue || p.total_cost || 0), 0);
  const totalMaterialsProfit = totalMaterialsRevenue - totalMaterialsCost;

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-horizon-text flex items-center gap-2">
          <Calculator className="w-6 h-6 text-horizon-primary" />
          הכנסות ועלויות חומרים
        </CardTitle>
        <p className="text-sm text-horizon-accent mt-2">
          בחר את שיטת ההזנה המתאימה לפרויקט שלך
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* טאבים לבחירת מצב הזנה */}
        <Tabs value={inputMode} onValueChange={setInputMode} dir="rtl">
          <TabsList className="grid w-full grid-cols-2 bg-horizon-card">
            <TabsTrigger value="manual" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 ml-2" />
              הזנה ידנית (מומלץ)
            </TabsTrigger>
            <TabsTrigger value="catalog" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
              <Package className="w-4 h-4 ml-2" />
              בחירה מקטלוג
            </TabsTrigger>
          </TabsList>

          {/* מצב הזנה ידנית */}
          <TabsContent value="manual" className="space-y-6 mt-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                💡 מצב זה מתאים לפרויקטים שמשתנים כל פעם - פשוט הזן את הסכומים הכוללים
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-right block mb-2 text-horizon-text font-semibold">
                  צפי הכנסות מהפרויקט (ש"ח)
                </Label>
                <Input
                  type="number"
                  value={manualRevenue}
                  onChange={(e) => setManualRevenue(parseFloat(e.target.value) || 0)}
                  placeholder="100,000"
                  className="bg-horizon-card border-green-500/30 text-horizon-text h-12 text-lg font-semibold"
                  min="0"
                />
                <p className="text-xs text-horizon-accent mt-1">ההכנסה הכוללת הצפויה מהפרויקט</p>
              </div>

              <div>
                <Label className="text-right block mb-2 text-horizon-text font-semibold">
                  עלויות חומרי גלם/ספקים (ש"ח)
                </Label>
                <Input
                  type="number"
                  value={manualMaterialsCost}
                  onChange={(e) => setManualMaterialsCost(parseFloat(e.target.value) || 0)}
                  placeholder="30,000"
                  className="bg-horizon-card border-orange-500/30 text-horizon-text h-12 text-lg font-semibold"
                  min="0"
                />
                <p className="text-xs text-horizon-accent mt-1">כל העלויות של חומרי גלם, ספקים וחומרים</p>
              </div>

              {/* סיכום ביניים */}
              <div className="bg-horizon-primary/10 border-2 border-horizon-primary rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-horizon-text">הכנסות צפויות:</span>
                  <span className="font-bold text-green-400">{formatCurrency(manualRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-horizon-text">עלויות חומרים:</span>
                  <span className="font-bold text-orange-400">-{formatCurrency(manualMaterialsCost)}</span>
                </div>
                <div className="h-px bg-horizon-border my-2"></div>
                <div className="flex justify-between text-base font-bold">
                  <span className="text-horizon-text">רווח גולמי (לפני עובדים):</span>
                  <span className={totalMaterialsProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatCurrency(totalMaterialsProfit)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-horizon-accent bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                💡 בשלב הבא תוכל להוסיף את עלויות העובדים לחישוב הרווח הסופי
              </p>
            </div>
          </TabsContent>

          {/* מצב בחירה מקטלוג */}
          <TabsContent value="catalog" className="space-y-6 mt-6">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-purple-400">
                💡 מצב זה מתאים לפרויקטים קבועים שחוזרים על עצמם עם מוצרים ידועים
              </p>
            </div>

            {/* חיפוש מוצרים */}
            <div className="space-y-2">
              <Label>חפש מוצר מהקטלוג</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-3 w-4 h-4 text-horizon-accent" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חפש לפי שם מוצר..."
                    className="pr-10"
                  />
                </div>
              </div>
            </div>

            {/* רשימת מוצרים זמינים */}
            {searchTerm && (
              <div className="border border-horizon rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="text-sm font-medium text-horizon-text mb-3">תוצאות חיפוש:</div>
                <div className="space-y-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-horizon-accent text-center py-4">לא נמצאו מוצרים</p>
                  ) : (
                    filteredProducts.slice(0, 10).map(product => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-horizon-card rounded-lg hover:bg-horizon-card/80"
                      >
                        <div>
                          <div className="text-sm font-medium text-horizon-text">{product.product_name}</div>
                          <div className="text-xs text-horizon-accent">
                            מחיר: {formatCurrency(product.cost_price || 0)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddProduct(product)}
                          className="btn-horizon-primary"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* מוצרים שנבחרו */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>מוצרים שנבחרו ({selectedProducts.length})</Label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-horizon-primary">
                    עלות: {formatCurrency(totalMaterialsCost)}
                  </Badge>
                  <Badge variant="outline" className={totalMaterialsProfit >= 0 ? 'text-green-500 border-green-500' : 'text-red-500 border-red-500'}>
                    רווח: {formatCurrency(totalMaterialsProfit)}
                  </Badge>
                </div>
              </div>

              {selectedProducts.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-horizon rounded-lg">
                  <Package className="w-12 h-12 mx-auto text-horizon-accent mb-2" />
                  <p className="text-sm text-horizon-accent">טרם נבחרו מוצרים</p>
                  <p className="text-xs text-horizon-accent mt-1">חפש והוסף מוצרים מהקטלוג</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* כותרות טבלה */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-horizon-accent px-4 pb-2 border-b border-horizon">
                    <div className="col-span-3">שם מוצר</div>
                    <div className="col-span-2 text-center">עלות יחידה</div>
                    <div className="col-span-2 text-center">מחיר מכירה</div>
                    <div className="col-span-1 text-center">כמות</div>
                    <div className="col-span-2 text-center">סה"כ עלות</div>
                    <div className="col-span-1 text-center">רווח</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {selectedProducts.map((product) => {
                    const productProfit = (product.total_revenue || 0) - (product.total_cost || 0);
                    return (
                      <div
                        key={product.product_id}
                        className="grid grid-cols-12 gap-2 items-center p-3 bg-horizon-card rounded-lg border border-horizon"
                      >
                        <div className="col-span-3">
                          <div className="text-sm font-medium text-horizon-text truncate">{product.product_name}</div>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs text-horizon-accent">{formatCurrency(product.unit_price)}</span>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={product.selling_price || product.unit_price}
                            onChange={(e) => handleUpdateSellingPrice(product.product_id, e.target.value)}
                            className="w-full text-center text-sm h-8"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => handleUpdateQuantity(product.product_id, e.target.value)}
                            className="w-full text-center text-sm h-8"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2 text-center text-sm font-semibold text-horizon-primary">
                          {formatCurrency(product.total_cost)}
                        </div>
                        <div className={`col-span-1 text-center text-sm font-semibold ${productProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(productProfit)}
                        </div>
                        <div className="col-span-1 text-left">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveProduct(product.product_id)}
                            className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* סיכום */}
                  <div className="grid grid-cols-12 gap-2 items-center p-3 bg-horizon-primary/10 rounded-lg border-2 border-horizon-primary font-semibold">
                    <div className="col-span-3 text-horizon-text">סה"כ חומרים</div>
                    <div className="col-span-4"></div>
                    <div className="col-span-1"></div>
                    <div className="col-span-2 text-center text-horizon-primary">{formatCurrency(totalMaterialsCost)}</div>
                    <div className={`col-span-1 text-center ${totalMaterialsProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(totalMaterialsProfit)}
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* סיכום כללי */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-2 border-horizon-primary rounded-lg p-5">
          <h3 className="font-bold text-horizon-text mb-3 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-horizon-primary" />
            סיכום שלב זה
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-horizon-text">הכנסות צפויות:</span>
              <span className="font-bold text-green-400">{formatCurrency(totalMaterialsRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-horizon-text">עלויות חומרים:</span>
              <span className="font-bold text-orange-400">-{formatCurrency(totalMaterialsCost)}</span>
            </div>
            <div className="h-px bg-horizon-border my-2"></div>
            <div className="flex justify-between text-base font-bold">
              <span className="text-horizon-text">רווח גולמי (לפני עובדים):</span>
              <span className={totalMaterialsProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatCurrency(totalMaterialsProfit)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-horizon">
          <Button onClick={onBack} variant="outline" className="border-horizon">
            <ArrowRight className="w-4 h-4 ml-2" />
            חזור
          </Button>
          <Button onClick={handleNext} className="btn-horizon-primary">
            המשך לעלויות עובדים
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}