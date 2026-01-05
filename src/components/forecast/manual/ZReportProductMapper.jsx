import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Link as LinkIcon, AlertCircle, Loader2, Search, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { formatCurrency } from './utils/numberFormatter';
import { base44 } from "@/api/base44Client";

export default function ZReportProductMapper({ zProducts, services, existingMapping, onMappingComplete, onCancel }) {
  const [mapping, setMapping] = useState({});
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(true);
  const [autoMappingProgress, setAutoMappingProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    // 🚀 Auto-Mapping בצד השרת - לא חוסם את ה-UI!
    const performAutoMapping = async () => {
      setIsAutoMapping(true);
      setAutoMappingProgress(10);
      
      try {
        console.log(`🗺️ Sending ${zProducts.length} products to server for auto-mapping...`);
        
        const response = await base44.functions.invoke('autoMapZReportProducts', {
          zProducts,
          services,
          existingMapping
        });

        setAutoMappingProgress(80);

        if (!response.data.success) {
          throw new Error(response.data.error || 'שגיאה במיפוי');
        }

        setMapping(response.data.mapping);
        setUnmappedCount(response.data.unmatched);
        setAutoMappingProgress(100);

        console.log(`✅ Server auto-mapping completed: ${response.data.matched} matched, ${response.data.unmatched} unmatched`);

        await new Promise(resolve => setTimeout(resolve, 300));
        setIsAutoMapping(false);

      } catch (error) {
        console.error('❌ Error in auto-mapping:', error);
        setIsAutoMapping(false);
        alert('שגיאה במיפוי אוטומטי: ' + error.message);
      }
    };

    performAutoMapping();
  }, [zProducts, services, existingMapping]);

  const handleMappingChange = (zProductName, serviceName) => {
    setMapping(prev => {
      const updated = { ...prev };
      
      if (serviceName === 'skip') {
        delete updated[zProductName];
      } else {
        updated[zProductName] = serviceName;
      }
      
      const newUnmappedCount = zProducts.filter(p => !updated[p.product_name]).length;
      setUnmappedCount(newUnmappedCount);
      
      return updated;
    });
  };

  // סינון ו-pagination
  const filteredProducts = zProducts.filter(p => 
    !mapping[p.product_name] && 
    (searchTerm === '' || p.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  const handleSkipAll = () => {
    if (confirm(`האם לדלג על ${unmappedCount} מוצרים לא ממופים?\nרק ${zProducts.length - unmappedCount} מוצרים ייכנסו לתחזית.`)) {
      onMappingComplete(mapping);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);

    try {
      // קריאה ל-callback עם המיפוי (ללא progress - זה יהיה בצד השרת)
      await onMappingComplete(mapping);
      
      // הפונקציה הצליחה - הרכיב יסגר מ-Step3
    } catch (error) {
      console.error('Error during confirmation:', error);
      alert('שגיאה בעיבוד המיפוי: ' + error.message);
      setIsConfirming(false);
    }
  };

  return (
    <>
      {/* Loading Overlay - Auto-Mapping בלבד */}
      {isAutoMapping && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-horizon-card border-2 border-horizon-primary rounded-2xl p-8 shadow-2xl max-w-md mx-4">
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-horizon-primary mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-horizon-text mb-2">
                  מתאים מוצרים אוטומטית...
                </h3>
                <p className="text-sm text-horizon-accent">מעבד {zProducts.length} מוצרים מדוח Z</p>
              </div>
              <Progress value={autoMappingProgress} className="h-3" />
              <p className="text-2xl font-bold text-horizon-primary">
                {autoMappingProgress.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}
      
      <Card className="card-horizon max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-horizon-primary" />
            התאמת מוצרים מדוח Z
          </CardTitle>
          <p className="text-sm text-horizon-accent">
            התאם את המוצרים מהדוח למוצרים בתחזית שלך
          </p>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 overflow-y-auto">
        {!isAutoMapping && (
          <div className="flex gap-3 mb-4">
            <Badge variant="outline" className="border-green-500 text-green-400">
              <CheckCircle className="w-3 h-3 ml-1" />
              {zProducts.length - unmappedCount} הותאמו אוטומטית
            </Badge>
            {unmappedCount > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                <AlertCircle className="w-3 h-3 ml-1" />
                {unmappedCount} דורשים התאמה ידנית
              </Badge>
            )}
          </div>
        )}

        {!isAutoMapping && (
          <>
            <div className="flex gap-3 items-center mb-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                <Input
                  placeholder="חפש מוצר..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pr-10 bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <Button
                onClick={handleSkipAll}
                variant="outline"
                className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
              >
                <SkipForward className="w-4 h-4 ml-2" />
                דלג על כל הלא ממופים ({unmappedCount})
              </Button>
            </div>

            <div className="max-h-[40vh] overflow-y-auto space-y-2 border border-horizon rounded-lg p-2">
              {paginatedProducts.map((zProduct, idx) => (
            <div key={idx} className="bg-horizon-card/30 border border-horizon rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-horizon-text">{zProduct.product_name}</p>
                  <p className="text-xs text-horizon-accent">
                    {zProduct.quantity_sold} יחידות • {formatCurrency(zProduct.revenue_with_vat)}
                  </p>
                </div>

                <div className="w-64">
                  <Select
                    value={mapping[zProduct.product_name] || 'skip'}
                    onValueChange={(value) => handleMappingChange(zProduct.product_name, value)}
                  >
                    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text text-sm">
                      <SelectValue placeholder="בחר מוצר..." />
                    </SelectTrigger>
                    <SelectContent className="bg-horizon-card border-horizon">
                      <SelectItem value="skip" className="text-horizon-accent">
                        דלג על מוצר זה
                      </SelectItem>
                      {services.map((service, sIdx) => (
                        <SelectItem key={sIdx} value={service.service_name} className="text-horizon-text">
                          {service.service_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>
            ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-horizon">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-horizon text-horizon-text"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <span className="text-sm text-horizon-accent">
                עמוד {currentPage} מתוך {totalPages} ({filteredProducts.length} מוצרים)
              </span>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-horizon text-horizon-text"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            )}
            </>
            )}

        <div className="flex justify-end gap-3 pt-4 border-t border-horizon">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isConfirming || isAutoMapping}
            className="border-horizon text-horizon-text"
          >
            ביטול
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || isAutoMapping}
            className="btn-horizon-primary"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מייבא נתונים...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 ml-2" />
                אשר נתונים ({zProducts.length - unmappedCount} מוצרים)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  );
}