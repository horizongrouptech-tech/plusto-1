import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  FileText, 
  X,
  FileSpreadsheet,
  FileImage,
  File as FileIcon
} from "lucide-react";

import UniversalFileProcessor from './UniversalFileProcessor';
import ColumnMappingModal from './ColumnMappingModal';
import DynamicFileDisplay from './DynamicFileDisplay';

export default function EnhancedFileUpload({ 
  customer, 
  onUploadComplete,
  onError 
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState(new Map());
  const [processedFiles, setProcessedFiles] = new useState(Map());
  const [dataCategory, setDataCategory] = useState('auto_detect');
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [currentMappingData, setCurrentMappingData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const SUPPORTED_CATEGORIES = [
    { value: 'auto_detect', label: 'זיהוי אוטומטי' },
    { value: 'sales_report', label: 'דוח מכירות' },
    { value: 'inventory_report', label: 'דוח מלאי' },
    { value: 'profit_loss', label: 'רווח והפסד' },
    { value: 'balance_sheet', label: 'מאזן' },
    { value: 'bank_statement', label: 'דוח בנק' },
    { value: 'credit_card_report', label: 'דוח כרטיס אשראי' },
    { value: 'promotions_report', label: 'דוח מבצעים' },
    { value: 'mixed_business_data', label: 'נתונים עסקיים מעורבים' }
  ];

  // זיהוי קבצי BiziBox
  const detectBiziBoxFile = (file) => {
    const fileName = file.name.toLowerCase();
    return fileName.includes('bizibox') || 
           fileName.includes('ביזיבוקס') ||
           (fileName.includes('.xlsx') && fileName.includes('תזרים'));
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
    setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessingComplete = async (fileData) => {
    const { fileMetadata, analysisResult, extractedData, file } = fileData;
    
    // זיהוי קבצי BiziBox ועיבודם בנפרד
    if (file && detectBiziBoxFile(file)) {
      try {
        setProcessingFiles(prev => new Map(prev).set(file.name, { status: 'processing', progress: 50 }));
        
        // העלאת הקובץ
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // קריאה לפונקציה המתמחה של BiziBox
        const response = await base44.functions.invoke('parseBizIboxFile', {
          fileUrl: file_url,
          customerEmail: customer.email
        });

        if (response.data.success) {
          // שמירת הקובץ ל-FileUpload entity
          await base44.entities.FileUpload.create({
            customer_email: customer.email,
            filename: file.name,
            file_url: file_url,
            file_type: file.name.split('.').pop()?.toLowerCase() || 'xlsx',
            status: 'analyzed',
            data_category: 'bank_statement',
            analysis_notes: `נוספו ${response.data.processed || 0} תנועות תזרים`,
            products_count: response.data.processed || 0,
            parsed_data: {
              summary: `${response.data.processed || 0} תנועות`,
              categories: response.data.categories || []
            }
          });

          setProcessingFiles(prev => new Map(prev).set(file.name, { status: 'completed', progress: 100 }));
          toast.success(`קובץ BiziBox עובד בהצלחה! ${response.data.processed || 0} תנועות נוספו`);
          
          if (onUploadComplete) {
            onUploadComplete({ success: true, processed: response.data.processed });
          }
        } else {
          throw new Error(response.data.error || 'שגיאה בעיבוד קובץ BiziBox');
        }
      } catch (error) {
        console.error('BiziBox file processing error:', error);
        setProcessingFiles(prev => new Map(prev).set(file.name, { status: 'failed', error: error.message }));
        toast.error('שגיאה בעיבוד קובץ BiziBox: ' + error.message);
        if (onError) onError(error);
      }
      return;
    }
    
    // עיבוד רגיל לקבצים אחרים
    if (analysisResult.columns_detected && analysisResult.file_type) {
      const needsManualMapping = analysisResult.columns_detected.some(col => 
        !col.suggested_mapping || col.confidence < 0.8
      );

      if (needsManualMapping) {
        setCurrentMappingData({
          fileData,
          columns: analysisResult.columns_detected,
          dataType: analysisResult.file_type
        });
        setMappingModalOpen(true);
        return;
      }
    }

    saveProcessedFile(fileData);
  };

  const handleMappingComplete = (mappings) => {
    if (currentMappingData) {
      const { fileData } = currentMappingData;
      
      // עדכון הנתונים עם המיפוי שנבחר
      const updatedData = {
        ...fileData,
        columnMappings: mappings
      };

      saveProcessedFile(updatedData);
      setCurrentMappingData(null);
    }
  };

  const saveProcessedFile = async (fileData) => {
    try {
      const { fileMetadata, analysisResult, extractedData, fileUrl, columnMappings } = fileData;

      // ייבוא ישות FileUpload
      const { FileUpload } = await import('@/entities/FileUpload');

      // שמירה לישות FileUpload
      const uploadRecord = {
        customer_email: customer.email,
        filename: fileMetadata.name,
        file_url: fileUrl,
        file_type: getFileExtension(fileMetadata.name),
        status: extractedData?.records?.length > 0 ? 'analyzed' : 'processed',
        data_category: analysisResult.file_type || dataCategory,
        analysis_notes: `נותח באופן אוטומטי: ${fileMetadata.strategy}`,
        parsed_data: {
          analysis: analysisResult,
          extracted: extractedData,
          column_mappings: columnMappings
        },
        parsing_metadata: {
          processing_strategy: fileMetadata.strategy,
          ai_analysis: true,
          columns_found: analysisResult.columns_detected?.length || 0,
          total_rows: extractedData?.total_extracted || 0,
          data_quality_score: calculateDataQuality(analysisResult, extractedData)
        }
      };

      // שמירת רשומת העלאה
      const savedUpload = await FileUpload.create(uploadRecord);

      // אם יש נתונים מובנים, שמור אותם לישויות הרלוונטיות
      if (extractedData?.records?.length > 0 && columnMappings) {
        await saveExtractedDataToEntities(
          extractedData.records, 
          columnMappings, 
          analysisResult.file_type,
          customer.email
        );
      }

      // עדכון מצב
      setProcessedFiles(prev => new Map(prev).set(fileMetadata.name, {
        ...fileData,
        uploadRecord: savedUpload
      }));

      if (onUploadComplete) {
        onUploadComplete(savedUpload);
      }

    } catch (error) {
      console.error('Error saving processed file:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  const saveExtractedDataToEntities = async (records, mappings, dataType, customerEmail) => {
    try {
      const { ProductCatalog } = await import('@/entities/ProductCatalog');
      const { Sale } = await import('@/entities/Sale');
      // ייבוא ישויות נוספות לפי הצורך

      // המרת נתונים בהתבסס על המיפוי
      const mappedRecords = records.map(record => {
        const mappedRecord = { customer_email: customerEmail };
        
        Object.entries(mappings).forEach(([originalColumn, systemField]) => {
          if (record[originalColumn] !== undefined) {
            mappedRecord[systemField] = record[originalColumn];
          }
        });

        return mappedRecord;
      });

      // שמירה לישויות המתאימות
      switch (dataType) {
        case 'products':
          for (const record of mappedRecords) {
            await ProductCatalog.create(record);
          }
          break;
          
        case 'sales':
          for (const record of mappedRecords) {
            await Sale.create(record);
          }
          break;
          
        // הוסף מקרים נוספים לפי הצורך
      }

    } catch (error) {
      console.error('Error saving extracted data to entities:', error);
      throw error;
    }
  };

  const calculateDataQuality = (analysis, extracted) => {
    let score = 50; // נקודת התחלה

    if (analysis.columns_detected) {
      // ציון גבוה יותר לעמודות עם ביטחון גבוה
      const avgConfidence = analysis.columns_detected.reduce((sum, col) => 
        sum + (col.confidence || 0), 0) / analysis.columns_detected.length;
      score += avgConfidence * 30;
    }

    if (extracted?.records?.length > 0) {
      score += 20; // בונוס לחילוץ מוצלח של נתונים
    }

    return Math.min(100, Math.max(0, score));
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };

  const getFileIcon = (filename) => {
    const ext = getFileExtension(filename);
    if (['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet;
    if (['jpg', 'jpeg', 'png'].includes(ext)) return FileImage;
    if (['pdf', 'doc', 'docx'].includes(ext)) return FileText;
    return FileIcon;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text">העלאת קבצים חכמה</CardTitle>
          <p className="text-horizon-accent">
            העלה קבצים מכל סוג והמערכת תנתח אותם באופן אוטומטי
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* בחירת קטגורייה */}
          <div>
            <Label className="text-horizon-text">קטגוריית נתונים</Label>
            <Select value={dataCategory} onValueChange={setDataCategory}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* אזור העלאת קבצים */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging 
                ? 'border-horizon-primary bg-horizon-primary/10' 
                : 'border-horizon hover:border-horizon-primary'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-horizon-primary' : 'text-horizon-accent'}`} />
            <h3 className="text-lg font-semibold text-horizon-text mb-2">
              {isDragging ? 'שחרר כאן את הקבצים' : 'גרור קבצים לכאן או לחץ לבחירה'}
            </h3>
            <p className="text-sm text-horizon-accent">
              תומך בכל סוגי הקבצים: Excel, CSV, PDF, תמונות ועוד
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
          </div>

          {/* רשימת קבצים שנבחרו */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-horizon-text">קבצים לעיבוד:</h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => {
                  const IconComponent = getFileIcon(file.name);
                  
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-horizon-card rounded-lg">
                      <IconComponent className="w-5 h-5 text-horizon-accent" />
                      <div className="flex-1">
                        <div className="font-medium text-horizon-text">{file.name}</div>
                        <div className="text-sm text-horizon-accent">
                          {(file.size / 1024).toFixed(1)} KB • {file.type || 'סוג לא ידוע'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* עיבוד קבצים */}
      {selectedFiles.map((file, index) => (
        <UniversalFileProcessor
          key={`${file.name}-${index}`}
          file={file}
          customer={customer}
          onProcessingComplete={handleProcessingComplete}
          onError={onError}
        />
      ))}

      {/* תצוגת קבצים מעובדים */}
      {processedFiles.size > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-horizon-text">קבצים שעובדו</h2>
          {Array.from(processedFiles.values()).map((fileData, index) => (
            <DynamicFileDisplay
              key={index}
              fileMetadata={fileData.fileMetadata}
              analysisResult={fileData.analysisResult}
              extractedData={fileData.extractedData}
              onViewDetails={() => {/* פתח מודל פרטים */}}
              onDownload={() => {/* הורד קובץ */}}
            />
          ))}
        </div>
      )}

      {/* מודל מיפוי עמודות */}
      <ColumnMappingModal
        isOpen={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        columns={currentMappingData?.columns}
        dataType={currentMappingData?.dataType}
        onMappingComplete={handleMappingComplete}
      />
    </div>
  );
}