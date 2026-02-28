import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const { fireberry_account_id, fireberry_user_id } = req.body ?? {};
    if (!fireberry_account_id || !fireberry_user_id) {
      return res.status(400).json({ error: 'fireberry_account_id and fireberry_user_id required' });
    }

    // Find client
    const { data: clients } = await supabaseAdmin
      .from('onboarding_request')
      .select('id, email')
      .eq('fireberry_account_id', fireberry_account_id);

    if (!clients || clients.length === 0) {
      return res.status(404).json({ error: `Client not found: ${fireberry_account_id}` });
    }

    // Find manager by fireberry_user_id
    const { data: managers } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('fireberry_user_id', fireberry_user_id)
      .eq('user_type', 'financial_manager');

    if (!managers || managers.length === 0) {
      return res.status(404).json({ error: `Manager not found with fireberry_user_id: ${fireberry_user_id}` });
    }

    const manager = managers[0];
    const clientIds = clients.map(c => c.id);

    await supabaseAdmin
      .from('onboarding_request')
      .update({ assigned_financial_manager_email: manager.email })
      .in('id', clientIds);

    return res.status(200).json({
      updated: clientIds.length,
      manager: manager.full_name,
      clients: clients.map(c => c.email),
    });
  } catch (e) {
    console.error('[syncManagerFromFireberry]', e);
    return res.status(500).json({ error: e.message });
  }
}
