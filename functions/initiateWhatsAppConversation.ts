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
        if (!user || user.role !== 'admin') {
            return new Response('Unauthorized - Admin access required', { status: 403 });
        }

        const { customerEmail } = await req.json();
        
        if (!customerEmail) {
            return new Response(JSON.stringify({ 
                error: 'customerEmail is required' 
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Fetch customer data
        const customers = await base44.entities.User.filter({ email: customerEmail });
        if (customers.length === 0) {
            return new Response(JSON.stringify({ 
                error: 'Customer not found' 
            }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        const customer = customers[0];
        
        if (!customer.phone) {
            return new Response(JSON.stringify({ 
                error: 'Customer phone number not found' 
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Clean phone number (remove non-digits)
        const cleanPhone = customer.phone.replace(/[^\d]/g, '');

        // Prepare Woztell payload
        const woztellPayload = {
            channelId: "686e4c709ee5dba8fb45e8ba",
            recipientId: cleanPhone,
            redirect: {
                tree: "686cf4459ee5dbb68145defa",
                nodeCompositeId: "Tf3N1pDep9xEHMVu",
                runPreAction: true,
                sendResponse: true,
                runPostAction: true
            },
            meta: {
                customer_email: customerEmail,
                customer_name: customer.full_name || customer.business_name,
                initiated_by: user.email,
                timestamp: new Date().toISOString()
            }
        };

        // Make API call to Woztell
        const woztellResponse = await fetch(
            `https://bot.api.woztell.com/redirectMemberToNode?accessToken=${Deno.env.get("WOZTELL_REDIRECT_TOKEN")}`, 
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(woztellPayload)
            }
        );

        const woztellResult = await woztellResponse.text();
        console.log('Woztell response:', woztellResponse.status, woztellResult);

        if (!woztellResponse.ok) {
            throw new Error(`Woztell API error: ${woztellResponse.status} - ${woztellResult}`);
        }

        // Log the action
        try {
            await base44.entities.CustomerAction.create({
                customer_email: customerEmail,
                action_type: "whatsapp_conversation_initiated",
                item_id: "conversation_flow",
                item_title: "התחל שיחה עם הלקוח",
                item_details: {
                    phone_number: cleanPhone,
                    initiated_by: user.email,
                    woztell_response: woztellResult
                }
            });
        } catch (logError) {
            console.error('Error logging action:', logError);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'שיחת וואטסאפ התחילה בהצלחה',
            customer_name: customer.full_name || customer.business_name,
            phone: cleanPhone
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error initiating WhatsApp conversation:", error);
        return new Response(JSON.stringify({ 
            error: error.message,
            success: false 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});