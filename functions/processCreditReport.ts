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

        // שלב 1: חילוץ מידע בסיסי וסיכום מקיף
        console.log('STEP 1: Extracting metadata and summary...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 1/6: מחלץ מטא-דטה וסיכום כללי...'
        });

        const basicInfoSchema = {
            type: "object",
            properties: {
                reportMeta: {
                    type: "object",
                    properties: {
                        subjectFullName: { type: "string" },
                        nationalId: { type: "string" },
                        reportIssueDate: { type: "string" },
                        dataCollectionStartDate: { type: "string" },
                        customerType: { type: "string" }
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
                        totalGuaranteeDealsCount: { type: "number" },
                        totalGuaranteeExposureILS: { type: "number" },
                        lenders: { type: "array", items: { type: "string" } }
                    }
                }
            }
        };

        const basicPrompt = `
נתח את עמודים 1-4 של דוח ריכוז הנתונים והחזר:

**מטא-דטה (עמ' 1-2):**
- שם מלא של נושא הדוח
- מספר ת.ז.
- תאריך הפקת הדוח
- תאריך תחילת איסוף נתונים
- הגדרת הלקוח (יחיד הפועל כעוסק / יחיד)

**סיכום (עמ' 3-4 - תמצית נתוני לקוח):**
חשב ממה שכתוב בטבלאות:
1. סה"כ חוב כולל (כל העסקאות)
2. סה"כ חוב ללא משכנתאות
3. מספר עסקאות פעילות (גם חייב וגם ערב!)
4. מספר הלוואות (גם חייב וגם ערב)
5. מספר משכנתאות
6. **ספור עסקאות בהן הלקוח ערב** (חשבונות + הלוואות + מסגרות)
7. **חשב חשיפה כערב** (סכום כל המסגרות והיתרות)
8. רשימת כל המלווים

**דוגמה:**
אם בטבלה רשום:
- חשבונות עו"ש כחייב: 1 עסקה, 60K מסגרת, 38K יתרה
- חשבונות עו"ש כערב: 2 עסקאות, 360K מסגרת, 132K יתרה
- הלוואות כחייב: 1 עסקה, 200K מקורי, 118K יתרה
- הלוואות כערב: 7 עסקאות, 1,084K מקורי, 521K יתרה

אז:
totalActiveDealsCount = 1+2+1+7 = 11
totalGuaranteeDealsCount = 2+7 = 9
totalGuaranteeExposureILS = 132,170 + 521,643 = 653,813

**חשוב:** סכם במדויק לפי הטבלאות!

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
            
            if (typeof basicInfo === 'string') {
                console.error('ERROR: LLM returned string instead of JSON:', basicInfo);
                throw new Error('הדוח גדול מדי או שהמערכת לא הצליחה לקרוא אותו');
            }
        } catch (error) {
            console.error('ERROR in basic info extraction:', error);
            throw new Error(`שגיאה בחילוץ מידע בסיסי: ${error.message}`);
        }

        // שלב 2: חשבונות עו"ש + החזרות
        console.log('STEP 2: Extracting current accounts...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 2/6: מחלץ חשבונות עו"ש והחזרות...'
        });

        const accountsSchema = {
            type: "object",
            properties: {
                currentAccounts: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            bankName: { type: "string" },
                            dealId: { type: "string" },
                            branchNumber: { type: "string" },
                            accountType: { type: "string" },
                            isGuarantor: { type: "boolean" },
                            creditLimit: { type: "number" },
                            currentBalance: { type: "number" },
                            notPaidOnTime: { type: "number" },
                            status: { type: "string" },
                            currency: { type: "string" },
                            lastUpdateDate: { type: "string" },
                            interestRates: { type: "array", items: { type: "object" } }
                        }
                    }
                },
                checksReturned: {
                    type: "object",
                    properties: {
                        last12Months: { type: "integer" },
                        byMonth: { type: "object" }
                    }
                },
                directDebitReturned: {
                    type: "object",
                    properties: {
                        last12Months: { type: "integer" },
                        byMonth: { type: "object" },
                        peakMonth: { type: "string" },
                        trend: { type: "string" }
                    }
                }
            }
        };

        const accountsPrompt = `
חלץ חשבונות עו"ש ומסגרות מתחדשות מסעיף 2 (עמ' 5-11):

**עבור כל חשבון חלץ:**
- שם בנק מלא
- מזהה עסקה + מספר סניף
- סוג (חשבון עו"ש / מסגרת אשראי מתחדשת)
- האם זה כערב? (בדוק "עסקאות בהן הלקוח ערב")
- גובה מסגרת
- יתרת חוב
- יתרה שלא שולמה במועד
- סטטוס
- מטבע
- תאריך עדכון אחרון
- מסלולי ריבית (מספר, סוג, עוגן, מרווח, ריבית)

**חלץ החזרות מהטבלאות:**
ספור החזרות הוראות קבע (שורה: "מספר הוראות לחיוב חשבון שלא כובדו"):
- לפי חודש ושנה ב-12 חודשים אחרונים
- סה"כ החזרות
- זהה חודש שיא
- זהה מגמה (עולה/יורדת/יציבה)

**חשוב:** חלץ **גם** עסקאות כחייב **וגם** כערב!

החזר JSON בלבד!
`;

        let accountsData;
        try {
            accountsData = await base44.integrations.Core.InvokeLLM({
                prompt: accountsPrompt,
                file_urls: [file_url],
                response_json_schema: accountsSchema
            });
            
            console.log('Current accounts extracted successfully');
            
            if (typeof accountsData === 'string') {
                console.error('ERROR: LLM returned string in step 2');
                accountsData = {
                    currentAccounts: [],
                    checksReturned: { last12Months: 0, byMonth: {} },
                    directDebitReturned: { last12Months: 0, byMonth: {} }
                };
            }
        } catch (error) {
            console.error('ERROR in accounts extraction:', error);
            accountsData = {
                currentAccounts: [],
                checksReturned: { last12Months: 0, byMonth: {} },
                directDebitReturned: { last12Months: 0, byMonth: {} }
            };
        }

        // שלב 3: הלוואות כחייב
        console.log('STEP 3: Extracting loans (as debtor)...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 3/6: מחלץ הלוואות בהן הלקוח חייב...'
        });

        const loansDebtorSchema = {
            type: "object",
            properties: {
                loans: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            bankName: { type: "string" },
                            dealId: { type: "string" },
                            branchNumber: { type: "string" },
                            loanType: { type: "string" },
                            originalPrincipal: { type: "number" },
                            currentBalance: { type: "number" },
                            monthlyPayment: { type: "number" },
                            paymentType: { type: "string" },
                            status: { type: "string" },
                            purpose: { type: "string" },
                            currency: { type: "string" },
                            startDate: { type: "string" },
                            plannedEndDate: { type: "string" },
                            lastPaymentDate: { type: "string" },
                            interestTracks: { type: "array", items: { type: "object" } },
                            collateral: { type: "array", items: { type: "object" } }
                        }
                    }
                }
            }
        };

        const loansDebtorPrompt = `
חלץ הלוואות מסעיף 3 (עמ' 12-27) - רק עסקאות בהן הלקוח **חייב**:

**זיהוי:**
חפש "סוג עסקה: הלוואה" כאשר:
- "מספר הלקוחות החייבים בעסקה" > 0
- "מספר הלקוחות הערבים בעסקה" = 0

**חלץ עבור כל הלוואה:**
- פרטי בנק (שם, מזהה, סניף)
- סוג הלוואה
- סכום מקורי ויתרה
- תשלום חודשי (צפוי ובפועל)
- סוג תשלום (קרן וריבית / בלון)
- מטרת האשראי
- תאריכים
- **מסלולי ריבית** (מספר, סוג, הצמדה, עוגן, מרווח, ריבית נומינלית ומתואמת, יתרת מסלול)
- **בטחונות** (סוג ושווי)
- פרטי תאגיד קשור (אם יש)

החזר JSON בלבד!
`;

        let loansDebtorData;
        try {
            loansDebtorData = await base44.integrations.Core.InvokeLLM({
                prompt: loansDebtorPrompt,
                file_urls: [file_url],
                response_json_schema: loansDebtorSchema
            });
            
            console.log('Loans (debtor) extracted successfully');
            
            if (typeof loansDebtorData === 'string') {
                loansDebtorData = { loans: [] };
            }
        } catch (error) {
            console.error('ERROR in loans debtor extraction:', error);
            loansDebtorData = { loans: [] };
        }

        // שלב 4: הלוואות ומסגרות כערב
        console.log('STEP 4: Extracting loans and credit lines (as guarantor)...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 4/6: מחלץ עסקאות בהן הלקוח ערב...'
        });

        const loansGuarantorSchema = {
            type: "object",
            properties: {
                loansAsGuarantor: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            bankName: { type: "string" },
                            dealId: { type: "string" },
                            branchNumber: { type: "string" },
                            guarantorLevel: { type: "string" },
                            originalPrincipal: { type: "number" },
                            currentBalance: { type: "number" },
                            monthlyPayment: { type: "number" },
                            status: { type: "string" },
                            purpose: { type: "string" },
                            relatedCorporation: { type: "string" },
                            interestTracks: { type: "array", items: { type: "object" } },
                            collateral: { type: "array", items: { type: "object" } }
                        }
                    }
                },
                creditLinesAsGuarantor: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            bankName: { type: "string" },
                            dealId: { type: "string" },
                            accountType: { type: "string" },
                            creditLimit: { type: "number" },
                            currentBalance: { type: "number" },
                            status: { type: "string" }
                        }
                    }
                }
            }
        };

        const loansGuarantorPrompt = `
חלץ עסקאות מסעיף 3 בהן הלקוח **ערב**:

**זיהוי עסקאות כערב:**
1. הלוואות: "סוג עסקה: הלוואה" + "מספר הלקוחות הערבים בעסקה" > 0
2. מסגרות: "סוג עסקה: מסגרת אשראי מתחדשת" + "מספר הלקוחות הערבים בעסקה" > 0
3. שים לב ל-"טווח שיעור הערבות" (מעל 75% = ערבות מלאה)

**חלץ:**
- כל הנתונים כמו בהלוואות רגילות
- **תוסף:** טווח שיעור הערבות
- פרטי תאגיד קשור (זה **חשוב** - לדעת למי הוא ערב!)

**זה קריטי!** אל תדלג על עסקאות אלה!

החזר JSON בלבד!
`;

        let loansGuarantorData;
        try {
            loansGuarantorData = await base44.integrations.Core.InvokeLLM({
                prompt: loansGuarantorPrompt,
                file_urls: [file_url],
                response_json_schema: loansGuarantorSchema
            });
            
            console.log('Loans (guarantor) extracted successfully');
            
            if (typeof loansGuarantorData === 'string') {
                loansGuarantorData = { loansAsGuarantor: [], creditLinesAsGuarantor: [] };
            }
        } catch (error) {
            console.error('ERROR in loans guarantor extraction:', error);
            loansGuarantorData = { loansAsGuarantor: [], creditLinesAsGuarantor: [] };
        }

        // שלב 5: משכנתאות וערבויות
        console.log('STEP 5: Extracting mortgages and guarantees...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 5/6: מחלץ משכנתאות וערבויות...'
        });

        const mortgagesSchema = {
            type: "object",
            properties: {
                mortgages: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            bankName: { type: "string" },
                            dealId: { type: "string" },
                            branchNumber: { type: "string" },
                            originalPrincipal: { type: "number" },
                            currentBalance: { type: "number" },
                            monthlyPayment: { type: "number" },
                            actualPayment: { type: "number" },
                            paymentType: { type: "string" },
                            status: { type: "string" },
                            purpose: { type: "string" },
                            startDate: { type: "string" },
                            plannedEndDate: { type: "string" },
                            lastPaymentDate: { type: "string" },
                            interestTracks: { type: "array", items: { type: "object" } },
                            collateral: { type: "array", items: { type: "object" } }
                        }
                    }
                },
                guarantees: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            bankName: { type: "string" },
                            dealId: { type: "string" },
                            guaranteeAmount: { type: "number" },
                            status: { type: "string" },
                            startDate: { type: "string" },
                            endDate: { type: "string" },
                            relatedCorporation: { type: "string" }
                        }
                    }
                },
                creditInquiries: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            inquiryDate: { type: "string" },
                            inquirer: { type: "string" },
                            purpose: { type: "string" },
                            creditBureau: { type: "string" }
                        }
                    }
                }
            }
        };

        const mortgagesPrompt = `
חלץ משכנתאות, ערבויות ופניות:

**1. משכנתאות (סעיף 3, "סוג עסקה: משכנתה"):**
- כל הנתונים הפיננסיים
- **מסלולי ריבית מפורטים** (מספר, סוג, הצמדה, עוגן, מרווח, ריבית נומינלית/מתואמת, יתרה)
- בטחונות (מקרקעין, שווי)

**2. ערבויות (סעיף 3, "ערבות שניתנה לטובתך"):**
- פרטי ערבות, סכום, סטטוס
- פרטי תאגיד קשור

**3. פניות לשכות אשראי (עמ' 67):**
- תאריך, מבקש, מטרה
- ספור פניות ב-12 חודשים

החזר JSON בלבד!
`;

        let mortgagesData;
        try {
            mortgagesData = await base44.integrations.Core.InvokeLLM({
                prompt: mortgagesPrompt,
                file_urls: [file_url],
                response_json_schema: mortgagesSchema
            });
            
            console.log('Mortgages and guarantees extracted successfully');
            
            if (typeof mortgagesData === 'string') {
                mortgagesData = { mortgages: [], guarantees: [], creditInquiries: [] };
            }
        } catch (error) {
            console.error('ERROR in mortgages extraction:', error);
            mortgagesData = { mortgages: [], guarantees: [], creditInquiries: [] };
        }

        // שלב 6: ניתוח סיכונים מעמיק
        console.log('STEP 6: Deep risk analysis...');
        
        await base44.asServiceRole.entities.FileUpload.update(file_id, {
            analysis_notes: 'שלב 6/6: מנתח סיכונים ומפיק המלצות...'
        });

        const analysisSchema = {
            type: "object",
            properties: {
                riskScore: { type: "number" },
                creditUtilization: { type: "number" },
                totalChecksReturned: { type: "number" },
                totalDirectDebitReturned: { type: "number" },
                guarantorExposure: { type: "number" },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                redFlags: { type: "array", items: { type: "string" } }
            }
        };

        // חישוב נתונים לניתוח
        const allLoans = [...(loansDebtorData.loans || []), ...(loansGuarantorData.loansAsGuarantor || [])];
        const totalCreditLines = (accountsData.currentAccounts || []).reduce((sum, acc) => sum + (acc.creditLimit || 0), 0);
        const totalCreditUsed = (accountsData.currentAccounts || []).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const guarantorExposure = (loansGuarantorData.loansAsGuarantor || []).reduce((sum, loan) => sum + (loan.currentBalance || 0), 0) +
                                   (loansGuarantorData.creditLinesAsGuarantor || []).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

        const riskPrompt = `
בצע ניתוח סיכונים מעמיק:

**נתונים:**
- סה"כ חוב: ${basicInfo.summary?.totalDebtILS || 0} ₪
- סה"כ חוב ללא משכנתא: ${basicInfo.summary?.totalDebtExMortgageILS || 0} ₪
- מספר הלוואות כחייב: ${loansDebtorData.loans?.length || 0}
- מספר הלוואות כערב: ${loansGuarantorData.loansAsGuarantor?.length || 0}
- חשיפה כערב: ${guarantorExposure} ₪
- סה"כ מסגרות אשראי: ${totalCreditLines} ₪
- ניצול מסגרות: ${totalCreditUsed} ₪
- החזרות הוראות קבע: ${accountsData.directDebitReturned?.last12Months || 0} ב-12 חודשים

**חשב ציון סיכון 1-10:**
גורמי שקלול:
- החזרות הוראות קבע (> 20 = סיכון גבוה)
- ניצול מסגרות (> 80% = בעייתי)
- חשיפה כערב (> 30% מהחוב = סיכון)
- יתרות שלא שולמו במועד

**זהה:**
1. **3-5 נקודות חוזק** ספציפיות
2. **3-5 נקודות חולשה** ספציפיות
3. **5-7 המלצות מעשיות**
4. **דגלים אדומים** (אם יש)

**חשב:**
- creditUtilization = (ניצול / מסגרות) × 100
- guarantorExposure = חשיפה כערב בש"ח

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
        const allLoansData = [
            ...(loansDebtorData.loans || []).map(loan => ({ ...loan, isGuarantor: false })),
            ...(loansGuarantorData.loansAsGuarantor || []).map(loan => ({ ...loan, isGuarantor: true }))
        ];

        const allAccountsData = [
            ...(accountsData.currentAccounts || []),
            ...(loansGuarantorData.creditLinesAsGuarantor || []).map(acc => ({ ...acc, isGuarantor: true }))
        ];

        const finalResult = {
            reportMeta: basicInfo.reportMeta || {},
            summary: {
                ...(basicInfo.summary || {}),
                totalGuaranteeDealsCount: (loansGuarantorData.loansAsGuarantor?.length || 0) + 
                                          (loansGuarantorData.creditLinesAsGuarantor?.length || 0),
                totalGuaranteeExposureILS: guarantorExposure
            },
            currentAccounts: allAccountsData,
            loans: allLoansData,
            mortgages: mortgagesData.mortgages || [],
            guarantees: mortgagesData.guarantees || [],
            creditInquiries: mortgagesData.creditInquiries || [],
            checksReturned: accountsData.checksReturned || {},
            directDebitReturned: accountsData.directDebitReturned || {},
            analysis: {
                ...analysisData,
                totalChecksReturned: accountsData.checksReturned?.last12Months || 0,
                totalDirectDebitReturned: accountsData.directDebitReturned?.last12Months || 0,
                guarantorExposure: guarantorExposure
            }
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
            analysis_notes: `דוח ריכוז נתונים נותח במלואו. חוב: ${finalResult.summary?.totalDebtILS?.toLocaleString()} ₪ | ערב: ${finalResult.summary?.totalGuaranteeExposureILS?.toLocaleString()} ₪ | החזרות: ${finalResult.analysis?.totalDirectDebitReturned} | סיכון: ${finalResult.analysis?.riskScore}/10 | ${finalResult.currentAccounts?.length} חשבונות, ${finalResult.loans?.length} הלוואות, ${finalResult.mortgages?.length} משכנתאות`
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