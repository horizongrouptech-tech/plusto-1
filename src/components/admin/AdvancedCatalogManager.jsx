import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Eraser, Download, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { deleteCatalogPermanently } from "@/functions/deleteCatalogPermanently";
import { exportCatalogToExcel } from "@/functions/exportCatalogToExcel";
import { cleanCatalogSmartly } from "@/functions/cleanCatalogSmartly";

export default function AdvancedCatalogManager({ customer, onCatalogChange }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [actionType, setActionType] = useState('');
    const [lastActionResult, setLastActionResult] = useState(null);

    const handleDeleteCatalog = async () => {
        setIsDeleting(true);
        try {
            const { data } = await deleteCatalogPermanently({
                customer_email: customer.email
            });

            setLastActionResult({
                success: true,
                message: data.message,
                type: 'delete'
            });

            onCatalogChange?.();
        } catch (error) {
            setLastActionResult({
                success: false,
                message: 'שגיאה במחיקת הקטלוג: ' + error.message,
                type: 'delete'
            });
        } finally {
            setIsDeleting(false);
            setConfirmDialogOpen(false);
        }
    };

    const handleCleanCatalog = async () => {
        setIsCleaning(true);
        try {
            const { data } = await cleanCatalogSmartly({
                customer_email: customer.email
            });

            setLastActionResult({
                success: true,
                message: `ניקוי הושלם: ${data.cleanedCount} רשומות נוקו`,
                type: 'clean'
            });

            onCatalogChange?.();
        } catch (error) {
            setLastActionResult({
                success: false,
                message: 'שגיאה בניקוי הקטלוג: ' + error.message,
                type: 'clean'
            });
        } finally {
            setIsCleaning(false);
            setConfirmDialogOpen(false);
        }
    };

    const handleExportCatalog = async () => {
        setIsExporting(true);
        try {
            const response = await exportCatalogToExcel({
                customer_email: customer.email
            });

            // יצירת קישור להורדה
            const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `catalog_${customer.email.replace('@', '_')}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setLastActionResult({
                success: true,
                message: 'הקטלוג יוצא בהצלחה לאקסל',
                type: 'export'
            });
        } catch (error) {
            setLastActionResult({
                success: false,
                message: 'שגיאה בייצוא הקטלוג: ' + error.message,
                type: 'export'
            });
        } finally {
            setIsExporting(false);
        }
    };

    const openConfirmDialog = (type) => {
        setActionType(type);
        setConfirmDialogOpen(true);
    };

    const executeAction = () => {
        switch (actionType) {
            case 'delete':
                handleDeleteCatalog();
                break;
            case 'clean':
                handleCleanCatalog();
                break;
            default:
                setConfirmDialogOpen(false);
        }
    };

    const getActionDetails = () => {
        switch (actionType) {
            case 'delete':
                return {
                    title: 'מחיקת קטלוג לצמיתות',
                    description: 'פעולה זו תמחק את כל המוצרים בקטלוג באופן בלתי הפיך. לא ניתן יהיה לשחזר את הנתונים.',
                    buttonText: 'מחק לצמיתות',
                    buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
                };
            case 'clean':
                return {
                    title: 'ניקוי קטלוג מלא',
                    description: 'פעולה זו תבצע ניקוי יסודי של הקטלוג, תמחק כפילויות ותתקן נתונים פגומים. הקטלוג יישאר אך הנתונים יעודכנו.',
                    buttonText: 'נקה קטלוג',
                    buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white'
                };
            default:
                return {};
        }
    };

    const actionDetails = getActionDetails();

    return (
        <Card className="card-horizon">
            <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                    <Eraser className="w-5 h-5 text-horizon-primary" />
                    ניהול קטלוג מתקדם
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* תוצאת פעולה אחרונה */}
                {lastActionResult && (
                    <Alert className={lastActionResult.success ? 'border-green-500' : 'border-red-500'}>
                        {lastActionResult.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <AlertDescription className={lastActionResult.success ? 'text-green-700' : 'text-red-700'}>
                            {lastActionResult.message}
                        </AlertDescription>
                    </Alert>
                )}

                {/* מידע על הלקוח */}
                <div className="bg-horizon-card/30 p-3 rounded-lg">
                    <div className="text-sm text-horizon-accent mb-1">לקוח נבחר:</div>
                    <div className="font-medium text-horizon-text">
                        {customer.business_name || customer.full_name} ({customer.email})
                    </div>
                </div>

                {/* כפתורי פעולות */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* ייצוא לאקסל */}
                    <Button
                        onClick={handleExportCatalog}
                        disabled={isExporting}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        ייצוא לאקסל
                    </Button>

                    {/* ניקוי קטלוג */}
                    <Button
                        onClick={() => openConfirmDialog('clean')}
                        disabled={isCleaning}
                        variant="outline"
                        className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white flex items-center gap-2"
                    >
                        {isCleaning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Eraser className="w-4 h-4" />
                        )}
                        ניקוי קטלוג
                    </Button>

                    {/* מחיקת קטלוג */}
                    <Button
                        onClick={() => openConfirmDialog('delete')}
                        disabled={isDeleting}
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white flex items-center gap-2"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        מחק קטלוג
                    </Button>
                </div>

                {/* הסברים על הפעולות */}
                <div className="text-xs text-horizon-accent bg-horizon-card/20 p-3 rounded">
                    <div className="font-medium mb-2">מידע על הפעולות:</div>
                    <ul className="space-y-1">
                        <li><strong>ייצוא לאקסל:</strong> מוריד את כל נתוני הקטלוג כקובץ CSV תואם Excel</li>
                        <li><strong>ניקוי קטלוג:</strong> מנקה כפילויות ונתונים פגומים, משאיר את הקטלוג</li>
                        <li><strong>מחיקת קטלוג:</strong> מוחק את כל הקטלוג לצמיתות - לא ניתן לשחזור</li>
                    </ul>
                </div>

                {/* Dialog אישור */}
                <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                    <DialogContent className="bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <AlertTriangle className="w-6 h-6 text-orange-500" />
                                {actionDetails.title}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {actionDetails.description}
                                </AlertDescription>
                            </Alert>

                            <div className="bg-horizon-card/30 p-3 rounded">
                                <div className="text-sm text-horizon-accent mb-1">לקוח:</div>
                                <div className="font-medium">{customer.business_name || customer.full_name}</div>
                                <div className="text-sm text-horizon-accent">{customer.email}</div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={() => setConfirmDialogOpen(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    בטל
                                </Button>
                                <Button
                                    onClick={executeAction}
                                    className={`flex-1 ${actionDetails.buttonClass}`}
                                    disabled={isDeleting || isCleaning}
                                >
                                    {(isDeleting || isCleaning) ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : null}
                                    {actionDetails.buttonText}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}