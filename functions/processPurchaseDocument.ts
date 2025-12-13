import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const purchaseDocumentSchema = {
  type: "object",
  properties: {
    document_type: { type: "string", enum: ["invoice", "delivery_note", "purchase_order", "other"], description: "זהה את סוג המסמך" },
    invoice_number: { type: "string", description: "מספר חשבונית או מסמך" },
    invoice_date: { type: "string", format: "date", description: "תאריך החשבונית" },
    supplier_name: { type: "string", description: "שם הספק" },
    supplier_id: { type: "string", description: "מספר עוסק מורשה / ח.פ של הספק" },
    total_amount: { type: "number", description: "הסכום הכולל לתשלום" },
    vat_amount: { type: "number", description: "סכום המע''מ" },
    net_amount: { type: "number", description: "הסכום נטו לפני מע''מ" },
    currency: { type: "string", default: "ILS", description: "מטבע (למשל ILS, USD)" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" },
          total_price: { type: "number" },
          item_code: { type: "string" }
        },
        required: ["description", "quantity", "unit_price"]
      }
    },
    payment_terms: { type: "string", description: "תנאי תשלום" }
  },
  required: ["invoice_number", "invoice_date", "supplier_name", "total_amount"]
};


Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { file_url, customer_email, file_id, supplier_id } = await req.json();

  if (!file_url || !customer_email || !file_id) {
    return new Response(JSON.stringify({ error: "Missing required parameters: file_url, customer_email, file_id are required." }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const prompt = `
      You are an expert OCR and data extraction agent specializing in Hebrew financial documents.
      Analyze the provided document (invoice, delivery note, etc.) and extract the data precisely according to the provided JSON schema.
      Key tasks:
      1.  **Identify Document Type**: Determine if it's an "invoice", "delivery_note", "purchase_order", or "other".
      2.  **Extract Core Details**: Find the invoice number, date, supplier name, and supplier ID (ח.פ. or ע.מ.).
      3.  **Extract Financials**: Identify total amount, VAT amount, and net amount. Ensure they are numbers.
      4.  **Extract Line Items**: meticulously parse the table of items, extracting the description, quantity, unit price, and total price for each row.
      5.  **Data Normalization**:
          - Dates must be in YYYY-MM-DD format.
          - Numbers must be parsed as floats, removing currency symbols or commas.
          - Text must be clean UTF-8 strings.
      The final output must be a single, valid JSON object that strictly adheres to the provided schema.
    `;

    const analysisResult = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [file_url],
      response_json_schema: purchaseDocumentSchema
    });
    
    if (!analysisResult) {
        throw new Error("AI analysis returned no result.");
    }
    
    // **FIX: Save the extracted data to the PurchaseRecord entity**
    await base44.entities.PurchaseRecord.create({
      customer_email: customer_email,
      supplier_id: supplier_id, // Use the supplier ID from the context of the modal
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
      analysis_confidence: 100 // Placeholder, can be refined later
    });

    // **FIX: Update the original FileUpload record status**
    await base44.entities.FileUpload.update(file_id, {
      status: 'analyzed',
      ai_insights: analysisResult,
      analysis_notes: 'Purchase document processed and saved successfully.'
    });

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error processing purchase document:", error);
    try {
      await base44.entities.FileUpload.update(file_id, { status: 'failed', analysis_notes: error.message });
    } catch (updateError) {
      console.error("Failed to even update the status to failed:", updateError);
    }
    return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
});