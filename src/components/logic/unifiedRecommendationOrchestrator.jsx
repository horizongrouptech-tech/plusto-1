import { Recommendation } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';




/**
 * תזמורת המלצות מאוחדת - מקבלת נתונים מוכנים ומפיקה המלצות
 * חדש: מקבלת גם סכימת JSON מותאמת
 */
export const generateUnifiedRecommendations = async (
  customer,
  prompt,
  businessData,
  dataQualityAssessment,
  options = {}, // Ensure options has a default empty object for destructuring
  hasSufficientInternalData,
  selectedSchema = null // פרמטר חדש לסכימה
) => {
  const {
    onProgress,
    focusCategories = [] // New option from outline
  } = options;

  // The updateProgress function no longer manages an internal 'progress' variable,
  // it directly calls the provided 'onProgress' callback.
  const updateProgress = (newProgress, status) => {
    if (onProgress) {
      onProgress(newProgress, status);
    }
  };

  try {
    updateProgress(55, "שולח בקשה למנוע ה-AI..."); // Updated message

    // Removed the getRecommendationSchema function as the schema is now dynamic.

    // קריאה ל-InvokeLLM עם הסכימה המתאימה - חדש
    const response = await InvokeLLM({ // Changed variable name from llmResponse to response
      prompt: prompt,
      add_context_from_internet: !hasSufficientInternalData, // Only add context if internal data is insufficient
      response_json_schema: selectedSchema || { // Use selectedSchema if provided, otherwise fallback to a simplified schema
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string", enum: ['pricing', 'promotions', 'bundles', 'suppliers', 'inventory', 'operations', 'strategic_moves'] },
                expected_profit: { type: "number" }, // New field in simplified schema
                description: { type: "string" }, // Replaces action_description from old schema
                action_steps: { type: "array", items: { type: "string" } },
                priority: { type: "string", enum: ["high", "medium", "low"] } // New field in simplified schema
              },
              required: ["title", "category", "expected_profit", "description", "action_steps", "priority"] // Updated required fields for simplified schema
            }
          }
        },
        required: ["recommendations"]
      }
    });

    updateProgress(70, "מעבד את תגובת ה-AI..."); // Updated progress and message

    // בדיקה שהתגובה תקינה
    if (!response || !response.recommendations || !Array.isArray(response.recommendations)) {
      throw new Error("תגובת ה-AI לא תקינה - חסרות המלצות"); // Updated error message
    }

    const recommendations = response.recommendations; // Store recommendations in a local variable

    if (recommendations.length === 0) { // New check for empty recommendations array
      throw new Error("ה-AI לא החזיר המלצות");
    }

    updateProgress(85, "מעבד ומעשיר את ההמלצות..."); // Updated progress and message

    // יבוא דינמי של processRecommendations
    const { processRecommendations } = await import("./enhancedRecommendationEngine");
    
    // עיבוד ההמלצות
    // The `processRecommendations` function is assumed to be robust enough to handle
    // recommendations from both detailed and simplified schemas.
    const processedRecommendations = await processRecommendations( // Renamed finalRecommendations to processedRecommendations
      recommendations, // Pass the LLM's recommendations
      customer,
      businessData,
      dataQualityAssessment
    );

    if (processedRecommendations.length === 0) { // New check for recommendations after processing
      throw new Error("לא נמצאו המלצות תקינות לאחר עיבוד");
    }

    updateProgress(90, "שומר המלצות במערכת..."); // Updated progress

    // שמירת ההמלצות בבסיס הנתונים - significantly updated based on the outline
    const savedRecommendations = [];
    for (const rec of processedRecommendations) {
      try { // Added try-catch block for individual recommendation saving
        const savedRec = await Recommendation.create({
          customer_email: customer.email,
          title: rec.title,
          description: rec.description, // Updated field, replacing action_description
          category: rec.category,
          expected_profit: rec.expected_profit || 0, // New field, replacing expected_profit_percentage
          profit_percentage: rec.profit_percentage || 0, // New field, assuming it might be added during processing
          action_steps: rec.action_steps || [],
          priority: rec.priority || 'medium', // New field
          status: 'pending',
          delivery_status: 'not_sent',
          bundle_name_concept: rec.bundle_name_concept || null,
          recommended_bundle_price: rec.recommended_bundle_price || null,
          individual_items_total_price: rec.individual_items_total_price || null,
          profit_impact_details: rec.profit_impact_details || null,
          // New `related_data` field for generation context
          related_data: {
            ...(rec.related_data || {}), // Preserve any existing related_data
            generation_method: hasSufficientInternalData ? 'data_based' : 'market_research_based',
            schema_used: hasSufficientInternalData ? 'detailed' : 'simplified'
          }
          // Fields from the old detailed schema (e.g., inventory_sell_value, product_context, observation, suggestion_1)
          // are no longer explicitly saved unless they are part of the `rec` object via `related_data` or other means.
        });
        savedRecommendations.push(savedRec);
      } catch (saveError) {
        console.warn("Failed to save recommendation:", rec.title, saveError); // Log a warning for failed saves
      }
    }

    updateProgress(100, "התהליך הושלם בהצלחה!"); // Final progress update with new message

    return { // Updated return object structure
      success: true,
      recommendations: savedRecommendations,
      summary: {
        total_generated: recommendations.length,
        total_saved: savedRecommendations.length,
        data_quality: dataQualityAssessment.completenessStatus, // Changed to completenessStatus
        generation_method: hasSufficientInternalData ? 'data_based' : 'market_research_based'
      }
    };

  } catch (error) {
    console.error("Error in unified recommendation orchestrator:", error);
    throw error;
  }
};
