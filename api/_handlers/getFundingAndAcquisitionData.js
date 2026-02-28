import { requireAuth, invokeLLM } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { company_name, website } = req.body ?? {};
    if (!company_name) return res.status(400).json({ error: 'company_name is required' });

    const fundingData = await invokeLLM({
      prompt: `Research funding and acquisition data for this company:
Company: ${company_name}
Website: ${website || 'Unknown'}

Provide information about:
- Total funding raised
- Latest funding round (type, amount, date, lead investors)
- All known funding rounds
- Any acquisitions made by the company
- Any known acquisition of the company by others
- IPO status
Return structured JSON with available data (use null for unknown fields).`,
      response_json_schema: {
        type: 'object',
        properties: {
          total_funding: { type: 'string' },
          funding_stage: { type: 'string' },
          latest_round: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              amount: { type: 'string' },
              date: { type: 'string' },
              investors: { type: 'array', items: { type: 'string' } },
            },
          },
          funding_rounds: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                amount: { type: 'string' },
                date: { type: 'string' },
              },
            },
          },
          acquisitions_made: { type: 'array', items: { type: 'string' } },
          acquired_by: { type: 'string' },
          ipo_status: { type: 'string' },
          investors: { type: 'array', items: { type: 'string' } },
        },
      },
      model: 'openai/gpt-4o-mini',
    });

    return res.status(200).json({ success: true, funding_data: fundingData });
  } catch (e) {
    console.error('[getFundingAndAcquisitionData]', e);
    return res.status(500).json({ error: e.message });
  }
}
