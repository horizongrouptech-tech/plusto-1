import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const { fileId, specificQuery } = await req.json();

        if (!fileId) {
            return new Response(JSON.stringify({ error: 'fileId is required' }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const fileData = await base44.entities.FileUpload.get(fileId);

        if (!fileData || !fileData.ai_insights) {
            return new Response(JSON.stringify({ error: 'File data or initial AI insights not found.' }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        const existingInsights = fileData.ai_insights;
        const reportType = fileData.data_category || 'כללי';

        let prompt = `
        You are a senior business analyst AI. You have been provided with initial insights extracted from a business document of type '${reportType}'.
        The existing insights are: ${JSON.stringify(existingInsights, null, 2)}

        Your task is to generate new, deeper, and more actionable insights based on this existing data.
        `;

        if (specificQuery) {
            prompt += `Please focus specifically on the following user query: "${specificQuery}". Provide a detailed and practical answer.`;
        } else {
            prompt += `Provide general deeper insights. For example, you could analyze:
            - Hidden trends or patterns that were not initially highlighted.
            - Actionable optimization opportunities.
            - Potential future risks and opportunities based on the data.
            - Critical follow-up questions that the data raises.
            - Concrete strategic recommendations for business improvement.
            `;
        }

        prompt += `
        Respond in HEBREW, using a professional and clear tone.
        Your response must be in JSON format, where each key is a short, descriptive title for the insight, and the value is a detailed, well-formatted explanation of the insight.
        Example:
        {
          "הזדמנות לשיפור תזרים המזומנים": "מהנתונים עולה כי זמן גביית חובות מלקוחות עומד על 60 יום בממוצע, בעוד תשלום לספקים מתבצע תוך 30 יום. מומלץ לפעול לקיצור ימי גבייה ולנהל משא ומתן על הארכת ימי אשראי מספקים כדי לשפר את תזרים המזומנים.",
          "ריכוזיות גבוהה של לקוחות": "כ-70% מההכנסות מגיעות מ-3 לקוחות בלבד. זהו סיכון משמעותי. יש לבנות תוכנית להרחבת בסיס הלקוחות ולהפחית את התלות בלקוחות אלו."
        }
        `;

        const deeperInsightsResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                additionalProperties: { type: "string" }
            }
        });

        const queryKey = specificQuery ? specificQuery.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50) : 'general_deeper_insight';
        const newInsightKey = `${queryKey}_${Date.now()}`;

        const updatedExtraInsights = {
            ...(fileData.extra_ai_insights || {}),
            [newInsightKey]: deeperInsightsResult 
        };

        await base44.entities.FileUpload.update(fileId, { extra_ai_insights: updatedExtraInsights });

        return new Response(JSON.stringify({ success: true, insights: deeperInsightsResult }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error("Error in generateDeeperInsights function:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to generate deeper insights" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});