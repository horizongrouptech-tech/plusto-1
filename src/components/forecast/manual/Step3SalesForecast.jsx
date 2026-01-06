import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, GripVertical, Eye, EyeOff, TrendingUp, Calendar, Upload, FileSpreadsheet, CheckCircle2, Package, BarChart3, Calculator, Loader2, Filter, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency, formatNumber } from './utils/numberFormatter';
import ZReportUploader from './ZReportUploader';
import ZReportProductMapper from './ZReportProductMapper';
import ZReportMonthSummary from './ZReportMonthSummary';
import ChunkedProcessingOverlay from '@/components/shared/ChunkedProcessingOverlay';
import { base44 } from "@/api/base44Client";
import ServiceCategoryGroup from './ServiceCategoryGroup';
import AggregatePlanning from './AggregatePlanning';
import FutureRevenueUploader from './FutureRevenueUploader';
import { AlertCircle, Calculator, ChevronRight } from "lucide-react";

export default function Step3SalesForecast({ forecastData, onUpdateForecast, onNext, onBack }) {
  // ✅ CRITICAL: Validate data before initializing state
  if (!forecastData) {
    return (
      <Card className="p-8 text-center card-horizon">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-horizon-primary" />
        <p className="text-horizon-text">טוען נתוני תחזית...</p>
      </Card>
    );
  }

  // ✅ CRITICAL: בדיקת גודל נתונים - מניעת קריסה
  const servicesCount = forecastData.services?.length || 0;
  const salesForecastCount = forecastData.sales_forecast_onetime?.length || 0;
  const maxDataSize = Math.max(servicesCount, salesForecastCount);

  if (maxDataSize > 1000) {
    return (
      <Card className="p-8 card-horizon">
        <CardHeader>
          <CardTitle className="text-xl text-red-400 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            מערך נתונים גדול מדי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-horizon-text">
              התחזית מכילה <strong>{maxDataSize.toLocaleString()}</strong> מוצרים - זה גדול מדי לתצוגה מפורטת.
              <br /><br />
              <strong>פתרונות מומלצים:</strong>
              <ul className="list-disc mr-6 mt-2 space-y-1">
                <li>השתמש ב<strong>תכנון כללי</strong> (מחזור מכירות + אחוז עלות)</li>
                <li>פצל את הקטלוג למספר תחזיות קטנות יותר לפי קטגוריות</li>
                <li>סנן מוצרים עם מכירות בפועל בלבד</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button onClick={onBack} variant="outline" className="flex-1 border-horizon text-horizon-text">
              <ChevronRight className="w-4 h-4 ml-2" />
              חזור
            </Button>
            <Button 
              onClick={() => {
                // מעבר לתכנון כללי
                onUpdateForecast({ use_aggregate_planning: true });
                window.location.reload();
              }} 
              className="flex-1 btn-horizon-primary"
            >
              <Calculator className="w-4 h-4 ml-2" />
              עבור לתכנון כללי
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ✅ OPTIMIZED: טעינת נתונים חכמה עם memo למניעת re-calculations
  const [salesForecast, setSalesForecast] = useState(() => {
    try {
      if (!forecastData.services || !Array.isArray(forecastData.services)) {
        console.warn('⚠️ No services found in forecastData');
        return [];
      }

      const servicesCount = forecastData.services.length;
      console.log(`📊 Initializing ${servicesCount} products for sales forecast`);

      // ✅ אופטימיזציה - יצירת map למציאה מהירה
      const existingMap = new Map();
      (forecastData.sales_forecast_onetime || []).forEach(item => {
        existingMap.set(item.service_name, item);
      });

      return forecastData.services.map((service) => {
        const existingForecast = existingMap.get(service.service_name);

        // אם יש נתונים קיימים - משתמש בהם, אחרת - יוצר אפסים
        return existingForecast || {
          service_name: service.service_name,
          planned_monthly_quantities: Array(12).fill(0),
          actual_monthly_quantities: Array(12).fill(0),
          planned_monthly_revenue: Array(12).fill(0),
          actual_monthly_revenue: Array(12).fill(0)
        };
      });
    } catch (error) {
      console.error('❌ Error initializing sales forecast:', error);
      return [];
    }
  });
  
  const [workingDays, setWorkingDays] = useState(forecastData.working_days_per_month || 22);
  const [collapsedServices, setCollapsedServices] = useState(() => {
    // ✅ ברירת מחדל - כל המוצרים collapsed כדי למנוע קריסה
    // אם יש יותר מ-50 מוצרים, התחל עם הכל collapsed
    const shouldCollapseAll = salesForecast.length > 50;
    try {
      const initial = {};
      const maxItems = Math.min(salesForecast.length, 2000);
      for (let idx = 0; idx < maxItems; idx++) {
        initial[idx] = shouldCollapseAll;
      }
      return initial;
    } catch (error) {
      console.error('Error initializing collapsed state:', error);
      return {};
    }
  });
  const [showZReportUploader, setShowZReportUploader] = useState(false);
  const [showProductMapper, setShowProductMapper] = useState(false);
  const [pendingZData, setPendingZData] = useState(null);
  const [viewMode, setViewMode] = useState('category'); // 'category' או 'list'
  const [planningMode, setPlanningMode] = useState(forecastData.use_aggregate_planning ? 'aggregate' : 'detailed');
  const [isProcessingZReport, setIsProcessingZReport] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [processedItems, setProcessedItems] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [showOnlyWithData, setShowOnlyWithData] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30; // ✅ הגדלה ל-30 לביצועים טובים יותר

  // ✅ REMOVED: useEffect מיותר - ה-useState כבר מטפל בזה בתחילת הקומפוננטה

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
    try {
      if (serviceIndex < 0 || serviceIndex >= salesForecast.length) {
        console.error('Invalid serviceIndex:', serviceIndex);
        return;
      }

      const updated = [...salesForecast];
      const parsedValue = parseFloat(value) || 0;

      if (type === 'planned') {
        updated[serviceIndex].planned_monthly_quantities[monthIndex] = parsedValue;

        const service = forecastData.services?.[serviceIndex];
        const price = service?.price || 0;
        updated[serviceIndex].planned_monthly_revenue[monthIndex] = parsedValue * price;
      } else {
        updated[serviceIndex].actual_monthly_quantities[monthIndex] = parsedValue;

        const service = forecastData.services?.[serviceIndex];
        const price = service?.price || 0;
        updated[serviceIndex].actual_monthly_revenue[monthIndex] = parsedValue * price;
      }

      setSalesForecast(updated);
    } catch (error) {
      console.error('❌ Error updating quantity:', error);
    }
  };

  const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

  const handleZReportImport = (importData) => {
    setPendingZData(importData);
    setShowZReportUploader(false);
    setShowProductMapper(true);
  };

  const handleMappingComplete = async (mapping) => {
    if (!pendingZData) return;

    // ✅ FIX #2: Validate products array
    if (!pendingZData.products || !Array.isArray(pendingZData.products) || pendingZData.products.length === 0) {
      alert('שגיאה: לא נמצאו מוצרים לייבוא');
      setShowProductMapper(false);
      setPendingZData(null);
      return;
    }

    // ✅ Validate month
    if (!pendingZData.month || pendingZData.month < 1 || pendingZData.month > 12) {
      alert('שגיאה: חודש לא תקין');
      setShowProductMapper(false);
      setPendingZData(null);
      return;
    }

    // 🔒 סגור את ה-Dialog מיד
    setShowProductMapper(false);

    const allProducts = pendingZData.products;
    const CHUNK_SIZE = 500;
    const chunks = [];
    
    for (let i = 0; i < allProducts.length; i += CHUNK_SIZE) {
      chunks.push(allProducts.slice(i, i + CHUNK_SIZE));
    }

    const zReportId = `zreport_${Date.now()}_${forecastData.id}`;
    
    // 📊 הצג loading עם chunks
    setIsProcessingZReport(true);
    setTotalChunks(chunks.length);
    setTotalItems(allProducts.length);
    setProcessedItems(0);
    setCurrentChunk(0);
    setProcessingMessage('מתחיל ייבוא נתונים...');

    try {
      let finalSalesForecast = null;
      let finalUploadedReports = null;

      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunk(i + 1);
        setProcessedItems((i * CHUNK_SIZE) + Math.min(CHUNK_SIZE, chunks[i].length));
        setProcessingMessage(`מעבד חבילה ${i + 1} מתוך ${chunks.length}...`);

        // ✅ NETWORK ERROR HANDLING: Retry logic
        let retries = 0;
        const MAX_RETRIES = 3;
        let response;

        while (retries < MAX_RETRIES) {
          try {
            response = await base44.functions.invoke('processBulkZReportImportChunked', {
              forecast_id: forecastData.id,
              z_products: chunks[i],
              mapping: mapping,
              assigned_month: pendingZData.month,
              chunk_index: i,
              total_chunks: chunks.length,
              is_first_chunk: i === 0,
              is_last_chunk: i === chunks.length - 1,
              z_report_id: zReportId
            });

            if (!response?.data?.success) {
              throw new Error(response?.data?.error || `שגיאה בחבילה ${i + 1}`);
            }

            break; // Success - exit retry loop
          } catch (error) {
            retries++;
            console.error(`❌ Attempt ${retries}/${MAX_RETRIES} failed:`, error);
            
            if (retries >= MAX_RETRIES) {
              throw new Error(`נכשל אחרי ${MAX_RETRIES} ניסיונות: ${error.message}`);
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }

        finalSalesForecast = response.data.sales_forecast;
        if (response.data.uploaded_reports) {
          finalUploadedReports = response.data.uploaded_reports;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // ✅ FIX #3: Handle finalSalesForecast type correctly
      let salesForecastArray = [];
      if (finalSalesForecast) {
        if (Array.isArray(finalSalesForecast)) {
          salesForecastArray = finalSalesForecast;
        } else if (typeof finalSalesForecast === 'object') {
          salesForecastArray = Object.values(finalSalesForecast);
        }
      }

      // עדכון ה-state המקומי
      setSalesForecast(salesForecastArray);

      if (onUpdateForecast) {
        onUpdateForecast({
          sales_forecast_onetime: salesForecastArray,
          uploaded_reports: finalUploadedReports,
          z_product_mapping: {
            ...(forecastData.z_product_mapping || {}),
            ...mapping
          }
        });
      }

      setProcessingMessage('הושלם בהצלחה!');
      await new Promise(resolve => setTimeout(resolve, 800));

      // ✅ FIX #1: Store month before nullifying state
      const importedMonth = pendingZData.month;
      const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

      setPendingZData(null);
      setIsProcessingZReport(false);

      alert(`✅ דוח Z יובא בהצלחה!\n${allProducts.length} מוצרים יובאו בחודש ${monthNames[importedMonth - 1]}`);

    } catch (error) {
      console.error('❌ Error in chunked import:', error);
      setIsProcessingZReport(false);
      setPendingZData(null);
      alert('שגיאה בייבוא דוח Z:\n' + error.message);
    }
  };

  const handleSalesForecastUpdate = (updatedForecast) => {
    setSalesForecast(updatedForecast);
  };

  const handleUpdateZReport = async (updatedReport) => {
    try {
      if (!updatedReport || !updatedReport.month_assigned) {
        throw new Error('נתוני דוח לא תקינים');
      }

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
        if (item.actual_monthly_quantities && item.actual_monthly_revenue) {
          item.actual_monthly_quantities[monthIndex] = 0;
          item.actual_monthly_revenue[monthIndex] = 0;
        }
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
        await base44.entities.ManualForecast.update(forecastData.id, completeUpdates);
        console.log('✅ Z-report updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating Z report:', error);
      alert('שגיאה בעדכון הדוח: ' + error.message);
      throw error;
    }
  };

  const handleContinue = async () => {
    try {
      console.log('💾 Step3 - Saving sales forecast before continue:', salesForecast.length, 'items');
      
      const updates = {
        sales_forecast_onetime: salesForecast,
        working_days_per_month: workingDays
      };
      
      if (onUpdateForecast) {
        onUpdateForecast(updates);
      }
      
      // ✅ המתן לשמירה לפני המעבר לשלב הבא
      if (forecastData.id) {
        console.log('💾 Explicitly saving to DB before moving to next step...');
        await base44.entities.ManualForecast.update(forecastData.id, updates);
        console.log('✅ Save completed successfully');
      }
      
      if (onNext) {
        onNext();
      }
    } catch (error) {
      console.error('❌ Error in handleContinue:', error);
      alert('שגיאה בשמירת הנתונים. אנא נסה שוב.');
    }
  };

  // ✅ OPTIMIZED: קיבוץ מוצרים לפי קטגוריה עם useMemo
  const categorizedServices = useMemo(() => {
    try {
      if (!forecastData.services || !Array.isArray(forecastData.services)) {
        return {};
      }

      // ✅ הגבלה - עד 500 מוצרים בתצוגת קטגוריה
      const servicesToGroup = forecastData.services.slice(0, 500);

      const grouped = {};
      servicesToGroup.forEach((service, idx) => {
        const category = service.category || 'ללא קטגוריה';
        if (!grouped[category]) {
          grouped[category] = { services: [], startIndex: idx };
        }
        grouped[category].services.push(service);
      });
      return grouped;
    } catch (error) {
      console.error('Error grouping services:', error);
      return {};
    }
  }, [forecastData.services]);

  const handlePlanningModeChange = (mode) => {
    setPlanningMode(mode);
    onUpdateForecast({
      use_aggregate_planning: mode === 'aggregate'
    });
  };

  return (
    <>
      {/* מסך טעינה אלגנטי עם chunked progress */}
      <ChunkedProcessingOverlay
        isVisible={isProcessingZReport}
        currentChunk={currentChunk}
        totalChunks={totalChunks}
        processedItems={processedItems}
        totalItems={totalItems}
        message={processingMessage}
      />

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
            onUpdateForecast={onUpdateForecast}
          />

          {/* העלאת קובץ הכנסה עתידי */}
          <FutureRevenueUploader
            forecastData={forecastData}
            onUpdateForecast={onUpdateForecast}
            salesForecast={salesForecast}
            onSalesForecastUpdate={setSalesForecast}
          />

      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-horizon-text flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-horizon-primary" />
                תחזית מכירות חודשית - תכנון מול ביצוע
              </CardTitle>
              <p className="text-horizon-accent">הזן את כמויות המכירה המתוכננות והבפועל לכל חודש</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-horizon-card/50 rounded-lg p-1 border border-horizon">
                <Button
                  size="sm"
                  variant={viewMode === 'category' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('category')}
                  className={viewMode === 'category' ? 'btn-horizon-primary' : 'text-horizon-text'}
                >
                  <Package className="w-4 h-4 ml-1" />
                  לפי קטגוריה
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'btn-horizon-primary' : 'text-horizon-text'}
                >
                  <GripVertical className="w-4 h-4 ml-1" />
                  רשימה
                </Button>
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
            <>
              {/* מקרא ופילטרים */}
              <div className="flex gap-4 mb-4 p-3 bg-horizon-card/30 rounded-lg border border-horizon items-center flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-horizon-text">תכנון</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-horizon-text">ביצוע בפועל</span>
                </div>
                
                <div className="flex-1 min-w-[20px]" />
                
                {/* חיפוש */}
                {viewMode === 'list' && (
                  <div className="relative w-48">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                    <Input
                      placeholder="חפש מוצר..."
                      value={searchFilter}
                      onChange={(e) => {
                        setSearchFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pr-10 bg-horizon-card border-horizon text-horizon-text h-8 text-sm"
                    />
                  </div>
                )}
                
                {/* פילטר - רק עם נתונים */}
                <Button
                  size="sm"
                  variant={showOnlyWithData ? 'default' : 'outline'}
                  onClick={() => {
                    setShowOnlyWithData(!showOnlyWithData);
                    setCurrentPage(1);
                  }}
                  className={showOnlyWithData ? 'btn-horizon-primary h-8' : 'border-horizon text-horizon-text h-8'}
                >
                  <Filter className="w-3 h-3 ml-1" />
                  {showOnlyWithData ? 'רק עם נתונים' : 'הצג הכל'}
                </Button>
                
                {/* כפתורים expand/collapse הכל */}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newState = {};
                      salesForecast.forEach((_, idx) => {
                        newState[idx] = false;
                      });
                      setCollapsedServices(newState);
                    }}
                    className="border-horizon text-horizon-text h-8 text-xs"
                  >
                    <ChevronDown className="w-3 h-3 ml-1" />
                    פתח הכל
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newState = {};
                      salesForecast.forEach((_, idx) => {
                        newState[idx] = true;
                      });
                      setCollapsedServices(newState);
                    }}
                    className="border-horizon text-horizon-text h-8 text-xs"
                  >
                    <ChevronUp className="w-3 h-3 ml-1" />
                    סגור הכל
                  </Button>
                </div>
              </div>

          {viewMode === 'category' ? (
            // תצוגה לפי קטגוריות
            <div className="space-y-4">
              {Object.entries(categorizedServices).map(([categoryName, { services, startIndex }]) => (
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
            </div>
          ) : (
            // תצוגה רגילה - רשימה עם pagination
            (() => {
              try {
                // ✅ OPTIMIZED: סינון עם הגבלת תוצאות
                const filtered = salesForecast.filter((item, idx) => {
                  if (!item) return false;

                  // סינון לפי חיפוש
                  if (searchFilter && !item.service_name?.toLowerCase().includes(searchFilter.toLowerCase())) {
                    return false;
                  }

                  // סינון לפי "רק עם נתונים"
                  if (showOnlyWithData) {
                    const hasData = item.planned_monthly_quantities?.some(q => q > 0) || 
                                    item.actual_monthly_quantities?.some(q => q > 0);
                    return hasData;
                  }

                  return true;
                }).slice(0, 1000); // ✅ הגבלה קשיחה - מקסימום 1000 מוצרים בכל מקרה
                
                const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                const paginatedItems = filtered.slice(
                  (currentPage - 1) * ITEMS_PER_PAGE,
                  currentPage * ITEMS_PER_PAGE
                );
                
                // ✅ OPTIMIZATION: Disable DragDrop for large datasets
                const isDragEnabled = filtered.length < 50; // ✅ הורדה ל-50 למניעת קריסות
                
                return (
                  <>
                    {isDragEnabled ? (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="sales-forecast-list">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="space-y-4"
                            >
                              {paginatedItems.map((item, displayIdx) => {
                                const serviceIndex = salesForecast.indexOf(item);
                                return (
                    <Draggable
                      key={`sales-${serviceIndex}`}
                      draggableId={`sales-${serviceIndex}`}
                      index={displayIdx}
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
                              onClick={() => toggleServiceCollapse(serviceIndex)}
                              className="text-horizon-accent"
                            >
                              {collapsedServices[serviceIndex] ? (
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
                                        value={item.planned_monthly_quantities[monthIndex]}
                                        onChange={(e) => updateQuantity(serviceIndex, monthIndex, 'planned', e.target.value)}
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
                                        value={item.actual_monthly_quantities[monthIndex]}
                                        onChange={(e) => updateQuantity(serviceIndex, monthIndex, 'actual', e.target.value)}
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
                    ) : (
                      // רשימה רגילה ללא drag & drop למערכי נתונים גדולים
                      <div className="space-y-4">
                        {!isDragEnabled && (
                          <Alert className="bg-yellow-500/10 border-yellow-500/30">
                            <AlertDescription className="text-horizon-text text-sm">
                              גרירה מבוטלת - יותר מ-100 מוצרים. השתמש בחיפוש ופילטרים.
                            </AlertDescription>
                          </Alert>
                        )}
                        {paginatedItems.map((item, displayIdx) => {
                          const serviceIndex = salesForecast.indexOf(item);
                          return (
                            <div
                              key={`sales-${serviceIndex}`}
                              className="bg-horizon-card/30 border border-horizon rounded-lg p-4"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="font-semibold text-horizon-text flex-1">
                                  {item.service_name}
                                </h4>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleServiceCollapse(serviceIndex)}
                                  className="text-horizon-accent"
                                >
                                  {collapsedServices[serviceIndex] ? (
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
                                            value={item.planned_monthly_quantities[monthIndex]}
                                            onChange={(e) => updateQuantity(serviceIndex, monthIndex, 'planned', e.target.value)}
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
                                            value={item.actual_monthly_quantities[monthIndex]}
                                            onChange={(e) => updateQuantity(serviceIndex, monthIndex, 'actual', e.target.value)}
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
                          );
                        })}
                      </div>
                    )}
                  
                    {/* Pagination */}
                    {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-horizon">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="border-horizon text-horizon-text"
                      >
                        <ChevronRight className="w-4 h-4" />
                        הקודם
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-horizon-accent">
                          עמוד {currentPage} מתוך {totalPages}
                        </span>
                        <Badge className="bg-horizon-primary/20 text-horizon-primary border-horizon-primary/30">
                          {filtered.length} מוצרים
                        </Badge>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="border-horizon text-horizon-text"
                      >
                        הבא
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                    )}
                  </>
                );
              } catch (error) {
                console.error('❌ Error rendering list view:', error);
                return (
                  <Alert className="bg-red-500/10 border-red-500/30">
                    <AlertDescription className="text-red-400">
                      שגיאה בטעינת רשימת המוצרים. אנא רענן את הדף.
                    </AlertDescription>
                  </Alert>
                );
              }
            })()
          )}
            </>
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
        <Button onClick={handleContinue} className="btn-horizon-primary">
          המשך
          <ChevronLeft className="w-4 h-4 mr-2" />
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
        <Dialog open={showProductMapper} onOpenChange={(open) => {
          if (!open) {
            setShowProductMapper(false);
            setPendingZData(null);
          }
        }}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden bg-horizon-dark border-horizon p-0" dir="rtl">
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
          </DialogContent>
        </Dialog>
      )}
    </div>
    </>
  );
}