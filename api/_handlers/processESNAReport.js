import { requireAuth, supabaseAdmin, extractDataFromFile, invokeLLM } from '../_helpers.js';

const esnaJsonSchema = {
  type: 'object',
  properties: {
    metadata: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        businessId: { type: 'string' },
        reportYear: { type: 'integer' },
        reportType: { type: 'string', enum: ['ESNA'] },
        generatedDate: { type: 'string', format: 'date-time' },
        representativeOffice: { type: 'string' },
      },
      required: ['companyName', 'businessId', 'reportYear', 'reportType'],
    },
    annualSummary: {
      type: 'object',
      properties: {
        totalTaxableTransactions: { type: 'number' },
        totalExemptTransactions: { type: 'number' },
        totalInputTax: { type: 'number' },
        taxRate: { type: 'number', default: 17.0 },
      },
    },
    monthlyBreakdown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          period: { type: 'string' },
          totalTransactions: { type: 'number' },
          inputTaxTotal: { type: 'number' },
          vatRate: { type: 'number' },
        },
        required: ['period', 'totalTransactions'],
      },
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, customer_email, file_id } = req.body ?? {};
    if (!file_url || !customer_email) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: file_url, customer_email' });
    }

    const extractionResult = await extractDataFromFile({ file_url, json_schema: esnaJsonSchema });

    if (extractionResult.status !== 'success' || !extractionResult.output) {
      const msg = 'Failed to extract data from ESNA report';
      if (file_id) {
        await supabaseAdmin.from('file_upload').update({ status: 'failed', analysis_notes: msg }).eq('id', file_id);
      }
      return res.status(500).json({ success: false, error: msg });
    }

    const esnaData = extractionResult.output;

    let aiInsights = {};
    try {
      aiInsights = await invokeLLM({
        prompt: `אתה מנתח מומחה לדוחות מע"מ ישראליים. נתח את הנתונים הבאים מדוח ESNA ותן תובנות עסקיות:
חברה: ${esnaData.metadata?.companyName || 'לא זוהה'}, מספר עוסק: ${esnaData.metadata?.businessId || ''}, שנת דוח: ${esnaData.metadata?.reportYear || ''}
סך עסקאות חייבות: ₪${esnaData.annualSummary?.totalTaxableTransactions?.toLocaleString() || '0'}
סך מס תשומות: ₪${esnaData.annualSummary?.totalInputTax?.toLocaleString() || '0'}`,
        response_json_schema: {
          type: 'object',
          properties: {
            businessHealthAssessment: { type: 'string' },
            keyTrends: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            warnings: { type: 'array', items: { type: 'string' } },
            riskScore: { type: 'number', minimum: 1, maximum: 10 },
          },
        },
      });
    } catch (e) {
      console.error('AI insights failed:', e);
      aiInsights = { error: 'Failed to generate insights' };
    }

    if (file_id) {
      await supabaseAdmin.from('file_upload').update({
        status: 'analyzed',
        data_category: 'esna_report',
        esna_report_data: esnaData,
        ai_insights: aiInsights,
        analysis_notes: `דוח מע"מ (ESNA) עובד בהצלחה עבור ${esnaData.metadata?.companyName || 'חברה לא ידועה'}`,
      }).eq('id', file_id);
    }

    return res.status(200).json({ success: true, data: esnaData, insights: aiInsights, message: 'דוח מע"מ עובד בהצלחה' });
  } catch (error) {
    console.error('[processESNAReport]', error);
    return res.status(500).json({ success: false, error: error.message || 'שגיאה בעיבוד דוח מע"מ' });
  }
}
