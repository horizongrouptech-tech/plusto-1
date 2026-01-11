import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Trash2, X, CheckCircle, Loader2 } from "lucide-react";
import { deleteEntireCatalog } from "@/functions/deleteEntireCatalog";

export default function CatalogDeletionModal({
  isOpen,
  onClose,
  catalogId,
  catalogName,
  customerEmail,
  initialProductCount,
  onDeletionComplete
}) {
  const [stage, setStage] = useState('confirm'); // confirm, deleting, completed, error
  const [deletedCount, setDeletedCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(initialProductCount || 0);
  const [errorMessage, setErrorMessage] = useState('');
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const startTimeRef = useRef(null);
  const deletionRateRef = useRef([]); // לחישוב קצב מחיקה ממוצע
  const abortRef = useRef(false);
  const timerRef = useRef(null);

  // טיימר לזמן שעבר
  useEffect(() => {
    if (stage === 'deleting') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stage]);

  // חישוב זמן משוער
  const calculateEstimatedTime = (deletedInBatch, remaining) => {
    if (deletedInBatch > 0) {
      deletionRateRef.current.push(deletedInBatch);
      // שומר רק 5 דגימות אחרונות
      if (deletionRateRef.current.length > 5) {
        deletionRateRef.current.shift();
      }
      
      // ממוצע קצב מחיקה
      const avgRate = deletionRateRef.current.reduce((a, b) => a + b, 0) / deletionRateRef.current.length;
      
      // זמן משוער בשניות (כל batch לוקח בערך 3-5 שניות)
      const batchesRemaining = Math.ceil(remaining / 500);
      const secondsPerBatch = 4; // הערכה
      const estimatedSeconds = batchesRemaining * secondsPerBatch;
      
      setEstimatedTimeLeft(estimatedSeconds);
    }
  };

  // פורמט זמן
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // תהליך המחיקה
  const startDeletion = async () => {
    setStage('deleting');
    setDeletedCount(0);
    setRemainingCount(initialProductCount || 0);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    abortRef.current = false;
    deletionRateRef.current = [];

    let totalDeleted = 0;
    let hasMore = true;
    let batchNumber = 0;
    let consecutiveErrors = 0;
    const maxBatches = 500; // הגנה מפני לולאה אינסופית
    const maxRetries = 3;

    try {
      // לולאת מחיקה
      while (hasMore && !abortRef.current && batchNumber < maxBatches) {
        batchNumber++;
        
        let data = null;
        let lastError = null;
        
        // ניסיון עם retries
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await deleteEntireCatalog({
              customer_email: customerEmail,
              catalog_id: catalogId
            });
            
            if (result.error) {
              throw new Error(result.error?.message || 'שגיאה במחיקה');
            }
            
            data = result.data;
            consecutiveErrors = 0;
            break;
          } catch (err) {
            lastError = err;
            console.warn(`Attempt ${attempt}/${maxRetries} failed:`, err.message);
            
            if (attempt < maxRetries) {
              // המתנה לפני ניסיון נוסף (עולה עם כל ניסיון)
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
        
        if (!data || !data.success) {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            throw new Error(lastError?.message || 'שגיאה במחיקת מוצרים אחרי מספר ניסיונות');
          }
          // ממשיכים לנסות
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        totalDeleted += data.deleted_count || 0;
        hasMore = data.has_more;
        
        setDeletedCount(totalDeleted);
        setRemainingCount(data.remaining_count || 0);
        calculateEstimatedTime(data.deleted_count, data.remaining_count || 0);

        // הפסקה בין קריאות למניעת עומס
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (abortRef.current) {
        setStage('confirm');
        return;
      }

      // מחיקת הקטלוג עצמו
      const { data: catalogResult, error: catalogError } = await deleteEntireCatalog({
        customer_email: customerEmail,
        catalog_id: catalogId,
        delete_catalog_entity: true
      });

      if (catalogError || !catalogResult?.success) {
        throw new Error(catalogResult?.error || 'שגיאה במחיקת הקטלוג');
      }

      setStage('completed');
      
      // קריאה ל-callback אחרי 2 שניות
      setTimeout(() => {
        onDeletionComplete?.(totalDeleted);
      }, 2000);

    } catch (error) {
      console.error('Deletion error:', error);
      setErrorMessage(error.message);
      setStage('error');
    }
  };

  const handleClose = () => {
    if (stage === 'deleting') {
      // לא לסגור באמצע מחיקה
      return;
    }
    abortRef.current = true;
    setStage('confirm');
    setDeletedCount(0);
    setRemainingCount(initialProductCount || 0);
    setErrorMessage('');
    onClose();
  };

  const progress = initialProductCount > 0 
    ? Math.round((deletedCount / initialProductCount) * 100) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-horizon-text text-right">
            {stage === 'completed' ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : stage === 'error' ? (
              <AlertTriangle className="w-6 h-6 text-red-500" />
            ) : (
              <Trash2 className="w-6 h-6 text-red-500" />
            )}
            {stage === 'completed' ? 'הקטלוג נמחק בהצלחה!' : 
             stage === 'error' ? 'שגיאה במחיקה' : 
             stage === 'deleting' ? 'מוחק קטלוג...' : 'מחיקת קטלוג'}
          </DialogTitle>
        </DialogHeader>

        {/* שלב אישור */}
        {stage === 'confirm' && (
          <>
            <DialogDescription className="text-horizon-accent text-right mt-2">
              פעולה זו תמחוק לצמיתות את כל המוצרים בקטלוג.
              <br />
              <strong className="text-red-400">לא ניתן לבטל פעולה זו!</strong>
            </DialogDescription>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-right">
                  <h4 className="font-semibold text-red-400 mb-2">מה יקרה:</h4>
                  <ul className="text-sm text-horizon-accent space-y-1 pr-5 list-disc">
                    <li>הקטלוג <span className="font-bold text-red-300">{catalogName}</span> יימחק</li>
                    <li>כל <span className="font-bold text-red-300">{initialProductCount?.toLocaleString() || 0}</span> המוצרים יימחקו לצמיתות</li>
                    <li>לא ניתן יהיה לשחזר את הנתונים</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                onClick={handleClose}
                variant="outline"
                className="border-horizon text-horizon-text"
              >
                ביטול
              </Button>
              <Button
                onClick={startDeletion}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק קטלוג
              </Button>
            </div>
          </>
        )}

        {/* שלב מחיקה */}
        {stage === 'deleting' && (
          <div className="py-6">
            <div className="text-center mb-6">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-horizon-primary mb-4" />
              <p className="text-lg font-medium text-horizon-text">
                מוחק מוצרים...
              </p>
              <p className="text-sm text-horizon-accent mt-1">
                אנא המתן, אל תסגור את החלון
              </p>
            </div>

            <div className="space-y-4">
              <Progress value={progress} className="h-3 bg-horizon-card" />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-horizon-card/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-400">
                    {deletedCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-horizon-accent">נמחקו</div>
                </div>
                
                <div className="bg-horizon-card/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-400">
                    {remainingCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-horizon-accent">נותרו</div>
                </div>
                
                <div className="bg-horizon-card/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-horizon-primary">
                    {progress}%
                  </div>
                  <div className="text-xs text-horizon-accent">הושלם</div>
                </div>
              </div>

              <div className="flex justify-between text-sm text-horizon-accent border-t border-horizon pt-4">
                <div>
                  <span className="text-horizon-text">זמן שעבר: </span>
                  {formatTime(elapsedTime)}
                </div>
                <div>
                  <span className="text-horizon-text">זמן משוער: </span>
                  {estimatedTimeLeft !== null ? `~${formatTime(estimatedTimeLeft)}` : 'מחשב...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* שלב הושלם */}
        {stage === 'completed' && (
          <div className="py-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-horizon-text mb-2">
              המחיקה הושלמה בהצלחה!
            </h3>
            <p className="text-horizon-accent mb-4">
              נמחקו <span className="font-bold text-green-400">{deletedCount.toLocaleString()}</span> מוצרים
              <br />
              בזמן של {formatTime(elapsedTime)}
            </p>
            <Button onClick={handleClose} className="mt-4">
              סגור
            </Button>
          </div>
        )}

        {/* שלב שגיאה */}
        {stage === 'error' && (
          <div className="py-6 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-horizon-text mb-2">
              שגיאה במחיקה
            </h3>
            <p className="text-red-400 mb-2">{errorMessage}</p>
            <p className="text-horizon-accent text-sm mb-4">
              נמחקו {deletedCount.toLocaleString()} מוצרים לפני השגיאה
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <Button onClick={startDeletion} variant="destructive">
                נסה שוב
              </Button>
              <Button onClick={handleClose} variant="outline">
                סגור
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}