import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, GripVertical, Eye, EyeOff, TrendingUp, Calendar, FileSpreadsheet, CheckCircle2, Package } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency } from './utils/numberFormatter';
import ZReportUploader from './ZReportUploader';
import ZReportProductMapper from './ZReportProductMapper';
import { base44 } from "@/api/base44Client";
import ServiceCategoryGroup from './ServiceCategoryGroup';

export default function Step3SalesForecast({ forecastData, onUpdateForecast, onNext, onBack }) {
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

    const monthIndex = pendingZData.month - 1;
    const updated = [...salesForecast];
    let productsUpdated = 0;

    pendingZData.products.forEach(zProduct => {
      const mappedServiceName = mapping[zProduct.product_name];
      if (!mappedServiceName) return;

      const serviceIndex = updated.findIndex(s => s.service_name === mappedServiceName);
      if (serviceIndex === -1) return;

      const currentActual = updated[serviceIndex].actual_monthly_quantities[monthIndex] || 0;
      const newQuantity = currentActual + zProduct.quantity_sold;
      
      updated[serviceIndex].actual_monthly_quantities[monthIndex] = newQuantity;

      const service = forecastData.services[serviceIndex];
      const price = service?.price || 0;
      updated[serviceIndex].actual_monthly_revenue[monthIndex] = newQuantity * price;

      productsUpdated++;
    });

    setSalesForecast(updated);

    const uploadRecord = {
      file_name: pendingZData.file_name,
      upload_date: new Date().toISOString(),
      month_assigned: pendingZData.month,
      products_updated: productsUpdated,
      total_revenue: pendingZData.summary.total_revenue_with_vat,
      file_url: pendingZData.file_url
    };

    const existingReports = forecastData.z_reports_uploaded || [];
    const updatedReports = [...existingReports, uploadRecord];

    if (onUpdateForecast) {
      onUpdateForecast({
        sales_forecast_onetime: updated,
        z_reports_uploaded: updatedReports,
        z_report_product_mapping: mapping
      });
    }

    if (forecastData.id) {
      try {
        await base44.entities.ManualForecast.update(forecastData.id, {
          z_reports_uploaded: updatedReports,
          z_report_product_mapping: mapping
        });
      } catch (error) {
        console.error('Error saving Z report upload history:', error);
      }
    }

    setShowProductMapper(false);
    setPendingZData(null);
    alert(`✓ דוח Z יובא בהצלחה!\n${productsUpdated} מוצרים עודכנו בחודש ${monthNames[monthIndex]}`);
  };

  const handleContinue = () => {
    if (onUpdateForecast) {
      onUpdateForecast({
        sales_forecast_onetime: salesForecast,
        working_days_per_month: workingDays
      });
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

  return (
    <div className="space-y-6" dir="rtl">
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
              <Button
                onClick={() => setShowZReportUploader(true)}
                className="btn-horizon-secondary"
                disabled={!forecastData.services || forecastData.services.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 ml-2" />
                ייבא דוח Z
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4">
            <Label className="text-horizon-text">ימי עבודה בחודש (ממוצע)</Label>
            <Input
              type="number"
              value={workingDays}
              onChange={(e) => setWorkingDays(parseFloat(e.target.value) || 22)}
              className="bg-horizon-card border-horizon text-horizon-text w-32"
            />
          </div>

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
        </CardContent>
      </Card>

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