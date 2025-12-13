import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { sendWhatsAppMessage } from "@/functions/sendWhatsAppMessage";

export default function WhatsAppTestSender() {
    const [recipientPhone, setRecipientPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    const handleSend = async () => {
        if (!recipientPhone.trim()) {
            setLastResult({ 
                success: false, 
                error: "נא להזין מספר טלפון" 
            });
            return;
        }

        setIsSending(true);
        setLastResult(null);

        try {
            const { data, status } = await sendWhatsAppMessage({
                recipientPhone: recipientPhone.trim(),
                customerName: customerName.trim() || 'יקר/ה',
                templateName: "sundays_msg_v2",
                messageType: "test"
            });

            if (status === 200 && data.success) {
                setLastResult({
                    success: true,
                    message: data.message,
                    recipientPhone: data.recipientPhone,
                    customerName: data.customerName,
                    woztellResponse: data.woztellResponse
                });
            } else {
                setLastResult({
                    success: false,
                    error: data.error || data.details || "שגיאה לא ידועה",
                    details: data
                });
            }
        } catch (error) {
            console.error("שגיאה בשליחת הודעה:", error);
            setLastResult({
                success: false,
                error: "שגיאה בחיבור לשרת או ב-API",
                details: error.message
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
            <Card className="card-horizon">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-horizon-text">
                        <MessageSquare className="w-6 h-6 text-green-500" />
                        בדיקת שליחת הודעות וואטסאפ
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-horizon-text mb-2">
                            מספר טלפון (נדרש) *
                        </label>
                        <Input
                            type="tel"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            placeholder="לדוגמה: 050-1234567 או 972501234567"
                            className="bg-horizon-card border-horizon text-horizon-text"
                            disabled={isSending}
                        />
                        <p className="text-xs text-horizon-accent mt-1">
                            ניתן להזין בפורמט ישראלי (050-1234567) או בינלאומי (972501234567)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-horizon-text mb-2">
                            שם הלקוח (אופציונלי)
                        </label>
                        <Input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="השם שיופיע בהודעה (ברירת מחדל: 'יקר/ה')"
                            className="bg-horizon-card border-horizon text-horizon-text"
                            disabled={isSending}
                        />
                    </div>

                    <Button 
                        onClick={handleSend}
                        disabled={isSending || !recipientPhone.trim()}
                        className="w-full btn-horizon-primary"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                שולח הודעה...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 ml-2" />
                                שלח הודעת בדיקה
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* תוצאות שליחה */}
            {lastResult && (
                <Card className="card-horizon">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {lastResult.success ? (
                                <>
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <span className="text-green-600">הודעה נשלחה בהצלחה!</span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <span className="text-red-600">שגיאה בשליחה</span>
                                </>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lastResult.success ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-green-500 text-white">נשלח</Badge>
                                    <span className="text-horizon-text">למספר: {lastResult.recipientPhone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-horizon-secondary text-horizon-secondary">שם</Badge>
                                    <span className="text-horizon-text">{lastResult.customerName}</span>
                                </div>
                                {lastResult.woztellResponse && (
                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-sm font-medium text-horizon-accent">
                                            תגובה מפורטת מ-Woztell (לפתיחה)
                                        </summary>
                                        <pre className="mt-2 p-3 bg-horizon-card rounded text-xs overflow-auto">
                                            {JSON.stringify(lastResult.woztellResponse, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Alert className="border-red-200 bg-red-50">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    <AlertDescription className="text-red-800">
                                        <strong>שגיאה:</strong> {lastResult.error}
                                    </AlertDescription>
                                </Alert>
                                {lastResult.details && (
                                    <details>
                                        <summary className="cursor-pointer text-sm font-medium text-horizon-accent">
                                            פרטים טכניים (לפתיחה)
                                        </summary>
                                        <pre className="mt-2 p-3 bg-horizon-card rounded text-xs overflow-auto">
                                            {JSON.stringify(lastResult.details, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* הוראות */}
            <Card className="card-horizon bg-blue-50/50 border-blue-200">
                <CardContent className="p-4">
                    <h4 className="font-medium text-blue-800 mb-2">הוראות חשובות:</h4>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc mr-4">
                        <li>וודא שהזנת את כל הסודות הנדרשים ב-workspace → environment variables</li>
                        <li>מספר הטלפון יומר אוטומטית לפורמט הבינלאומי הנכון</li>
                        <li>ההודעה תישלח באמצעות התבנית המוגדרת מראש ב-Woztell</li>
                        <li>אם השליחה נכשלת, בדוק את הסודות ואת החיבור ל-Woztell</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}