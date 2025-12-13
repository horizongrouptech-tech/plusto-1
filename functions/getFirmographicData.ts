import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        // Authentication
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

        const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
        if (!API_KEY) {
            return new Response("API key not configured", { status: 500 });
        }

        const requestBody = await req.json();

        const matchResponse = await fetch("https://api.explorium.ai/v1/businesses/match", {
            method: "POST",
            headers: {
                "API_KEY": API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "businesses_to_match": requestBody.businesses || []
            })
        });

        const matchRes = await matchResponse.json();
        const businessesIds = matchRes.matched_businesses?.map((x) => x.business_id);

        const response = await fetch("https://api.explorium.ai/v1/businesses/firmographics/bulk_enrich", {
            method: "POST",
            headers: {
                "api_key": API_KEY,
                "accept": "application/json",
                "content-type": "application/json"
            },
            body: JSON.stringify({
                "business_ids": businessesIds || []
            })
        });

        const { data } = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});