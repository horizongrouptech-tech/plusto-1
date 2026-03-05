






/**
 * מנוע בינה מלאכותית מתקדם - עודכן לשימוש עם מנגנון התזמור החדש
 */

import { generateUnifiedRecommendations } from "./unifiedRecommendationOrchestrator";
import { Product, ProductCatalog, Recommendation, Supplier } from '@/api/entities';
import { openRouterAPI } from '@/api/integrations';

export const generateBusinessIntelligence = async (customer, options = {}, progressCallback = null) => {
    if (!customer) {
        console.error("No customer provided");
        return { error: "לא סופק לקוח", success: false };
    }

    console.log(`Starting business intelligence for: ${customer.business_name || customer.full_name}`);
    console.log("Redirecting to unified recommendation orchestrator...");

    try {
        if (progressCallback) progressCallback(1, 2, "שלב 1: ניתוח נתונים והכנת אסטרטגיה...");
        
        const result = await generateUnifiedRecommendations(customer, options);
        
        if (progressCallback) progressCallback(2, 2, "הושלם בהצלחה!");

        return {
            success: result.success,
            recommendations: result.recommendations || [],
            customerData: result.customerData || {},
            marketInsights: result.marketInsights || {},
            strategy: result.strategy,
            dataQuality: result.dataQuality
        };

    } catch (error) {
        console.error("Error in generateBusinessIntelligence:", error);
        return {
            error: error.message || "שגיאה כללית ביצירת תוכן חכם",
            success: false
        };
    }
};

const gatherCustomerData = async (customer) => {
    try {
        const [products, suppliers, catalogProducts, websiteData] = await Promise.all([
            Product.filter({ created_by: customer.email }),
            Supplier.filter({ created_by: customer.email }),
            ProductCatalog.filter({ created_by: customer.email, is_active: true }), // שילוב קטלוג
            customer.website_url ? analyzeWebsite(customer.website_url) : Promise.resolve(null)
        ]);

        const customerWithWebsiteData = { ...customer, website_analysis: websiteData };

        // שילוב נתונים מהקטלוג החדש
        const enrichedProducts = [...products];
        
        for (const catalogProduct of catalogProducts) {
            const existingProduct = products.find(p => 
                p.name === catalogProduct.product_name || 
                p.product_code === catalogProduct.barcode
            );
            
            if (!existingProduct) {
                enrichedProducts.push({
                    name: catalogProduct.product_name,
                    product_code: catalogProduct.barcode,
                    cost_price: catalogProduct.cost_price,
                    selling_price: catalogProduct.selling_price,
                    category: catalogProduct.category,
                    supplier: catalogProduct.supplier,
                    margin_percentage: catalogProduct.profit_percentage,
                    monthly_revenue: 0,
                    monthly_profit: catalogProduct.gross_profit || 0,
                    data_source: 'catalog'
                });
            }
        }

        return {
            customer: customerWithWebsiteData,
            products: enrichedProducts,
            catalogProducts,
            suppliers,
            totalProducts: enrichedProducts.length,
            totalCatalogProducts: catalogProducts.length,
            totalSuppliers: suppliers.length,
            averageMargin: enrichedProducts.length > 0 ? 
                enrichedProducts.reduce((sum, p) => sum + (p.margin_percentage || 0), 0) / enrichedProducts.length : 0,
            catalogAverageMargin: catalogProducts.length > 0 ? 
                catalogProducts.reduce((sum, p) => sum + (p.profit_percentage || 0), 0) / catalogProducts.length : 0,
            totalMonthlyRevenue: enrichedProducts.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0)
        };
    } catch (error) {
        console.error("Error gathering customer data:", error);
        return { 
            customer: { ...customer, website_analysis: null }, 
            products: [], 
            catalogProducts: [],
            suppliers: [] 
        };
    }
};

const analyzeWebsite = async (websiteUrl) => {
    try {
        const response = await openRouterAPI({
            prompt: `Analyze the website ${websiteUrl}. Extract key information about products, services, pricing, target audience, and overall business strategy. Provide a concise summary.`,
            add_context_from_internet: true
        });
        return typeof response === 'string' ? { summary: response } : response;
    } catch (error) {
        console.error("Error analyzing website:", error);
        return { summary: "ניתוח האתר נכשל. ממשיך עם נתונים אחרים." };
    }
};

const conductMarketAnalysis = async (customerData) => {
    const { customer } = customerData;
    try {
        const marketPrompt = `Provide a concise market analysis for a business named "${customer.business_name}" in the "${customer.business_type}" sector. Include: market size, main competitors, market trends, and key opportunities.`;
        const marketResponse = await openRouterAPI({
            prompt: marketPrompt,
            add_context_from_internet: true,
        });
        return typeof marketResponse === 'string' ? { summary: marketResponse } : marketResponse;
    } catch (error) {
        console.error("Error in market analysis:", error);
        return { summary: "ניתוח שוק חיצוני נכשל. ההמלצות יתבססו על נתוני הלקוח בלבד." };
    }
};

// מאגר משפטי סיום מגוונים, מחולקים לפי קטגוריה
const closingLineVariations = {
  pricing: [
    "בוא נניע את המלאי הזה ונהפוך אותו למזומן במהירות.",
    "זה המהלך שיפנה לנו מקום במדף ויכניס כסף לקופה.",
    "בוא נתמחר נכון, נמכור מהר יותר ונשפר את התזרים באופן מיידי."
  ],
  promotions: [
    "בוא נייצר תנועה בחנות, נפנה את המלאי ונכניס מוצרים חדשים ורווחיים יותר.",
    "זה המהלך שייצר באזז, יכניס תזרים ויפנה את המלאי לטובת הסחורה הבאה.",
    "בוא נשתמש במבצע חכם כדי להפוך מלאי שעומד לכסף נזיל."
  ],
  bundles: [
    "בוא ניצור ללקוחות שלנו הצעה שאי אפשר לסרב לה ונגדיל את סל הקנייה.",
    "זה הזמן להציע פתרון שלם ללקוח ולשפר את הרווחיות על הדרך.",
    "בוא נהפוך שני מוצרים להצעה אחת מנצחת שתגדיל מכירות ותזרים."
  ],
  suppliers: [
    "זה המהלך שישפר את תנאי הסחר שלנו ויגדיל את הרווח בכל מכירה עתידית.",
    "בוא נבטיח לעצמנו מחירים טובים יותר ונחזק את בסיס העסק לשנים קדימה.",
    "בוא ננהל משא ומתן חכם שיגדיל את שולי הרווח שלנו וישפר את התחרותיות."
  ],
  default: [
    "בוא נפנה את המלאי הזה, נייצר תזרים ונכניס מוצרים שמוכרים מהר יותר.",
    "זה הזמן להפוך מלאי תקוע למזומנים ולהתקדם למוצרים הרווחיים הבאים.",
    "בוא ננקוט בפעולה, נשפר את התזרים ונתן לעסק דחיפה קדימה."
  ]
};

// פונקציה מעודכנת ליצירת המלצות משולבות
const generateEnhancedRecommendations = async (customerData, marketInsights, count) => {
    const { customer, products, suppliers } = customerData;
    const monthlyRevenue = customer.monthly_revenue || 1;

    // זיהוי טריגרים למהלכים אסטרטגיים
    const strategicTriggers = identifyStrategicTriggers(customerData);
    
    const recommendationPrompt = `
      בהתבסס על הנתונים הבאים של העסק "${customer.business_name}", צור ${count} המלצות מותאמות אישית.

      **פרופיל העסק:**
      - סוג עסק: ${customer.business_type || 'לא צוין'}
      - מחזור חודשי: ₪${(customer.monthly_revenue || 0).toLocaleString()}
      - יעדים עסקיים: ${customer.business_goals || 'הגדלת רווחיות וצמיחה'}
      - מוצרים: ${products.length > 0 ? `${products.length} מוצרים` : "לא הוזנו מוצרים"}
      - ספקים: ${suppliers.length > 0 ? `${suppliers.length} ספקים רשומים` : "לא הוזנו ספקים"}
      - תובנות שוק: ${marketInsights?.summary || "לא זמין"}

      **טריגרים זוהו למהלכים אסטרטגיים:**
      ${strategicTriggers.length > 0 ? strategicTriggers.map(t => `- ${t.type} (${t.severity}): ${t.description}`).join('\n') : "לא זוהו טריגרים ספציפיים למהלכים אסטרטגיים, ההמלצות יתבססו על ניתוח כללי."}

      **הוראות יצירת המלצות:**
      1. צור ${count} המלצות מגוונות מהקטגוריות הבאות:
         - pricing: שינוי מחירים למוצרים קיימים
         - bundles: חבילות מוצרים משולבות (הנחיות מיוחדות למטה)
         - promotions: הנחות ומבצעים זמניים  
         - suppliers: החלפת ספקים או שיפור תנאים
         - strategic_moves: המלצות ארוכות טווח לשינוי חוקי המשחק
      
      **הנחיות מיוחדות לקטגוריית "bundles":**
      עבור המלצות בקטגוריית bundles, חובה לכלול:
      - שם/קונספט יצירתי ומושך לחבילה (bundle_name_concept)
      - מחיר מומלץ ספציפי לחבילה (recommended_bundle_price)
      - חישוב סה"כ מחיר הפריטים בנפרד (individual_items_total_price)
      - ניתוח מפורט של השפעת הרווח (profit_impact_details) הכולל:
        * אחוז רווח מהחבילה לעומת מכירת הפריטים בנפרד
        * עלייה צפויה בנפח מכירות
        * שיפור במהירות מחזור המלאי
      דוגמה: אם מוצר A עולה ₪15 ומוצר B עולה ₪25, החבילה תוצע ב-₪35 במקום ₪40 (הנחה של ₪5).

      2. עבור קטגוריית "strategic_moves":
         - יצור 3-5 המלצות מהסוג הזה, בהתבסס על הטריגרים שזוהו אם קיימים, או על פוטנציאל עסקי רחב.
         - בחר מבין הסוגים הבאים עבור השדה strategic_move_type: platform_independence, problem_to_asset, system_building, franchising, backdoor_entry
         - כל המלצה אסטרטגית חייבת לכלול ציר זמן של 3-6 חודשים (timeframe), יעדי ביניים חודשיים (monthly_targets), התחייבות נדרשת מהלקוח (required_commitment), ופוטנציאל החזר השקעה (roi_timeframe).
         - פוטנציאל רווח צפוי (expected_profit) גבוה במיוחד (פי 2-3 לפחות ממהלך רגיל).

      3. פורמט המלצה אסטרטגית:
         כותרת: מהלך אסטרטגי: [שם המהלך]
         תיאור: [הסבר המצב הנוכחי + המהלך המוצע + שלבי ביצוע + פוטנציאל רווח + התחייבות נדרשת]
         
      4. חלוקת המלצות מומלצת:
         - 40% המלצות טקטיות (pricing, bundles, promotions, suppliers)
         - 25% מהלכים אסטרטגיים  
         - 35% המלצות לפי נתוני הלקוח הספציפיים (יכולות להיות טקטיות או אסטרטגיות)

      5. כל התוכן חייב להיות בעברית בלבד ללא אימוג'י או סמלים
      6. הפלט חייב להיות JSON תקין ומדויק לפי הסכמה.
    `;

    try {
        const response = await openRouterAPI({
            prompt: recommendationPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string", enum: ["pricing", "bundles", "promotions", "suppliers", "strategic_moves"] },
                      expected_profit: { type: "number" },
                      action_steps: { type: "array", items: { type: "string" } },
                      strategic_move_type: { type: "string", enum: ["platform_independence", "problem_to_asset", "system_building", "franchising", "backdoor_entry"] },
                      timeframe: { type: "string" },
                      monthly_targets: { 
                          type: "array", 
                          items: { 
                              type: "object", 
                              properties: { 
                                  month: { type: "number" }, 
                                  target: { type: "string" } 
                              },
                              required: ["month", "target"]
                          } 
                      },
                      required_commitment: { type: "string" },
                      roi_timeframe: { type: "string" },
                      bundle_name_concept: { type: "string" },
                      recommended_bundle_price: { type: "number" },
                      individual_items_total_price: { type: "number" },
                      profit_impact_details: {
                        type: "object",
                        properties: {
                          bundle_margin_percentage: { type: "number" },
                          individual_items_margin_percentage: { type: "number" },
                          margin_improvement: { type: "number" },
                          expected_volume_increase: { type: "number" },
                          inventory_turnover_improvement: { type: "string" }
                        }
                      }
                    },
                    required: ["title", "description", "category", "expected_profit", "action_steps"]
                  }
                }
              }
            }
        });

        if (!response?.recommendations) {
          throw new Error("תגובה לא תקינה מהמנוע החכם להמלצות");
        }

        const priorityDistribution = { high: 0.2, medium: 0.6, low: 0.2 };
        const savedRecs = await Promise.all(response.recommendations.map(async (rec, index) => {
            let priority = 'medium';
            if (index < count * priorityDistribution.high) priority = 'high';
            else if (index >= count * (1 - priorityDistribution.low)) priority = 'low';

            const recommendationData = {
                ...rec,
                customer_email: customer.email,
                status: 'pending',
                priority: priority,
                profit_percentage: Math.round((rec.expected_profit / monthlyRevenue) * 100),
                delivery_status: 'not_sent',
                implementation_effort: rec.category === 'strategic_moves' ? 'high' : 'medium',
                related_data: {
                    current_profit: monthlyRevenue * 0.15, 
                    business_revenue: customer.monthly_revenue,
                    calculation_base: "מבוסס על ניתוח AI של נתוני העסק"
                }
            };
            return Recommendation.create(recommendationData);
        }));
        return savedRecs;
    } catch (error) {
        console.error("שגיאה ביצירת המלצות משולבות:", error);
        return [];
    }
};

// זיהוי טריגרים למהלכים אסטרטגיים
const identifyStrategicTriggers = (customerData) => {
    const { customer, products } = customerData;
    const triggers = [];

    // תלות בפלטפורמות (לדוגמה, פלטפורמת מסחר אלקטרוני ספציפית)
    if (customer.website_platform && ['shopify', 'woocommerce', 'wolt', 'e-commerce'].includes(customer.website_platform.toLowerCase())) {
        triggers.push({
            type: 'platform_independence',
            description: `תלות בפלטפורמת ${customer.website_platform} מגבילה גמישות ורווחיות.`,
            severity: 'high'
        });
    }

    // תקיעות בצמיחה (עסק קטן שתלוי בבעלים/כוח אדם מצומצם)
    if (customer.monthly_revenue && customer.monthly_revenue < 50000 && products.length > 0) {
        triggers.push({
            type: 'system_building',
            description: 'העסק תלוי בבעלים לצורך תפעול יומיומי וחסר מערכות מובנות לצמיחה.',
            severity: 'medium'
        });
    }

    // פוטנציאל התרחבות (מודל עסקי מוכח עם יכולת שכפול)
    if (customer.monthly_revenue && customer.monthly_revenue >= 50000 && customer.monthly_revenue < 500000 && products.length > 5) {
        triggers.push({
            type: 'franchising',
            description: 'מודל עסקי מוכח עם פוטנציאל התרחבות באמצעות זיכיונות או שכפול סניפים.',
            severity: 'medium'
        });
    }

    // בעיות עלויות / מלאי / נכסים לא מנוצלים
    if (products.length > 50 && customerData.averageMargin < 0.15) { 
        triggers.push({
            type: 'problem_to_asset',
            description: 'מלאי גדול ולא מנוצל או בעל רווחיות נמוכה שיכול להפוך למקור רווח.',
            severity: 'low' 
        });
    }
    
    // דוגמה: טריגר כניסה דרך דלת אחורית (נישה ייחודית, תחרות גבוהה)
    if (customer.business_type === 'מסעדה' && customerData.suppliers.length > 10) { 
        triggers.push({
            type: 'backdoor_entry',
            description: 'הזדמנות כניסה לשוק תחרותי דרך נישה ייחודית או שיתוף פעולה אסטרטגי.',
            severity: 'medium'
        });
    }

    return triggers;
};

export default generateBusinessIntelligence;
