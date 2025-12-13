import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { customer_email, business_type, business_goals, target_audience, main_products_services } = await req.json();
        
        if (!customer_email) {
            return new Response(JSON.stringify({ error: 'customer_email is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Starting initial catalog generation for customer: ${customer_email}`);

        // יצירת קטלוג ריק להתחלה
        const newCatalog = await base44.asServiceRole.entities.Catalog.create({
            customer_email: customer_email,
            catalog_name: "קטלוג ראשוני",
            creation_method: "ai_generated",
            status: "generating",
            is_active: true,
            generation_metadata: {
                business_type: business_type || "לא צוין",
                business_goals: business_goals || "",
                target_audience: target_audience || "",
                main_products_services: main_products_services || ""
            },
            last_generated_at: new Date().toISOString(),
            product_count: 0
        });

        console.log(`Created initial catalog with ID: ${newCatalog.id}`);

        // כעת ניצור מוצרים מוצעים עבור הקטלוג הזה
        const catalogGenerationPrompt = `
        אתה מומחה ליצירת קטלוגי מוצרים עסקיים בישראל.
        
        פרטי העסק:
        - סוג עסק: ${business_type || "כללי"}
        - יעדים עסקיים: ${business_goals || "צמיחה ורווחיות"}
        - קהל יעד: ${target_audience || "לקוחות כלליים"}
        - מוצרים/שירותים עיקריים: ${main_products_services || "לא צוין"}
        
        יצור רשימה של 15-25 מוצרים מתאימים לעסק הזה.
        עבור כל מוצר, כלול:
        - שם המוצר
        - קטגוריה
        - מחיר מכירה משוער (במטבע ישראלי)
        - מחיר עלות משוער
        - תיאור קצר
        - ספק פוטנציאלי (שם כללי)
        
        התמקד במוצרים שיכולים להניב רווח טוב ומתאימים לשוק הישראלי.
        `;

        const catalogData = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: catalogGenerationPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    products: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                product_name: { type: "string" },
                                category: { type: "string" },
                                selling_price: { type: "number" },
                                cost_price: { type: "number" },
                                description: { type: "string" },
                                supplier: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        if (catalogData.products && catalogData.products.length > 0) {
            // יצירת המוצרים בקטלוג
            const productsToCreate = catalogData.products.map(product => ({
                catalog_id: newCatalog.id,
                customer_email: customer_email,
                product_name: product.product_name,
                category: product.category,
                selling_price: product.selling_price || 0,
                cost_price: product.cost_price || 0,
                supplier: product.supplier || "ספק כללי",
                data_source: "ai_suggestion",
                data_quality: "complete",
                is_suggested: true,
                suggestion_reasoning: "מוצר מוצע על בסיס פרופיל העסק",
                last_updated: new Date().toISOString(),
                is_active: true,
                gross_profit: (product.selling_price || 0) - (product.cost_price || 0),
                profit_percentage: product.selling_price > 0 ? 
                    (((product.selling_price - (product.cost_price || 0)) / product.selling_price) * 100) : 0
            }));

            // יצירת המוצרים בבאצ'ים
            const batchSize = 10;
            let createdCount = 0;
            
            for (let i = 0; i < productsToCreate.length; i += batchSize) {
                const batch = productsToCreate.slice(i, i + batchSize);
                try {
                    await base44.asServiceRole.entities.ProductCatalog.bulkCreate(batch);
                    createdCount += batch.length;
                    console.log(`Created batch of ${batch.length} products (total: ${createdCount})`);
                } catch (batchError) {
                    console.error(`Error creating batch ${i/batchSize + 1}:`, batchError);
                }
            }

            // עדכון הקטלוג עם הסטטוס הסופי
            await base44.asServiceRole.entities.Catalog.update(newCatalog.id, {
                status: "ready",
                product_count: createdCount,
                last_generated_at: new Date().toISOString()
            });

            console.log(`Initial catalog generation completed. Created ${createdCount} products.`);

            return new Response(JSON.stringify({
                success: true,
                catalog_id: newCatalog.id,
                products_created: createdCount,
                message: "קטלוג ראשוני נוצר בהצלחה"
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } else {
            // עדכון הקטלוג לכישלון
            await base44.asServiceRole.entities.Catalog.update(newCatalog.id, {
                status: "failed"
            });

            return new Response(JSON.stringify({
                success: false,
                error: "לא הצלחנו ליצור מוצרים לקטלוג"
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error("Error generating initial catalog:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || "שגיאה ביצירת קטלוג ראשוני"
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});