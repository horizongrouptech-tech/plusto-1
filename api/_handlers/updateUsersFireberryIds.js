import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    // Accept either a mappings array or use hardcoded list from body
    const { mappings } = req.body ?? {};
    // mappings: [{ email, fireberry_user_id }]
    if (!mappings || !Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings array required: [{ email, fireberry_user_id }]' });
    }

    let updated = 0;
    for (const { email, fireberry_user_id } of mappings) {
      if (!email || !fireberry_user_id) continue;
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ fireberry_user_id })
        .eq('email', email);
      if (!error) updated++;
    }

    return res.status(200).json({ updated, total: mappings.length });
  } catch (e) {
    console.error('[updateUsersFireberryIds]', e);
    return res.status(500).json({ error: e.message });
  }
}
