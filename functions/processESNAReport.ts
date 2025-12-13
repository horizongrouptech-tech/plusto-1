import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    if (!(await base44.auth.isAuthenticated())) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { file_url, customer_email, file_id } = await req.json();

        if (!file_url || !customer_email) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Missing required parameters: file_url, customer_email' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // סכימת JSON לחילוץ נתונים מדוח מע"מ (ESNA)
        const esnaJsonSchema = {
            type: "object",
            properties: {
                metadata: {
                    type: "object",
                    properties: {
                        companyName: { type: "string", description: "שם החברה" },
                        businessId: { type: "string", description: "מספר עוסק" },
                        reportYear: { type: "integer", description: "שנת דיווח" },
                        reportType: { type: "string", enum: ["ESNA"], description: "סוג הדוח" },
                        generatedDate: { type: "string", format: "date-time", description: "תאריך הפקת הדוח" },
                        representativeOffice: { type: "string", description: "משרד מייצג" }
                    },
                    required: ["companyName", "businessId", "reportYear", "reportType"]
                },
                annualSummary: {
                    type: "object",
                    properties: {
                        totalTaxableTransactions: { type: "number", description: "סך עסקאות חייבות" },
                        totalExemptTransactions: { type: "number", description: "סך עסקאות פטורות" },
                        totalAddedValueIncludingEquipment: { type: "number", description: "סך ערך מוסף כולל ציוד" },
                        totalAddedValue: { type: "number", description: "סך ערך מוסף" },
                        totalInputTax: { type: "number", description: "סך מס תשומות" },
                        inputTaxOther: { type: "number", description: "מס תשומות אחרות" },
                        inputTaxEquipment: { type: "number", description: "מס תשומות ציוד" },
                        addedValueRate: { type: "number", description: "שיעור ערך מוסף" },
                        taxRate: { type: "number", description: "שיעור מס", default: 17.0 }
                    }
                },
                monthlyBreakdown: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            period: { type: "string", description: "תקופה (MM/YYYY)" },
                            taxableTransactions: { type: "number", description: "עסקאות חייבות" },
                            taxableTransactionsPercentage: { type: "number", description: "אחוז עסקאות חייבות" },
                            exemptTransactions: { type: "number", description: "עסקאות פטורות" },
                            exemptTransactionsPercentage: { type: "number", description: "אחוז עסקאות פטורות" },
                            totalTransactions: { type: "number", description: "סך עסקאות" },
                            inputTaxTotal: { type: "number", description: "סך מס תשומות" },
                            inputTaxOther: { type: "number", description: "מס תשומות אחרות" },
                            inputTaxEquipment: { type: "number", description: "מס תשומות ציוד" },
                            addedValue: { type: "number", description: "ערך מוסף" },
                            addedValueRate: { type: "number", description: "שיעור ערך מוסף" },
                            vatRate: { type: "number", description: "שיעור מע\"מ" },
                            randomTransactions: { type: "number", description: "עסקאות אקראי" }
                        },
                        required: ["period", "totalTransactions"]
                    }
                },
                collectionsAndPayments: {
                    type: "object",
                    properties: {
                        annualSummary: {
                            type: "object",
                            properties: {
                                totalReports: { type: "integer", description: "סך דוחות" },
                                totalPayments: { type: "integer", description: "סך תשלומים" },
                                totalCollectionDays: { type: "integer", description: "סך ימי גבייה" },
                                demandForRefund: { type: "number", description: "דרישה להחזר" },
                                collectionsFromReports: { type: "number", description: "גבייה מדוחות" },
                                refundsPaid: { type: "number", description: "החזרים ששולמו" },
                                interestRefunds: { type: "number", description: "ריבית החזרים" },
                                garnishments: { type: "number", description: "עיקולים" }
                            }
                        },
                        monthlyBreakdown: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    period: { type: "string", description: "תקופה" },
                                    paymentType: { type: "string", description: "סוג תשלום" },
                                    delayDays: { type: "integer", description: "ימי פיגור" },
                                    reportedAmount: { type: "number", description: "סכום מדוחות" },
                                    collectedAmount: { type: "number", description: "סכום שנגבה" },
                                    refundAmount: { type: "number", description: "סכום החזר" }
                                }
                            }
                        }
                    }
                }
            }
        };

        console.log('Starting ESNA report processing for customer:', customer_email);

        // חילוץ נתונים מקובץ PDF באמצעות סכימת JSON
        const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: esnaJsonSchema
        });

        console.log('Extraction result status:', extractionResult.status);

        if (extractionResult.status !== 'success' || !extractionResult.output) {
            const errorMessage = extractionResult.details || 'Failed to extract data from ESNA report';
            console.error('Data extraction failed:', errorMessage);

            if (file_id) {
                await base44.entities.FileUpload.update(file_id, {
                    status: 'failed',
                    analysis_notes: `שגיאה בחילוץ נתונים מדוח מע"מ: ${errorMessage}`
                });
            }

            return new Response(JSON.stringify({
                success: false,
                error: errorMessage
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const esnaData = extractionResult.output;
        console.log('Successfully extracted ESNA data for company:', esnaData.metadata?.companyName);

        // יצירת תובנות AI נוספות מהנתונים שחולצו
        let aiInsights = {};
        try {
            const insightsPrompt = `
אתה מנתח מומחה לדוחות מע"מ ישראליים. נתח את הנתונים הבאים מדוח ESNA ותן תובנות עסקיות חשובות:

נתוני החברה:
- שם: ${esnaData.metadata?.companyName || 'לא זוהה'}
- מספר עוסק: ${esnaData.metadata?.businessId || 'לא זוהה'}
- שנת דוח: ${esnaData.metadata?.reportYear || 'לא זוהה'}

סיכום שנתי:
- סך עסקאות חייבות: ₪${esnaData.annualSummary?.totalTaxableTransactions?.toLocaleString() || '0'}
- סך עסקאות פטורות: ₪${esnaData.annualSummary?.totalExemptTransactions?.toLocaleString() || '0'}
- סך מס תשומות: ₪${esnaData.annualSummary?.totalInputTax?.toLocaleString() || '0'}

פילוח חודשי - דגימת חודשים:
${esnaData.monthlyBreakdown?.slice(0, 3).map(month => 
  `${month.period}: עסקאות ₪${month.totalTransactions?.toLocaleString() || '0'}, מע"מ ${month.vatRate || 17}%`
).join('\n') || 'אין נתונים חודשיים'}

אנא ספק:
1. הערכת מצב כלכלי של העסק
2. זיהוי מגמות חשובות
3. המלצות לשיפור
4. אזהרות או נקודות לתשומת לב
5. השוואה לממוצע בענף (אם אפשר)
`;

            const insightsResponse = await base44.integrations.Core.InvokeLLM({
                prompt: insightsPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        businessHealthAssessment: { type: "string", description: "הערכת מצב העסק" },
                        keyTrends: { type: "array", items: { type: "string" }, description: "מגמות מרכזיות" },
                        recommendations: { type: "array", items: { type: "string" }, description: "המלצות לשיפור" },
                        warnings: { type: "array", items: { type: "string" }, description: "אזהרות" },
                        industryComparison: { type: "string", description: "השוואה לענף" },
                        riskScore: { type: "number", minimum: 1, maximum: 10, description: "ציון סיכון (1-10)" }
                    }
                }
            });

            aiInsights = insightsResponse || {};
            console.log('Generated AI insights for ESNA report');

        } catch (insightsError) {
            console.error('Failed to generate AI insights:', insightsError);
            aiInsights = { error: 'Failed to generate insights' };
        }

        // עדכון רשומת הקובץ עם הנתונים המעובדים
        if (file_id) {
            await base44.entities.FileUpload.update(file_id, {
                status: 'analyzed',
                data_category: 'esna_report',
                esna_report_data: esnaData,
                ai_insights: aiInsights,
                analysis_notes: `דוח מע"מ (ESNA) עובד בהצלחה עבור ${esnaData.metadata?.companyName || 'חברה לא ידועה'} לשנת ${esnaData.metadata?.reportYear || 'שנה לא ידועה'}`
            });
        }

        console.log('ESNA report processing completed successfully');

        return new Response(JSON.stringify({
            success: true,
            data: esnaData,
            insights: aiInsights,
            message: 'דוח מע"מ עובד בהצלחה'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error processing ESNA report:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'שגיאה בעיבוד דוח מע"מ'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});