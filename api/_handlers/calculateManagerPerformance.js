import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  if (currentUser.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Unauthorized - Admin only' });
  }

  try {
    // Fetch all active, approved financial managers
    const { data: allUsers } = await supabaseAdmin.from('profiles').select('*');
    const financialManagers = (allUsers || []).filter(
      (u) => u.user_type === 'financial_manager' && u.is_active !== false && u.is_approved_by_admin === true,
    );

    if (!financialManagers.length) {
      return res.status(404).json({ success: false, error: 'לא נמצאו מנהלי כספים במערכת לחישוב ביצועים.' });
    }

    const [{ data: onboardingRequests }, { data: recommendations }] = await Promise.all([
      supabaseAdmin.from('onboarding_request').select('*').eq('status', 'approved').eq('is_active', true),
      supabaseAdmin.from('recommendation').select('*'),
    ]);

    const results = [];
    const calculationDate = new Date().toISOString().split('T')[0];
    let updated_count = 0;

    for (const manager of financialManagers) {
      const assignedClients = (onboardingRequests || []).filter(
        (r) => r.assigned_financial_manager_email === manager.email,
      );

      const qualityRecs = (recommendations || []).filter((rec) => {
        const isForClient = assignedClients.some((c) => c.email === rec.customer_email);
        return isForClient && rec.admin_rating >= 4 && ['published_by_admin', 'executed'].includes(rec.status);
      });

      const estimatedProfit = qualityRecs.reduce((sum, r) => sum + (r.expected_profit || 0), 0);

      let score = 0;
      score += Math.min(assignedClients.length * 8, 40);
      score += Math.min(qualityRecs.length * 6, 30);
      score += Math.min((estimatedProfit / 10000) * 2, 20);
      if (manager.last_activity) {
        const days = Math.floor((Date.now() - new Date(manager.last_activity).getTime()) / 86400000);
        if (days <= 7) score += 10;
        else if (days <= 14) score += 5;
        else if (days <= 30) score += 2;
      }

      const performanceData = {
        manager_email: manager.email,
        manager_full_name: manager.full_name || manager.email,
        calculation_date: calculationDate,
        active_clients_count: assignedClients.length,
        quality_recommendations_count: qualityRecs.length,
        estimated_client_profit: Math.round(estimatedProfit),
        manager_score: Math.round(Math.min(score, 100)),
        last_system_login: manager.last_activity || null,
        interactions_count: qualityRecs.length,
        login_frequency_score: manager.last_activity ? 10 : 0,
      };

      // Delete old records
      await supabaseAdmin.from('financial_manager_performance').delete().eq('manager_email', manager.email);

      // Create new record
      const { data: newRecord, error: createErr } = await supabaseAdmin
        .from('financial_manager_performance')
        .insert(performanceData)
        .select()
        .single();

      if (!createErr && newRecord) {
        results.push(newRecord);
        updated_count++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `חישוב ביצועים הושלם בהצלחה. ${updated_count} מנהלים עודכנו.`,
      updated_count,
      total_managers: financialManagers.length,
      results: results.map((r) => ({
        manager_email: r.manager_email,
        score: r.manager_score,
        clients: r.active_clients_count,
        recommendations: r.quality_recommendations_count,
        profit: r.estimated_client_profit,
      })),
    });
  } catch (error) {
    console.error('[calculateManagerPerformance]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
