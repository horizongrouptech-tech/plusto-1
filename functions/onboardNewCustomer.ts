import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        console.error("0. onboardNewCustomer: Function execution started.");

        const rawPayload = await req.json();
        console.error("1. onboardNewCustomer: Raw payload received.", JSON.stringify(rawPayload, null, 2));

        const payload = {};
        if (rawPayload && typeof rawPayload === 'object') {
            for (const [key, value] of Object.entries(rawPayload)) {
                payload[key.trim()] = value;
            }
        }

        const businessTypeMap = {
            'קמעונאות': 'retail',
            'סיטונאות': 'wholesale',
            'ייבוא': 'import',
            'ייצור': 'manufacturing',
            'יצוא': 'export',
            'שירותים': 'services',
            'מסעדות/קייטרינג': 'restaurant',
            'אופנה': 'fashion',
            'טכנולוגיה': 'tech',
            'אחר': 'other'
        };

        const companySizeMap = {
            '1-10 עובדים': '1-10',
            '11-50 עובדים': '11-50',
            '51-200 עובדים': '51-200',
            'מעל 200 עובדים': '200+'
        };

        // NEW: File mapping from Hebrew to English field names
        const fileFieldsMap = {
            'דוח מאזן': 'balance_sheet_reports',
            'דוח מלאי': 'inventory_reports', 
            'תדפיס בנק': 'bank_statements',
            'דוח מבצעים': 'promotions_reports',
            'דוח מכירות': 'sales_reports',
            'דוח רווח והפסד': 'profit_loss_reports',
            'דוח כרטיס אשראי': 'credit_card_reports',
            'דוח נתוני אשראי': 'credit_reports'
        };
        
        console.error("2. onboardNewCustomer: Mapping data for OnboardingRequest entity.");
        
        const onboardingData = {
            email: payload['email'] || null,
            phone: payload['phone'] || null,
            full_name: payload['full_name'] || null,
            website_url: payload['website_url'] || null,
            company_size: companySizeMap[payload['company_size']] || payload['company_size'] || null, 
            business_city: payload['business_city'] || null,
            business_name: payload['business_name'] || null,
            business_goals: payload['business_goals'] || null,
            business_type: businessTypeMap[payload['business_type']] || payload['business_type'] || 'other', 
            monthly_revenue: parseFloat(payload['monthly_revenue']) || 0,
            target_audience: payload['target_audience'] || null,
            main_products_services: (payload['main_products_services'] || '').trim(),
            bestselling_products: (payload['bestselling_products'] || '').trim(),
            unwanted_products: (payload['unwanted_products'] || '').trim(),
            status: 'pending'
        };

        // NEW: Process file fields mapping from Hebrew to English
        Object.entries(fileFieldsMap).forEach(([hebrewKey, englishKey]) => {
            const fileArray = payload[hebrewKey];
            if (fileArray && Array.isArray(fileArray)) {
                // Filter out null values and convert valid URLs to proper format
                const validFiles = fileArray
                    .filter(file => file !== null && file !== undefined && file !== '')
                    .map(fileUrl => {
                        if (typeof fileUrl === 'string') {
                            // Simple URL - convert to object format expected by processAndCreateFileUploads
                            const fileName = fileUrl.split('/').pop() || 'uploaded_file';
                            return {
                                url: fileUrl,
                                file_name: fileName,
                                mime_type: 'application/octet-stream',
                                file_size: 0 // Will be determined during processing
                            };
                        }
                        return fileUrl; // Already in correct format
                    });
                
                onboardingData[englishKey] = validFiles;
            } else {
                onboardingData[englishKey] = [];
            }
        });

        // Add context fields for better AI recommendations (if they exist in future)
        onboardingData.competitors = payload['מתחרים עיקריים'] || payload['competitors'] || null;
        onboardingData.main_challenges = payload['אתגרים עיקריים'] || payload['main_challenges'] || null;

        console.error("3. onboardNewCustomer: Final onboardingData object prepared.", JSON.stringify(onboardingData, null, 2));

        console.error("Attempting to create OnboardingRequest record using SDK...");
        const newRequest = await base44.entities.OnboardingRequest.create(onboardingData);
        console.error("4. onboardNewCustomer: Successfully created OnboardingRequest with ID:", newRequest.id);

        // This trigger might be for an initial, partial processing. 
        // The full orchestration happens after admin approval via `approveOnboardingRequest`.
        const orchestratorUrl = `${new URL(req.url).origin.replace('http://', 'https://')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/autoOnboardingOrchestrator`;
        
        console.error(`5. onboardNewCustomer: Triggering autoOnboardingOrchestrator for request ID: ${newRequest.id}`);
        
        fetch(orchestratorUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': Deno.env.get('BASE44_API_KEY'),
            },
            body: JSON.stringify({
                customer_email: newRequest.email,
                onboarding_request_id: newRequest.id
            })
        }).catch(e => console.error("onboardNewCustomer: Orchestrator trigger failed:", e));

        console.error("6. onboardNewCustomer: Function finished successfully. Returning response.");

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Onboarding request received and is being processed.",
            request_id: newRequest.id
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("CRITICAL ERROR in onboardNewCustomer function:", error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: "An internal server error occurred.", 
            details: error.message 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});