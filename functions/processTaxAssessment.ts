import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, file_name, customer_email } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'Missing file_url' }, { status: 400 });
        }

        console.log(`Processing Tax Assessment for ${customer_email}`);

        const prompt = `
        ניתוח הודעת שומה שנתית (מס הכנסה - מדינת ישראל).
        אנא חלץ את הנתונים הבאים מהדוח בצורה מדויקת. שים לב לנתוני "חישוב נפרד" או "חישוב מאוחד" וחלץ את העמודה הרלוונטית (לרוב העמודה עם המספרים הגדולים יותר או הסיכום).
        
        הנתונים לחילוץ:
        1. שנת המס (Tax Year).
        2. ס"ה הכנסות (Total Income) - סעיף 1 בטבלה.
        3. הכנסה חייבת במס (Taxable Income) - ההכנסה שעליה מחושב המס.
        4. ס"ה זיכויים (Total Credits).
        5. מס לתשלום / להחזר (Tax Balance) - הסכום הסופי לתשלום או להחזר. אם המספר במינוס זה החזר, אם בפלוס זה חוב. ציין זאת בבירור.
        6. מחזור עסק (Business Turnover) - לרוב מופיע בסעיף 8 "פרטים נוספים" תחת "מחזור למיקד" או "מחזור עסק".
        7. פירוט הכנסות (Income Details): כמה מעסק, כמה ממשכורת.
        8. ניכויים (Deductions): הפקדות לקופות גמל/פנסיה וכו'.
        
        החזר JSON בפורמט הבא:
        {
            "tax_year": number,
            "total_income": number,
            "taxable_income": number,
            "total_credits": number,
            "final_tax_balance": number,
            "is_refund": boolean, // true if negative number (refund), false if debt
            "business_turnover": number,
            "income_breakdown": {
                "business": number,
                "salary": number,
                "other": number
            },
            "deductions_summary": {
                "pension_deposit": number,
                "social_security": number
            },
            "assessment_date": "string (DD/MM/YYYY)",
            "file_number": "string"
        }
        `;

        const extractionResult = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    tax_year: { type: "number" },
                    total_income: { type: "number" },
                    taxable_income: { type: "number" },
                    total_credits: { type: "number" },
                    final_tax_balance: { type: "number" },
                    is_refund: { type: "boolean" },
                    business_turnover: { type: "number" },
                    income_breakdown: { 
                        type: "object",
                        properties: {
                            business: { type: "number" },
                            salary: { type: "number" },
                            other: { type: "number" }
                        }
                    },
                    deductions_summary: {
                        type: "object",
                        properties: {
                            pension_deposit: { type: "number" },
                            social_security: { type: "number" }
                        }
                    },
                    assessment_date: { type: "string" },
                    file_number: { type: "string" }
                },
                required: ["tax_year", "final_tax_balance", "is_refund"]
            }
        });

        // Generate Insights / Recommendations
        let recommendations = [];
        if (extractionResult.is_refund) {
            recommendations.push("מגיע לך החזר מס! מומלץ לוודא שפרטי חשבון הבנק מעודכנים ברשות המסים.");
            if (Math.abs(extractionResult.final_tax_balance) > 10000) {
                recommendations.push("ההחזר גבוה יחסית. מומלץ לשקול הקטנת מקדמות מס הכנסה לשנה הבאה לשיפור תזרים המזומנים.");
            }
        } else {
            recommendations.push("ישנה יתרת חוב למס הכנסה. מומלץ להסדיר תשלום בהקדם למניעת ריביות.");
            if (extractionResult.final_tax_balance > 5000) {
                recommendations.push("חוב המס משמעותי. מומלץ לבדוק האם המקדמות ששולמו במהלך השנה היו נמוכות מדי ולעדכן אותן.");
            }
        }

        if (extractionResult.business_turnover > 0 && extractionResult.total_income > 0) {
            const profitMargin = extractionResult.taxable_income / extractionResult.business_turnover;
            if (profitMargin < 0.10) {
                recommendations.push("שיעור ההכנסה החייבת ביחס למחזור נמוך (פחות מ-10%). כדאי לבדוק את מבנה ההוצאות.");
            }
        }

        return Response.json({
            success: true,
            data: extractionResult,
            recommendations: recommendations
        });

    } catch (error) {
        console.error("Error processing Tax Assessment:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});