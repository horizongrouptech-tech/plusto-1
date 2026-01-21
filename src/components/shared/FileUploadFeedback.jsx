import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, XCircle, AlertCircle, Loader2, FileText, 
  RefreshCw, Download, Eye, X 
} from 'lucide-react';

// סטטוסים אפשריים
const UPLOAD_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  PARTIAL_SUCCESS: 'partial_success',
  ERROR: 'error',
  VALIDATION_ERROR: 'validation_error'
};

export default function FileUploadFeedback({ 
  status = UPLOAD_STATUS.IDLE,
  progress = 0,
  fileName = '',
  successMessage = '',
  errorMessage = '',
  warnings = [],
  validationErrors = [],
  processedRows = 0,
  failedRows = 0,
  onRetry,
  onViewDetails,
  onDownloadErrors,
  onDismiss
}) {
  
  const getStatusConfig = () => {
    switch (status) {
      case UPLOAD_STATUS.UPLOADING:
        return {
          icon: <Loader2 className="w-6 h-6 animate-spin text-blue-400" />,
          title: 'מעלה קובץ...',
          description: fileName,
          bgColor: 'bg-blue-500/10 border-blue-500/30',
          showProgress: true
        };
      case UPLOAD_STATUS.PROCESSING:
        return {
          icon: <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />,
          title: 'מעבד נתונים...',
          description: 'הנתונים נקראים ומעובדים',
          bgColor: 'bg-horizon-primary/10 border-horizon-primary/30',
          showProgress: true
        };
      case UPLOAD_STATUS.SUCCESS:
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-400" />,
          title: 'הקובץ עובד בהצלחה!',
          description: successMessage || `${processedRows} שורות עובדו בהצלחה`,
          bgColor: 'bg-green-500/10 border-green-500/30',
          showProgress: false
        };
      case UPLOAD_STATUS.PARTIAL_SUCCESS:
        return {
          icon: <AlertCircle className="w-6 h-6 text-yellow-400" />,
          title: 'עיבוד חלקי',
          description: `${processedRows} שורות עובדו, ${failedRows} נכשלו`,
          bgColor: 'bg-yellow-500/10 border-yellow-500/30',
          showProgress: false
        };
      case UPLOAD_STATUS.VALIDATION_ERROR:
        return {
          icon: <AlertCircle className="w-6 h-6 text-orange-400" />,
          title: 'שגיאת ולידציה',
          description: 'הקובץ אינו עומד בדרישות',
          bgColor: 'bg-orange-500/10 border-orange-500/30',
          showProgress: false
        };
      case UPLOAD_STATUS.ERROR:
        return {
          icon: <XCircle className="w-6 h-6 text-red-400" />,
          title: 'שגיאה בעיבוד',
          description: errorMessage || 'אירעה שגיאה בעיבוד הקובץ',
          bgColor: 'bg-red-500/10 border-red-500/30',
          showProgress: false
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  
  if (!config) return null;

  return (
    <Card className={`card-horizon ${config.bgColor} border transition-all`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {config.icon}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-horizon-text">{config.title}</h4>
              {onDismiss && status !== UPLOAD_STATUS.UPLOADING && status !== UPLOAD_STATUS.PROCESSING && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDismiss}
                  className="text-horizon-accent hover:text-horizon-text -mt-1 -mr-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-horizon-accent mt-1">{config.description}</p>
            
            {/* פס התקדמות */}
            {config.showProgress && (
              <div className="mt-3">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-horizon-accent mt-1 text-left">{progress}%</p>
              </div>
            )}

            {/* שגיאות ולידציה */}
            {validationErrors.length > 0 && (
              <div className="mt-3 space-y-2">
                <h5 className="text-sm font-semibold text-orange-400">בעיות שזוהו:</h5>
                <ul className="space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-horizon-accent">
                      <span className="text-orange-400 mt-0.5">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* אזהרות */}
            {warnings.length > 0 && (
              <div className="mt-3 space-y-2">
                <h5 className="text-sm font-semibold text-yellow-400">אזהרות:</h5>
                <ul className="space-y-1">
                  {warnings.slice(0, 5).map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-horizon-accent">
                      <span className="text-yellow-400 mt-0.5">⚠</span>
                      {warning}
                    </li>
                  ))}
                  {warnings.length > 5 && (
                    <li className="text-sm text-yellow-400">
                      ועוד {warnings.length - 5} אזהרות...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* כפתורי פעולה */}
            {(status === UPLOAD_STATUS.ERROR || status === UPLOAD_STATUS.VALIDATION_ERROR || status === UPLOAD_STATUS.PARTIAL_SUCCESS) && (
              <div className="flex gap-2 mt-4">
                {onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="border-horizon text-horizon-primary"
                  >
                    <RefreshCw className="w-4 h-4 ml-1" />
                    נסה שוב
                  </Button>
                )}
                {onViewDetails && failedRows > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onViewDetails}
                    className="border-horizon text-horizon-accent"
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    צפה בפרטים
                  </Button>
                )}
                {onDownloadErrors && failedRows > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onDownloadErrors}
                    className="border-horizon text-horizon-accent"
                  >
                    <Download className="w-4 h-4 ml-1" />
                    הורד שורות שנכשלו
                  </Button>
                )}
              </div>
            )}

            {/* סיכום הצלחה */}
            {status === UPLOAD_STATUS.SUCCESS && processedRows > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  <CheckCircle className="w-3 h-3 ml-1" />
                  {processedRows} שורות
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// קומפוננטת עזר לשגיאות קובץ נפוצות
export function getCommonFileErrors(errorCode) {
  const errors = {
    'INVALID_FORMAT': 'פורמט הקובץ אינו נתמך. נא להעלות קובץ Excel (.xlsx, .xls) או CSV.',
    'FILE_TOO_LARGE': 'הקובץ גדול מדי. גודל מקסימלי: 10MB.',
    'EMPTY_FILE': 'הקובץ ריק או לא מכיל נתונים.',
    'MISSING_HEADERS': 'לא נמצאו כותרות עמודות. נא לוודא שהשורה הראשונה מכילה כותרות.',
    'INVALID_DATE_FORMAT': 'פורמט תאריך לא תקין. נא להשתמש בפורמט DD/MM/YYYY.',
    'MISSING_REQUIRED_COLUMN': 'חסרה עמודה נדרשת. נא לבדוק את מבנה הקובץ.',
    'INVALID_NUMERIC_VALUE': 'נמצאו ערכים לא מספריים בעמודות מספריות.',
    'DUPLICATE_ROWS': 'נמצאו שורות כפולות בקובץ.',
    'ENCODING_ERROR': 'בעיית קידוד בקובץ. נא לשמור את הקובץ בקידוד UTF-8.',
    'NETWORK_ERROR': 'שגיאת רשת. נא לבדוק את חיבור האינטרנט ולנסות שוב.',
    'SERVER_ERROR': 'שגיאת שרת. נא לנסות שוב מאוחר יותר.',
    'UNKNOWN': 'שגיאה לא צפויה. נא לפנות לתמיכה.'
  };
  
  return errors[errorCode] || errors['UNKNOWN'];
}

export { UPLOAD_STATUS };
