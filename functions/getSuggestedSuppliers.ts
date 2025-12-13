import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && user.user_type !== 'financial_manager')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { customer_email, customer_data } = await req.json();

        if (!customer_email) {
            return Response.json({ error: 'Missing customer_email' }, { status: 400 });
        }

        // טוען ספקים קיימים של הלקוח
        const customerSuppliers = await base44.asServiceRole.entities.Supplier.filter({
            customer_emails: [customer_email],
            is_active: true
        });

        // טוען את כל הספקים הפעילים במערכת
        const allSuppliers = await base44.asServiceRole.entities.Supplier.filter({
            is_active: true
        });

        // מסנן ספקים שכבר משויכים ללקוח
        const unassignedSuppliers = allSuppliers.filter(supplier => 
            !supplier.customer_emails?.includes(customer_email)
        );

        // אם אין נתוני לקוח, מחזיר את כל הספקים שלא משויכים
        if (!customer_data) {
            return Response.json({ success: true, data: unassignedSuppliers });
        }

        // ניתוח חכם באמצעות AI
        try {
            // איסוף קטגוריות קיימות
            const existingCategories = [...new Set(customerSuppliers.map(s => s.category).filter(Boolean))];

            // בניית פרומפט לניתוח
            const analysisPrompt = `
אתה מומחה בניתוח עסקי. נתון לך מידע על עסק ועליך להמליץ על קטגוריות ספקים שהעסק עשוי להזדקק להם.

פרטי העסק:
- סוג עסק: ${customer_data.business_type || 'לא צוין'}
- מוצרים/שירותים עיקריים: ${customer_data.main_products || customer_data.main_products_services || 'לא צוין'}
- יעדים עסקיים: ${customer_data.business_goals || 'לא צוין'}
- גודל חברה: ${customer_data.company_size || 'לא צוין'}

קטגוריות ספקים קיימות: ${existingCategories.length > 0 ? existingCategories.join(', ') : 'אין'}

בהתבסס על המידע, המלץ על 5-10 קטגוריות ספקים (בעברית) שהעסק עשוי להזדקק להם.
כלול גם קטגוריות חלופיות לספקים הקיימים (אם יש).

החזר JSON עם המבנה הבא:
{
    "recommended_categories": ["קטגוריה1", "קטגוריה2", ...]
}
`;

            const { data: aiResponse } = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: analysisPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        recommended_categories: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            });

            const recommendedCategories = aiResponse?.recommended_categories || [];

            // סינון ספקים לפי קטגוריות מומלצות
            const scoredSuppliers = unassignedSuppliers.map(supplier => {
                let score = 0;

                // ספק בקטגוריה מומלצת
                if (recommendedCategories.includes(supplier.category)) {
                    score += 10;
                }

                // ספק באותה קטגוריה כמו ספק קיים (אלטרנטיבה)
                if (existingCategories.includes(supplier.category)) {
                    score += 5;
                }

                // ספק שותף מקבל בונוס
                if (supplier.is_partner_supplier) {
                    score += 3;
                }

                // דירוג גבוה מקבל בונוס
                if (supplier.rating >= 4) {
                    score += 2;
                }

                return { ...supplier, relevance_score: score };
            });

            // מיון לפי ציון רלוונטיות
            scoredSuppliers.sort((a, b) => b.relevance_score - a.relevance_score);

            // החזרת עד 20 ספקים מומלצים
            const topSuggestions = scoredSuppliers.slice(0, 20);

            return Response.json({ success: true, data: topSuggestions });

        } catch (aiError) {
            console.error('AI analysis error:', aiError);
            // fallback - מחזיר ספקים לא משויכים
            return Response.json({ success: true, data: unassignedSuppliers });
        }

    } catch (error) {
        console.error('Error in getSuggestedSuppliers:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});