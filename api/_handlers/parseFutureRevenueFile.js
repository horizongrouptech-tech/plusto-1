import { requireAuth, openRouterAPI } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { file_url, file_name } = req.body ?? {};
    if (!file_url || !file_name) return res.status(400).json({ error: 'Missing required parameters: file_url, file_name' });

    // Step 1: Identify columns
    const identificationResult = await openRouterAPI({
      prompt: `אתה מנתח קובץ הכנסות עתידיות (תחזית מכירות).
הקובץ צריך לכלול: שם מוצר/שירות, חודש (מספר 1-12 או שם חודש), כמות מתוכננת, הכנסה מתוכננת (אופציונלי).
נתח את הקובץ והחזר JSON עם detected_columns ו-sample_rows.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          detected_columns: {
            type: 'object',
            properties: {
              product_name_column: { type: 'string' },
              month_column: { type: 'string' },
              quantity_column: { type: 'string' },
              revenue_column: { type: 'string' },
            },
          },
          sample_rows: {
            type: 'array',
            items: { type: 'object', properties: { product_name: { type: 'string' }, month: { type: 'number' }, quantity: { type: 'number' }, revenue: { type: 'number' } } },
          },
        },
      },
      model: 'openai/gpt-4o',
    });

    // Step 2: Extract all rows
    const extractionResult = await openRouterAPI({
      prompt: `בהתבסס על העמודות שזוהו:
- מוצר: ${identificationResult.detected_columns?.product_name_column}
- חודש: ${identificationResult.detected_columns?.month_column}
- כמות: ${identificationResult.detected_columns?.quantity_column}
- הכנסה: ${identificationResult.detected_columns?.revenue_column || 'לא קיימת'}
חלץ את כל השורות מהקובץ. אם חודש הוא שם - המר למספר (1-12). אם אין הכנסה - השאר 0.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: { product_name: { type: 'string' }, month: { type: 'number' }, quantity: { type: 'number' }, revenue: { type: 'number' }, description: { type: 'string' } },
            },
          },
        },
      },
      model: 'openai/gpt-4o',
    });

    return res.status(200).json({ success: true, data: extractionResult });
  } catch (error) {
    console.error('[parseFutureRevenueFile]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
