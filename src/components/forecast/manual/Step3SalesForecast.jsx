import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, GripVertical, Eye, EyeOff, TrendingUp, Calendar, Upload, FileSpreadsheet, CheckCircle2, Package, BarChart3, Calculator, Loader2, Save, AlertTriangle, Zap } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FixedSizeList as List } from 'react-window';
import { formatCurrency, formatNumber } from './utils/numberFormatter';
import ZReportUploader from './ZReportUploader';
import ZReportProductMapper from './ZReportProductMapper';
import ZReportMonthSummary from './ZReportMonthSummary';

import ServiceCategoryGroup from './ServiceCategoryGroup';
import AggregatePlanning from './AggregatePlanning';
import { Progress } from "@/components/ui/progress";
import SaveProgressIndicator from './SaveProgressIndicator';
import { toast } from "sonner";
import { ManualForecast, ZReportDetails } from '@/api/entities';
import { UploadFile } from '@/api/integrations';

export default function Step3SalesForecast({ forecastData, onUpdateForecast, onNext, onBack, customer, sanitizeAllForecastData, setForecastData }) {
  const [isImportingZReport, setIsImportingZReport] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  
  // ✅ תיקון: טוען נתונים קיימים מיד בהתחלה, לא אפסים!
  // ✅ אופטימיזציה: Map במקום find - O(n) במקום O(n²)
  const [salesForecast, setSalesForecast] = useState(() => {
    if (!forecastData.services || forecastData.services.length === 0) return [];
    
    // ✅ יצירת Map פעם אחת - O(n) במקום O(n²)
    const existingForecastMap = new Map();
    (forecastData.sales_forecast_onetime || []).forEach(f => {
      if (f.service_name) {
        existingForecastMap.set(f.service_name, f);
      }
    });
    
    // ✅ עכשיו map הוא O(n) במקום O(n²)
    return forecastData.services.map((service) => {
      const existing = existingForecastMap.get(service.service_name);
      return existing || {
        service_name: service.service_name,
        planned_monthly_quantities: Array(12).fill(0),
        actual_monthly_quantities: Array(12).fill(0),
        planned_monthly_revenue: Array(12).fill(0),
        actual_monthly_revenue: Array(12).fill(0)
      };
    });
  });
  
  const [workingDays, setWorkingDays] = useState(forecastData.working_days_per_month || 22);
  const [collapsedServices, setCollapsedServices] = useState({});
  const [showZReportUploader, setShowZReportUploader] = useState(false);
  const [showProductMapper, setShowProductMapper] = useState(false);
  const [pendingZData, setPendingZData] = useState(null);
  const [viewMode, setViewMode] = useState('category'); // 'category' או 'list' או 'virtual'
  const [planningMode, setPlanningMode] = useState(forecastData.use_aggregate_planning ? 'aggregate' : 'detailed');

  // ✅ Pagination למניעת קפיאה בקטלוגים גדולים
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50; // הצג 50 מוצרים בכל פעם
  
  // ✅ Pagination של קטגוריות למניעת קריסה עם קטלוגים גדולים
  const [categoryPage, setCategoryPage] = useState(1);
  const CATEGORIES_PER_PAGE = 5; // הצג 5 קטגוריות בכל פעם
  
  // ✅ Virtual scrolling configuration (for future use)
  const LARGE_CATALOG_THRESHOLD = 100;
  const VIRTUAL_ITEM_HEIGHT = 520; // גובה כל מוצר בפיקסלים
  const isLargeCatalog = (forecastData.services?.length || 0) > LARGE_CATALOG_THRESHOLD;

  // ✅ זיהוי אוטומטי של קטלוגים גדולים
  useEffect(() => {
    const catalogSize = forecastData.services?.length || 0;
    
    if (catalogSize > LARGE_CATALOG_THRESHOLD) {
      console.log(`📊 Large catalog detected (${catalogSize} products)`);
      
      // אם זה תחזית חדשה, הציע מעבר לתכנון כללי
      if (!forecastData.id && planningMode === 'detailed') {
        console.log('💡 Suggesting aggregate planning for new forecast with large catalog');
      }
      
      // אם במצב list, עבור אוטומטית ל-virtual scrolling
      if (viewMode === 'list') {
        console.log('🔄 Auto-switching to virtual scrolling for large catalog');
        setViewMode('virtual');
      }
    }
  }, [forecastData.services?.length]);

  // ✅ FIX #6: Remove expensive JSON.stringify - use shallow comparison
  // ✅ אופטימיזציה למניעת קפיאה - עדכון רק כשצריך
  useEffect(() => {
    if (!forecastData.services || forecastData.services.length === 0) return;

    // ✅ בדיקה מהירה: אם מספר המוצרים לא השתנה, בדוק רק את השמות הראשונים
    const servicesCount = forecastData.services.length;
    const salesForecastCount = salesForecast.length;
    
    // אם מספר המוצרים שונה - צריך לעדכן
    if (servicesCount !== salesForecastCount) {
      // ✅ יצירת Map למהירות חיפוש
      const salesForecastMap = new Map();
      (forecastData.sales_forecast_onetime || []).forEach(sf => {
        salesForecastMap.set(sf.service_name, sf);
      });
      
      // ✅ עיבוד מהיר עם Map (O(n) במקום O(n²))
      const updatedForecast = forecastData.services.map((service) => {
        const existing = salesForecastMap.get(service.service_name);
        return existing || {
          service_name: service.service_name,
          planned_monthly_quantities: Array(12).fill(0),
          actual_monthly_quantities: Array(12).fill(0),
          planned_monthly_revenue: Array(12).fill(0),
          actual_monthly_revenue: Array(12).fill(0)
        };
      });
      
      setSalesForecast(updatedForecast);
    }
  }, [forecastData.services?.length, forecastData.sales_forecast_onetime?.length]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedForecast = Array.from(salesForecast);
    const [movedItem] = reorderedForecast.splice(result.source.index, 1);
    reorderedForecast.splice(result.destination.index, 0, movedItem);

    setSalesForecast(reorderedForecast);
  };

  const toggleServiceCollapse = (index) => {
    setCollapsedServices((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const updateQuantity = (serviceIndex, monthIndex, type, value) => {
    const updated = [...salesForecast];
    const parsedValue = parseFloat(value) || 0;

    if (type === 'planned') {
      updated[serviceIndex].planned_monthly_quantities[monthIndex] = parsedValue;

      const service = forecastData.services[serviceIndex];
      const price = service?.price || 0;
      updated[serviceIndex].planned_monthly_revenue[monthIndex] = parsedValue * price;
    } else {
      updated[serviceIndex].actual_monthly_quantities[monthIndex] = parsedValue;

      const service = forecastData.services[serviceIndex];
      const price = service?.price || 0;
      updated[serviceIndex].actual_monthly_revenue[monthIndex] = parsedValue * price;
    }

    setSalesForecast(updated);
  };

  const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

  const handleZReportImport = (importData) => {
    setPendingZData(importData);
    setShowZReportUploader(false);
    setShowProductMapper(true);
  };

  const handleMappingComplete = async (mapping) => {
    if (!pendingZData) return;

    setIsImportingZReport(true);
    setImportProgress(5);
    setImportStatusText('מתחיל תהליך ייבוא...');

    try {
      // ✅ שלב 1: וידוא שיש ID לתחזית - אם לא, יוצר אותה!
      setImportProgress(10);
      setImportStatusText('בודק תחזית קיימת...');
      console.log('🔍 Checking if forecast exists...');
      let forecastId = forecastData.id;
      
      if (!forecastId) {
        console.log('⚠️ No forecast ID - creating forecast first...');
        setImportStatusText('יוצר תחזית חדשה...');
        
        const forecastName = forecastData.forecast_name?.trim() || `תחזית ${forecastData.forecast_year || new Date().getFullYear()}`;
        
        const newForecastData = {
          ...forecastData,
          forecast_name: forecastName,
          customer_email: customer?.email || forecastData.customer_email
        };
        
        const sanitizedData = sanitizeAllForecastData ? sanitizeAllForecastData(newForecastData) : newForecastData;
        
        // Timeout protection
        const createdForecast = await Promise.race([
          ManualForecast.create(sanitizedData),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('יצירת תחזית לקחה יותר מדי זמן')), 30000)
          )
        ]);
        
        forecastId = createdForecast.id;
        console.log('✅ Forecast created successfully:', forecastId);
        
        setForecastData(prev => ({ ...prev, id: forecastId }));
        if (onUpdateForecast) {
          onUpdateForecast({ id: forecastId });
        }
      }

      // ✅ שלב 2: עיבוד המוצרים ב-chunks (למניעת UI freeze)
      setImportProgress(15);
      setImportStatusText(`מעבד ${pendingZData.products.length.toLocaleString('he-IL')} מוצרים...`);
      
      const monthIndex = pendingZData.month - 1;
      const updated = [...salesForecast];
      let productsUpdated = 0;
      const detailedProducts = [];

      console.log('🗺️ Z-Report Mapping:', Object.keys(mapping).length, 'products mapped');
      console.log('📦 Products from Z-Report:', pendingZData.products.length);

      // עיבוד ב-chunks כדי לא לחסום UI
      const CHUNK_SIZE = 500;
      const totalProducts = pendingZData.products.length;
      
      for (let i = 0; i < totalProducts; i += CHUNK_SIZE) {
        const chunk = pendingZData.products.slice(i, i + CHUNK_SIZE);
        const chunkProgress = 15 + ((i / totalProducts) * 30); // 15% -> 45%
        setImportProgress(Math.floor(chunkProgress));
        setImportStatusText(`מעבד מוצרים ${i + chunk.length}/${totalProducts}...`);
        
        // תן לדפדפן לנשום
        await new Promise(resolve => setTimeout(resolve, 0));
        
        chunk.forEach(zProduct => {
          const mappedServiceName = mapping[zProduct.product_name];
          if (!mappedServiceName) return;

          const serviceIndex = updated.findIndex(s => s.service_name === mappedServiceName);
          if (serviceIndex === -1) return;

          updated[serviceIndex].actual_monthly_quantities[monthIndex] = zProduct.quantity_sold;
          const realRevenue = zProduct.revenue_with_vat || 0;
          updated[serviceIndex].actual_monthly_revenue[monthIndex] = realRevenue;

          detailedProducts.push({
            product_name: zProduct.product_name,
            barcode: zProduct.barcode || '',
            quantity_sold: zProduct.quantity_sold,
            unit_price: zProduct.quantity_sold > 0 ? realRevenue / zProduct.quantity_sold : 0,
            revenue_with_vat: realRevenue,
            mapped_service: mappedServiceName
          });

          productsUpdated++;
        });
      }

      console.log(`✅ Processed ${productsUpdated} products successfully`);

      // ✅ עדכון UI
      setSalesForecast(updated);

      // ✅ שלב 3: שמירת המוצרים לקובץ JSON נפרד (למניעת overload ב-DB)
      setImportProgress(50);
      setImportStatusText('שומר פרטי מוצרים לענן...');
      console.log('☁️ Uploading detailed products to cloud storage...');
      
      const productsJsonBlob = new Blob(
        [JSON.stringify(detailedProducts, null, 2)], 
        { type: 'application/json' }
      );
      
      const productsFile = new File(
        [productsJsonBlob], 
        `z_report_products_${forecastId}_month_${pendingZData.month}.json`,
        { type: 'application/json' }
      );
      
      const { file_url: productsFileUrl } = await Promise.race([
        UploadFile({ file: productsFile }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('העלאת קובץ מוצרים לקחה יותר מדי זמן')), 45000)
        )
      ]);
      
      console.log('✅ Products file uploaded:', productsFileUrl);

      // ✅ שלב 4: בדיקה אם יש כבר דוח Z לאותו חודש - איחוד במקום יצירה חדשה
      setImportProgress(60);
      setImportStatusText('בודק דוחות קיימים...');
      console.log('🔍 Checking for existing Z reports for month:', pendingZData.month);
      
      const existingReports = await ZReportDetails.filter({
        forecast_id: forecastId,
        month_assigned: pendingZData.month,
        customer_email: customer?.email || forecastData.customer_email
      });
      
      let zReportDetail;
      let mergedProducts = [...detailedProducts];
      let mergedProductsFileUrl = productsFileUrl;
      
      if (existingReports.length > 0) {
        // יש דוח קיים - נאחד את הנתונים
        console.log(`✅ Found ${existingReports.length} existing Z report(s) for month ${pendingZData.month}, merging...`);
        setImportStatusText('מאחד דוחות Z...');
        
        // טעינת מוצרים מדוחות קיימים
        const existingProducts = [];
        for (const existingReport of existingReports) {
          if (existingReport.detailed_products_file_url) {
            try {
              const response = await fetch(existingReport.detailed_products_file_url);
              const products = await response.json();
              existingProducts.push(...products);
            } catch (error) {
              console.error('Error loading existing products:', error);
              // Fallback - נסה מה-entity ישירות
              if (existingReport.detailed_products && existingReport.detailed_products.length > 0) {
                existingProducts.push(...existingReport.detailed_products);
              }
            }
          } else if (existingReport.detailed_products && existingReport.detailed_products.length > 0) {
            existingProducts.push(...existingReport.detailed_products);
          }
        }
        
        // איחוד מוצרים - חיבור כמויות והכנסות למוצרים זהים
        const productMap = new Map();
        
        // הוסף מוצרים קיימים
        existingProducts.forEach(product => {
          const key = (product.product_name || '').toLowerCase().trim();
          if (key) {
            productMap.set(key, {
              product_name: product.product_name,
              barcode: product.barcode || '',
              quantity_sold: product.quantity_sold || 0,
              revenue_with_vat: product.revenue_with_vat || 0,
              revenue_without_vat: product.revenue_without_vat || 0
            });
          }
        });
        
        // הוסף/אחד מוצרים חדשים
        detailedProducts.forEach(product => {
          const key = (product.product_name || '').toLowerCase().trim();
          if (key) {
            if (productMap.has(key)) {
              // איחוד - חיבור כמויות והכנסות
              const existing = productMap.get(key);
              existing.quantity_sold += (product.quantity_sold || 0);
              existing.revenue_with_vat += (product.revenue_with_vat || 0);
              existing.revenue_without_vat += (product.revenue_without_vat || 0);
            } else {
              // מוצר חדש
              productMap.set(key, {
                product_name: product.product_name,
                barcode: product.barcode || '',
                quantity_sold: product.quantity_sold || 0,
                revenue_with_vat: product.revenue_with_vat || 0,
                revenue_without_vat: product.revenue_without_vat || 0
              });
            }
          }
        });
        
        mergedProducts = Array.from(productMap.values());
        
        // שמור את המוצרים המאוחדים לקובץ חדש
        const mergedProductsJson = JSON.stringify(mergedProducts, null, 2);
        const mergedProductsBlob = new Blob([mergedProductsJson], { type: 'application/json' });
        const mergedProductsFile = new File(
          [mergedProductsBlob],
          `z_report_products_merged_${forecastId}_month_${pendingZData.month}_${Date.now()}.json`,
          { type: 'application/json' }
        );
        
        const { file_url: mergedFileUrl } = await UploadFile({ file: mergedProductsFile });
        mergedProductsFileUrl = mergedFileUrl;
        
        // עדכן את הדוח הקיים הראשון (או צור חדש אם אין)
        const existingReport = existingReports[0];
        const totalRevenue = mergedProducts.reduce((sum, p) => sum + (p.revenue_with_vat || 0), 0);
        
        zReportDetail = await ZReportDetails.update(existingReport.id, {
          file_name: `${existingReport.file_name} + ${pendingZData.file_name}`,
          file_url: pendingZData.file_url, // שמור את הקובץ החדש
          upload_date: new Date().toISOString(),
          products_count: mergedProducts.length,
          total_revenue: totalRevenue,
          detailed_products_file_url: mergedProductsFileUrl
        });
        
        // מחק דוחות נוספים אם יש (נשאר רק אחד מאוחד)
        if (existingReports.length > 1) {
          for (let i = 1; i < existingReports.length; i++) {
            try {
              await ZReportDetails.delete(existingReports[i].id);
            } catch (error) {
              console.error('Error deleting duplicate report:', error);
            }
          }
        }
        
        console.log('✅ Z reports merged successfully:', zReportDetail.id);
      } else {
        // אין דוח קיים - צור חדש
      setImportStatusText('יוצר רשומת דוח Z...');
        console.log('💾 Creating new ZReportDetails entity...');
      
        zReportDetail = await Promise.race([
        ZReportDetails.create({
          forecast_id: forecastId,
          customer_email: customer?.email || forecastData.customer_email,
          month_assigned: pendingZData.month,
          file_name: pendingZData.file_name,
          file_url: pendingZData.file_url,
          upload_date: new Date().toISOString(),
          products_count: detailedProducts.length,
          total_revenue: pendingZData.summary.total_revenue_with_vat,
          detailed_products: []  // ✅ ריק - המוצרים בקובץ נפרד!
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('יצירת ZReportDetails לקחה יותר מדי זמן')), 30000)
        )
      ]);

      console.log('✅ ZReportDetails created:', zReportDetail.id);

      // ✅ שלב 5: עדכון ה-entity עם קישור לקובץ המוצרים
      setImportProgress(70);
      await ZReportDetails.update(zReportDetail.id, {
        detailed_products_file_url: productsFileUrl
      });
      
      console.log('✅ Products file URL saved to ZReportDetails');
      }

      // ✅ שלב 6: עדכון התחזית עם reference בלבד
      setImportProgress(80);
      setImportStatusText('מעדכן תחזית...');
      
      const uploadRecord = {
        file_name: pendingZData.file_name,
        upload_date: new Date().toISOString(),
        month_assigned: pendingZData.month,
        products_updated: productsUpdated,
        total_revenue: pendingZData.summary.total_revenue_with_vat,
        file_url: pendingZData.file_url,
        z_report_detail_id: zReportDetail.id  // ✅ רק reference!
      };

      const currentReports = forecastData.z_reports_uploaded || [];
      const updatedReports = [...currentReports, uploadRecord];

      const completeUpdates = {
        sales_forecast_onetime: updated,
        z_reports_uploaded: updatedReports,
        z_report_product_mapping: {
          ...(forecastData.z_report_product_mapping || {}),
          ...mapping
        }
      };

      console.log('💾 Saving to ManualForecast:', {
        forecast_id: forecastId,
        sales_items: updated.length,
        z_reports: updatedReports.length
      });

      setImportProgress(90);
      setImportStatusText('שומר למסד נתונים...');

      // עדכון state מקומי
      if (onUpdateForecast) {
        onUpdateForecast(completeUpdates);
      }

      // שמירה ל-DB עם timeout protection
      await Promise.race([
        ManualForecast.update(forecastId, completeUpdates),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('שמירת תחזית לקחה יותר מדי זמן')), 45000)
        )
      ]);
      
      console.log('✅ Z-report data saved successfully');

      setImportProgress(100);
      setImportStatusText('הושלם בהצלחה!');

      setShowProductMapper(false);
      setPendingZData(null);
      setRetryAttempt(0);
      
      setTimeout(() => {
        toast.success(`✓ דוח Z יובא בהצלחה!\n${productsUpdated.toLocaleString('he-IL')} מוצרים עודכנו בחודש ${monthNames[monthIndex]}`);
      }, 200);

    } catch (error) {
      console.error('❌ Error in handleMappingComplete:', error);
      setImportProgress(0);
      setImportStatusText('');
      
      // שמירת נתונים חלקיים במקרה של כשלון
      if (forecastData.id) {
        try {
          await ManualForecast.update(forecastData.id, {
            z_import_failed: true,
            z_import_error: error.message,
            z_import_timestamp: new Date().toISOString()
          });
        } catch (saveError) {
          console.error('❌ Failed to save error state:', saveError);
        }
      }
      
      // Retry mechanism
      if (retryAttempt < 2) {
        if (confirm(`❌ הייבוא נכשל: ${error.message}\n\nניסיון ${retryAttempt + 1} מתוך 3.\n\nהאם לנסות שוב?`)) {
          setRetryAttempt(prev => prev + 1);
          handleMappingComplete(mapping);
          return;
        }
      } else {
        toast.error(`❌ הייבוא נכשל אחרי 3 ניסיונות: ${error.message}\n\nנא לנסות שוב מאוחר יותר או ליצור קשר עם התמיכה.`);
      }
      
    } finally {
      setTimeout(() => {
        setIsImportingZReport(false);
        setImportProgress(0);
        setImportStatusText('');
      }, 500);
    }
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
        sales_forecast_onetime: salesForecast,
        working_days_per_month: workingDays
      };

      if (forecastData.id) {
        await ManualForecast.update(forecastData.id, dataToSave);
      } else {
        const created = await ManualForecast.create(dataToSave);
        if (onUpdateForecast) {
          onUpdateForecast({ id: created.id });
        }
        setForecastData(prev => ({ ...prev, id: created.id }));
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

  const handleSalesForecastUpdate = (updatedForecast) => {
    setSalesForecast(updatedForecast);
  };

  const handleUpdateZReport = async (updatedReport) => {
    try {
      // 1. עדכון רשימת דוחות Z
      const existingReports = forecastData.z_reports_uploaded || [];
      const reportIndex = existingReports.findIndex(
        r => r.month_assigned === updatedReport.month_assigned
      );

      if (reportIndex === -1) {
        throw new Error('דוח לא נמצא');
      }

      const updatedReports = [...existingReports];
      updatedReports[reportIndex] = updatedReport;

      // 2. עדכון salesForecast בהתאם לנתונים החדשים
      const monthIndex = updatedReport.month_assigned - 1;
      const updated = [...salesForecast];

      // איפוס הנתונים של החודש הזה
      updated.forEach(item => {
        item.actual_monthly_quantities[monthIndex] = 0;
        item.actual_monthly_revenue[monthIndex] = 0;
      });

      // עדכון מחדש לפי המוצרים החדשים
      (updatedReport.detailed_products || []).forEach(product => {
        const serviceIndex = updated.findIndex(s => s.service_name === product.mapped_service);
        if (serviceIndex !== -1) {
          updated[serviceIndex].actual_monthly_quantities[monthIndex] = product.quantity_sold;
          updated[serviceIndex].actual_monthly_revenue[monthIndex] = product.revenue_with_vat;
        }
      });

      setSalesForecast(updated);

      // 3. שמירה ל-DB
      const completeUpdates = {
        sales_forecast_onetime: updated,
        z_reports_uploaded: updatedReports
      };

      if (onUpdateForecast) {
        onUpdateForecast(completeUpdates);
      }

      if (forecastData.id) {
        await ManualForecast.update(forecastData.id, completeUpdates);
        console.log('✅ Z-report updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating Z report:', error);
      throw error;
    }
  };

  const [isSavingBeforeContinue, setIsSavingBeforeContinue] = useState(false);

  const handleContinue = async () => {
    console.log('💾 Step3 - Saving sales forecast before continue:', salesForecast.length, 'items');
    
    const updates = {
      sales_forecast_onetime: salesForecast,
      working_days_per_month: workingDays
    };
    
    // עדכון state מקומי קודם
    if (onUpdateForecast) {
      onUpdateForecast(updates);
    }
    
    // ✅ חובה: המתן לשמירה מלאה לפני המעבר לשלב הבא
    if (forecastData.id) {
      setIsSavingBeforeContinue(true);
      try {
        console.log('💾 Explicitly saving to DB before moving to next step...');
        await ManualForecast.update(forecastData.id, updates);
        console.log('✅ Save completed successfully');
      } catch (error) {
        console.error('❌ Error saving before continue:', error);
        setIsSavingBeforeContinue(false);
        
        // הצג שגיאה למשתמש ואל תעבור לשלב הבא!
        const retry = confirm(`❌ שגיאה בשמירת הנתונים: ${error.message}\n\nהאם לנסות שוב?`);
        if (retry) {
          return handleContinue(); // ניסיון נוסף
        }
        return; // אל תעבור לשלב הבא אם השמירה נכשלה!
      } finally {
        setIsSavingBeforeContinue(false);
      }
    }
    
    if (onNext) {
      onNext();
    }
  };

  // ✅ FIX #7: Memoize groupServicesByCategory - עם useMemo למניעת חישוב מחדש בכל render
  const categorizedServices = useMemo(() => {
    const grouped = {};
    const hasZReports = forecastData.z_reports_uploaded && forecastData.z_reports_uploaded.length > 0;
    
    // ✅ אופטימיזציה: עבור קטלוגים גדולים, נשתמש ב-Map למהירות
    const salesMap = new Map(salesForecast.map(s => [s.service_name, s]));
    
    // אם יש דוחות Z, נמיין לפי מוצרים שנמכרו קודם
    let servicesToGroup = [...(forecastData.services || [])];
    
    if (hasZReports && servicesToGroup.length > 0) {
      // ✅ אופטימיזציה: חלוקה מהירה יותר עם Map
      const soldServices = [];
      const notSoldServices = [];
      
      servicesToGroup.forEach(service => {
        const forecast = salesMap.get(service.service_name);
        if (forecast && forecast.actual_monthly_quantities.some(qty => qty > 0)) {
          soldServices.push(service);
        } else {
          notSoldServices.push(service);
        }
      });
      
      servicesToGroup = [...soldServices, ...notSoldServices];
    }
    
    servicesToGroup.forEach((service, idx) => {
      const category = service.category || 'ללא קטגוריה';
      if (!grouped[category]) {
        grouped[category] = { services: [], startIndex: idx };
      }
      grouped[category].services.push(service);
    });
    return grouped;
  }, [forecastData.services, salesForecast, forecastData.z_reports_uploaded]);

  const handlePlanningModeChange = (mode) => {
    setPlanningMode(mode);
    onUpdateForecast({
      use_aggregate_planning: mode === 'aggregate'
    });
  };

  // ✅ Virtual scrolling - row renderer
  const VirtualRow = useCallback(({ index, style }) => {
    const item = salesForecast[index];
    if (!item) return null;
    
    return (
      <div style={style} className="px-4">
        <div className="bg-horizon-card/30 border border-horizon rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="font-semibold text-horizon-text flex-1">
              {item.service_name}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleServiceCollapse(index)}
              className="text-horizon-accent"
            >
              {collapsedServices[index] ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </Button>
          </div>

          {!collapsedServices[index] && (
            <div className="grid grid-cols-6 gap-3">
              {monthNames.map((month, monthIndex) => (
                <div key={monthIndex} className="space-y-2">
                  <div className="flex flex-col items-center">
                    <Label className="text-xs text-horizon-accent block text-center">{month}</Label>
                    {item.actual_monthly_quantities[monthIndex] > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200 shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span className="text-[10px] text-green-700 font-medium">נקלט</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-[10px] text-blue-400">תכנון</Label>
                    <Input
                      type="number"
                      value={item.planned_monthly_quantities[monthIndex] || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                        updateQuantity(index, monthIndex, 'planned', val);
                      }}
                      className="bg-horizon-card border-blue-400/30 text-horizon-text text-sm h-8"
                      placeholder="0"
                    />
                    <div className="text-[10px] text-blue-400 text-center">
                      {formatCurrency(item.planned_monthly_revenue[monthIndex], 0)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-green-400">ביצוע</Label>
                    <Input
                      type="number"
                      value={item.actual_monthly_quantities[monthIndex] || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                        updateQuantity(index, monthIndex, 'actual', val);
                      }}
                      className="bg-horizon-card border-green-400/30 text-horizon-text text-sm h-8"
                      placeholder="0"
                    />
                    <div className="text-[10px] text-green-400 text-center">
                      {formatCurrency(item.actual_monthly_revenue[monthIndex], 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, [salesForecast, collapsedServices, monthNames, updateQuantity, toggleServiceCollapse]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* בחירת מצב תכנון */}
      <Card className="card-horizon border-2 border-horizon-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-horizon-primary" />
              <span className="font-semibold text-horizon-text">בחר שיטת תכנון:</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handlePlanningModeChange('detailed')}
                variant={planningMode === 'detailed' ? 'default' : 'outline'}
                className={planningMode === 'detailed' ? 'btn-horizon-primary' : 'border-horizon text-horizon-text'}
              >
                <Package className="w-4 h-4 ml-2" />
                תכנון פרטני (מוצר מוצר)
              </Button>
              <Button
                onClick={() => handlePlanningModeChange('aggregate')}
                variant={planningMode === 'aggregate' ? 'default' : 'outline'}
                className={planningMode === 'aggregate' ? 'btn-horizon-primary' : 'border-horizon text-horizon-text'}
              >
                <BarChart3 className="w-4 h-4 ml-2" />
                תכנון כללי (מחזור + אחוז עלות)
              </Button>
            </div>
          </div>
          
          {planningMode === 'aggregate' && (
            <Alert className="mt-4 bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-horizon-text">
                מצוין לעסקים עם קטלוג גדול! הזן מחזור מכירות חודשי ואחוז עלות גלם ממוצע - המערכת תחשב הכל אוטומטית.
              </AlertDescription>
            </Alert>
          )}
          
          {isLargeCatalog && planningMode === 'detailed' && (
            <Alert className="mt-4 bg-orange-500/10 border-orange-500/30">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-horizon-text">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="font-semibold text-orange-400 mb-1">
                      קטלוג גדול מאוד - {forecastData.services.length.toLocaleString('he-IL')} מוצרים
                    </div>
                    <div className="text-sm">
                      {isLargeCatalog && viewMode === 'virtual' && (
                        <span className="text-green-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Virtual Scrolling פעיל - ביצועים מיטביים
                        </span>
                      )}
                      {isLargeCatalog && viewMode !== 'virtual' && (
                        <span>מומלץ מאוד תכנון כללי או תצוגה וירטואלית לביצועים טובים</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePlanningModeChange('aggregate')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      תכנון כללי
                    </Button>
                    {viewMode !== 'virtual' && (
                      <Button
                        size="sm"
                        onClick={() => setViewMode('virtual')}
                        variant="outline"
                        className="border-blue-500 text-blue-400"
                      >
                        תצוגה וירטואלית
                      </Button>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {planningMode === 'aggregate' ? (
        <AggregatePlanning
          forecastData={forecastData}
          onUpdateForecast={onUpdateForecast}
        />
      ) : (
        <>
          {/* סיכום דוחות Z שהועלו */}
          <ZReportMonthSummary
            forecastData={forecastData}
            salesForecast={salesForecast}
            services={forecastData.services || []}
            onUpdateZReport={handleUpdateZReport}
            customer={customer}
          />


      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-horizon-text flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-horizon-primary" />
                תחזית מכירות חודשית - תכנון מול ביצוע
                <SaveProgressIndicator
                  onSave={handleSaveProgress}
                  isSaving={isSaving}
                  lastSaved={lastSaved}
                  saveStatus={saveStatus}
                  compact={true}
                />
              </CardTitle>
              <p className="text-horizon-accent">הזן את כמויות המכירה המתוכננות והבפועל לכל חודש</p>
            </div>
            <div className="flex items-center gap-2">
              {isLargeCatalog && (
                <Badge variant="outline" className="border-orange-500 text-orange-400">
                  {forecastData.services.length.toLocaleString('he-IL')} מוצרים
                </Badge>
              )}
              
              <div className="flex bg-horizon-card/50 rounded-lg p-1 border border-horizon">
                <Button
                  size="sm"
                  variant={viewMode === 'category' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('category')}
                  className={viewMode === 'category' ? 'btn-horizon-primary' : 'text-horizon-text'}
                >
                  <Package className="w-4 h-4 ml-1" />
                  קטגוריות
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'btn-horizon-primary' : 'text-horizon-text'}
                  disabled={isLargeCatalog}
                  title={isLargeCatalog ? 'לא זמין לקטלוגים גדולים' : ''}
                >
                  <GripVertical className="w-4 h-4 ml-1" />
                  רשימה
                </Button>
                {isLargeCatalog && (
                  <Button
                    size="sm"
                    variant={viewMode === 'virtual' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('virtual')}
                    className={viewMode === 'virtual' ? 'btn-horizon-primary' : 'text-horizon-text'}
                  >
                    <Zap className="w-4 h-4 ml-1" />
                    וירטואלי
                  </Button>
                )}
              </div>
              {planningMode === 'detailed' && (
                <Button
                  onClick={() => setShowZReportUploader(true)}
                  className="btn-horizon-secondary"
                  disabled={!forecastData.services || forecastData.services.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 ml-2" />
                  ייבא דוח Z
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {planningMode === 'detailed' && (
            <div className="mb-4">
              <Label className="text-horizon-text">ימי עבודה בחודש (ממוצע)</Label>
              <Input
                type="number"
                value={workingDays}
                onChange={(e) => setWorkingDays(parseFloat(e.target.value) || 22)}
                className="bg-horizon-card border-horizon text-horizon-text w-32"
              />
            </div>
          )}

          {planningMode === 'detailed' && (
            <div>
              {/* מקרא */}
              <div className="flex gap-4 mb-4 p-3 bg-horizon-card/30 rounded-lg border border-horizon">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-horizon-text">תכנון</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-horizon-text">ביצוע בפועל</span>
                </div>
              </div>

              {viewMode === 'category' ? (
            // ✅ תצוגה לפי קטגוריות עם pagination למניעת קריסה
            <div className="space-y-4">
              {(() => {
                const categoryEntries = Object.entries(categorizedServices);
                const totalCategories = categoryEntries.length;
                const startCategoryIdx = (categoryPage - 1) * CATEGORIES_PER_PAGE;
                const endCategoryIdx = startCategoryIdx + CATEGORIES_PER_PAGE;
                const displayedCategories = categoryEntries.slice(startCategoryIdx, endCategoryIdx);
                const totalPages = Math.ceil(totalCategories / CATEGORIES_PER_PAGE);
                
                return (
                  <>
                    {displayedCategories.map(([categoryName, { services, startIndex }]) => (
                      <ServiceCategoryGroup
                        key={categoryName}
                        categoryName={categoryName}
                        services={services}
                        salesData={salesForecast}
                        monthNames={monthNames}
                        onUpdateQuantity={updateQuantity}
                        startIndex={startIndex}
                      />
                    ))}
                    
                    {/* Pagination controls */}
                    {totalCategories > CATEGORIES_PER_PAGE && (
                      <div className="flex items-center justify-center gap-4 pt-4 border-t border-horizon">
                        <Button
                          onClick={() => setCategoryPage(p => Math.max(1, p - 1))}
                          disabled={categoryPage === 1}
                          variant="outline"
                          className="border-horizon text-horizon-text"
                        >
                          <ChevronRight className="w-4 h-4 ml-2" />
                          קודם
                        </Button>
                        <span className="text-horizon-text">
                          עמוד {categoryPage} מתוך {totalPages} ({totalCategories} קטגוריות)
                        </span>
                        <Button
                          onClick={() => setCategoryPage(p => Math.min(totalPages, p + 1))}
                          disabled={categoryPage >= totalPages}
                          variant="outline"
                          className="border-horizon text-horizon-text"
                        >
                          הבא
                          <ChevronLeft className="w-4 h-4 mr-2" />
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : viewMode === 'virtual' ? (
            // ✅ Virtual Scrolling לקטלוגים גדולים
            <div className="space-y-4">
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Zap className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-horizon-text">
                  <strong>תצוגה וירטואלית פעילה</strong> - רק מוצרים נראים נטענים לזיכרון.
                  גלילה חלקה עם {salesForecast.length.toLocaleString('he-IL')} מוצרים.
                  {isLargeCatalog && (
                    <div className="mt-1 text-xs text-blue-300">
                      💡 Drag & Drop מבוטל לביצועים מיטביים
                    </div>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="border border-horizon rounded-lg overflow-hidden">
                <List
                  height={600}
                  itemCount={salesForecast.length}
                  itemSize={VIRTUAL_ITEM_HEIGHT}
                  width="100%"
                  className="bg-horizon-dark/20"
                >
                  {VirtualRow}
                </List>
              </div>
              
              <div className="text-center text-sm text-horizon-accent">
                מציג {salesForecast.length.toLocaleString('he-IL')} מוצרים בצורה וירטואלית
              </div>
            </div>
          ) : (
            // תצוגה רגילה - רשימה (רק לקטלוגים קטנים)
            <div>
              {isLargeCatalog && (
                <Alert className="mb-4 bg-red-500/10 border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-horizon-text">
                    <strong>אזהרה:</strong> תצוגת רשימה לא מומלצת לקטלוגים גדולים. 
                    עבור לתצוגה וירטואלית או לפי קטגוריות.
                  </AlertDescription>
                </Alert>
              )}
              
            <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sales-forecast-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {(() => {
                    // אם יש דוחות Z, נמיין לפי מוצרים שנמכרו קודם
                    const hasZReports = forecastData.z_reports_uploaded && forecastData.z_reports_uploaded.length > 0;
                    let sortedForecast = [...salesForecast];
                    
                    if (hasZReports) {
                      const soldItems = sortedForecast.filter(item => 
                        item.actual_monthly_quantities.some(qty => qty > 0)
                      );
                      const notSoldItems = sortedForecast.filter(item => 
                        !item.actual_monthly_quantities.some(qty => qty > 0)
                      );
                      sortedForecast = [...soldItems, ...notSoldItems];
                    }
                    
                    // ✅ Pagination: הצג רק מוצרים מהעמוד הנוכחי
                    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
                    const endIdx = startIdx + ITEMS_PER_PAGE;
                    return sortedForecast.slice(startIdx, endIdx);
                  })().map((item, serviceIndex) => {
                    // מצא את האינדקס המקורי
                    const originalIndex = salesForecast.findIndex(s => s.service_name === item.service_name);
                    return (
                    <Draggable
                      key={`sales-${originalIndex}`}
                      draggableId={`sales-${originalIndex}`}
                      index={serviceIndex}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-horizon-card/30 border border-horizon rounded-lg p-4 ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-horizon-primary' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-5 h-5 text-horizon-accent" />
                            </div>

                            <h4 className="font-semibold text-horizon-text flex-1">
                              {item.service_name}
                            </h4>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleServiceCollapse(originalIndex)}
                              className="text-horizon-accent"
                            >
                              {collapsedServices[originalIndex] ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </Button>
                          </div>

                          {!collapsedServices[serviceIndex] && (
                            <div className="mr-8">
                              <div className="grid grid-cols-6 gap-3">
                                {monthNames.map((month, monthIndex) => (
                                  <div key={monthIndex} className="space-y-2">
                                    <div className="flex flex-col items-center">
                                      <Label className="text-xs text-horizon-accent block text-center">{month}</Label>
                                      {item.actual_monthly_quantities[monthIndex] > 0 && (
                                        <div className="flex items-center gap-1 mt-0.5 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200 shadow-sm">
                                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                                          <span className="text-[10px] text-green-700 font-medium">נקלט</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* תכנון */}
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-blue-400">תכנון</Label>
                                      <Input
                                        type="number"
                                        value={item.planned_monthly_quantities[monthIndex] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                          updateQuantity(originalIndex, monthIndex, 'planned', val);
                                        }}
                                        className="bg-horizon-card border-blue-400/30 text-horizon-text text-sm h-8"
                                        placeholder="0"
                                      />
                                      <div className="text-[10px] text-blue-400 text-center">
                                        {formatCurrency(item.planned_monthly_revenue[monthIndex], 0)}
                                      </div>
                                    </div>

                                    {/* ביצוע */}
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-green-400">ביצוע</Label>
                                      <Input
                                        type="number"
                                        value={item.actual_monthly_quantities[monthIndex] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                          updateQuantity(originalIndex, monthIndex, 'actual', val);
                                        }}
                                        className="bg-horizon-card border-green-400/30 text-horizon-text text-sm h-8"
                                        placeholder="0"
                                      />
                                      <div className="text-[10px] text-green-400 text-center">
                                        {formatCurrency(item.actual_monthly_revenue[monthIndex], 0)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
          </div>
          )}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="border-horizon text-horizon-text">
          <ChevronRight className="w-4 h-4 ml-2" />
          חזור
        </Button>
        <Button 
          onClick={handleContinue} 
          className="btn-horizon-primary"
          disabled={isSavingBeforeContinue}
        >
          {isSavingBeforeContinue ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר נתונים...
            </>
          ) : (
            <>
              המשך
              <ChevronLeft className="w-4 h-4 mr-2" />
            </>
          )}
        </Button>
      </div>

      {showZReportUploader && (
        <ZReportUploader
          isOpen={showZReportUploader}
          onClose={() => setShowZReportUploader(false)}
          forecastData={forecastData}
          onDataImported={handleZReportImport}
        />
      )}

      {showProductMapper && pendingZData && (
        <ZReportProductMapper
          zProducts={pendingZData.products}
          services={forecastData.services || []}
          existingMapping={forecastData.z_report_product_mapping || {}}
          onMappingComplete={handleMappingComplete}
          onCancel={() => {
            setShowProductMapper(false);
            setPendingZData(null);
          }}
        />
      )}

      {/* Loading Overlay לייבוא דוח Z */}
      {isImportingZReport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
          <Card className="card-horizon p-8 max-w-md mx-4">
            <CardContent className="text-center space-y-4 p-6">
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-horizon-primary" />
              <h3 className="text-2xl font-bold text-horizon-text">מייבא דוח Z...</h3>
              <Progress value={importProgress} className="h-3" />
              <div className="space-y-1">
                <p className="text-lg font-semibold text-horizon-primary">{importProgress}% הושלם</p>
                {importStatusText && (
                  <p className="text-sm text-horizon-accent animate-pulse">{importStatusText}</p>
                )}
              </div>
              <p className="text-xs text-horizon-accent">
                {importProgress < 20 && '⏱️ יוצר תחזית...'}
                {importProgress >= 20 && importProgress < 50 && '🔄 מעבד מוצרים...'}
                {importProgress >= 50 && importProgress < 80 && '☁️ שומר נתונים לענן...'}
                {importProgress >= 80 && importProgress < 95 && '💾 מעדכן תחזית...'}
                {importProgress >= 95 && '✅ מסיים...'}
              </p>
              {retryAttempt > 0 && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                  ניסיון {retryAttempt + 1} מתוך 3
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}