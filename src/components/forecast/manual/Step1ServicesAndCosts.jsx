import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Package,
  AlertCircle,
  Loader2,
  CheckCircle,
  Percent,
  TrendingUp,
  Search,
  Save
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency } from './utils/numberFormatter';

import SaveProgressIndicator from './SaveProgressIndicator';
import Pagination from '@/components/shared/Pagination';
import { toast } from "sonner";
import { Catalog, ManualForecast, ProductCatalog } from '@/api/entities';

const CATALOG_PICKER_PAGE_SIZE = 100;

function CatalogProductPicker({ value, onSelect, products, isLoading, onTriggerLoad }) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(1);

  const selectedProduct = React.useMemo(() => {
    if (!value || value === 'none') return null;
    return products.find(p => p.id === value);
  }, [value, products]);

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.product_name?.toLowerCase().includes(term) ||
      p.catalog_name?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / CATALOG_PICKER_PAGE_SIZE);
  const paginatedProducts = React.useMemo(() => {
    const start = (page - 1) * CATALOG_PICKER_PAGE_SIZE;
    return filteredProducts.slice(start, start + CATALOG_PICKER_PAGE_SIZE);
  }, [filteredProducts, page]);

  // Reset page when search changes
  React.useEffect(() => { setPage(1); }, [searchTerm]);

  const handleOpen = (isOpen) => {
    setOpen(isOpen);
    if (isOpen) {
      onTriggerLoad();
      setSearchTerm('');
      setPage(1);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-horizon-card border-horizon text-horizon-text h-9 text-sm mb-2 font-normal"
        >
          <span className="truncate text-right">
            {isLoading ? 'טוען מוצרים...' : selectedProduct ? selectedProduct.product_name : 'שייך למוצר מהקטלוג (אופציונלי)'}
          </span>
          <ChevronDown className="w-4 h-4 mr-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-horizon-dark border-horizon" align="start" dir="rtl">
        {/* חיפוש */}
        <div className="p-3 border-b border-horizon">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש מוצר..."
              className="bg-horizon-card border-horizon text-horizon-text pr-9 h-8 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* רשימת מוצרים */}
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-horizon-primary ml-2" />
              <span className="text-sm text-horizon-accent">טוען מוצרים מהקטלוג...</span>
            </div>
          ) : (
            <>
              <button
                className="w-full text-right px-3 py-2 text-sm hover:bg-horizon-card/50 text-horizon-accent transition-colors"
                onClick={() => { onSelect('none'); setOpen(false); }}
              >
                ללא שיוך לקטלוג
              </button>
              {paginatedProducts.length === 0 && !isLoading && (
                <div className="text-center py-4 text-sm text-horizon-accent">
                  {searchTerm ? 'לא נמצאו מוצרים' : 'אין מוצרים בקטלוג'}
                </div>
              )}
              {paginatedProducts.map((product) => (
                <button
                  key={product.id}
                  className={`w-full text-right px-3 py-2 text-sm hover:bg-horizon-card/50 transition-colors ${
                    value === product.id ? 'bg-horizon-primary/10 text-horizon-primary' : 'text-horizon-text'
                  }`}
                  onClick={() => { onSelect(product.id); setOpen(false); }}
                >
                  {product.product_name} {product.catalog_name ? <span className="text-horizon-accent text-xs">({product.catalog_name})</span> : ''}
                </button>
              ))}
            </>
          )}
        </div>

        {/* ניווט בין עמודים */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-between p-2 border-t border-horizon text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-7 text-xs text-horizon-accent"
            >
              <ChevronRight className="w-3 h-3 ml-1" />
              הקודם
            </Button>
            <span className="text-horizon-accent text-xs">
              עמוד {page} מתוך {totalPages} ({filteredProducts.length} מוצרים)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-7 text-xs text-horizon-accent"
            >
              הבא
              <ChevronLeft className="w-3 h-3 mr-1" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function Step1ServicesAndCosts({ forecastData, onUpdateForecast, onNext, onBack }) {
  const initialCalcDone = React.useRef(false);
  const [services, setServices] = useState(forecastData.services || []);
  const [collapsedServices, setCollapsedServices] = useState(() => {
    const initial = {};
    (forecastData.services || []).forEach((_, idx) => {
      initial[idx] = true;
    });
    return initial;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  
  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50; // הצג 50 מוצרים בכל פעם
  
  // ⭐ State לבחירת קטלוג
  const [selectedCatalogForLoad, setSelectedCatalogForLoad] = useState(null);
  const [availableCatalogs, setAvailableCatalogs] = useState([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [isLoadingCatalogProducts, setIsLoadingCatalogProducts] = useState(false);
  
  // ⭐ State לטעינת כל המוצרים מכל הקטלוגים (לשיוך שירותים)
  const [allCatalogProducts, setAllCatalogProducts] = useState([]);
  const [isLoadingAllProducts, setIsLoadingAllProducts] = useState(false);
  const [catalogProductsLoaded, setCatalogProductsLoaded] = useState(false); // lazy loading flag

  // חישוב מלא רק בטעינה ראשונית -- שינויים בודדים מחושבים ב-updateService/recalculateServiceProfitability
  useEffect(() => {
    if (initialCalcDone.current) return;
    initialCalcDone.current = true;

    const servicesFromData = forecastData.services || [];
    
    let hasChanges = false;
    const recalculatedServices = servicesFromData.map((service) => {
      if (service.calculated && 
          service.calculated.cost_of_sale !== undefined &&
          service.calculated.gross_profit !== undefined) {
        return service;
      }
      
      hasChanges = true;
      const updatedService = { ...service };
      const VAT_RATE = 0.17;
      const rawPrice = parseFloat(updatedService.price) || 0;
      const netPrice = updatedService.has_vat ? rawPrice / (1 + VAT_RATE) : rawPrice;
      
      let totalCost = 0;
      (updatedService.costs || []).forEach(cost => {
        if (cost.is_percentage) {
          totalCost += (netPrice * (parseFloat(cost.percentage_of_price) || 0)) / 100;
        } else {
          const rawCostAmount = parseFloat(cost.amount) || 0;
          const netCostAmount = cost.has_vat ? rawCostAmount / (1 + VAT_RATE) : rawCostAmount;
          totalCost += netCostAmount;
        }
      });

      const grossProfit = netPrice - totalCost;
      const grossMarginPercentage = netPrice > 0 ? ((grossProfit / netPrice) * 100) : 0;

      updatedService.calculated = {
        cost_of_sale: totalCost,
        gross_profit: grossProfit,
        gross_margin_percentage: grossMarginPercentage
      };
      
      return updatedService;
    });
    
    setServices(recalculatedServices);
    
    if (hasChanges && onUpdateForecast) {
      onUpdateForecast({ services: recalculatedServices });
    }
  }, [forecastData.services]);

  // ⭐ טעינת קטלוגים עם caching
  const loadCatalogs = useCallback(async () => {
    if (!forecastData?.customer_email) {
      console.log('❌ No customer_email in forecastData');
      return;
    }

    // ✅ בדיקת cache תחילה
    const cacheKey = `catalogs_${forecastData.customer_email}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // אם Cache חדש מ-5 דקות - השתמש בו
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log('✅ Using cached catalogs');
          setAvailableCatalogs(data);
          return;
        }
      } catch (e) {
        // cache לא תקין - המשך לטעינה רגילה
      }
    }

    console.log('🔍 Loading catalogs for customer:', forecastData.customer_email);
    setIsLoadingCatalogs(true);
    
    try {
      const fetchedCatalogs = await Catalog.filter({ 
        customer_email: forecastData.customer_email 
      }, '-created_date');
      
      console.log('✅ Found catalogs:', fetchedCatalogs);
      
      // ✅ שמור ב-cache
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: fetchedCatalogs,
        timestamp: Date.now()
      }));
      
      setAvailableCatalogs(fetchedCatalogs || []);
    } catch (error) {
      console.error('❌ Error loading catalogs:', error);
      setAvailableCatalogs([]);
    } finally {
      setIsLoadingCatalogs(false);
    }
  }, [forecastData?.customer_email]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // ⭐ טעינת כל המוצרים מכל הקטלוגים (לשיוך שירותים)
  const loadAllCatalogProducts = useCallback(async () => {
    if (!forecastData?.customer_email || availableCatalogs.length === 0) {
      return;
    }

    setIsLoadingAllProducts(true);
    try {
      const allProducts = [];
      const MAX_PRODUCTS_PER_CATALOG = 200; // ✅ הגבלה למניעת קפיאה
      
      // טען מוצרים מכל הקטלוגים (ללא הגבלה)
      for (const catalog of availableCatalogs) {
        try {
          // ✅ טעינת כל המוצרים באמצעות pagination
          let catalogProducts = [];
          let hasMore = true;
          let skip = 0;
          const batchSize = 5000;
          
          while (hasMore) {
            const batch = await ProductCatalog.filter(
              { catalog_id: catalog.id, is_active: true },
              '-created_date',
              batchSize,
              skip
            );
            catalogProducts = [...catalogProducts, ...batch];
            skip += batch.length;
            
            if (batch.length < batchSize) {
              hasMore = false;
            }
          }
          
          // הוסף metadata של הקטלוג לכל מוצר
          catalogProducts.forEach(product => {
            allProducts.push({
              ...product,
              catalog_name: catalog.catalog_name,
              catalog_id: catalog.id
            });
          });
        } catch (error) {
          console.error(`Error loading products from catalog ${catalog.id}:`, error);
        }
      }
      
      setAllCatalogProducts(allProducts);
      setCatalogProductsLoaded(true);
      console.log(`✅ Loaded ${allProducts.length} products from ${availableCatalogs.length} catalogs`);
    } catch (error) {
      console.error('❌ Error loading all catalog products:', error);
      setAllCatalogProducts([]);
    } finally {
      setIsLoadingAllProducts(false);
    }
  }, [forecastData?.customer_email, availableCatalogs]);

  // lazy loading -- מוצרי הקטלוג נטענים רק כשהמשתמש פותח dropdown, לא ב-mount
  const triggerLoadCatalogProducts = useCallback(() => {
    if (!catalogProductsLoaded && !isLoadingAllProducts && availableCatalogs.length > 0) {
      loadAllCatalogProducts();
    }
  }, [catalogProductsLoaded, isLoadingAllProducts, availableCatalogs, loadAllCatalogProducts]);

  // ⭐ טעינת מוצרים מקטלוג
  const handleLoadCatalog = async () => {
    if (!selectedCatalogForLoad) {
      toast.warning('נא לבחור קטלוג תחילה');
      return;
    }
    
    if (services?.length > 0) {
      if (!confirm('⚠️ קיימים כבר מוצרים בתחזית.\n\nהאם להחליף אותם במוצרים מהקטלוג?')) {
        return;
      }
    }
    
    try {
      setIsLoadingCatalogProducts(true);
      
      console.log('📦 Loading products from catalog:', selectedCatalogForLoad.id);
      
      // ✅ טעינת כל המוצרים באמצעות pagination
      let allProducts = [];
      let hasMore = true;
      let skip = 0;
      const batchSize = 5000;
      
      while (hasMore) {
        const batch = await ProductCatalog.filter(
          { catalog_id: selectedCatalogForLoad.id, is_active: true },
          '-created_date',
          batchSize,
          skip
        );
        allProducts = [...allProducts, ...batch];
        skip += batch.length;
        
        console.log(`טוען מוצרים: ${allProducts.length} נטענו...`);
        
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
      
      const products = allProducts;
      console.log('✅ Total products loaded:', products.length);
      
      if (products.length === 0) {
        toast.warning('הקטלוג ריק - אין מוצרים לטעינה');
        return;
      }
      
      // המר כל מוצר לפורמט התחזית
      const convertedServices = products.map(product => {
        const sellingPrice = parseFloat(product.selling_price || product.consumer_price || 0);
        const costPrice = parseFloat(product.cost_price || 0);
        
        // ✅ FIX: חישוב אחוז הרווח כמספר (לא string!)
        const grossProfit = sellingPrice - costPrice;
        const grossMarginPercentage = sellingPrice > 0 
          ? (grossProfit / sellingPrice * 100) // ⬅️ לא קוראים ל-toFixed כאן!
          : 0;
        
        return {
          service_name: product.product_name,
          price: sellingPrice,
          has_vat: true,
          costs: costPrice > 0 ? [{
            cost_name: `עלות קנייה${product.supplier ? ` - ${product.supplier}` : ''}`,
            amount: costPrice,
            has_vat: true,
            is_percentage: false,
            percentage_of_price: 0
          }] : [],
          calculated: {
            cost_of_sale: costPrice,
            gross_profit: grossProfit,
            gross_margin_percentage: grossMarginPercentage // ⬅️ שמור כמספר!
          },
          loaded_from_catalog: true,
          source_catalog_id: selectedCatalogForLoad.id,
          source_product_id: product.id
        };
      });
      
      console.log('✅ Converted services:', convertedServices.length);
      
      // עדכן state מקומי
      setServices(convertedServices);
      
      // עדכן forecastData
      if (onUpdateForecast) {
        onUpdateForecast({
          services: convertedServices,
          source_catalog_id: selectedCatalogForLoad.id,
          last_catalog_sync: new Date().toISOString()
        });
      }
      
      toast.success(`✅ נטענו ${convertedServices.length} מוצרים בהצלחה מהקטלוג "${selectedCatalogForLoad.catalog_name}"!\n\nכעת תוכל לערוך כל מוצר לפי הצורך.`);
      
      setSelectedCatalogForLoad(null);
      
    } catch (error) {
      console.error('❌ Error loading catalog products:', error);
      toast.error('שגיאה בטעינת המוצרים: ' + error.message);
    } finally {
      setIsLoadingCatalogProducts(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(services);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setServices(reordered);
    if (onUpdateForecast) {
      onUpdateForecast({ services: reordered });
    }
  };

  const toggleServiceCollapse = (index) => {
    setCollapsedServices(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleAllServices = () => {
    const allCollapsed = Object.values(collapsedServices).every(val => val === true);
    const newState = {};
    services.forEach((_, idx) => {
      newState[idx] = !allCollapsed;
    });
    setCollapsedServices(newState);
  };

  const addService = () => {
    const newService = {
      service_name: "",
      price: 0,
      has_vat: true,
      costs: [{ cost_name: "", amount: 0, has_vat: true, is_percentage: false, percentage_of_price: 0 }],
      calculated: { cost_of_sale: 0, gross_profit: 0, gross_margin_percentage: 0 }
    };
    const updated = [...services, newService];
    setServices(updated);
    if (onUpdateForecast) {
      onUpdateForecast({ services: updated });
    }
  };

  const removeService = (index) => {
    const updated = services.filter((_, i) => i !== index);
    setServices(updated);
    if (onUpdateForecast) {
      onUpdateForecast({ services: updated });
    }
  };

  const updateService = (index, field, value) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    
    // ✅ FIX: חישוב מחדש אחרי כל שינוי במחיר
    recalculateServiceProfitability(updated, index);
    
    setServices(updated);
    if (onUpdateForecast) {
      onUpdateForecast({ services: updated });
    }
  };

  // ⭐ שיוך שירות למוצר מהקטלוג
  const linkServiceToCatalogProduct = (serviceIndex, productId) => {
    if (!productId || productId === 'none') {
      // הסרת שיוך
      const updated = [...services];
      updated[serviceIndex] = { ...updated[serviceIndex], linked_catalog_product_id: null };
      setServices(updated);
      if (onUpdateForecast) {
        onUpdateForecast({ services: updated });
      }
      return;
    }

    const product = allCatalogProducts.find(p => p.id === productId);
    if (!product) {
      toast.warning('מוצר לא נמצא');
      return;
    }

    const updated = [...services];
    const sellingPrice = parseFloat(product.selling_price || product.consumer_price || 0);
    const costPrice = parseFloat(product.cost_price || 0);
    
    // עדכן את השירות עם נתוני המוצר
    updated[serviceIndex] = {
      ...updated[serviceIndex],
      service_name: product.product_name,
      price: sellingPrice,
      has_vat: true,
      linked_catalog_product_id: productId,
      costs: costPrice > 0 ? [{
        cost_name: `עלות קנייה${product.supplier ? ` - ${product.supplier}` : ''}`,
        amount: costPrice,
        has_vat: true,
        is_percentage: false,
        percentage_of_price: 0
      }] : updated[serviceIndex].costs || [],
      loaded_from_catalog: true
    };
    
    // חשב מחדש רווחיות
    recalculateServiceProfitability(updated, serviceIndex);
    
    setServices(updated);
    if (onUpdateForecast) {
      onUpdateForecast({ services: updated });
    }
  };

  const addCost = (serviceIndex) => {
    const updated = [...services];
    updated[serviceIndex].costs = [
      ...(updated[serviceIndex].costs || []),
      { cost_name: "", amount: 0, has_vat: true, is_percentage: false, percentage_of_price: 0 }
    ];
    setServices(updated);
    if (onUpdateForecast) {
      onUpdateForecast({ services: updated });
    }
  };

  const removeCost = (serviceIndex, costIndex) => {
    const updated = [...services];
    updated[serviceIndex].costs = updated[serviceIndex].costs.filter((_, i) => i !== costIndex);
    recalculateServiceProfitability(updated, serviceIndex);
    setServices(updated);
    if (onUpdateForecast) {
      onUpdateForecast({ services: updated });
    }
  };

  const updateCost = (serviceIndex, costIndex, field, value) => {
    const updated = [...services];
    updated[serviceIndex].costs[costIndex] = {
      ...updated[serviceIndex].costs[costIndex],
      [field]: value
    };
    recalculateServiceProfitability(updated, serviceIndex);
    setServices(updated);
    if (onUpdateForecast) {
      onUpdateForecast({ services: updated });
    }
  };

  const recalculateServiceProfitability = (servicesArray, serviceIndex) => {
    const service = servicesArray[serviceIndex];
    const VAT_RATE = 0.17; // 17% מע"מ
    
    // חישוב מחיר נטו (ללא מע"מ)
    const rawPrice = parseFloat(service.price) || 0;
    const netPrice = service.has_vat ? rawPrice / (1 + VAT_RATE) : rawPrice;
    
    let totalCost = 0;

    (service.costs || []).forEach(cost => {
      if (cost.is_percentage) {
        // עלות באחוזים - מחושבת ממחיר המכירה הנטו
        totalCost += (netPrice * (parseFloat(cost.percentage_of_price) || 0)) / 100;
      } else {
        // עלות קבועה בשקלים - נטו מע"מ אם צוין
        const rawCostAmount = parseFloat(cost.amount) || 0;
        const netCostAmount = cost.has_vat ? rawCostAmount / (1 + VAT_RATE) : rawCostAmount;
        totalCost += netCostAmount;
      }
    });

    const grossProfit = netPrice - totalCost;
    const grossMarginPercentage = netPrice > 0 ? ((grossProfit / netPrice) * 100) : 0;

    servicesArray[serviceIndex].calculated = {
      cost_of_sale: totalCost,
      gross_profit: grossProfit,
      gross_margin_percentage: grossMarginPercentage
    };
  };

  const handleSaveProgress = async () => {
    if (!forecastData.forecast_name?.trim()) {
      toast.warning('נא להזין שם לתחזית לפני שמירה');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const dataToSave = {
        ...forecastData,
        services
      };

      if (forecastData.id) {
        await ManualForecast.update(forecastData.id, dataToSave);
      } else {
        const created = await ManualForecast.create(dataToSave);
        if (onUpdateForecast) {
          onUpdateForecast({ id: created.id });
        }
      }

      setLastSaved(new Date());
      setSaveStatus('saved');

      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error saving:', error);
      setSaveStatus('error');
      toast.error('שגיאה בשמירה: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    if (services.length === 0) {
      toast.warning('יש להוסיף לפחות שירות/מוצר אחד לפני המשך');
      return;
    }
    
    const hasEmptyNames = services.some(s => !s.service_name || s.service_name.trim() === '');
    if (hasEmptyNames) {
      toast.warning('יש למלא שם עבור כל השירותים/מוצרים');
      return;
    }

    if (onNext) {
      onNext();
    }
  };

  const catalogProductsCount = services.filter(s => s.loaded_from_catalog).length;

  // סינון מוצרים לפי חיפוש
  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const term = searchTerm.toLowerCase();
    return services.filter(service => 
      service.service_name?.toLowerCase().includes(term) ||
      service.costs?.some(cost => cost.cost_name?.toLowerCase().includes(term))
    );
  }, [services, searchTerm]);

  // ✅ Pagination - חישוב מוצרים מוצגים
  const paginatedServices = useMemo(() => {
    const servicesToShow = searchTerm ? filteredServices : services;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return servicesToShow.slice(start, end);
  }, [services, filteredServices, searchTerm, currentPage]);

  const totalPages = useMemo(() => {
    const servicesToShow = searchTerm ? filteredServices : services;
    return Math.ceil(servicesToShow.length / ITEMS_PER_PAGE);
  }, [services, filteredServices, searchTerm]);

  // ✅ Reset pagination כשהשירותים משתנים או כשמשנים חיפוש
  useEffect(() => {
    setCurrentPage(1);
  }, [services.length, searchTerm]);

  // ✅ וידוא שהעמוד לא חורג מהטווח
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ⭐ בחירת קטלוג - מוצג תמיד */}
      {isLoadingCatalogs ? (
        <Card className="card-horizon">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-horizon-primary" />
            <p className="text-sm text-horizon-accent mt-2">טוען קטלוגים זמינים...</p>
          </CardContent>
        </Card>
      ) : availableCatalogs.length > 0 ? (
        <Card className="card-horizon border-2 border-horizon-primary/30 bg-gradient-to-l from-horizon-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Package className="w-5 h-5 text-horizon-primary" />
              💡 טען מוצרים מקטלוג קיים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-horizon-accent mb-4">
              חסוך זמן! טען מוצרים אוטומטית מקטלוג המוצרים שלך במקום להקליד ידנית
            </p>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <Label className="text-horizon-text mb-2 block font-medium">בחר קטלוג:</Label>
                <Select 
                  value={selectedCatalogForLoad?.id || ''}
                  onValueChange={(catalogId) => {
                    const catalog = availableCatalogs.find(c => c.id === catalogId);
                    console.log('📦 Selected catalog:', catalog);
                    setSelectedCatalogForLoad(catalog);
                  }}
                  disabled={isLoadingCatalogProducts}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text h-11">
                    <SelectValue placeholder="בחר קטלוג מהרשימה..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCatalogs.map(catalog => (
                      <SelectItem key={catalog.id} value={catalog.id}>
                        📦 {catalog.catalog_name} ({catalog.product_count || 0} מוצרים)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleLoadCatalog}
                disabled={!selectedCatalogForLoad || isLoadingCatalogProducts}
                className="btn-horizon-primary h-11 px-6"
              >
                {isLoadingCatalogProducts ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    טוען מוצרים...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 ml-2" />
                    טען {selectedCatalogForLoad?.product_count || ''} מוצרים
                  </>
                )}
              </Button>
            </div>
            
            {/* הצגת סטטוס סנכרון */}
            {forecastData.source_catalog_id && forecastData.last_catalog_sync && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-400">
                  נטענו {catalogProductsCount} מוצרים מקטלוג ב-{new Date(forecastData.last_catalog_sync).toLocaleDateString('he-IL', { 
                    day: 'numeric', 
                    month: 'long', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="card-horizon border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-horizon-text font-medium mb-1">
                  💡 טיפ: לא נמצאו קטלוגים פעילים
                </p>
                <p className="text-xs text-horizon-accent">
                  צור קטלוג מוצרים בטאב "קטלוג" כדי לטעון מוצרים אוטומטית לתחזיות עתידיות
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* כרטיס השירותים והמוצרים */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-horizon-text flex items-center gap-3">
                רשימת שירותים ומוצרים
                <SaveProgressIndicator
                  onSave={handleSaveProgress}
                  isSaving={isSaving}
                  lastSaved={lastSaved}
                  saveStatus={saveStatus}
                  compact={true}
                />
              </CardTitle>
              <p className="text-horizon-accent mt-1">הגדר את השירותים והמוצרים שלך ואת עלויות הגלם</p>
              {catalogProductsCount > 0 && (
                <Badge variant="outline" className="border-horizon-primary text-horizon-primary mt-2">
                  <Package className="w-3 h-3 ml-1" />
                  {catalogProductsCount} מוצרים נטענו מקטלוג
                </Badge>
              )}
            </div>
            {services.length > 1 && (
              <Button
                onClick={toggleAllServices}
                variant="outline"
                size="sm"
                className="border-horizon text-horizon-accent"
              >
                {Object.values(collapsedServices).every(val => val === true) ? (
                  <>
                    <ChevronDown className="w-4 h-4 ml-1" />
                    פתח הכל
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4 ml-1" />
                    סגור הכל
                  </>
                )}
              </Button>
            )}
            {services.length > 3 && (
              <div className="w-full md:w-64">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חפש מוצר או עלות..."
                    className="bg-horizon-card border-horizon text-horizon-text pr-10"
                  />
                </div>
              </div>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-horizon-accent">
              נמצאו <span className="font-semibold text-horizon-primary">{filteredServices.length}</span> מתוך <span className="font-semibold">{services.length}</span> מוצרים
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {services.length === 0 ? (
            <Alert className="bg-horizon-card/50 border-horizon">
              <AlertCircle className="h-4 w-4 text-horizon-accent" />
              <AlertDescription className="text-horizon-accent">
                לא הוגדרו מוצרים או שירותים. לחץ על "הוסף שירות/מוצר" או טען מקטלוג קיים.
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="services-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {searchTerm && filteredServices.length === 0 && (
                        <div className="text-center py-8 text-horizon-accent">
                          <Search className="w-8 h-8 mx-auto mb-2" />
                          לא נמצאו תוצאות עבור "{searchTerm}"
                        </div>
                      )}
                      {paginatedServices.map((service, serviceIndex) => {
                        const actualIndex = services.indexOf(service);
                        return (
                        <Draggable key={`service-${actualIndex}`} draggableId={`service-${actualIndex}`} index={actualIndex} isDragDisabled={!!searchTerm}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-all ${snapshot.isDragging ? 'z-50' : ''}`}
                            >
                              <Card className="bg-horizon-card/50 border-horizon">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div {...provided.dragHandleProps} className="mt-2 cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-5 h-5 text-horizon-accent" />
                                    </div>

                                    <div className="flex-1 space-y-5">
                                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                     <Button
                                       onClick={() => toggleServiceCollapse(actualIndex)}
                                       variant="ghost"
                                       size="sm"
                                       className="md:col-span-12 h-8 text-horizon-accent hover:text-horizon-primary justify-start"
                                     >
                                       {collapsedServices[actualIndex] ? (
                                         <ChevronDown className="w-4 h-4 ml-1" />
                                       ) : (
                                         <ChevronUp className="w-4 h-4 ml-1" />
                                       )}
                                       {collapsedServices[actualIndex] ? 'הצג פרטים' : 'הסתר פרטים'}
                                     </Button>
                                     {/* שם המוצר - 5 עמודות */}
                                     <div className="md:col-span-5">
                                       <Label className="text-horizon-text flex items-center gap-2 mb-2 font-semibold">
                                         <Package className="w-4 h-4 text-horizon-primary" />
                                         שם השירות/מוצר *
                                       </Label>
                                       <div className="space-y-2">
                                         {availableCatalogs.length > 0 && (
                                           <CatalogProductPicker
                                             value={service.linked_catalog_product_id}
                                             onSelect={(productId) => linkServiceToCatalogProduct(actualIndex, productId)}
                                             products={allCatalogProducts}
                                             isLoading={isLoadingAllProducts}
                                             onTriggerLoad={triggerLoadCatalogProducts}
                                           />
                                         )}
                                         <Input
                                           value={service.service_name}
                                           onChange={(e) => updateService(actualIndex, 'service_name', e.target.value)}
                                           placeholder="לדוגמה: שירות ייעוץ, מוצר X"
                                           className="bg-horizon-card border-horizon text-horizon-text h-11 text-base"
                                         />
                                         {service.loaded_from_catalog && (
                                           <Badge variant="outline" className="mt-2 border-blue-500/50 text-blue-400 text-xs bg-blue-500/10">
                                             <Package className="w-3 h-3 ml-1" />
                                             נטען מקטלוג
                                           </Badge>
                                         )}
                                         {service.linked_catalog_product_id && (
                                           <Badge variant="outline" className="mt-2 border-green-500/50 text-green-400 text-xs bg-green-500/10">
                                             <Package className="w-3 h-3 ml-1" />
                                             משויך לקטלוג
                                           </Badge>
                                         )}
                                       </div>
                                     </div>

                                     {/* מחיר מכירה - 3 עמודות */}
                                     <div className="md:col-span-3">
                                       <Label className="text-horizon-text flex items-center gap-2 mb-2 font-semibold">
                                         <DollarSign className="w-4 h-4 text-green-400" />
                                         מחיר מכירה *
                                       </Label>
                                       <div className="relative">
                                         <Input
                                           type="number"
                                           value={service.price}
                                           onChange={(e) => updateService(actualIndex, 'price', parseFloat(e.target.value) || 0)}
                                           className="bg-horizon-card border-green-400/30 text-horizon-text h-11 text-base pr-8 font-semibold"
                                           placeholder="0"
                                         />
                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-bold pointer-events-none">₪</span>
                                       </div>
                                     </div>

                                     {/* מע"מ - 2 עמודות */}
                                     <div className="md:col-span-2">
                                       <Label className="text-horizon-text mb-2 block opacity-0 pointer-events-none">מע"מ</Label>
                                       <Button
                                         type="button"
                                         variant="ghost"
                                         onClick={() => updateService(actualIndex, 'has_vat', !service.has_vat)}
                                         className={`w-full h-11 border rounded-lg flex items-center justify-center gap-2 transition-all ${
                                           service.has_vat 
                                             ? 'bg-horizon-primary/20 border-horizon-primary text-horizon-primary' 
                                             : 'bg-horizon-dark/30 border-horizon text-horizon-accent hover:border-horizon-primary/50'
                                         }`}
                                       >
                                         <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                           service.has_vat 
                                             ? 'bg-horizon-primary border-horizon-primary' 
                                             : 'border-horizon-accent'
                                         }`}>
                                           {service.has_vat && (
                                             <CheckCircle className="w-3 h-3 text-white" />
                                           )}
                                         </div>
                                         <span className="text-sm font-medium whitespace-nowrap">
                                           כולל מע"מ
                                         </span>
                                       </Button>
                                     </div>

                                     {/* מחק - 2 עמודות */}
                                     <div className="md:col-span-2">
                                       <Label className="text-horizon-text mb-2 block opacity-0 pointer-events-none">מחק</Label>
                                       <Button
                                         onClick={() => removeService(actualIndex)}
                                         variant="ghost"
                                         className="w-full h-11 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                                       >
                                         <Trash2 className="w-4 h-4 ml-2" />
                                         מחק
                                       </Button>
                                     </div>
                                     </div>

                                     {!collapsedServices[actualIndex] && (
                                     <>
                                     <div className="bg-gradient-to-l from-orange-500/5 to-transparent border-r-2 border-orange-500/30 pr-4 py-3 rounded-lg">
                                      <div className="flex items-center justify-between mb-3">
                                        <Label className="text-horizon-text flex items-center gap-2 font-semibold">
                                          <DollarSign className="w-4 h-4 text-orange-400" />
                                          עלויות גלם ומשתנות
                                        </Label>
                                        <Button
                                          onClick={() => addCost(actualIndex)}
                                          size="sm"
                                          className="bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
                                        >
                                          <Plus className="w-3 h-3 ml-1" />
                                          הוסף עלות
                                        </Button>
                                      </div>

                                      <div className="space-y-3">
                                        {(service.costs || []).map((cost, costIndex) => (
                                          <div key={costIndex} className="bg-horizon-card/80 border border-horizon rounded-lg p-3 hover:border-orange-400/30 transition-all">
                                            <div className="grid grid-cols-12 gap-3 items-center">
                                              {/* שם העלות - 4 עמודות */}
                                              <div className="col-span-4">
                                                <Label className="text-xs text-horizon-accent mb-1 block">שם העלות</Label>
                                                <Input
                                                  value={cost.cost_name}
                                                  onChange={(e) => updateCost(actualIndex, costIndex, 'cost_name', e.target.value)}
                                                  placeholder="לדוגמה: חומר גלם"
                                                  className="bg-horizon-dark border-horizon text-horizon-text h-9 text-sm"
                                                />
                                              </div>

                                              {/* סוג עלות - 3 עמודות */}
                                              <div className="col-span-3">
                                                <Label className="text-xs text-horizon-accent mb-1 block">סוג</Label>
                                                <Select
                                                  value={cost.is_percentage ? 'percentage' : 'fixed'}
                                                  onValueChange={(value) => {
                                                    const isPercentage = value === 'percentage';
                                                    updateCost(actualIndex, costIndex, 'is_percentage', isPercentage);
                                                    if (isPercentage) {
                                                      updateCost(actualIndex, costIndex, 'amount', 0);
                                                    } else {
                                                      updateCost(actualIndex, costIndex, 'percentage_of_price', 0);
                                                    }
                                                  }}
                                                >
                                                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text h-9 text-xs">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="fixed">
                                                      <div className="flex items-center gap-1.5">
                                                        <DollarSign className="w-3 h-3 text-green-400" />
                                                        <span>₪ קבוע</span>
                                                      </div>
                                                    </SelectItem>
                                                    <SelectItem value="percentage">
                                                      <div className="flex items-center gap-1.5">
                                                        <Percent className="w-3 h-3 text-blue-400" />
                                                        <span>% אחוז</span>
                                                      </div>
                                                    </SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>

                                              {/* ערך - 2 עמודות */}
                                              <div className="col-span-2">
                                                <Label className="text-xs text-horizon-accent mb-1 block">ערך</Label>
                                                {cost.is_percentage ? (
                                                  <div className="relative">
                                                    <Input
                                                      type="number"
                                                      value={cost.percentage_of_price || 0}
                                                      onChange={(e) => updateCost(actualIndex, costIndex, 'percentage_of_price', parseFloat(e.target.value) || 0)}
                                                      placeholder="0"
                                                      className="bg-horizon-dark border-blue-400/30 text-horizon-text h-9 text-sm pr-6 font-semibold"
                                                      min="0"
                                                      max="100"
                                                      step="0.1"
                                                    />
                                                    <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 pointer-events-none" />
                                                  </div>
                                                ) : (
                                                  <div className="relative">
                                                    <Input
                                                      type="number"
                                                      value={cost.amount || 0}
                                                      onChange={(e) => updateCost(actualIndex, costIndex, 'amount', parseFloat(e.target.value) || 0)}
                                                      placeholder="0"
                                                      className="bg-horizon-dark border-orange-400/30 text-horizon-text h-9 text-sm pr-6 font-semibold"
                                                    />
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-orange-400 pointer-events-none font-bold">₪</span>
                                                  </div>
                                                )}
                                              </div>

                                              {/* מע"מ - 2 עמודות */}
                                              <div className="col-span-2">
                                                <Label className="text-xs text-horizon-accent mb-1 block">מע"מ</Label>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  onClick={() => updateCost(actualIndex, costIndex, 'has_vat', !cost.has_vat)}
                                                  className={`w-full h-9 border rounded flex items-center justify-center gap-1.5 transition-all ${
                                                    cost.has_vat 
                                                      ? 'bg-horizon-primary/20 border-horizon-primary text-horizon-primary' 
                                                      : 'bg-horizon-dark/50 border-horizon text-horizon-accent hover:border-horizon-primary/50'
                                                  }`}
                                                >
                                                  <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${
                                                    cost.has_vat 
                                                      ? 'bg-horizon-primary border-horizon-primary' 
                                                      : 'border-horizon-accent'
                                                  }`}>
                                                    {cost.has_vat && (
                                                      <CheckCircle className="w-2.5 h-2.5 text-white" />
                                                    )}
                                                  </div>
                                                  <span className="text-xs">כן</span>
                                                </Button>
                                              </div>

                                              {/* מחק - 1 עמודה */}
                                              <div className="col-span-1">
                                                <Label className="text-xs text-horizon-accent mb-1 block opacity-0">X</Label>
                                                <Button
                                                  onClick={() => removeCost(actualIndex, costIndex)}
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-9 w-9 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        
                                        {(service.costs || []).length === 0 && (
                                          <div className="text-center py-6 text-horizon-accent text-sm border border-dashed border-horizon rounded-lg">
                                            לחץ "הוסף עלות" להוספת עלויות גלם ומשתנות
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* ✅ תצוגת חישובים - משופרת וצבעונית! */}
                                    <div className="grid grid-cols-3 gap-4">
                                      {/* עלות מכר */}
                                      <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-xl p-4 text-center hover:shadow-lg hover:border-orange-500/50 transition-all">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          <DollarSign className="w-4 h-4 text-orange-400" />
                                          <p className="text-xs font-semibold text-orange-400">עלות מכר</p>
                                        </div>
                                        <p className="text-2xl font-bold text-horizon-text">
                                          {formatCurrency(service.calculated?.cost_of_sale || 0)}
                                        </p>
                                      </div>

                                      {/* רווח גולמי */}
                                      <div className={`bg-gradient-to-br ${(service.calculated?.gross_profit || 0) >= 0 ? 'from-green-500/10 to-green-500/5 border-green-500/30' : 'from-red-500/10 to-red-500/5 border-red-500/30'} border rounded-xl p-4 text-center hover:shadow-lg transition-all`}>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          <TrendingUp className={`w-4 h-4 ${(service.calculated?.gross_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                                          <p className={`text-xs font-semibold ${(service.calculated?.gross_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>רווח גולמי</p>
                                        </div>
                                        <p className={`text-2xl font-bold ${(service.calculated?.gross_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {formatCurrency(service.calculated?.gross_profit || 0)}
                                        </p>
                                      </div>

                                      {/* אחוז רווח */}
                                      <div className={`bg-gradient-to-br ${(service.calculated?.gross_margin_percentage || 0) >= 0 ? 'from-blue-500/10 to-blue-500/5 border-blue-500/30' : 'from-red-500/10 to-red-500/5 border-red-500/30'} border rounded-xl p-4 text-center hover:shadow-lg transition-all`}>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          <Percent className={`w-4 h-4 ${(service.calculated?.gross_margin_percentage || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
                                          <p className={`text-xs font-semibold ${(service.calculated?.gross_margin_percentage || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>אחוז רווח</p>
                                        </div>
                                        <p className={`text-2xl font-bold ${(service.calculated?.gross_margin_percentage || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                          {(service.calculated?.gross_margin_percentage || 0).toFixed(1)}%
                                        </p>
                                        </div>
                                        </div>
                                        </>
                                        )}
                                        </div>
                                        </div>
                                        </CardContent>
                                        </Card>
                          </div>
                        )}
                      </Draggable>
                    );
                    })}
                    {provided.placeholder}
                    </div>
                    )}
                    </Droppable>
                    </DragDropContext>

                    {/* ✅ Pagination controls */}
                    {(searchTerm ? filteredServices : services).length > ITEMS_PER_PAGE && (
                      <div className="mt-6 flex justify-center">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={setCurrentPage}
                        />
                      </div>
                    )}
                    </div>
                    )}

                    <Button
                    onClick={addService}
                    variant="outline"
                    className="w-full border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10 mt-4"
                    >
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף שירות/מוצר ידנית
                    </Button>
                    </CardContent>
                    </Card>

      {/* כפתורי ניווט */}
      <div className="flex justify-between pt-6">
        <Button onClick={onBack} variant="outline" className="border-horizon text-horizon-text">
          <ChevronRight className="w-4 h-4 ml-2" />
          חזור
        </Button>
        <Button onClick={handleContinue} className="btn-horizon-primary">
          המשך לשלב הבא
          <ChevronLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </div>
  );
}