import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { sendWhatsAppMessage } from '@/api/functions';


export default function WhatsAppTest() {
  const [formData, setFormData] = useState({
    phoneNumber: "",
    customerEmail: "",
    recommendationTitle: "",
    recommendationDescription: "",
    actionSteps: "",
    expectedProfit: "",
    templateType: "auto"
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.phoneNumber || !formData.customerEmail || !formData.recommendationTitle) {
      setError("יש למלא את השדות החובה: מספר טלפון, אימייל לקוח וכותרת המלצה");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // הכנת אובייקט המלצה מדומה לבדיקה
      const testRecommendation = {
        id: `test_${Date.now()}`,
        title: formData.recommendationTitle,
        description: formData.recommendationDescription,
        action_steps: formData.actionSteps ? formData.actionSteps.split('\n').filter(step => step.trim()) : [],
        expected_profit: formData.expectedProfit ? parseFloat(formData.expectedProfit) : null,
        category: 'pricing',
        priority: 'medium',
        created_date: new Date().toISOString()
      };

      const response = await sendWhatsAppMessage({
        phoneNumber: formData.phoneNumber,
        customerEmail: formData.customerEmail,
        recommendation: testRecommendation,
        templateType: formData.templateType
      });

      if (response.data.success) {
        setResult({
          success: true,
          messageId: response.data.messageId,
          templateUsed: response.data.templateUsed,
          sentTo: response.data.sentTo,
          woztellResponse: response.data.woztellResponse
        });
      } else {
        throw new Error(response.data.error || 'שגיאה לא ידועה');
      }
    } catch (err) {
      console.error('Error sending test WhatsApp message:', err);
      setError(`שגיאה בשליחת הודעת בדיקה: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-horizon-text flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-horizon-primary" />
            בדיקת שליחת וואטסאפ
          </h1>
          <p className="text-horizon-accent mt-2">כלי לבדיקת שליחת המלצות עסקיות דרך וואטסאפ</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* טופס בדיקה */}
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-horizon-text">
                <Send className="w-5 h-5 text-horizon-primary" />
                שליחת הודעת בדיקה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phoneNumber" className="text-horizon-accent">
                    מספר טלפון (עם קידומת מדינה) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="972501234567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    required
                  />
                  <p className="text-xs text-horizon-accent mt-1">
                    לדוגמה: 972501234567 (ישראל) או 1234567890 (ארה"ב)
                  </p>
                </div>

                <div>
                  <Label htmlFor="customerEmail" className="text-horizon-accent">
                    אימייל לקוח <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="templateType" className="text-horizon-accent">
                    סוג תבנית
                  </Label>
                  <Select value={formData.templateType} onValueChange={(value) => handleInputChange('templateType', value)}>
                    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">בחירה אוטומטית</SelectItem>
                      <SelectItem value="free_recommendation_v1">המלצה קצרה</SelectItem>
                      <SelectItem value="recommendation_v1">המלצה מפורטת</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recommendationTitle" className="text-horizon-accent">
                    כותרת המלצה <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="recommendationTitle"
                    placeholder="לדוגמה: שינוי מחיר מוצר X"
                    value={formData.recommendationTitle}
                    onChange={(e) => handleInputChange('recommendationTitle', e.target.value)}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="recommendationDescription" className="text-horizon-accent">
                    תיאור המלצה
                  </Label>
                  <Textarea
                    id="recommendationDescription"
                    placeholder="תיאור מפורט של ההמלצה..."
                    value={formData.recommendationDescription}
                    onChange={(e) => handleInputChange('recommendationDescription', e.target.value)}
                    className="bg-horizon-card border-horizon text-horizon-text h-24"
                  />
                </div>

                <div>
                  <Label htmlFor="actionSteps" className="text-horizon-accent">
                    שלבי ביצוע (כל שורה = שלב)
                  </Label>
                  <Textarea
                    id="actionSteps"
                    placeholder="שלב 1: עדכון מחיר במערכת&#10;שלב 2: עדכון באתר&#10;שלב 3: הודעה ללקוחות"
                    value={formData.actionSteps}
                    onChange={(e) => handleInputChange('actionSteps', e.target.value)}
                    className="bg-horizon-card border-horizon text-horizon-text h-20"
                  />
                </div>

                <div>
                  <Label htmlFor="expectedProfit" className="text-horizon-accent">
                    רווח צפוי (בשקלים)
                  </Label>
                  <Input
                    id="expectedProfit"
                    type="number"
                    placeholder="1000"
                    value={formData.expectedProfit}
                    onChange={(e) => handleInputChange('expectedProfit', e.target.value)}
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full btn-horizon-primary"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      שולח הודעה...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      שלח הודעת בדיקה
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* תוצאות */}
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="bg-green-500/20 border-green-500/30 text-green-300">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">הודעה נשלחה בהצלחה!</p>
                    <div className="text-sm space-y-1">
                      <p><strong>מזהה הודעה:</strong> {result.messageId}</p>
                      <p><strong>תבנית שנבחרה:</strong> {result.templateUsed}</p>
                      <p><strong>נשלח ל:</strong> {result.sentTo}</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result && result.woztellResponse && (
              <Card className="card-horizon">
                <CardHeader>
                  <CardTitle className="text-horizon-text text-lg">תגובת Woztell</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-horizon-card p-3 rounded border border-horizon overflow-auto text-horizon-accent">
                    {JSON.stringify(JSON.parse(result.woztellResponse), null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* הנחיות שימוש */}
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text text-lg">הנחיות שימוש</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-horizon-accent space-y-3">
                <div>
                  <h4 className="font-semibold text-horizon-text">פורמט מספר טלפון:</h4>
                  <p>השתמש בפורמט בינלאומי ללא + או רווחים. לדוגמה: 972501234567</p>
                </div>
                <div>
                  <h4 className="font-semibold text-horizon-text">בחירת תבנית:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>אוטומטית:</strong> המערכת תבחר על סמך כמות התוכן</li>
                    <li><strong>המלצה קצרה:</strong> רק כותרת וגוף קצר</li>
                    <li><strong>המלצה מפורטת:</strong> כולל שלבי ביצוע ורווח צפוי</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-horizon-text">מעקב פידבק:</h4>
                  <p>לאחר שליחת ההודעה, הלקוח יוכל ללחוץ על אחד מ-3 כפתורים: "מדויק, איישם", "מעוניין בפרטים" או "לא רלוונטי". הפידבק יירשם במערכת אוטומטית.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}