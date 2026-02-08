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

        console.log('=== Starting Employee Forecast AI Generation (Goal-Oriented) ===');

        // חילוץ יעדים פיננסיים
        const desiredMonthlyRevenue = strategicInput?.desired_monthly_revenue || 0;
        const desiredMonthlyNetProfit = strategicInput?.desired_monthly_net_profit || 0;
        const personalTakeHome = strategicInput?.personal_take_home_pay_goal || 0;
        const visionText = strategicInput?.vision_for_next_year || 'לא סופק חזון';

        // חישוב תקציב שכר משוער (בדרך כלל 30-40% מההכנסות)
        const estimatedMonthlySalaryBudget = desiredMonthlyRevenue * 0.35;

        const promptGrowthGuidance = forecastType === 'optimistic' ? 
            'הנח גידול בכוח האדם של 20-30%, עם גיוסים אגרסיביים במהלך השנה' : 
            'הנח גידול מתון בכוח האדם של 5-15%, עם גיוסים נבחרים ומדודים';

        const employeePrompt = `
        אתה יועץ משאבי אנוש ופיננסי בכיר. המשימה שלך היא ליצור תחזית כוח אדם ושכר שנתית מקיפה עבור עסק מסוג "${user.business_type}" בשם "${user.business_name || user.full_name}".

        **סוג התחזית:** ${forecastType} (התאם את התחזיות לפי הסוג - אופטימית יותר אגרסיבית, שמרנית יותר שמרנית)

        **נתוני העסק:**
        - סוג עסק: ${user.business_type}
        - גודל חברה נוכחי: ${user.company_size || 'לא צוין'}
        - מחזור חודשי מוערך: ${user.monthly_revenue?.toLocaleString() || 'לא צוין'} ש"ח

        **חזון בעל העסק:**
        "${visionText}"

        **יעדים פיננסיים:**
        - יעד הכנסות חודשי: ₪${desiredMonthlyRevenue?.toLocaleString()}
        - יעד רווח נקי חודשי: ₪${desiredMonthlyNetProfit?.toLocaleString()}
        - סכום אישי רצוי לקיחה הביתה: ₪${personalTakeHome?.toLocaleString()}
        - תקציב שכר חודשי משוער (35% מההכנסות): ₪${estimatedMonthlySalaryBudget?.toLocaleString()}

        **דרישות התחזית (החזר אך ורק JSON תקין לפי הסכימה):**
        
        1. **צור רשימה ריאליסטית של עובדים קיימים (2-5 עובדים)** ותפקידים, כולל שכר חודשי מתאים לסוג העסק וגודל החברה.
           - ודא שסך השכר הכולל של העובדים הקיימים נמצא בטווח ריאלי ביחס לתקציב השכר המשוער.
           
        2. **תכנן 1-3 גיוסים חדשים במהלך השנה** בחודשים הגיוניים, בהתאם ל-${promptGrowthGuidance}.
           - התחשב ביעד הרווח: אם יעד הרווח גבוה, יש לשמור על עלויות שכר סבירות.
           - אם בעל העסק רוצה לקחת ₪${personalTakeHome?.toLocaleString()} הביתה, ודא שמבנה השכר מאפשר זאת (יש לכלול אותו כ"בעלים/מנכ"ל" אם רלוונטי).
           
        3. **הגיון עסקי:**
           - תקציב השכר הכולל (עובדים קיימים + גיוסים חדשים לאורך שנה) לא צריך לחרוג באופן משמעותי מ-40% של ההכנסות החודשיות הממוצעות.
           - אם יעד הרווח גבוה, יש לאזן בין גיוסים לבין שמירה על רווחיות.
        `;

        const employeeSchema = {
            type: "object",
            properties: {
                employees: {
                    type: "array",
                    description: "רשימת עובדים קיימים עם שכר חודשי.",
                    items: {
                        type: "object",
                        properties: { 
                            role: { type: "string" }, 
                            salary: { type: "number" } 
                        },
                        required: ["role", "salary"]
                    }
                },
                new_hires: {
                    type: "array",
                    description: "גיוסים מתוכננים במהלך השנה.",
                    items: {
                        type: "object",
                        properties: { 
                            role: { type: "string" }, 
                            count: { type: "number" }, 
                            hire_month: { type: "number" }, 
                            monthly_salary: { type: "number" } 
                        },
                        required: ["role", "count", "hire_month", "monthly_salary"]
                    }
                },
                owner_salary_included: {
                    type: "boolean",
                    description: "האם שכר הבעלים/המנכ\"ל כלול ברשימת העובדים הקיימים"
                },
                total_annual_salary_cost: {
                    type: "number",
                    description: "סך עלות השכר השנתית המשוערת (לאימות)"
                }
            },
            required: ["employees", "new_hires"]
        };

        // קריאה ל-AI
        console.log("Generating employee forecast using AI with financial goals...");
        const llmResult = await invokeLLMWithRetry(base44, employeePrompt, employeeSchema);

        console.log('Employee forecast AI generation completed successfully');
        console.log(`Total annual salary cost: ₪${llmResult.total_annual_salary_cost?.toLocaleString() || 'N/A'}`);

        return new Response(JSON.stringify({
            success: true,
            employees: llmResult.employees,
            new_hires: llmResult.new_hires,
            owner_salary_included: llmResult.owner_salary_included,
            total_annual_salary_cost: llmResult.total_annual_salary_cost
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('Error in Employee Forecast AI generation:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to generate employee forecast'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});