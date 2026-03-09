import { requireAuth, supabaseAdmin } from './_helpers.js';
import { TOOL_DEFINITIONS, executeTool } from './_agentTools.js';

/**
 * POST /api/agentChat
 *
 * Body:
 *   conversation_id  {string}  — existing manager_conversation row ID
 *   role             {string}  — 'user'
 *   content          {string}  — the user's message text
 *   agent_name       {string}  — e.g. 'plusto_user_guide_agent'
 *   metadata         {object}  — conversation metadata (user info, context, etc.)
 *
 * Flow:
 *   1. Auth check
 *   2. Load current messages from DB
 *   3. Append user message
 *   4. Call LLM with tools — loop until no more tool_calls
 *   5. Append assistant reply
 *   6. Update row (triggers Supabase Realtime → FloatingAgentChat re-renders)
 *   7. Return { message: assistantMessage }
 */

const MAX_TOOL_ROUNDS = 5; // מגבלת סבבי tool calling למניעת לופ אינסופי

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { conversation_id, content, metadata = {} } = req.body ?? {};

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

    // 3. Build system prompt
    const systemPrompt = buildSystemPrompt(user, metadata);

    // 4. Build LLM messages (last 30 to stay within token limits)
    const recentMessages = messagesWithUser.slice(-30);
    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map(toLLMMessage),
    ];

    // 5. Call LLM with tool calling loop (fetch ישיר — ה-SDK לא תומך בפורמט tool messages)
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_AGENT_MODEL
      || process.env.OPENROUTER_DEFAULT_MODEL
      || 'anthropic/claude-sonnet-4-5';

    // Agentic loop — המודל יכול לקרוא ל-tools ולקבל תוצאות, עד שהוא מסיים עם תשובת טקסט
    let aiText = '';
    let toolCalls = [];
    let round = 0;

    while (round < MAX_TOOL_ROUNDS) {
      round++;

      const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.SITE_URL || 'https://plusto-1.vercel.app',
          'X-Title': 'Plusto',
        },
        body: JSON.stringify({
          model,
          messages: llmMessages,
          tools: TOOL_DEFINITIONS,
        }),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`OpenRouter API error ${apiRes.status}: ${errText}`);
      }

      const completion = await apiRes.json();
      const choice = completion.choices?.[0];
      if (!choice) throw new Error('No response from OpenRouter');

      const assistantMsg = choice.message;
      const msgToolCalls = assistantMsg.tool_calls || [];

      // שמור את הודעת ה-assistant כפי שהתקבלה (כולל tool_calls אם יש)
      llmMessages.push(assistantMsg);

      // אם אין tool calls — זו התשובה הסופית
      if (!msgToolCalls.length) {
        aiText = assistantMsg.content || '';
        break;
      }

      // יש tool calls — נריץ אותם ונוסיף תוצאות
      for (const tc of msgToolCalls) {
        const toolName = tc.function.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(tc.function.arguments || '{}');
        } catch { /* empty args */ }

        // הרצת ה-tool עם הרשאות המשתמש
        const result = await executeTool(toolName, toolArgs, user);

        // שמירת tool call למעקב ב-UI
        toolCalls.push({
          name: toolName,
          arguments_string: tc.function.arguments,
          results: result,
          status: 'completed',
        });

        // הוספת התוצאה ל-LLM messages (פורמט OpenAI-compatible)
        llmMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }
    }

    // 6. Build assistant message for DB
    const assistantMessage = {
      role: 'assistant',
      content: aiText,
      created_date: new Date().toISOString(),
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    };
    const finalMessages = [...messagesWithUser, assistantMessage];

    // 7. Update row — triggers Supabase Realtime
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(user, metadata) {
  const parts = [
    'אתה יועץ עסקי חכם של Horizon Group עם גישה למערכת ניהול הלקוחות.',
    'יש לך כלים (tools) לשליפת נתונים מהמערכת — השתמש בהם כשהמשתמש שואל על לקוחות, יעדים, המלצות, קבצים או תחזיות.',
    'ענה תמיד בעברית אלא אם כן המשתמש פונה אליך בשפה אחרת.',
    'היה ממוקד, מועיל ומקצועי. הצג נתונים בצורה מסודרת.',
    'כשאתה מציג רשימות, השתמש בטבלאות markdown או רשימות ממוספרות.',
    'אל תמציא נתונים — אם אין מידע, אמור זאת בבירור.',
  ];

  // הרשאות המשתמש
  const role = user.role || user.user_type || 'client';
  if (['admin', 'super_admin', 'department_manager'].includes(role)) {
    parts.push('למשתמש הזה יש הרשאות אדמין — גישה לכל הלקוחות והנתונים במערכת.');
  } else if (role === 'financial_manager' || user.user_type === 'financial_manager') {
    parts.push('המשתמש הוא מנהל פיננסי — הוא רואה רק את הלקוחות המשויכים אליו. ה-tools כבר מסננים בהתאם.');
  } else {
    parts.push('המשתמש הוא לקוח — הוא רואה רק את הנתונים שלו.');
  }

  if (metadata.customer_name) parts.push(`הלקוח הנוכחי בפוקוס: ${metadata.customer_name}`);
  if (metadata.current_page) parts.push(`עמוד נוכחי: ${metadata.current_page}`);

  return parts.join('\n');
}

/**
 * ממיר הודעה מה-DB לפורמט של OpenAI messages API.
 * מטפל גם בהודעות עם tool_calls ישנות.
 */
function toLLMMessage(m) {
  return {
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content || '',
  };
}
