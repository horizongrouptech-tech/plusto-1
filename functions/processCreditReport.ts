import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, customer_email, file_id } = await req.json();

        if (!file_url || !customer_email || !file_id) {
            return Response.json({ 
                error: 'Missing required parameters: file_url, customer_email, file_id' 
            }, { status: 400 });
        }

        console.log(`Processing Credit Report for ${customer_email}`);

        // ניתוח הדוח באמצעות LLM עם vision
        const creditReportSchema = {
            type: "object",
            properties: {
                reportMeta: {
                    type: "object",
                    properties: {
                        subjectFullName: { type: "string" },
                        subjectIdNumber: { type: "string" },
                        reportIssueDate: { type: "string" },
                        dataCollectionStartDate: { type: "string" },
                        clientStatus: { type: "string" }
                    }
                },
                summary: {
                    type: "object",
                    properties: {
                        totalDebtILS: { type: "number", description: "סך החוב הכולל כולל משכנתא" },
                        totalDebtExMortgageILS: { type: "number", description: "סך החוב ללא משכנתא" },
                        totalActiveDealsCount: { type: "number" },
                        totalLoansCount: { type: "number" },
                        totalMortgagesCount: { type: "number" },
                        lenders: { type: "array", items: { type: "string" } }
                    }
                },
                currentAccounts: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            sourceDisplayName: { type: "string" },
                            dealId: { type: "string" },
                            creditLimit: { type: "number" },
                            currentBalance: { type: "number" },
                            notPaidOnTime: { type: "number" },
                            status: { type: "string" },
                            currency: { type: "string" }
                        }
                    }
                },
                loans: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            sourceDisplayName: { type: "string" },
                            dealId: { type: "string" },
                            originalPrincipal: { type: "number" },
                            currentBalance: { type: "number" },
                            monthlyPayment: { type: "number" },
                            interestRate: { type: "number" },
                            status: { type: "string" },
                            purpose: { type: "string" },
                            isGuarantor: { type: "boolean", description: "האם הלקוח ערב או חייב" }
                        }
                    }
                },
                mortgages: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            sourceDisplayName: { type: "string" },
                            originalPrincipal: { type: "number" },
                            currentBalance: { type: "number" },
                            monthlyPayment: { type: "number" },
                            interestRate: { type: "number" },
                            endDate: { type: "string" }
                        }
                    }
                },
                guarantees: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            sourceDisplayName: { type: "string" },
                            guaranteeAmount: { type: "number" },
                            status: { type: "string" },
                            relatedCorporation: { type: "string" }
                        }
                    }
                },
                analysis: {
                    type: "object",
                    properties: {
                        riskScore: { type: "number", description: "ציון סיכון 1-10, כאשר 10 הוא הסיכון הגבוה ביותר" },
                        creditUtilization: { type: "number", description: "אחוז ניצול מסגרות אשראי" },
                        bouncedChecksCount: { type: "number", description: "מספר שיקים שחזרו ב-12 חודשים אחרונים" },
                        bouncedDirectDebitsCount: { type: "number", description: "מספר הוראות קבע שחזרו ב-12 חודשים אחרונים" },
                        strengths: { type: "array", items: { type: "string" } },
                        weaknesses: { type: "array", items: { type: "string" } },
                        recommendations: { type: "array", items: { type: "string" } },
                        redFlags: { type: "array", items: { type: "string" }, description: "דגלים אדומים - בעיות קריטיות" }
                    }
                }
            }
        };

        const analysisPrompt = `
אתה אנליסט פיננסי מומחה בניתוח דוחות ריכוז נתונים של בנק ישראל.

**משימתך:**
נתח את דוח ריכוז הנתונים המצורף והחזר JSON מובנה עם כל הנתונים החשובים.

**הנחיות חשובות:**
1. חלץ נתונים מדוייקים מהטבלאות - שים לב במיוחד לעמודים 3-4 (תמצית נתוני לקוח)
2. סכום כל יתרות החוב (כולל/ללא משכנתא)
3. זהה את כל הבנקים והמלווים
4. ספור שיקים והוראות קבע שחזרו (עמודים 5-11)
5. חשב ציון סיכון 1-10 על בסיס:
   - יחס חוב להכנסה (אם יש)
   - ניצול מסגרות אשראי
   - שיקים/הו"ק שחזרו
   - יתרות שלא שולמו במועד
6. זהה דגלים אדומים: חשבונות בחריגה, שיקים שחזרו, יתרות שלא שולמו
7. תן המלצות פרקטיות לשיפור המצב

**חשוב:** אל תמציא נתונים - רק מה שרשום בדוח!

החזר JSON בפורמט המבוקש.
`;

        console.log('Invoking LLM with credit report file...');

        const parseResult = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            file_urls: [file_url],
            response_json_schema: creditReportSchema
        });

        console.log('Credit report analyzed successfully');

        // עדכון רשומת הקובץ עם הנתונים המנותחים
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            status: 'analyzed',
            data_category: 'credit_report',
            parsed_data: parseResult,
            ai_insights: {
                document_type: 'דוח ריכוז נתונים - בנק ישראל',
                credit_analysis: parseResult,
                analyzed_at: new Date().toISOString()
            },
            parsing_metadata: {
                analysis_status: 'full',
                pages_analyzed: 'auto-detected by LLM'
            },
            analysis_notes: `דוח ריכוז נתונים נותח בהצלחה. סה"כ חוב: ${parseResult.summary?.totalDebtILS?.toLocaleString() || 'לא זוהה'} ₪`
        });

        console.log('FileUpload record updated successfully');

        return Response.json({
            success: true,
            message: 'דוח ריכוז נתונים נותח בהצלחה',
            data: parseResult
        });

    } catch (error) {
        console.error('Error processing credit report:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});