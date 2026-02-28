import { supabaseAdmin } from '../_helpers.js';

const FEEDBACK_RATING = { implemented: 3, details: 2, not_relevant: 1 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { recommendation_id, unique_recommendation_id, feedback_type, customer_email } = req.body ?? {};

    let recommendation = null;

    if (unique_recommendation_id) {
      const { data } = await supabaseAdmin
        .from('recommendation')
        .select('id, customer_email')
        .eq('unique_recommendation_id', unique_recommendation_id)
        .single();
      recommendation = data;
    }

    if (!recommendation && recommendation_id) {
      const { data } = await supabaseAdmin
        .from('recommendation')
        .select('id, customer_email')
        .eq('id', recommendation_id)
        .single();
      recommendation = data;
    }

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    await supabaseAdmin.from('recommendation_feedback').insert({
      recommendation_id: recommendation.id,
      customer_email: recommendation.customer_email || customer_email,
      feedback_type,
      rating: FEEDBACK_RATING[feedback_type] || 1,
      created_date: new Date().toISOString(),
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[handleWhatsAppFeedback]', e);
    return res.status(500).json({ error: e.message });
  }
}
