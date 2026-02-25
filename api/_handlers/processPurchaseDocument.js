import { requireAuth, supabaseAdmin, invokeLLM } from '../_helpers.js';

const purchaseDocumentSchema = {
  type: 'object',
  properties: {
    document_type: { type: 'string', enum: ['invoice', 'delivery_note', 'purchase_order', 'other'] },
    invoice_number: { type: 'string' },
    invoice_date: { type: 'string', format: 'date' },
    supplier_name: { type: 'string' },
    supplier_id: { type: 'string' },
    total_amount: { type: 'number' },
    vat_amount: { type: 'number' },
    net_amount: { type: 'number' },
    currency: { type: 'string', default: 'ILS' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          unit_price: { type: 'number' },
          total_price: { type: 'number' },
          item_code: { type: 'string' },
        },
        required: ['description', 'quantity', 'unit_price'],
      },
    },
    payment_terms: { type: 'string' },
  },
  required: ['invoice_number', 'invoice_date', 'supplier_name', 'total_amount'],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { file_url, customer_email, file_id, supplier_id } = req.body ?? {};
  if (!file_url || !customer_email || !file_id) {
    return res.status(400).json({ error: 'Missing required parameters: file_url, customer_email, file_id' });
  }

  try {
    const prompt = `You are an expert OCR and data extraction agent specializing in Hebrew financial documents.
Analyze the provided document (invoice, delivery note, etc.) and extract the data precisely according to the provided JSON schema.
1. Identify Document Type: invoice, delivery_note, purchase_order, or other.
2. Extract invoice number, date, supplier name, and supplier ID (ח.פ. or ע.מ.).
3. Identify total amount, VAT amount, and net amount as numbers.
4. Parse the table of line items meticulously.
5. Dates in YYYY-MM-DD, numbers as floats without symbols.`;

    const analysisResult = await invokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: purchaseDocumentSchema,
      model: 'openai/gpt-4o',
    });

    if (!analysisResult) throw new Error('AI analysis returned no result.');

    await supabaseAdmin.from('purchase_record').insert({
      customer_email,
      supplier_id,
      supplier_name: analysisResult.supplier_name,
      document_type: analysisResult.document_type,
      invoice_number: analysisResult.invoice_number,
      purchase_date: analysisResult.invoice_date,
      total_amount: analysisResult.total_amount,
      net_amount: analysisResult.net_amount,
      vat_amount: analysisResult.vat_amount,
      currency: analysisResult.currency,
      items: analysisResult.items,
      payment_terms: analysisResult.payment_terms,
      file_upload_id: file_id,
      analysis_confidence: 100,
    });

    await supabaseAdmin.from('file_upload').update({
      status: 'analyzed',
      ai_insights: analysisResult,
      analysis_notes: 'Purchase document processed and saved successfully.',
    }).eq('id', file_id);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[processPurchaseDocument]', error);
    await supabaseAdmin.from('file_upload').update({ status: 'failed', analysis_notes: error.message }).eq('id', file_id);
    return res.status(500).json({ error: error.message });
  }
}
