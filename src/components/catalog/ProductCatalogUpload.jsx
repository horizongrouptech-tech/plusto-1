import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Wand2, Loader2 } from "lucide-react";
import { base44 } from '@/api/base44Client';

import ColumnMappingWizard from './ColumnMappingWizard';

const HEADER_MAPPING = {
  // Product Name
  'שם פריט': 'product_name',
  'שם המוצר': 'product_name',
  'שם מוצר': 'product_name',
  'product_name': 'product_name',
  'name': 'product_name',
  'description': 'product_name',
  'תיאור': 'product_name',
  'תאור': 'product_name',
  'מוצר': 'product_name',
  'פריט': 'product_name',
  'תחמור': 'product_name',

  // Barcode & Item Code
  'ברקוד': 'barcode',
  'מק"ט': 'barcode',
  'קוד פריט': 'barcode',
  'item_code': 'barcode',
  'sku': 'barcode',

  // Cost Price
  'מחיר עלות': 'cost_price',
  'מחיר קניה': 'cost_price',
  'עלות': 'cost_price',
  'cost_price': 'cost_price',
  'cost': 'cost_price',
  'מחיר גלם': 'cost_price',

  // Selling Price
  'מחיר מכירה': 'selling_price',
  'מחיר': 'selling_price',
  'selling_price': 'selling_price',
  'price': 'selling_price',
  'מחיר יחידה': 'selling_price',

  // Category
  'קטגוריה': 'category',
  'קטגוריה ראשית': 'category',
  'קבוצה ראשית': 'category',
  'category': 'category',
  'תמחורים': 'category',
  'מתחורים': 'category',
  'קטגוריה משנית': 'secondary_category',
  'תפריט - מקטע': 'secondary_category',
  'תפריטים - מקטעים': 'secondary_category',

  // Supplier
  'ספק': 'supplier',
  'supplier': 'supplier',

  // Inventory
  'מלאי': 'inventory',
  'inventory': 'inventory',
  'כמות': 'inventory',
  'quantity': 'inventory',

  // Monthly Sales
  'מכירות חודשיות': 'monthly_sales',
  'monthly_sales': 'monthly_sales',
  'סה"כ מכירות': 'monthly_sales',
  'סהכ מכירות': 'monthly_sales',
  'מכירות': 'monthly_sales',
  'כמה נמכר': 'inventory'
};

// ניקוי כותרות וערכים מתווים מיותרים
const normalizeHeaderCell = (cell = '') => {
  return String(cell)
    .trim()
    .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["']/g, '')
    .trim();
};

// ניקוי ערכי מחיר
const cleanPriceValue = (value) => {
  if (!value) return 0;
  const cleaned = String(value)
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/[₪$€£,\s]/g, '')
    .replace(/[^\d.-]/g, '')
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const parseFileContent = (content) => {
  const lines = content.split(/\r\n|\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('הקובץ ריק או מכיל רק כותרות.');

  let headerRowIndex = -1;
  let delimiter = ',';
  let rawHeaders = [];
  let mappedHeaders = [];

  const searchWindow = Math.min(lines.length, 15);

  for (let i = 0; i < searchWindow; i++) {
    const line = lines[i];
    const possibleDelimiter = line.includes('\t') ? '\t' : ',';
    const candidateHeaders = line.split(possibleDelimiter).map(normalizeHeaderCell);
    const candidateMapped = candidateHeaders.map(h => HEADER_MAPPING[h] || null);
    const knownHeadersCount = candidateMapped.filter(Boolean).length;

    if (knownHeadersCount >= 2) {
      headerRowIndex = i;
      delimiter = possibleDelimiter;
      rawHeaders = candidateHeaders;
      mappedHeaders = candidateMapped;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('לא נמצאו כותרות מוכרות בקובץ. ודא שהכותרות מופיעות באחת השורות הראשונות וכוללות את "שם פריט", "מחיר עלות", "מחיר מכירה".');
  }

  console.log('Header row found at index:', headerRowIndex);
  console.log('Delimiter detected:', delimiter === '\t' ? 'TAB' : 'COMMA');
  console.log('Raw headers:', rawHeaders);
  console.log('Mapped headers:', mappedHeaders);

  const products = [];
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const productData = {};

    mappedHeaders.forEach((mappedHeader, index) => {
      if (!mappedHeader) return;

      const rawValue = values[index] ?? '';
      let value = normalizeHeaderCell(rawValue);

      if (mappedHeader === 'cost_price' || mappedHeader === 'selling_price') {
        productData[mappedHeader] = cleanPriceValue(value);
      } else if (mappedHeader === 'inventory' || mappedHeader === 'monthly_sales') {
        const num = parseFloat(value.replace(/[,\s]/g, ''));
        productData[mappedHeader] = isNaN(num) ? 0 : num;
      } else {
        productData[mappedHeader] = value;
      }
    });

    if (productData.product_name?.trim() || productData.barcode?.trim()) {
      products.push(productData);
    }
  }

  return products;
};

export default function ProductCatalogUpload({
  customer,
  selectedCatalogId,
  onUploadComplete,
  onProcessStarted,
  onProcessFile,
  isProcessing,
  processingStatus,
  progress,
  disabled
}) {
  const [file, setFile] = useState(null);
  const [localProcessing, setLocalProcessing] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localStatus, setLocalStatus] = useState('');
  const [error, setError] = useState('');
  
  // מצבים חדשים לאשף המיפוי
  const [showMappingWizard, setShowMappingWizard] = useState(false);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [existingProfiles, setExistingProfiles] = useState([]);
  const [useAdvancedUpload, setUseAdvancedUpload] = useState(true);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [totalRowsFromParse, setTotalRowsFromParse] = useState(0);
  
  // טעינת פרופילים קיימים
  useEffect(() => {
    const loadProfiles = async () => {
      if (!customer?.email) return;
      try {
        const profiles = await base44.entities.CatalogMappingProfile.filter({
          customer_email: customer.email,
          is_active: true
        });
        setExistingProfiles(profiles);
      } catch (e) {
        console.error('Error loading profiles:', e);
      }
    };
    loadProfiles();
  }, [customer?.email]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  // העלאה מתקדמת עם אשף מיפוי
  const handleAdvancedUpload = async () => {
    if (!file) {
      setError('נא לבחור קובץ תחילה');
      return;
    }

    if (!selectedCatalogId) {
      setError('נא לבחור קטלוג תחילה');
      return;
    }

    setLocalProcessing(true);
    setLocalProgress(10);
    setLocalStatus('מעלה קובץ...');
    setError('');

    try {
      // העלאת הקובץ לשרת
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (!file_url) {
        throw new Error('העלאת הקובץ נכשלה');
      }
      
      setUploadedFileUrl(file_url);
      setLocalProgress(30);
      setLocalStatus('מנתח כותרות קובץ...');

      // קריאת כותרות הקובץ דרך ה-SDK
      const { data: parseResult } = await base44.functions.invoke('parseFileHeaders', { file_url });
      
      if (!parseResult?.success) {
        throw new Error(parseResult?.error || 'שגיאה בניתוח הקובץ');
      }

      setFileHeaders(parseResult.data.headers);
      // שמירת מדגם בלבד לתצוגה מקדימה
      setRawData(parseResult.data.raw_data);
      setHeaderRowIndex(parseResult.data.header_row_index || 0);
      setTotalRowsFromParse(parseResult.data.total_rows || 0);

      console.log(`קובץ עם ${parseResult.data.total_rows} שורות - נטען מדגם של ${parseResult.data.raw_data.length} שורות לתצוגה מקדימה`);
      
      setLocalProgress(50);
      setLocalStatus('פותח אשף מיפוי...');
      
      // פתיחת אשף המיפוי
      setShowMappingWizard(true);
      setLocalProcessing(false);
      setLocalProgress(0);
      setLocalStatus('');

    } catch (error) {
      console.error('Error in advanced upload:', error);
      setError(`שגיאה: ${error.message}`);
      setLocalProcessing(false);
      setLocalProgress(0);
      setLocalStatus('');
    }
  };

  // טיפול בהשלמת המיפוי – fire-and-forget: מפעיל עיבוד ברקע ומעביר שליטה ל-startProgressTracking בהורה
  const handleMappingComplete = async (mappingConfig) => {
    setShowMappingWizard(false);
    setLocalProcessing(true);
    setLocalProgress(60);
    setLocalStatus('מתחיל עיבוד...');

    try {
      console.log('📤 שולח לעיבוד:', {
        total_rows: totalRowsFromParse,
        header_row_index: headerRowIndex,
        mapping: mappingConfig.mapping
      });

      const { data: result } = await base44.functions.invoke('processCatalogWithMapping', {
        customer_email: customer.email,
        file_url: uploadedFileUrl,
        catalog_id: selectedCatalogId,
        mapping: mappingConfig.mapping,
        import_with_errors: mappingConfig.importWithErrors,
        header_row_index: headerRowIndex,
        total_rows: totalRowsFromParse
      });

      if (!result?.success) {
        throw new Error(result?.error || 'עיבוד הקובץ נכשל');
      }

      // העיבוד רץ ברקע – מעבירים את התצוגה להורה (startProgressTracking)
      if (result.process_id && onProcessStarted) {
        onProcessStarted(result.process_id);
      }
      setLocalProcessing(false);
      setLocalProgress(0);
      setLocalStatus('');
      setFile(null);
      setUploadedFileUrl('');

    } catch (error) {
      console.error('Error processing with mapping:', error);
      setError(`שגיאה בעיבוד: ${error.message}`);
      setLocalProcessing(false);
      setLocalProgress(0);
      setLocalStatus('');
    }
  };

  // העלאה פשוטה (המקורית)
  const handleProcessFile = async () => {
    if (!file) {
      setError('נא לבחור קובץ תחילה');
      return;
    }

    if (!selectedCatalogId) {
      setError('נא לבחור קטלוג תחילה');
      return;
    }

    // אם נבחרה העלאה מתקדמת, השתמש באשף
    if (useAdvancedUpload) {
      return handleAdvancedUpload();
    }

    setLocalProcessing(true);
    setLocalProgress(10);
    setLocalStatus('קורא את הקובץ...');
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      setLocalProgress(20);
      setLocalStatus('מנתח את תוכן הקובץ...');

      let text;
      try {
        text = new TextDecoder('utf-8').decode(uint8Array);
      } catch (e) {
        console.log('UTF-8 failed, trying windows-1255');
        text = new TextDecoder('windows-1255').decode(uint8Array);
      }

      setLocalProgress(40);
      setLocalStatus('מזהה מוצרים...');

      const parsedData = parseFileContent(text);

      console.log('Parsed products:', parsedData.length);
      console.log('First product:', parsedData[0]);

      if (parsedData.length === 0) {
        throw new Error('לא נמצאו מוצרים תקינים בקובץ. ודא שהכותרות תואמות (למשל: "שם פריט", "מחיר עלות").');
      }

      setLocalProgress(60);
      setLocalStatus(`נמצאו ${parsedData.length} מוצרים. מעביר לעיבוד...`);

      if (onProcessFile) {
        await onProcessFile(file);
      }

      setLocalProgress(100);
      setLocalStatus('העלאה הושלמה בהצלחה!');
      
      setTimeout(() => {
        setLocalProcessing(false);
        setLocalProgress(0);
        setLocalStatus('');
        setFile(null);
        if (onUploadComplete) {
          onUploadComplete();
        }
      }, 2000);

    } catch (error) {
      console.error('Error processing file:', error);
      setError(`שגיאה בעיבוד הקובץ: ${error.message}`);
      setLocalProcessing(false);
      setLocalProgress(0);
      setLocalStatus('');
    }
  };

  const activeProcessing = isProcessing || localProcessing;
  const activeProgress = isProcessing ? progress : localProgress;
  const activeStatus = isProcessing ? processingStatus : localStatus;

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-horizon-text">
          <Upload className="w-5 h-5 text-horizon-primary" />
          העלאת קובץ קטלוג מוצרים
        </CardTitle>
        <CardDescription className="text-horizon-accent">
          העלה קובץ CSV או Excel עם נתוני המוצרים שלך
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div className="space-y-4">
          <div className="border-2 border-dashed border-horizon rounded-lg p-8 text-center hover:border-horizon-primary/50 transition-colors">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={activeProcessing || disabled}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer flex flex-col items-center gap-3 ${
                activeProcessing || disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="w-16 h-16 bg-horizon-primary/10 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-horizon-primary" />
              </div>
              <div>
                <p className="text-lg font-medium text-horizon-text">
                  {file ? file.name : 'לחץ לבחירת קובץ'}
                </p>
                <p className="text-sm text-horizon-accent mt-1">
                  CSV, Excel (עד 50MB)
                </p>
              </div>
            </label>
            
            {file && !activeProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                className="mt-4 text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4 ml-2" />
                הסר קובץ
              </Button>
            )}
          </div>

          {/* בחירת מצב העלאה */}
          <div className="flex items-center justify-between p-3 bg-horizon-card/30 rounded-lg border border-horizon">
            <div className="flex items-center gap-3">
              <Wand2 className="w-5 h-5 text-horizon-primary" />
              <div>
                <p className="text-sm font-medium text-horizon-text">אשף מיפוי עמודות</p>
                <p className="text-xs text-horizon-accent">מאפשר לך לשייך עמודות מכל קובץ לשדות המערכת</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={useAdvancedUpload}
                onChange={(e) => setUseAdvancedUpload(e.target.checked)}
                disabled={activeProcessing || disabled}
              />
              <div className="w-11 h-6 bg-horizon-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-horizon-primary"></div>
            </label>
          </div>

          {/* Format Requirements */}
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            <AlertDescription className="text-blue-300 text-right">
              {useAdvancedUpload ? (
                <>
                  <strong>העלאה מתקדמת עם אשף מיפוי:</strong>
                  <ul className="list-disc pr-5 mt-2 space-y-1 text-sm">
                    <li>המערכת תזהה את עמודות הקובץ ותאפשר לך לשייך אותן לשדות המערכת</li>
                    <li>תוכל לשמור את המיפוי לשימוש עתידי</li>
                    <li>תצוגה מקדימה של הנתונים לפני הייבוא</li>
                    <li>זיהוי וטיפול בכפילויות</li>
                    <li>אימות נתונים אוטומטי</li>
                  </ul>
                </>
              ) : (
                <>
                  <strong>דרישות פורמט (העלאה פשוטה):</strong>
                  <ul className="list-disc pr-5 mt-2 space-y-1 text-sm">
                    <li>הקובץ חייב לכלול כותרות בשורה הראשונה או באחת השורות הראשונות</li>
                    <li>כותרות נדרשות: "שם פריט" (או "שם מוצר"), "מחיר עלות", "מחיר מכירה"</li>
                    <li>כותרות אופציונליות: "ברקוד", "מק"ט", "קטגוריה", "ספק", "מלאי"</li>
                  </ul>
                </>
              )}
            </AlertDescription>
          </Alert>
          </div>

        {/* Progress Display */}
        {activeProcessing && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-horizon-accent">
                {activeStatus}
              </span>
              <span className="text-sm font-bold text-horizon-text">
                {activeProgress}%
              </span>
            </div>
            <Progress value={activeProgress} className="w-full h-2" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-red-300 text-right">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <Button
          onClick={handleProcessFile}
          disabled={!file || activeProcessing || disabled || !selectedCatalogId}
          className="w-full btn-horizon-primary"
        >
          {activeProcessing ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              מעבד...
            </>
          ) : useAdvancedUpload ? (
            <>
              <Wand2 className="w-4 h-4 ml-2" />
              פתח אשף מיפוי
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 ml-2" />
              עבד והוסף לקטלוג
            </>
          )}
        </Button>

        {/* Instructions */}
        <div className="bg-horizon-card/30 rounded-lg p-4 text-sm text-horizon-accent space-y-2">
          <p className="font-semibold text-horizon-text">טיפים להעלאה מוצלחת:</p>
          <ul className="list-disc pr-5 space-y-1">
            <li>ודא שהקובץ כולל את הכותרות הנדרשות</li>
            <li>מחירים צריכים להיות מספרים (0 מותר)</li>
            <li>שם המוצר או ברקוד חייבים להיות מלאים</li>
            <li>אם יש שורת כותרת כללית (כמו שם החברה), המערכת תדלג עליה אוטומטית</li>
          </ul>
        </div>
      </CardContent>

      {/* אשף מיפוי עמודות */}
      {showMappingWizard && (
        <ColumnMappingWizard
          isOpen={showMappingWizard}
          onClose={() => {
            setShowMappingWizard(false);
            setLocalProcessing(false);
            setLocalProgress(0);
            setLocalStatus('');
          }}
          fileHeaders={fileHeaders}
          rawData={rawData}
          customer={customer}
          catalogId={selectedCatalogId}
          onMappingComplete={handleMappingComplete}
          existingProfiles={existingProfiles}
        />
      )}
    </Card>
  );
}