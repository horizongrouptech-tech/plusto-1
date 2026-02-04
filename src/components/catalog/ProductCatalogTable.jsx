import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, ShoppingCart, Package, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import Pagination from "../shared/Pagination";

export default function ProductCatalogTable({
  products,
  onEdit,
  onDelete,
  isAdmin = false,
  disableActions = false
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // הגדלנו ל-100 לתצוגה טובה יותר

  // חישוב עמודים
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = products.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // גלילה לראש הטבלה
    document.querySelector('.product-catalog-table')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getDataQualityBadge = (quality) => {
    switch (quality) {
      case 'complete':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 ml-1" />מלא</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 ml-1" />חלקי</Badge>;
      case 'incomplete':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><AlertTriangle className="w-3 h-3 ml-1" />חסר</Badge>;
      default:
        return <Badge variant="outline">לא ידוע</Badge>;
    }
  };

  const getSourceBadge = (product) => {
    if (product.is_recommended) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">מומלץ</Badge>;
    }
    if (product.is_suggested || product.data_source === 'ai_suggestion') {
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">הצעת AI</Badge>;
    }
    return <Badge variant="outline" className="text-horizon-text border-horizon">קיים</Badge>;
  };

  if (products.length === 0) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
          <h3 className="text-xl font-semibold text-horizon-text mb-2">
            אין מוצרים להצגה
          </h3>
          <p className="text-horizon-accent">
            השתמש בסינונים או הוסף מוצרים חדשים לקטלוג
          </p>
        </CardContent>
      </Card>);

  }

  return (
    <div className="space-y-4 product-catalog-table">
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-horizon-primary" />
              קטלוג מוצרים
            </div>
            <div className="text-sm text-horizon-accent">
              מציג {startIndex + 1}-{Math.min(endIndex, products.length)} מתוך {products.length.toLocaleString()} מוצרים (עמוד {currentPage} מתוך {totalPages})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="border-b-horizon">
                  <TableHead className="text-right text-horizon-text">שם המוצר</TableHead>
                  <TableHead className="text-right text-horizon-text">ברקוד</TableHead>
                  <TableHead className="text-right text-horizon-text">מחיר קנייה</TableHead>
                  <TableHead className="text-right text-horizon-text">מחיר מכירה</TableHead>
                  <TableHead className="text-right text-horizon-text">רווח גולמי</TableHead>
                  <TableHead className="text-right text-horizon-text">אחוז רווח</TableHead>
                  <TableHead className="text-right text-horizon-text">רווח גולמי / מחיר מכירה</TableHead>
                  <TableHead className="text-right text-horizon-text">קטגוריה</TableHead>
                  <TableHead className="text-right text-horizon-text">ספק</TableHead>
                  <TableHead className="text-right text-horizon-text">מלאי</TableHead>
                  <TableHead className="text-right text-horizon-text">איכות נתונים</TableHead>
                  <TableHead className="text-right text-horizon-text">מקור</TableHead>
                  {!disableActions && <TableHead className="text-right text-horizon-text">פעולות</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product) => {
                  const costPrice = parseFloat(product.cost_price) || 0;
                  const sellingPrice = parseFloat(product.selling_price) || 0;
                  const grossProfit = sellingPrice - costPrice;
                  const grossProfitPercent = sellingPrice > 0 
                    ? ((grossProfit / sellingPrice) * 100).toFixed(1)
                    : 0;
                  const hasCostPrice = costPrice > 0;
                  
                  return (
                  <TableRow 
                    key={product.id} 
                    className={`border-b-horizon/50 hover:bg-horizon-card/30 ${!hasCostPrice ? 'bg-yellow-500/10 border-r-4 border-r-yellow-500' : ''}`}
                  >
                    <TableCell className="font-medium text-horizon-text">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-horizon-primary" />
                        {product.product_name}
                        {!hasCostPrice && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 mr-2 animate-pulse">
                            <AlertTriangle className="w-3 h-3 ml-1" />
                            ⚠️ חסר מחיר קנייה
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-horizon-accent font-mono text-sm">
                      {product.barcode || '-'}
                    </TableCell>
                    <TableCell className="text-horizon-text font-medium">
                      {hasCostPrice ? `₪${costPrice.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-horizon-text font-medium">
                      ₪{product.selling_price ? product.selling_price.toLocaleString() : '0'}
                    </TableCell>
                    <TableCell className="text-green-400 font-medium">
                      ₪{product.gross_profit ? product.gross_profit.toLocaleString() : '0'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 font-medium">
                          {product.profit_percentage ? `${Math.round(product.profit_percentage)}%` : '0%'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={grossProfitPercent > 30 ? 'text-green-400' : grossProfitPercent > 15 ? 'text-yellow-400' : 'text-red-400'}>
                        {grossProfitPercent}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-horizon-accent border-horizon">
                        {product.category || 'לא מוגדר'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-horizon-accent">
                      {product.supplier || 'לא מוגדר'}
                    </TableCell>
                    <TableCell className="text-horizon-accent">
                      {product.inventory || '0'} יח'
                    </TableCell>
                    <TableCell>
                      {getDataQualityBadge(product.data_quality)}
                    </TableCell>
                    <TableCell>
                      {getSourceBadge(product)}
                    </TableCell>
                    {!disableActions &&
                  <TableCell>
                        <div className="flex gap-1">
                          <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(product)}
                        disabled={disableActions}
                        className="h-8 w-8 text-horizon-primary hover:text-horizon-primary hover:bg-horizon-primary/20">

                            <Edit className="w-3 h-3" />
                          </Button>
                          {isAdmin &&
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(product.id)}
                        disabled={disableActions}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20">

                              <Trash2 className="w-3 h-3" />
                            </Button>
                      }
                        </div>
                      </TableCell>
                  }
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 &&
      <div className="flex justify-center">
          <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange} />

        </div>
      }
    </div>);

}