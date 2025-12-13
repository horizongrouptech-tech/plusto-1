
import { InvokeLLM } from "@/integrations/Core";
import { StrategicMove } from "@/entities/StrategicMove";
import { Product } from "@/entities/Product";
import { ProductCatalog } from "@/entities/ProductCatalog";

/**
 * מנוע מהלכים אסטרטגיים - זיהוי הזדמנויות פריצת דרך
 */

export const generateStrategicMoves = async (customer, options = {}) => {
  const {
    movesCount = 3,
    analysisDepth = 'deep'
  } = options;

  try {
    console.log(`Starting strategic moves analysis for: ${customer.business_name || customer.full_name}`);
    
    // שלב 1: איסוף נתונים עסקיים מעמיקים
    const businessData = await collectBusinessData(customer);
    
    // שלב 2: זיהוי טריגרים אסטרטגיים
    const strategicTriggers = await identifyStrategicTriggers(businessData);
    
    if (strategicTriggers.length === 0) {
      return {
        success: true,
        moves: [],
        message: "לא זוהו הזדמנויות למהלכים אסטרטגיים כרגע. המערכת תמשיך לנטר ולהציע כשיזוהו הזדמנויות."
      };
    }

    // שלב 3: יצירת מהלכים מותאמים
    const strategicMoves = await createCustomStrategicMoves(customer, businessData, strategicTriggers, movesCount);
    
    // שלב 4: שמירה למסד הנתונים
    const savedMoves = [];
    for (const move of strategicMoves) {
      try {
        const savedMove = await StrategicMove.create({
          ...move,
          customer_email: customer.email,
          status: 'proposed'
        });
        savedMoves.push(savedMove);
      } catch (error) {
        console.error("Error saving strategic move:", error);
      }
    }

    return {
      success: true,
      moves: savedMoves,
      triggersIdentified: strategicTriggers,
      totalGenerated: savedMoves.length
    };

  } catch (error) {
    console.error("Error in strategic moves generation:", error);
    return {
      success: false,
      error: error.message,
      moves: []
    };
  }
};

const collectBusinessData = async (customer) => {
  try {
    // נתוני מוצרים מהקטלוג
    const catalogProducts = await ProductCatalog.filter({ 
      customer_email: customer.email, 
      is_active: true 
    });
    
    // נתוני מוצרים ישנים
    let legacyProducts = [];
    try {
      legacyProducts = await Product.filter({ created_by: customer.email });
    } catch (e) {
      console.log("No legacy products found");
    }

    const allProducts = [...catalogProducts, ...legacyProducts];
    
    // ניתוח דפוסי הכנסות
    const revenueAnalysis = analyzeRevenuePatterns(customer, allProducts);
    
    // ניתוח תלויות
    const dependencyAnalysis = analyzeDependencies(customer);
    
    // ניתוח עלויות חוזרות
    const costAnalysis = analyzeRecurringCosts(customer, allProducts);

    return {
      customer,
      products: allProducts,
      revenueAnalysis,
      dependencyAnalysis,
      costAnalysis,
      totalProducts: allProducts.length,
      monthlyRevenue: customer.monthly_revenue || 0,
      businessType: customer.business_type
    };

  } catch (error) {
    console.error("Error collecting business data:", error);
    return { customer, products: [], revenueAnalysis: {}, dependencyAnalysis: {}, costAnalysis: {} };
  }
};

const analyzeRevenuePatterns = (customer, products) => {
  const analysis = {
    platformDependency: false,
    platformName: null,
    platformFees: 0,
    directSalesPercentage: 100
  };

  // זיהוי תלות בפלטפורמות על בסיס נתונים
  if (customer.sales_channels) {
    const channels = customer.sales_channels.toLowerCase();
    if (channels.includes('wolt') || channels.includes('ולט')) {
      analysis.platformDependency = true;
      analysis.platformName = 'Wolt';
      analysis.platformFees = customer.monthly_revenue * 0.15; // 15% עמלה משוערת
      analysis.directSalesPercentage = 30;
    } else if (channels.includes('amazon') || channels.includes('אמזון')) {
      analysis.platformDependency = true;
      analysis.platformName = 'Amazon';
      analysis.platformFees = customer.monthly_revenue * 0.12;
      analysis.directSalesPercentage = 25;
    } else if (channels.includes('ebay')) {
      analysis.platformDependency = true;
      analysis.platformName = 'eBay';
      analysis.platformFees = customer.monthly_revenue * 0.10;
      analysis.directSalesPercentage = 40;
    }
  }

  return analysis;
};

const analyzeDependencies = (customer) => {
  const dependencies = {
    ownerDependency: false,
    platformDependency: false,
    supplierDependency: false,
    workingHoursPerWeek: 40
  };

  // זיהוי תלות בבעלים
  if (customer.company_size === '1-10' && customer.monthly_revenue > 50000) {
    dependencies.ownerDependency = true;
    dependencies.workingHoursPerWeek = 70; // משוער לעסק קטן מצליח
  }

  return dependencies;
};

const analyzeRecurringCosts = (customer, products) => {
  const costs = {
    wasteCosts: 0,
    inefficiencyCosts: 0,
    hasWasteProblem: false,
    wasteType: null
  };

  // זיהוי "בעיות" שעולות כסף
  if (customer.business_type === 'manufacturing' || customer.business_type === 'restaurant') {
    costs.hasWasteProblem = true;
    costs.wasteCosts = customer.monthly_revenue * 0.08; // 8% פסולת משוערת
    costs.wasteType = customer.business_type === 'restaurant' ? 'פסולת מזון' : 'פסולת ייצור';
  }

  return costs;
};

const identifyStrategicTriggers = async (businessData) => {
  const triggers = [];
  const { customer, revenueAnalysis, dependencyAnalysis, costAnalysis } = businessData;

  // טריגר 1: תלות בפלטפורמה
  if (revenueAnalysis.platformDependency && revenueAnalysis.platformFees > 5000) {
    triggers.push({
      type: 'platform_independence',
      severity: 'high',
      description: `תלות ב${revenueAnalysis.platformName} עם עמלות של ₪${revenueAnalysis.platformFees.toLocaleString()}/חודש`,
      potentialSavings: revenueAnalysis.platformFees * 0.6
    });
  }

  // טריגר 2: תלות בבעלים
  if (dependencyAnalysis.ownerDependency && dependencyAnalysis.workingHoursPerWeek > 60) {
    triggers.push({
      type: 'system_building',
      severity: 'high',
      description: `תלות מוחלטת בבעלים - ${dependencyAnalysis.workingHoursPerWeek} שעות/שבוע`,
      potentialValue: customer.monthly_revenue * 1.5 // פוטנציאל להתרחבות
    });
  }

  // טריגר 3: בעיות פסולת/עלויות
  if (costAnalysis.hasWasteProblem && costAnalysis.wasteCosts > 3000) {
    triggers.push({
      type: 'problem_to_asset',
      severity: 'medium',
      description: `${costAnalysis.wasteType} עולה ₪${costAnalysis.wasteCosts.toLocaleString()}/חודש`,
      potentialValue: costAnalysis.wasteCosts * 2 // הפיכה לרווח
    });
  }

  // טריגר 4: פוטנציאל זכיינות
  if (customer.monthly_revenue > 100000 && customer.business_type !== 'services') {
    triggers.push({
      type: 'franchising',
      severity: 'medium',
      description: `עסק מצליח עם פוטנציאל להתרחבות - מחזור של ₪${customer.monthly_revenue.toLocaleString()}`,
      potentialValue: customer.monthly_revenue * 3 // פוטנציאל זכיינות
    });
  }

  return triggers;
};

const createCustomStrategicMoves = async (customer, businessData, triggers, count) => {
  const moves = [];

  for (const trigger of triggers.slice(0, count)) {
    const movePrompt = buildMovePrompt(customer, businessData, trigger);
    
    try {
      const response = await InvokeLLM({
        prompt: movePrompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            situation_description: { type: "string" },
            move_name: { type: "string" },
            move_description: { type: "string" },
            financial_potential: { type: "number" },
            execution_timeframe: { type: "string" },
            execution_steps: { type: "array", items: { type: "string" } },
            expected_breakthrough: { type: "string" },
            competitive_advantage: { type: "string" },
            risk_level: { type: "string", enum: ["low", "medium", "high"] },
            innovation_score: { type: "number", minimum: 1, maximum: 10 }
          },
          required: ["title", "situation_description", "move_name", "move_description", "financial_potential", "execution_timeframe", "execution_steps"]
        }
      });

      if (response) {
        moves.push({
          ...response,
          move_type: trigger.type,
          trigger_conditions: [trigger.description]
        });
      }
    } catch (error) {
      console.error("Error creating strategic move:", error);
    }
  }

  return moves;
};

const buildMovePrompt = (customer, businessData, trigger) => {
  const customerName = customer.full_name || customer.business_name;
  
  return `
    🔥 אתה יועץ אסטרטגיה מוביל שמתמחה במהלכים פורצי דרך!

    **משימה**: צור מהלך אסטרטגי חדשני עבור ${customerName}

    **פרופיל העסק**:
    - סוג עסק: ${customer.business_type}
    - מחזור חודשי: ₪${businessData.monthlyRevenue.toLocaleString()}
    - עובדים: ${customer.company_size}
    - ערוצי מכירה: ${customer.sales_channels || 'לא צוין'}

    **הטריגר שזוהה**: ${trigger.description}

    **סוג המהלך**: ${trigger.type}

    **הנחיות קריטיות**:
    1. זה חייב להיות מהלך פורץ דרך - לא שיפור הדרגתי!
    2. המהלך צריך לשנות את חוקי המשחק, לא רק לשפר מדדים
    3. התמקד בפתרון יצירתי ולא צפוי
    4. הפוטנציאל הכספי חייב להיות משמעותי
    5. כל התוכן בעברית

    **פורמט התשובה**:
    - title: כותרת קליטה שמסבירה את המהלך
    - situation_description: תיאור המצב שזוהה ולמה זה מגביל
    - move_name: שם קליט למהלך (כמו "חזרה הביתה")
    - move_description: הסבר המהלך בצורה מעשית וקונקרטית
    - financial_potential: פוטנציאל כספי בשקלים (מספר בלבד)
    - execution_timeframe: ציר זמן מציאותי
    - execution_steps: 4-5 שלבי ביצוע קונקרטיים
    - expected_breakthrough: התוצאה הפורצת דרך
    - competitive_advantage: היתרון שייווצר
    - risk_level: רמת סיכון (low/medium/high)
    - innovation_score: ציון חדשנות 1-10

    דוגמה לסגנון הכתיבה:
    "זיהינו שאתה תלוי בוולט ומשלם עמלה של 15%. 🎯 המהלך: 'חזרה הביתה' - הוסף לכל משלוח ברושור קטן עם 'עוגיית מזל' ובפתק: 'הזמן ישירות ותחסוך 20%'"
  `;
};

export default generateStrategicMoves;
