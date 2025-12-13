import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, file_name, customer_email, file_id } = await req.json();

        if (!file_url || !file_name || !customer_email || !file_id) {
            return Response.json({ 
                error: 'Missing required parameters: file_url, file_name, customer_email, file_id' 
            }, { status: 400 });
        }

        console.log(`Analyzing generic file: ${file_name} for ${customer_email}`);

        // שלב 1: זיהוי סוג המסמך (כולל שומת מס)
        const searchPrompt = `
אני רוצה לנתח קובץ עסקי בשם: "${file_name}".
אני אשתמש בחיפוש באינטרנט כדי להבין טוב יותר את סוג הקובץ והקשרו, אך אם הקובץ נראה כמו שומת מס (Tax Assessment) לפי השם או התיאור, סווג אותו ככזה.

חפש באינטרנט מידע על:
1. מה סוג המסמך הזה? (דוח מכירות, דוח מלאי, חשבונית, שומת מס, וכו')
2. אילו שדות נמצאים בדרך כלל במסמך כזה?
3. איך מנתחים מסמך כזה למטרות עסקיות?

החזר JSON בפורמט:
{
  "document_type": "סוג המסמך בעברית",
  "document_category": "אחד מ: sales_report, inventory_report, profit_loss, balance_sheet, bank_statement, credit_card_report, promotions_report, purchase_document, tax_assessment, או mixed_business_data",
  "key_fields": ["רשימת שדות חשובים"],
  "analysis_approach": "איך לנתח את המסמך",
  "potential_insights": ["תובנות אפשריות"]
}
`;

        const analysisResult = await base44.integrations.Core.InvokeLLM({
            prompt: searchPrompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    document_type: { type: "string" },
                    document_category: { type: "string" },
                    key_fields: { type: "array", items: { type: "string" } },
                    analysis_approach: { type: "string" },
                    potential_insights: { type: "array", items: { type: "string" } }
                }
            }
        });

        console.log('Analysis result:', analysisResult);

        // שלב 2: בדיקה אם זה שומת מס
        if (analysisResult.document_category === 'tax_assessment') {
            console.log('Detected Tax Assessment, delegating to specific processor...');
            
            // קריאה לפונקציה הייעודית לעיבוד שומה
            const taxResponse = await base44.asServiceRole.functions.invoke('processTaxAssessment', {
                file_url,
                file_name,
                customer_email
            });

            const taxData = taxResponse.data.data;
            const recommendations = taxResponse.data.recommendations || [];

            // עדכון הקובץ עם הנתונים המובנים
            await base44.asServiceRole.entities.FileUpload.update(file_id, {
                data_category: 'tax_assessment',
                status: 'analyzed',
                ai_insights: {
                    document_type: "שומת מס הכנסה",
                    tax_data: taxData,
                    recommendations: recommendations,
                    summary: `שומה לשנת ${taxData.tax_year}: ${taxData.is_refund ? 'החזר' : 'חוב'} ע"ס ${Math.abs(taxData.final_tax_balance).toLocaleString()} ₪`,
                    analyzed_at: new Date().toISOString()
                },
                analysis_notes: `ניתוח שומת מס לשנת ${taxData.tax_year}`
            });

            return Response.json({
                success: true,
                message: 'שומת מס נותחה בהצלחה',
                analysis: {
                    document_type: 'tax_assessment',
                    category: 'tax_assessment',
                    insights: {
                        summary: 'שומת מס עובדה בהצלחה'
                    }
                }
            });
        }

        // אחרת, המשך עם הניתוח הגנרי הרגיל
        const insightsPrompt = `
בהתבסס על המידע שמצאת, הקובץ הוא: ${analysisResult.document_type}

קטגוריה: ${analysisResult.document_category}
שדות מפתח: ${analysisResult.key_fields.join(', ')}

אנא צור ניתוח ראשוני עם התובנות הבאות:
1. סיכום מה הקובץ מכיל (בהתבסס על השם)
2. מה עסק צריך לעשות עם המידע הזה
3. המלצות ראשוניות

החזר JSON:
{
  "summary": "סיכום המסמך",
  "recommendations": ["המלצות"],
  "next_steps": ["צעדים הבאים"],
  "importance_level": "high/medium/low"
}
`;

        const insights = await base44.integrations.Core.InvokeLLM({
            prompt: insightsPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    recommendations: { type: "array", items: { type: "string" } },
                    next_steps: { type: "array", items: { type: "string" } },
                    importance_level: { type: "string" }
                }
            }
        });

        // שלב 3: עדכון הקובץ במערכת
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            data_category: analysisResult.document_category,
            status: 'analyzed',
            ai_insights: {
                document_type: analysisResult.document_type,
                analysis_approach: analysisResult.analysis_approach,
                key_fields: analysisResult.key_fields,
                summary: insights.summary,
                recommendations: insights.recommendations,
                next_steps: insights.next_steps,
                importance_level: insights.importance_level,
                analyzed_at: new Date().toISOString()
            },
            analysis_notes: `ניתוח אוטומטי: ${analysisResult.document_type}`
        });

        console.log('Generic file analysis completed successfully');

        return Response.json({
            success: true,
            message: 'ניתוח הושלם בהצלחה',
            analysis: {
                document_type: analysisResult.document_type,
                category: analysisResult.document_category,
                insights: insights
            }
        });

    } catch (error) {
        console.error('Error analyzing generic file:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});