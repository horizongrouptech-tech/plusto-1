import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Link as LinkIcon, AlertCircle } from "lucide-react";
import { formatCurrency } from './utils/numberFormatter';

function findBestMatch(zProduct, servicesList, existingMapping) {
  // 1. Existing manual mapping
  if (existingMapping && existingMapping[zProduct.product_name]) {
    return existingMapping[zProduct.product_name];
  }

  const zBarcode = zProduct.barcode ? zProduct.barcode.toString().trim() : '';
  const normalizedName = zProduct.product_name.toLowerCase().trim();
  
  for (const service of servicesList) {
    // 2. Barcode Match (Exact)
    if (zBarcode) {
      // Check against catalog_product_id (often used as SKU/Barcode)
      if (service.catalog_product_id && service.catalog_product_id.toString().trim() === zBarcode) {
        return service.service_name;
      }
      // Check against explicit barcode field if it exists
      if (service.barcode && service.barcode.toString().trim() === zBarcode) {
        return service.service_name;
      }
      // Check against item_code field if it exists
      if (service.item_code && service.item_code.toString().trim() === zBarcode) {
        return service.service_name;
      }
    }

    // 3. Name Match (Exact & Fuzzy)
    const serviceName = service.service_name.toLowerCase().trim();
    
    if (serviceName === normalizedName) {
      return service.service_name;
    }
    
    if (serviceName.includes(normalizedName) || normalizedName.includes(serviceName)) {
      return service.service_name;
    }
  }
  
  return null;
}

export default function ZReportProductMapper({ zProducts, services, existingMapping, onMappingComplete, onCancel }) {
  const [mapping, setMapping] = useState({});
  const [unmappedCount, setUnmappedCount] = useState(0);
  const lastMappingCacheRef = React.useRef(null);

  useEffect(() => {
    // ✅ מניעת חישובים מיותרים
    const productsKey = zProducts.map(p => p.product_name).sort().join('|');
    const servicesKey = services.map(s => s.service_name).sort().join('|');
    const cacheKey = `${productsKey}_${servicesKey}`;
    
    if (lastMappingCacheRef.current === cacheKey) {
      console.log('✅ Mapping unchanged, skipping recalculation');
      return;
    }
    
    lastMappingCacheRef.current = cacheKey;

    const initialMapping = {};
    let unmapped = 0;

    zProducts.forEach(product => {
      const match = findBestMatch(product, services, existingMapping);
      if (match) {
        initialMapping[product.product_name] = match;
      } else {
        unmapped++;
      }
    });

    setMapping(initialMapping);
    setUnmappedCount(unmapped);
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

  const handleConfirm = () => {
    onMappingComplete(mapping);
  };

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-horizon-primary" />
          התאמת מוצרים מדוח Z
        </CardTitle>
        <p className="text-sm text-horizon-accent">
          התאם את המוצרים מהדוח למוצרים בתחזית שלך
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="max-h-96 overflow-y-auto space-y-2">
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

        <div className="flex justify-end gap-3 pt-4 border-t border-horizon">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-horizon text-horizon-text"
          >
            ביטול
          </Button>
          <Button
            onClick={handleConfirm}
            className="btn-horizon-primary"
          >
            <CheckCircle className="w-4 h-4 ml-2" />
            ייבא נתונים ({zProducts.length - unmappedCount} מוצרים)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}