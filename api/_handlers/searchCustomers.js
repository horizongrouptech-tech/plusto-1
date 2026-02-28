import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { query = '', limit = 20 } = req.body ?? {};
    const isAdmin = user.role === 'admin';
    const isFM = user.user_type === 'financial_manager';

    let q = supabaseAdmin.from('onboarding_request').select('*');
    if (isFM && !isAdmin) {
      q = q.or(`assigned_financial_manager_email.eq.${user.email},additional_assigned_financial_manager_emails.cs.{${user.email}}`);
    }
    const { data: allRecords, error } = await q;
    if (error) throw new Error(error.message);

    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9א-ת ]/g, '').trim();
    const needle = normalize(query);

    if (!needle) return res.status(200).json({ results: (allRecords || []).slice(0, limit) });

    const scored = (allRecords || []).map(r => {
      const fields = [r.business_name, r.full_name, r.email].map(normalize);
      let score = 0;
      if (fields.some(f => f === needle)) score = 100;
      else if (fields.some(f => f.startsWith(needle))) score = 80;
      else if (fields.some(f => f.includes(needle))) score = 60;
      return { ...r, _score: score };
    }).filter(r => r._score > 0).sort((a, b) => b._score - a._score);

    return res.status(200).json({ results: scored.slice(0, limit) });
  } catch (e) {
    console.error('[searchCustomers]', e);
    return res.status(500).json({ error: e.message });
  }
}
