import { Base44 } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 FIREBERRY WEBHOOK START');
    console.log('Time:', new Date().toISOString());
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        // יצירת Base44 client עם service role (לא מ-request כי זה webhook חיצוני)
        const base44 = new Base44({
            appId: Deno.env.get('BASE44_APP_ID'),
            serviceRoleSecret: Deno.env.get('MY_SERVICE_TOKEN_SECRET')
        });

        // קריאת ה-body
        let body;
        try {
            body = await req.json();
            console.log('📦 Body received:', JSON.stringify(body, null, 2));
        } catch (parseError) {
            console.error('❌ Failed to parse JSON body:', parseError.message);
            console.error('This might be a test call from Make.com or Fireberry');
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
        const phone = body.telephone1 || body.phone;
        const city = body.address1_city || body.city;
        const customerManager = body.customer_manager;

        console.log('📋 Extracted fields:', {
            accountId,
            accountName,
            email,
            phone,
            city,
            customerManager
        });

        if (!accountId) {
            console.error('❌ Missing accountid');
            return Response.json({ error: 'Missing accountid' }, { status: 400 });
        }

        // מציאת מנהל כספים לפי fireberry_user_id
        let assignedManagerEmail = null;
        if (customerManager) {
            console.log(`🔍 Searching for manager with fireberry_user_id: ${customerManager}`);
            const allUsers = await base44.entities.User.list();
            console.log(`📊 Total users in system: ${allUsers.length}`);

            const usersWithFireberryId = allUsers.filter(u => u.fireberry_user_id);
            console.log(`📊 Users with fireberry_user_id: ${usersWithFireberryId.length}`);
            console.log('Available managers:', usersWithFireberryId.map(u => ({
                email: u.email,
                name: u.full_name,
                fireberry_user_id: u.fireberry_user_id
            })));

            const matchingManager = allUsers.find(u => u.fireberry_user_id === customerManager);
            if (matchingManager) {
                assignedManagerEmail = matchingManager.email;
                console.log(`✅ MATCH FOUND: ${matchingManager.full_name} (${assignedManagerEmail})`);
            } else {
                console.error(`❌ NO MATCH: No user with fireberry_user_id = ${customerManager}`);
            }
        } else {
            console.warn('⚠️ No customer_manager in payload');
        }

        // Check if account exists
        console.log('🔍 Checking for existing account...');
        const existingRequests = await base44.entities.OnboardingRequest.list();
        const exists = existingRequests.find(r => 
            r.fireberry_account_id === accountId || 
            (r.email && email && r.email.toLowerCase() === email.toLowerCase())
        );

        if (exists) {
            console.log('📌 Account EXISTS:', exists.id);
            console.log('Current data:', {
                fireberry_account_id: exists.fireberry_account_id,
                assigned_manager: exists.assigned_financial_manager_email
            });
            console.log('New data:', {
                fireberry_account_id: accountId,
                assigned_manager: assignedManagerEmail
            });

            const updateData = {};
            if (!exists.fireberry_account_id) {
                updateData.fireberry_account_id = accountId;
                console.log('➕ Will add fireberry_account_id');
            }
            if (assignedManagerEmail && exists.assigned_financial_manager_email !== assignedManagerEmail) {
                updateData.assigned_financial_manager_email = assignedManagerEmail;
                console.log('➕ Will update assigned_financial_manager_email');
            }

            if (Object.keys(updateData).length > 0) {
                console.log('💾 Updating with:', updateData);
                const updated = await base44.entities.OnboardingRequest.update(exists.id, updateData);
                console.log('✅ UPDATE SUCCESS:', {
                    id: updated.id,
                    assigned_manager: updated.assigned_financial_manager_email
                });
                return Response.json({ 
                    success: true,
                    message: 'Updated existing account', 
                    id: exists.id, 
                    updated_fields: Object.keys(updateData),
                    assigned_manager: updated.assigned_financial_manager_email
                });
            }
            console.log('⏭️ No updates needed');
            return Response.json({ 
                success: true,
                message: 'Account already exists, no updates needed', 
                id: exists.id 
            });
        }

        // Create new OnboardingRequest
        console.log('🆕 Creating NEW account...');
        console.log('Data to create:', {
            fireberry_account_id: accountId,
            business_name: accountName,
            email: email,
            phone: phone,
            assigned_manager: assignedManagerEmail
        });

        const newRequest = await base44.entities.OnboardingRequest.create({
            fireberry_account_id: accountId,
            business_name: accountName,
            full_name: accountName,
            email: email,
            phone: phone,
            business_city: city,
            status: 'approved',
            onboarding_status: 'idle',
            is_active: true,
            assigned_financial_manager_email: assignedManagerEmail,
            main_products_services: 'Generated from Fireberry',
            bestselling_products: '-',
            unwanted_products: '-',
            company_size: '1-10',
            business_type: 'other'
        });

        console.log('✅ CREATE SUCCESS:', {
            id: newRequest.id,
            fireberry_account_id: newRequest.fireberry_account_id,
            assigned_manager: newRequest.assigned_financial_manager_email
        });

        return Response.json({ 
            success: true, 
            message: 'Created new account from Fireberry', 
            id: newRequest.id,
            fireberry_account_id: accountId,
            assigned_manager: newRequest.assigned_financial_manager_email
        });

    } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ ERROR CAUGHT:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return Response.json({ 
            success: false,
            error: error.message, 
            stack: error.stack 
        }, { status: 500 });
    } finally {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🏁 FIREBERRY WEBHOOK END');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
});