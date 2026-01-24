
import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { Supplier } from "@/entities/Supplier";
import { SupplierQuote } from "@/entities/SupplierQuote";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, TrendingDown, DollarSign, Users, AlertTriangle, Search, Plus, RefreshCw, Package, Send, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InvokeLLM } from "@/integrations/Core";

import AddSupplierModal from '../components/shared/AddSupplierModal';
import SupplierQuoteRequestModal from '../components/shared/SupplierQuoteRequestModal';

export default function SupplierAnalysisPage() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResults, setAnalysisResults] = useState([]);
  
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [selectedSupplierForQuote, setSelectedSupplierForQuote] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      
      if (userData) {
        const [productsData, suppliersData, quotesData] = await Promise.all([
          Product.filter({ created_by: userData.email }),
          Supplier.filter({ created_by: userData.email }),
          SupplierQuote.filter({ created_by: userData.email })
        ]);
        
        setProducts(productsData);
        setSuppliers(suppliersData);
        setQuotes(quotesData);
      }
    } catch (err) {
      setError("שגיאה בטעינת נתונים: " + err.message);
      console.error("Error loading data:", err);
    }
    setIsLoading(false);
  };

  // Function to remove URLs from text - KEPT, though not used for LLM output anymore
  const removeUrls = (text) => {
    if (!text) return "";
    // Regular expression to match common URL patterns
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}(\/[^\s]*)*)/g;
    return text.replace(urlRegex, '[קישור הוסר]');
  };

  const analyzeSuppliers = async () => {
    if (products.length === 0) {
      setError("אין מוצרים לניתוח. אנא העלה תחילה מוצרים למערכת.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const results = [];
      
      for (const product of products.slice(0, 5)) { // Limit to first 5 products for performance
        console.log(`מנתח ספקים עבור: ${product.name}`);
        
        const analysis = await InvokeLLM({
          prompt: `
          מוצר: "${product.name}"
          קטגוריה: ${product.category || 'לא צוינה'}
          ספק נוכחי: ${product.supplier || 'לא צוין'}
          מחיר עלות נוכחי: ₪${product.cost_price}
          מכירות חודשיות: ${product.monthly_sales || 0} יחידות
          
          בצע מחקר שוק מקיף באינטרנט למציאת ספקים אלטרנטיביים בישראל עבור מוצר זה.
          חפש ספקים אמינים עם מחירים טובים יותר.
          חשב את החיסכון הכולל על בסיס ${product.monthly_sales || 10} יחידות חודשיות.
          אל תכלול קישורים או מקורות בתשובה.
          `,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              suppliers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    estimated_price: { type: "number" },
                    quality_rating: { type: "number", minimum: 1, maximum: 5 },
                    delivery_time: { type: "string" },
                    minimum_order: { type: "number" },
                    advantages: { type: "string" },
                    contact_info: { type: "string" }
                  }
                }
              },
              current_supplier_analysis: {
                type: "object",
                properties: {
                  competitiveness: { type: "string" },
                  recommendations: { type: "string" }
                }
              }
            },
            required: ["suppliers"]
          }
        });

        if (analysis && analysis.suppliers) {
          results.push({
            product: product,
            alternatives: analysis.suppliers,
            current_analysis: analysis.current_supplier_analysis
          });
          
          // Create supplier quotes in database with proper calculations
          for (const supplier of analysis.suppliers) {
            const currentPrice = product.cost_price || 0;
            const newPrice = supplier.estimated_price || currentPrice;
            const unitSavings = Math.max(0, currentPrice - newPrice); // Savings per unit
            const monthlySales = product.monthly_sales || 10; 
            const totalMonthlySavings = unitSavings * monthlySales; // Total monthly savings
            const savingsPercentage = currentPrice > 0 ? (unitSavings / currentPrice) * 100 : 0;
            
            await SupplierQuote.create({
              supplier_name: supplier.name,
              product_name: product.name,
              unit_price: newPrice, // Use estimated price, fallback to current
              minimum_quantity: supplier.minimum_order || 1,
              delivery_time: supplier.delivery_time || 'לא צוין',
              quality_grade: supplier.quality_rating >= 4 ? 'premium' : supplier.quality_rating >= 3 ? 'professional' : 'basic',
              quote_date: new Date().toISOString().split('T')[0],
              valid_until: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // 30 days validity
              status: 'pending',
              savings_potential: totalMonthlySavings, // This now represents total monthly savings
              savings_percentage: savingsPercentage,
              created_by: user.email
            });
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setAnalysisResults(results);
      await loadData(); // Reload quotes
      
    } catch (err) {
      setError("שגיאה בניתוח ספקים: " + err.message);
      console.error("Error analyzing suppliers:", err);
    }
    
    setIsAnalyzing(false);
  };

  const calculateTotalSavings = () => {
    // Calculate total savings from all pending and accepted quotes
    // This logic ensures only the best quote per product is summed
    const bestQuotes = {};
    quotes
      .filter(quote => quote.status === 'pending' || quote.status === 'accepted')
      .forEach(quote => {
        const potentialSavings = quote.savings_potential || 0;
        if (!bestQuotes[quote.product_name] || potentialSavings > bestQuotes[quote.product_name]) {
          bestQuotes[quote.product_name] = potentialSavings;
        }
      });
    return Object.values(bestQuotes).reduce((total, savings) => total + savings, 0);
  };

  const discoverNewSuppliers = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const newSupplierSuggestions = await InvokeLLM({
        prompt: `
          בהתבסס על פרופיל העסק הבא:
          - סוג עסק: ${user.business_type}
          - מוצרים עיקריים: ${user.main_products}
          - ספקי שירות נוכחיים: ${user.service_providers?.map(p => `${p.service_type} בעלות ${p.monthly_cost} ש"ח`).join(', ') || 'לא צוינו'}
          - מיקום: ${user.address?.city || 'ישראל'}

          אנא הצע 3-5 ספקים חדשים, כולל ספקי שירות (כמו רו"ח, שיווק דיגיטלי, בתי דפוס) וספקי מוצרים משלימים, שיכולים להיות רלוונטיים לעסק זה.
          עבור כל ספק, ספק:
          - שם הספק
          - תחום התמחות/קטגוריה
          - תיאור קצר של השירות/מוצר והיתרון לעסק
          - הערכת מחיר/חיסכון פוטנציאלי
        `,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            suppliers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  description: { type: "string" },
                  estimated_value_proposition: { type: "string" }
                },
                required: ["name", "category", "description", "estimated_value_proposition"]
              }
            }
          }
        }
      });

      if (newSupplierSuggestions && newSupplierSuggestions.suppliers) {
        // Here you would display these suggestions to the user, perhaps in a new state variable and a new UI section
        alert("מצאנו ספקים חדשים! התוצאות יוצגו בקרוב.");
        console.log(newSupplierSuggestions.suppliers);
      }

    } catch(err) {
      setError("שגיאה בגילוי ספקים חדשים: " + err.message);
    }
    setIsAnalyzing(false);
  }

  const handleQuoteAction = async (quoteId, action) => {
    try {
      await SupplierQuote.update(quoteId, { status: action });
      
      // If user approved a quote, send email to admin
      if (action === 'accepted' && user) {
        const quote = quotes.find(q => q.id === quoteId);
        if (quote) {
          const qualityGradeText = quote.quality_grade === 'premium' ? 'פרימיום' : 
                                  quote.quality_grade === 'professional' ? 'מקצועית' : 'בסיסית';

          try {
            const { SendEmail } = await import("@/integrations/Core");
            await SendEmail({
              to: "yonabar543@gmail.com",
              subject: `אישור החלפת ספק מלקוח: ${user.business_name || user.full_name}`,
              body: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>אישור החלפת ספק</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="text-align: center; border-bottom: 3px solid #fc9f67; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #fc9f67; margin: 0; font-size: 24px;">אישור החלפת ספק</h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Plusto System</p>
        </div>

        <!-- Customer Info -->
        <div style="background-color: #f8f9fa; border-left: 4px solid #fc9f67; padding: 20px; margin-bottom: 25px; border-radius: 5px;">
            <h2 style="color: #fc9f67; margin: 0 0 15px 0; font-size: 18px;">פרטי הלקוח</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">שם העסק:</td>
                    <td style="padding: 8px 0;">${user.business_name || user.full_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">אימייל:</td>
                    <td style="padding: 8px 0;">${user.email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">טלפון:</td>
                    <td style="padding: 8px 0;">${user.phone || 'לא צוין'}</td>
                </tr>
            </table>
        </div>

        <!-- Action Taken -->
        <div style="background-color: #e8f5e8; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 25px; border-radius: 5px;">
            <h2 style="color: #28a745; margin: 0 0 15px 0; font-size: 18px;">פעולה שבוצעה</h2>
            <p style="margin: 0; font-size: 16px; font-weight: bold;">
                הלקוח אישר את הצעת המחיר למעבר לספק חלופי
            </p>
        </div>

        <!-- Quote Details -->
        <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin-bottom: 25px; border-radius: 5px;">
            <h2 style="color: #1976d2; margin: 0 0 20px 0; font-size: 18px;">פרטי ההצעה שאושרה</h2>
            
            <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 5px; overflow: hidden;">
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">מוצר:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${quote.product_name}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">ספק מוצע:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #2196f3;">${quote.supplier_name}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">מחיר ליחידה:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">₪${(quote.unit_price || 0).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">חיסכון חודשי מוערך:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #28a745;">+₪${(quote.savings_potential || 0).toLocaleString()}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">זמן אספקה:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${quote.delivery_time}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">כמות מינימלית:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ddd;">${quote.minimum_quantity} יחידות</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 12px; font-weight: bold;">דירוג איכות:</td>
                    <td style="padding: 12px;">
                        <span style="background-color: #32acc1; color: white; padding: 4px 12px; border-radius: 15px; font-size: 14px;">${qualityGradeText}</span>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Next Steps -->
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 25px; border-radius: 5px;">
            <h2 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">שלבים לביצוע (Next Steps)</h2>
            <ol style="margin: 0; padding-right: 20px;">
                <li style="margin-bottom: 10px;"><strong>יצירת קשר עם הלקוח:</strong> לאישור סופי ותיאום המעבר.</li>
                <li style="margin-bottom: 10px;"><strong>בדיקת הספק החדש:</strong> ביצוע בדיקת נאותות קצרה לספק המוצע.</li>
                <li style="margin-bottom: 10px;"><strong>ליווי ותמיכה:</strong> ליווי הלקוח בתהליך ההטמעה מול הספק החדש.</li>
                <li style="margin-bottom: 0;"><strong>מעקב:</strong> מעקב אחר שביעות הרצון והחיסכון בפועל לאחר המעבר.</li>
            </ol>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
            <p style="margin: 0;">בברכה,<br><strong style="color: #fc9f67;">צוות Plusto</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 12px;">
                📧 office@horizon.org.il | 📞 053-302-7572
            </p>
        </div>

    </div>
</body>
</html>`
            });
            console.log("Email sent to admin about supplier quote approval");
          } catch (emailError) {
            console.error("Failed to send email to admin:", emailError);
          }
        }
      }
      
      setQuotes(prev => 
        prev.map(q => q.id === quoteId ? { ...q, status: action } : q)
      );
      await loadData();
    } catch (err) {
      setError("שגיאה בעדכון הצעת מחיר");
      console.error("Error updating quote status:", err);
    }
  };

  const handleSupplierAdded = (newSupplier) => {
    // Assuming newSupplier might not have all fields, reload all data for consistency
    // Alternatively, you could optimistically update the suppliers state, then reload later.
    setShowAddSupplierModal(false); // Close modal on success
    loadData(); // Re-fetch all data to ensure consistency and correct sorting/filtering if any.
  };

  const handleRequestQuote = (supplier) => {
    setSelectedSupplierForQuote(supplier);
    setShowQuoteModal(true);
  };

  const handleQuoteRequested = (leadId) => {
    console.log('Quote requested with lead ID:', leadId);
    // Optional: refresh data or show confirmation
    setShowQuoteModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-horizon-dark p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6 bg-horizon-card" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="card-horizon">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-20 mb-2 bg-horizon-card" />
                  <Skeleton className="h-8 w-32 bg-horizon-card" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="rounded-xl border-horizon text-horizon-text hover:bg-horizon-card">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-horizon-text">ניתוח ספקים</h1>
            <p className="text-horizon-accent mt-1">מצא ספקים אלטרנטיביים וחסוך בעלויות</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-500/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-horizon">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-horizon-primary bg-opacity-20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-horizon-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-horizon-text">₪{calculateTotalSavings().toLocaleString()}</div>
                  <div className="text-sm text-horizon-accent">חיסכון פוטנציאלי (חודשי)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-horizon">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-horizon-secondary bg-opacity-20 rounded-xl">
                  <Users className="w-6 h-6 text-horizon-secondary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-horizon-text">{quotes.length}</div>
                  <div className="text-sm text-horizon-accent">הצעות מחיר</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-horizon">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-horizon-accent bg-opacity-20 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-horizon-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-horizon-text">{products.length}</div>
                  <div className="text-sm text-horizon-accent">מוצרים לניתוח</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* הוספה: הודעת מחויבות למחירים */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">🏆</span>
            </div>
            <div className="text-right">
              <p className="text-blue-900 font-medium">
                אנחנו מתחייבים למחירים הטובים ביותר לקהילת הורייזן.
              </p>
              <p className="text-blue-700 text-sm mt-1">
                המערכת מקשרת לספקים עם הסכמים מיוחדים שנוצרו כחלק מהכוח הקבוצתי שלנו.
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Button */}
        <Card className="card-horizon mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-horizon-text mb-2">ניתוח ספקים קיימים</h3>
                <p className="text-horizon-accent">השווה מחירים עבור המוצרים שהעלית למערכת</p>
              </div>
              <Button 
                onClick={analyzeSuppliers}
                disabled={isAnalyzing || products.length === 0}
                className="btn-horizon-primary"
              >
                {isAnalyzing ? "מנתח..." : "התחל ניתוח"}
              </Button>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-horizon">
              <div>
                <h3 className="text-lg font-semibold text-horizon-text mb-2">גלה הזדמנויות חדשות</h3>
                <p className="text-horizon-accent">קבל הצעות לספקים חדשים וספקי שירות (כמו רו"ח, שיווק דיגיטלי, בתי דפוס)</p>
              </div>
              <Button 
                onClick={discoverNewSuppliers}
                disabled={isAnalyzing}
                className="btn-horizon-secondary"
              >
                {isAnalyzing ? "מגלה..." : "גלה ספקים חדשים"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* הוספה: רשימת ספקים מעודכנת עם כפתורי פעולה */}
        <Card className="card-horizon mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-horizon-text">
              רשימת ספקים מומלצים ({suppliers.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddSupplierModal(true)}
                className="btn-horizon-primary"
                size="sm"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף ספק
              </Button>
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 ml-2" />
                רענן
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-horizon-primary" />
                <p className="text-horizon-accent">טוען ספקים...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
                <h3 className="text-lg font-medium text-horizon-text mb-2">אין ספקים</h3>
                <p className="text-horizon-accent mb-4">התחל על ידי הוספת ספק חדש</p>
                <Button onClick={() => setShowAddSupplierModal(true)} className="btn-horizon-primary">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף ספק ראשון
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="bg-horizon-card/30 rounded-lg p-4 border border-horizon">
                    <div className="flex items-start justify-between">
                      <div className="text-right flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-horizon-text">{supplier.name}</h3>
                          <Badge className="bg-blue-100 text-blue-800">
                            {supplier.category}
                          </Badge>
                          {supplier.is_active === false && (
                            <Badge className="bg-red-100 text-red-800">
                              לא פעיל
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-horizon-accent space-y-1">
                          <p><strong>איש קשר:</strong> {supplier.contact_person || 'לא צוין'}</p>
                          <p><strong>טלפון:</strong> {supplier.phone || 'לא צוין'}</p>
                          {supplier.email && <p><strong>אימייל:</strong> {supplier.email}</p>}
                          {supplier.delivery_time && <p><strong>זמן אספקה:</strong> {supplier.delivery_time}</p>}
                          {supplier.payment_terms && <p><strong>תנאי תשלום:</strong> {supplier.payment_terms}</p>}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (supplier.rating || 5)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-horizon-accent mr-1">
                            ({supplier.rating || 5})
                          </span>
                        </div>
                        
                        <Button
                          onClick={() => handleRequestQuote(supplier)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={supplier.is_active === false}
                        >
                          <Send className="w-4 h-4 ml-2" />
                          בקש הצעת מחיר
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList className="bg-horizon-card">
            <TabsTrigger value="quotes" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
              הצעות מחיר ({quotes.length})
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
              תוצאות ניתוח ({analysisResults.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotes">
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text">הצעות מחיר מספקים</CardTitle>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <div className="text-center py-8 text-horizon-accent">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>אין הצעות מחיר זמינות. בצע ניתוח ספקים כדי לקבל הצעות.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-horizon-text">ספק</TableHead>
                          <TableHead className="text-horizon-text">מוצר</TableHead>
                          <TableHead className="text-horizon-text">מחיר ליחידה</TableHead>
                          <TableHead className="text-horizon-text">חיסכון</TableHead>
                          <TableHead className="text-horizon-text">סטטוס</TableHead>
                          <TableHead className="text-horizon-text">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotes.map((quote) => {
                          // Calculate unit savings and total savings for display
                          const currentProduct = products.find(p => p.name === quote.product_name);
                          const productCostPrice = currentProduct ? (parseFloat(currentProduct.cost_price) || 0) : 0;
                          const quoteUnitPrice = parseFloat(quote.unit_price) || 0;
                          const unitSavings = productCostPrice - quoteUnitPrice;
                          const totalSavings = quote.savings_potential || 0;
                          
                          return (
                            <TableRow key={quote.id}>
                              <TableCell className="font-medium text-horizon-text">{quote.supplier_name}</TableCell>
                              <TableCell className="text-horizon-text">{quote.product_name}</TableCell>
                              <TableCell className="text-horizon-text">₪{quote.unit_price?.toLocaleString()}</TableCell>
                              <TableCell>
                                {unitSavings > 0 ? (
                                  <div className="text-sm">
                                    <Badge className="bg-green-500 text-white mb-1">
                                      ₪{unitSavings.toFixed(2)} ליחידה
                                    </Badge>
                                    <div className="text-green-400 font-medium">
                                      (סה"כ ₪{totalSavings.toLocaleString()})
                                    </div>
                                  </div>
                                ) : (
                                  <Badge className="bg-gray-500 text-white">ללא חיסכון</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={quote.status === 'accepted' ? 'default' : 'outline'} className={
                                  quote.status === 'accepted' ? 'bg-green-600 text-white' :
                                  quote.status === 'rejected' ? 'bg-red-600 text-white' :
                                  'bg-yellow-600 text-white'
                                }>
                                  {quote.status === 'pending' ? 'ממתין לאישור' : 
                                   quote.status === 'accepted' ? 'אושר להחלפה' : 
                                   quote.status === 'rejected' ? 'נדחה' : quote.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {quote.status === 'pending' && (
                                    <>
                                      <Button size="sm" onClick={() => handleQuoteAction(quote.id, 'accepted')} className="bg-green-600 hover:bg-green-700 text-white">
                                        אשר החלפה
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => handleQuoteAction(quote.id, 'rejected')} className="border-red-500 text-red-500 hover:bg-red-50">
                                        לא מעוניין
                                      </Button>
                                    </>
                                  )}
                                  {quote.status === 'accepted' && (
                                    <span className="text-sm text-green-600 font-medium">✓ הועבר לטיפול</span>
                                  )}
                                  {quote.status === 'rejected' && (
                                    <span className="text-sm text-gray-500">נדחה</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="space-y-6">
              {analysisResults.length === 0 ? (
                <Card className="card-horizon">
                  <CardContent className="p-8 text-center">
                    <Search className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
                    <h3 className="text-lg font-semibold text-horizon-text mb-2">אין תוצאות ניתוח</h3>
                    <p className="text-horizon-accent">בצע ניתוח ספקים כדי לראות תוצאות מפורטות.</p>
                  </CardContent>
                </Card>
              ) : (
                analysisResults.map((result, index) => (
                  <Card key={index} className="card-horizon">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">{result.product.name}</CardTitle>
                      <p className="text-horizon-accent">ספק נוכחי: {result.product.supplier || 'לא צוין'}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.current_analysis && (
                          <div className="bg-horizon-card p-4 rounded-lg">
                            <h4 className="font-semibold text-horizon-text mb-2">ניתוח ספק נוכחי:</h4>
                            <p className="text-horizon-accent text-sm">{result.current_analysis.recommendations}</p>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-semibold text-horizon-text mb-3">ספקים אלטרנטיביים:</h4>
                          <div className="grid gap-3">
                            {result.alternatives.map((supplier, idx) => (
                              <div key={idx} className="border border-horizon rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-medium text-horizon-text">{supplier.name}</h5>
                                  <Badge className="bg-horizon-primary">
                                    מחיר: ₪{supplier.estimated_price?.toLocaleString()}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-horizon-accent">
                                  <div>דירוג איכות: {supplier.quality_rating || 'לא צוין'}/5</div>
                                  <div>זמן אספקה: {supplier.delivery_time || 'לא צוין'}</div>
                                  <div>הזמנה מינימלית: {supplier.minimum_order?.toLocaleString() || 'לא צוין'}</div>
                                </div>
                                {supplier.advantages && (
                                  <p className="text-sm text-horizon-accent mt-2">{supplier.advantages}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        onSupplierAdded={handleSupplierAdded}
      />

      <SupplierQuoteRequestModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        supplier={selectedSupplierForQuote}
        onQuoteRequested={handleQuoteRequested}
      />
    </div>
  );
}
