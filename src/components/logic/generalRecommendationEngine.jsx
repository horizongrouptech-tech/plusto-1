import { Recommendation } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';


/**
 * מנוע יצירת המלצות כלליות לפי תיאור מהמשתמש
 */

export const generateGeneralRecommendation = async (customer, description, progressCallback = null) => {
  try {
    if (progressCallback) progressCallback(10, 'מנתח את התיאור...');

    if (progressCallback) progressCallback(30, 'מייצר המלצה מותאמת אישית...');

    const generalRecommendationPrompt = `
אתה יועץ עסקי מומחה בישראל. צור המלצה כללית עבור ${customer.business_name || customer.full_name}, עסק מסוג ${customer.business_type}.

**הקשר העסקי:**
- מחזור חודשי: ₪${(customer.monthly_revenue || 0).toLocaleString()}
- יעדים עסקיים: ${customer.business_goals || 'הגדלת רווחיות'}
- קהל יעד: ${customer.target_customers || customer.target_audience || 'לא צוין'}

**הבקשה להמלצה:**
${description}

**הוראות ליצירת המלצה:**
1. צור המלצה כללית ומותאמת לבקשה
2. התמקד בהמלצות מעשיות וניתנות ליישום
3. הצע שלבי פעולה ברורים ומפורטים (לפחות 4-5 שלבים)
4. חשב פוטנציאל רווח ריאלי אם אפשר
5. זהה את הקטגוריה המתאימה ביותר
6. כתוב בעברית בלבד ללא אימוג'י או סמלים

**קטגוריות אפשריות:**
- pricing: תמחור
- bundles: בנדלים
- promotions: מבצעים
- suppliers: ספקים
- inventory: מלאי
- operations: תפעול
- marketing: שיווק
- strategic_moves: מהלכים אסטרטגיים

צור המלצה אחת מפורטת ואיכותית.
`;

    const response = await InvokeLLM({
      prompt: generalRecommendationPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { 
            type: "string", 
            enum: ["pricing", "bundles", "promotions", "suppliers", "inventory", "operations", "marketing", "strategic_moves"] 
          },
          expected_profit: { type: "number" },
          action_steps: { 
            type: "array", 
            items: { type: "string" },
            minItems: 4
          },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          related_data: {
            type: "object",
            additionalProperties: true
          }
        },
        required: ["title", "description", "category", "action_steps"]
      }
    });

    if (progressCallback) progressCallback(90, 'שומר את ההמלצה במערכת...');

    // שמירת ההמלצה
    const savedRecommendation = await Recommendation.create({
      ...response,
      customer_email: customer.email,
      status: 'pending',
      delivery_status: 'not_sent',
      source: 'admin_generated',
      admin_notes: `המלצה כללית שנוצרה לפי תיאור: "${description.substring(0, 100)}..."`,
      related_data: {
        ...response.related_data,
        is_general: true,
        user_description: description,
        generation_method: 'description_based',
        generation_date: new Date().toISOString()
      }
    });

    if (progressCallback) progressCallback(100, 'המלצה כללית נוצרה בהצלחה!');

    return {
      success: true,
      recommendation: savedRecommendation
    };

  } catch (error) {
    console.error("Error generating general recommendation:", error);
    return {
      success: false,
      error: `יצירת המלצה כללית נכשלה: ${error.message}`
    };
  }
};

export default generateGeneralRecommendation;