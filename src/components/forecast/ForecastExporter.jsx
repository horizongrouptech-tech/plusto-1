import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, Loader2, Copy } from "lucide-react";

import { toast } from "sonner";
import { exportManualForecastToExcel } from '@/api/functions';

export default function ForecastExporter({ forecast, sheets, selectedSheet }) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExportExcel = async (sheetId = null) => {
        setIsExporting(true);
        try {
            const { data, error } = await exportManualForecastToExcel({
                forecast_id: forecast.id,
                sheet_id: sheetId
            });

            if (error) {
                throw new Error(error);
            }

            // יצירת blob מהנתונים
            const blob = new Blob([data], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            // יצירת קישור להורדה
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `תחזית_${forecast.file_name || 'export'}_${new Date().toLocaleDateString('he-IL')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('הקובץ יוצא בהצלחה!');
        } catch (error) {
            console.error("Error exporting:", error);
            toast.error('שגיאה בייצוא הקובץ: ' + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleCopyData = async () => {
        try {
            // פשוט מעתיק את המזהה לצורך הדגמה
            await navigator.clipboard.writeText(forecast.id);
            toast.success('המזהה הועתק ללוח');
        } catch (error) {
            toast.error('שגיאה בהעתקה');
        }
    };

    return (
        <Card className="card-horizon">
            <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                    <Download className="w-5 h-5 text-horizon-primary" />
                    ייצוא תחזית
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* ייצוא Excel */}
                <div className="bg-horizon-card/30 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="font-semibold text-horizon-text flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-green-500" />
                                ייצוא לאקסל (Excel)
                            </h3>
                            <p className="text-sm text-horizon-accent mt-1">
                                קובץ Excel מלא עם כל הנתונים והעריכות
                            </p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">
                            מומלץ
                        </Badge>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleExportExcel(null)}
                            disabled={isExporting}
                            className="flex-1"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    מייצא...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 ml-2" />
                                    יצוא כל הגיליונות
                                </>
                            )}
                        </Button>

                        {selectedSheet && (
                            <Button
                                onClick={() => handleExportExcel(selectedSheet.id)}
                                disabled={isExporting}
                                variant="outline"
                                className="flex-1"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                        מייצא...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 ml-2" />
                                        יצוא גיליון נוכחי
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* העתקה מהירה */}
                <div className="bg-horizon-card/30 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="font-semibold text-horizon-text flex items-center gap-2">
                                <Copy className="w-4 h-4 text-blue-500" />
                                העתקה מהירה
                            </h3>
                            <p className="text-sm text-horizon-accent mt-1">
                                העתק את מזהה התחזית ללוח
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleCopyData}
                        variant="outline"
                        className="w-full"
                    >
                        <Copy className="w-4 h-4 ml-2" />
                        העתק מזהה
                    </Button>
                </div>

                {/* מידע נוסף */}
                <div className="text-xs text-horizon-accent space-y-1 pt-4 border-t border-horizon">
                    <p className="flex justify-between">
                        <span>גיליונות:</span>
                        <span className="font-semibold">{sheets.length}</span>
                    </p>
                    <p className="flex justify-between">
                        <span>שם קובץ מקורי:</span>
                        <span className="font-semibold">{forecast.file_name || 'לא ידוע'}</span>
                    </p>
                    <p className="flex justify-between">
                        <span>תאריך העלאה:</span>
                        <span className="font-semibold">
                            {new Date(forecast.created_date).toLocaleDateString('he-IL')}
                        </span>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}