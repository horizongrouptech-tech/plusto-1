
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    PlusCircle, 
    Trash2, 
    Save,
    Loader2,
    CalendarIcon,
    FileSpreadsheet,
    Info,
    MessageSquare
} from "lucide-react";
import PeriodRangePicker from './PeriodRangePicker';
import { ManualForecast } from "@/entities/ManualForecast";
import { ManualForecastSheet } from "@/entities/ManualForecastSheet";
import { ManualForecastRow } from "@/entities/ManualForecastRow";
import { toast } from "sonner";

export default function ManualDataEntry({ customer, onComplete }) {
    const createDefaultRow = () => ({
        period: { type: 'single', start: null, end: null, display: '' },
        category: '',
        subcategory: '',
        revenue: 0,
        expenses: 0,
        notes: ''
    });

    const [forecastData, setForecastData] = useState({
        sheetName: 'תחזית עסקית',
        rows: [createDefaultRow()]
    });
    const [isSaving, setIsSaving] = useState(false);
    
    const addRow = () => {
        setForecastData(prev => ({
            ...prev,
            rows: [...prev.rows, createDefaultRow()]
        }));
    };

    const removeRow = (index) => {
        setForecastData(prev => ({
            ...prev,
            rows: prev.rows.filter((_, i) => i !== index)
        }));
    };

    const updateRow = (index, field, value) => {
        setForecastData(prev => ({
            ...prev,
            rows: prev.rows.map((row, i) => i === index ? { ...row, [field]: value } : row)
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        toast.info("שומר תחזית...");
        try {
            // Find or create forecast
            let [forecast] = await ManualForecast.filter({ customer_email: customer.email }, '-created_date', 1);
            if (!forecast) {
                forecast = await ManualForecast.create({
                    customer_email: customer.email,
                    file_name: 'הזנה ידנית',
                    status: 'ready',
                    sheet_count: 1
                });
            }

            // Find or create sheet
            let [sheet] = await ManualForecastSheet.filter({ forecast_id: forecast.id });
            if (!sheet) {
                sheet = await ManualForecastSheet.create({
                    forecast_id: forecast.id,
                    sheet_name: forecastData.sheetName,
                    sheet_index: 0
                });
            } else {
                await ManualForecastSheet.update(sheet.id, { sheet_name: forecastData.sheetName });
            }

            // Delete existing rows for this sheet to replace them
            const existingRows = await ManualForecastRow.filter({ sheet_id: sheet.id });
            for (const row of existingRows) {
                await ManualForecastRow.delete(row.id);
            }
            
            // Create new rows
            const rowsToCreate = forecastData.rows.map((row, index) => ({
                forecast_id: forecast.id,
                sheet_id: sheet.id,
                row_index: index,
                period_month: row.period.start, // Storing period as a string for now
                category: row.category,
                subcategory: row.subcategory,
                revenue: parseFloat(row.revenue) || 0,
                expenses: parseFloat(row.expenses) || 0,
                profit: (parseFloat(row.revenue) || 0) - (parseFloat(row.expenses) || 0),
                notes: row.notes,
                extra: { period: row.period } // Store the full period object in extra
            }));

            await ManualForecastRow.bulkCreate(rowsToCreate);

            toast.success("התחזית נשמרה בהצלחה!");
            if (onComplete) onComplete();
        } catch (error) {
            console.error("Error saving manual forecast:", error);
            toast.error("שגיאה בשמירת התחזית: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="space-y-4" dir="rtl">
            <Card className="card-horizon">
                <CardHeader>
                    <CardTitle className="text-horizon-text flex items-center gap-2 text-right">
                        <FileSpreadsheet className="w-5 h-5 text-horizon-primary" />
                        הזנת תחזית עסקית ידנית
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                        <Info className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-200 text-sm text-right">
                            <strong>מבנה התחזית:</strong> כל שורה = תקופה + קטגוריה + הכנסות/הוצאות + הערות
                        </AlertDescription>
                    </Alert>

                    <div>
                        <Label className="text-horizon-text text-right block mb-2 font-bold">
                            שם הגיליון
                        </Label>
                        <Input
                            value={forecastData.sheetName}
                            onChange={(e) => setForecastData({...forecastData, sheetName: e.target.value})}
                            className="bg-horizon-card border-horizon text-horizon-text text-right text-lg font-semibold"
                            placeholder="תחזית עסקית 2024"
                        />
                    </div>

                    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                        {forecastData.rows.map((row, index) => (
                            <div key={index} className="space-y-3">
                                {/* תקופה */}
                                <div className="bg-gradient-to-l from-blue-600/20 to-blue-500/10 border-2 border-blue-500 rounded-xl p-4 shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-500 rounded-full p-2">
                                            <CalendarIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <Label className="text-blue-300 text-xs font-bold mb-2 block">
                                                📅 תקופה #{index + 1}
                                            </Label>
                                            <PeriodRangePicker
                                                value={row.period}
                                                onChange={(value) => updateRow(index, 'period', value)}
                                            />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)} disabled={forecastData.rows.length === 1} className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* נתונים והערות */}
                                <Card className="bg-horizon-card/80 border-horizon-primary/30 shadow-md">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-horizon-accent text-xs font-bold">📁 קטגוריה ראשית</Label>
                                                <Input type="text" value={row.category} onChange={(e) => updateRow(index, 'category', e.target.value)} className="bg-horizon-dark border-horizon text-horizon-text text-sm h-10 text-right" placeholder="לדוגמה: מכירות" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-horizon-accent text-xs font-bold">📋 תת קטגוריה</Label>
                                                <Input type="text" value={row.subcategory} onChange={(e) => updateRow(index, 'subcategory', e.target.value)} className="bg-horizon-dark border-horizon text-horizon-text text-sm h-10 text-right" placeholder="פירוט נוסף (אופציונלי)" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-green-400 text-xs font-bold">💰 הכנסות (₪)</Label>
                                                <Input type="number" value={row.revenue} onChange={(e) => updateRow(index, 'revenue', e.target.value)} className="bg-horizon-dark border-horizon text-green-400 text-sm h-10 text-right" placeholder="0" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-red-400 text-xs font-bold">💸 הוצאות (₪)</Label>
                                                <Input type="number" value={row.expenses} onChange={(e) => updateRow(index, 'expenses', e.target.value)} className="bg-horizon-dark border-horizon text-red-400 text-sm h-10 text-right" placeholder="0" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-horizon-primary text-xs font-bold">📊 רווח (₪)</Label>
                                                <div className={`flex items-center justify-end h-10 px-3 rounded-md bg-horizon-dark border-horizon text-lg font-bold ${(row.revenue - row.expenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {((row.revenue || 0) - (row.expenses || 0)).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                {/* הערות */}
                                <div className="bg-gradient-to-l from-yellow-600/20 to-yellow-500/10 border-2 border-yellow-500 rounded-xl p-4 shadow-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-yellow-500 rounded-full p-2 mt-1">
                                            <MessageSquare className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <Label className="text-yellow-300 text-xs font-bold mb-2 block">
                                                💡 הערות לשורה זו
                                            </Label>
                                            <Textarea value={row.notes} onChange={(e) => updateRow(index, 'notes', e.target.value)} className="bg-horizon-dark border-horizon text-horizon-text text-sm" placeholder="רשום כאן כל הערה רלוונטית..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-horizon">
                        <Button onClick={addRow} variant="outline" className="text-horizon-primary border-horizon-primary hover:bg-horizon-primary/10">
                            <PlusCircle className="w-4 h-4 ml-2" />
                            הוסף שורה חדשה
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary min-w-[120px]">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-2" /> שמור תחזית</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
