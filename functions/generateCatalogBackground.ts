import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// פונקציית עזר לחיפוש ברקוד ב-Open Food Facts
const findBarcodeForProduct = async (productName) => {
    try {
        if (!productName || productName.trim() === '') return null;
        
        const searchQuery = encodeURIComponent(productName.trim());
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/products.json?search=${searchQuery}&page_size=3`);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data.status !== 1 || !data.products || data.products.length === 0) {
            return null;
        }
        
        // בחירת התוצאה הראשונה עם התאמה קרובה
        const bestMatch = data.products[0];
        if (bestMatch && bestMatch.code && bestMatch.product_name) {
            // בדיקת התאמה בסיסית
            const searchWords = productName.toLowerCase().split(' ').filter(w => w.length > 2);
            const foundWords = bestMatch.product_name.toLowerCase().split(' ').filter(w => w.length > 2);
            
            const hasMatch = searchWords.some(word => 
                foundWords.some(foundWord => 
                    foundWord.includes(word) || word.includes(foundWord)
                )
            );
            
            if (hasMatch) {
                return bestMatch.code;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error finding barcode:', error);
        return null;
    }
};

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const reqBody = await req.json();
        const {
            customer_email,
            business_type = 'retail',
            business_name = '',
            categories = [],
            product_count = 10
        } = reqBody;
        
        if (!customer_email) {
            return new Response(JSON.stringify({
                success: false,
                error: 'customer_email נדרש'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // יצירת רשומת תהליך
        const processRecord = await base44.asServiceRole.entities.ProcessStatus.create({
            customer_email: customer_email,
            process_type: 'catalog_generation',
            status: 'running',
            progress: 0,
            current_step: 'מתחיל יצירת קטלוג...',
            started_at: new Date().toISOString()
        });
        
        // הפעלת התהליך ברקע
        setTimeout(async () => {
            try {
                // עדכון התקדמות
                await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, {
                    progress: 10,
                    current_step: 'יוצר מוצרים באמצעות AI...'
                });
                
                // בניית הפרומפט
                const categoriesText = categories.length > 0 ? categories.join(', ') : 'מגוון קטגוריות מתאימות לעסק';
                
                const prompt = `אתה מומחה בניהול מלאי ויצירת קטלוגים לעסקים בישראל.
                צור רשימה של ${product_count} מוצרים עבור עסק מסוג "${business_type}" בשם "${business_name}".
                
                התמקד בקטגוריות: ${categoriesText}
                
                עבור כל מוצר, ספק:
                - שם מוצר ספציפי ומדויק (באינגוש או עברית, לפי המוצר)
                - מחיר קנייה הגיוני
                - מחיר מכירה הגיוני (עם רווח של 15-40%)
                - קטגוריה מדויקת
                - ספק או יצרן ידוע ורלוונטי בישראל
                - כמות מלאי התחלתית הגיונית
                - הערכה למכירות חודשיות (יחידות)
                
                החזר את התוצאה כ-JSON array עם השדות:
                product_name, cost_price, selling_price, category, supplier, inventory, monthly_sales`;
                
                const aiResponse = await base44.asServiceRole.integrations.InvokeLLM({
                    prompt: prompt,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            products: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        product_name: { type: "string" },
                                        cost_price: { type: "number" },
                                        selling_price: { type: "number" },
                                        category: { type: "string" },
                                        supplier: { type: "string" },
                                        inventory: { type: "number" },
                                        monthly_sales: { type: "number" }
                                    }
                                }
                            }
                        }
                    }
                });
                
                if (!aiResponse.products || !Array.isArray(aiResponse.products)) {
                    throw new Error('AI לא החזיר מבנה תקין של מוצרים');
                }
                
                await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, {
                    progress: 40,
                    current_step: `נוצרו ${aiResponse.products.length} מוצרים. מחפש ברקודים...`
                });
                
                // יצירת המוצרים במסד הנתונים עם השלמת ברקודים
                const createdProducts = [];
                const totalProducts = aiResponse.products.length;
                
                for (let i = 0; i < aiResponse.products.length; i++) {
                    const product = aiResponse.products[i];
                    
                    // עדכון התקדמות
                    const progress = 40 + ((i + 1) / totalProducts) * 50;
                    await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, {
                        progress: Math.round(progress),
                        current_step: `מעבד מוצר ${i + 1} מתוך ${totalProducts}: ${product.product_name}`
                    });
                    
                    try {
                        // חיפוש ברקוד למוצר
                        const barcode = await findBarcodeForProduct(product.product_name);
                        
                        // חישוב רווח
                        const grossProfit = (product.selling_price || 0) - (product.cost_price || 0);
                        const profitPercentage = product.cost_price > 0 ? 
                            (grossProfit / product.cost_price) * 100 : 0;
                        
                        // הערכת איכות נתונים
                        const completeness = [
                            product.product_name,
                            barcode,
                            product.cost_price,
                            product.selling_price,
                            product.supplier,
                            product.category
                        ].filter(Boolean).length;
                        
                        const dataQuality = completeness >= 5 ? 'complete' : 
                                          completeness >= 3 ? 'partial' : 'incomplete';
                        
                        const productRecord = await base44.asServiceRole.entities.ProductCatalog.create({
                            customer_email: customer_email,
                            product_name: product.product_name,
                            barcode: barcode || '', // ברקוד מ-Open Food Facts אם נמצא
                            cost_price: product.cost_price || 0,
                            selling_price: product.selling_price || 0,
                            category: product.category || 'כללי',
                            supplier: product.supplier || '',
                            inventory: product.inventory || 0,
                            monthly_sales: product.monthly_sales || 0,
                            gross_profit: grossProfit,
                            profit_percentage: profitPercentage,
                            data_source: 'ai_suggestion',
                            data_quality: dataQuality,
                            is_suggested: true,
                            is_active: true,
                            suggestion_reasoning: `מוצר נוצר אוטומטית עבור עסק מסוג ${business_type}`,
                            last_updated: new Date().toISOString()
                        });
                        
                        createdProducts.push(productRecord);
                        
                    } catch (error) {
                        console.error(`Error creating product ${product.product_name}:`, error);
                    }
                }
                
                // סיום מוצלח
                await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, {
                    status: 'completed',
                    progress: 100,
                    current_step: `הקטלוג נוצר בהצלחה! ${createdProducts.length} מוצרים נוצרו`,
                    completed_at: new Date().toISOString(),
                    result_data: {
                        products_created: createdProducts.length,
                        barcodes_found: createdProducts.filter(p => p.barcode).length
                    }
                });
                
            } catch (error) {
                console.error('Error in catalog generation:', error);
                await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, {
                    status: 'failed',
                    completed_at: new Date().toISOString(),
                    error_message: error.message,
                    current_step: 'יצירת הקטלוג נכשלה: ' + error.message
                });
            }
        }, 100);
        
        return new Response(JSON.stringify({
            success: true,
            process_id: processRecord.id,
            message: 'יצירת קטלוג החלה בהצלחה'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Error in generateCatalogBackground:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'שגיאה פנימית: ' + error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});