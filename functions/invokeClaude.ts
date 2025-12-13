import { createClient } from 'npm:@base44/sdk@0.1.0';
import Anthropic from 'npm:@anthropic-ai/sdk@0.20.1';

// אתחול לקוח Anthropic עם מפתח ה-API מה-Secrets
const anthropic = new Anthropic({
  apiKey: Deno.env.get('CLAUDE_API_KEY'),
});

Deno.serve(async (req) => {
  try {
    // אימות משתמש Base44 - חובה לאבטחה
    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    base44.auth.setToken(token);
    const user = await base44.auth.me();
    if (!user) {
      return new Response('Unauthorized: Invalid token', { status: 401 });
    }

    // קבלת הפרומפט והסכימה מהבקשה
    const { prompt, response_json_schema } = await req.json();
    if (!prompt || !response_json_schema) {
      return new Response('Bad Request: Missing prompt or response_json_schema', { status: 400 });
    }
    
    // גישה פשוטה יותר - נבקש מ-Claude להחזיר JSON ונתקן את התשובה
    const enhancedPrompt = `${prompt}

Please return your analysis as a valid JSON object that matches this exact schema:
${JSON.stringify(response_json_schema, null, 2)}

Make sure your response is ONLY valid JSON, with no additional text or formatting.`;

    // שליחת הבקשה ל-Claude עם המודל הנכון
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", // מודל מעודכן וזמין
      max_tokens: 4000,
      messages: [{ role: 'user', content: enhancedPrompt }],
    });

    // חילוץ התוכן מהתשובה
    const responseText = msg.content[0]?.text;
    if (!responseText) {
      throw new Error("Claude returned empty response");
    }

    // ניסיון לפרס את התשובה כ-JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      return new Response(JSON.stringify(jsonResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (parseError) {
      // אם הפרסינג נכשל, ננסה לנקות את התשובה
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const jsonResponse = JSON.parse(cleanedResponse);
      return new Response(JSON.stringify(jsonResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error('Error in invokeClaude function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});