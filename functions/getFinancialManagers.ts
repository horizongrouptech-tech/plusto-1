import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // אדמינים, מנהלי כספים ומנהלי מחלקה יכולים לקרוא
    const isAdmin = user.role === 'admin';
    const isFinancialManager = user.user_type === 'financial_manager';
    const isDeptManager = user.department_manager_role === 'department_manager';
    
    if (!isAdmin && !isFinancialManager && !isDeptManager) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // שליפת כל מנהלי הכספים עם הרשאות service role
    const allUsers = await base44.asServiceRole.entities.User.list();
    const financialManagers = allUsers.filter(u => 
      u.user_type === 'financial_manager' && 
      u.is_active !== false
    );
    
    return Response.json({ managers: financialManagers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});