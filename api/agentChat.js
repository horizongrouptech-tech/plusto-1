import { requireAuth, supabaseAdmin, openRouterAPI } from './_helpers.js';

/**
 * POST /api/agentChat
 *
 * Body:
 *   conversation_id  {string}  — existing manager_conversation row ID
 *   role             {string}  — 'user'
 *   content          {string}  — the user's message text
 *   agent_name       {string}  — e.g. 'HorizonBusinessAdvisor'
 *   metadata         {object}  — conversation metadata (user info, context, etc.)
 *
 * Flow:
 *   1. Auth check
 *   2. Load current messages from DB
 *   3. Append user message
 *   4. Call LLM with full conversation history
 *   5. Append assistant reply
 *   6. Update row (triggers Supabase Realtime → FloatingAgentChat re-renders)
 *   7. Return { message: assistantMessage }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { conversation_id, role = 'user', content, agent_name, metadata = {} } = req.body ?? {};

  if (!conversation_id || !content) {
    return res.status(400).json({ error: 'conversation_id and content are required' });
  }

  try {
    // 1. Load current conversation
    const { data: conv, error: fetchErr } = await supabaseAdmin
      .from('manager_conversation')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (fetchErr || !conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const existingMessages = Array.isArray(conv.messages) ? conv.messages : [];

    // 2. Append user message
    const userMessage = {
      role: 'user',
      content,
      created_date: new Date().toISOString(),
    };
    const messagesWithUser = [...existingMessages, userMessage];

    // Persist user message immediately so Realtime fires
    await supabaseAdmin
      .from('manager_conversation')
      .update({ messages: messagesWithUser })
      .eq('id', conversation_id);

    // 3. Build system prompt from metadata
    const systemParts = [
      'אתה יועץ עסקי של Horizon Group. אתה עוזר למנהלי פיננסים וללקוחות לנהל את העסק שלהם.',
      'ענה תמיד בעברית אלא אם כן המשתמש פונה אליך בשפה אחרת.',
      'היה ממוקד, מועיל ומקצועי.',
    ];

    if (metadata.is_admin) systemParts.push('המשתמש הוא מנהל מערכת (Admin) עם גישה לכל הנתונים.');
    if (metadata.is_financial_manager) systemParts.push('המשתמש הוא מנהל פיננסי.');
    if (metadata.customer_name) systemParts.push(`הלקוח הנוכחי בפוקוס: ${metadata.customer_name}`);
    if (metadata.current_page) systemParts.push(`עמוד נוכחי: ${metadata.current_page}`);
    if (metadata.entity_instructions) systemParts.push(metadata.entity_instructions);

    const systemPrompt = systemParts.join('\n');

    // 4. Build messages array for LLM (last 30 messages to stay within token limits)
    const recentMessages = messagesWithUser.slice(-30);
    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      })),
    ];

    // 5. Call LLM via OpenRouter
    const OpenAI = (await import('@openrouter/sdk')).default;
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL || 'https://plusto-1.vercel.app',
        'X-Title': 'Plusto',
      },
    });

    const model = process.env.OPENROUTER_AGENT_MODEL
      || process.env.OPENROUTER_DEFAULT_MODEL
      || 'anthropic/claude-sonnet-4-5';

    const completion = await client.chat.completions.create({ model, messages: llmMessages });
    const aiText = completion.choices[0].message.content || '';

    // 6. Append assistant reply
    const assistantMessage = {
      role: 'assistant',
      content: aiText,
      created_date: new Date().toISOString(),
    };
    const finalMessages = [...messagesWithUser, assistantMessage];

    // 7. Update row — triggers Supabase Realtime subscription in the browser
    await supabaseAdmin
      .from('manager_conversation')
      .update({ messages: finalMessages })
      .eq('id', conversation_id);

    return res.status(200).json({ message: assistantMessage });
  } catch (error) {
    console.error('[agentChat]', error);
    return res.status(500).json({ error: error.message });
  }
}
