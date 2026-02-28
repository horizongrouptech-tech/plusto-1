import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { company_name, website, customer_id } = req.body ?? {};
    if (!company_name && !website && !customer_id) {
      return res.status(400).json({ error: 'company_name, website, or customer_id is required' });
    }

    // Try to get company info from DB first
    let companyName = company_name;
    if (customer_id && !companyName) {
      const { data } = await supabaseAdmin
        .from('onboarding_request')
        .select('business_name, website')
        .eq('customer_id', customer_id)
        .single();
      companyName = data?.business_name;
    }

    const firmographicData = await invokeLLM({
      prompt: `Research and provide firmographic data for this company:
Company: ${companyName || 'Unknown'}
Website: ${website || 'Unknown'}

Provide detailed business intelligence including:
- Industry classification (SIC/NAICS)
- Company size (employees range)
- Annual revenue estimate
- Founded year
- Headquarters location
- Business model (B2B/B2C/B2B2C)
- Key products/services
- Market segment
- Geographic presence
Return structured JSON.`,
      response_json_schema: {
        type: 'object',
        properties: {
          company_name: { type: 'string' },
          industry: { type: 'string' },
          industry_code: { type: 'string' },
          employee_count_range: { type: 'string' },
          annual_revenue_range: { type: 'string' },
          founded_year: { type: 'number' },
          headquarters: { type: 'string' },
          business_model: { type: 'string' },
          key_products: { type: 'array', items: { type: 'string' } },
          market_segment: { type: 'string' },
          geographic_presence: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
        },
      },
      model: 'openai/gpt-4o-mini',
    });

    return res.status(200).json({ success: true, firmographic_data: firmographicData });
  } catch (e) {
    console.error('[getFirmographicData]', e);
    return res.status(500).json({ error: e.message });
  }
}
