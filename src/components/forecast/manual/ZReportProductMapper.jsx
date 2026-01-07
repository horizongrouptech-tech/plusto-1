import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle, Link as LinkIcon, AlertCircle, Search, Filter, ChevronLeft, ChevronRight, Zap } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'mapped', 'unmapped'
  const [currentPage, setCurrentPage] = useState(1);
  const lastMappingCacheRef = React.useRef(null);
  
  const ITEMS_PER_PAGE = 50;

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

  const handleAcceptAll = () => {
    if (confirm(`להתאים אוטומטית את כל ${zProducts.length - unmappedCount} המוצרים שזוהו?`)) {
      onMappingComplete(mapping);
    }
  };

  // פילטור וחיפוש
  const filteredProducts = zProducts.filter(zProduct => {
    const matchesSearch = !searchTerm || 
      zProduct.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (zProduct.barcode && zProduct.barcode.toString().includes(searchTerm));
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'mapped' && mapping[zProduct.product_name]) ||
      (filterStatus === 'unmapped' && !mapping[zProduct.product_name]);
    
    return matchesSearch && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const autoMappedCount = zProducts.length - unmappedCount;
  const autoMappedPercentage = Math.round((autoMappedCount / zProducts.length) * 100);

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
        {/* סטטיסטיקות מיפוי */}
        <div className="bg-horizon-card/30 border border-horizon rounded-lg p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex gap-3">
              <Badge variant="outline" className="border-green-500 text-green-400">
                <CheckCircle className="w-3 h-3 ml-1" />
                {autoMappedCount} הותאמו אוטומטית ({autoMappedPercentage}%)
              </Badge>
              {unmappedCount > 0 && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                  <AlertCircle className="w-3 h-3 ml-1" />
                  {unmappedCount} דורשים התאמה ידנית
                </Badge>
              )}
            </div>
            {autoMappedCount > 0 && (
              <Button
                onClick={handleAcceptAll}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Zap className="w-4 h-4 ml-1" />
                אשר את כל ההתאמות האוטומטיות
              </Button>
            )}
          </div>
          
          {/* Progress bar של מיפוי */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-horizon-accent">
              <span>התקדמות מיפוי</span>
              <span>{autoMappedCount} / {zProducts.length}</span>
            </div>
            <div className="w-full bg-horizon-dark rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${autoMappedPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* חיפוש ופילטור */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
            <Input
              type="text"
              placeholder="חפש מוצר לפי שם או ברקוד..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-horizon-card border-horizon text-horizon-text pr-10"
            />
          </div>
          <div className="flex gap-2 bg-horizon-card/50 rounded-lg p-1 border border-horizon">
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'default' : 'ghost'}
              onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
              className={filterStatus === 'all' ? 'bg-horizon-primary text-white' : 'text-horizon-text'}
            >
              הכל
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'mapped' ? 'default' : 'ghost'}
              onClick={() => { setFilterStatus('mapped'); setCurrentPage(1); }}
              className={filterStatus === 'mapped' ? 'bg-green-600 text-white' : 'text-horizon-text'}
            >
              מאופה
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'unmapped' ? 'default' : 'ghost'}
              onClick={() => { setFilterStatus('unmapped'); setCurrentPage(1); }}
              className={filterStatus === 'unmapped' ? 'bg-yellow-600 text-white' : 'text-horizon-text'}
            >
              לא ממופה
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {currentProducts.map((zProduct, idx) => (
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-horizon">
            <div className="text-sm text-horizon-accent">
              מציג {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} מתוך {filteredProducts.length} מוצרים
              {searchTerm && ` (סונן מתוך ${zProducts.length})`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-horizon text-horizon-text"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-sm text-horizon-text px-3">
                עמוד {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-horizon text-horizon-text"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

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