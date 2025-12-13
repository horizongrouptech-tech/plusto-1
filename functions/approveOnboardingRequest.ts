import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.5.0';

// Helper to create account in Fireberry
// Note: Uses FIREBERRY_WEBHOOK_URL assuming it handles generic actions or a separate FIREBERRY_CREATE_ACCOUNT_URL needs to be configured.
// Since we don't have a specific Create API key yet, we'll log the intent or try to use the webhook if compatible.
// For now, we will simulate the sync and log if configuration is missing.
async function syncToFireberry(customerData) {
    const createUrl = Deno.env.get('FIREBERRY_CREATE_ACCOUNT_URL') || Deno.env.get('FIREBERRY_WEBHOOK_URL');
    
    if (!createUrl) {
        console.log('Skipping Fireberry sync: No FIREBERRY_CREATE_ACCOUNT_URL configured');
        return null;
    }

    try {
        const payload = {
            action: 'create_account', // Signal to the receiving webhook what to do
            name: customerData.business_name || customerData.full_name,
            email: customerData.email,
            phone: customerData.phone,
            city: customerData.business_city,
            plasto_id: customerData.id
        };

        const response = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            return result.accountid; // Assuming response returns the new ID
        }
    } catch (error) {
        console.error('Error syncing to Fireberry:', error);
    }
    return null;
}

Deno.serve(async (req) => {
    let onboardingRequest = null;
    let serviceClient = null;

    try {
        const userClient = createClientFromRequest(req);

        if (!(await userClient.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }
        
        const currentUser = await userClient.auth.me();
        const isAdmin = currentUser?.role === 'admin';
        const isFinancialManager = currentUser?.role === 'user' && currentUser?.user_type === 'financial_manager';

        if (!currentUser || (!isAdmin && !isFinancialManager)) {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden: Admin or Financial Manager access required' }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const { onboardingRequest: rawOnboardingRequest } = await req.json();

        if (!rawOnboardingRequest || !rawOnboardingRequest.id) {
            return new Response(JSON.stringify({ success: false, error: 'onboardingRequest ID is required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        serviceClient = createClient({
            appId: Deno.env.get('BASE44_APP_ID'),
            serviceToken: Deno.env.get('BASE44_API_KEY')
        });

        onboardingRequest = await serviceClient.asServiceRole.entities.OnboardingRequest.get(rawOnboardingRequest.id);

        if (!onboardingRequest) {
            return new Response(JSON.stringify({ success: false, error: 'OnboardingRequest not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (onboardingRequest.status === 'approved') {
            return new Response(JSON.stringify({ success: true, message: 'Onboarding request already approved.' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create CustomerContact record
        console.log(`Creating CustomerContact record for ${onboardingRequest.email}...`);
        try {
            await serviceClient.asServiceRole.entities.CustomerContact.create({
                customer_email: onboardingRequest.email,
                phone: onboardingRequest.phone || '',
                full_name: onboardingRequest.full_name || '',
                business_name: onboardingRequest.business_name || ''
            });
            console.log(`CustomerContact record created successfully for ${onboardingRequest.email}.`);
        } catch (contactError) {
            console.error(`Failed to create CustomerContact record for ${onboardingRequest.email}:`, contactError.message);
        }

        // Sync to Fireberry if missing ID
        if (!onboardingRequest.fireberry_account_id) {
            console.log('Attempting to sync new customer to Fireberry...');
            const newFireberryId = await syncToFireberry(onboardingRequest);
            
            if (newFireberryId) {
                console.log('Synced to Fireberry, new ID:', newFireberryId);
                await serviceClient.asServiceRole.entities.OnboardingRequest.update(onboardingRequest.id, {
                    fireberry_account_id: newFireberryId
                });
            }
        }

        await serviceClient.asServiceRole.entities.OnboardingRequest.update(onboardingRequest.id, { 
            status: 'approved',
            onboarding_status: 'running'
        });

        console.log(`Starting background onboarding process for request ID: ${onboardingRequest.id}`);

        const orchestratorUrl = `https://plusto-35082d94.base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/autoOnboardingOrchestrator`;
        fetch(orchestratorUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': Deno.env.get('BASE44_API_KEY'),
            },
            body: JSON.stringify({ 
                customer_email: onboardingRequest.email,
                onboarding_request_id: onboardingRequest.id 
            })
        }).catch(err => {
            console.error(`Failed to trigger autoOnboardingOrchestrator for ${onboardingRequest.email}:`, err);
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'Customer approved and onboarding process initiated successfully',
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error('Error in approveOnboardingRequest:', error.message, error.stack);
        
        if (onboardingRequest?.id && serviceClient) {
            try {
                await serviceClient.asServiceRole.entities.OnboardingRequest.update(onboardingRequest.id, { 
                    status: 'pending',
                    onboarding_status: 'failed',
                    admin_notes: (onboardingRequest.admin_notes || '') + `\nApproval failed: ${error.message}`
                });
            } catch (updateError) {
                console.error('Failed to update request status after error:', updateError);
            }
        }

        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});