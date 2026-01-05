import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Link as LinkIcon, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from './utils/numberFormatter';

// ✅ יצירת Hash Maps לחיפוש מהיר O(1)
function createServiceLookupMaps(servicesList) {
  const byCatalogId = new Map();
  const byBarcode = new Map();
  const byItemCode = new Map();
  const byExactName = new Map();
  const byNormalizedName = new Map();

  servicesList.forEach(service => {
    const serviceName = service.service_name;
    
    if (service.catalog_product_id) {
      byCatalogId.set(service.catalog_product_id.toString().trim(), serviceName);
    }
    if (service.barcode) {
      byBarcode.set(service.barcode.toString().trim(), serviceName);
    }
    if (service.item_code) {
      byItemCode.set(service.item_code.toString().trim(), serviceName);
    }
    
    const normalized = serviceName.toLowerCase().trim();
    byExactName.set(normalized, serviceName);
    
    // לחיפוש חלקי - שומר את כל המילים
    normalized.split(' ').forEach(word => {
      if (word.length > 2) {
        if (!byNormalizedName.has(word)) {
          byNormalizedName.set(word, []);
        }
        byNormalizedName.get(word).push(serviceName);
      }
    });
  });

  return { byCatalogId, byBarcode, byItemCode, byExactName, byNormalizedName };
}

function findBestMatch(zProduct, lookupMaps, existingMapping) {
  // 1. Existing manual mapping
  if (existingMapping && existingMapping[zProduct.product_name]) {
    return existingMapping[zProduct.product_name];
  }

  const { byCatalogId, byBarcode, byItemCode, byExactName, byNormalizedName } = lookupMaps;
  const zBarcode = zProduct.barcode ? zProduct.barcode.toString().trim() : '';
  const normalizedName = zProduct.product_name.toLowerCase().trim();

  // 2. Barcode Match (O(1) lookup)
  if (zBarcode) {
    if (byCatalogId.has(zBarcode)) return byCatalogId.get(zBarcode);
    if (byBarcode.has(zBarcode)) return byBarcode.get(zBarcode);
    if (byItemCode.has(zBarcode)) return byItemCode.get(zBarcode);
  }

  // 3. Exact Name Match (O(1) lookup)
  if (byExactName.has(normalizedName)) {
    return byExactName.get(normalizedName);
  }

  // 4. Partial Name Match (חיפוש מהיר יותר)
  const words = normalizedName.split(' ').filter(w => w.length > 2);
  for (const word of words) {
    if (byNormalizedName.has(word)) {
      const matches = byNormalizedName.get(word);
      if (matches.length === 1) {
        return matches[0];
      }
    }
  }
  
  return null;
}

export default function ZReportProductMapper({ zProducts, services, existingMapping, onMappingComplete, onCancel }) {
  const [mapping, setMapping] = useState({});
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isAutoMapping, setIsAutoMapping] = useState(true);
  const [autoMappingProgress, setAutoMappingProgress] = useState(0);

  useEffect(() => {
    // 🚀 Auto-Mapping אסינכרוני ב-chunks כדי לא לחסום את ה-UI
    const performAutoMapping = async () => {
      setIsAutoMapping(true);
      setAutoMappingProgress(0);
      
      // יצירת hash maps פעם אחת לכל ה-services
      const lookupMaps = createServiceLookupMaps(services);
      
      const initialMapping = {};
      let unmapped = 0;
      const CHUNK_SIZE = 100;
      const totalProducts = zProducts.length;

      for (let i = 0; i < totalProducts; i += CHUNK_SIZE) {
        const chunk = zProducts.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(product => {
          const match = findBestMatch(product, lookupMaps, existingMapping);
          if (match) {
            initialMapping[product.product_name] = match;
          } else {
            unmapped++;
          }
        });

        // עדכון התקדמות
        const progress = Math.min(((i + CHUNK_SIZE) / totalProducts) * 100, 100);
        setAutoMappingProgress(progress);
        
        // תן ל-UI להתעדכן
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setMapping(initialMapping);
      setUnmappedCount(unmapped);
      setIsAutoMapping(false);
      console.log(`✅ Auto-mapping completed: ${Object.keys(initialMapping).length} matched, ${unmapped} unmatched`);
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

  const handleConfirm = async () => {
    setIsConfirming(true);
    setProcessingProgress(0);

    try {
      // תן ל-UI להתעדכן עם ה-loading state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // קריאה ל-callback עם המיפוי והעברת פונקציית progress
      await onMappingComplete(mapping, (progress) => {
        setProcessingProgress(progress);
      });
      
      // הפונקציה הצליחה - הרכיב יסגר מ-Step3
    } catch (error) {
      console.error('Error during confirmation:', error);
      alert('שגיאה בעיבוד המיפוי: ' + error.message);
      setIsConfirming(false);
      setProcessingProgress(0);
    }
  };

  return (
    <>
      {/* Loading Overlay - Auto-Mapping */}
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

      {/* Loading Overlay - Confirming Data */}
      {isConfirming && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-horizon-card border-2 border-horizon-primary rounded-2xl p-8 shadow-2xl max-w-md mx-4">
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-horizon-primary mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-horizon-text mb-2">
                  {processingProgress < 80 ? 'מייבא מוצרים לתחזית...' : 
                   processingProgress < 95 ? 'שומר לדאטהבייס...' : 
                   'משלים...'}
                </h3>
                <p className="text-sm text-horizon-accent">אנא המתן, זה עשוי לקחת מספר שניות</p>
              </div>
              <Progress value={processingProgress} className="h-3" />
              <p className="text-2xl font-bold text-horizon-primary">
                {processingProgress.toFixed(0)}%
              </p>
              <p className="text-xs text-horizon-accent mt-2">
                ⚠️ אל תסגור את הדפדפן
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
          <div className="max-h-[50vh] overflow-y-auto space-y-2 border border-horizon rounded-lg p-2">
            {zProducts.map((zProduct, idx) => (
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