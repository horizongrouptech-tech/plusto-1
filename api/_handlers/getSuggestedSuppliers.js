import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { customer_email } = req.body ?? {};
    const email = customer_email || user.email;

    const { data: profile } = await supabaseAdmin
      .from('onboarding_request')
      .select('business_name, business_type')
      .eq('email', email)
      .single();

    const { data: suppliers } = await supabaseAdmin
      .from('supplier')
      .select('id, name, category, description, is_partner_supplier, is_active')
      .eq('is_active', true);

    if (!suppliers?.length) return res.status(200).json({ suppliers: [] });

    const schema = {
      recommended_categories: ['string'],
      reasoning: 'string',
    };

    const aiResult = await invokeLLM({
      prompt: `עסק מסוג "${profile?.business_type}" בשם "${profile?.business_name}".
אילו קטגוריות ספקים הכי רלוונטיות לעסק זה? ציין עד 5 קטגוריות.`,
      response_json_schema: schema,
    });

    const recommendedCats = (aiResult?.recommended_categories || []).map(c => c.toLowerCase());

    const scored = suppliers.map(s => {
      const catMatch = recommendedCats.some(rc =>
        (s.category || '').toLowerCase().includes(rc) || rc.includes((s.category || '').toLowerCase())
      );
      const score = (catMatch ? 60 : 0) + (s.is_partner_supplier ? 30 : 0);
      return { ...s, relevance_score: score };
    }).sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 20);

    return res.status(200).json({ suppliers: scored, reasoning: aiResult?.reasoning });
  } catch (e) {
    console.error('[getSuggestedSuppliers]', e);
    return res.status(500).json({ error: e.message });
  }
}
