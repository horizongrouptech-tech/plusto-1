import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
  const apiKey = Deno.env.get('BASE44_API_KEY');
  const appId = Deno.env.get('BASE44_APP_ID');
  
  console.log('=== DEBUG: Environment Variables Check ===');
  console.log('BASE44_APP_ID:', appId ? `${appId.substring(0, 8)}...` : 'UNDEFINED');
  console.log('BASE44_API_KEY exists:', apiKey ? 'YES' : 'NO');

  const base44 = createClient({
    appId: appId,
    apiKey: apiKey,
  });

  // פונקציה ליצירת המלצה ממוקדת - מועתקת מהמערכת הקיימת
  const generateTargetedRecommendation = async (customer, productData, progressCallback = null) => {
    const { productName, productDescription, issueReason } = productData;

    try {
      if (progressCallback) progressCallback(10, 'מחפש את המוצר בקטלוג הפנימי...');
      
      // שלב 1: חיפוש פנימי בקטלוג
      const internalSearchResult = await searchInternalCatalog(base44, customer, productName, productDescription);
      
      if (progressCallback) progressCallback(30, 
        internalSearchResult.found ? 'נמצא בקטלוג! בונה המלצה על בסיס נתונים פנימיים...' : 'לא נמצא בקטלוג, מבצע חיפוש חיצוני...'
      );

      let recommendationData;
      let foundInCatalog = false;

      if (internalSearchResult.found) {
        // יצירת המלצה על בסיס נתונים פנימיים
        foundInCatalog = true;
        recommendationData = await generateRecommendationFromCatalog(
          base44,
          customer, 
          internalSearchResult, 
          issueReason,
          (progress, step) => progressCallback && progressCallback(30 + progress * 0.4, step)
        );
      } else {
        // שלב 2: חיפוש חיצוני וחקר שוק
        if (progressCallback) progressCallback(40, 'מבצע מחקר שוק מתקדם...');
        
        const externalResearch = await conductExternalResearch(
          base44,
          productName, 
          productDescription, 
          customer.business_type,
          (progress, step) => progressCallback && progressCallback(40 + progress * 0.3, step)
        );

        if (progressCallback) progressCallback(70, 'יוצר המלצה על בסיס מחקר שוק...');
        
        recommendationData = await generateRecommendationFromResearch(
          base44,
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
      const savedRecommendation = await base44.entities.Recommendation.create({
        ...recommendationData,
        customer_email: customer.customer_email,
        status: 'pending',
        delivery_status: 'not_sent',
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

  // פונקציה לחיפוש בקטלוג הפנימי
  const searchInternalCatalog = async (base44, customer, productName, productDescription) => {
    try {
      // חיפוש בקטלוג המוצרים
      const catalogProducts = await base44.entities.ProductCatalog.filter({ 
        customer_email: customer.customer_email, 
        is_active: true 
      });

      // חיפוש במוצרים הישנים
      let legacyProducts = [];
      try {
        legacyProducts = await base44.entities.Product.filter({ created_by: customer.customer_email });
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

  // פונקציה ליצירת המלצה מהקטלוג
  const generateRecommendationFromCatalog = async (base44, customer, searchResult, issueReason, progressCallback) => {
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
אתה יועץ עסקי מומחה בישראל. צור המלצה ממוקדת עבור ${customer.business_name || customer.full_name || 'הלקוח'}, עסק מסוג ${customer.business_type || 'כללי'}.

**הקשר העסקי:**
- מחזור חודשי: ₪${(customer.monthly_revenue || 0).toLocaleString()}
- יעדים עסקיים: ${customer.business_goals || 'הגדלת רווחיות'}
- מוצרים עיקריים: ${customer.main_products || 'לא צוין'}
- קהל יעד: ${customer.target_customers || 'לא צוין'}
- אתר אינטרנט: ${customer.website_url || 'לא צוין'}

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

צור המלצה אחת מפורטת ואיכותית.
`;

      const response = await base44.integrations.Core.InvokeLLM({
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
            priority: { type: "string", enum: ["high", "medium", "low"] }
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

  // פונקציה למחקר חיצוני
  const conductExternalResearch = async (base44, productName, productDescription, businessType, progressCallback) => {
    try {
      if (progressCallback) progressCallback(20, 'חוקר את המוצר בשוק הישראלי...');

      const researchPrompt = `
בצע מחקר מקיף על המוצר "${productName}" בשוק הישראלי עבור עסק מסוג ${businessType || 'כללי'}.

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

      const researchResponse = await base44.integrations.Core.InvokeLLM({
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

  // פונקציה ליצירת המלצה ממחקר חיצוני
  const generateRecommendationFromResearch = async (base44, customer, productName, productDescription, issueReason, researchData, progressCallback) => {
    try {
      if (progressCallback) progressCallback(30, 'מייצר המלצה על בסיס מחקר השוק...');

      const issueReasonText = getIssueReasonText(issueReason);

      const researchBasedPrompt = `
אתה יועץ עסקי מומחה בישראל. צור המלצה ממוקדת עבור ${customer.business_name || customer.full_name || 'הלקוח'}, עסק מסוג ${customer.business_type || 'כללי'}.

**פרטי העסק:**
- מחזור חודשי: ₪${(customer.monthly_revenue || 0).toLocaleString()}
- מוצרים עיקריים: ${customer.main_products || 'לא צוין'}
- קהל יעד: ${customer.target_customers || 'לא צוין'}
- יעדים עסקיים: ${customer.business_goals || 'הגדלת רווחיות'}

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

צור המלצה אחת מפורטת ואיכותית.
`;

      const response = await base44.integrations.Core.InvokeLLM({
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
            priority: { type: "string", enum: ["high", "medium", "low"] }
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

  // פונקציה להמרת קוד סיבת הבעיה לטקסט
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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== WhatsApp Data Webhook Called ===');
    console.log('Method:', req.method);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.text();
    const payload = JSON.parse(body);
    console.log('Received Webhook Payload:', JSON.stringify(payload, null, 2));

    const customerPhone = payload.customer_phone || payload.phone || payload.from;
    
    if (!customerPhone) {
      console.error('No customer phone provided');
      return new Response(JSON.stringify({ error: 'No phone number provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cleanPhone = customerPhone.replace(/[^\d]/g, '');

    // Check if this is a product data collection payload (new format)
    if (payload.collected_data && payload.collected_data.product_name) {
      console.log('Processing product data collection payload');
      
      const collectedData = payload.collected_data;
      
      try {
        // --- START MODIFICATION 1: Find customer for product data collection ---
        let customer = null;
        // Try to find customer by phone in CustomerContact entity only
        const allContacts = await base44.entities.CustomerContact.list();
        customer = allContacts.find(c => c.phone === cleanPhone);

        if (customer) {
          console.log('Found customer manually:', customer.full_name);
        } else {
          console.log('Customer not found manually');
          console.log('Available phones:', allContacts.map(c => c.phone));
        }
        
        if (!customer) {
          console.log('No customer found in CustomerContact for phone:', cleanPhone);
          return new Response(JSON.stringify({ error: 'Customer not found in CustomerContact' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        // --- END MODIFICATION 1 ---

        // יצירת המלצה ממוקדת באמצעות המערכת הקיימת
        console.log('Creating targeted recommendation for customer:', {
          email: customer.customer_email,
          name: customer.full_name,
          phone: customer.phone
        });

        // נסה למצוא את רשומת OnboardingRequest המלאה
        let customerWithFullData = customer; // ברירת מחדל ל-CustomerContact

        try {
          const onboardingRequests = await base44.entities.OnboardingRequest.filter({ 
            email: customer.customer_email 
          });
          
          if (onboardingRequests.length > 0) {
            const onboardingData = onboardingRequests[0];
            // יצירת אובייקט משולב עם כל הנתונים
            customerWithFullData = {
              ...customer,
              business_name: onboardingData.business_name || customer.business_name,
              business_type: onboardingData.business_type || 'other',
              monthly_revenue: parseFloat(onboardingData.monthly_revenue) || 0,
              business_goals: onboardingData.business_goals || 'הגדלת רווחיות',
              main_products: onboardingData.main_products_services || '',
              target_customers: onboardingData.target_audience || '',
              website_url: onboardingData.website_url || '',
              address: {
                city: onboardingData.business_city || '',
                street: ''
              }
            };
            console.log('Using enriched customer data from OnboardingRequest');
          } else {
            console.warn('No OnboardingRequest found, using basic CustomerContact data');
          }
        } catch (onboardingError) {
          console.error('Error fetching OnboardingRequest:', onboardingError);
          console.warn('Using basic CustomerContact data due to error');
        }

        const productData = {
          productName: collectedData.product_name,
          productDescription: collectedData.product_description,
          issueReason: collectedData.request_reason_payload
        };

        const targetedResult = await generateTargetedRecommendation(customerWithFullData, productData, (progress, status) => {
          console.log(`Recommendation progress: ${progress}% - ${status}`);
        });

        if (!targetedResult.success) {
          console.error('Failed to generate targeted recommendation:', targetedResult.error);
          return new Response(JSON.stringify({ 
            error: 'Failed to generate targeted recommendation',
            details: targetedResult.error 
          }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        console.log('Targeted recommendation created successfully:', {
          id: targetedResult.recommendation.id,
          title: targetedResult.recommendation.title,
          foundInCatalog: targetedResult.foundInCatalog,
          searchMethod: targetedResult.searchMethod
        });

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Targeted recommendation created based on product analysis request',
          recommendation_id: targetedResult.recommendation.id,
          found_in_catalog: targetedResult.foundInCatalog,
          search_method: targetedResult.searchMethod
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });

      } catch (error) {
        console.error('Error processing product data:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to create targeted recommendation',
          details: error.message 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // Check if this is recommendation feedback (existing format)
    const woztellRecommendationId = payload.recommendation_id;
    const woztellFeedbackType = payload.feedback_type;

    if (woztellRecommendationId && woztellFeedbackType) {
      console.log('Processing recommendation feedback:', { woztellRecommendationId, woztellFeedbackType });

      const feedbackRatingMap = {
        'implemented': 1,
        'details': 2,
        'not_relevant': 3
      };

      const rating = feedbackRatingMap[woztellFeedbackType];
      if (!rating) {
        console.log('Unknown feedback type:', woztellFeedbackType);
        return new Response(JSON.stringify({ error: 'Unknown feedback type' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      try {
        const recommendations = await base44.entities.Recommendation.filter({ delivery_status: 'sent' });
        console.log('Retrieved recommendations count:', recommendations.length);
        
        let targetRecommendation = recommendations.find(rec => rec.related_data?.unique_recommendation_id === woztellRecommendationId);
        
        if (!targetRecommendation) {
          // --- START MODIFICATION 3: Fallback method for recommendation feedback ---
          console.log('No recommendation found by unique ID, trying fallback method');
          let customerForFallback = null;
          // Try CustomerContact only
          const customerContacts = await base44.entities.CustomerContact.filter({ phone: cleanPhone });
          if (customerContacts.length > 0) {
            customerForFallback = customerContacts[0];
            console.log('Customer found in CustomerContact for feedback fallback:', customerForFallback.customer_email);
          }

          if (customerForFallback) {
            const customerRecommendations = recommendations.filter(rec => 
              rec.customer_email === customerForFallback.customer_email
            );
            if (customerRecommendations.length > 0) {
              targetRecommendation = customerRecommendations.sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime())[0];
              console.log('Found recommendation via customer fallback:', targetRecommendation.id);
            } else {
              console.log('No relevant recommendations found for customer via fallback.');
            }
          } else {
            console.log('No customer found in CustomerContact for feedback fallback.');
          }
          // --- END MODIFICATION 3 ---
        }
        
        if (!targetRecommendation) {
          console.log('Recommendation not found for unique ID:', woztellRecommendationId);
          return new Response(JSON.stringify({ error: 'Recommendation not found' }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const feedbackData = {
          recommendation_id: targetRecommendation.id,
          customer_email: targetRecommendation.customer_email,
          rating: rating,
          feedback_text: `Feedback received via WhatsApp: ${woztellFeedbackType}`,
          implementation_status: woztellFeedbackType === 'implemented' ? 'implemented' : 'not_implemented',
          feedback_source: 'whatsapp',
          whatsapp_phone: cleanPhone,
          unique_recommendation_id: woztellRecommendationId,
          feedback_payload: JSON.stringify(payload),
          received_at: new Date().toISOString()
        };

        const newFeedback = await base44.entities.RecommendationFeedback.create(feedbackData);
        console.log('Created feedback record:', newFeedback.id);

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Feedback received and processed for recommendation ${targetRecommendation.id}` 
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
        
      } catch (apiError) {
        console.error('API Error Details:', apiError);
        return new Response(JSON.stringify({ 
          error: 'Failed to process feedback',
          details: apiError.message 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }
    
    console.log('Webhook payload is missing required fields.');
    console.log('DOES IT?', !!woztellRecommendationId, !!woztellFeedbackType);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Webhook payload is missing required fields. Expected either recommendation feedback or product data collection format.' 
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in receiveWhatsAppDataWebhook:', error.message, error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});