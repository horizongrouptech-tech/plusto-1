import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// פונקציית עזר לקריאה ל-AI עם מנגנון ניסיון חוזר
async function invokeLLMWithRetry(base44, prompt, schema, addContextFromInternet = false, maxRetries = 3) {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`LLM Invocation - Attempt ${attempt + 1}/${maxRetries}`);
            const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: schema,
                add_context_from_internet: addContextFromInternet
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
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
                status: 405,
                headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
            });
        }

        const { customer_email, user, forecastType, strategicInput, services_data } = await req.json();

        console.log('=== Starting Sales Forecast AI Generation (Goal-Oriented & Market-Based) ===');

        if (!services_data || services_data.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                sales_forecast: [],
                products_included_count: 0,
                total_catalog_size: 0,
                message: 'No products provided, returning empty forecast.'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        console.log(`Received ${services_data.length} products for sales forecast`);

        const uniqueCategories = [...new Set(services_data.map(p => p.category).filter(Boolean))];
        const productDetailsForAI = services_data.slice(0, 50).map(p => ({
            name: p.service_name || p.product_name,
            category: p.category,
            selling_price: p.selling_price,
            cost_price: p.cost_price,
            gross_margin: p.selling_price && p.cost_price ? ((p.selling_price - p.cost_price) / p.selling_price * 100).toFixed(1) + '%' : 'N/A'
        }));

        // חילוץ יעדים פיננסיים
        const desiredMonthlyRevenue = strategicInput?.desired_monthly_revenue || 0;
        const desiredMonthlyNetProfit = strategicInput?.desired_monthly_net_profit || 0;
        const personalTakeHome = strategicInput?.personal_take_home_pay_goal || 0;
        const visionText = strategicInput?.vision_for_next_year || 'לא סופק חזון';

        // חישוב יעד הכנסות שנתי
        const targetAnnualRevenue = desiredMonthlyRevenue * 12;

        const forecastTone = forecastType === 'optimistic' ? 
            'תחזית אופטימית (צמיחה של 15-25%): התמקד בהזדמנויות שוק, חדשנות וגידול אגרסיבי. נסה להגיע ליעד ההכנסות השנתי המבוקש.' : 
            'תחזית שמרנית (צמיחה של 5-10%): התמקד ביציבות, צמיחה מבוקרת וניהול סיכונים. נסה להגיע ליעד ההכנסות השנתי המבוקש באופן מציאותי.';

        const salesPrompt = `
        אתה יועץ עסקי אסטרטגי בכיר עם התמחות בניתוח שוק ותכנון מכירות. משימתך היא ליצור תחזית מכירות שנתית, חודשית ויחידתית עבור עסק מסוג "${user.business_type}" בישראל.

        **נתוני העסק:**
        - סוג העסק: ${user.business_type}
        - גודל החברה: ${user.company_size || 'לא צוין'}
        - מחזור חודשי משוער נוכחי: ₪${user.monthly_revenue?.toLocaleString() || 'לא צוין'}

        **חזון בעל העסק:**
        "${visionText}"

        **יעדים פיננסיים שהוגדרו על ידי בעל העסק:**
        - יעד הכנסות חודשי ממוצע: ₪${desiredMonthlyRevenue?.toLocaleString() || 'לא הוגדר'}
        - יעד הכנסות שנתי (מחושב): ₪${targetAnnualRevenue?.toLocaleString() || 'לא הוגדר'}
        - יעד רווח נקי חודשי ממוצע: ₪${desiredMonthlyNetProfit?.toLocaleString() || 'לא הוגדר'}
        - סכום רצוי לקיחה הביתה חודשית: ₪${personalTakeHome?.toLocaleString() || 'לא הוגדר'}

        **פרטי קטגוריות ומוצרים לדוגמה (עד 50 מוצרים):**
        ${JSON.stringify(productDetailsForAI, null, 2)}
        
        **קטגוריות מוצרים עיקריות בעסק:** ${uniqueCategories.join(', ')}

        **דרישות התחזית (החזר אך ורק JSON תקין לפי הסכימה):**
        
        1. **סוג התחזית והטון:** ${forecastTone}
        
        2. **התאמה ליעדי ההכנסות:**
           - **קריטי:** התחזית חייבת להיות מכוונת להשגת יעד ההכנסות השנתי של ₪${targetAnnualRevenue?.toLocaleString()}.
           - פזר את המכירות בין המוצרים בצורה מאוזנת, תוך התחשבות במחיר המכירה של כל מוצר ובפוטנציאל הקטגוריה שלו.
           - מוצרים עם מחיר גבוה יותר יכולים לקבל כמויות נמוכות יותר אך עם תרומה גבוהה יותר למחזור.
           - מוצרים עם שולי רווח גבוהים יכולים לקבל עדיפות גבוהה יותר בתחזית.

        3. **מחקר שוק ועונתיות:** 
           - בצע מחקר שוק אינטליגנטי (השתמש בידע האינטרנטי שלך) כדי לאמוד פוטנציאל מכירות חודשי **לקטגוריות המוצרים** הרשומות לעיל.
           - התחשב בסוג העסק, גודלו, המחזור המשוער ו**במגמות עונתיות טיפוסיות בישראל** (חגים, חופשות, אירועים מיוחדים).
           
        4. **פיזור למודל מוצר-חודש:** 
           - עבור כל מוצר שהוזן ב-services_data, צור תחזית מכירות חודשית (ינואר-דצמבר) ביחידות.
           - **אין להשתמש במספרים קבועים** כמו '10' או '100'. צור פיזור ריאליסטי ומגוון של יחידות לאורך השנה.
           - התחזית לכל מוצר צריכה לשקף את הפוטנציאל של הקטגוריה שלו, מחיר המכירה שלו, והעונתיות הכללית.
           - **ודא שסך כל ההכנסות השנתיות (מכפלת כמויות * מחירי מכירה) יתקרב ליעד ההכנסות השנתי של ₪${targetAnnualRevenue?.toLocaleString()}.**
           
        5. **הגיון עסקי:**
           - ודא שסך היחידות השנתיות לכל מוצר, והפיזור החודשי, הגיוניים ומשקפים עונתיות וביקוש מבוסס מחקר שוק.
           - התחזית חייבת להיות מציאותית ולא מנופחת באופן מלאכותי.
        `;

        const salesSchema = {
            type: "object",
            properties: {
                monthly_sales_forecast: {
                    type: "array",
                    description: "תחזית מכירות חודשית בכמויות עבור כל מוצר.",
                    items: {
                        type: "object",
                        properties: {
                            product_name: { type: "string" },
                            monthly_quantities: { 
                                type: "array", 
                                items: { type: "number" }, 
                                minItems: 12, 
                                maxItems: 12,
                                description: "מערך של 12 כמויות מכירה (ינואר-דצמבר)"
                            }
                        },
                        required: ["product_name", "monthly_quantities"]
                    }
                },
                total_projected_annual_revenue: {
                    type: "number",
                    description: "סך ההכנסות השנתיות הצפויות מהתחזית (לאימות)"
                },
                alignment_notes: {
                    type: "string",
                    description: "הערות על מידת ההתאמה של התחזית ליעד ההכנסות המבוקש"
                }
            },
            required: ["monthly_sales_forecast"]
        };

        console.log("Generating sales forecast using AI with financial goals...");
        let llmResult;
        try {
            llmResult = await invokeLLMWithRetry(base44, salesPrompt, salesSchema, true);

            if (!llmResult || !llmResult.monthly_sales_forecast || llmResult.monthly_sales_forecast.length === 0) {
                throw new Error("AI returned an empty or invalid sales forecast. Falling back to default values.");
            }

            console.log('Sales forecast AI generation completed successfully');
            console.log(`Projected annual revenue from AI: ₪${llmResult.total_projected_annual_revenue?.toLocaleString() || 'N/A'}`);
            console.log(`Alignment notes: ${llmResult.alignment_notes || 'N/A'}`);

            return new Response(JSON.stringify({
                success: true,
                sales_forecast: llmResult.monthly_sales_forecast,
                products_included_count: services_data.length,
                total_catalog_size: services_data.length,
                projected_annual_revenue: llmResult.total_projected_annual_revenue,
                alignment_notes: llmResult.alignment_notes
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });

        } catch (error) {
            console.error('Error in Sales Forecast AI generation. Returning default forecast:', error);
            
            // חישוב כמות ברירת מחדל שתנסה להגיע ליעד
            const avgSellingPrice = services_data.reduce((sum, p) => sum + (p.selling_price || 0), 0) / services_data.length;
            const targetMonthlyUnits = avgSellingPrice > 0 ? Math.ceil(desiredMonthlyRevenue / avgSellingPrice / services_data.length) : 10;
            
            const defaultSalesForecast = services_data.map(p => ({
                product_name: p.product_name || p.service_name || 'Unknown Product',
                monthly_quantities: Array(12).fill(Math.max(targetMonthlyUnits, 5))
            }));

            return new Response(JSON.stringify({
                success: true,
                sales_forecast: defaultSalesForecast,
                products_included_count: services_data.length,
                total_catalog_size: services_data.length,
                message: `AI generation failed, returned default forecast aimed at revenue goal. Error: ${error.message}`
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
    } catch (error) {
        console.error('Critical error in Sales Forecast AI generation outside LLM call:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to generate sales forecast due to an unexpected error.'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});