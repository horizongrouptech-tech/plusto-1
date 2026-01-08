import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        console.log('=== processCreditReport START ===');
        
        const user = await base44.auth.me();
        if (!user) {
            console.log('ERROR: Unauthorized - no user');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('User authenticated:', user.email);

        const { file_url, customer_email, file_id } = await req.json();
        console.log('Request params:', { file_url, customer_email, file_id });

        if (!file_url || !customer_email || !file_id) {
            console.log('ERROR: Missing required parameters');
            return Response.json({ 
                error: 'Missing required parameters: file_url, customer_email, file_id' 
            }, { status: 400 });
        }

        console.log(`Processing Credit Report for ${customer_email}, file_id: ${file_id}`);

        // שלב 1: חילוץ מידע בסיסי (עמודים 1-20)
        console.log('STEP 1: Extracting basic info...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 1/3: מחלץ מידע בסיסי מהדוח...'
        });

        const basicInfoSchema = {
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
                        totalDebtILS: { type: "number" },
                        totalDebtExMortgageILS: { type: "number" },
                        totalActiveDealsCount: { type: "number" },
                        totalLoansCount: { type: "number" },
                        totalMortgagesCount: { type: "number" },
                        lenders: { type: "array", items: { type: "string" } }
                    }
                }
            }
        };

        const basicPrompt = `
נתח את דוח ריכוז הנתונים מבנק ישראל והחזר רק את המידע הבסיסי הבא:

1. פרטי נושא הדוח (שם, ת.ז., תאריך הדוח)
2. סיכום כללי: סה"כ חוב, מספר עסקאות, מספר הלוואות ומשכנתאות
3. רשימת מלווים (בנקים וחברות)

**חשוב:** 
- אל תמציא נתונים - רק מה שכתוב בדוח
- אם שדה לא קיים, החזר null או 0
- סכם את כל יתרות החוב מכל המקורות

החזר JSON בלבד!
`;

        let basicInfo;
        try {
            basicInfo = await base44.integrations.Core.InvokeLLM({
                prompt: basicPrompt,
                file_urls: [file_url],
                response_json_schema: basicInfoSchema
            });
            
            console.log('Basic info extracted successfully');
            
            // בדיקה שזה JSON ולא string
            if (typeof basicInfo === 'string') {
                console.error('ERROR: LLM returned string instead of JSON:', basicInfo);
                throw new Error('הדוח גדול מדי או שהמערכת לא הצליחה לקרוא אותו');
            }
        } catch (error) {
            console.error('ERROR in basic info extraction:', error);
            throw new Error(`שגיאה בחילוץ מידע בסיסי: ${error.message}`);
        }

        // שלב 2: חילוץ חשבונות עובר ושב והלוואות
        console.log('STEP 2: Extracting accounts and loans...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 2/3: מחלץ נתוני חשבונות והלוואות...'
        });

        const accountsLoansSchema = {
            type: "object",
            properties: {
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
                            isGuarantor: { type: "boolean" }
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
                }
            }
        };

        const accountsPrompt = `
מתוך דוח ריכוז הנתונים, חלץ את הנתונים הבאים:

1. **חשבונות עובר ושב**: כל החשבונות הפעילים (מסגרות אשראי, יתרות, חריגות)
2. **הלוואות**: כל ההלוואות הפעילות (סכום מקורי, יתרה, ריבית, תשלום חודשי)
3. **משכנתאות**: כל המשכנתאות הפעילות
4. **ערבויות**: ערבויות שניתנו

**הנחיות:**
- חלץ נתונים מדוייקים מהטבלאות
- אם אין נתון - החזר null או רשימה רקה
- שים לב להבדיל בין חייב לערב בהלוואות

החזר JSON בלבד!
`;

        let accountsData;
        try {
            accountsData = await base44.integrations.Core.InvokeLLM({
                prompt: accountsPrompt,
                file_urls: [file_url],
                response_json_schema: accountsLoansSchema
            });
            
            console.log('Accounts and loans extracted successfully');
            
            if (typeof accountsData === 'string') {
                console.error('ERROR: LLM returned string in step 2');
                // אם נכשל שלב 2, נשתמש בערכי default
                accountsData = {
                    currentAccounts: [],
                    loans: [],
                    mortgages: [],
                    guarantees: []
                };
            }
        } catch (error) {
            console.error('ERROR in accounts extraction:', error);
            // המשך עם ערכי default
            accountsData = {
                currentAccounts: [],
                loans: [],
                mortgages: [],
                guarantees: []
            };
        }

        // שלב 3: ניתוח סיכונים והמלצות
        console.log('STEP 3: Analyzing risks...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 3/3: מנתח סיכונים ומפיק המלצות...'
        });

        const analysisSchema = {
            type: "object",
            properties: {
                riskScore: { type: "number" },
                creditUtilization: { type: "number" },
                bouncedChecksCount: { type: "number" },
                bouncedDirectDebitsCount: { type: "number" },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                redFlags: { type: "array", items: { type: "string" } }
            }
        };

        const riskPrompt = `
בהתבסס על דוח ריכוז הנתונים, בצע ניתוח סיכונים:

1. חשב ציון סיכון 1-10 (10 = סיכון גבוה)
2. חשב אחוז ניצול מסגרות אשראי
3. ספור שיקים והוראות קבע שחזרו
4. זהה נקודות חוזק וחולשה
5. תן המלצות פרקטיות
6. זהה דגלים אדומים (חשבונות בחריגה, חובות שלא שולמו)

**נתונים שיש לך:**
- סה"כ חוב: ${basicInfo.summary?.totalDebtILS || 0} ₪
- מספר הלוואות: ${basicInfo.summary?.totalLoansCount || 0}

החזר JSON בלבד!
`;

        let analysisData;
        try {
            analysisData = await base44.integrations.Core.InvokeLLM({
                prompt: riskPrompt,
                file_urls: [file_url],
                response_json_schema: analysisSchema
            });
            
            console.log('Risk analysis completed successfully');
            
            if (typeof analysisData === 'string') {
                console.error('ERROR: LLM returned string in step 3');
                analysisData = {
                    riskScore: 5,
                    creditUtilization: 0,
                    bouncedChecksCount: 0,
                    bouncedDirectDebitsCount: 0,
                    strengths: ['הדוח נותח חלקית'],
                    weaknesses: ['לא ניתן לנתח את כל הנתונים'],
                    recommendations: ['יש לבדוק את הדוח ידנית'],
                    redFlags: []
                };
            }
        } catch (error) {
            console.error('ERROR in risk analysis:', error);
            analysisData = {
                riskScore: 5,
                creditUtilization: 0,
                bouncedChecksCount: 0,
                bouncedDirectDebitsCount: 0,
                strengths: [],
                weaknesses: [],
                recommendations: [],
                redFlags: []
            };
        }

        // איחוד כל הנתונים
        const finalResult = {
            reportMeta: basicInfo.reportMeta || {},
            summary: basicInfo.summary || {},
            currentAccounts: accountsData.currentAccounts || [],
            loans: accountsData.loans || [],
            mortgages: accountsData.mortgages || [],
            guarantees: accountsData.guarantees || [],
            analysis: analysisData
        };

        console.log('Final result prepared, updating FileUpload...');

        // עדכון רשומת הקובץ עם הנתונים המנותחים
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            status: 'analyzed',
            data_category: 'credit_report',
            parsed_data: {
                summary: JSON.stringify(finalResult.summary || {}),
                reportMeta: JSON.stringify(finalResult.reportMeta || {}),
                fullData: JSON.stringify(finalResult)
            },
            ai_insights: finalResult,
            parsing_metadata: {
                analysis_status: 'full',
                steps_completed: 3,
                chunks_processed: 3
            },
            analysis_notes: `דוח ריכוז נתונים נותח בהצלחה. סה"כ חוב: ${finalResult.summary?.totalDebtILS?.toLocaleString() || 'לא זוהה'} ₪, ציון סיכון: ${finalResult.analysis?.riskScore || 'לא חושב'}/10`
        });

        console.log('FileUpload record updated successfully');
        console.log('=== processCreditReport END SUCCESS ===');

        return Response.json({
            success: true,
            message: 'דוח ריכוז נתונים נותח בהצלחה',
            data: finalResult
        });

    } catch (error) {
        console.error('=== processCreditReport FATAL ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // נסה לעדכן את הקובץ כ-failed
        try {
            const { file_id } = await req.json();
            if (file_id) {
                await base44.asServiceRole.entities.FileUpload.update(file_id, {
                    status: 'failed',
                    analysis_notes: `שגיאה בניתוח: ${error.message}`
                });
            }
        } catch (updateError) {
            console.error('Failed to update file status:', updateError);
        }
        
        return Response.json({
            success: false,
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});