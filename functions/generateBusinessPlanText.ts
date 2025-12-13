
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const compensationModelsExamples = `
{
    "business_type": "קמעונאות זעירה",
    "role": "אחראי משמרת קיוסק",
    "role_definition": "אחריות כוללת לפתיחה/סגירה, סדר וארגון, מלאי לפי FIFO, צירוף למועדון לקוחות, וקידום מבצעי הרשת.",
    "compensation": { "base": { "type": "hourly", "amount_nis": 35 } }
},
{
    "business_type": "שירות לקוחות", 
    "role": "נציג שירות לקוחות",
    "role_definition": "מתן מענה מקצועי, טיפול בפניות, תמיכה טכנית בסיסית וזיהוי הזדמנויות למכירה.",
    "compensation": { "base": { "type": "monthly_global", "amount_nis": 7500 }, "bonuses": [{ "name": "בונוס על עסקאות יוצאות", "type": "percentage_of_deal", "calculation": "5% מסכום העסקה שנסגרה" }] }
},
{
    "business_type": "שירותים לבעלי חיים",
    "role": "מנהל סניף ברשת מזון וציוד לבעלי חיים", 
    "role_definition": "ניהול תפעולי מלא של הסניף, אחריות על צוות, מלאי, מכירות, שירות לקוחות ויעדים.",
    "compensation": { "base": { "type": "monthly_global", "amount_nis": 10000 }, "bonuses": [{ "name": "בונוס רווח סניפי", "type": "recurring", "calculation": "2% מהרווח הנקי של הסניף" }] }
},
{
    "business_type": "השכלה והכשרה",
    "role": "יועץ לימודים ומוכר קורסים",
    "role_definition": "ליווי מתעניינים בתהליך בחירת מסלול לימודים, מתן מידע, וסגירת עסקאות רישום לקורסים.", 
    "compensation": { "base": { "type": "monthly_global", "amount_nis": 8000 }, "bonuses": [{ "name": "תחרות נקודות שנתית", "type": "points_competition", "calculation": "פרסים מדורגים על בסיס צבירת נקודות שנתיות על מכירות" }] }
}
`;

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

    try {
        console.log('=== Starting generateBusinessPlanText ===');
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }

        const body = await req.json();
        console.log('Request body received:', { hasForecast: !!body.forecastId, hasStrategicInput: !!body.strategicInputId });

        const { forecastId, strategicInputId } = body;
        if (!forecastId) {
            return new Response(JSON.stringify({ error: "Missing forecastId for text generation" }), { status: 400 });
        }

        // Fetch the required data for text generation
        const forecast = await base44.entities.BusinessForecast.get(forecastId);
        const customerData = await base44.entities.User.filter({ email: forecast.customer_email });
        const customer = customerData[0];
        let strategicInput = null;
        if (strategicInputId) {
            strategicInput = await base44.entities.StrategicPlanInput.get(strategicInputId);
        }

        if (!forecast || !customer) {
            throw new Error('Could not retrieve forecast or customer data for text generation');
        }

        // Call the internal function to generate the text
        const generatedText = await generateBusinessPlanTextInternal(base44, forecast, customer, strategicInput);

        // Update the forecast entity with the generated text
        await base44.entities.BusinessForecast.update(forecastId, {
            business_plan_text: generatedText
        });

        return new Response(JSON.stringify({
            success: true,
            business_plan_text: generatedText,
            forecastId: forecastId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

    } catch (error) {
        console.error('Error in generateBusinessPlanText:', error);
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: error.message || 'Failed to generate business plan text' 
            }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
});

async function generateBusinessPlanTextInternal(base44, forecast, customer, strategicInput) {
    console.log('=== Generating Business Plan Text Internal ===');
    
    // עובדים מתוכננים לגיוס + מודלי תגמול
    const plannedHiresText = forecast.planned_employee_hires?.map(hire => {
        let compensationDetails = '';
        if (hire.compensation_model) {
            compensationDetails += `    - מודל בסיס: ${hire.compensation_model.base.type} (${hire.compensation_model.base.amount_nis} ש"ח)`;
            if (hire.compensation_model.bonuses && hire.compensation_model.bonuses.length > 0) {
                compensationDetails += `\n    - בונוסים: ${hire.compensation_model.bonuses.map(b => `${b.name} (${b.type}): ${b.calculation}`).join(', ')}`;
            }
            if (hire.compensation_model.discretionary_awards) {
                compensationDetails += `\n    - תגמולים חופשיים: ${hire.compensation_model.discretionary_awards}`;
            }
        }
        return `
        - תפקיד: ${hire.role} (${hire.count} עובד/ים)
        - חודש גיוס: ${hire.month_of_hire}
        - שכר חודשי משוער: ${hire.estimated_monthly_salary} ש"ח
${compensationDetails ? `\n${compensationDetails}` : ''}
        `;
    }).join('\n') || 'אין גיוסים מתוכננים.';

    const prompt = `
    אתה יועץ עסקי אסטרטגי ומנהל כספים. עליך לכתוב תוכנית עסקית מקיפה ומפורטת עבור העסק "${customer.business_name}" לשנת ${forecast.forecast_year}.
    התוכנית צריכה להיות מקצועית, ממוקדת, מעמיקה, בעלת מבנה ברור ועיצוב אלגנטי בפורמט Markdown.
    התמקד בהיבטים הפיננסיים, האסטרטגיים, וכוח האדם, כולל התייחסות למודלי תגמול שהוצעו.

    מידע על העסק:
    - שם העסק: ${customer.business_name || 'לא צוין'}
    - סוג העסק: ${customer.business_type || 'לא צוין'}
    - מחזור חודשי נוכחי: ${customer.monthly_revenue?.toLocaleString() || '0'} ש"ח
    - מיקום: ${customer.address?.city || 'לא צוין'}
    - מוצרים/שירותים עיקריים: ${customer.main_products || 'לא צוינו'}
    - יעדים עסקיים: ${customer.business_goals || 'לא צוינו'}

    תחזית מספרית מפורטת (שנתית) שהוכנה עבור העסק:
    - סך הכנסות צפויות: ${forecast.profit_loss_summary?.total_revenue?.toLocaleString() || '0'} ש"ח
    - סך הוצאות צפויות: ${forecast.profit_loss_summary?.total_expenses?.toLocaleString() || '0'} ש"ח
    - רווח גולמי צפוי: ${forecast.profit_loss_summary?.gross_profit?.toLocaleString() || '0'} ש"ח
    - רווח נקי צפוי (אחרי מס): ${forecast.profit_loss_summary?.net_profit?.toLocaleString() || '0'} ש"ח

    תכנון כוח אדם וגיוסים עתידיים:
    ${plannedHiresText}

    הוצאות מפורטות מתוכננות (חודשיות ממוצעות):
    ${forecast.detailed_expenses?.marketing_sales?.length > 0 ? `- שיווק ומכירות: ${forecast.detailed_expenses.marketing_sales.map(e => `${e.name} (${e.amount?.toLocaleString()} ש"ח)`).join(', ')}\n` : ''}
    ${forecast.detailed_expenses?.admin_general?.length > 0 ? `- הנהלה וכלליות: ${forecast.detailed_expenses.admin_general.map(e => `${e.name} (${e.amount?.toLocaleString()} ש"ח)`).join(', ')}\n` : ''}

    דוגמאות למבנה מודלי תגמול לעובדים (לשימוש בתיאור מודלי התגמול בתוכנית):
    ${compensationModelsExamples}

    מידע אסטרטגי נוסף מהלקוח (משאלון קלט אסטרטגי):
    ${strategicInput ? `
    - חזון לשנה הבאה: ${strategicInput.vision_for_next_year || 'לא סופק'}
    - מטרות ארוכות טווח (3 שנים): ${strategicInput.three_year_profit_goal || 'לא סופק'}
    - סיבות אמיתיות להקמת העסק: ${strategicInput.real_reasons || 'לא סופק'}
    - אתגרים עיקריים שצפויים: ${strategicInput.main_challenges || 'לא סופקו'}
    - תרבות ארגונית רצויה: ${strategicInput.desired_culture || 'לא סופקה'}
    - בידול עסקי: ${strategicInput.business_differentiation?.value_for_money || 'לא צוין בידול'}
    ` : 'אין נתונים משאלון קלט אסטרטגי.'}

    דרישות לתוכנית העסקית:
    התוכנית חייבת לכלול את הסעיפים הבאים במבנה ברור, כותרות מודגשות ופירוט מקצועי:
    1. תקציר מנהלים: סקירה תמציתית של העסק, יעדיו ותחזיותיו העיקריות.
    2. ניתוח מצב נוכחי: תיאור המצב הנוכחי של העסק, חוזקותיו, חולשותיו, והשוק בו הוא פועל.
    3. יעדים ומטרות לשנת ${forecast.forecast_year}: פירוט יעדים כמותיים ואיכותיים.
    4. אסטרטגיית שיווק ומכירות: תוכנית להשגת יעדי ההכנסה.
    5. תוכנית כוח אדם ומודלי תגמול: פירוט תכנון הגיוסים העתידיים כפי שהם מופיעים בתחזית המספרית. עבור כל תפקיד מתוכנן לגיוס, הצג והסבר את מודל התגמול המוצע לו.
    6. תחזית פיננסית מפורטת: ניתוח ההכנסות וההוצאות הצפויות, כולל פירוט הוצאות שיווק/מכירות והנהלה/כלליות.
    7. ניתוח סיכונים והזדמנויות: זיהוי פוטנציאלים וסיכונים מול העסק.
    8. לוח זמנים ליישום: אבני דרך מרכזיות ופעולות נדרשות.

    פורמט התשובה:
    - Markdown בלבד, עם כותרות ועיצוב.
    - התוכנית צריכה להיות עשירה בפרטים אך קריאה וברורה.
    - השתמש בשפה מקצועית, אובייקטיבית ומעוררת השראה.
    - אל תכלול שום טקסט מלבד התוכנית העסקית המבוקשת.
    `;

    try {
        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: false
        });

        if (!response) {
            throw new Error('InvokeLLM returned an empty or invalid response.');
        }

        return response;
    } catch(err) {
        throw new Error(`Failed to call InvokeLLM: ${err.message}`);
    }
}
