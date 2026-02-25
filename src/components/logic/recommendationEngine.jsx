
import { generateInventoryBasedRecommendations } from './inventoryBasedRecommendationEngine';
import { Product, Recommendation } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';




const calculateRealFinancialImpact = (product, improvementPercent = 5) => {
    const currentMonthlySales = product.monthly_sales || 0;
    const currentSellingPrice = product.selling_price || 0;
    const costPrice = product.cost_price || 0;

    // Calculate current monthly profit correctly
    const currentMonthlyProfit = currentMonthlySales * (currentSellingPrice - costPrice);

    // Calculate improved profit based on the improvementPercent applied to profit margin
    const profitPerUnit = currentSellingPrice - costPrice;
    const improvedProfitPerUnit = profitPerUnit * (1 + improvementPercent / 100);
    const improvedMonthlyProfit = currentMonthlySales * improvedProfitPerUnit;

    // Calculate the absolute increase in profit
    const profitIncreaseAbsolute = improvedMonthlyProfit - currentMonthlyProfit;

    return {
        currentProfit: Math.round(Math.max(0, currentMonthlyProfit)), // Ensure no negative profits shown
        improvedProfit: Math.round(Math.max(0, improvedMonthlyProfit)),
        profitIncrease: Math.round(Math.max(0, profitIncreaseAbsolute)),
        profitPercentageIncrease: improvementPercent
    };
};

// מנוע המלצות ראשי - שדרוג מלא
export const generateSmartRecommendations = async (user, options = {}) => {
    console.log(`Starting enhanced recommendation generation for: ${user.business_name || user.full_name}`);

    const {
        useInventoryEngine = true,
        generateCount = 8,
        priority = 'mixed'
    } = options;

    try {
        // שימוש במנוע החדש מבוסס מלאי
        if (useInventoryEngine) {
            // The generateInventoryBasedRecommendations function is expected to return a similar structure
            // { success: boolean, recommendations: Recommendation[], totalGenerated: number, generationMethod: string }
            return await generateInventoryBasedRecommendations(user, {
                generateCount,
                priority
            });
        }

        // Fallback למנוע הקודם (רק במקרה הצורך)
        return await generateFallbackRecommendations(user, { generateCount, priority });

    } catch (error) {
        console.error("Error in smart recommendations:", error);
        return {
            success: false,
            error: error.message,
            recommendations: [],
            totalGenerated: 0
        };
    }
};

// מנוע Fallback למקרים מיוחדים
const generateFallbackRecommendations = async (user, options) => {
    try {
        const products = await Product.filter({ created_by: user.email });

        const fallbackPrompt = `
        צור ${options.generateCount} המלצות עסקיות בסיסיות עבור ${user.business_name || user.full_name}:

        סוג עסק: ${user.business_type || 'כללי'}
        מחזור חודשי: ₪${(user.monthly_revenue || 0).toLocaleString()}
        מספר מוצרים במערכת: ${products.length}

        כל המלצה חייבת להיות בפורמט Base44:
        - פתיחה אישית
        - ניתוח מבוסס נתונים
        - המלצה פרקטית
        - צפי רווח
        - קריאה לפעולה
        `;

        const response = await InvokeLLM({
            prompt: fallbackPrompt,
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
                                category: { type: "string", enum: ["pricing", "suppliers", "marketing", "inventory", "operations"] },
                                expected_profit: { type: "number" },
                                priority: { type: "string", enum: ["high", "medium", "low"] },
                                action_steps: { type: "array", items: { type: "string" } }
                            },
                            required: ["title", "description", "category", "expected_profit", "priority", "action_steps"]
                        }
                    }
                },
                required: ["recommendations"]
            }
        });

        const savedRecommendations = [];

        if (Array.isArray(response?.recommendations)) {
            for (const rec of response.recommendations) {
                try {
                    // Clean description from potential URLs/sources before saving
                    const cleanDescription = (rec.description || "")
                        .replace(/https?:\/\/[^\s]+/gi, '')
                        .replace(/www\.[^\s]+/gi, '')
                        .replace(/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '')
                        .replace(/\([^)]*מקור[^)]*\)/gi, '')
                        .replace(/מקור:.*$/gi, '')
                        .replace(/\(\s*\)/g, '')
                        .trim();

                    const recommendationData = {
                        title: rec.title,
                        description: cleanDescription,
                        category: rec.category,
                        expected_profit: Math.round(rec.expected_profit), // Ensure profit is an integer
                        priority: rec.priority,
                        action_steps: rec.action_steps,
                        customer_email: user.email,
                        status: 'pending',
                        delivery_status: 'not_sent',
                        profit_percentage: user.monthly_revenue > 0 ? (rec.expected_profit / user.monthly_revenue) * 100 : 0,
                        related_data: {
                            generation_method: "fallback_engine",
                            user_data_available: products.length > 0
                        }
                    };

                    const savedRec = await Recommendation.create(recommendationData);
                    savedRecommendations.push(savedRec);
                } catch (error) {
                    console.error("Error saving fallback recommendation:", error);
                }
            }
        }

        return {
            success: true,
            recommendations: savedRecommendations,
            totalGenerated: savedRecommendations.length,
            generationMethod: "fallback"
        };

    } catch (error) {
        console.error("Error in fallback recommendations:", error);
        return {
            success: false,
            error: error.message,
            recommendations: [],
            totalGenerated: 0
        };
    }
};

export const analyzeProductsAndGenerateRecommendations = async (products, customerEmail) => {
  if (!products || products.length === 0) {
    console.warn("No products provided for recommendation analysis");
    return { success: false, message: "לא נמצאו מוצרים לניתוח" };
  }

  if (!customerEmail) {
    console.error("Customer email is required for recommendation generation");
    return { success: false, message: "נדרש מייל לקוח ליצירת המלצות" };
  }

  try {
    console.log(`Starting recommendation analysis for ${products.length} products`);
    
    // Validate product data quality
    const validProducts = products.filter(product => {
      if (!product.name || product.name.trim() === '') {
        console.warn(`Product with missing name skipped:`, product);
        return false;
      }
      if (product.cost_price === undefined || product.cost_price === null) {
        console.warn(`Product ${product.name} missing cost_price, using 0`);
        product.cost_price = 0;
      }
      if (!product.selling_price || product.selling_price <= 0) {
        console.warn(`Product ${product.name} has invalid selling_price:`, product.selling_price);
        return false;
      }
      return true;
    });

    if (validProducts.length === 0) {
      console.warn("No valid products found after validation");
      return { success: false, message: "לא נמצאו מוצרים תקינים לניתוח" };
    }

    if (validProducts.length < products.length) {
      console.log(`${products.length - validProducts.length} products were filtered out due to missing or invalid data`);
    }

    const recommendations = [];
    let successCount = 0;
    let errorCount = 0;

    // Process recommendations with individual error handling
    for (const product of validProducts) {
      try {
        // Low margin analysis with error handling
        const marginRecommendations = await analyzeProductMargin(product, customerEmail);
        if (marginRecommendations && marginRecommendations.length > 0) {
          recommendations.push(...marginRecommendations);
          successCount++;
        }

        // Inventory analysis with error handling  
        const inventoryRecommendations = await analyzeInventoryLevels(product, customerEmail);
        if (inventoryRecommendations && inventoryRecommendations.length > 0) {
          recommendations.push(...inventoryRecommendations);
          successCount++;
        }

        // Bundle analysis with error handling
        if (validProducts.length > 1) {
          const bundleRecommendations = await analyzeBundleOpportunities([product], validProducts, customerEmail);
          if (bundleRecommendations && bundleRecommendations.length > 0) {
            recommendations.push(...bundleRecommendations);
            successCount++;
          }
        }

      } catch (productError) {
        console.error(`Error processing recommendations for product ${product.name}:`, productError);
        errorCount++;
        continue; // Continue with next product
      }
    }

    // Save recommendations with error handling
    const savedRecommendations = [];
    for (const rec of recommendations) {
      try {
        const savedRec = await Recommendation.create(rec);
        if (savedRec) {
          savedRecommendations.push(savedRec);
        }
      } catch (saveError) {
        console.error(`Error saving recommendation "${rec.title}":`, saveError);
        errorCount++;
      }
    }

    console.log(`Recommendation generation completed: ${savedRecommendations.length} saved, ${errorCount} errors`);
    
    return {
      success: savedRecommendations.length > 0,
      message: `נוצרו ${savedRecommendations.length} המלצות בהצלחה${errorCount > 0 ? `, ${errorCount} שגיאות` : ''}`,
      recommendationsCreated: savedRecommendations.length,
      errors: errorCount
    };

  } catch (error) {
    console.error("Critical error in recommendation generation:", error);
    return {
      success: false,
      message: "שגיאה קריטית ביצירת המלצות: " + error.message,
      errors: 1
    };
  }
};

const analyzeProductMargin = async (product, customerEmail) => {
  try {
    if (!product.selling_price || product.selling_price <= 0) {
      return [];
    }

    const costPrice = product.cost_price || 0;
    const sellingPrice = product.selling_price;
    const marginPercentage = sellingPrice === 0 ? 0 : ((sellingPrice - costPrice) / sellingPrice) * 100;

    // Only generate recommendation if margin is genuinely low
    if (marginPercentage < 20) {
      // Calculate potential profit increase. If current profit is negative, assume 0 as base for calculation.
      const currentProfitPerUnit = sellingPrice - costPrice;
      const targetProfitPerUnit = sellingPrice * 0.3; // Target 30% margin
      const profitIncreasePerUnit = targetProfitPerUnit - currentProfitPerUnit;
      const expectedProfit = (product.monthly_sales || 1) * profitIncreasePerUnit;
      
      return [{
        customer_email: customerEmail,
        title: `שיפור רווחיות: ${product.name}`,
        description: `המוצר "${product.name}" מוכר כרגע ברווח של ${marginPercentage.toFixed(1)}% בלבד. המלצה להעלות מחיר או למצוא ספק זול יותר.`,
        category: "pricing",
        expected_profit: Math.round(Math.max(expectedProfit, 0)), // Ensure non-negative expected profit
        profit_percentage: 30 - marginPercentage,
        priority: marginPercentage < 10 ? "high" : "medium",
        implementation_effort: "low",
        timeframe: "1-2 שבועות",
        affected_products: [product.id].filter(Boolean),
        affected_product_names: [product.name],
        action_steps: [
          "בדוק מחירי מתחרים",
          "שקול העלאת מחיר בהדרגה",
          "חפש ספקים חלופיים",
          "נתח עמידות הביקוש למחיר גבוה יותר"
        ],
        trigger_condition: "low_margin",
        related_data: {
          current_margin: marginPercentage,
          current_cost: costPrice,
          current_price: sellingPrice,
          recommended_margin: 30
        }
      }];
    }

    return [];
  } catch (error) {
    console.error(`Error in margin analysis for product ${product.name}:`, error);
    return [];
  }
};

const analyzeInventoryLevels = async (product, customerEmail) => {
  try {
    const inventory = product.inventory || 0;
    const monthlySales = product.monthly_sales || 0;
    
    // Only analyze if we have meaningful data
    if (monthlySales === 0) {
      // If no sales, cannot calculate months of inventory meaningfully for sales-based analysis.
      // If there's inventory but no sales, it's an extreme overstock.
      if (inventory > 0) {
          const tiedUpCapital = inventory * (product.cost_price || 0);
          return [{
            customer_email: customerEmail,
            title: `עודף מלאי חמור: ${product.name}`,
            description: `יש לך מלאי של ${inventory} יחידות מ"${product.name}" אך אין מכירות כלל. יש לשקול פעולה מיידית להיפטר מהמלאי.`,
            category: "inventory",
            expected_profit: Math.round(tiedUpCapital * 0.2), // Higher potential savings if no sales
            priority: "high",
            implementation_effort: "high",
            timeframe: "מיידי",
            affected_products: [product.id].filter(Boolean),
            affected_product_names: [product.name],
            action_steps: [
              "הפעל מבצע מכירה אגרסיבי",
              "שקול חיסול מלאי",
              "בדוק אפשרות החזרה לספק",
              "הפסק רכישות עתידיות לחלוטין"
            ],
            trigger_condition: "extreme_overstock_no_sales",
            related_data: {
              current_inventory: inventory,
              monthly_sales: monthlySales,
              months_supply: Infinity, // Or simply indicate no sales
              tied_up_capital: tiedUpCapital
            }
          }];
      }
      return [];
    }

    const monthsOfInventory = inventory / monthlySales;
    const recommendations = [];

    // Overstock situation (more than 6 months supply)
    if (monthsOfInventory > 6) {
      const tiedUpCapital = inventory * (product.cost_price || 0);
      
      recommendations.push({
        customer_email: customerEmail,
        title: `עודף מלאי: ${product.name}`,
        description: `יש לך מלאי של ${inventory} יחידות מ"${product.name}", מה שמספיק ל-${monthsOfInventory.toFixed(1)} חודשים. שקול הפחתת המלאי.`,
        category: "inventory",
        expected_profit: Math.round(tiedUpCapital * 0.1), // 10% of tied up capital as potential savings
        priority: monthsOfInventory > 12 ? "high" : "medium",
        implementation_effort: "medium",
        timeframe: "1-3 חודשים",
        affected_products: [product.id].filter(Boolean),
        affected_product_names: [product.name],
        action_steps: [
          "הפעל מבצע מכירה",
          "שקול מתן הנחה",
          "בדוק אפשרות החזרה לספק",
          "הפחת הזמנות עתידיות"
        ],
        trigger_condition: "overstock",
        related_data: {
          current_inventory: inventory,
          monthly_sales: monthlySales,
          months_supply: monthsOfInventory,
          tied_up_capital: tiedUpCapital
        }
      });
    }
    
    // Understock situation (less than 1 month supply)
    else if (monthsOfInventory < 1) {
      const potentialLostSales = monthlySales * (product.selling_price || 0) * 0.2; // Assume 20% lost sales if stock is low
      
      recommendations.push({
        customer_email: customerEmail,
        title: `מחסור במלאי: ${product.name}`,
        description: `המלאי של "${product.name}" נמוך (${inventory} יחידות), מה שמספיק לפחות מחודש. יש סיכון לאיבוד מכירות.`,
        category: "inventory",
        expected_profit: Math.round(potentialLostSales),
        priority: "high",
        implementation_effort: "low",
        timeframe: "מיידי",
        affected_products: [product.id].filter(Boolean),
        affected_product_names: [product.name],
        action_steps: [
          "הזמן מלאי נוסף מיידית",
          "בדוק זמני אספקה",
          "שקול הזמנת מלאי חירום",
          "עדכן תחזית ביקוש"
        ],
        trigger_condition: "understock",
        related_data: {
          current_inventory: inventory,
          monthly_sales: monthlySales,
          months_supply: monthsOfInventory,
          potential_lost_sales: potentialLostSales
        }
      });
    }

    return recommendations;
  } catch (error) {
    console.error(`Error in inventory analysis for product ${product.name}:`, error);
    return [];
  }
};

// Placeholder for analyzeBundleOpportunities as it's called in analyzeProductsAndGenerateRecommendations
const analyzeBundleOpportunities = async (products, allProducts, customerEmail) => {
  try {
    // This is a stub. Real implementation would involve more complex logic
    // to identify products that could be bundled together for increased sales.
    // For now, it will return an empty array.
    console.log(`Analyzing bundle opportunities for ${products.length} products out of ${allProducts.length} total products for ${customerEmail}`);
    return [];
  } catch (error) {
    console.error("Error in bundle analysis:", error);
    return [];
  }
};
