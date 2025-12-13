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

    const { supplier_id, request_details, request_type = 'quote_request', estimated_value, priority = 'medium' } = await req.json();

    if (!supplier_id || !request_details) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'חסרים פרמטרים נדרשים: supplier_id ו-request_details' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get supplier details
    const supplier = await base44.entities.Supplier.get(supplier_id);
    if (!supplier) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ספק לא נמצא' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find the supplier user associated with this supplier
    let supplierUser = null;
    if (supplier.supplier_user_email) {
      try {
        const users = await base44.entities.User.filter({
          email: supplier.supplier_user_email,
          user_type: 'supplier_user'
        });
        if (users.length > 0) {
          supplierUser = users[0];
        }
      } catch (e) {
        console.warn('Could not find supplier user:', e);
      }
    }

    // Create lead
    const leadData = {
      supplier_id: supplier_id,
      customer_email: user.email,
      customer_name: user.full_name || user.business_name || user.email,
      customer_phone: user.phone || '',
      request_details: request_details,
      request_type: request_type,
      status: 'new',
      assigned_to_supplier_user_email: supplierUser ? supplierUser.email : null,
      priority: priority,
      estimated_value: estimated_value || null,
      response_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      contact_attempts: 0
    };

    const newLead = await base44.entities.Lead.create(leadData);

    // Optional: Send notification to supplier user (email/WhatsApp)
    // This could be implemented later as an enhancement

    return new Response(JSON.stringify({
      success: true,
      lead_id: newLead.id,
      message: 'הפנייה נשלחה בהצלחה לספק'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating supplier lead:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'אירעה שגיאה ביצירת הפנייה: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});