import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// פונקציה זו מאחזרת רשימת משתמשים שניתן לשייך להם משימות
// היא רצה עם הרשאות מנהל מערכת כדי לעקוף את מגבלות ה-RLS עבור מנהלי כספים
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // ודא שהמשתמש המבצע את הבקשה מחובר למערכת
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        // השתמש בהרשאות מנהל כדי לאחזר את רשימת המשתמשים הרלוונטיים
        const { data: users, error } = await base44.asServiceRole.entities.User.filter({
            "$or": [
                { "role": "admin" },
                { "user_type": "financial_manager" }
            ],
            "is_active": true
        });

        if (error) {
            throw error;
        }

        // החזר רק את השדות הנדרשים לממשק המשתמש כדי למנוע חשיפת מידע רגיש
        const assignableUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name
        }));

        return new Response(JSON.stringify(assignableUsers), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error in getAssignableUsers function:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});