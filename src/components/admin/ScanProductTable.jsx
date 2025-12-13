import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DollarSign, ExternalLink, Info, Eye, X, Check, ShoppingCart, Star, Clock, AlertCircle } from "lucide-react";
import Pagination from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 10;

export default function ScanProductTable({ products }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!products || products.length === 0) {
    return <div className="p-4 text-center text-horizon-accent">לא נמצאו מוצרים.</div>;
  }

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedProducts = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'N/A';
    return `₪${value.toLocaleString()}`;
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table className="min-w-full divide-y divide-horizon/50">
          <TableHeader>
            <TableRow className="bg-horizon-card">
              <TableHead className="py-3 px-4 text-right text-sm font-semibold text-horizon-accent">שם המוצר</TableHead>
              <TableHead className="py-3 px-4 text-right text-sm font-semibold text-horizon-accent">קטגוריה</TableHead>
              <TableHead className="py-3 px-4 text-right text-sm font-semibold text-horizon-accent">מחיר</TableHead>
              <TableHead className="py-3 px-4 text-right text-sm font-semibold text-horizon-accent">מותג</TableHead>
              <TableHead className="py-3 px-4 text-right text-sm font-semibold text-horizon-accent">סטטוס</TableHead>
              <TableHead className="py-3 px-4 text-right text-sm font-semibold text-horizon-accent">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-horizon/30">
            {paginatedProducts.map((product) => (
              <TableRow key={product.product_id || product.name} className="hover:bg-horizon-card/20">
                <TableCell className="py-3 px-4 text-horizon-text font-medium min-w-[200px]">
                  <div className="flex items-center gap-3">
                    {product.images && product.images.length > 0 && (
                      <img src={product.images[0].startsWith('http') ? product.images[0] : `https://zolss.com/images/${product.images[0]}`} alt={product.name} className="w-10 h-10 object-cover rounded-md" />
                    )}
                    {product.name}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-4 text-horizon-accent text-sm min-w-[120px]">
                  <Badge variant="outline" className="border-horizon-secondary text-horizon-text">{product.category}</Badge>
                </TableCell>
                <TableCell className="py-3 px-4 text-horizon-text text-sm min-w-[100px]">
                  {product.price?.is_on_sale ? (
                    <div className="flex flex-col">
                      <span className="text-red-500 font-semibold">{formatCurrency(product.price.current_price)}</span>
                      <span className="line-through text-horizon-accent text-xs">{formatCurrency(product.price.original_price)}</span>
                    </div>
                  ) : (
                    formatCurrency(product.price?.current_price)
                  )}
                </TableCell>
                <TableCell className="py-3 px-4 text-horizon-accent text-sm min-w-[80px]">{product.brand || 'לא צוין'}</TableCell>
                <TableCell className="py-3 px-4 text-sm min-w-[80px]">
                  {product.availability?.in_stock ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Check className="w-3 h-3 ml-1" /> זמין</Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><X className="w-3 h-3 ml-1" />אזל</Badge>
                  )}
                </TableCell>
                <TableCell className="py-3 px-4 text-right min-w-[100px]">
                  <Button variant="ghost" size="sm" onClick={() => openProductModal(product)} className="text-horizon-primary hover:bg-horizon-primary/20">
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Product Details Modal */}
      {selectedProduct && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-xl bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-horizon-primary">{selectedProduct.name}</DialogTitle>
              <DialogDescription className="text-horizon-accent">פרטים מורחבים על המוצר</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="w-full h-64 overflow-hidden rounded-lg">
                  <img 
                    src={selectedProduct.images[0].startsWith('http') ? selectedProduct.images[0] : `https://zolss.com/images/${selectedProduct.images[0]}`} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-horizon-text font-semibold flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4" /> מחיר</h4>
                  {selectedProduct.price?.is_on_sale ? (
                    <div className="flex flex-col">
                      <span className="text-red-500 text-xl font-bold">{formatCurrency(selectedProduct.price.current_price)}</span>
                      <span className="line-through text-horizon-accent text-sm">{formatCurrency(selectedProduct.price.original_price)}</span>
                      <Badge className="bg-orange-500/20 text-orange-400 mt-1">מבצע! {selectedProduct.price.discount_percentage}% הנחה</Badge>
                    </div>
                  ) : (
                    <span className="text-horizon-text text-xl font-bold">{formatCurrency(selectedProduct.price?.current_price)}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-horizon-text font-semibold flex items-center gap-2 mb-2"><ShoppingCart className="w-4 h-4" /> קטגוריה</h4>
                  <Badge variant="outline" className="border-horizon-secondary text-horizon-text">{selectedProduct.category}</Badge>
                  {selectedProduct.subcategory && <Badge variant="outline" className="border-horizon-accent text-horizon-accent mr-2">{selectedProduct.subcategory}</Badge>}
                </div>
              </div>
              <div>
                <h4 className="text-horizon-text font-semibold flex items-center gap-2 mb-2"><Info className="w-4 h-4" /> תיאור</h4>
                <p className="text-horizon-accent text-sm whitespace-pre-line">{selectedProduct.description || selectedProduct.short_description || 'אין תיאור זמין.'}</p>
              </div>
              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div>
                  <h4 className="text-horizon-text font-semibold flex items-center gap-2 mb-2"><Clock className="w-4 h-4" /> מפרט טכני</h4>
                  <ul className="list-disc pr-5 text-horizon-accent text-sm space-y-1">
                    {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                      <li key={key}><strong>{key}:</strong> {value}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedProduct.availability && (
                <div>
                  <h4 className="text-horizon-text font-semibold flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" /> זמינות</h4>
                  <p className="text-horizon-accent text-sm">
                    {selectedProduct.availability.in_stock ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Check className="w-3 h-3 ml-1" /> במלאי</Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><X className="w-3 h-3 ml-1" />אזל מהמלאי</Badge>
                    )}
                    {selectedProduct.availability.stock_status && <span className="mr-2">{selectedProduct.availability.stock_status}</span>}
                    {selectedProduct.availability.delivery_info && <span className="mr-2">({selectedProduct.availability.delivery_info})</span>}
                  </p>
                </div>
              )}
              {selectedProduct.reviews && selectedProduct.reviews.has_reviews && (
                <div>
                  <h4 className="text-horizon-text font-semibold flex items-center gap-2 mb-2"><Star className="w-4 h-4" /> דירוגים</h4>
                  <p className="text-horizon-accent text-sm">
                    <span className="font-bold text-horizon-text">{selectedProduct.reviews.rating}</span> מתוך 5 כוכבים ({selectedProduct.reviews.review_count} חוות דעת)
                  </p>
                </div>
              )}
            </div>
            {selectedProduct.url && (
              <div className="flex justify-end pt-4 border-t border-horizon">
                <Button variant="outline" className="btn-horizon-secondary" asChild>
                  <a href={selectedProduct.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 ml-2" />
                    עבור לדף המוצר
                  </a>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}