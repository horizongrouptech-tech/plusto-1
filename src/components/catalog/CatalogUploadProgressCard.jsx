import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, X, AlertTriangle, CheckCircle, Loader2, Upload } from "lucide-react";

/**
 * לוח התקדמות קבוע להעלאה וניקוי קטלוג.
 * נשאר גלוי כדי לאפשר מעקב ובקרת תקלות - לא נעלם עד שהמשתמש סוגר.
 */
export default function CatalogUploadProgressCard({
  processType,
  progress = 0,
  currentStep = '',
  status = 'running',
  errorMessage = null,
  resultData = null,
  catalogName = '',
  onRefresh,
  onDismiss,
  isRefreshing = false,
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'border-l-blue-500 bg-blue-500/5';
      case 'completed': return 'border-l-green-500 bg-green-500/5';
      case 'failed': return 'border-l-red-500 bg-red-500/5';
      case 'cancelled': return 'border-l-yellow-500 bg-yellow-500/5';
      default: return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'cancelled': return <X className="w-4 h-4 text-yellow-500" />;
      default: return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running': return 'בתהליך';
      case 'completed': return 'הושלם בהצלחה';
      case 'failed': return 'נכשל';
      case 'cancelled': return 'בוטל';
      default: return 'לא ידוע';
    }
  };

  const title = processType === 'cleaning' ? 'ניקוי קטלוג' : 'העלאת קובץ לקטלוג';

  return (
    <Card className={`card-horizon border-l-4 sticky top-4 z-10 shadow-lg ${getStatusColor()}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {processType === 'cleaning' ? (
                <Loader2 className="w-5 h-5 text-horizon-primary flex-shrink-0" />
              ) : (
                <Upload className="w-5 h-5 text-horizon-primary flex-shrink-0" />
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-horizon-text">
                  {title}
                  {catalogName && <span className="text-horizon-accent font-normal"> • {catalogName}</span>}
                </h3>
                <p className="text-sm text-horizon-accent flex items-center gap-2">
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                  <span className="font-bold text-horizon-text">{Math.round(progress)}%</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="text-horizon-accent hover:text-horizon-text"
                  title="רענן סטטוס"
                >
                  {isRefreshing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-horizon-accent hover:text-horizon-text"
                  title="סגור"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <Progress 
            value={Math.min(Math.max(progress, 0), 100)} 
            className="w-full h-2 bg-horizon-card/50"
          />

          {currentStep && (
            <div className="text-sm text-horizon-accent bg-horizon-card/30 rounded px-3 py-2">
              {currentStep}
            </div>
          )}

          {status === 'completed' && resultData && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="text-sm text-green-400">
                {processType === 'cleaning' ? (
                  <>✅ הניקוי הושלם בהצלחה</>
                ) : (
                  <>✅ העלו {Number(resultData.total_products_created ?? resultData.products_created ?? 0).toLocaleString('he-IL')} מוצרים לקטלוג</>
                )}
              </div>
            </div>
          )}

          {(status === 'failed' || errorMessage) && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="text-sm text-red-400">
                ❌ {errorMessage || 'אירעה שגיאה בתהליך'}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
