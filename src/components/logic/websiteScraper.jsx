import { InvokeLLM } from "@/integrations/Core";

export const scrapeWebsiteAndGenerateInsights = async (websiteUrl, userEmail) => {
  try {
    console.log(`Starting comprehensive website analysis for: ${websiteUrl}`);
    
    // Step 1: Extract comprehensive data from website
    const websiteData = await InvokeLLM({
      prompt: `
      אנא בצע ניתוח מקיף של האתר: ${websiteUrl}
      
      חלץ את כל המידע הרלוונטי הבא:
      1. מוצרים ושירותים (שמות, מחירים, תיאורים)
      2. פרטי עסק (שם, מיקום, סוג עסק, שעות פעילות)
      3. מחירים ומבצעים נוכחיים
      4. ערוצי מכירה (חנות פיזית, אונליין, משלוחים)
      5. קהל יעד וסגמנטים
      6. נקודות חוזק וחולשה של העסק
      7. אסטרטגיית השיווק הנוכחית
      8. מידע על מתחרים (אם יש)
      9. טכנולוגיות בשימוש (פלטפורמת אתר, כלי תשלום וכו')
      10. ביקורות לקוחות ומוניטין (אם זמין)
      
      בנוסף, זהה הזדמנויות לשיפור בתחומים:
      - תמחור והכנסות
      - חווית לקוח
      - שיווק דיגיטלי
      - ניהול מלאי
      - יעילות תפעולית
      `,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          business_info: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              location: { type: "string" },
              description: { type: "string" },
              target_audience: { type: "string" },
              operating_hours: { type: "string" }
            }
          },
          products_services: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                price: { type: "number" },
                description: { type: "string" },
                category: { type: "string" },
                availability: { type: "string" }
              }
            }
          },
          sales_channels: {
            type: "object",
            properties: {
              physical_store: { type: "boolean" },
              online_store: { type: "boolean" },
              delivery: { type: "boolean" },
              pickup: { type: "boolean" },
              third_party_platforms: { type: "array", items: { type: "string" } }
            }
          },
          marketing_analysis: {
            type: "object",
            properties: {
              current_strategy: { type: "string" },
              social_media_presence: { type: "string" },
              seo_status: { type: "string" },
              promotional_offers: { type: "array", items: { type: "string" } }
            }
          },
          technology_stack: {
            type: "object",
            properties: {
              platform: { type: "string" },
              payment_methods: { type: "array", items: { type: "string" } },
              analytics_tools: { type: "string" },
              crm_system: { type: "string" }
            }
          },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          opportunities: { type: "array", items: { type: "string" } },
          threats: { type: "array", items: { type: "string" } },
          competitive_analysis: {
            type: "object",
            properties: {
              direct_competitors: { type: "array", items: { type: "string" } },
              competitive_advantages: { type: "array", items: { type: "string" } },
              market_position: { type: "string" }
            }
          }
        },
        required: ["business_info", "products_services", "sales_channels", "strengths", "weaknesses", "opportunities"]
      }
    });

    console.log("Website data extracted successfully");

    // Step 2: Generate specific business recommendations based on website analysis
    const businessRecommendations = await generateWebsiteBasedRecommendations(websiteData, userEmail);

    // Step 3: Generate actionable business moves
    const businessMoves = await generateWebsiteBasedBusinessMoves(websiteData, userEmail);

    // Step 4: Competitive analysis and market insights
    const marketInsights = await generateMarketInsights(websiteData, userEmail);

    return {
      websiteData,
      businessRecommendations,
      businessMoves,
      marketInsights,
      scrapedAt: new Date().toISOString(),
      success: true
    };

  } catch (error) {
    console.error("Error in comprehensive website analysis:", error);
    return {
      error: error.message,
      success: false
    };
  }
};

const generateWebsiteBasedRecommendations = async (websiteData, userEmail) => {
  try {
    const recommendations = await InvokeLLM({
      prompt: `
      בהתבסס על הניתוח הבא של האתר:
      ${JSON.stringify(websiteData, null, 2)}
      
      צור 5-8 המלצות עסקיות ספציפיות ומותאמות אישית עבור העסק הזה.
      התמקד בהמלצות שיכולות להביא לשיפור מידי ברווחיות.
      
      עבור כל המלצה, ספק:
      1. כותרת ברורה
      2. תיאור מפורט של המהלך
      3. השפעה כספית צפויה (בשקלים)
      4. שלבי יישום מעשיים
      5. רמת קושי יישום
      6. זמן ליישום
      
      דוגמאות לתחומי המלצות:
      - אופטימיזציה של מחירים בהתבסס על מחירי האתר
      - שיפור חווית קנייה אונליין
      - הוספת מוצרים או שירותים משלימים
      - שיפור אסטרטגיית שיווק דיגיטלי
      - אופטימיזציה של מלאי בהתבסס על המוצרים באתר
      - שיפור יעילות תפעולית
      `,
      add_context_from_internet: true,
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
                category: { 
                  type: "string", 
                  enum: ["pricing", "suppliers", "marketing", "inventory", "operations"] 
                },
                expected_profit: { type: "number" },
                profit_percentage: { type: "number" },
                implementation_effort: { 
                  type: "string", 
                  enum: ["low", "medium", "high"] 
                },
                timeframe: { type: "string" },
                priority: { 
                  type: "string", 
                  enum: ["high", "medium", "low"] 
                },
                action_steps: { 
                  type: "array", 
                  items: { type: "string" } 
                },
                affected_products: { 
                  type: "array", 
                  items: { type: "string" } 
                },
                trigger_condition: { type: "string" },
                related_data: { type: "object", additionalProperties: true }
              },
              required: ["title", "description", "category", "expected_profit", "implementation_effort", "priority", "action_steps"]
            }
          }
        }
      }
    });

    return recommendations.recommendations || [];
  } catch (error) {
    console.error("Error generating website-based recommendations:", error);
    return [];
  }
};

const generateWebsiteBasedBusinessMoves = async (websiteData, userEmail) => {
  try {
    const businessMoves = await InvokeLLM({
      prompt: `
      בהתבסס על הניתוח של האתר:
      ${JSON.stringify(websiteData, null, 2)}
      
      צור 8-12 מהלכים עסקיים יצירתיים ומותאמים אישית שיכולים לשפר את הביצועים של העסק.
      
      התמקד במהלכים ש:
      1. ניתנים ליישום מידי
      2. מבוססים על המצב הנוכחי של העסק
      3. יכולים להביא לתוצאות מדידות
      4. מתאימים לסוג העסק והקהל
      
      כלול מהלכים בתחומים:
      - שיווק דיגיטלי מותאם
      - שיפור מוצרים קיימים
      - הוספת ערוצי הכנסה
      - שיפור שירות לקוחות
      - אופטימיזציה טכנולוגית
      - שיתופי פעולה אסטרטגיים
      `,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          business_moves: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { 
                  type: "string", 
                  enum: ["pricing", "suppliers", "marketing", "inventory", "operations"] 
                },
                implementation_effort: { 
                  type: "string", 
                  enum: ["low", "medium", "high"] 
                },
                priority: { 
                  type: "string", 
                  enum: ["high", "medium", "low"] 
                },
                action_steps: { 
                  type: "array", 
                  items: { type: "string" } 
                },
                expected_outcome: { type: "string" },
                resources_needed: { type: "string" },
                timeline: { type: "string" }
              },
              required: ["title", "description", "category", "implementation_effort", "priority", "action_steps"]
            }
          }
        }
      }
    });

    return businessMoves.business_moves || [];
  } catch (error) {
    console.error("Error generating website-based business moves:", error);
    return [];
  }
};

const generateMarketInsights = async (websiteData, userEmail) => {
  try {
    const insights = await InvokeLLM({
      prompt: `
      בהתבסס על הניתוח של האתר והשוק:
      ${JSON.stringify(websiteData, null, 2)}
      
      צור תובנות שוק מעמיקות כולל:
      1. ניתוח תחרותי מפורט
      2. הזדמנויות שוק שלא מנוצלות
      3. טרנדים רלוונטיים בתעשייה
      4. איומים פוטנציאליים
      5. המלצות למיצוב מחדש
      6. הזדמנויות לחדשנות
      
      השתמש במידע עדכני מהאינטרנט על השוק והתחרות.
      `,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          competitive_analysis: {
            type: "object",
            properties: {
              main_competitors: { type: "array", items: { type: "string" } },
              competitive_gaps: { type: "array", items: { type: "string" } },
              market_opportunities: { type: "array", items: { type: "string" } }
            }
          },
          market_trends: { type: "array", items: { type: "string" } },
          threats: { type: "array", items: { type: "string" } },
          positioning_recommendations: { type: "array", items: { type: "string" } },
          innovation_opportunities: { type: "array", items: { type: "string" } },
          pricing_insights: { type: "string" },
          customer_behavior_insights: { type: "string" }
        }
      }
    });

    return insights;
  } catch (error) {
    console.error("Error generating market insights:", error);
    return {};
  }
};

// Function to extract products from website data and create Product entities
export const createProductsFromWebsite = async (websiteData, userEmail) => {
  try {
    if (!websiteData.products_services || websiteData.products_services.length === 0) {
      return [];
    }

    const { Product } = await import("@/entities/Product");
    const productsToCreate = [];

    for (const item of websiteData.products_services) {
      if (item.name && (item.price || item.description)) {
        const productData = {
          name: item.name,
          selling_price: item.price || 0,
          cost_price: item.price ? item.price * 0.7 : 0, // Estimate 30% margin
          category: item.category || 'כללי',
          description: item.description || '',
          created_by: userEmail,
          source: 'website_scan'
        };

        productsToCreate.push(productData);
      }
    }

    if (productsToCreate.length > 0) {
      const createdProducts = await Product.bulkCreate(productsToCreate);
      console.log(`Created ${createdProducts.length} products from website scan`);
      return createdProducts;
    }

    return [];
  } catch (error) {
    console.error("Error creating products from website:", error);
    return [];
  }
};

// Function to update user data with website insights
export const updateUserWithWebsiteData = async (websiteData, userEmail) => {
  try {
    const { User } = await import("@/entities/User");
    
    const updateData = {};
    
    if (websiteData.business_info) {
      if (websiteData.business_info.name && !updateData.business_name) {
        updateData.business_name = websiteData.business_info.name;
      }
      if (websiteData.business_info.type) {
        updateData.business_type = websiteData.business_info.type;
      }
      if (websiteData.business_info.location) {
        updateData.address = { city: websiteData.business_info.location };
      }
      if (websiteData.business_info.target_audience) {
        updateData.target_customers = websiteData.business_info.target_audience;
      }
    }

    if (websiteData.technology_stack?.platform) {
      updateData.website_platform = websiteData.technology_stack.platform;
    }

    updateData.website_scraped_date = new Date().toISOString();

    if (Object.keys(updateData).length > 0) {
      const currentUser = await User.me();
      await User.update(currentUser.id, updateData);
      console.log("Updated user data with website insights");
    }

  } catch (error) {
    console.error("Error updating user with website data:", error);
  }
};