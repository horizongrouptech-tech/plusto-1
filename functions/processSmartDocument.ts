import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    if (!await base44.auth.isAuthenticated()) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { file_url, customer_email, file_id, file_name } = await req.json();

        if (!file_url) {
            throw new Error('File URL is required.');
        }

        // Step 1: Identify the document type using LLM
        const identifyPrompt = `
        Analyze the provided document file. Your goal is to categorize it into one of the following specific types:
        1. "FIBI_LOAN_SCHEDULE" - A loan repayment schedule from First International Bank of Israel (FIBI / הבינלאומי).
        2. "MUNICIPAL_TENDER" - A municipal tender document (מכרז), specifically looking like a tender for sports facilities or similar infrastructure (often from Petah Tikva Development Company).
        3. "WHATSAPP_SCREENSHOT" - A screenshot of a WhatsApp conversation, likely containing leads or task details.
        4. "TAX_ASSESSMENT" - A tax assessment document (שומת מס הכנסה / הודעת שומה) from the Israeli Tax Authority (רשות המסים). This includes documents showing taxable income, tax calculations, refunds or debts to pay.
        5. "OTHER" - Any other type of document.

        Return a JSON object with a single field "document_type".
        `;

        const identificationResult = await base44.integrations.Core.InvokeLLM({
            prompt: identifyPrompt,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    document_type: { 
                        type: "string", 
                        enum: ["FIBI_LOAN_SCHEDULE", "MUNICIPAL_TENDER", "WHATSAPP_SCREENSHOT", "TAX_ASSESSMENT", "OTHER"] 
                    }
                },
                required: ["document_type"]
            }
        });

        const docType = identificationResult.document_type;
        let processingResult;
        let finalCategory = 'other';

        // Step 2: Process based on type
        if (docType === 'FIBI_LOAN_SCHEDULE') {
            finalCategory = 'loan_schedule';
            const loanPrompt = `
            Extract the loan repayment schedule from this FIBI document.
            Return a JSON with:
            - "loan_details": { account_number, loan_id, interest_rate, linkage_type, report_date }
            - "schedule_rows": Array of { payment_date, principal_amount, interest_amount, total_payment, balance_after }
            All numeric values should be numbers. Dates should be strings.
            `;
            processingResult = await base44.integrations.Core.InvokeLLM({
                prompt: loanPrompt,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        loan_details: { type: "object", additionalProperties: true },
                        schedule_rows: { 
                            type: "array", 
                            items: { 
                                type: "object",
                                properties: {
                                    payment_date: { type: "string" },
                                    principal_amount: { type: "number" },
                                    interest_amount: { type: "number" },
                                    total_payment: { type: "number" },
                                    balance_after: { type: "number" }
                                }
                            } 
                        }
                    }
                }
            });

        } else if (docType === 'MUNICIPAL_TENDER') {
            finalCategory = 'tender_document';
            const tenderPrompt = `
            Extract the "Bill of Quantities" (כתב כמויות) or pricing list from this tender document.
            Focus on extracting a list of items that need pricing or have set prices.
            Return a JSON with:
            - "tender_details": { tender_number, issuer, submission_date }
            - "items": Array of { item_code, description, unit, quantity, target_price (if exists) }
            `;
            processingResult = await base44.integrations.Core.InvokeLLM({
                prompt: tenderPrompt,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        tender_details: { type: "object", additionalProperties: true },
                        items: { 
                            type: "array", 
                            items: { 
                                type: "object",
                                properties: {
                                    item_code: { type: "string" },
                                    description: { type: "string" },
                                    unit: { type: "string" },
                                    quantity: { type: "number" },
                                    target_price: { type: "number" }
                                }
                            } 
                        }
                    }
                }
            });

        } else if (docType === 'WHATSAPP_SCREENSHOT') {
            finalCategory = 'whatsapp_screenshot';
            const whatsappPrompt = `
            Analyze this WhatsApp screenshot. It likely contains a lead or a task.
            Extract the text content and identify key entities.
            Return a JSON with:
            - "conversation_text": The full text extracted.
            - "detected_intent": "lead", "task", or "general".
            - "entities": { name, phone, email, topic, date }
            `;
            processingResult = await base44.integrations.Core.InvokeLLM({
                prompt: whatsappPrompt,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        conversation_text: { type: "string" },
                        detected_intent: { type: "string" },
                        entities: { type: "object", additionalProperties: true }
                    }
                }
            });

        } else if (docType === 'TAX_ASSESSMENT') {
            finalCategory = 'tax_assessment';
            console.log('Detected Tax Assessment in processSmartDocument, calling processTaxAssessment...');
            
            // Call the dedicated tax processing function
            const taxResponse = await base44.asServiceRole.functions.invoke('processTaxAssessment', {
                file_url,
                file_name: file_name || 'Tax Assessment',
                customer_email
            });

            if (taxResponse.error) {
                throw new Error('Error processing tax assessment: ' + taxResponse.error);
            }

            const taxData = taxResponse.data.data;
            const recommendations = taxResponse.data.recommendations || [];

            // Format the result to match what we expect in ai_insights
            processingResult = {
                document_type: "שומת מס הכנסה",
                tax_data: taxData,
                recommendations: recommendations,
                summary: `שומה לשנת ${taxData.tax_year}: ${taxData.is_refund ? 'החזר' : 'חוב'} ע"ס ${Math.abs(taxData.final_tax_balance).toLocaleString()} ₪`,
                analyzed_at: new Date().toISOString()
            };

        } else {
            // Fallback to generic analysis (the "Other" logic)
            finalCategory = 'general_document';
            const genericPrompt = `
            Analyze this document. It was uploaded as "${file_name}".
            Provide a summary, key insights, and any structured data found (tables, lists).
            Return a JSON with:
            - "summary": Text summary.
            - "key_data": Any extracted key-value pairs.
            - "insights": Array of strings.
            `;
            processingResult = await base44.integrations.Core.InvokeLLM({
                prompt: genericPrompt,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        summary: { type: "string" },
                        key_data: { type: "object", additionalProperties: true },
                        insights: { type: "array", items: { type: "string" } }
                    }
                }
            });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            category: finalCategory,
            data: processingResult 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in processSmartDocument function:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});