import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const usersData = [
  { email: "ofekhazizahorizon@gmail.com", fireberry_user_id: "20cdf936-0c85-4c87-ab05-cf6350a3b76e" },
  { email: "ofek@horizon.org.il", fireberry_user_id: "84551550-2829-468e-a258-c8edc1fbef0a" },
  { email: "Eliran@horizon.org.il", fireberry_user_id: "85c7ab54-8255-4ac8-8f93-7ea00ee99abb" },
  { email: "Bnhzn52@gmail.com", fireberry_user_id: "4ad6453c-0e2c-4d5e-bad5-2b4efbda6a67" },
  { email: "Yoraim2@gmail.com", fireberry_user_id: "0e90b21d-89d0-4072-9112-33aed67f9398" },
  { email: "office@horizon.org.il", fireberry_user_id: "dc1e8679-7790-4d17-b345-7f8bd85bfc8d" },
  { email: "omer@horizon.org.il", fireberry_user_id: "6c194b3f-35b2-4840-9c27-298312add380" },
  { email: "ron@horizon.org.il", fireberry_user_id: "afb92e00-3fbb-4231-979d-35186d90d1af" },
  { email: "shohamsimon38@gmail.com", fireberry_user_id: "b1cb7dec-89a8-454e-af32-fe07e1202a3d" }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const currentUser = await base44.auth.me();
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const results = [];
    const errors = [];

    for (const userData of usersData) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: userData.email });
        
        if (users.length > 0) {
          const user = users[0];
          await base44.asServiceRole.entities.User.update(user.id, {
            fireberry_user_id: userData.fireberry_user_id
          });
          results.push({ email: userData.email, status: 'updated', id: user.id });
        } else {
          results.push({ email: userData.email, status: 'not_found' });
        }
      } catch (error) {
        errors.push({ email: userData.email, error: error.message });
      }
    }

    return Response.json({ 
      success: true,
      updated: results.filter(r => r.status === 'updated').length,
      not_found: results.filter(r => r.status === 'not_found').length,
      errors: errors.length,
      details: { results, errors }
    });

  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});