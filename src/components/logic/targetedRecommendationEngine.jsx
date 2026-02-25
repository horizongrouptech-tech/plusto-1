import { Product, ProductCatalog, Recommendation } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';






/**
 * מנוע יצירת המלצות ממוקדות למוצר ספציפי
 * כולל חיפוש פנימי בקטלוג וחיפוש חיצוני חכם
 */

export const generateTargetedRecommendation = async (customer, productData, progressCallback = null) => {
  const { productName, productDescription, issueReason } = productData;

  try {
    if (progressCallback) progressCallback(10, 'מחפש את המוצר בקטלוג הפנימי...');
    
    // שלב 1: חיפוש פנימי בקטלוג
    const internalSearchResult = await searchInternalCatalog(customer, productName, productDescription);
    
    if (progressCallback) progressCallback(30, 
      internalSearchResult.found ? 'נמצא בקטלוג! בונה המלצה על בסיס נתונים פנימיים...' : 'לא נמצא בקטלוג, מבצע חיפוש חיצוני...'
    );

    let recommendationData;
    let foundInCatalog = false;

    if (internalSearchResult.found) {
      // יצירת המלצה על בסיס נתונים פנימיים
      foundInCatalog = true;
      recommendationData = await generateRecommendationFromCatalog(
        customer, 
        internalSearchResult, 
        issueReason,
        (progress, step) => progressCallback && progressCallback(30 + progress * 0.4, step)
      );
    } else {
      // שלב 2: חיפוש חיצוני וחקר שוק
      if (progressCallback) progressCallback(40, 'מבצע מחקר שוק מתקדם...');
      
      const externalResearch = await conductExternalResearch(
        productName, 
        productDescription, 
        customer.business_type,
        (progress, step) => progressCallback && progressCallback(40 + progress * 0.3, step)
      );

      if (progressCallback) progressCallback(70, 'יוצר המלצה על בסיס מחקר שוק...');
      
      recommendationData = await generateRecommendationFromResearch(
        customer,
        productName,
        productDescription,
        issueReason,
        externalResearch,
        (progress, step) => progressCallback && progressCallback(70 + progress * 0.2, step)
      );
    }

    if (progressCallback) progressCallback(90, 'שומר את ההמלצה במערכת...');

    // שמירת ההמלצה עם תיוג מיוחד
    const savedRecommendation = await Recommendation.create({
      ...recommendationData,
      customer_email: customer.email,
      status: 'pending',
      delivery_status: 'not_sent',
      source: 'whatsapp_request', // תיוג כהמלצה שנוצרה ביוזמת הלקוח
      admin_notes: `המלצה ממוקדת נוצרה עבור "${productName}" - ${foundInCatalog ? 'מבוסס על קטלוג פנימי' : 'מבוסס על מחקר חיצוני'}`,
      related_data: {
        ...recommendationData.related_data,
        is_targeted: true,
        product_searched: productName,
        search_method: foundInCatalog ? 'internal_catalog' : 'external_research',
        issue_reason: issueReason,
        generation_date: new Date().toISOString()
      }
    });

    if (progressCallback) progressCallback(100, 'המלצה ממוקדת נוצרה בהצלחה!');

    return {
      success: true,
      recommendation: savedRecommendation,
      foundInCatalog,
      searchMethod: foundInCatalog ? 'internal_catalog' : 'external_research'
    };

  } catch (error) {
    console.error("Error generating targeted recommendation:", error);
    return {
      success: false,
      error: `יצירת המלצה ממוקדת נכשלה: ${error.message}`
    };
  }
};

/**
 * חיפוש המוצר בקטלוג הפנימי של הלקוח
 */
const searchInternalCatalog = async (customer, productName, productDescription) => {
  try {
    // חיפוש בקטלוג המוצרים
    const catalogProducts = await ProductCatalog.filter({ 
      customer_email: customer.email, 
      is_active: true 
    });

    // חיפוש במוצרים הישנים
    let legacyProducts = [];
    try {
      legacyProducts = await Product.filter({ created_by: customer.email });
    } catch (e) {
      console.log("No legacy products found");
    }

    const allProducts = [...catalogProducts, ...legacyProducts];

    if (allProducts.length === 0) {
      return { found: false, products: [] };
    }

    // חיפוש מוצרים דומים
    const similarProducts = allProducts.filter(product => {
      const productNameLower = (product.product_name || product.name || '').toLowerCase();
      const searchTermLower = productName.toLowerCase();
      
      // חיפוש מדויק או חלקי
      return productNameLower.includes(searchTermLower) || 
             searchTermLower.includes(productNameLower) ||
             // חיפוש במילות מפתח
             (productDescription && product.category && 
              product.category.toLowerCase().includes(productDescription.toLowerCase()));
    });

    // חיפוש בקטגוריות דומות
    const categoryMatches = allProducts.filter(product => {
      if (!productDescription || !product.category) return false;
      return product.category.toLowerCase().includes(productDescription.toLowerCase()) ||
             productDescription.toLowerCase().includes(product.category.toLowerCase());
    });

    const matchedProducts = [...new Set([...similarProducts, ...categoryMatches])];

    return {
      found: matchedProducts.length > 0,
      products: matchedProducts.slice(0, 10), // עד 10 מוצרים דומים
      allProducts: allProducts.slice(0, 20) // הקשר כללי
    };

  } catch (error) {
    console.error("Error searching internal catalog:", error);
    return { found: false, products: [] };
  }
};

/**
 * יצירת המלצה על בסיס נתונים מהקטלוג הפנימי
 */
const generateRecommendationFromCatalog = async (customer, searchResult, issueReason, progressCallback) => {
  try {
    if (progressCallback) progressCallback(20, 'מנתח את המוצרים הדומים בקטלוג...');

    const { products, allProducts } = searchResult;
    
    // הכנת סיכום המוצרים הרלוונטיים
    const productsSummary = products.map(p => {
      const costPrice = parseFloat(p.cost_price) || 0;
      const sellingPrice = parseFloat(p.selling_price) || 0;
      const grossProfit = sellingPrice - costPrice;
      const profitPercentage = costPrice > 0 ? (grossProfit / costPrice) * 100 : 0;

      return `"${p.product_name || p.name}" - מחיר קנייה: ₪${costPrice.toFixed(2)}, מחיר מכירה: ₪${sellingPrice.toFixed(2)}, רווח: ${profitPercentage.toFixed(1)}%, קטגוריה: ${p.category || 'לא צוין'}, ספק: ${p.supplier || 'לא צוין'}, מלאי: ${p.inventory || 0}`;
    }).join('\n');

    if (progressCallback) progressCallback(60, 'מייצר המלצה מותאמת...');

    const issueReasonText = getIssueReasonText(issueReason);

    const catalogBasedPrompt = `
אתה יועץ עסקי מומחה בישראל. צור המלצה ממוקדת עבור ${customer.business_name || customer.full_name}, עסק מסוג ${customer.business_type}.

**הקשר העסקי:**
- מחזור חודשי: ₪${(customer.monthly_revenue || 0).toLocaleString()}
- יעדים עסקיים: ${customer.business_goals || 'הגדלת רווחיות'}

**הבעיה שזוהתה:**
${issueReasonText}

**מוצרים דומים בקטלוג הלקוח:**
${productsSummary}

**הוראות ליצירת המלצה:**
1. התבסס על המוצרים הדומים שנמצאו בקטלוג
2. צור המלצה קונקרטית ומעשית לפתרון הבעיה
3. כלול נתונים מספריים מדויקים מהקטלוג
4. הצע שלבי פעולה ברורים וניתנים לביצוע
5. חשב פוטנציאל רווח ריאלי על בסיס הנתונים הקיימים
6. כתוב בעברית בלבד ללא אימוג'י או סמלים

**הנחיות מיוחדות לקטגוריית "bundles":**
אם אתה ממליץ על חבילה, כלול:
- שם/קונספט יצירתי לחבילה (bundle_name_concept)
- מחיר מומלץ לחבילה (recommended_bundle_price)
- סה"כ מחיר הפריטים בנפרד (individual_items_total_price)
- ניתוח השפעת הרווח (profit_impact_details)

צור המלצה אחת מפורטת ואיכותית.
`;

    const response = await InvokeLLM({
      prompt: catalogBasedPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string", enum: ["pricing", "bundles", "promotions", "suppliers", "strategic_moves"] },
          expected_profit: { type: "number" },
          action_steps: { type: "array", items: { type: "string" } },
          product_context: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
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
    });

    if (progressCallback) progressCallback(90, 'מסיים עיבוד ההמלצה...');

    return {
      ...response,
      priority: 'high', // המלצות ממוקדות הן בעדיפות גבוהה
      related_data: {
        source_products: products.map(p => p.product_name || p.name),
        catalog_matches: products.length,
        data_source: 'internal_catalog'
      }
    };

  } catch (error) {
    console.error("Error generating recommendation from catalog:", error);
    throw new Error("יצירת המלצה מהקטלוג נכשלה");
  }
};

/**
 * מחקר חיצוני על המוצר באמצעות AI
 */
const conductExternalResearch = async (productName, productDescription, businessType, progressCallback) => {
  try {
    if (progressCallback) progressCallback(20, 'חוקר את המוצר בשוק הישראלי...');

    const researchPrompt = `
בצע מחקר מקיף על המוצר "${productName}" בשוק הישראלי עבור עסק מסוג ${businessType}.

תיאור המוצר: ${productDescription || 'לא סופק תיאור'}

מחקר נדרש:
1. מחיר שוק ממוצע בישראל
2. ספקים עיקריים בשוק הישראלי
3. מגמות שוק והזדמנויות
4. אסטרטגיות תמחור מומלצות
5. הזדמנויות לחבילות ומבצעים
6. תחרות בשוק
7. עונתיות ומחזורי ביקוש

התמקד בשוק הישראלי ובמידע עדכני.
`;

    const researchResponse = await InvokeLLM({
      prompt: researchPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          market_price_range: { type: "object", properties: { min: { type: "number" }, max: { type: "number" } } },
          main_suppliers: { type: "array", items: { type: "string" } },
          market_trends: { type: "array", items: { type: "string" } },
          pricing_strategies: { type: "array", items: { type: "string" } },
          bundle_opportunities: { type: "array", items: { type: "string" } },
          competition_level: { type: "string" },
          seasonality: { type: "string" },
          market_insights: { type: "string" }
        }
      }
    });

    if (progressCallback) progressCallback(80, 'מסכם את ממצאי המחקר...');

    return researchResponse;

  } catch (error) {
    console.error("Error conducting external research:", error);
    // במקרה של כשל במחקר, נחזיר נתונים בסיסיים
    return {
      market_price_range: { min: 0, max: 0 },
      main_suppliers: [],
      market_trends: ["נתונים לא זמינים"],
      pricing_strategies: ["בדיקת מחירי תחרות מומלצת"],
      bundle_opportunities: [],
      competition_level: "לא ידוע",
      seasonality: "לא ידוע",
      market_insights: "מומלץ לבצע מחקר שוק נוסף"
    };
  }
};

/**
 * יצירת המלצה על בסיס מחקר חיצוני
 */
const generateRecommendationFromResearch = async (customer, productName, productDescription, issueReason, researchData, progressCallback) => {
  try {
    if (progressCallback) progressCallback(30, 'מייצר המלצה על בסיס מחקר השוק...');

    const issueReasonText = getIssueReasonText(issueReason);

    const researchBasedPrompt = `
אתה יועץ עסקי מומחה בישראל. צור המלצה ממוקדת עבור ${customer.business_name || customer.full_name}, עסק מסוג ${customer.business_type}.

**המוצר שנחקר:**
שם: ${productName}
תיאור: ${productDescription || 'לא סופק'}

**הבעיה שזוהתה:**
${issueReasonText}

**ממצאי מחקר השוק:**
- טווח מחירים בשוק: ₪${researchData.market_price_range?.min || 0} - ₪${researchData.market_price_range?.max || 0}
- ספקים עיקריים: ${researchData.main_suppliers?.join(', ') || 'לא זמין'}
- מגמות שוק: ${researchData.market_trends?.join(', ') || 'לא זמין'}
- אסטרטגיות תמחור: ${researchData.pricing_strategies?.join(', ') || 'לא זמין'}
- הזדמנויות חבילות: ${researchData.bundle_opportunities?.join(', ') || 'לא זמין'}
- רמת תחרות: ${researchData.competition_level || 'לא ידוע'}
- עונתיות: ${researchData.seasonality || 'לא ידוע'}

**תובנות נוספות:**
${researchData.market_insights || 'לא זמין'}

**הוראות ליצירת המלצה:**
1. התבסס על ממצאי המחקר
2. צור המלצה מותאמת לבעיה הספציפית
3. כלול מספרים ומידע קונקרטי מהמחקר
4. הצע שלבי פעולה מעשיים
5. חשב פוטנציאל רווח ריאלי
6. כתוב בעברית בלבד ללא אימוג'י או סמלים

**הנחיות מיוחדות לקטגוריית "bundles":**
אם אתה ממליץ על חבילה, כלול:
- שם/קונספט יצירתי לחבילה (bundle_name_concept)
- מחיר מומלץ לחבילה (recommended_bundle_price)
- סה"כ מחיר הפריטים בנפרד (individual_items_total_price)
- ניתוח השפעת הרווח (profit_impact_details)

צור המלצה אחת מפורטת ואיכותית.
`;

    const response = await InvokeLLM({
      prompt: researchBasedPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string", enum: ["pricing", "bundles", "promotions", "suppliers", "strategic_moves"] },
          expected_profit: { type: "number" },
          action_steps: { type: "array", items: { type: "string" } },
          product_context: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
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
    });

    if (progressCallback) progressCallback(90, 'מסיים עיבוד ההמלצה החיצונית...');

    return {
      ...response,
      product_context: productName,
      priority: 'high',
      related_data: {
        research_data: researchData,
        data_source: 'external_research',
        market_price_range: researchData.market_price_range
      }
    };

  } catch (error) {
    console.error("Error generating recommendation from research:", error);
    throw new Error("יצירת המלצה מהמחקר החיצוני נכשלה");
  }
};

/**
 * המרת קוד סיבת הבעיה לטקסט מובן
 */
const getIssueReasonText = (issueReason) => {
  const reasonMap = {
    'low_profitability': 'המוצר סובל מרווחיות נמוכה ונדרש שיפור במודל הכלכלי',
    'slow_sales': 'קיים קיפאון במכירות המוצר ונדרש דחיפה שיווקית',
    'old_inventory': 'המוצר נמצא במלאי זמן רב ונדרש פתרון למכירה מהירה',
    'pricing_issues': 'המחיר הנוכחי אינו תחרותי בשוק ונדרשת התאמה',
    'supplier_problems': 'קיימות בעיות עם הספק הנוכחי ונדרש פתרון חלופי',
    'market_competition': 'התחרות בשוק חזקה ונדרשת אסטרטגיה להתמודדות',
    'seasonal_decline': 'המוצר סובל מירידה עונתית ונדרש פתרון יצירתי',
    'bundling_opportunity': 'קיימת הזדמנות ליצירת חבילות משולבות עם המוצר',
    'other': 'בעיה ייחודית הדורשת פתרון מותאם'
  };

  return reasonMap[issueReason] || 'בעיה כללית הדורשת ניתוח מעמיק';
};

/**
 * פונקציה חדשה לשדרוג המלצה קיימת באמצעות הנחיות מהאדמין
 */
export const enhanceRecommendationWithPrompt = async (originalRecommendation, userGuidancePrompt, customer) => {
  try {
    const prompt = `
      You are an expert business consultant for Israeli businesses. Your task is to upgrade an existing recommendation based on user guidance.

      **Business Context:**
      - Business Name: ${customer.business_name || customer.full_name}
      - Business Type: ${customer.business_type}

      **Original Recommendation to Upgrade:**
      - Title: "${originalRecommendation.title}"
      - Description: "${originalRecommendation.description}"
      - Category: ${originalRecommendation.category}
      - Action Steps: 
        ${(originalRecommendation.action_steps || []).map((step, i) => `${i + 1}. ${step}`).join('\n')}

      **User Guidance for Upgrade:**
      ---
      ${userGuidancePrompt}
      ---

      **Your Task:**
      Rewrite and enhance the original recommendation according to the user's guidance. 
      1.  Thoroughly analyze the user's prompt.
      2.  Modify the title, description, and action steps as requested.
      3.  Ensure the new action steps are clear, concrete, and actionable.
      4.  Maintain a professional and encouraging tone, in Hebrew only.
      5.  The output must be a valid JSON object matching the provided schema. Do not add any text outside the JSON structure.
    `;

    const enhancedRec = await InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "The new, upgraded title for the recommendation." },
          description: { type: "string", description: "The new, detailed, and upgraded description." },
          category: { type: "string", enum: ["pricing", "bundles", "promotions", "suppliers", "strategic_moves"], description: "The recommendation category, should generally stay the same unless requested." },
          expected_profit: { type: "number", description: "The expected profit, can be adjusted based on the new guidance." },
          profit_percentage: { type: "number", description: "The expected profit percentage." },
          action_steps: { type: "array", items: { type: "string" }, description: "A new, clear, and actionable list of steps to implement the upgraded recommendation." },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "Priority of the recommendation." },
          implementation_effort: { type: "string", enum: ["low", "medium", "high"], "description": "Implementation effort." },
          timeframe: { type: "string", "description": "Timeframe for implementation." },
          related_data: { type: "object", additionalProperties: true, description: "Any new related data or context."}
        },
        required: ["title", "description", "action_steps"]
      }
    });

    // Ensure category from original recommendation is preserved if not returned by LLM
    if (!enhancedRec.category) {
        enhancedRec.category = originalRecommendation.category;
    }
    
    return enhancedRec;

  } catch (error) {
    console.error("Error enhancing recommendation with prompt:", error);
    throw new Error(`שדרוג ההמלצה נכשל: ${error.message}`);
  }
};


export default generateTargetedRecommendation;
