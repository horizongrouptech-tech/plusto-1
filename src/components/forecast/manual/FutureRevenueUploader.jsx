import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Calendar, TrendingUp } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { parseFutureRevenueFile } from '@/functions/parseFutureRevenueFile';

export default function FutureRevenueUploader({ forecastData, onUpdateForecast, salesForecast, onSalesForecastUpdate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [productMapping, setProductMapping] = useState({});
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        alert('יש להעלות קובץ Excel או CSV בלבד');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setIsParsing(true);

    try {
      // העלה את הקובץ
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: selectedFile
      });

      // פרסר את הקובץ
      const parseResult = await parseFutureRevenueFile({
        file_url,
        file_name: selectedFile.name
      });

      if (parseResult.data && parseResult.data.rows && parseResult.data.rows.length > 0) {
        setParsedData(parseResult.data);
        
        // צור מיפוי אוטומטי
        const autoMapping = {};
        parseResult.data.rows.forEach(row => {
          const productNameInFile = row.product_name || row.description || '';
          
          // חפש התאמה אוטומטית למוצר קיים
          const matchedService = (forecastData.services || []).find(s => 
            s.service_name.toLowerCase().includes(productNameInFile.toLowerCase()) ||
            productNameInFile.toLowerCase().includes(s.service_name.toLowerCase())
          );
          
          if (matchedService) {
            autoMapping[productNameInFile] = matchedService.service_name;
          }
        });
        
        setProductMapping(autoMapping);
        setShowMappingModal(true);
      } else {
        alert('לא נמצאו נתונים בקובץ');
      }

    } catch (error) {
      console.error('Error uploading/parsing revenue file:', error);
      alert('שגיאה בעיבוד הקובץ: ' + error.message);
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const handleImportData = async () => {
    if (!parsedData || !parsedData.rows) return;

    setIsImporting(true);

    try {
      const updatedSalesForecast = [...salesForecast];

      parsedData.rows.forEach(row => {
        const productNameInFile = row.product_name || row.description || '';
        const mappedServiceName = productMapping[productNameInFile];

        if (!mappedServiceName) return;

        let forecastItem = updatedSalesForecast.find(item => item.service_name === mappedServiceName);
        
        if (!forecastItem) {
          forecastItem = {
            service_name: mappedServiceName,
            planned_monthly_quantities: Array(12).fill(0),
            actual_monthly_quantities: Array(12).fill(0),
            planned_monthly_revenue: Array(12).fill(0),
            actual_monthly_revenue: Array(12).fill(0)
          };
          updatedSalesForecast.push(forecastItem);
        }

        // עדכן את החודשים המתאימים
        const monthIndex = (row.month || 1) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          forecastItem.planned_monthly_quantities[monthIndex] = row.quantity || 0;
          forecastItem.planned_monthly_revenue[monthIndex] = row.revenue || 0;
        }
      });

      onSalesForecastUpdate(updatedSalesForecast);
      
      alert(`✅ יובאו ${parsedData.rows.length} שורות הכנסה עתידיות בהצלחה!`);
      
      setShowMappingModal(false);
      setSelectedFile(null);
      setParsedData(null);
      setProductMapping({});

    } catch (error) {
      console.error('Error importing revenue data:', error);
      alert('שגיאה בייבוא הנתונים: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Card className="card-horizon border-2 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            העלאת קובץ הכנסה עתידי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-500/10 border-green-500/30">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-horizon-text">
              <strong>העלה קובץ Excel/CSV</strong> עם הכנסות מתוכננות לפי חודש ומוצר.
              הקובץ צריך לכלול: שם מוצר, חודש (1-12), כמות והכנסה.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <Label className="text-horizon-text mb-2 block">בחר קובץ (Excel/CSV)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>

            {selectedFile && (
              <div className="bg-horizon-card/50 border border-green-500/30 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-horizon-text">{selectedFile.name}</span>
                </div>
                <Button
                  onClick={handleUploadAndParse}
                  disabled={isUploading || isParsing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מעבד...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-2" />
                      העלה וייבא
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* מודל מיפוי מוצרים */}
      <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
        <DialogContent className="sm:max-w-3xl bg-horizon-dark text-horizon-text border-horizon max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-horizon-primary">מיפוי מוצרים מקובץ ההכנסות</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-horizon-text text-sm">
                נמצאו {parsedData?.rows?.length || 0} שורות בקובץ. התאם כל מוצר למוצר קיים בתחזית.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parsedData?.rows?.map((row, idx) => {
                const productNameInFile = row.product_name || row.description || `מוצר ${idx + 1}`;
                
                return (
                  <div key={idx} className="bg-horizon-card/50 border border-horizon rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div>
                        <Label className="text-xs text-horizon-accent mb-1 block">מוצר בקובץ:</Label>
                        <p className="text-sm font-medium text-horizon-text">{productNameInFile}</p>
                        <p className="text-xs text-horizon-accent mt-1">
                          חודש {row.month}, כמות: {row.quantity}, הכנסה: {formatCurrency(row.revenue || 0)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-horizon-accent mb-1 block">התאם למוצר בתחזית:</Label>
                        <Select
                          value={productMapping[productNameInFile] || ''}
                          onValueChange={(value) => setProductMapping(prev => ({
                            ...prev,
                            [productNameInFile]: value
                          }))}
                        >
                          <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                            <SelectValue placeholder="בחר מוצר..." />
                          </SelectTrigger>
                          <SelectContent className="bg-horizon-dark border-horizon">
                            <SelectItem value={null}>ללא התאמה (דלג)</SelectItem>
                            {(forecastData.services || []).map(service => (
                              <SelectItem key={service.service_name} value={service.service_name}>
                                {service.service_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowMappingModal(false);
                setParsedData(null);
                setProductMapping({});
              }}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={handleImportData}
              disabled={isImporting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייבא...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  אשר ייבוא
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* סיכום דוחות Z */}
      <ZReportMonthSummary
        forecastData={forecastData}
        salesForecast={salesForecast}
        services={forecastData.services || []}
      />