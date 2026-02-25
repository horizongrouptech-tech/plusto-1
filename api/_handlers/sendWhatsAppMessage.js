import { requireAuth, supabaseAdmin } from '../_helpers.js';

function cleanTextForWhatsApp(text, maxLength = 300) {
  if (!text) return '';
  let cleaned = String(text).replace(/[\n\t]/g, ' ').replace(/\s{5,}/g, '    ').trim();
  if (cleaned.length > maxLength) cleaned = cleaned.substring(0, maxLength - 3) + '...';
  return cleaned;
}

const WOZTELL_TEMPLATES = {
  free_recommendation_v1: {
    type: 'TEMPLATE',
    integrationId: '686e4c719ee5dbad9b45e8bb',
    wabaId: '1368986137538733',
    namespace: 'd0965143_def8_4407_9e1c_ad0a0439e36b',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'שם' },
          { type: 'text', text: 'המלצה' },
        ],
      },
      { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'payload_1' }] },
      { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'payload_2' }] },
      { type: 'button', sub_type: 'quick_reply', index: '2', parameters: [{ type: 'payload', payload: 'payload_3' }] },
    ],
    elementName: 'free_recommendation_v1',
    languageCode: 'he',
    languagePolicy: 'deterministic',
    content: [
      { type: 'BODY', text: 'שלום {{1}},\nיש לנו המלצה חדשה עבורך:\n{{2}}' },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'מדוייק לי, אני מיישם' }, { type: 'QUICK_REPLY', text: 'אשמח להרחבה ופירוט' }, { type: 'QUICK_REPLY', text: 'לא רלוונטי עבורי' }] },
    ],
    signature: '95lG60aLCAxTf4y6g/fuwB/krWZqdqtRs5fzia62Ywk=',
  },
  recommendation_v1: {
    type: 'TEMPLATE',
    integrationId: '686e4c719ee5dbad9b45e8bb',
    wabaId: '1368986137538733',
    namespace: 'd0965143_def8_4407_9e1c_ad0a0439e36b',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'שם' },
          { type: 'text', text: 'כותרת המלצה' },
          { type: 'text', text: 'תיאור' },
          { type: 'text', text: 'שלבי ביצוע' },
          { type: 'text', text: 'רווח צפוי' },
        ],
      },
      { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'payload_1' }] },
      { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'payload_2' }] },
      { type: 'button', sub_type: 'quick_reply', index: '2', parameters: [{ type: 'payload', payload: 'payload_3' }] },
    ],
    elementName: 'recommendation_v1',
    languageCode: 'he',
    languagePolicy: 'deterministic',
    content: [
      { type: 'BODY', text: 'שלום {{1}},\nיש לנו המלצה חדשה עבורך: {{2}}.\n{{3}}.\nשלבי ביצוע: {{4}}\nרווח צפוי: {{5}}' },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'מדוייק לי, אני מיישם' }, { type: 'QUICK_REPLY', text: 'אשמח להרחבה ופירוט' }, { type: 'QUICK_REPLY', text: 'לא רלוונטי עבורי' }] },
    ],
    signature: '95lG60aLCAxTf4y6g/fuwB/krWZqdqtRs5fzia62Ywk=',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { phoneNumber, customerEmail, recommendation, templateType = 'auto' } = req.body ?? {};
    if (!phoneNumber || !customerEmail || !recommendation) {
      return res.status(400).json({ error: 'Missing required fields: phoneNumber, customerEmail, recommendation' });
    }

    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    // Find customer name
    let customerName = 'לקוח יקר';
    const { data: contacts } = await supabaseAdmin
      .from('customer_contact')
      .select('full_name, business_name')
      .eq('customer_email', customerEmail)
      .limit(1);

    if (contacts && contacts.length > 0) {
      customerName = contacts[0].full_name || contacts[0].business_name || customerName;
    } else {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('full_name, business_name')
        .eq('email', customerEmail)
        .limit(1);
      if (profiles && profiles.length > 0) {
        customerName = profiles[0].full_name || profiles[0].business_name || customerName;
      }
    }

    const title = cleanTextForWhatsApp(recommendation.title, 100);
    const description = cleanTextForWhatsApp(recommendation.description, 800);
    let actionSteps = 'לא צוינו שלבי ביצוע';
    if (Array.isArray(recommendation.action_steps) && recommendation.action_steps.length > 0) {
      actionSteps = cleanTextForWhatsApp(
        recommendation.action_steps.map((s, i) => `${i + 1}. ${s.trim()}`).join('. '),
        500,
      );
    }
    const expectedProfit = recommendation.expected_profit
      ? `₪${Math.round(recommendation.expected_profit).toLocaleString()}`
      : 'לא צוין';

    // Select template
    let selectedTemplate;
    if (templateType === 'short' || templateType === 'free_recommendation_v1') {
      selectedTemplate = 'free_recommendation_v1';
    } else if (templateType === 'long' || templateType === 'recommendation_v1') {
      selectedTemplate = 'recommendation_v1';
    } else {
      const totalLength =
        (recommendation.title || '').length +
        (recommendation.description || '').length +
        (recommendation.action_steps ? recommendation.action_steps.join(' ').length : 0);
      selectedTemplate = totalLength > 150 ? 'recommendation_v1' : 'free_recommendation_v1';
    }

    const template = JSON.parse(JSON.stringify(WOZTELL_TEMPLATES[selectedTemplate]));
    const uniqueRecommendationId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (selectedTemplate === 'free_recommendation_v1') {
      template.components[0].parameters[0].text = cleanTextForWhatsApp(customerName, 50);
      template.components[0].parameters[1].text = cleanTextForWhatsApp(title || description || 'המלצה חדשה', 500);
    } else {
      template.components[0].parameters[0].text = cleanTextForWhatsApp(customerName, 50);
      template.components[0].parameters[1].text = title;
      template.components[0].parameters[2].text = description;
      template.components[0].parameters[3].text = actionSteps;
      template.components[0].parameters[4].text = cleanTextForWhatsApp(expectedProfit, 50);
    }

    template.components[1].parameters[0].payload = `${uniqueRecommendationId}_implemented`;
    template.components[2].parameters[0].payload = `${uniqueRecommendationId}_details`;
    template.components[3].parameters[0].payload = `${uniqueRecommendationId}_not_relevant`;

    // Update recommendation with unique ID
    if (recommendation.id) {
      await supabaseAdmin
        .from('recommendation')
        .update({
          related_data: {
            ...(recommendation.related_data || {}),
            unique_recommendation_id: uniqueRecommendationId,
          },
          delivery_status: 'sent',
        })
        .eq('id', recommendation.id);
    }

    const woztellPayload = {
      channelId: process.env.WOZTELL_CHANNEL_ID,
      recipientId: cleanPhoneNumber,
      response: [template],
    };

    const woztellResponse = await fetch('https://bot.api.woztell.com/sendResponses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WOZTELL_AP_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(woztellPayload),
    });

    const woztellResult = await woztellResponse.text();
    if (!woztellResponse.ok) {
      throw new Error(`Woztell API error: ${woztellResponse.status} - ${woztellResult}`);
    }

    // Log the action
    await supabaseAdmin.from('customer_action').insert({
      customer_email: customerEmail,
      action_type: 'whatsapp_sent',
      item_id: recommendation.id || 'unknown',
      item_title: recommendation.title || 'המלצה בוואטסאפ',
      item_details: {
        phone_number: cleanPhoneNumber,
        template_used: selectedTemplate,
        unique_recommendation_id: uniqueRecommendationId,
        sent_at: new Date().toISOString(),
      },
    }).catch((e) => console.error('Error logging action:', e));

    return res.status(200).json({
      success: true,
      message: 'הודעה נשלחה בהצלחה',
      uniqueRecommendationId,
      templateUsed: selectedTemplate,
      recommendationId: recommendation.id,
      feedbackEnabled: !!recommendation.id,
    });
  } catch (error) {
    console.error('[sendWhatsAppMessage]', error);
    return res.status(500).json({ error: error.message, success: false });
  }
}
