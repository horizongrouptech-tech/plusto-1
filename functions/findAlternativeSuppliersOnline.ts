import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && user.user_type !== 'financial_manager')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            customer_email, 
            search_query, 
            category, 
            current_supplier_name,
            business_type,
            main_products,
            location 
        } = await req.json();

        if (!search_query || !category) {
            return Response.json({ 
                success: false,
                error: 'חסרים פרמטרים נדרשים: search_query ו-category' 
            }, { status: 400 });
        }

        // בניית פרומפט מותאם לסוג העסק
        const businessContext = business_type ? `
סוג העסק של הלקוח: ${business_type}
${main_products ? `מוצרים/שירותים עיקריים: ${main_products}` : ''}
${location ? `מיקום: ${location}` : ''}
` : '';

        const searchPrompt = `
אתה מומחה במציאת ספקים עסקיים בישראל. 

פרטי החיפוש:
- מה מחפשים: "${search_query}"
- קטגוריה: "${category}"
${current_supplier_name ? `- ספק נוכחי (לחיפוש חלופה): ${current_supplier_name}` : ''}
${businessContext}

משימתך:
1. מצא 3-5 ספקים מובילים ואיכותיים בישראל שמתאימים לחיפוש
2. התמקד בספקים שמתאימים לסוג העסק והצרכים הספציפיים
3. העדף ספקים עם מוניטין טוב ושירות איכותי

⚠️ חשוב מאוד - פרטיות ודיוק:
- אל תציג מידע פנימי או סודי
- ספק רק מידע ציבורי וזמין
- אם לא מצאת מידע - השאר את השדה ריק
- דאג שהתוצאות יהיו רלוונטיות לסוג העסק
- אל תכלול קישורים או URLs

החזר JSON עם המבנה הבא:
{
    "suppliers": [
        {
            "name": "שם הספק",
            "description": "תיאור קצר של הספק, שירותיו והתאמתו לסוג העסק (2-3 משפטים)",
            "category": "הקטגוריה המדויקת",
            "phone": "מספר טלפון (אם זמין)",
            "email": "אימייל (אם זמין)",
            "contact_person": "שם איש קשר (אם זמין)",
            "relevance_reason": "למה ספק זה מתאים לסוג העסק הזה (משפט אחד)"
        }
    ]
}
`;

        const searchResults = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: searchPrompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    suppliers: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                description: { type: "string" },
                                category: { type: "string" },
                                phone: { type: "string" },
                                email: { type: "string" },
                                contact_person: { type: "string" },
                                relevance_reason: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const suppliers = searchResults?.suppliers || [];

        if (suppliers.length === 0) {
            return Response.json({ 
                success: true, 
                suppliers: [],
                message: 'לא נמצאו ספקים מתאימים לחיפוש זה' 
            });
        }

        // ניקוי נתונים - רק מידע ציבורי
        const cleanedSuppliers = suppliers.map(supplier => ({
            name: supplier.name || 'לא צוין',
            description: supplier.description || '',
            category: supplier.category || category,
            phone: supplier.phone || '',
            email: supplier.email || '',
            contact_person: supplier.contact_person || '',
            relevance_reason: supplier.relevance_reason || '',
            source: 'internet_search'
        }));

        return Response.json({ 
            success: true, 
            suppliers: cleanedSuppliers,
            search_context: {
                query: search_query,
                category: category,
                business_type: business_type || null
            }
        });

    } catch (error) {
        console.error('Error in findAlternativeSuppliersOnline:', error);
        return Response.json({ 
            success: false,
            error: error.message
        }, { status: 500 });
    }
});