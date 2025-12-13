import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response('Unauthorized', { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);

        const user = await base44.auth.me();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { forecast_data, business_name, forecast_name, business_plan_text } = await req.json();
        
        if (!forecast_data || !business_name) {
            return new Response(JSON.stringify({ error: 'חסרים נתוני תחזית או שם עסק' }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        
        if (!business_plan_text) {
             return new Response(JSON.stringify({ error: 'טקסט התוכנית העסקית חסר. יש ליצור את התוכנית במלל תחילה.' }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // המרת הטקסט למערך בתים בקידוד UTF-8
        const textEncoder = new TextEncoder();
        const textBytes = textEncoder.encode(business_plan_text);

        // שם הקובץ שיוורד
        const fileName = `תוכנית_עסקית_${forecast_name?.replace(/ /g, '_') || business_name.replace(/ /g, '_')}.txt`;

        // החזרת קובץ הטקסט כתגובת HTTP
        return new Response(textBytes, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${fileName}"`
            }
        });

    } catch (error) {
        console.error("Error in exportBusinessPlanToPdf:", error);
        return new Response(JSON.stringify({ 
            error: `שגיאה בייצוא: ${error.message}` 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});