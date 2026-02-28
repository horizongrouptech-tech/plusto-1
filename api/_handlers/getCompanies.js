import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { search, industry, size, limit = 50, offset = 0 } = req.body ?? {};

    let query = supabaseAdmin
      .from('onboarding_request')
      .select('id, business_name, business_type, industry, city, email, phone, created_at, is_active, customer_id')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (industry) {
      query = query.eq('industry', industry);
    }
    if (size) {
      query = query.eq('business_size', size);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return res.status(200).json({ companies: data || [], total: data?.length || 0 });
  } catch (e) {
    console.error('[getCompanies]', e);
    return res.status(500).json({ error: e.message });
  }
}
