import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// פונקציית עזר לקריאה ל-AI עם מנגנון ניסיון חוזר
async function invokeLLMWithRetry(base44, prompt, schema, maxRetries = 3) {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`LLM Invocation - Attempt ${attempt + 1}/${maxRetries}`);
            const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: schema
            });

            if (!result || Object.keys(result).length === 0) {
                 throw new Error(`InvokeLLM returned an empty or invalid response on attempt ${attempt + 1}`);
            }
            return result; 
        } catch (error) {
            lastError = error;
            if (error.status === 429 && attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
                console.warn(`Rate limit exceeded. Retrying in ${Math.round(delay / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`LLM invocation failed after ${attempt + 1} attempts.`, error);
                throw error;
            }
        }
    }
    throw lastError;
}

Deno.serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    const base44 = createClientFromRequest(req);
    
    // בדיקת אימות
    if (!(await base44.auth.isAuthenticated())) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Unauthorized' 
        }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Method not allowed' 
            }), {
                status: 405,
                headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
            });
        }

        const { customer_email, user, forecastType, strategicInput } = await req.json();

        console.log('=== Starting Expense Forecast AI Generation (Goal-Oriented) ===');

        // חילוץ יעדים פיננסיים
        const desiredMonthlyRevenue = strategicInput?.desired_monthly_revenue || 0;
        const desiredMonthlyNetProfit = strategicInput?.desired_monthly_net_profit || 0;
        const personalTakeHome = strategicInput?.personal_take_home_pay_goal || 0;
        const visionText = strategicInput?.vision_for_next_year || 'לא סופק חזון';

        // חישוב תקציב הוצאות משוער (כדי להגיע ליעד הרווח)
        // נוסחה בסיסית: הכנסות - הוצאות - מס = רווח נקי
        // אז: הוצאות מקסימליות = הכנסות - רווח נקי רצוי - מס משוער
        const estimatedTaxRate = 0.23;
        const profitBeforeTax = desiredMonthlyNetProfit / (1 - estimatedTaxRate);
        const maxMonthlyExpenses = desiredMonthlyRevenue - profitBeforeTax;

        const promptGrowthGuidance = forecastType === 'optimistic' ? 
            'הנח השקעה מוגברת בשיווק ופיתוח (20-30% יותר מהבסיס), תוך שמירה על יעד הרווח' : 
            'הנח הוצאות שמרניות ויציבות (5-10% גידול), תוך התמקדות ברווחיות';

        const expensePrompt = `
        אתה יועץ פיננסי ואסטרטגי בכיר. המשימה שלך היא ליצור תחזית הוצאות שנתית מקיפה עבור עסק מסוג "${user.business_type}" בשם "${user.business_name || user.full_name}".

        **סוג התחזית:** ${forecastType} (התאם את התחזיות לפי הסוג - אופטימית יותר אגרסיבית, שמרנית יותר שמרנית)

        **נתוני העסק:**
        - סוג עסק: ${user.business_type}
        - גודל חברה: ${user.company_size || 'לא צוין'}
        - מחזור חודשי מוערך: ${user.monthly_revenue?.toLocaleString() || 'לא צוין'} ש"ח

        **חזון בעל העסק:**
        "${visionText}"

        **יעדים פיננסיים שהוגדרו על ידי בעל העסק:**
        - יעד הכנסות חודשי: ₪${desiredMonthlyRevenue?.toLocaleString()}
        - יעד רווח נקי חודשי: ₪${desiredMonthlyNetProfit?.toLocaleString()}
        - סכום אישי רצוי לקיחה הביתה: ₪${personalTakeHome?.toLocaleString()}
        - **תקציב הוצאות מקסימלי חודשי משוער (כדי להגיע ליעד הרווח):** ₪${maxMonthlyExpenses?.toLocaleString()}

        **דרישות התחזית (החזר אך ורק JSON תקין לפי הסכימה):**
        
        1. **צור רשימה של הוצאות תפעוליות חודשיות קבועות** עבור שיווק (לדוגמה: פרסום דיגיטלי, SEO, עיצוב גרפי, ניהול רשתות חברתיות).
        
        2. **צור רשימה של הוצאות הנהלה וכלליות** (לדוגמה: שכירות משרד/חנות, חשבונות חשמל/מים, רו"ח, ביטוחים, אחזקה, תקשורת).
        
        3. **הערך שיעור מס חברות ריאלי** (23% בישראל).
        
        4. **התאמה ליעד הרווח:**
           - **קריטי:** סך כל ההוצאות החודשיות (שיווק + הנהלה) חייב להיות **נמוך מ-₪${maxMonthlyExpenses?.toLocaleString()}** כדי לאפשר השגת יעד הרווח.
           - ${promptGrowthGuidance}
           - אזן בין השקעה בצמיחה (שיווק) לבין שמירה על רווחיות.
           
        5. **הגיון עסקי:**
           - הוצאות השיווק צריכות להיות בטווח של 10-20% מההכנסות (תלוי בסוג התחזית).
           - הוצאות ההנהלה צריכות להיות בטווח של 10-15% מההכנסות.
           - סה"כ הוצאות לא צריך לחרוג מהתקציב המקסימלי שחושב.
        `;

        const expenseSchema = {
            type: "object",
            properties: {
                monthly_expenses: {
                    type: "object",
                    description: "הוצאות חודשיות מפורטות.",
                    properties: {
                        marketing_sales: { 
                            type: "array", 
                            items: { 
                                type: "object", 
                                properties: { 
                                    name: { type: "string" }, 
                                    monthly_amount: { type: "number" } 
                                }, 
                                required: ["name", "monthly_amount"] 
                            } 
                        },
                        admin_general: { 
                            type: "array", 
                            items: { 
                                type: "object", 
                                properties: { 
                                    name: { type: "string" }, 
                                    monthly_amount: { type: "number" } 
                                }, 
                                required: ["name", "monthly_amount"] 
                            } 
                        }
                    },
                    required: ["marketing_sales", "admin_general"]
                },
                tax_rate: { 
                    type: "number", 
                    description: "שיעור מס באחוזים (e.g., 23)." 
                },
                total_monthly_expenses: {
                    type: "number",
                    description: "סך כל ההוצאות החודשיות (לאימות)"
                },
                expense_to_revenue_ratio: {
                    type: "number",
                    description: "יחס ההוצאות להכנסות באחוזים"
                }
            },
            required: ["monthly_expenses", "tax_rate"]
        };

        // קריאה ל-AI
        console.log("Generating expense forecast using AI with financial goals...");
        const llmResult = await invokeLLMWithRetry(base44, expensePrompt, expenseSchema);

        console.log('Expense forecast AI generation completed successfully');
        console.log(`Total monthly expenses: ₪${llmResult.total_monthly_expenses?.toLocaleString() || 'N/A'}`);
        console.log(`Expense to revenue ratio: ${llmResult.expense_to_revenue_ratio?.toFixed(1) || 'N/A'}%`);

        return new Response(JSON.stringify({
            success: true,
            monthly_expenses: llmResult.monthly_expenses,
            tax_rate: llmResult.tax_rate,
            total_monthly_expenses: llmResult.total_monthly_expenses,
            expense_to_revenue_ratio: llmResult.expense_to_revenue_ratio
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('Error in Expense Forecast AI generation:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to generate expense forecast'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});