import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function CatalogGenerationProgressBar({ 
  processStatus, 
  catalogName, 
  onRefresh, 
  onCancel, 
  isRefreshing = false,
  isCancelling = false 
}) {
  if (!processStatus) return null;

  const { progress = 0, current_step = 'מתחיל תהליך...', status = 'running' } = processStatus;

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-yellow-500';
      default: return 'bg-gray-500';
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

  return (
    <Card className="card-horizon border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* כותרת ואייקון סטטוס */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <h3 className="font-semibold text-horizon-text">
                  יצירת קטלוג: {catalogName || 'לא ידוע'}
                </h3>
                <p className="text-sm text-horizon-accent">
                  {getStatusText()} • {Math.round(progress)}%
                </p>
              </div>
            </div>
            
            {/* כפתורי פעולה */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-horizon-accent hover:text-horizon-text"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                רענן
              </Button>
              
              {status === 'running' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="text-red-400 hover:text-red-300"
                >
                  {isCancelling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  בטל
                </Button>
              )}
            </div>
          </div>

          {/* מד התקדמות */}
          <div>
            <Progress 
              value={Math.min(Math.max(progress, 0), 100)} 
              className={`w-full h-2 ${getStatusColor()}`}
            />
          </div>

          {/* תיאור השלב הנוכחי */}
          <div className="text-sm text-horizon-accent">
            {current_step}
          </div>

          {/* תוצאות (אם הסתיים) */}
          {status === 'completed' && processStatus.result_data && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="text-sm text-green-400">
                ✅ נוצרו {processStatus.result_data.products_created} מוצרים בהצלחה
                {processStatus.result_data.success_rate && (
                  <span className=" mr-2">
                    (שיעור הצלחה: {processStatus.result_data.success_rate}%)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* הודעת שגיאה */}
          {status === 'failed' && processStatus.error_message && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="text-sm text-red-400">
                ❌ {processStatus.error_message}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}