import { supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { accountid, fireberry_account_id } = req.body ?? {};
    const fbId = accountid || fireberry_account_id;
    if (!fbId) return res.status(400).json({ error: 'accountid required' });

    const { data: records, error } = await supabaseAdmin
      .from('onboarding_request')
      .select('id, email, business_name')
      .eq('fireberry_account_id', fbId);

    if (error) throw new Error(error.message);
    if (!records || records.length === 0) {
      return res.status(404).json({ error: `No client found with fireberry_account_id: ${fbId}` });
    }

    const ids = records.map(r => r.id);
    await supabaseAdmin.from('onboarding_request').update({ is_active: false }).in('id', ids);

    return res.status(200).json({ archived: ids.length, clients: records.map(r => r.email) });
  } catch (e) {
    console.error('[archiveFireberryClient]', e);
    return res.status(500).json({ error: e.message });
  }
}
