import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗄️ ARCHIVE FIREBERRY CLIENT START');
    console.log('Time:', new Date().toISOString());
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // יצירת Base44 client עם service role (webhook חיצוני)
        const base44 = createClientFromRequest(req);

        // קריאת ה-body
        let body;
        try {
            body = await req.json();
            console.log('📦 Body received:', JSON.stringify(body, null, 2));
        } catch (parseError) {
            console.error('❌ Failed to parse JSON body:', parseError.message);
            return Response.json({ 
                success: true,
                message: 'Webhook received but body parsing failed - might be a test call' 
            }, { status: 200 });
        }

        if (!body || Object.keys(body).length === 0) {
            console.error('❌ Empty body object');
            return Response.json({ 
                success: true,
                message: 'Webhook received but body is empty - might be a test call' 
            }, { status: 200 });
        }

        // Fireberry Account fields mapping
        const accountId = body.accountid;
        const accountName = body.name || body.accountname;
        const email = body.emailaddress1 || body.email;

        console.log('📋 Extracted fields:', {
            accountId,
            accountName,
            email
        });

        if (!accountId) {
            console.error('❌ Missing accountid');
            return Response.json({ error: 'Missing accountid' }, { status: 400 });
        }

        // מצא את הלקוח רק לפי fireberry_account_id
        console.log('🔍 Searching for client by fireberry_account_id...');
        const existingRequests = await base44.asServiceRole.entities.OnboardingRequest.list();
        const client = existingRequests.find(r => 
            r.fireberry_account_id === accountId
        );

        if (!client) {
            console.error('❌ Client not found');
            return Response.json({ 
                error: 'Client not found', 
                accountId 
            }, { status: 404 });
        }

        console.log('✅ Client found:', {
            id: client.id,
            business_name: client.business_name,
            current_status: client.is_active
        });

        // העבר לארכיון
        console.log('🗄️ Archiving client...');
        const updated = await base44.asServiceRole.entities.OnboardingRequest.update(client.id, {
            is_active: false
        });

        console.log('✅ Archive SUCCESS:', {
            id: updated.id,
            business_name: updated.business_name,
            is_active: updated.is_active
        });

        return Response.json({
            success: true,
            message: 'Client archived successfully',
            client: {
                id: updated.id,
                business_name: updated.business_name,
                fireberry_account_id: updated.fireberry_account_id,
                is_active: updated.is_active
            }
        });

    } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    } finally {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🏁 ARCHIVE FIREBERRY CLIENT END');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
});