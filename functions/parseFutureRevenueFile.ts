import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_name } = await req.json();

    if (!file_url || !file_name) {
      return Response.json({ 
        error: 'Missing required parameters: file_url, file_name' 
      }, { status: 400 });
    }

    console.log(`Parsing future revenue file: ${file_name}`);

    // שלב 1: זיהוי המבנה של הקובץ
    const identifyPrompt = `
אתה מנתח קובץ הכנסות עתידיות (תחזית מכירות).

הקובץ צריך לכלול:
- שם מוצר/שירות
- חודש (מספר 1-12 או שם חודש)
- כמות מתוכננת
- הכנסה מתוכננת (אופציונלי)

נתח את הקובץ והחזר JSON עם:
{
  "detected_columns": {
    "product_name_column": "שם העמודה למוצר",
    "month_column": "שם העמודה לחודש",
    "quantity_column": "שם העמודה לכמות",
    "revenue_column": "שם העמודה להכנסה (או null אם לא קיימת)"
  },
  "sample_rows": [
    {"product_name": "...", "month": 1, "quantity": 100, "revenue": 5000}
  ]
}
`;

    const identificationResult = await base44.integrations.Core.InvokeLLM({
      prompt: identifyPrompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          detected_columns: {
            type: "object",
            properties: {
              product_name_column: { type: "string" },
              month_column: { type: "string" },
              quantity_column: { type: "string" },
              revenue_column: { type: "string" }
            }
          },
          sample_rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                month: { type: "number" },
                quantity: { type: "number" },
                revenue: { type: "number" }
              }
            }
          }
        }
      }
    });

    console.log('Column identification:', identificationResult);

    // שלב 2: חילוץ כל השורות
    const extractPrompt = `
בהתבסס על העמודות שזוהו:
- מוצר: ${identificationResult.detected_columns.product_name_column}
- חודש: ${identificationResult.detected_columns.month_column}
- כמות: ${identificationResult.detected_columns.quantity_column}
- הכנסה: ${identificationResult.detected_columns.revenue_column || 'לא קיימת'}

חלץ את כל השורות מהקובץ.
אם חודש הוא שם (למשל "ינואר") - המר למספר (1-12).
אם אין עמודת הכנסה - השאר revenue כ-0.

החזר JSON:
{
  "rows": [
    {
      "product_name": "שם המוצר",
      "month": 1,
      "quantity": 100,
      "revenue": 5000,
      "description": "תיאור נוסף אם קיים"
    }
  ]
}
`;

    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: extractPrompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                month: { type: "number" },
                quantity: { type: "number" },
                revenue: { type: "number" },
                description: { type: "string" }
              }
            }
          }
        }
      }
    });

    console.log(`Extracted ${extractionResult.rows?.length || 0} rows`);

    return Response.json({
      success: true,
      data: extractionResult
    });

  } catch (error) {
    console.error('Error parsing future revenue file:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});