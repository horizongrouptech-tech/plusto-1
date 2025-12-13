
import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

// פונקציה לניקוי טקסט מתווי שורה חדשה ורווחים מיותרים
function cleanTextForWhatsApp(text, maxLength = 300) {
    if (!text) return '';
    
    let cleaned = String(text); // וודא שהקלט הוא מחרוזת
    cleaned = cleaned.replace(/[\n\t]/g, ' ');           // החלף \n ו- \t ברווח
    cleaned = cleaned.replace(/\s{5,}/g, '    ');       // החלף 5+ רווחים ב-4 רווחים
    cleaned = cleaned.trim();                       // הסר רווחים מההתחלה והסוף
    
    // חתוך אם ארוך מדי
    if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength - 3) + '...';
    }
    
    return cleaned;
}

// תבניות Woztell מלאות - עם כל השדות הנדרשים כפי שהוגדרו ב-Woztell
// שינוי: הוסרו כוכביות (מרקdown לבולד) מהטקסט של התבניות
const WOZTELL_TEMPLATES = {
    free_recommendation_v1: {
        "type": "TEMPLATE",
        "integrationId": "686e4c719ee5dbad9b45e8bb",
        "wabaId": "1368986137538733",
        "namespace": "d0965143_def8_4407_9e1c_ad0a0439e36b",
        "components": [
            {
                "type": "body",
                "parameters": [
                    { "type": "text", "text": "שם" },
                    { "type": "text", "text": "המלצה" }
                ]
            },
            {
                "type": "button",
                "sub_type": "quick_reply",
                "index": "0",
                "parameters": [
                    { "type": "payload", "payload": "payload_1" }
                ]
            },
            {
                "type": "button",
                "sub_type": "quick_reply",
                "index": "1",
                "parameters": [
                    { "type": "payload", "payload": "payload_2" }
                ]
            },
            {
                "type": "button",
                "sub_type": "quick_reply",
                "index": "2",
                "parameters": [
                    { "type": "payload", "payload": "payload_3" }
                ]
            }
        ],
        "elementName": "free_recommendation_v1",
        "languageCode": "he",
        "languagePolicy": "deterministic",
        "content": [
            {
                "type": "BODY",
                "text": "שלום {{1}},\nיש לנו המלצה חדשה עבורך:\n{{2}}", // Removed asterisks
                "example": {
                    "body_text": [
                        [
                            "אופק",
                            "בהמשך לשיחה שלנו מומלץ לשמור את הנתונים למשך שנה"
                        ]
                    ]
                }
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    { "type": "QUICK_REPLY", "text": "מדוייק לי, אני מיישם" },
                    { "type": "QUICK_REPLY", "text": "אשמח להרחבה ופירוט" },
                    { "type": "QUICK_REPLY", "text": "לא רלוונטי עבורי" }
                ]
            }
        ],
        "signature": "95lG60aLCAxTf4y6g/fuwB/krWZqdqtRs5fzia62Ywk="
    },
    
    recommendation_v1: {
        "type": "TEMPLATE",
        "integrationId": "686e4c719ee5dbad9b45e8bb",
        "wabaId": "1368986137538733",
        "namespace": "d0965143_def8_4407_9e1c_ad0a0439e36b",
        "components": [
            {
                "type": "body",
                "parameters": [
                    { "type": "text", "text": "שם" },
                    
                    { "type": "text", "text": "כותרת המלצה" },
                    
                    { "type": "text", "text": "תיאור" },
                    
                    { "type": "text", "text": "שלבי ביצוע" },
                    
                    { "type": "text", "text": "רווח צפוי" }
                ]
            },
            {
                "type": "button",
                "sub_type": "quick_reply",
                "index": "0",
                "parameters": [
                    { "type": "payload", "payload": "payload_1" }
                ]
            },
            {
                "type": "button",
                "sub_type": "quick_reply",
                "index": "1",
                "parameters": [
                    { "type": "payload", "payload": "payload_2" }
                ]
            },
            {
                "type": "button",
                "sub_type": "quick_reply",
                "index": "2",
                "parameters": [
                    { "type": "payload", "payload": "payload_3" }
                ]
            }
        ],
        "elementName": "recommendation_v1",
        "languageCode": "he",
        "languagePolicy": "deterministic",
        "content": [
            {
                "type": "BODY",
                "text": "שלום {{1}},\nיש לנו המלצה חדשה עבורך: {{2}}.\n{{3}}.\nשלבי ביצוע : {{4}}\nרווח צפוי: {{5}}", // REMOVED "תיאור: " from here
                "example": {
                    "body_text": [
                        [
                            "אופק",
                            "בהמשך לשיחתנו",
                            "אנו חוזרים אליך לבקשת עם המסמכים",
                            "לאט",
                            "כ 100"
                        ]
                    ]
                }
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    { "type": "QUICK_REPLY", "text": "מדוייק לי, אני מיישם" },
                    { "type": "QUICK_REPLY", "text": "אשמח להרחבה ופירוט" },
                    { "type": "QUICK_REPLY", "text": "לא רלוונטי עבורי" }
                ]
            }
        ],
        "signature": "95lG60aLCAxTf4y6g/fuwB/krWZqdqtRs5fzia62Ywk="
    }
};

const generateRecommendationId = () => {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response('Unauthorized', { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);

        const { 
            phoneNumber, 
            customerEmail,
            recommendation,
            templateType = 'auto'
        } = await req.json();

        if (!phoneNumber || !customerEmail || !recommendation) {
            return new Response(JSON.stringify({ 
                error: 'Missing required fields: phoneNumber, customerEmail, recommendation' 
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // נקה את מספר הטלפון מסימנים מיותרים - בלי + בהתחלה
        const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        // START OF MODIFICATION: Get customer details from CustomerContact or User
        let customerData = null;
        try {
            // First, try to find in CustomerContact (our new dedicated contact entity)
            const customerContacts = await base44.entities.CustomerContact.filter({ customer_email: customerEmail });
            if (customerContacts.length > 0) {
                customerData = customerContacts[0];
                console.log('Customer data found in CustomerContact entity:', customerData.customer_email);
            } else {
                console.log('Customer data not found in CustomerContact entity. Trying User entity...');
                // If not found in CustomerContact, try to find in User entity
                const users = await base44.entities.User.filter({ email: customerEmail });
                if (users.length > 0) {
                    customerData = users[0];
                    console.log('Customer data found in User entity:', customerData.email);
                } else {
                    console.log('Customer data not found in User entity. Defaulting to generic name.');
                }
            }
        } catch (error) {
            console.error('Error fetching customer data for WhatsApp message:', error);
            console.log('Defaulting to generic customer name due to fetch error.');
        }

        // Define the name to be used in the template. If not found, use "לקוח יקר".
        // It prioritizes business_name, then full_name, then defaults.
        const customerNameForTemplate = customerData?.full_name || customerData?.business_name || 'לקוח יקר';
        // END OF MODIFICATION:

        // הכנת הפרמטרים לתבנית עם ניקוי ועיבוד מקדים
        // Original code using 'customer' variable - now replace 'customer' with 'customerData' or 'customerNameForTemplate'
        // depending on what is needed. For the name field, we'll use customerNameForTemplate.
        // For title, description etc., recommendation object is passed directly which is good.
        const title = cleanTextForWhatsApp(recommendation.title, 100);
        const description = cleanTextForWhatsApp(recommendation.description, 800);
        
        // עיבוד שלבי הביצוע - המרה לפורמט ממוספר
        let actionSteps = 'לא צוינו שלבי ביצוע';
        if (Array.isArray(recommendation.action_steps) && recommendation.action_steps.length > 0) {
            actionSteps = recommendation.action_steps
                .map((step, index) => `${index + 1}. ${step.trim()}`)
                .join('. ');
            actionSteps = cleanTextForWhatsApp(actionSteps, 500);
        }

        const expectedProfit = recommendation.expected_profit 
            ? `₪${Math.round(recommendation.expected_profit).toLocaleString()}`
            : 'לא צוין';

        // בחר תבנית מתאימה
        let selectedTemplate;
        if (templateType === 'short' || templateType === 'free_recommendation_v1') {
            selectedTemplate = 'free_recommendation_v1';
        } else if (templateType === 'long' || templateType === 'recommendation_v1') {
            selectedTemplate = 'recommendation_v1';
        } else {
            const totalLength = (recommendation.title || '').length + 
                               (recommendation.description || '').length + 
                               (recommendation.action_steps ? recommendation.action_steps.join(' ').length : 0);
            selectedTemplate = totalLength > 150 ? 'recommendation_v1' : 'free_recommendation_v1';
        }

        // קבל את התבנית המלאה עם כל השדות
        const template = JSON.parse(JSON.stringify(WOZTELL_TEMPLATES[selectedTemplate]));

        // החלף רק את הפרמטרים בתוך components עם ניקוי טקסט
        if (selectedTemplate === 'free_recommendation_v1') {
            template.components[0].parameters[0].text = cleanTextForWhatsApp(customerNameForTemplate, 50); // Use the derived name
            template.components[0].parameters[1].text = cleanTextForWhatsApp(title || description || 'המלצה חדשה', 500);
        } else {
            template.components[0].parameters[0].text = cleanTextForWhatsApp(customerNameForTemplate, 50); // Use the derived name
            template.components[0].parameters[1].text = title;
            template.components[0].parameters[2].text = description;
            template.components[0].parameters[3].text = actionSteps;
            template.components[0].parameters[4].text = cleanTextForWhatsApp(expectedProfit, 50);
        }

        // יצר מזהה ייחודי להמלצה
        const uniqueRecommendationId = generateRecommendationId();
        
        // ודא שההמלצה קיימת במערכת
        if (!recommendation.id) {
            console.warn('Warning: Recommendation has no ID, feedback connection may not work');
        }

        // שמור את ה-unique ID בהמלצה כדי שהפידבק יוכל להתחבר אליה
        if (recommendation.id) {
            try {
                await base44.entities.Recommendation.update(recommendation.id, {
                    related_data: {
                        ...(recommendation.related_data || {}), // שמור את הנתונים הקיימים, או צור אובייקט ריק אם אין
                        unique_recommendation_id: uniqueRecommendationId // הוסף את ה-ID החדש
                    },
                    delivery_status: 'sent'
                });
                console.log('Updated recommendation with unique ID:', uniqueRecommendationId);
            } catch (updateError) {
                console.error('Error updating recommendation with unique ID:', updateError);
            }
        }
        
        // עדכן את ה-payloads עם המזהה הייחודי
        template.components[1].parameters[0].payload = `${uniqueRecommendationId}_implemented`;
        template.components[2].parameters[0].payload = `${uniqueRecommendationId}_details`;
        template.components[3].parameters[0].payload = `${uniqueRecommendationId}_not_relevant`;

        // הכן את הבקשה ל-Woztell בפורמט הנדרש
        const woztellPayload = {
            "channelId": Deno.env.get("WOZTELL_CHANNEL_ID"),
            "recipientId": cleanPhoneNumber,
            "response": [template]
        };

        console.log('Sending to Woztell:', JSON.stringify(woztellPayload, null, 2));

        // שלח ל-Woztell
        const woztellResponse = await fetch('https://bot.api.woztell.com/sendResponses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get("WOZTELL_AP_KEY")}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(woztellPayload),
        });

        const woztellResult = await woztellResponse.text();
        console.log('Woztell response:', woztellResponse.status, woztellResult);

        if (!woztellResponse.ok) {
            throw new Error(`Woztell API error: ${woztellResponse.status} - ${woztellResult}`);
        }

        // רשום את השליחה במערכת
        try {
            await base44.entities.CustomerAction.create({
                customer_email: customerEmail,
                action_type: "whatsapp_sent",
                item_id: recommendation.id || 'unknown',
                item_title: recommendation.title || 'המלצה בוואטסאפ',
                item_details: {
                    phone_number: cleanPhoneNumber,
                    template_used: selectedTemplate,
                    unique_recommendation_id: uniqueRecommendationId,
                    sent_at: new Date().toISOString()
                }
            });
        } catch (logError) {
            console.error('Error logging action:', logError);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'הודעה נשלחה בהצלחה',
            uniqueRecommendationId: uniqueRecommendationId,
            templateUsed: selectedTemplate,
            recommendationId: recommendation.id,
            feedbackEnabled: !!recommendation.id
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
        return new Response(JSON.stringify({ 
            error: error.message,
            success: false 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
