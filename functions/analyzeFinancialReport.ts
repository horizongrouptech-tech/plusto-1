import { InvokeLLM } from "@/integrations/Core";

// פונקציה לזיהוי דוח רווח והפסד
const isFinancialReport = (headers, sheetNames) => {
    const financialKeywords = [
        'רווח', 'הפסד', 'profit', 'loss', 'הכנסות', 'revenue', 'income',
        'הוצאות', 'expenses', 'עלויות', 'costs', 'שכר', 'salary', 'wages',
        'מכר', 'cogs', 'מס', 'tax', 'נקי', 'net', 'תפעולי', 'operating'
    ];
    
    // בדיקת שמות גיליונות
    const sheetKeywordCount = sheetNames.reduce((count, name) => {
        const lowerName = name.toLowerCase();
        return count + financialKeywords.filter(keyword => lowerName.includes(keyword)).length;
    }, 0);
    
    // בדיקת כותרות
    const headerKeywordCount = headers.reduce((count, header) => {
        const lowerHeader = String(header).toLowerCase();
        return count + financialKeywords.filter(keyword => lowerHeader.includes(keyword)).length;
    }, 0);
    
    // אם יש לפחות 3 מילות מפתח פיננסיות, זה כנראה דוח פיננסי
    return (sheetKeywordCount + headerKeywordCount) >= 3;
};

Deno.serve(async (req) => {
    try {
        const { rawData, headers, sheetNames, customer_email, file_id } = await req.json();

        if (!rawData || !headers || !customer_email) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: "Missing required parameters: rawData, headers, customer_email" 
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // בדיקה אם זהו דוח פיננסי
        if (!isFinancialReport(headers, sheetNames || [])) {
            return new Response(JSON.stringify({
                success: false,
                error: "File does not appear to be a financial report",
                isFinancialReport: false
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // הכנת הנתונים לניתוח AI
        const dataForAnalysis = {
            headers: headers,
            rows: rawData.slice(0, 200), // מגביל ל-200 שורות כדי לא לחרוג מגבולות ה-prompt
            sheetNames: sheetNames || []
        };

        const analysisPrompt = `
אתה מומחה בניתוח דוחות פיננסיים. נתונים הבאים הם מתוך דוח רווח והפסד של עסק ישראלי.
עליך לנתח את הנתונים ולחלץ מהם את המידע הפיננסי המובנה.

**נתוני הקלט:**
- כותרות: ${JSON.stringify(headers)}
- שמות גיליונות: ${JSON.stringify(sheetNames || [])}
- דוגמת שורות (עד 200 ראשונות): ${JSON.stringify(rawData.slice(0, 20))}

**הוראות לניתוח:**
1. זהה את השדות הפיננסיים העיקריים מתוך הנתונים
2. חלץ את הערכים המספריים המתאימים לכל שדה
3. התייחס לכך שהנתונים יכולים להיות בעברית או באנגלית
4. זהה סעיפי הכנסות, הוצאות (כולל שכר), רווחים וסיכומים
5. אם יש מספר תקופות/עמודות, קח את העמודה העדכנית ביותר
6. המר את כל הערכים למספרים (הסר פסיקים, סימני שקל וכו')

**שים לב במיוחד לזיהוי:**
- סך הכנסות / מחזור
- עלות המכר / עלות הסחורה שנמכרה
- רווח גולמי
- הוצאות שכר ונלוות
- הוצאות תפעוליות / הנהלה וכלליות
- הוצאות שיווק ומכירה
- רווח תפעולי
- הוצאות/הכנסות מימון
- רווח לפני מס
- מס הכנסה
- רווח נקי

הערה: אם לא ניתן לזהות שדה מסוים, השאר אותו כ-null או 0.
`;

        const response = await InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    report_period: { type: "string" },
                    total_revenue: { type: "number" },
                    cost_of_goods_sold: { type: "number" },
                    gross_profit: { type: "number" },
                    operating_expenses: { type: "number" },
                    salary_expenses: { type: "number" },
                    administrative_expenses: { type: "number" },
                    marketing_expenses: { type: "number" },
                    other_expenses: { type: "number" },
                    operating_profit: { type: "number" },
                    financial_expenses: { type: "number" },
                    financial_income: { type: "number" },
                    profit_before_tax: { type: "number" },
                    tax_expenses: { type: "number" },
                    net_profit: { type: "number" },
                    analysis_confidence: { type: "number" },
                    analysis_notes: { type: "string" },
                    expense_breakdown: { 
                        type: "object",
                        additionalProperties: { type: "number" }
                    },
                    revenue_breakdown: { 
                        type: "object",
                        additionalProperties: { type: "number" }
                    }
                }
            }
        });

        // הוספת מטא-דאטה
        const financialData = {
            ...response,
            customer_email: customer_email,
            report_type: "profit_loss",
            source_file_id: file_id,
            analysis_confidence: response.analysis_confidence || 85,
            ai_insights: {
                processed_at: new Date().toISOString(),
                data_quality: response.analysis_confidence >= 80 ? 'high' : response.analysis_confidence >= 60 ? 'medium' : 'low',
                total_rows_analyzed: Math.min(rawData.length, 200)
            }
        };

        return new Response(JSON.stringify({
            success: true,
            isFinancialReport: true,
            financialData: financialData,
            summary: {
                total_revenue: financialData.total_revenue || 0,
                net_profit: financialData.net_profit || 0,
                profit_margin: financialData.total_revenue > 0 ? 
                    ((financialData.net_profit || 0) / financialData.total_revenue * 100).toFixed(2) : 0,
                confidence: financialData.analysis_confidence
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error analyzing financial report:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            isFinancialReport: false
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});