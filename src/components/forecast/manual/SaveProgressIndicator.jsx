import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, CheckCircle2, AlertCircle, Cloud, CloudOff } from "lucide-react";

/**
 * אינדיקטור שמירת התקדמות לשלבי תחזית
 */
export default function SaveProgressIndicator({
  onSave,
  isSaving = false,
  lastSaved = null,
  saveStatus = null, // 'saving' | 'saved' | 'error' | null
  hasChanges = false,
  showSaveButton = true,
  compact = false
}) {
  const formatTime = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {saveStatus === 'saving' && (
          <Badge variant="outline" className="border-blue-400 text-blue-400 gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            שומר
          </Badge>
        )}
        {saveStatus === 'saved' && (
          <Badge variant="outline" className="border-green-400 text-green-400 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            נשמר
          </Badge>
        )}
        {saveStatus === 'error' && (
          <Badge variant="outline" className="border-red-400 text-red-400 gap-1">
            <AlertCircle className="w-3 h-3" />
            שגיאה
          </Badge>
        )}
        {lastSaved && !saveStatus && (
          <span className="text-xs text-horizon-accent flex items-center gap-1">
            <Cloud className="w-3 h-3" />
            {formatTime(lastSaved)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* סטטוס שמירה */}
      <div className="flex items-center gap-2">
        {saveStatus === 'saving' && (
          <Badge variant="outline" className="border-blue-400 text-blue-400 flex items-center gap-1.5 px-3 py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>שומר אוטומטית...</span>
          </Badge>
        )}
        
        {saveStatus === 'saved' && (
          <Badge variant="outline" className="border-green-400 text-green-400 flex items-center gap-1.5 px-3 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>נשמר בהצלחה ✓</span>
          </Badge>
        )}
        
        {saveStatus === 'error' && (
          <Badge variant="outline" className="border-red-400 text-red-400 flex items-center gap-1.5 px-3 py-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>שגיאה בשמירה</span>
          </Badge>
        )}

        {/* זמן שמירה אחרון */}
        {lastSaved && !saveStatus && (
          <div className="flex items-center gap-1.5 text-xs text-horizon-accent bg-horizon-card/50 px-3 py-1.5 rounded-full border border-horizon">
            <Cloud className="w-3.5 h-3.5 text-green-400" />
            <span>נשמר לאחרונה: {formatTime(lastSaved)}</span>
          </div>
        )}

        {/* אין שמירה עדיין */}
        {!lastSaved && !saveStatus && (
          <div className="flex items-center gap-1.5 text-xs text-horizon-accent">
            <CloudOff className="w-3.5 h-3.5" />
            <span>טרם נשמר</span>
          </div>
        )}
      </div>

      {/* כפתור שמירה ידני */}
      {showSaveButton && (
        <Button
          onClick={onSave}
          disabled={isSaving}
          variant="outline"
          size="sm"
          className={`border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10 ${
            hasChanges ? 'animate-pulse' : ''
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 ml-1.5 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-1.5" />
              שמור עכשיו
            </>
          )}
        </Button>
      )}
    </div>
  );
}