import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    console.log('🔄 syncManagerFromFireberry called');
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || (user.role !== 'admin' && user.user_type !== 'financial_manager')) {
            console.error('❌ Unauthorized access');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { fireberry_account_id, fireberry_user_id } = await req.json();
        console.log('Input:', { fireberry_account_id, fireberry_user_id });
        
        if (!fireberry_account_id || !fireberry_user_id) {
            return Response.json({ 
                error: 'Missing required fields: fireberry_account_id and fireberry_user_id' 
            }, { status: 400 });
        }
        
        // Find the client
        console.log('🔍 Searching for client...');
        const allRequests = await base44.asServiceRole.entities.OnboardingRequest.list();
        const client = allRequests.find(r => r.fireberry_account_id === fireberry_account_id);
        
        if (!client) {
            console.error('❌ Client not found');
            return Response.json({ error: 'Client not found' }, { status: 404 });
        }
        
        console.log('✅ Client found:', client.id);
        
        // Find the manager
        console.log('🔍 Searching for manager...');
        const allUsers = await base44.asServiceRole.entities.User.list();
        const manager = allUsers.find(u => u.fireberry_user_id === fireberry_user_id);
        
        if (!manager) {
            console.error('❌ Manager not found');
            return Response.json({ 
                error: 'Manager not found',
                available_managers: allUsers
                    .filter(u => u.fireberry_user_id)
                    .map(u => ({
                        email: u.email,
                        name: u.full_name,
                        fireberry_user_id: u.fireberry_user_id
                    }))
            }, { status: 404 });
        }
        
        console.log('✅ Manager found:', manager.email);
        
        // Update the assignment
        console.log('💾 Updating assignment...');
        const updated = await base44.asServiceRole.entities.OnboardingRequest.update(client.id, {
            assigned_financial_manager_email: manager.email
        });
        
        console.log('✅ Update successful:', {
            client_id: updated.id,
            assigned_manager: updated.assigned_financial_manager_email
        });
        
        return Response.json({
            success: true,
            message: 'Manager assigned successfully',
            client_id: client.id,
            client_name: client.business_name,
            assigned_manager_email: manager.email,
            assigned_manager_name: manager.full_name
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});