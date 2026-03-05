import { requireAuth, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { company_name, website } = req.body ?? {};
    if (!company_name && !website) return res.status(400).json({ error: 'company_name or website is required' });

    const technographics = await openRouterAPI({
      prompt: `Research the technology stack and tools used by this company:
Company: ${company_name || 'Unknown'}
Website: ${website || 'Unknown'}

Identify:
- CRM systems (Salesforce, HubSpot, etc.)
- ERP systems (SAP, Oracle, etc.)
- Marketing tools
- Analytics platforms
- E-commerce platforms
- Cloud infrastructure
- Programming languages/frameworks
- Communication tools
- Payment processors
Return structured JSON.`,
      response_json_schema: {
        type: 'object',
        properties: {
          crm: { type: 'array', items: { type: 'string' } },
          erp: { type: 'array', items: { type: 'string' } },
          marketing_tools: { type: 'array', items: { type: 'string' } },
          analytics: { type: 'array', items: { type: 'string' } },
          ecommerce: { type: 'array', items: { type: 'string' } },
          cloud_infrastructure: { type: 'array', items: { type: 'string' } },
          tech_stack: { type: 'array', items: { type: 'string' } },
          communication_tools: { type: 'array', items: { type: 'string' } },
          payment_processors: { type: 'array', items: { type: 'string' } },
          other_tools: { type: 'array', items: { type: 'string' } },
          confidence_level: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
      model: 'openai/gpt-4o-mini',
    });

    return res.status(200).json({ success: true, technographics_data: technographics });
  } catch (e) {
    console.error('[getTechnographicsData]', e);
    return res.status(500).json({ error: e.message });
  }
}
