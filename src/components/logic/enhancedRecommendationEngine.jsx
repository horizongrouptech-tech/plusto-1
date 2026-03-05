
// Integrated from the 'Core' package





import { generateUnifiedRecommendations } from "./unifiedRecommendationOrchestrator";
import { BusinessForecast, FileUpload, Product, ProductCatalog, Supplier } from '@/api/entities';

/**
 * סכימות JSON לשימוש עם openRouterAPI
 */

// סכימת JSON מפורטת עבור עסקים עם נתונים פנימיים (הסכימה הקיימת)
const DETAILED_RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "כותרת קצרה וקליטה להמלצה" },
          category: {
            type: "string",
            enum: ["pricing", "promotions", "bundles", "suppliers", "inventory", "operations", "strategic_moves"],
            description: "הקטגוריה הראשית של ההמלצה"
          },
          inventory_sell_value: { type: "number", description: "שווי המלאי הרלוונטי במחירי מכירה" },
          inventory_cost_value: { type: "number", description: "שווי המלאי הרלוונטי במחירי עלות" },
          product_context: { type: "string", description: "שם המוצר הספציפי או קבוצת המוצרים הרלוונטית מהקטלוג" },
          action_description: { type: "string", description: "תיאור קצר של הפעולה המוצעת" },
          sell_through_days: { type: "number", description: "מספר הימים הצפוי למכירת המלאי" },
          expected_profit_percentage: { type: "number", description: "אחוז הרווח הצפוי מהפעולה" },
          observation: { type: "string", description: "תצפית או נתון מעניין שהוביל להמלצה" },
          suggestion_1: { type: "string", description: "הצעה קונקרטית ראשונה לביצוע" },
          suggestion_2: { type: "string", description: "הצעה קונקרטית שנייה לביצוע" },
          basis_for_recommendation: { type: "string", description: "הסבר קצר על בסיס אילו נתונים ההמלצה נוצרה" },
          action_steps: {
            type: "array",
            items: { type: "string" },
            description: "תוכנית פעולה מפורטת בת 4-5 שלבים קונקרטיים וכרונולוגיים ליישום ההמלצה"
          },
          bundle_name_concept: { type: "string", description: "שם/קונספט יצירתי לחבילה (עבור קטגוריית bundles)" },
          recommended_bundle_price: { type: "number", description: "מחיר מומלץ לחבילה (עבור קטגוריית bundles)" },
          individual_items_total_price: { type: "number", description: "סה\"כ מחיר הפריטים בנפרד (עבור קטגוריית bundles)" },
          profit_impact_details: {
            type: "object",
            properties: {
              bundle_margin_percentage: { type: "number", description: "אחוז רווח מהחבילה" },
              individual_items_margin_percentage: { type: "number", description: "אחוז רווח ממכירת הפריטים בנפרד" },
              margin_improvement: { type: "number", description: "שיפור באחוז הרווח" },
              expected_volume_increase: { type: "number", description: "עלייה צפויה בנפח מכירות (באחוזים)" },
              inventory_turnover_improvement: { type: "string", description: "שיפור במהירות מחזור המלאי" }
            },
            required: ["bundle_margin_percentage", "individual_items_margin_percentage", "margin_improvement", "expected_volume_increase", "inventory_turnover_improvement"],
            description: "פרטים כמותיים על השפעת הרווח (עבור קטגוריית bundles)"
          }
        },
        required: [
          "title", "category", "inventory_sell_value", "inventory_cost_value", "product_context", 
          "action_description", "sell_through_days", "expected_profit_percentage", "observation", 
          "suggestion_1", "suggestion_2", "basis_for_recommendation", "action_steps", 
          "bundle_name_concept", "recommended_bundle_price", "individual_items_total_price", "profit_impact_details"
        ]
      }
    }
  },
  required: ["recommendations"]
};

// סכימת JSON מפושטת עבור עסקים ללא נתונים פנימיים
const SIMPLIFIED_RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "כותרת קצרה וקליטה להמלצה" },
          category: {
            type: "string",
            enum: ["pricing", "promotions", "bundles", "suppliers", "inventory", "operations", "strategic_moves"],
            description: "הקטגוריה הראשית של ההמלצה"
          },
          product_context: { 
            type: ["string", "null"], 
            description: "שם המוצר או השירות הרלוונטי, או null אם ההמלצה כללית" 
          },
          action_description: { type: "string", description: "תיאור קצר של הפעולה המוצעת" },
          expected_profit: { type: "number", description: "רווח צפוי בשקלים מהמלצה זו" },
          expected_profit_percentage: { type: "number", description: "אחוז הרווח הצפוי מהפעולה" },
          observation: { type: "string", description: "תצפית או נתון מעניין שהוביל להמלצה" },
          suggestion_1: { type: "string", description: "הצעה קונקרטית ראשונה לביצוע" },
          suggestion_2: { type: "string", description: "הצעה קונקרטית שנייה לביצוע" },
          basis_for_recommendation: { type: "string", description: "הסבר קצר על בסיס אילו נתונים ההמלצה נוצרה" },
          action_steps: {
            type: "array",
            items: { type: "string" },
            description: "תוכנית פעולה מפורטת בת 4-5 שלבים קונקרטיים וכרונולוגיים ליישום ההמלצה"
          },
          bundle_name_concept: { 
            type: ["string", "null"], 
            description: "שם/קונספט יצירתי לחבילה (עבור קטגוריית bundles), או null אם לא רלוונטי" 
          },
          recommended_bundle_price: { 
            type: ["number", "null"], 
            description: "מחיר מומלץ לחבילה (עבור קטגוריית bundles), או null אם לא ניתן לחשב" 
          },
          individual_items_total_price: { 
            type: ["number", "null"], 
            description: "סה\"כ מחיר הפריטים בנפרד (עבור קטגוריית bundles), או null אם לא ידוע" 
          }
        },
        required: [
          "title", "category", "action_description", "expected_profit", "expected_profit_percentage", 
          "observation", "suggestion_1", "suggestion_2", "basis_for_recommendation", "action_steps"
        ]
      }
    }
  },
  required: ["recommendations"]
};

/**
 * מנוע ההמלצות המשודרג - אחראי על איסוף נתונים והכנת פרומפט
 * פונקציה ראשית שמתזמרת את כל שלבי האיסוף והכנה ואז קוראת לתזמורת
 */
export const generateEnhancedRecommendations = async (customer, options = {}) => {
  const {
    generateRecs = true,
    recommendationsCount = 8,
    focusCategories = [],
    onProgress,
  } = options;

  let progress = 0;
  const updateProgress = (newProgress, status) => {
    progress = newProgress;
    if (onProgress) {
      onProgress(progress, status);
    }
  };

  try {
    updateProgress(10, "מנתח נתוני לקוח קיימים...");
    const businessData = await collectBusinessData(customer);
    
    updateProgress(20, "מעריך איכות נתונים...");
    const dataQualityAssessment = assessDataQuality(businessData, customer);
    
    updateProgress(25, "מנתח מצב מלאי...");
    const hasSufficientInternalData = businessData.hasProductCatalog || businessData.fileAnalysis.hasSignificantData;
    const inventoryAnalysis = hasSufficientInternalData ? analyzeInventoryProblems(businessData) : {};
    
    updateProgress(35, `מכין ${hasSufficientInternalData ? 'ניתוח נתונים מעמיק' : 'סקר שוק מבוסס AI'}...`);
    
    // בחירת הסכימה המתאימה
    const selectedSchema = hasSufficientInternalData ? DETAILED_RECOMMENDATION_SCHEMA : SIMPLIFIED_RECOMMENDATION_SCHEMA;
    
    const prompt = buildEnhancedPrompt(
      customer,
      businessData,
      inventoryAnalysis,
      focusCategories.length > 0 ? focusCategories : ['pricing', 'promotions', 'bundles', 'suppliers', 'inventory', 'operations', 'strategic_moves'],
      hasSufficientInternalData
    );

    if (!generateRecs) {
      return { success: true, prompt: prompt, businessData, dataQualityAssessment };
    }
    
    updateProgress(50, "פונה למנוע ה-AI ליצירת המלצות...");

    // קריאה לתזמורת עם כל הנתונים המוכנים
    const result = await generateUnifiedRecommendations(
      customer,
      prompt,
      businessData,
      dataQualityAssessment,
      options,
      hasSufficientInternalData,
      selectedSchema // הוספת הסכימה כפרמטר חדש
    );
    
    updateProgress(100, "התהליך הושלם בהצלחה!");
    return result;

  } catch (error) {
    console.error("Error in enhanced recommendation engine:", error);
    throw error;
  }
};

/**
 * איסוף כל הנתונים העסקיים הרלוונטיים - כולל קבצים שהועלו
 */
export const collectBusinessData = async (customer) => {
  try {
    // נתוני מוצרים מהקטלוג
    const catalogProducts = await ProductCatalog.filter({
      customer_email: customer.email,
      is_active: true
    });

    // הטמעת תחזית עסקית
    let latestForecast = null;
    let hasForecast = false;
    try {
        const forecasts = await BusinessForecast.filter({ customer_email: customer.email }, "-created_date", 1);
        latestForecast = forecasts.length > 0 ? forecasts[0] : null;
        hasForecast = !!latestForecast;
    } catch (e) {
        console.warn("Error fetching business forecast, treating as missing:", e.message);
    }

    // נתוני מוצרים ישנים (אם קיימים)
    let legacyProducts = [];
    try {
      legacyProducts = await Product.filter({ created_by: customer.email });
    } catch (e) {
      console.log("No legacy products found");
    }

    // איסוף קבצים שהועלו ונותחו
    let uploadedFiles = [];
    let hasUploadedFiles = false;
    try {
      uploadedFiles = await FileUpload.filter({
        customer_email: customer.email
      }, "-created_date");
      hasUploadedFiles = uploadedFiles.length > 0;
    } catch (e) {
      console.error("Error fetching uploaded files:", e);
    }

    // איסוף נתוני ספקים אם קיימים
    let suppliers = [];
    let partnerSuppliers = []; // Added partner suppliers
    let hasSuppliers = false;
    try {
      const allSuppliers = await Supplier.filter({ is_active: true }); // Fetch all active suppliers
      suppliers = allSuppliers; // Assign all active suppliers to 'suppliers'
      partnerSuppliers = allSuppliers.filter(s => s.is_partner_supplier); // Filter for partner suppliers
      hasSuppliers = suppliers.length > 0;
    } catch (e) {
      console.log("No suppliers found");
    }

    // איחוד נתוני המוצרים
    const allProducts = [...catalogProducts, ...legacyProducts.map(p => ({
      product_name: p.name,
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      category: p.category,
      supplier: p.supplier,
      monthly_sales: p.monthly_sales || 0,
      inventory: p.inventory || 0,
      gross_profit: p.selling_price - p.cost_price,
      profit_percentage: p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.cost_price) * 100 : 0
    }))];

    // סינון מוצרים עם נתונים חסרים
    const validProducts = allProducts.filter(p =>
      p.product_name &&
      p.cost_price > 0 &&
      p.selling_price > 0
    );

    const missingDataProducts = allProducts.filter(p =>
      !p.product_name ||
      !p.cost_price ||
      !p.selling_price
    );

    // ניתוח הקבצים שהועלו
    const fileAnalysis = analyzeUploadedFiles(uploadedFiles);

    // חישוב מדדי איכות
    const qualityScore = validProducts.length > 0 ?
      Math.round((validProducts.length / allProducts.length) * 100) : 0;

    const dataPoints = validProducts.length + fileAnalysis.totalDataPoints;

    return {
      hasValidData: validProducts.length >= 3 || fileAnalysis.hasSignificantData,
      products: validProducts,
      missingDataProducts,
      totalProducts: allProducts.length,
      validProductsCount: validProducts.length,
      qualityScore,
      suppliers,
      partnerSuppliers, // Added partner suppliers
      uploadedFiles,
      fileAnalysis,
      dataPoints,
      customerProfile: {
        business_name: customer.business_name,
        business_type: customer.business_type,
        monthly_revenue: customer.monthly_revenue || 0,
        main_products: customer.main_products || '',
        target_customers: customer.target_customers || '',
        business_goals: customer.business_goals || ''
      },
      latestForecast: latestForecast,
      hasForecast: hasForecast,
      hasUploadedFiles: hasUploadedFiles,
      hasSuppliers: hasSuppliers,
      hasProductCatalog: catalogProducts.length > 0
    };

  } catch (error) {
    console.error("Error collecting business data:", error);
    return {
      hasValidData: false,
      products: [],
      missingDataProducts: [],
      totalProducts: 0,
      validProductsCount: 0,
      qualityScore: 0,
      suppliers: [],
      partnerSuppliers: [], // Initialize partnerSuppliers
      uploadedFiles: [],
      fileAnalysis: { hasSignificantData: false, totalDataPoints: 0, totalFiles: 0, fileTypes: {}, hasFinancialData: false, hasSalesData: false, hasInventoryData: false, hasPromotionsData: false, recentFiles: [], insights: [] },
      dataPoints: 0,
      customerProfile: {},
      latestForecast: null,
      hasForecast: false,
      hasUploadedFiles: false,
      hasSuppliers: false,
      hasProductCatalog: false
    };
  }
};

/**
 * פונקציה חדשה: ניתוח הקבצים שהועלו
 */
export const analyzeUploadedFiles = (files) => {
  const analysis = {
    totalFiles: files.length,
    fileTypes: {},
    hasFinancialData: false,
    hasSalesData: false,
    hasInventoryData: false,
    hasPromotionsData: false,
    totalDataPoints: 0,
    hasSignificantData: false,
    recentFiles: [],
    insights: []
  };

  if (files.length === 0) {
    return analysis;
  }

  files.forEach(file => {
    // ספירת סוגי קבצים
    const category = file.data_category || 'unknown';
    analysis.fileTypes[category] = (analysis.fileTypes[category] || 0) + 1;

    // זיהוי סוגי נתונים זמינים
    switch (category) {
      case 'profit_loss':
      case 'balance_sheet':
        analysis.hasFinancialData = true;
        analysis.totalDataPoints += 10;
        break;
      case 'sales_report':
        analysis.hasSalesData = true;
        analysis.totalDataPoints += (file.products_count || 0) * 0.1;
        break;
      case 'inventory_report':
        analysis.hasInventoryData = true;
        analysis.totalDataPoints += (file.products_count || 0) * 0.05;
        break;
      case 'promotions_report':
        analysis.hasPromotionsData = true;
        analysis.totalDataPoints += (file.products_count || 0) * 0.2;
        break;
    }

    // קבצים מהשלושה חודשים האחרונים
    const fileDate = new Date(file.created_date);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    if (fileDate > threeMonthsAgo) {
      analysis.recentFiles.push({
        filename: file.filename,
        category: category,
        upload_date: file.created_date,
        products_count: file.products_count || 0
      });
    }
  });

  // קביעה האם יש נתונים משמעותיים
  analysis.hasSignificantData =
    analysis.hasFinancialData ||
    analysis.hasSalesData ||
    (analysis.totalDataPoints > 5);

  // יצירת תובנות
  if (analysis.hasFinancialData) {
    analysis.insights.push("קיימים דוחות כספיים מעודכנים");
  }
  if (analysis.hasSalesData) {
    analysis.insights.push("קיימים נתוני מכירות מפורטים");
  }
  if (analysis.hasPromotionsData) {
    analysis.insights.push("קיימים נתוני מבצעים והנחות");
  }
  if (analysis.recentFiles.length > 0) {
    analysis.insights.push(`${analysis.recentFiles.length} קבצים הועלו ב-3 החודשים האחרונים`);
  }

  return analysis;
};

/**
 * ניתוח מלאי כדי לזהות בעיות ופוטנציאל
 */
export const analyzeInventoryProblems = (businessData) => {
  const { products } = businessData;

  if (products.length === 0) {
    return {
      hasProblems: false,
      issues: [],
      problematicProducts: [],
      totalInventoryValue: 0,
      slowMovingValue: 0,
      lowProfitValue: 0,
      healthyProducts: [],
      lowProfitProducts: [],
      stagnantProducts: [],
      overstockedProducts: [],
      bundleOpportunities: []
    };
  }

  const issues = [];
  let totalInventoryValue = 0;
  let lowProfitValue = 0;
  let slowMovingValue = 0;

  const lowProfitProducts = [];
  const stagnantProducts = [];
  const overstockedProducts = [];
  const bundleOpportunities = [];

  const problematicProducts = products.map(product => {
    const inventoryValue = (product.cost_price || 0) * (product.inventory || 0);
    const monthlyTurnover = (product.monthly_sales || 0);
    const profitMargin = product.profit_percentage || 0;

    totalInventoryValue += inventoryValue;

    let problems = [];

    // זיהוי מוצרים עם תנועה איטית
    if (monthlyTurnover < 2 && inventoryValue > 1000) {
      problems.push('תנועה איטית');
      slowMovingValue += inventoryValue;
      if (monthlyTurnover === 0 && product.inventory > 0) {
        stagnantProducts.push(product);
      }
    }

    // זיהוי מוצרים עם רווחיות נמוכה
    if (profitMargin < 15 && inventoryValue > 500) {
      problems.push('רווחיות נמוכה');
      lowProfitValue += inventoryValue;
      lowProfitProducts.push(product);
    }

    // זיהוי מוצרים עם מחיר גבוה מדי
    if (monthlyTurnover === 0 && product.selling_price > product.cost_price * 2) {
      problems.push('מחיר גבוה מדי');
    }

    // זיהוי מוצרים עם מלאי עודף
    if (product.inventory > 0) {
      if (monthlyTurnover > 0 && product.inventory > (monthlyTurnover * 6)) {
        problems.push('מלאי עודף');
        overstockedProducts.push(product);
      } else if (monthlyTurnover === 0 && product.inventory > 50 && inventoryValue > 1000) {
        problems.push('מלאי עודף משמעותי');
        overstockedProducts.push(product);
      }
    }

    return {
      ...product,
      inventoryValue,
      monthlyTurnover,
      problems,
      isProblematic: problems.length > 0
    };
  });

  // סיכום בעיות
  if (slowMovingValue > businessData.customerProfile.monthly_revenue * 0.3) {
    issues.push(`מלאי תקוע בשווי ₪${Math.round(slowMovingValue).toLocaleString()} (${Math.round((slowMovingValue/totalInventoryValue)*100)}% מהמלאי)`);
  }

  if (lowProfitValue > businessData.customerProfile.monthly_revenue * 0.2) {
    issues.push(`מוצרים בעלי רווחיות נמוכה בשווי ₪${Math.round(lowProfitValue).toLocaleString()}`);
  }

  const healthyProducts = problematicProducts.filter(p => !p.isProblematic);

  // פוטנציאל לבאנדלים
  if (stagnantProducts.length > 0 && healthyProducts.length > 0) {
    for (let i = 0; i < Math.min(3, stagnantProducts.length, healthyProducts.length); i++) {
      bundleOpportunities.push({
        stagnant: stagnantProducts[i],
        profitable: healthyProducts[i]
      });
    }
  }

  return {
    hasProblems: issues.length > 0 || lowProfitProducts.length > 0 || stagnantProducts.length > 0 || overstockedProducts.length > 0,
    issues,
    problematicProducts: problematicProducts.filter(p => p.isProblematic),
    totalInventoryValue: Math.round(totalInventoryValue),
    slowMovingValue: Math.round(slowMovingValue),
    lowProfitValue: Math.round(lowProfitValue),
    healthyProducts: healthyProducts,
    lowProfitProducts,
    stagnantProducts,
    overstockedProducts,
    bundleOpportunities
  };
};

/**
 * מאגר דוגמאות ספציפיות לסוגי עסקים שונים
 */
const BUSINESS_TYPE_EXAMPLES = {
  restaurant: {
    tactical_moves: [
      '"קנה 2 מנות שווארמה, קבל צ\'יפס בחינם" - מבצע קלאסי להגדלת כמות',
      '"דיל עסקי: פיתה, צ\'יפס ושתיה ב-₪59" - חבילה משתלמת לעובדים',
      '"הזמן 5 מנות, קבל אחת בחינם" - עידוד הזמנות קבוצתיות',
      '"שעות שמחות: 20% הנחה על כל התפריט בין 14:00-16:00"'
    ],
    strategic_moves: [
      'יצירת "חווית טחינה" - בר טחינות מותאם אישית עם תוספות יוקרתיות',
      'הרחבת התפריט לארוחות בוקר עם מנות ביתיות מזרח-תיכוניות',
      'פיתוח קו מוצרי בית (טחינה, חרדל, סלטים) למכירה',
      'יצירת מנויי "ארוחות קבועות" לעובדי משרדים באזור'
    ]
  },
  retail: {
    tactical_moves: [
      '"מבצע סופ"ש: 3 חטיפים ב-₪10" - מבצע כמותי קלאסי',
      '"חבילת בוקר: קפה ומאפה ב-₪15" - באנדל נוח',
      '"קנה 2 משקאות, קבל שלישי בחצי מחיר"',
      '"כל יום שני - 15% הנחה על מוצרי היגיינה"'
    ],
    strategic_moves: [
      'הוספת מכונת ברד וגלידות בקיץ כנקודת רווח נוספת',
      'יצירת שירות משלוחים מהיר לאזור (תוך 30 דקות)',
      'פיתוח קוף חדש למוצרי נוחות (סנדוויצ\'ים, סלטים)',
      'שיתוף פעולה עם עסקים מקומיים לחבילות משולבות'
    ]
  },
  wholesale: {
    tactical_moves: [
      '"הזמנה מעל ₪5,000 - משלוח חינם ו-3% הנחה נוספת"',
      '"תשלום מיידי - 2% הנחה על כל ההזמנה"',
      '"רכישת 10 יחידות - מחיר של 9"',
      '"לקוחות VIP: תנאי תשלום 60 יום במקום 30"'
    ],
    strategic_moves: [
      'פיתוח פלטפורמה דיגיטלית להזמנות ומעקב משלוחים',
      'יצירת שירות ייעוץ מקצועי לקמעונאים חדשים',
      'הרחבה לקטגוריות מוצרים חדשות על בסיס ביקוש הלקוחות',
      'יצירת תוכנית שותפויות עם יצרנים מקומיים'
    ]
  },
  services: {
    tactical_moves: [
      '"חבילת שירותים: 3 טיפולים במחיר של 2"',
      '"מבצע חורף: 25% הנחה על שירותי תחזוקה"',
      '"הפניית חבר - קבל ₪100 זיכוי לשירות הבא"',
      '"מנוי שנתי: 15% הנחה + עדיפות בתורים"'
    ],
    strategic_moves: [
      'פיתוח שירותים דיגיטליים למעקב מרחוק',
      'יצירת מנוי שירות חודשי עם ערך מוסף',
      'הרחבת השירות לשעות לא שגרתיות (ערבים, סופ"ש)',
      'פיתוח תוכנית הכשרה ללקוחות לתחזוקה עצמית'
    ]
  },
  tech: {
    tactical_moves: [
      '"שדרוג חינם לחודש הראשון עם כל מנוי שנתי"',
      '"הבאת 3 חברים - קבל חודש חינם"',
      '"מבצע סטודנטים: 50% הנחה עם תעודת סטודנט"',
      '"מעבר מהתחרות - זיכוי מלא לחודש הראשון"'
    ],
    strategic_moves: [
      'פיתוח API פתוח ליצירת אקוסיסטם של פתרונות',
      'יצירת תוכנית שותפויות עם חברות טכנולוגיה משלימות',
      'הרחבה לשווקים בינלאומיים דרך מנוי דיגיטלי',
      'פיתוח כלים לאוטומציה שיחסכו זמן ללקוחות'
    ]
  },
  fashion: {
    tactical_moves: [
      '"קנה 2 פריטים, קבל שלישי ב-50% הנחה"',
      '"מבצע עונתי: עד 40% הנחה על קולקציית החורף"',
      '"הצטרפות למועדון לקוחות - 10% הנחה מיידית"',
      '"החלפה חינם תוך 30 יום + משלוח חזרה בחינם"'
    ],
    strategic_moves: [
      'יצירת קו פרטי (private label) עם הדפסה מותאמת אישית',
      'פיתוח שירות סטיילינג אישי מרחוק',
      'יצירת מנוי חודשי לפריטי אופנה (subscription box)',
      'הרחבה לאקססוריז ופריטי יוקרה משלימים'
    ]
  }
};

/**
 * מחזיר דוגמאות ספציפיות לסוג העסק
 */
const getBusinessSpecificExamples = (businessType) => {
  const examples = BUSINESS_TYPE_EXAMPLES[businessType] || {
    tactical_moves: [],
    strategic_moves: []
  };
  
  return {
    tactical: examples.tactical_moves || [],
    strategic: examples.strategic_moves || []
  };
};

/**
 * בונה את הפרומפט המורכב למנוע ה-LLM עם הנחיות מחמירות יותר - כולל נתוני קבצים ודוגמאות ספציפיות לענף
 */
export const buildEnhancedPrompt = (customer, businessData, inventoryAnalysis, focusCategories, hasSufficientInternalData) => {
  const customerName = customer.full_name || customer.business_name;
  const businessType = customer.business_type || 'other';
  const formatMultilineText = (text) => {
    if (!text || text.trim() === '') return 'לא צוינו פרטים';
    return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // קבלת דוגמאות ספציפיות לסוג העסק
  const businessExamples = getBusinessSpecificExamples(businessType);
  
  let business_specific_examples = '';
  if (businessExamples.tactical.length > 0 || businessExamples.strategic.length > 0) {
    business_specific_examples = `
      **דוגמאות מותאמות לעסק מסוג ${businessType}:**
      
      ${businessExamples.tactical.length > 0 ? `
      **מהלכים טקטיים מומלצים:**
      ${businessExamples.tactical.map(example => `- ${example}`).join('\n')}
      ` : ''}
      
      ${businessExamples.strategic.length > 0 ? `
      **מהלכים אסטרטגיים מומלצים:**
      ${businessExamples.strategic.map(example => `- ${example}`).join('\n')}
      ` : ''}
      
      **השתמש בדוגמאות אלו כהשראה, אך התאם אותן לנתונים הספציפיים של הלקוח.**
    `;
  }

  if (hasSufficientInternalData) {
    // הנתיב הקיים: פרומפט עשיר בנתונים עם דוגמאות ספציפיות לענף
    
    // דגימה חכמה של מוצרים
    let productsToSample = businessData.products;
    const MAX_PRODUCTS_FOR_PROMPT = 20;

    let selectedProductsForPrompt = [];

    // אסטרטגיית דגימה
    if (inventoryAnalysis.lowProfitProducts && inventoryAnalysis.lowProfitProducts.length > 0) {
        selectedProductsForPrompt.push(...inventoryAnalysis.lowProfitProducts.slice(0, 3));
    }
    if (inventoryAnalysis.stagnantProducts && inventoryAnalysis.stagnantProducts.length > 0) {
        selectedProductsForPrompt.push(...inventoryAnalysis.stagnantProducts.slice(0, 3));
    }
    if (inventoryAnalysis.overstockedProducts && inventoryAnalysis.overstockedProducts.length > 0) {
        selectedProductsForPrompt.push(...inventoryAnalysis.overstockedProducts.slice(0, 3));
    }

    // הוסף מוצרים אקראיים
    const remainingSlots = MAX_PRODUCTS_FOR_PROMPT - selectedProductsForPrompt.length;
    if (remainingSlots > 0) {
        const otherProducts = productsToSample.filter(p => !selectedProductsForPrompt.find(sp => sp.id === p.id));
        const shuffledOtherProducts = otherProducts.sort(() => 0.5 - Math.random());
        selectedProductsForPrompt.push(...shuffledOtherProducts.slice(0, remainingSlots));
    }

    // וודא שאין כפילויות
    selectedProductsForPrompt = [...new Map(selectedProductsForPrompt.map(item => [item['id'], item])).values()];

    // רשימת מוצרים מפורטת
    const productsList = selectedProductsForPrompt.map(p =>
      `"${p.product_name}" (מחיר קנייה: ₪${p.cost_price}, מחיר מכירה: ₪${p.selling_price}, מלאי: ${p.inventory || 0}, מכירות חודשיות: ${p.monthly_sales || 0})`
    ).join('\n');

    // מידע על זמינות נתונים
    const dataAvailabilityReport = `
    **זמינות נתונים:**
    - קטלוג מוצרים: ${businessData.hasProductCatalog ? `כן (${businessData.products.length} מוצרים)` : 'לא'}
    - תחזית עסקית: ${businessData.hasForecast ? 'כן' : 'לא'}
    - קבצים שהועלו (נותחו): ${businessData.hasUploadedFiles ? `כן (${businessData.uploadedFiles.length} קבצים, תובנות: ${businessData.fileAnalysis.insights.join(', ') || 'אין'})` : 'לא'}
    - נתוני ספקים: ${businessData.hasSuppliers ? 'כן' : 'לא'}
    ${businessData.hasProductCatalog && businessData.products.length < 5 ? `- **אזהרה:** מספר המוצרים בקטלוג נמוך מ-5. ההמלצות עלולות להיות כלליות יותר.` : ''}
    ${!businessData.hasProductCatalog && !businessData.hasUploadedFiles ? `- **אזהרה חמורה:** אין נתוני מוצרים או קבצים שהועלו. ההמלצות יהיו כלליות מאוד ולא מבוססות נתונים ספציפיים.` : ''}
  `;

    // הוספה חדשה: סיכום הקבצים שהועלו
    const filesInsights = businessData.fileAnalysis && businessData.hasUploadedFiles ? `
    **תובנות מקבצים שהועלו:**
    - סה"כ קבצים: ${businessData.fileAnalysis.totalFiles}
    - תובנות כלליות מהקבצים: ${businessData.fileAnalysis.insights.join(', ') || 'אין תובנות ספציפיות'}
    ${businessData.fileAnalysis.hasFinancialData ? `- יש נתונים כספיים מעודכנים (רווח/הפסד, מאזן, בנק).` : ''}
    ${businessData.fileAnalysis.hasSalesData ? `- יש נתוני מכירות מפורטים.` : ''}
    ${businessData.fileAnalysis.hasInventoryData ? `- יש נתוני מלאי מפורטים.` : ''}
    ${businessData.fileAnalysis.hasPromotionsData ? `- יש נתוני מבצעים והנחות.` : ''}
    ${businessData.fileAnalysis.recentFiles.length > 0 ? `- ${businessData.fileAnalysis.recentFiles.length} קבצים הועלו ב-3 החודשים האחרונים.` : ''}
  ` : '\n**לא הועלו קבצים משמעותיים למערכת.**\n';

    const forecastInfo = businessData.latestForecast && businessData.hasForecast ? `
    **תחזית עסקית אחרונה:**
    - תאריך תחזית: ${new Date(businessData.latestForecast.forecast_date).toLocaleDateString('he-IL')}
    - מכירות צפויות לחודש הבא: ₪${(businessData.latestForecast.expected_monthly_sales || 0).toLocaleString()}
    - מוצרים במגמת עלייה: ${businessData.latestForecast.trending_up_products ? businessData.latestForecast.trending_up_products.map(p => p.product_name).join(', ') : 'אין'}
    - מוצרים במגמת ירידה: ${businessData.latestForecast.trending_down_products ? businessData.latestForecast.trending_down_products.map(p => p.product_name).join(', ') : 'אין'}
  ` : '\n**אין נתוני תחזית זמינים.**\n';

    const partnerSuppliersInfo = businessData.partnerSuppliers && businessData.partnerSuppliers.length > 0 ? `
    **ספקי שותפים מומלצים (יש לתת להם עדיפות בהמלצות על ספקים):**
    ${businessData.partnerSuppliers.map(s => `- ${s.name} (קטגוריה: ${s.category})`).join('\n')}
    ` : '\n**אין ספקי שותפים מוגדרים במערכת.**\n';

    return `
    אתה יועץ עסקי בכיר המתמחה בעסקים בישראל. משימתך היא לייצר המלצות עסקיות מעשיות עבור ${customerName}, עסק מסוג ${businessType}.

    ${business_specific_examples}

    **הנחיות קריטיות לייצור המלצות (עבור כל המלצה בסט):**
    1.  **ייחודיות מוצר/קטגוריה:** אסור בשום אופן להמליץ על אותו מוצר פעמיים באותה קטגוריה בסט המלצות זה.
    2.  **התבססות על נתונים:** כל המלצה חייבת להתבסס על הנתונים המסופקים לך.
    3.  **עדיפות לספקי שותפים:** בהמלצות מקטגוריית "suppliers", יש לתת עדיפות מוחלטת לספקים המסומנים כ"ספקי שותפים". אם אין ספק שותף רלוונטי, רק אז ניתן להמליץ על ספק אחר.
    4.  **הסבר ל-LLM:** מלא את השדה "basis_for_recommendation" עם הסבר קצר בעברית על בסיס אילו נתונים ההמלצה נוצרה.
    5.  **שילוב דוגמאות הענף:** השתמש בדוגמאות הספציפיות לענף כהשראה, אך התאם אותן לנתונים הספציפיים של הלקוח.

    **הנחיות קריטיות לשמות מוצרים:**
    1. השתמש אך ורק בשמות המוצרים המדויקים מהרשימה למטה.
    2. אל תמציא שמות מוצרים או תשתמש בביטויים כלליים.
    3. בשדה product_context חובה לכתוב את השם המדויק של המוצר כפי שמופיע ברשימה.

    **הנחיות קריטיות לשפה ואיכות:**
    1. כתוב באופן בלעדי בעברית בלבד.
    2. הכותרת (title) חייבת להיות טקסט נקי בלבד, ללא אימוג'י, סמלים או תווים מיוחדים.
    3. ודא שכל משפט שלם, ברור ומובן.
    4. השתמש בשפה עסקית מקצועית אך פשוטה וברורה.

    **נתוני לקוח:**
    - שם העסק: ${customerName}
    - סוג העסק: ${businessType}
    - מחזור חודשי: ₪${businessData.customerProfile.monthly_revenue.toLocaleString()}
    - מוצרים עיקריים: ${businessData.customerProfile.main_products}
    - קהל יעד: ${businessData.customerProfile.target_customers}

    ${dataAvailabilityReport}

    ${forecastInfo}

    ${filesInsights}

    ${partnerSuppliersInfo}

    **ניתוח מלאי (התבסס על המוצרים האלה בלבד):**
    - מוצרים עם רווחיות נמוכה: ${inventoryAnalysis.lowProfitProducts ? inventoryAnalysis.lowProfitProducts.map(p => p.product_name).join(', ') : 'אין'}
    - מוצרים ללא תנועה: ${inventoryAnalysis.stagnantProducts ? inventoryAnalysis.stagnantProducts.map(p => p.product_name).join(', ') : 'אין'}
    - מלאי עודף: ${inventoryAnalysis.overstockedProducts ? inventoryAnalysis.overstockedProducts.map(p => `${p.product_name} (מלאי: ${p.inventory})`).join(', ') : 'אין'}

    **רשימת המוצרים בקטלוג (התייחס רק למוצרים אלה):**
    ${productsList}

    **הוראות מחמירות:**
    1. בשדה product_context - רשום את השם המדויק של המוצר מהרשימה לעיל.
    2. אל תכתוב ביטויים כלליים.
    3. אם אין מוצרים מתאימים ברשימה - אל תיצור המלצה.
    4. כל המלצה חייבת להתייחס למוצר ספציפי עם שם מדויק.
    5. השתמש בדוגמאות הענף כהשראה, אך התבסס על המוצרים הרלוונטיים בפועל.

    **הנחיות מחמירות לשלבי ביצוע:**
    1. כל שלב חייב להיות פעולה קונקרטית.
    2. השתמש בפעלי פעולה ברורים.
    3. כל שלב חייב להיות שלם ומדויק.
    4. השלבים חייבים להיות ברצף הגיוני.

    קטגוריות מותרות: ${focusCategories.join(', ')}.
    יש להפיק 8 המלצות מגוונות.

    החזר תשובה בפורמט JSON בלבד לפי הסכמה שסופקה.
  `;
  } else {
    // הנתיב החדש: פרומפט מבוסס סקר שוק עם דוגמאות ספציפיות לענף
    return `
      אתה יועץ עסקי וירטואוזי וחוקר שוק, המתמחה בעסקים קטנים ובינוניים בישראל.
      משימתך היא לייצר המלצות עסקיות מעשיות, מבוססות שוק, עבור ${customerName}, עסק מסוג ${businessType}.
      **שים לב: ללקוח אין כרגע נתונים פנימיים מפורטים. לכן, ההמלצות שלך חייבות להתבסס על הידע הרחב שלך, מגמות שוק, וניתוח תחרותי כללי לענף.**

      ${business_specific_examples}

      **הנחיות קריטיות:**
      1.  **המלצות מבוססות שוק:** המלצותיך יתבססו על שיטות עבודה מומלצות, מגמות שוק, ואתגרים נפוצים לעסקים מסוג ${businessType} בישראל.
      2.  **פעולות קונקרטיות:** הימנע מעצות כלליות.
      3.  **השתמש בדוגמאות והנחות סבירות:** עבור שמות מוצרים או מחירים, השתמש בדוגמאות הגיוניות לתחום, בהשראת הדוגמאות שסופקו.
      4.  **הצדקת ההמלצה:** בשדה "basis_for_recommendation" חובה לה explicó שההמלצה מבוססת על היגיון עסקי ומגמות שוק לענף ${businessType}.
      5.  **שילוב דוגמאות הענף:** השתמש בדוגמאות הספציפיות לענף כבסיס לההמלצות, אך התאם אותן לקונטקסט הספציפי של הלקוח.
      6.  **השתמש ב-null לשדות לא רלוונטיים:** כאשר שדה אינו רלוונטי לעסק ללא נתוני מוצרים מפורטים, השתמש ב-null. למשל, product_context יכול להיות null אם ההמלצה כללית לעסק.
      **הנחיה מיוחדת לתוכן ההמלצה:**
      כאשר אינך מזהה מוצר ספציפי (product_context הוא null או מתייחס לקונספט כללי), הימנע מלכלול בתיאור ההמלצה (action_description) פרטים כגון עלות, מחיר מכירה או אחוזי רווח הקשורים למוצר. השאר אותם מחוץ לתיאור. התמקד בערך הכללי של ההמלצה.
      **הקשר עסקי:**
      - שם העסק: ${customerName}
      - סוג העסק: ${businessType}
      - יעדים עסקיים מוצהרים: ${formatMultilineText(businessData.customerProfile.business_goals)}
      - קהל יעד: ${formatMultilineText(businessData.customerProfile.target_customers)}

      **סטטוס זמינות נתונים:**
      - **חשוב ביותר:** נתונים פנימיים אינם זמינים כרגע. יש לבסס את הניתוח על ידע חיצוני וסקר שוק.

      **המשימה שלך:**
      יש לייצר 8 המלצות מגוונות מהקטגוריות הבאות: ${focusCategories.join(', ')}.
      השתמש בדוגמאות הענף כהשראה ובסיס לההמלצות המעשיות.

      החזר תשובה בפורמט JSON בלבד לפי הסכמה שסופקה.
    `;
  }
};

/**
 * הערכת איכות נתונים מקיפה
 */
export const assessDataQuality = (businessData, customer) => {
  const { products, customerProfile } = businessData;

  const missingDataPoints = [];
  const dataSources = [];
  let totalScore = 0;
  let maxScore = 0;

  // בדיקת איכות נתוני לקוח בסיסיים (20 נקודות)
  maxScore += 20;
  if (customerProfile.business_name && customerProfile.business_type) {
    totalScore += 10;
    dataSources.push("פרטי עסק בסיסיים");
  } else {
    missingDataPoints.push("חסרים פרטי עסק בסיסיים");
  }

  if (customerProfile.monthly_revenue && customerProfile.monthly_revenue > 0) {
    totalScore += 5;
    dataSources.push("מחזור חודשי");
  } else {
    missingDataPoints.push("חסר מחזור חודשי מוגדר");
  }

  if (customerProfile.business_goals || customerProfile.target_customers) {
    totalScore += 5;
    dataSources.push("יעדים עסקיים");
  } else {
    missingDataPoints.push("חסרים יעדים עסקיים");
  }

  // בדיקת איכות נתוני מוצרים (50 נקודות)
  maxScore += 50;
  const productsWithCompleteData = products.filter(p =>
    p.product_name &&
    p.cost_price > 0 &&
    p.selling_price > 0 &&
    p.category
  );

  if (products.length === 0) {
    missingDataPoints.push("לא הוזנו מוצרים כלל במערכת");
  } else {
    const completeDataRatio = productsWithCompleteData.length / products.length;
    totalScore += Math.round(completeDataRatio * 30);

    if (completeDataRatio >= 0.8) {
      dataSources.push("נתוני מוצרים מלאים");
    } else if (completeDataRatio >= 0.5) {
      dataSources.push("נתוני מוצרים חלקיים");
      missingDataPoints.push(`ל-${Math.round((1-completeDataRatio)*100)}% מהמוצרים חסרים נתונים בסיסיים`);
    } else {
      missingDataPoints.push(`ל-${Math.round((1-completeDataRatio)*100)}% מהמוצרים חסרים נתונים בסיסיים`);
    }

    const productsWithInventory = products.filter(p => p.inventory && p.inventory > 0);
    const productsWithSales = products.filter(p => p.monthly_sales && p.monthly_sales > 0);

    if (productsWithInventory.length > products.length * 0.5) {
      totalScore += 10;
      dataSources.push("נתוני מלאי");
    } else {
      missingDataPoints.push("חסרים נתוני מלאי עדכניים");
    }

    if (productsWithSales.length > products.length * 0.3) {
      totalScore += 10;
      dataSources.push("נתוני מכירות");
    } else {
      missingDataPoints.push("חסרים נתוני מכירות חודשיות");
    }
  }

  // בדיקת מקורות נתונים נוספים (30 נקודות)
  maxScore += 30;

  const productsWithSuppliers = products.filter(p => p.supplier && p.supplier.trim() !== '');
  if (productsWithSuppliers.length > products.length * 0.5) {
    totalScore += 10;
    dataSources.push("נתוני ספקים");
  } else {
    missingDataPoints.push("חסרים נתוני ספקים");
  }

  if (customer.website_url) {
    totalScore += 10;
    dataSources.push("כתובת אתר לניתוח");
  } else {
    missingDataPoints.push("לא הוגדר אתר עסק");
  }

  if (products.length >= 20) {
    totalScore += 10;
  } else if (products.length >= 10) {
    totalScore += 5;
  } else if (products.length < 5) {
    missingDataPoints.push("מספר מוצרים נמוך מדי");
  }

  // הוספת ניקוד איכות מבוסס קבצים שהועלו
  if (businessData.fileAnalysis && businessData.fileAnalysis.hasSignificantData) {
    if (businessData.fileAnalysis.hasFinancialData) {
      totalScore += 5;
      dataSources.push("קבצים שהועלו (כספיים)");
    }
    if (businessData.fileAnalysis.hasSalesData) {
      totalScore += 5;
      dataSources.push("קבצים שהועלו (מכירות)");
    }
    if (businessData.fileAnalysis.hasInventoryData) {
      totalScore += 5;
      dataSources.push("קבצים שהועלו (מלאי)");
    }
    if (businessData.fileAnalysis.recentFiles.length > 0) {
      totalScore += 5;
      dataSources.push("קבצים שהועלו (עדכניים)");
    }
    maxScore += 20;
  } else {
    missingDataPoints.push("לא קיימים קבצים שהועלו");
  }

  const completenessPercentage = Math.round((totalScore / maxScore) * 100);

  let completenessStatus;
  if (completenessPercentage >= 80) {
    completenessStatus = 'complete';
  } else if (completenessPercentage >= 50) {
    completenessStatus = 'partial';
  } else {
    completenessStatus = 'incomplete';
  }

  return {
    completenessPercentage,
    completenessStatus,
    dataSources: [...new Set(dataSources)],
    missingDataPoints,
    totalScore,
    maxScore
  };
};

/**
 * מאגר משפטי סיום מגוונים
 */
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

/**
 * מאגר פורמטי המלצות מגוונים - 25 נוסחים שונים
 */
const recommendationFormats = {
  // גישה אישית וחמה - 5 נוסחים
  personal_warm: {
    name: "אישי וחם",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
היי ${customerName},
אני רואה שיש לך ${productName} במלאי שלך. המחירים שלך נראים טובים - עלות של ${costPrice} ש"ח ומכירה ב-${sellPrice} ש"ח${profitPercentage > 0 ? `, שנותן לך רווח יפה של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול להיות מהלך משנה משחק!`
  },

  personal_friendly: {
    name: "אישי וידידותי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
שלום ${customerName},
איך העסקים הולכים? 

שמתי לב שיש לך ${productName} במלאי. המחירים שלך הגיוניים - ${costPrice} ש"ח עלות ו-${sellPrice} ש"ח מכירה${profitPercentage > 0 ? `, עם רווח של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול להביא לך תוצאות מדהימות!`
  },

  personal_casual: {
    name: "אישי ונינוח",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
היי ${customerName},
איך הולך?

נתקלתי ב${productName} שלך במלאי - נראה מעניין! עלית עליו ${costPrice} ש"ח ומוכר ב-${sellPrice} ש"ח${profitPercentage > 0 ? `, לא רע בכלל עם ${profitPercentage}% רווח` : ''}.

${actionDescription}

${observation}

זה יכול להיות הצעד הנכון!`
  },

  personal_encouraging: {
    name: "אישי מעודד",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
היי ${customerName}!
אני רואה שאתה עושה עבודה טובה עם ה${productName} שלך.

המחירים שלך הגיוניים - ${costPrice} ש"ח עלות ו-${sellPrice} ש"ח מכירה${profitPercentage > 0 ? `, עם רווח יפה של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

אתה בדרך הנכונה!`
  },

  personal_supportive: {
    name: "אישי תומך",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
שלום ${customerName},
אני כאן כדי לתמוך בעסק שלך!

ראיתי את ה${productName} במלאי שלך - נראה שיש לך כיוון טוב. ${costPrice} ש"ח עלות ו-${sellPrice} ש"ח מכירה${profitPercentage > 0 ? `, עם ${profitPercentage}% רווח` : ''}.

${actionDescription}

${observation}

אני כאן אם תצטרך עזרה נוספת!`
  },

  // גישה מאורגנת ומבנית - 5 נוסחים
  organized_structured: {
    name: "מאורגן ומבני",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
שלום ${customerName},

ניתוח המוצר ${productName} מראה: עלות של ${costPrice} ש"ח ומכירה ב-${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווח של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

פעולה מאורגנת תניב תוצאות מדידות.`
  },

  organized_analytical: {
    name: "מאורגן אנליטי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, הניתוח של ה${productName} שלך מראה: עלות ${costPrice} ש"ח ומכירה ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

שיפור מדיד בביצועים צפוי.`
  },

  organized_systematic: {
    name: "מאורגן שיטתי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
שלום ${customerName},

המוצר ${productName} שלך מציג: עלות ${costPrice} ש"ח ומכירה ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווח של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

גישה שיטתית תבטיח תוצאות.`
  },

  organized_methodical: {
    name: "מאורגן מתודי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, הניתוח המתודי של ה${productName} מראה: עלות ${costPrice} ש"ח ומכירה ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

גישה מתודית תניב תוצאות מדידות.`
  },

  organized_planned: {
    name: "מאורגן מתוכנן",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
שלום ${customerName},

המוצר ${productName} שלך מציג: עלות ${costPrice} ש"ח ומכירה ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

תוכנית מסודרת תבטיח הצלחה.`
  },

  // גישה מקצועית ויועצת - 5 נוסחים
  consultant_professional: {
    name: "יועץ מקצועי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
שלום ${customerName},

בתור יועץ עסקי מקצועי, אני רואה הזדמנות משמעותית עם ה${productName} שלך. עלות של ${costPrice} ש"ח ומכירה ב-${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול להביא שיפור משמעותי בביצועים העסקיים.`
  },

  consultant_expert: {
    name: "יועץ מומחה",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, כמומחה בתחום,

המוצר ${productName} שלך מציג פוטנציאל עסקי משמעותי. עלות ${costPrice} ש"ח ומכירה ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול להביא שיפור מדיד ברווחיות.`
  },

  consultant_strategic: {
    name: "יועץ אסטרטגי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
שלום ${customerName},

מנקודת מבט אסטרטגית, ה${productName} שלך מהווה הזדמנות אסטרטגית. עלות של ${costPrice} ש"ח ומכירה ב-${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול לבנות לך עמדה תחרותית חזקה.`
  },

  consultant_analytical: {
    name: "יועץ אנליטי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, הניתוח המעמיק מראה:

ה${productName} שלך מציג: עלות ${costPrice} ש"ח ומכירה ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול להביא שיפור כמותי בביצועים.`
  },

  consultant_business: {
    name: "יועץ עסקי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
שלום ${customerName},

כיועץ עסקי, אני מזהה הזדמנות עסקית עם ה${productName} שלך. עלות של ${costPrice} ש"ח ומכירה ב-${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול להביא שיפור ברווחיות העסקית.`
  },

  // גישה של הזדמנות - 5 נוסחים
  opportunity_exciting: {
    name: "הזדמנות מרגשת",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}! יש לך הזדמנות מרגשת!

ה${productName} שלך הוא פשוט זהב! עלית עליו רק ${costPrice} ש"ח ומוכר ב-${sellPrice} ש"ח${profitPercentage > 0 ? ` - זה ${profitPercentage}% רווח!` : ''}

${actionDescription}

${observation}

זה יכול להיות מהלך משנה משחק!`
  },

  opportunity_potential: {
    name: "הזדמנות פוטנציאלית",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, זיהיתי פוטנציאל אדיר!

ה${productName} שלך הוא פשוט מכרה זהב! ${costPrice} ש"ח עלות ו-${sellPrice} ש"ח מכירה${profitPercentage > 0 ? ` = ${profitPercentage}% רווח!` : ''}

${actionDescription}

${observation}

זה יכול להיות מהפך של ממש!`
  },

  opportunity_growth: {
    name: "הזדמנות צמיחה",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, זו הזדמנות צמיחה!

ה${productName} שלך יכול להיות מנוע הצמיחה של העסק! עלות: ${costPrice} ש"ח, מכירה: ${sellPrice} ש"ח${profitPercentage > 0 ? `, רווח: ${profitPercentage}%!` : ''}

${actionDescription}

${observation}

זה יכול להכפיל את הרווחים!`
  },

  opportunity_breakthrough: {
    name: "הזדמנות פריצה",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}! זו הזדמנות הפריצה שלך!

ה${productName} יכול להיות הפריצה הגדולה שלך! ${costPrice} ש"ח עלות ו-${sellPrice} ש"ח מכירה${profitPercentage > 0 ? ` - ${profitPercentage}% רווח!` : ''}

${actionDescription}

${observation}

זה יכול להיות הפריצה שתשנה הכל!`
  },

  opportunity_advantage: {
    name: "הזדמנות יתרון",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, יש לך יתרון תחרותי!

ה${productName} שלך נותן לך יתרון על המתחרים! עלות: ${costPrice} ש"ח, מכירה: ${sellPrice} ש"ח${profitPercentage > 0 ? `, רווח: ${profitPercentage}%!` : ''}

${actionDescription}

${observation}

זה יכול לתת לך יתרון מכריע!`
  },

  // גישה אסטרטגית - 5 נוסחים
  strategic_visionary: {
    name: "אסטרטגי חזוני",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, בוא נחשוב בגדול!

ה${productName} שלך הוא חלק מהחזון הגדול שלך. עלות: ${costPrice} ש"ח ומכירה: ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול להיות הצעד הראשון לעבר החזון שלך!`
  },

  strategic_longterm: {
    name: "אסטרטגי לטווח ארוך",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, בוא נחשוב לטווח ארוך.

ה${productName} שלך הוא השקעה לטווח ארוך. עלות: ${costPrice} ש"ח ומכירה: ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול לבנות לך עתיד חזק!`
  },

  strategic_comprehensive: {
    name: "אסטרטגי מקיף",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, בוא נסתכל על התמונה המלאה.

ה${productName} הוא חלק מהאסטרטגיה המקיפה שלך. עלות: ${costPrice} ש"ח ומכירה: ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול לחזק את כל העסק שלך!`
  },

  strategic_innovative: {
    name: "אסטרטגי חדשני",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, בוא נחדש!

ה${productName} שלך יכול להיות החדשנות שלך. עלות: ${costPrice} ש"ח ומכירה: ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול לשים אותך בחזית החדשנות!`
  },

  strategic_competitive: {
    name: "אסטרטגי תחרותי",
    template: (customerName, productName, costPrice, sellPrice, profitPercentage, actionDescription, observation, suggestion1, suggestion2) => `
${customerName}, בוא נבנה יתרון תחרותי!

ה${productName} שלך יכול להיות הנשק התחרותי שלך. עלות: ${costPrice} ש"ח ומכירה: ${sellPrice} ש"ח${profitPercentage > 0 ? `, עם רווחיות של ${profitPercentage}%` : ''}.

${actionDescription}

${observation}

זה יכול לתת לך יתרון על המתחרים!`
  }
};

/**
 * עיבוד ההמלצות עם בדיקות איכות נוספות ופורמטים מגוונים
 */
export const processRecommendations = async (recommendations, customer, businessData, dataQualityAssessment) => {
  const processed = [];
  const customerName = customer.full_name || customer.business_name;
  const formatKeys = Object.keys(recommendationFormats);

  // סט למעקב אחר זוגות (מוצר, קטגוריה) - רק עבור המלצות מבוססות נתונים אמיתיים
  const recommendedProductCategoryPairs = new Set();

  // קביעה אם ההמלצות נוצרו במצב "מבוסס שוק" (ללקוחות ללא נתונים פנימיים משמעותיים)
  // hasValidData הוא הדגל שמסמן אם יש מספיק מוצרים או קבצים מנותחים
  const isMarketBasedGeneration = !businessData.hasValidData; 

  // פונקציה לקיצור שם מוצר
  const truncateProductName = (name) => {
    if (!name || typeof name !== 'string') return '';
    const words = name.split(' ');
    if (words.length > 2) {
      return words[0] + ' ' + words[1];
    }
    return name;
  };

  for (const rec of recommendations) {
    let relevantProduct = null;
    let truncatedProductName = rec.product_context; // Default to the raw product_context from LLM

    // אם זו לא המלצה מבוססת שוק, חפש מוצר רלוונטי בקטלוג הלקוח
    if (!isMarketBasedGeneration) {
      relevantProduct = businessData.products.find(p =>
        p.product_name && rec.product_context && (
          p.product_name.toLowerCase() === rec.product_context.toLowerCase() ||
          rec.product_context.toLowerCase().includes(p.product_name.toLowerCase()) ||
          (p.product_context && p.product_context.toLowerCase().includes(rec.product_context.toLowerCase()))
        )
      );

      // אם לא נמצא מוצר רלוונטי, צור מוצר ברירת מחדל או דלג על ההמלצה
      if (!relevantProduct && businessData.products.length > 0) {
        // במקרה של חוסר במידע, השתמש במוצר הראשון כברירת מחדל
        relevantProduct = businessData.products[0];
        console.warn('Using first product as fallback for recommendation:', rec.title, 'Product context:', rec.product_context);
      }
      
      // אם נמצא מוצר, עדכן את השם המקוצר וקבע את עלות/מכירה/מלאי ממנו
      if (relevantProduct) {
        truncatedProductName = truncateProductName(relevantProduct.product_name || 'מוצר לא ידוע');

        // אכיפת ייחודיות מוצר/קטגוריה רק עבור המלצות מבוססות נתונים
        const productCategoryPairKey = `${relevantProduct.product_name}_${rec.category}`;
        if (recommendedProductCategoryPairs.has(productCategoryPairKey)) {
            console.warn(`Skipping duplicate recommendation: Product "${relevantProduct.product_name}" already recommended in category "${rec.category}".`);
            continue;
        }
        recommendedProductCategoryPairs.add(productCategoryPairKey);
      }
    } else {
      // עבור המלצות מבוססות שוק, product_context יכול להיות קונספט כללי (או null)
      // אין צורך לאכוף ייחודיות ספציפית למוצר מהקטלוג או לחפש אותו
      console.log(`Processing market-based recommendation: "${rec.title}" (Product context: "${rec.product_context}")`);
    }

    // חישוב מחדש של נתונים פיננסיים - רק אם יש מוצר רלוונטי
    let cost = 0;
    let sell = 0;
    let inventory = 0;
    let calculatedProfit = rec.expected_profit || 0; // התחל עם הערך מה-LLM
    
    if (relevantProduct) { // Only if a real product from catalog was found
        cost = relevantProduct.cost_price || 0;
        sell = relevantProduct.selling_price || 0;
        inventory = relevantProduct.inventory || 0;
        
        // חשב רווח חדש על בסיס המוצר הרלוונטי
        if (cost > 0 && sell > cost) {
            calculatedProfit = sell - cost;
        }
    }

    // עדכן את ה-expected_profit בהמלצה עם הערך המחושב
    if (calculatedProfit > 0) {
        rec.expected_profit = calculatedProfit;
    }

    // בדיקות תקינות בסיסיות - העבר את הבדיקה לאחר חישוב הרווח
    if (!rec.product_context || rec.product_context.includes('undefined') || (rec.product_context.length < 3 && !isMarketBasedGeneration)) {
      if (!isMarketBasedGeneration) { // Only strict for data-based
        console.warn('Skipping recommendation due to invalid product context format (for data-based):', rec.product_context);
        continue;
      }
    }

    // ולידציה על expected_profit - רק אם יש relevantProduct (לקוחות עם נתונים)
    // עבור לקוחות ללא נתונים, אפשר המלצות גם עם רווח 0
    if (relevantProduct && (!rec.expected_profit || rec.expected_profit <= 0)) {
      console.warn(`Skipping recommendation for non-positive expected profit after calculation (for data-based):`, rec.title, 'Calculated profit:', calculatedProfit);
      continue;
    }
    
    // ולידציה על basis_for_recommendation
    if (!rec.basis_for_recommendation || rec.basis_for_recommendation.length < 10) {
        console.warn('Skipping recommendation with missing basis_for_recommendation:', rec.title);
        continue;
    }

    // בדיקת היגיון עבור המלצות בנדל/מבצעים - חיונית לכל סוגי ההמלצות
    // (אלא אם כן isMarketBasedGeneration, ואז אין relevantProduct)
    if (rec.category === 'bundles' || rec.category === 'promotions') {
      const bundleConcept = (rec.bundle_name_concept || rec.title || '').toLowerCase();
      
      if (relevantProduct) { // רק אם יש מוצר קטלוגי בפועל
        const actualProductName = (relevantProduct.product_name || '').toLowerCase(); 

        const healthKeywords = ['בריאות', 'בריא', 'דיאט', 'כושר', 'אורגני', 'טבעי', 'ויטמינים'];
        const junkKeywords = ['פרינגלס', 'ביסלי', 'במבה', 'חטיף', 'ממתק', 'שוקולד'];

        const isHealthConcept = healthKeywords.some(k => bundleConcept.includes(k));
        const containsJunkFood = junkKeywords.some(k => actualProductName.includes(k)); 

        if ((isHealthConcept && containsJunkFood) || (junkKeywords.some(k => bundleConcept.includes(k)) && healthKeywords.some(k => actualProductName.includes(k)))) {
          console.warn(`Skipping illogical recommendation (health/junk mismatch):`, rec.title, 'Product:', actualProductName, 'Concept:', bundleConcept);
          continue;
        }
      }
      
      // Validation for bundles only if numerical values are provided
      if (rec.category === 'bundles' && typeof rec.individual_items_total_price === 'number' && typeof rec.recommended_bundle_price === 'number' && rec.individual_items_total_price > 0) {
          const discountPercentage = (1 - (rec.recommended_bundle_price / rec.individual_items_total_price)) * 100;
          if (discountPercentage < 5 || discountPercentage > 50) { 
              console.warn(`Skipping illogical bundle recommendation (discount out of range):`, rec.title, 'Discount:', discountPercentage.toFixed(2), '%');
              continue;
          }
      }
    }

    // בדיקת שלבי ביצוע - עם fallback לשלבים גנריים אם חסרים
    let validActionSteps = [];
    
    if (rec.action_steps && Array.isArray(rec.action_steps)) {
      validActionSteps = rec.action_steps.filter(step =>
        step &&
        typeof step === 'string' &&
        step.trim().length > 10 &&
        step.trim().length < 200 &&
        !step.includes('undefined') &&
        !step.match(/[^א-ת\s\d\.,:;!?\-\(\)%₪"']/g) // Keep Hebrew, numbers, basic punctuation
      );
    }

    // אם אין מספיק שלבים תקינים, צור שלבים גנריים
    if (validActionSteps.length < 3) {
      console.warn('Generating fallback action steps for recommendation:', rec.title, 'Original steps count:', validActionSteps.length);
      
      const fallbackSteps = [];
      
      // שלב 1: הכנה
      if (rec.category === 'pricing') {
        fallbackSteps.push('בחן את המחירים הנוכחיים ואת עלויות הרכישה');
      } else if (rec.category === 'bundles') {
        fallbackSteps.push('זהה מוצרים משלימים שיכולים להיכלל בחבילה');
      } else if (rec.category === 'promotions') {
        fallbackSteps.push('תכנן את המבצע ואת התזמון המתאים');
      } else {
        fallbackSteps.push('נתח את המצב הנוכחי וזהה הזדמנויות');
      }
      
      // שלב 2: ביצוע
      if (rec.category === 'pricing') {
        fallbackSteps.push('עדכן את המחירים במערכת ובאתר');
      } else if (rec.category === 'bundles') {
        fallbackSteps.push('צור את החבילה במערכת עם מחיר אטרקטיבי');
      } else if (rec.category === 'promotions') {
        fallbackSteps.push('הפעל את המבצע ופרסם אותו ללקוחות');
      } else {
        fallbackSteps.push('יישם את השינויים הנדרשים במערכת');
      }
      
      // שלב 3: מעקב
      if (rec.category === 'pricing') {
        fallbackSteps.push('עקב אחר השפעת שינוי המחירים על המכירות');
      } else if (rec.category === 'bundles') {
        fallbackSteps.push('מדוד את ביצועי החבילה והתאם לפי הצורך');
      } else if (rec.category === 'promotions') {
        fallbackSteps.push('נתח את תוצאות המבצע וההשפעה על הרווחיות');
      } else {
        fallbackSteps.push('מדוד את התוצאות ובצע התאמות נוספות');
      }
      
      // הוסף שלבים מהמקור אם יש
      validActionSteps.forEach((step, index) => {
        if (index < fallbackSteps.length) {
          fallbackSteps[index] = step;
        } else {
          fallbackSteps.push(step);
        }
      });
      
      validActionSteps = fallbackSteps;
    }

    // וודא שיש לפחות 3 שלבים
    if (validActionSteps.length < 3) {
      console.warn('Still insufficient action steps after fallback generation:', rec.title);
      continue;
    }

    const inventory_sell_value = sell * inventory;
    const inventory_cost_value = cost * inventory;

    // בחירת פורמט תיאור אקראי
    const selectedFormat = recommendationFormats[formatKeys[Math.floor(Math.random() * formatKeys.length)]];

    let description;
    // אם אין מוצר רלוונטי, או שה-LLM החזיר null ב-product_context עבור המלצה שאינה מבוססת נתונים
    if (!relevantProduct && isMarketBasedGeneration && rec.product_context === null) {
        // השתמש בתבנית שאינה כוללת פרטי מוצר
        description = selectedFormat.template(
            customerName,
            "", // product name is empty
            0, // cost price
            0, // sell price
            0, // profit percentage
            rec.action_description || 'פעולה מומלצת',
            rec.observation || 'ניתוח מצביע על פוטנציאל שיפור',
            rec.suggestion_1 || 'לבחון את השוק',
            rec.suggestion_2 || 'להתאים את התמחור'
        ).replace(/0 ש"ח עלות ו-0 ש"ח מכירה/g, '').replace(/הnull יכול להיות הפריצה הגדולה שלך!/g, '').replace(/ה יכול להיות/g, 'זה יכול להיות').trim();
        // הוספתי .replace כדי להסיר מקרים שבהם הטקסט של ה-0 עדיין מופיע
        // זה יבטיח שהתיאור יהיה נקי מפרטי מוצר חסרי משמעות
    } else {
        // השתמש בתבנית הרגילה
        description = selectedFormat.template(
            customerName,
            truncatedProductName,
            cost,
            sell,
            Math.round(rec.expected_profit_percentage || 0),
            rec.action_description || 'פעולה מומלצת',
            rec.observation || 'ניתוח מצביע על פוטנציאל שיפור',
            rec.suggestion_1 || 'לבחון את השוק',
            rec.suggestion_2 || 'להתאים את התמחור'
        ).trim();
    }
    // Regular expression to match "עלות 0 ש"ח ומכירה 0 ש"ח" or similar variations,
    // including potential surrounding text like "המוצר X שלך מציג: " or "המחירים שלך נראים טובים - עלות X ומכירה Y"
    const zeroPricePattern = /(?:עלות\s*:\s*|עלית עליו\s*)(?:₪)?0\s*ש"ח\s*(?:ומכירה\s*:\s*|ומוכר ב-\s*)(?:₪)?0\s*ש"ח(?:,\s*עם\s*רווח\s*יפה\s*של\s*0%)?/g;

    // Apply the replacement to the description
    description = description.replace(zeroPricePattern, '').trim();

    // Clean up any double spaces that might result from the replacement
    description = description.replace(/\s\s+/g, ' ').trim();
    // ולידציה על אורך התיאור
    if (description.length < 50) {
      console.warn('Skipping recommendation due to too short description:', rec.title);
      continue;
    }

    // הרכבת ההמלצה המשופרת
    const enhancedRecommendation = {
      ...rec,
      description,
      action_steps: validActionSteps.slice(0, 5), // הגבל ל-5 שלבים מקסימום
      product_context: truncatedProductName,
      format_used: selectedFormat.name,
      // Only include inventory values if they are meaningful (i.e., product was found)
      ...(relevantProduct ? { inventory_sell_value: inventory_sell_value, inventory_cost_value: inventory_cost_value } : {}),
      basis_for_recommendation: rec.basis_for_recommendation,
      related_data: {
        ...(rec.related_data || {}),
        data_completeness_percentage: dataQualityAssessment.completenessPercentage,
        data_completeness_status: dataQualityAssessment.completenessStatus,
        data_sources_used: dataQualityAssessment.dataSources,
        missing_data_points: dataQualityAssessment.missingDataPoints,
        quality_assessment_date: new Date().toISOString(),
        is_market_based: isMarketBasedGeneration,
      }
    };

    processed.push(enhancedRecommendation);
  }
  return processed;
};
