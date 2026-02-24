import { requireAuth, supabaseAdmin, invokeLLM } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { fileId, specificQuery } = req.body ?? {};
    if (!fileId) return res.status(400).json({ error: 'fileId is required' });

    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('file_upload')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileData || !fileData.ai_insights) {
      return res.status(404).json({ error: 'File data or initial AI insights not found.' });
    }

    const reportType = fileData.data_category || 'כללי';
    let prompt = `You are a senior business analyst AI. You have been provided with initial insights extracted from a business document of type '${reportType}'.
The existing insights are: ${JSON.stringify(fileData.ai_insights, null, 2)}

Your task is to generate new, deeper, and more actionable insights based on this existing data.
`;

    if (specificQuery) {
      prompt += `Please focus specifically on the following user query: "${specificQuery}". Provide a detailed and practical answer.`;
    } else {
      prompt += `Provide general deeper insights: hidden trends, actionable optimization opportunities, future risks, follow-up questions, and strategic recommendations.`;
    }

    prompt += `\nRespond in HEBREW, professional tone. Return a JSON object where each key is a short title and value is a detailed explanation.`;

    const deeperInsightsResult = await invokeLLM({
      prompt,
      response_json_schema: { type: 'object', additionalProperties: { type: 'string' } },
    });

    const queryKey = specificQuery
      ? specificQuery.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
      : 'general_deeper_insight';
    const newInsightKey = `${queryKey}_${Date.now()}`;

    const updatedExtraInsights = {
      ...(fileData.extra_ai_insights || {}),
      [newInsightKey]: deeperInsightsResult,
    };

    await supabaseAdmin
      .from('file_upload')
      .update({ extra_ai_insights: updatedExtraInsights })
      .eq('id', fileId);

    return res.status(200).json({ success: true, insights: deeperInsightsResult });
  } catch (error) {
    console.error('[generateDeeperInsights]', error);
    return res.status(500).json({ error: error.message || 'Failed to generate deeper insights' });
  }
}
