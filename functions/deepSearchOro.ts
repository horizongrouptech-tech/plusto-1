import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const term = "אורו";
        const term2 = "Oro";
        
        // 1. List all users (up to a limit) and filter in memory
        const users = await base44.entities.User.list();
        const matchingUsers = users.filter(u => 
            (u.business_name && (u.business_name.includes(term) || u.business_name.includes(term2))) ||
            (u.full_name && (u.full_name.includes(term) || u.full_name.includes(term2))) || 
            (u.email && (u.email.includes(term) || u.email.includes(term2)))
        );

        // 2. Search UserActivity for "אורו"
        // We have to fetch activities and filter, or use a regex filter if supported.
        // Let's try listing recent activities.
        const activities = await base44.entities.UserActivity.list('-last_login', 100);
        const matchingActivities = activities.filter(a => JSON.stringify(a).includes(term) || JSON.stringify(a).includes(term2));

        return Response.json({
            users: matchingUsers.map(u => ({ id: u.id, email: u.email, business_name: u.business_name, full_name: u.full_name })),
            activities: matchingActivities
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});