
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { ManualForecastMappingProfile } from "@/entities/ManualForecastMappingProfile";
import { normalizeAndLoadForecast } from "@/functions/normalizeAndLoadForecast";
import { toast } from "sonner";

export default function ColumnMappingWizard({ isOpen, onClose, parsedData, customer, onComplete }) {
    const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
    const [mappings, setMappings] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);

    const targetFields = [
        { value: 'period_month', label: 'תאריך/חודש', required: false },
        { value: 'category', label: 'קטגוריה', required: false },
        { value: 'subcategory', label: 'תת-קטגוריה', required: false },
        { value: 'revenue', label: 'הכנסות', required: true },
        { value: 'expenses', label: 'הוצאות', required: true },
        { value: 'profit', label: 'רווח', required: false },
        { value: 'notes', label: 'הערות', required: false }
    ];

    const currentSheet = parsedData?.sheets?.[currentSheetIndex];

    const handleColumnMap = (targetField, sourceColumnIndex) => {
        setMappings(prev => ({
            ...prev,
            [currentSheet.sheet_name]: {
                ...(prev[currentSheet.sheet_name] || {}),
                [targetField]: sourceColumnIndex !== 'none' ? [parseInt(sourceColumnIndex)] : []
            }
        }));
    };

    const handleNext = () => {
        if (currentSheetIndex < parsedData.sheets.length - 1) {
            setCurrentSheetIndex(currentSheetIndex + 1);
        }
    };

    const handleBack = () => {
        if (currentSheetIndex > 0) {
            setCurrentSheetIndex(currentSheetIndex - 1);
        }
    };

    const handleFinish = async () => {
        setIsProcessing(true);
        try {
            // שמירת פרופיל המיפוי
            const profile = await ManualForecastMappingProfile.create({
                customer_email: customer.email,
                profile_name: `${parsedData.file_name} - ${new Date().toLocaleDateString('he-IL')}`,
                mappings: mappings
            });

            // קריאה לנרמול וטעינה עם המיפוי הידני
            const response = await normalizeAndLoadForecast({
                forecast_id: parsedData.forecast_id,
                parsed_sheets: parsedData.sheets,
                mapping_profile_id: profile.id
            });

            if (!response.data.success) {
                throw new Error(response.data.error);
            }

            onComplete();
        } catch (error) {
            console.error('Mapping error:', error);
            toast.error('שגיאה בשמירת המיפוי: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const isSheetMappingComplete = () => {
        const sheetMapping = mappings[currentSheet?.sheet_name] || {};
        const requiredFields = targetFields.filter(f => f.required);
        
        return requiredFields.every(field => {
            const mapped = sheetMapping[field.value];
            return mapped && mapped.length > 0;
        });
    };

    // This function seems to be causing issues as it changes state (setCurrentSheetIndex)
    // during rendering/evaluation, which is not allowed and can lead to infinite loops
    // or unexpected behavior. It also iterates through all sheets, which isn't the
    // typical use case for a single "isAllMappingComplete" check.
    // If its purpose is to check if *all* sheets are mappable, it should calculate
    // this based on the existing `mappings` state without modifying `currentSheetIndex`.
    // For now, I'm commenting it out as it's not used in the current UI logic for enabling/disabling buttons.
    // If it's intended to be used, its implementation would need to be revisited.
    // const isAllMappingComplete = () => {
    //     return parsedData.sheets.every((sheet, idx) => {
    //         setCurrentSheetIndex(idx);
    //         return isSheetMappingComplete();
    //     });
    // };

    if (!currentSheet) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dir-rtl bg-horizon-dark border-horizon">
                <DialogHeader>
                    <DialogTitle className="text-xl text-horizon-text text-right">
                        אשף מיפוי עמודות
                    </DialogTitle>
                    <DialogDescription className="text-right text-horizon-accent">
                        מפה את העמודות מהקובץ לשדות במערכת. 
                        גיליון {currentSheetIndex + 1} מתוך {parsedData.sheets.length}: {currentSheet.sheet_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* אינדיקטור התקדמות */}
                    <div className="flex justify-center gap-2">
                        {parsedData.sheets.map((sheet, idx) => (
                            <div
                                key={idx}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                    idx === currentSheetIndex
                                        ? 'bg-horizon-primary text-white'
                                        : idx < currentSheetIndex
                                        ? 'bg-green-500 text-white'
                                        : 'bg-horizon-card text-horizon-accent'
                                }`}
                            >
                                {idx + 1}
                            </div>
                        ))}
                    </div>

                    {/* דוגמת נתונים */}
                    <Card className="card-horizon">
                        <CardHeader>
                            <CardTitle className="text-sm text-horizon-text">תצוגה מקדימה (5 שורות ראשונות)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-horizon">
                                            {currentSheet.original_columns.map((col, idx) => (
                                                <th key={idx} className="p-2 text-right text-horizon-accent">
                                                    {col || `עמודה ${idx + 1}`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentSheet.data_rows.slice(0, 5).map((row, rowIdx) => (
                                            <tr key={rowIdx} className="border-b border-horizon/30">
                                                {row.map((cell, cellIdx) => (
                                                    <td key={cellIdx} className="p-2 text-right text-horizon-text">
                                                        {cell?.toString() || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* מיפוי עמודות */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-horizon-text">מיפוי שדות</h3>
                        {targetFields.map((field) => (
                            <div key={field.value} className="flex items-center gap-3">
                                <div className="flex-1 text-right">
                                    <span className="text-horizon-text">{field.label}</span>
                                    {field.required && (
                                        <Badge className="mr-2 bg-red-100 text-red-800">חובה</Badge>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Select
                                        value={
                                            mappings[currentSheet.sheet_name]?.[field.value]?.[0]?.toString() || 'none'
                                        }
                                        onValueChange={(value) => handleColumnMap(field.value, value)}
                                    >
                                        <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                            <SelectValue placeholder="בחר עמודה..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">לא ממופה</SelectItem>
                                            {currentSheet.original_columns.map((col, idx) => (
                                                <SelectItem key={idx} value={idx.toString()}>
                                                    {col || `עמודה ${idx + 1}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* כפתורי ניווט */}
                    <div className="flex justify-between pt-4 border-t border-horizon">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={currentSheetIndex === 0 || isProcessing}
                            >
                                <ArrowLeft className="w-4 h-4 ml-2" />
                                הקודם
                            </Button>
                            {currentSheetIndex < parsedData.sheets.length - 1 ? (
                                <Button
                                    onClick={handleNext}
                                    disabled={!isSheetMappingComplete() || isProcessing}
                                >
                                    הבא
                                    <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleFinish}
                                    disabled={!isSheetMappingComplete() || isProcessing}
                                    className="btn-horizon-primary"
                                >
                                    {isProcessing ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 ml-2 animate-spin" />
                                            מעבד...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 ml-2" />
                                            סיים ושמור
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                        <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
                            ביטול
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
