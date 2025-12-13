import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && user.user_type !== 'financial_manager')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { customer_email, search_query, category, current_supplier_name } = await req.json();

        if (!search_query || !category) {
            return Response.json({ 
                success: false,
                error: 'חסרים פרמטרים נדרשים: search_query ו-category' 
            }, { status: 400 });
        }

        // בניית פרומפט מפורט לחיפוש ספקים
        const searchPrompt = `
אתה מומחה במציאת ספקים עסקיים בישראל. המשתמש מחפש ספקים עבור: "${search_query}" בקטגוריה: "${category}".
${current_supplier_name ? `הספק הנוכחי: ${current_supplier_name}` : ''}

חפש 3-5 ספקים מובילים ואיכותיים בישראל שמתאימים לחיפוש זה.
עבור כל ספק, אסוף מידע מדויק ככל האפשר.

חשוב מאוד:
1. מצא ספקים אמיתיים וקיימים בישראל
2. ספק מידע מדויק ועדכני
3. אם לא מצאת מידע כלשהו, השתמש ב-null או השאר את השדה ריק
4. דאג שהתוצאות יהיו רלוונטיות לחיפוש
5. אל תכלול קישורים או URLs בתשובה

החזר JSON עם המבנה הבא:
{
    "suppliers": [
        {
            "name": "שם הספק",
            "description": "תיאור קצר של הספק ושירותיו (2-3 משפטים)",
            "category": "הקטגוריה המדויקת",
            "phone": "מספר טלפון (אם זמין)",
            "email": "אימייל (אם זמין)",
            "contact_person": "שם איש קשר (אם זמין)"
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
                                contact_person: { type: "string" }
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
                message: 'לא נמצאו ספקים מתאימים' 
            });
        }

        // ניקוי והעשרת נתונים
        const cleanedSuppliers = suppliers.map(supplier => ({
            name: supplier.name || 'לא צוין',
            description: supplier.description || '',
            category: supplier.category || category,
            phone: supplier.phone || '',
            email: supplier.email || '',
            contact_person: supplier.contact_person || 'לא צוין'
        }));

        return Response.json({ 
            success: true, 
            suppliers: cleanedSuppliers
        });

    } catch (error) {
        console.error('Error in findAlternativeSuppliersOnline:', error);
        return Response.json({ 
            success: false,
            error: error.message
        }, { status: 500 });
    }
});