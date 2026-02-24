import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';

export const trackActivity = async (actionType, details = {}) => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const user = await base44.entities.User.get(authUser.id).catch(() => ({ email: authUser.email, id: authUser.id }));
    if (!user?.email) return;

    let [activity] = await base44.entities.UserActivity.filter({ user_email: user.email });

    const now = new Date().toISOString();

    if (!activity) {
      activity = {
        user_email: user.email,
        session_duration: 0,
        pages_visited: [],
        actions_taken: [],
        recommendations_implemented: 0,
        business_moves_implemented: 0,
        files_uploaded: 0,
        quality_score: 0,
        total_logins: 1,
        registration_date: user.created_date,
      };
    }
    
    activity.last_login = now;

    switch (actionType) {
      case 'LOGIN':
        activity.total_logins = (activity.total_logins || 0) + 1;
        break;
      case 'FILE_UPLOADED':
        activity.files_uploaded = (activity.files_uploaded || 0) + 1;
        break;
      case 'REC_IMPLEMENTED':
        activity.recommendations_implemented = (activity.recommendations_implemented || 0) + 1;
        break;
      case 'MOVE_IMPLEMENTED':
        activity.business_moves_implemented = (activity.business_moves_implemented || 0) + 1;
        break;
      case 'SESSION_UPDATE':
        activity.session_duration = (activity.session_duration || 0) + (details.duration || 5);
        break;
    }

    const recs = await base44.entities.Recommendation.filter({ customer_email: user.email });
    const moves = await base44.entities.BusinessMove.filter({ customer_email: user.email });
    const uploads = await base44.entities.FileUpload.filter({ created_by: user.email });
    
    activity.recommendations_implemented = recs.filter(r => r.status === 'executed').length;
    activity.business_moves_implemented = moves.filter(m => m.status === 'in_progress' || m.status === 'completed').length;
    activity.files_uploaded = uploads.length;

    let score = 0;
    score += Math.min(activity.total_logins, 10) * 1;
    score += Math.min(activity.files_uploaded, 5) * 4;
    score += Math.min(activity.recommendations_implemented, 10) * 3;
    score += Math.min(activity.business_moves_implemented, 4) * 10;
    activity.quality_score = Math.min(score, 100);

    if (activity.id) {
      await base44.entities.UserActivity.update(activity.id, activity);
    } else {
      await base44.entities.UserActivity.create(activity);
    }
  } catch (error) {
    console.error("Failed to track activity:", error);
  }
};

export const calculateEngagementForAllUsers = async () => {
  try {
    const allUsers = await base44.entities.User.filter({});
    const regularUsers = allUsers.filter(u => u.role === 'user' && u.user_type === 'regular');
    
    const allOnboardingRequests = await base44.entities.OnboardingRequest.filter({ 
      status: 'approved',
      is_active: true 
    });

    const allRecommendations = await base44.entities.Recommendation.filter({});
    const allFiles = await base44.entities.FileUpload.filter({});
    const allCatalogs = await base44.entities.ProductCatalog.filter({ is_active: true });
    const allForecasts = await base44.entities.BusinessForecast.filter({});
    const allManualForecasts = await base44.entities.ManualForecast.filter({});
    const allProjectForecasts = await base44.entities.ProjectForecast.filter({});

    const customersToProcess = [
      ...regularUsers.map(u => ({
        email: u.email,
        full_name: u.full_name,
        business_name: u.business_name,
        phone: u.phone,
        source: 'user'
      })),
      ...allOnboardingRequests.map(o => ({
        email: o.email,
        full_name: o.full_name,
        business_name: o.business_name,
        phone: o.phone,
        source: 'onboarding'
      }))
    ];

    const uniqueCustomers = customersToProcess.reduce((acc, customer) => {
      if (!acc.find(c => c.email === customer.email)) {
        acc.push(customer);
      }
      return acc;
    }, []);

    console.log(`Processing engagement for ${uniqueCustomers.length} unique customers...`);

    for (const customer of uniqueCustomers) {
      await calculateEngagementForCustomer(
        customer.email,
        allRecommendations,
        allFiles,
        allCatalogs,
        allForecasts,
        allManualForecasts,
        allProjectForecasts
      );
    }

    console.log('Engagement calculation completed for all users');
  } catch (error) {
    console.error("Error in calculateEngagementForAllUsers:", error);
    throw error;
  }
};

const calculateEngagementForCustomer = async (
  customerEmail,
  allRecommendations,
  allFiles,
  allCatalogs,
  allForecasts,
  allManualForecasts,
  allProjectForecasts
) => {
  try {
    // ספירת המלצות - כולל כל ההמלצות שפורסמו או בוצעו עבור הלקוח
    const customerRecommendations = allRecommendations.filter(r => 
      r.customer_email === customerEmail &&
      (r.status === 'published_by_admin' || r.status === 'executed' || r.status === 'saved' || r.status === 'pending')
    );
    const totalRecommendations = customerRecommendations.length;

    // ספירת קבצים
    const customerFiles = allFiles.filter(f => f.customer_email === customerEmail);
    const filesCount = customerFiles.length;

    // בדיקת קיום קטלוג
    const hasCatalog = allCatalogs.some(c => c.customer_email === customerEmail);

    // בדיקת קיום תחזית - כולל אוטומטית, ידנית ופרויקטים
    const hasForecast = allForecasts.some(f => f.customer_email === customerEmail) ||
                        allManualForecasts.some(f => f.customer_email === customerEmail) ||
                        allProjectForecasts.some(f => f.customer_email === customerEmail);

    // קביעת רמת מעורבות
    let engagementLevel = 'dormant';
    if (totalRecommendations >= 3) {
      engagementLevel = 'active';
    } else if (totalRecommendations >= 1) {
      engagementLevel = 'passive';
    }

    // חישוב ציון איכות
    let qualityScore = 0;
    qualityScore += Math.min(filesCount, 5) * 10;
    qualityScore += hasCatalog ? 20 : 0;
    qualityScore += hasForecast ? 20 : 0;
    qualityScore += Math.min(totalRecommendations, 5) * 6;
    qualityScore = Math.min(qualityScore, 100);

    // קביעת רמת סיכון
    let riskLevel = 'low';
    if (engagementLevel === 'dormant' && !hasCatalog && !hasForecast) {
      riskLevel = 'high';
    } else if (engagementLevel === 'passive' || !hasCatalog || !hasForecast) {
      riskLevel = 'medium';
    }

    // פעילות אחרונה
    const lastActivity = customerRecommendations.length > 0
      ? customerRecommendations.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0].created_date
      : customerFiles.length > 0
      ? customerFiles.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0].created_date
      : new Date().toISOString();

    const engagementData = {
      customer_email: customerEmail,
      engagement_date: new Date().toISOString(),
      engagement_level: engagementLevel,
      total_recommendations: totalRecommendations,
      recommendations_implemented_count: customerRecommendations.filter(r => r.status === 'executed').length,
      recommendations_clarification_count: customerRecommendations.filter(r => r.status === 'needs_clarification').length,
      recommendations_irrelevant_count: customerRecommendations.filter(r => r.status === 'dismissed').length,
      quality_score: qualityScore,
      quality_breakdown: {
        files_score: Math.min(filesCount, 5) * 10,
        catalog_score: hasCatalog ? 20 : 0,
        forecast_score: hasForecast ? 20 : 0,
        recommendations_score: Math.min(totalRecommendations, 5) * 6
      },
      risk_level: riskLevel,
      last_activity: lastActivity,
      files_count: filesCount,
      has_catalog: hasCatalog,
      has_forecast: hasForecast
    };

    const existingEngagements = await base44.entities.UserEngagement.filter({
      customer_email: customerEmail
    });

    if (existingEngagements && existingEngagements.length > 0) {
      await base44.entities.UserEngagement.update(existingEngagements[0].id, engagementData);
    } else {
      await base44.entities.UserEngagement.create(engagementData);
    }

    console.log(`Engagement calculated for ${customerEmail}: ${engagementLevel}, ${totalRecommendations} recommendations`);
  } catch (error) {
    console.error(`Error calculating engagement for ${customerEmail}:`, error);
  }
};