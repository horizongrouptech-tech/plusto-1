
import React, { useState, useEffect } from "react";


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Edit, Search, Package, ArrowLeft, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Product, User } from '@/api/entities';

export default function ManageProductsPage() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      if (userData) {
        const productsData = await Product.filter({ created_by: userData.email }, "-updated_date");
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
    setIsLoading(false);
  };

  const handleEdit = (product) => {
    setEditingProduct({ ...product });
    setIsModalOpen(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את המוצר?")) {
      try {
        await Product.delete(productId);
        loadProducts(); // Refresh list
      } catch (error) {
        console.error("Error deleting product:", error);
        toast.error("שגיאה במחיקת המוצר.");
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      const { id, created_by, created_date, updated_date, ...dataToUpdate } = editingProduct;
      // Ensure numeric fields are numbers
      dataToUpdate.cost_price = parseFloat(dataToUpdate.cost_price) || 0;
      dataToUpdate.selling_price = parseFloat(dataToUpdate.selling_price) || 0;
      dataToUpdate.monthly_sales = parseInt(dataToUpdate.monthly_sales) || 0;
      dataToUpdate.inventory = parseInt(dataToUpdate.inventory) || 0;
      
      // Recalculate derived fields before saving
      if (dataToUpdate.cost_price > 0 && dataToUpdate.selling_price > 0) {
         dataToUpdate.margin_percentage = parseFloat((((dataToUpdate.selling_price - dataToUpdate.cost_price) / dataToUpdate.cost_price) * 100).toFixed(2));
      } else {
         dataToUpdate.margin_percentage = 0;
      }
      dataToUpdate.monthly_revenue = parseFloat((dataToUpdate.monthly_sales * dataToUpdate.selling_price).toFixed(2));


      await Product.update(id, dataToUpdate);
      setIsModalOpen(false);
      setEditingProduct(null);
      loadProducts(); // Refresh list
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("שגיאה בעדכון המוצר.");
    }
  };

  const handleModalInputChange = (field, value) => {
    setEditingProduct(prev => ({ ...prev, [field]: value }));
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.supplier && product.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-horizon-dark p-6">
        <div className="max-w-7xl mx-auto">
           <Skeleton className="h-8 w-1/3 mb-4 bg-horizon-card" />
           <Skeleton className="h-12 w-full mb-6 bg-horizon-card" />
           <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-horizon-card" />)}
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon" className="rounded-xl border-horizon text-horizon-text hover:bg-horizon-card">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">ניהול מוצרים</h1>
              <p className="text-horizon-accent mt-1">צפה ונהל את המוצרים שהעלית למערכת</p>
            </div>
          </div>
          <Link to={createPageUrl("AddProduct")}>
            <Button className="btn-horizon-primary">
              <PlusCircle className="w-4 h-4 mr-2" />
              הוסף מוצר חדש
            </Button>
          </Link>
        </div>

        <Card className="card-horizon mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-horizon-accent" />
              <Input
                placeholder="חפש מוצרים לפי שם, קטגוריה או ספק..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </CardContent>
        </Card>

        {filteredProducts.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-horizon-accent mb-4" />
            <h3 className="text-xl font-semibold text-horizon-text mb-2">לא נמצאו מוצרים</h3>
            <p className="text-horizon-accent">
              {products.length === 0 ? "עדיין לא הוספת מוצרים. לחץ על 'הוסף מוצר חדש' כדי להתחיל." : "נסה מונח חיפוש אחר."}
            </p>
          </div>
        ) : (
          <Card className="card-horizon">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-horizon">
                      <TableHead className="text-right text-horizon-text">שם מוצר</TableHead>
                      <TableHead className="text-right text-horizon-text">קטגוריה</TableHead>
                      <TableHead className="text-right text-horizon-text">ספק</TableHead>
                      <TableHead className="text-right text-horizon-text">עלות (₪)</TableHead>
                      <TableHead className="text-right text-horizon-text">מחיר (₪)</TableHead>
                      <TableHead className="text-right text-horizon-text">רווח (%)</TableHead>
                      <TableHead className="text-right text-horizon-text">מכירות חודשיות</TableHead>
                      <TableHead className="text-right text-horizon-text">מלאי</TableHead>
                      <TableHead className="text-center text-horizon-text">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id} className="border-b-horizon hover:bg-horizon-card/50">
                        <TableCell className="font-medium text-right">{product.name}</TableCell>
                        <TableCell className="text-right">{product.category || "-"}</TableCell>
                        <TableCell className="text-right">{product.supplier || "-"}</TableCell>
                        <TableCell className="text-right">{product.cost_price?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{product.selling_price?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={product.margin_percentage > 20 ? "default" : "secondary"}
                                 className={product.margin_percentage > 20 ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}>
                            {product.margin_percentage?.toFixed(1) || "0.0"}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{product.monthly_sales || 0}</TableCell>
                        <TableCell className="text-right">{product.inventory || 0}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="text-horizon-accent hover:text-horizon-primary">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-300">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isModalOpen && editingProduct && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl">ערוך מוצר: {editingProduct.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              {[
                { label: "שם מוצר", field: "name", type: "text" },
                { label: "קטגוריה", field: "category", type: "text" },
                { label: "ספק", field: "supplier", type: "text" },
                { label: "מחיר עלות (₪)", field: "cost_price", type: "number" },
                { label: "מחיר מכירה (₪)", field: "selling_price", type: "number" },
                { label: "מכירות חודשיות (יחידות)", field: "monthly_sales", type: "number" },
                { label: "כמות במלאי", field: "inventory", type: "number" },
              ].map(({label, field, type}) => (
                <div key={field} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={field} className="text-right col-span-1">{label}</Label>
                  <Input
                    id={field}
                    type={type}
                    value={editingProduct[field] || ''}
                    onChange={(e) => handleModalInputChange(field, type === 'number' ? e.target.value : e.target.value)}
                    className="col-span-3 bg-horizon-card border-horizon"
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-horizon text-horizon-accent hover:bg-horizon-card">ביטול</Button>
              <Button onClick={handleSaveEdit} className="btn-horizon-primary">שמור שינויים</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
