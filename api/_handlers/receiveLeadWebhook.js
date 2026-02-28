import { supabaseAdmin } from '../_helpers.js';

const SOURCE_MAP = {
  facebook: 'facebook', fb: 'facebook',
  instagram: 'instagram', ig: 'instagram',
  google: 'google',
  linkedin: 'linkedin',
  whatsapp: 'whatsapp', wa: 'whatsapp',
  website: 'website', web: 'website',
  referral: 'referral', המלצה: 'referral',
};

function normalizeSource(src) {
  if (!src) return 'other';
  const s = src.toLowerCase().trim();
  for (const [key, val] of Object.entries(SOURCE_MAP)) {
    if (s.includes(key)) return val;
  }
  return 'other';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { full_name, email, phone, source, business_type, notes, utm_source, utm_campaign } = req.body ?? {};
    if (!full_name && !email && !phone) return res.status(400).json({ error: 'At least one of full_name, email, phone required' });

    // Auto-assign to least-busy financial manager
    const { data: managers } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_type', 'financial_manager')
      .eq('is_approved_by_admin', true)
      .neq('is_active', false);

    let assignedEmail = null;
    if (managers && managers.length > 0) {
      // Find manager with fewest assigned leads
      let minLeads = Infinity;
      for (const m of managers) {
        const { count } = await supabaseAdmin
          .from('lead')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to_email', m.email)
          .eq('stage', 'new');
        if ((count || 0) < minLeads) { minLeads = count || 0; assignedEmail = m.email; }
      }
    }

    const { data: lead, error } = await supabaseAdmin.from('lead').insert({
      full_name,
      email,
      phone,
      source: normalizeSource(source || utm_source),
      business_type,
      notes,
      utm_source,
      utm_campaign,
      stage: 'new',
      assigned_to_email: assignedEmail,
      created_date: new Date().toISOString(),
    }).select().single();

    if (error) throw new Error(error.message);

    if (assignedEmail) {
      await supabaseAdmin.from('notification').insert({
        recipient_email: assignedEmail,
        title: 'ליד חדש',
        message: `ליד חדש הוקצה אליך: ${full_name || email || phone}`,
        type: 'new_lead',
        related_id: lead.id,
        created_date: new Date().toISOString(),
        is_read: false,
      });
    }

    return res.status(200).json({ success: true, lead_id: lead.id, assigned_to: assignedEmail });
  } catch (e) {
    console.error('[receiveLeadWebhook]', e);
    return res.status(500).json({ error: e.message });
  }
}
