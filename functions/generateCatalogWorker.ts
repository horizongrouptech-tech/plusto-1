
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

function buildEnhancedPrompt(customer_email, business_type, product_count, metadata = {}) {
  const targetAudience = metadata.target_audience || 'לקוחות כלליים';
  const businessFocus = metadata.business_focus || 'כללי';
  const includeCategories = metadata.include_categories || 'כל הקטגוריות';
  const excludeCategories = metadata.exclude_categories || 'אין';
  const specialRequirements = metadata.special_requirements || 'אין';

  return `
אתה מומחה ליצירת קטלוגי מוצרים עבור עסקים בישראל.
צור קטלוג של בדיוק ${product_count} מוצרים עבור עסק מסוג "${business_type}".

פרטי העסק:
- סוג עסק: ${business_type}
- קהל יעד: ${targetAudience}
- התמחות: ${businessFocus}
- קטגוריות לכלל: ${includeCategories}
- קטגוריות להחריג: ${excludeCategories}
- דרישות מיוחדות: ${specialRequirements}

דרישות:
1. צור בדיוק ${product_count} מוצרים שונים ומגוונים
2. כל מוצר חייב להיות רלוונטי לסוג העסק ולקהל היעד
3. מחירים ריאליים לשוק הישראלי (בשקלים)
4. שמות ספקים ישראליים אמיתיים - רק השם בלבד (לא "הספקים הישראליים...")
5. מלאי ומכירות הגיוניים
6. קטגוריות ברורות ומאורגנות
7. ברקודים תקניים (13 ספרות EAN-13, מתחילים ב-729)
8. תיאור קצר לכל מוצר (עד 50 מילים)

חזר בפורמט JSON עם בדיוק ${product_count} אובייקטי מוצרים בתוך מערך בשם "products".
הפורמט המבוקש עבור כל מוצר הוא:
{
  "product_name": "שם המוצר",
  "category": "קטגוריה מתאימה",
  "cost_price": מספר,
  "selling_price": מספר,
  "supplier": "שם ספק בעברית",
  "inventory": מספר,
  "monthly_sales": מספר,
  "barcode": "ברקוד EAN-13",
  "description": "תיאור קצר וקולע"
}
`;
}

function extractSupplierName(supplierText) {
  if (!supplierText || typeof supplierText !== 'string') {
    return 'ספק כללי';
  }
  
  let cleanedText = supplierText.trim();
  cleanedText = cleanedText.replace(/^(הספקים הישראליים)?\s*(-)?\s*/, '');
  cleanedText = cleanedText.replace(/^(ספקים אפשריים:)\s*/, '');
  cleanedText = cleanedText.replace(/(\s*(,|;)\s*.*)|(\s*\.\s*$)/, '');

  const commonIsraeliSuppliers = ['שטראוס', 'תנובה', 'אוסם', 'קוקה קולה', 'סנו', 'שופרסל', 'בזק', 'אלקטרה', 'רמי לוי', 'ח.י.', 'קסטרו', 'גולף', 'ללין', 'עלית', 'יוניליוור'];
  const foundSupplier = commonIsraeliSuppliers.find(s => cleanedText.includes(s));
  if (foundSupplier) {
    return foundSupplier;
  }
  
  const words = cleanedText.split(/\s+/);
  if (words.length > 0 && words[0].length > 1) {
      if (words.length > 1 && words[1].length > 1 && words[0].toLowerCase() !== 'חברת') {
        const combined = `${words[0]} ${words[1]}`;
        if (combined.length <= 30 && !combined.includes('בע"מ')) return combined;
      }
      if (words[0].length <= 30 && !words[0].includes('בע"מ')) return words[0];
  }

  if (cleanedText.length > 30 || cleanedText.includes('כללי') || cleanedText.includes('לא ידוע') || cleanedText.includes('שונים') || cleanedText.includes('ייבוא')) {
    return 'ספק כללי';
  }
  
  return cleanedText || 'ספק כללי';
}

function generateSupplierName(category) {
  const suppliersMap = {
    'משקאות': 'קוקה קולה',
    'חטיפים': 'עלית',
    'מוצרי ניקוי': 'סנו',
    'קוסמטיקה': 'ללין',
    'בגדים': 'קסטרו',
    'אלקטרוניקה': 'בזקסטור',
    'ספרים': 'סטימצקי',
    'מוצרי מזון יבשים': 'אסם',
    'מוצרי חלב': 'תנובה',
    'ירקות ופירות': 'חקלאי ישראלי',
    'מוצרי חשמל': 'אלקטרה'
  };
  
  return suppliersMap[category] || 'ספק כללי';
}

function generateBarcode() {
  let barcode = '729';
  for (let i = 0; i < 9; i++) {
    barcode += Math.floor(Math.random() * 10);
  }
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return barcode + checkDigit;
}

const updateProcessStatus = async (base44, processId, progress, currentStep, resultData = null) => {
    try {
        const updateData = {
            progress: Math.min(Math.max(progress, 0), 100),
            current_step: currentStep
        };
        
        if (progress >= 100) {
            updateData.status = 'completed';
            updateData.completed_at = new Date().toISOString();
            if (resultData) updateData.result_data = resultData;
        }
        
        await base44.asServiceRole.entities.ProcessStatus.update(processId, updateData);
    } catch (error) {
        console.error('Error updating process status:', error);
    }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  let customer_email;
  let business_type;
  let product_count;
  let catalog_id;
  let process_id;
  let generation_metadata;

  try {
    const requestBody = await req.json();
    customer_email = requestBody.customer_email;
    business_type = requestBody.business_type;
    product_count = requestBody.product_count;
    catalog_id = requestBody.catalog_id;
    process_id = requestBody.process_id;
    generation_metadata = requestBody.generation_metadata;

    if (!customer_email || !catalog_id || !process_id) {
      throw new Error('חסרים נתונים נדרשים: customer_email, catalog_id, process_id.');
    }

    const BATCH_SIZE_LLM = 50;
    const DB_BATCH_SIZE = 25;
    const TARGET_PRODUCTS = Math.min(product_count || 200, 10000);
    let totalGenerated = 0;
    let batchNumber = 1;
    
    await updateProcessStatus(base44, process_id, 10, `מתחיל יצירת ${TARGET_PRODUCTS} מוצרים...`);

    const allGeneratedProducts = [];

    while (totalGenerated < TARGET_PRODUCTS) {
      const remainingProducts = TARGET_PRODUCTS - totalGenerated;
      const currentBatchSize = Math.min(BATCH_SIZE_LLM, remainingProducts);
      
      const progressPercentGeneration = Math.round((totalGenerated / TARGET_PRODUCTS) * 70) + 10;
      await updateProcessStatus(base44, process_id, progressPercentGeneration, `יוצר קבוצה ${batchNumber} - ${currentBatchSize} מוצרים (${totalGenerated}/${TARGET_PRODUCTS})...`);

      const prompt = buildEnhancedPrompt(customer_email, business_type, currentBatchSize, generation_metadata);

      let llmResponse;
      try {
        // תיקון השגיאה: שימוש בדרך הנכונה לקריאת אינטגרציה
        llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: prompt,
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
                    cost_price: { type: "number" },
                    selling_price: { type: "number" },
                    supplier: { type: "string" },
                    inventory: { type: "number" },
                    monthly_sales: { type: "number" },
                    barcode: { type: "string" },
                    description: { type: "string" }
                  },
                  required: ["product_name", "category", "cost_price", "selling_price"]
                }
              }
            },
            required: ["products"]
          }
        });
      } catch (llmError) {
        console.warn(`LLM invocation failed for batch ${batchNumber}: ${llmError.message}`);
        batchNumber++;
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }

      if (!llmResponse || !llmResponse.products || !Array.isArray(llmResponse.products) || llmResponse.products.length === 0) {
        console.warn(`Batch ${batchNumber} failed to generate valid products or returned empty array.`);
        batchNumber++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const cleanedProducts = llmResponse.products.map((product, index) => {
        const costPrice = Math.max(0.1, parseFloat(product.cost_price) || 10);
        const sellingPrice = Math.max(costPrice * 1.15, parseFloat(product.selling_price) || costPrice * 1.5);
        const inventory = Math.max(0, parseInt(product.inventory) || Math.floor(Math.random() * 100) + 10);
        const monthlySales = Math.max(0, parseInt(product.monthly_sales) || Math.floor(Math.random() * 50));

        const grossProfit = sellingPrice - costPrice;
        const profitPercentage = costPrice > 0 ? Math.round((grossProfit / costPrice) * 100) : 0;

        const finalSupplier = extractSupplierName(product.supplier) || generateSupplierName(product.category);

        return {
          catalog_id: catalog_id,
          customer_email: customer_email,
          product_name: product.product_name ? product.product_name.trim().substring(0, 255) : `מוצר ללא שם ${totalGenerated + index + 1}`,
          category: product.category ? product.category.trim().substring(0, 100) : 'כללי',
          cost_price: parseFloat(costPrice.toFixed(2)),
          selling_price: parseFloat(sellingPrice.toFixed(2)),
          supplier: finalSupplier.substring(0, 100),
          inventory: inventory,
          monthly_sales: monthlySales,
          barcode: product.barcode && product.barcode.match(/^\d{13}$/) ? product.barcode : generateBarcode(),
          description: product.description ? product.description.trim().substring(0, 500) : 'מוצר איכותי וחדשני.',
          data_source: 'auto_generated',
          data_quality: 'complete',
          is_active: true,
          gross_profit: parseFloat(grossProfit.toFixed(2)),
          profit_percentage: profitPercentage,
          last_updated: new Date().toISOString()
        };
      });

      allGeneratedProducts.push(...cleanedProducts);
      totalGenerated += cleanedProducts.length;
      batchNumber++;

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await updateProcessStatus(base44, process_id, 80, `שומר ${allGeneratedProducts.length} מוצרים למאגר...`);

    let savedCount = 0;
    for (let i = 0; i < allGeneratedProducts.length; i += DB_BATCH_SIZE) {
      const batch = allGeneratedProducts.slice(i, i + DB_BATCH_SIZE);
      try {
        if (typeof base44.asServiceRole.entities.ProductCatalog.bulkCreate === 'function') {
           await base44.asServiceRole.entities.ProductCatalog.bulkCreate(batch);
        } else {
            await Promise.all(batch.map(record => base44.asServiceRole.entities.ProductCatalog.create(record)));
        }
        savedCount += batch.length;
      } catch (dbError) {
        console.error(`Error saving batch ${Math.floor(i / DB_BATCH_SIZE) + 1}:`, dbError);
      }
      
      const saveProgress = 80 + Math.round((savedCount / allGeneratedProducts.length) * 15);
      await updateProcessStatus(base44, process_id, Math.min(saveProgress, 95), `נשמרו ${savedCount}/${allGeneratedProducts.length} מוצרים...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await base44.asServiceRole.entities.Catalog.update(catalog_id, {
      status: 'ready',
      product_count: savedCount,
      last_generated_at: new Date().toISOString()
    });

    await updateProcessStatus(base44, process_id, 100, `הושלם! נוצרו ${savedCount} מוצרים בהצלחה`, {
      products_created: savedCount,
      target_products: TARGET_PRODUCTS,
      success_rate: savedCount > 0 ? Math.round((savedCount / TARGET_PRODUCTS) * 100) : 0
    });

    console.log(`Catalog generation completed successfully for ${customer_email}. Created ${savedCount} products.`);

    return new Response(JSON.stringify({
      success: true,
      products_created: savedCount,
      message: `נוצרו ${savedCount} מוצרים בהצלחה`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generateCatalogWorker:', error);
    
    if (process_id) {
      try {
        await base44.asServiceRole.entities.ProcessStatus.update(process_id, {
          status: 'failed',
          error_message: error.message || 'שגיאה לא ידועה בתהליך יצירת הקטלוג',
          completed_at: new Date().toISOString()
        });
      } catch (updateError) {
        console.error('Failed to update ProcessStatus on error:', updateError);
      }
    }

    if (catalog_id) {
        try {
            await base44.asServiceRole.entities.Catalog.update(catalog_id, {
                status: 'failed'
            });
        } catch (updateCatalogError) {
            console.error('Failed to update Catalog status on error:', updateCatalogError);
        }
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'שגיאה בתהליך יצירת הקטלוג'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
