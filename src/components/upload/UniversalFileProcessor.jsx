
import React, { useState, useCallback } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Eye,
  FileSpreadsheet,
  FileImage,
  File as FileIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InvokeLLM, ExtractDataFromUploadedFile } from "@/integrations/Core";

// רשימת סוגי קבצים נתמכים
const SUPPORTED_FILE_TYPES = {
  'application/pdf': { name: 'PDF', icon: FileText, color: 'bg-red-500' },
  'application/vnd.ms-excel': { name: 'Excel (XLS)', icon: FileSpreadsheet, color: 'bg-green-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { name: 'Excel (XLSX)', icon: FileSpreadsheet, color: 'bg-green-500' },
  'text/csv': { name: 'CSV', icon: FileSpreadsheet, color: 'bg-blue-500' },
  'application/json': { name: 'JSON', icon: FileIcon, color: 'bg-purple-500' },
  'text/plain': { name: 'Text', icon: FileText, color: 'bg-gray-500' },
  'image/jpeg': { name: 'JPEG', icon: FileImage, color: 'bg-orange-500' },
  'image/png': { name: 'PNG', icon: FileImage, color: 'bg-orange-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { name: 'Word (DOCX)', icon: FileText, color: 'bg-blue-600' }
};

// טיפוסי עיבוד קבצים
const FILE_PROCESSING_STRATEGIES = {
  tabular: ['csv', 'xlsx', 'xls'], // קבצים טבלאיים
  document: ['pdf', 'docx', 'txt'], // מסמכים
  structured: ['json'], // נתונים מובנים
  image: ['jpeg', 'jpg', 'png'] // תמונות
};

export default function UniversalFileProcessor({ 
  file, 
  customer, 
  onProcessingComplete, 
  onError 
}) {
  const [processingState, setProcessingState] = useState('idle'); // idle, analyzing, processing, complete, error
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileMetadata, setFileMetadata] = useState(null);

  // זיהוי סוג קובץ ואסטרטגיית עיבוד
  const detectFileStrategy = useCallback((fileType, fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    for (const [strategy, extensions] of Object.entries(FILE_PROCESSING_STRATEGIES)) {
      if (extensions.includes(extension)) {
        return strategy;
      }
    }
    
    // אסטרטגיה ברירת מחדל בהתבסס על MIME type
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.includes('spreadsheet') || fileType.includes('csv')) return 'tabular';
    if (fileType.includes('pdf') || fileType.includes('document')) return 'document';
    
    return 'document'; // ברירת מחדל
  }, []);

  // ניתוח קובץ עם AI
  const analyzeFileWithAI = useCallback(async (fileUrl, strategy) => {
    setProgress(20);
    
    try {
      let analysisPrompt = '';
      let responseSchema = {};

      switch (strategy) {
        case 'tabular':
          analysisPrompt = `
            אנא נתח את הקובץ הטבלאי הזה וזהה:
            1. את מבנה הנתונים (עמודות, שורות)
            2. את שמות העמודות וסוג הנתונים בכל עמודה
            3. אם זה קובץ מוצרים, מכירות, מלאי או נתונים פיננסיים
            4. הצע מיפוי לשדות המערכת הרלוונטיים
            5. זהה את השפה של הנתונים (עברית/אנגלית)
            
            הקובץ: ${fileUrl}
          `;
          
          responseSchema = {
            type: "object",
            properties: {
              file_type: { type: "string", enum: ["products", "sales", "inventory", "financial", "promotions", "suppliers", "other"] },
              language: { type: "string", enum: ["hebrew", "english", "mixed"] },
              columns_detected: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    original_name: { type: "string" },
                    suggested_mapping: { type: "string" },
                    data_type: { type: "string", enum: ["text", "number", "date", "boolean"] },
                    confidence: { type: "number" }
                  }
                }
              },
              total_rows: { type: "number" },
              sample_data: {
                type: "array",
                items: { type: "object", additionalProperties: true }
              },
              processing_recommendations: {
                type: "array",
                items: { type: "string" }
              }
            }
          };
          break;

        case 'document':
          analysisPrompt = `
            אנא נתח את המסמך הזה וחלץ:
            1. סוג המסמך (דוח כספי, חשבונית, מכתב וכו')
            2. נתונים מובנים (מספרים, תאריכים, שמות)
            3. תוכן ראשי ומידע חשוב
            4. שפת המסמך
            5. האם יש נתונים עסקיים רלוונטיים למערכת
            
            המסמך: ${fileUrl}
          `;
          
          responseSchema = {
            type: "object",
            properties: {
              document_type: { type: "string" },
              language: { type: "string" },
              key_information: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                    confidence: { type: "number" }
                  }
                }
              },
              summary: { type: "string" },
              business_relevance: { type: "string" }
            }
          };
          break;

        case 'image':
          analysisPrompt = `
            אנא נתח את התמונה הזו וזהה:
            1. האם זו תמונת מוצר, חשבונית, מסמך או אחר
            2. טקסט שניתן לחלץ (OCR)
            3. מידע עסקי רלוונטי
            4. איכות התמונה ובהירות הטקסט
            
            התמונה: ${fileUrl}
          `;
          
          responseSchema = {
            type: "object",
            properties: {
              image_type: { type: "string" },
              text_detected: { type: "string" },
              business_data: {
                type: "array",
                items: { type: "string" }
              },
              quality_score: { type: "number" }
            }
          };
          break;

        default:
          analysisPrompt = `
            אנא נתח את הקובץ הזה וספק מידע כללי:
            1. סוג התוכן
            2. מבנה הנתונים
            3. רלוונטיות עסקית
            4. המלצות לעיבוד
            
            הקובץ: ${fileUrl}
          `;
          
          responseSchema = {
            type: "object",
            properties: {
              content_type: { type: "string" },
              structure: { type: "string" },
              business_relevance: { type: "string" },
              processing_suggestions: {
                type: "array",
                items: { type: "string" }
              }
            }
          };
      }

      const analysisResult = await InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: responseSchema,
        file_urls: [fileUrl]
      });

      setProgress(50);
      return analysisResult;

    } catch (error) {
      console.error('Error in AI analysis:', error);
      throw new Error(`שגיאה בניתוח קובץ: ${error.message}`);
    }
  }, []);

  // חילוץ נתונים מובנים
  const extractStructuredData = useCallback(async (fileUrl, analysisResult) => {
    setProgress(70);

    try {
      // אם זה קובץ טבלאי עם עמודות מזוהות
      if (analysisResult.columns_detected && analysisResult.file_type) {
        const extractionSchema = {
          type: "object",
          properties: {
            records: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true
              }
            },
            total_extracted: { type: "number" },
            extraction_notes: { type: "string" }
          }
        };

        const extractedData = await ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: extractionSchema
        });

        setProgress(90);
        return extractedData;
      }

      // אחרת, נחזיר את תוצאת הניתוח כמו שהיא
      return {
        records: [],
        analysis_only: true,
        content: analysisResult
      };

    } catch (error) {
      console.error('Error extracting data:', error);
      // לא נזרוק שגיאה כאן - פשוט נחזיר ניתוח בלבד
      return {
        records: [],
        analysis_only: true,
        content: analysisResult,
        extraction_error: error.message
      };
    }
  }, []);

  // תהליך עיבוד ראשי
  const processFile = useCallback(async () => {
    if (!file) return;

    setProcessingState('analyzing');
    setProgress(10);
    setErrorMessage('');

    try {
      // 1. בדיקת תמיכה בסוג הקובץ
      const fileType = file.type;
      const fileName = file.name;
      const strategy = detectFileStrategy(fileType, fileName);

      const metadata = {
        name: fileName,
        type: fileType,
        size: file.size,
        strategy: strategy,
        supportedType: SUPPORTED_FILE_TYPES[fileType] || { name: 'Unknown', icon: FileIcon, color: 'bg-gray-500' }
      };
      setFileMetadata(metadata);

      // 2. העלאת קובץ
      const { UploadFile } = await import('@/integrations/Core');
      const uploadResponse = await UploadFile({ file });
      
      if (!uploadResponse.file_url) {
        throw new Error('שגיאה בהעלאת קובץ');
      }

      const fileUrl = uploadResponse.file_url;
      setProgress(15);

      // 3. ניתוח עם AI
      setProcessingState('processing');
      const analysis = await analyzeFileWithAI(fileUrl, strategy);
      setAnalysisResult(analysis);

      // 4. חילוץ נתונים מובנים (אם רלוונטי)
      const extracted = await extractStructuredData(fileUrl, analysis);
      setExtractedData(extracted);

      setProgress(100);
      setProcessingState('complete');

      // 5. קריאה לפונקציה שמטפלת בהשלמת העיבוד
      if (onProcessingComplete) {
        onProcessingComplete({
          fileMetadata: metadata,
          analysisResult: analysis,
          extractedData: extracted,
          fileUrl
        });
      }

    } catch (error) {
      console.error('File processing error:', error);
      setErrorMessage(error.message);
      setProcessingState('error');
      
      if (onError) {
        onError(error);
      }
    }
  }, [file, detectFileStrategy, analyzeFileWithAI, extractStructuredData, onProcessingComplete, onError]);

  // רינדור תוצאות בהתבסס על סוג קובץ
  const renderResults = () => {
    if (!analysisResult) return null;

    const IconComponent = fileMetadata?.supportedType?.icon || FileIcon;

    return (
      <div className="space-y-4">
        {/* פרטי קובץ */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${fileMetadata?.supportedType?.color || 'bg-gray-500'}`}>
                <IconComponent className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-horizon-text">{fileMetadata?.name}</h3>
                <p className="text-sm text-horizon-accent">
                  {fileMetadata?.supportedType?.name} • {(fileMetadata?.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* תוצאות ניתוח */}
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text">תוצאות ניתוח</CardTitle>
          </CardHeader>
          <CardContent>
            {fileMetadata?.strategy === 'tabular' && analysisResult.columns_detected && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-horizon-primary text-horizon-primary">
                    {analysisResult.file_type || 'נתונים טבלאיים'}
                  </Badge>
                  <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                    {analysisResult.language || 'לא זוהה'}
                  </Badge>
                  {analysisResult.total_rows && (
                    <Badge variant="outline" className="border-horizon text-horizon-text">
                      {analysisResult.total_rows} שורות
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-horizon-text mb-2">עמודות שזוהו:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {analysisResult.columns_detected.map((col, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-horizon-card rounded-lg">
                        <span className="text-sm text-horizon-text">{col.original_name}</span>
                        <span className="text-xs text-horizon-accent">{col.suggested_mapping}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {fileMetadata?.strategy === 'document' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-horizon-primary text-horizon-primary">
                    {analysisResult.document_type || 'מסמך'}
                  </Badge>
                  <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                    {analysisResult.language || 'לא זוהה'}
                  </Badge>
                </div>

                {analysisResult.summary && (
                  <div>
                    <h4 className="font-semibold text-horizon-text mb-2">סיכום:</h4>
                    <p className="text-sm text-horizon-accent bg-horizon-card p-3 rounded-lg">
                      {analysisResult.summary}
                    </p>
                  </div>
                )}

                {analysisResult.key_information && analysisResult.key_information.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-horizon-text mb-2">מידע מרכזי:</h4>
                    <div className="space-y-2">
                      {analysisResult.key_information.map((info, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-horizon-card rounded-lg">
                          <span className="text-sm font-medium text-horizon-text">{info.label}</span>
                          <span className="text-sm text-horizon-accent">{info.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {fileMetadata?.strategy === 'image' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-horizon-primary text-horizon-primary">
                    {analysisResult.image_type || 'תמונה'}
                  </Badge>
                  {analysisResult.quality_score && (
                    <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                      איכות: {Math.round(analysisResult.quality_score * 100)}%
                    </Badge>
                  )}
                </div>

                {analysisResult.text_detected && (
                  <div>
                    <h4 className="font-semibold text-horizon-text mb-2">טקסט שזוהה:</h4>
                    <p className="text-sm text-horizon-accent bg-horizon-card p-3 rounded-lg">
                      {analysisResult.text_detected}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* נתונים שחולצו */}
        {extractedData && extractedData.records && extractedData.records.length > 0 && (
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-text">
                נתונים שחולצו ({extractedData.total_extracted || extractedData.records.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto">
                <div className="grid gap-2">
                  {extractedData.records.slice(0, 5).map((record, index) => (
                    <div key={index} className="p-3 bg-horizon-card rounded-lg">
                      <div className="text-xs text-horizon-accent">שורה {index + 1}</div>
                      <div className="text-sm text-horizon-text">
                        {JSON.stringify(record, null, 2).substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                  {extractedData.records.length > 5 && (
                    <div className="text-center text-sm text-horizon-accent py-2">
                      ועוד {extractedData.records.length - 5} רשומות...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-horizon-text mb-2">עיבוד קובץ חכם</h2>
        <p className="text-horizon-accent">
          המערכת מנתחת את הקובץ שלך באופן אוטומטי ומזהה את התוכן והמבנה
        </p>
      </div>

      {/* פס התקדמות */}
      {processingState !== 'idle' && processingState !== 'complete' && (
        <Card className="card-horizon">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-horizon-primary" />
              <span className="text-horizon-text">
                {processingState === 'analyzing' && 'מנתח את הקובץ...'}
                {processingState === 'processing' && 'מעבד נתונים...'}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* שגיאות */}
      {processingState === 'error' && (
        <Alert variant="destructive" className="border-red-500 bg-red-900/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-300">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* תוצאות */}
      {processingState === 'complete' && (
        <div className="space-y-4">
          <Alert className="border-green-500 bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              הקובץ עובד בהצלחה ונותח על ידי המערכת
            </AlertDescription>
          </Alert>
          
          {renderResults()}
        </div>
      )}

      {/* כפתור עיבוד */}
      {processingState === 'idle' && (
        <div className="text-center">
          <Button 
            onClick={processFile}
            className="btn-horizon-primary px-8 py-3"
            disabled={!file}
          >
            <Eye className="w-4 h-4 mr-2" />
            התחל ניתוח קובץ
          </Button>
        </div>
      )}
    </div>
  );
}
