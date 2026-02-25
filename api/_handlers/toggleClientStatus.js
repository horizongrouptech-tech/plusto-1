import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin' && user.user_type !== 'financial_manager') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { clientId, isActive } = req.body ?? {};
    if (!clientId || typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields: clientId and isActive' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, updatedUser: data });
  } catch (error) {
    console.error('[toggleClientStatus]', error);
    return res.status(500).json({ error: error.message });
  }
}
