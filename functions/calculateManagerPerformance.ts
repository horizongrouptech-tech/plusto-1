
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // בדיקת הרשאות - רק אדמין יכול להריץ חישוב
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized - Admin only' 
            }, { status: 403 });
        }

        console.log('Starting manager performance calculation...');

        // שליפת כל מנהלי הכספים
        const allUsers = await base44.asServiceRole.entities.User.filter({});
        const financialManagers = allUsers.filter(u => 
            u.user_type === 'financial_manager' && 
            u.is_active !== false &&
            u.is_approved_by_admin === true
        );

        console.log(`Found ${financialManagers.length} financial managers in system`);

        if (financialManagers.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'לא נמצאו מנהלי כספים במערכת לחישוב ביצועים.' 
            }, { status: 404 });
        }

        // שליפת כל הנתונים הנדרשים לחישוב
        const [allOnboardingRequests, allRecommendations] = await Promise.all([
            base44.asServiceRole.entities.OnboardingRequest.filter({ 
                status: 'approved',
                is_active: true 
            }),
            base44.asServiceRole.entities.Recommendation.filter({})
        ]);

        console.log(`Total onboarding requests: ${allOnboardingRequests.length}`);
        console.log(`Total recommendations: ${allRecommendations.length}`);

        const results = [];
        const calculationDate = new Date().toISOString().split('T')[0];
        let updated_count = 0;

        // חישוב ביצועים לכל מנהל
        for (const manager of financialManagers) {
            console.log(`Calculating performance for manager: ${manager.email}`);

            // מציאת לקוחות משויכים למנהל
            const assignedClients = allOnboardingRequests.filter(
                req => req.assigned_financial_manager_email === manager.email
            );

            console.log(`Manager ${manager.email} has ${assignedClients.length} assigned clients`);

            // מציאת המלצות איכותיות (דירוג 4+) ללקוחות שלו
            const qualityRecommendations = allRecommendations.filter(rec => {
                const isForManagerClient = assignedClients.some(
                    client => client.email === rec.customer_email
                );
                const hasQualityRating = rec.admin_rating && rec.admin_rating >= 4;
                const isPublished = rec.status === 'published_by_admin' || rec.status === 'executed';
                
                return isForManagerClient && hasQualityRating && isPublished;
            });

            console.log(`Manager ${manager.email} has ${qualityRecommendations.length} quality recommendations`);

            // חישוב רווח פוטנציאלי מצטבר
            const estimatedProfit = qualityRecommendations.reduce((sum, rec) => {
                return sum + (rec.expected_profit || 0);
            }, 0);

            // חישוב ציון מנהל (0-100)
            let score = 0;
            
            // נקודות עבור לקוחות פעילים (עד 40 נקודות)
            score += Math.min(assignedClients.length * 8, 40);
            
            // נקודות עבור המלצות איכותיות (עד 30 נקודות)
            score += Math.min(qualityRecommendations.length * 6, 30);
            
            // נקודות עבור רווח פוטנציאלי (עד 20 נקודות)
            score += Math.min((estimatedProfit / 10000) * 2, 20);
            
            // נקודות עבור פעילות במערכת (עד 10 נקודות)
            if (manager.last_activity) {
                const daysSinceActivity = Math.floor(
                    (Date.now() - new Date(manager.last_activity).getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysSinceActivity <= 7) score += 10;
                else if (daysSinceActivity <= 14) score += 5;
                else if (daysSinceActivity <= 30) score += 2;
            }

            const performanceData = {
                manager_email: manager.email,
                manager_full_name: manager.full_name || manager.email,
                calculation_date: calculationDate,
                active_clients_count: assignedClients.length,
                quality_recommendations_count: qualityRecommendations.length,
                estimated_client_profit: Math.round(estimatedProfit),
                manager_score: Math.round(Math.min(score, 100)),
                last_system_login: manager.last_activity || null,
                interactions_count: qualityRecommendations.length,
                login_frequency_score: manager.last_activity ? 10 : 0
            };

            console.log(`Performance data for ${manager.email}:`, performanceData);

            // מחיקת רשומות ישנות של המנהל
            const existingRecords = await base44.asServiceRole.entities.FinancialManagerPerformance.filter({
                manager_email: manager.email
            });

            console.log(`Found ${existingRecords.length} existing records for ${manager.email}`);

            for (const record of existingRecords) {
                try {
                    await base44.asServiceRole.entities.FinancialManagerPerformance.delete(record.id);
                    console.log(`Deleted old record ${record.id} for ${manager.email}`);
                } catch (deleteError) {
                    console.error(`Error deleting record ${record.id}:`, deleteError);
                }
            }

            // יצירת רשומה חדשה
            try {
                const newRecord = await base44.asServiceRole.entities.FinancialManagerPerformance.create(performanceData);
                console.log(`✅ Created new performance record for ${manager.email}:`, newRecord);
                results.push(newRecord);
                updated_count++;
            } catch (createError) {
                console.error(`❌ Error creating performance record for ${manager.email}:`, createError);
            }
        }

        console.log(`✅ Performance calculation completed. Updated ${updated_count} managers out of ${financialManagers.length}`);

        return Response.json({
            success: true,
            message: `חישוב ביצועים הושלם בהצלחה. ${updated_count} מנהלים עודכנו.`,
            updated_count,
            total_managers: financialManagers.length,
            results: results.map(r => ({
                manager_email: r.manager_email,
                score: r.manager_score,
                clients: r.active_clients_count,
                recommendations: r.quality_recommendations_count,
                profit: r.estimated_client_profit
            }))
        });

    } catch (error) {
        console.error('❌ Error in calculateManagerPerformance:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});
