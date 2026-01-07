import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight, ChevronLeft, GripVertical, Eye, EyeOff, TrendingUp, Calendar, Upload, FileSpreadsheet, CheckCircle2, Package, BarChart3, Calculator } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency, formatNumber } from './utils/numberFormatter';
import ZReportUploader from './ZReportUploader';
import ZReportProductMapper from './ZReportProductMapper';
import ZReportMonthSummary from './ZReportMonthSummary';
import { base44 } from "@/api/base44Client";
import ServiceCategoryGroup from './ServiceCategoryGroup';
import AggregatePlanning from './AggregatePlanning';
import FutureRevenueUploader from './FutureRevenueUploader';

export default function Step3SalesForecast({ forecastData, onUpdateForecast, onNext, onBack, customer, sanitizeAllForecastData, setForecastData }) {
  // ✅ תיקון: טוען נתונים קיימים מיד בהתחלה, לא אפסים!
  const [salesForecast, setSalesForecast] = useState(() => {
    return (forecastData.services || []).map((service) => {
      // מחפש אם יש נתונים קיימים למוצר הזה
      const existingForecast = (forecastData.sales_forecast_onetime || []).find(
        (f) => f.service_name === service.service_name
      );
      
      // אם יש נתונים קיימים - משתמש בהם, אחרת - יוצר אפסים
      return existingForecast || {
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
  const [viewMode, setViewMode] = useState('category'); // 'category' או 'list'
  const [planningMode, setPlanningMode] = useState(forecastData.use_aggregate_planning ? 'aggregate' : 'detailed');

  // ✅ useEffect נשאר רק כ-fallback למקרים מיוחדים
  useEffect(() => {
    // אופטימיזציה: בדיקה אם באמת צריך לחשב מחדש
    if (!forecastData.services) return;

    // עדכון רק אם יש שינויים במוצרים או בנתוני התחזית
    const updatedForecast = (forecastData.services || []).map((service) => {
      const existingForecast = (forecastData.sales_forecast_onetime || []).find(
        (f) => f.service_name === service.service_name
      );
      return existingForecast || {
        service_name: service.service_name,
        planned_monthly_quantities: Array(12).fill(0),
        actual_monthly_quantities: Array(12).fill(0),
        planned_monthly_revenue: Array(12).fill(0),
        actual_monthly_revenue: Array(12).fill(0)
      };
    });
    
    // שימוש ב-timeout קצר כדי לא לחסום את ה-UI אם יש עדכונים תכופים
    const timeoutId = setTimeout(() => {
        const hasChanges = JSON.stringify(updatedForecast) !== JSON.stringify(salesForecast);
        if (hasChanges) {
          setSalesForecast(updatedForecast);
        }
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [forecastData.services, forecastData.sales_forecast_onetime]);

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

    try {
      // ✅ שלב 1: וידוא שיש ID לתחזית - אם לא, יוצר אותה!
      console.log('🔍 Checking if forecast exists...');
      let forecastId = forecastData.id;
      
      if (!forecastId) {
        console.log('⚠️ No forecast ID - creating forecast first...');
        alert('יוצר תחזית חדשה לפני ייבוא דוח Z...');
        
        // יצירת תחזית עם שם אוטומטי אם אין
        const forecastName = forecastData.forecast_name?.trim() || `תחזית ${forecastData.forecast_year || new Date().getFullYear()}`;
        
        const newForecastData = {
          ...forecastData,
          forecast_name: forecastName,
          customer_email: customer?.email || forecastData.customer_email
        };
        
        const sanitizedData = sanitizeAllForecastData ? sanitizeAllForecastData(newForecastData) : newForecastData;
        const createdForecast = await base44.entities.ManualForecast.create(sanitizedData);
        
        forecastId = createdForecast.id;
        console.log('✅ Forecast created successfully:', forecastId);
        
        // עדכון state מיידי
        setForecastData(prev => ({ ...prev, id: forecastId }));
        if (onUpdateForecast) {
          onUpdateForecast({ id: forecastId });
        }
      }

      // ✅ שלב 2: עדכון נתוני המכירות
      const monthIndex = pendingZData.month - 1;
      const updated = [...salesForecast];
      let productsUpdated = 0;

      console.log('🗺️ Z-Report Mapping:', mapping);
      console.log('📦 Products from Z-Report:', pendingZData.products);

      // שמירת פרטי המוצרים למיפוי
      const detailedProducts = [];

      pendingZData.products.forEach(zProduct => {
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

        console.log(`✅ Updated "${mappedServiceName}": ${zProduct.quantity_sold} units, ₪${realRevenue}`);
        productsUpdated++;
      });

      setSalesForecast(updated);

      // ✅ שלב 3: יצירת ZReportDetails entity נפרד
      console.log('💾 Creating ZReportDetails entity...');
      const zReportDetail = await base44.entities.ZReportDetails.create({
        forecast_id: forecastId,
        customer_email: customer?.email || forecastData.customer_email,
        month_assigned: pendingZData.month,
        file_name: pendingZData.file_name,
        file_url: pendingZData.file_url,
        upload_date: new Date().toISOString(),
        products_count: detailedProducts.length,
        total_revenue: pendingZData.summary.total_revenue_with_vat,
        detailed_products: detailedProducts
      });

      console.log('✅ ZReportDetails created:', zReportDetail.id);

      // ✅ שלב 4: עדכון התחזית עם reference בלבד (ללא detailed_products!)
      const uploadRecord = {
        file_name: pendingZData.file_name,
        upload_date: new Date().toISOString(),
        month_assigned: pendingZData.month,
        products_updated: productsUpdated,
        total_revenue: pendingZData.summary.total_revenue_with_vat,
        file_url: pendingZData.file_url,
        z_report_detail_id: zReportDetail.id  // ✅ רק reference, לא כל הנתונים!
      };

      const existingReports = forecastData.z_reports_uploaded || [];
      const updatedReports = [...existingReports, uploadRecord];

      const completeUpdates = {
        sales_forecast_onetime: updated,
        z_reports_uploaded: updatedReports,
        z_report_product_mapping: {
          ...(forecastData.z_report_product_mapping || {}),
          ...mapping
        }
      };

      console.log('💾 Saving to ManualForecast (with reference only):', {
        forecast_id: forecastId,
        sales_items: updated.length,
        z_reports: updatedReports.length
      });

      // עדכון state מקומי
      if (onUpdateForecast) {
        onUpdateForecast(completeUpdates);
      }

      // שמירה ל-DB
      await base44.entities.ManualForecast.update(forecastId, completeUpdates);
      console.log('✅ Z-report data saved successfully');

      setShowProductMapper(false);
      setPendingZData(null);
      alert(`✓ דוח Z יובא בהצלחה!\n${productsUpdated} מוצרים עודכנו בחודש ${monthNames[monthIndex]}`);

    } catch (error) {
      console.error('❌ Error in handleMappingComplete:', error);
      alert('שגיאה בייבוא דוח Z: ' + error.message);
    }
  };

  const autoSaveForecast = (dataToSave) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!dataToSave.forecast_name?.trim()) {
        console.log('Skipping auto-save - missing forecast name');
        return;
      }

      setSaveStatus('saving');
      
      try {
        const sanitizedData = sanitizeAllForecastData(dataToSave);
        
        let savedForecast;
        
        if (sanitizedData.id) {
          await base44.entities.ManualForecast.update(sanitizedData.id, sanitizedData);
          savedForecast = sanitizedData;
        } else {
          savedForecast = await base44.entities.ManualForecast.create(sanitizedData);
          setForecastData(prev => ({ ...prev, id: savedForecast.id }));
        }
        
        setLastSaved(new Date());
        setSaveStatus('saved');
        
        setTimeout(() => {
          setSaveStatus(null);
        }, 3000);
        
      } catch (error) {
        console.error('Error auto-saving forecast:', error);
        setSaveStatus('error');
        
        setTimeout(() => {
          setSaveStatus(null);
        }, 5000);
      }
    }, 1500);
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
        await base44.entities.ManualForecast.update(forecastData.id, completeUpdates);
        console.log('✅ Z-report updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating Z report:', error);
      throw error;
    }
  };

  const handleContinue = async () => {
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
      try {
        console.log('💾 Explicitly saving to DB before moving to next step...');
        await base44.entities.ManualForecast.update(forecastData.id, updates);
        console.log('✅ Save completed successfully');
      } catch (error) {
        console.error('❌ Error saving before continue:', error);
      }
    }
    
    if (onNext) {
      onNext();
    }
  };

  // קיבוץ מוצרים לפי קטגוריה
  const groupServicesByCategory = () => {
    const grouped = {};
    forecastData.services?.forEach((service, idx) => {
      const category = service.category || 'ללא קטגוריה';
      if (!grouped[category]) {
        grouped[category] = { services: [], startIndex: idx };
      }
      grouped[category].services.push(service);
    });
    return grouped;
  };

  const categorizedServices = groupServicesByCategory();

  const handlePlanningModeChange = (mode) => {
    setPlanningMode(mode);
    onUpdateForecast({
      use_aggregate_planning: mode === 'aggregate'
    });
  };

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
            // תצוגה רגילה - רשימה
            <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sales-forecast-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {salesForecast.map((item, serviceIndex) => (
                    <Draggable
                      key={`sales-${serviceIndex}`}
                      draggableId={`sales-${serviceIndex}`}
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
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
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
    </div>
  );
}