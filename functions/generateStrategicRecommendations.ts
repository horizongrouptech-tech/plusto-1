import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { customer_email, business_type, business_goals, target_audience, main_products_services, monthly_revenue } = await req.json();
        
        if (!customer_email) {
            return new Response(JSON.stringify({ error: 'customer_email is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Starting strategic recommendations generation for customer: ${customer_email}`);

        // יצירת המלצות אסטרטגיות באמצעות AI
        const strategicPrompt = `
        אתה יועץ עסקי מנוסה בישראל המתמחה במתן המלצות אסטרטגיות מעשיות.
        
        פרטי העסק:
        - סוג עסק: ${business_type || "כללי"}
        - יעדים עסקיים: ${business_goals || "צמיחה ורווחיות"}
        - קהל יעד: ${target_audience || "לקוחות כלליים"}
        - מוצרים/שירותים עיקריים: ${main_products_services || "לא צוין"}
        - מחזור חודשי משוער: ${monthly_revenue ? `₪${monthly_revenue}` : "לא צוין"}
        
        צור 5-8 המלצות אסטרטגיות מעשיות ובנות ביצוע עבור העסק הזה.
        התמקד בהמלצות שיכולות להניב תוצאות מהירות וחיוביות.
        
        עבור כל המלצה, כלול:
        - כותרת ברורה ומשכנעת
        - תיאור מפורט של ההמלצה
        - רווח צפוי בשקלים (אמדן ריאלי)
        - אחוז שיפור רווח משוער
        - רמת מאמץ יישום (נמוכה/בינונית/גבוהה)
        - צעדי ביצוע ספציפיים
        - טווח זמן ליישום
        - קטגוריה (תמחור/מבצעים/ספקים/מלאי/אסטרטגיה)
        `;

        const recommendationsData = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: strategicPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                category: { 
                                    type: "string",
                                    enum: ["pricing", "promotions", "suppliers", "inventory", "strategic_moves"]
                                },
                                expected_profit: { type: "number" },
                                profit_percentage: { type: "number" },
                                implementation_effort: { 
                                    type: "string",
                                    enum: ["low", "medium", "high"]
                                },
                                timeframe: { type: "string" },
                                action_steps: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (recommendationsData.recommendations && recommendationsData.recommendations.length > 0) {
            // יצירת ההמלצות במערכת
            const recommendationsToCreate = recommendationsData.recommendations.map(rec => ({
                customer_email: customer_email,
                title: rec.title,
                description: rec.description,
                category: rec.category || "strategic_moves",
                expected_profit: rec.expected_profit || 0,
                profit_percentage: rec.profit_percentage || 0,
                implementation_effort: rec.implementation_effort || "medium",
                timeframe: rec.timeframe || "1-3 חודשים",
                action_steps: rec.action_steps || [],
                status: "pending",
                priority: rec.expected_profit > 5000 ? "high" : "medium",
                source: "admin_generated"
            }));

            // יצירת ההמלצות בבאצ'ים
            const batchSize = 5;
            let createdCount = 0;
            
            for (let i = 0; i < recommendationsToCreate.length; i += batchSize) {
                const batch = recommendationsToCreate.slice(i, i + batchSize);
                try {
                    await base44.asServiceRole.entities.Recommendation.bulkCreate(batch);
                    createdCount += batch.length;
                    console.log(`Created batch of ${batch.length} recommendations (total: ${createdCount})`);
                } catch (batchError) {
                    console.error(`Error creating recommendations batch ${i/batchSize + 1}:`, batchError);
                }
            }

            console.log(`Successfully generated ${createdCount} strategic recommendations for ${customer_email}`);
            
            return new Response(JSON.stringify({ 
                success: true, 
                message: `Generated ${createdCount} strategic recommendations`,
                recommendations_count: createdCount
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else {
            throw new Error('Failed to generate recommendations - empty response from AI');
        }

    } catch (error) {
        console.error("Error in generateStrategicRecommendations:", error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to generate strategic recommendations: ${error.message}` 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});