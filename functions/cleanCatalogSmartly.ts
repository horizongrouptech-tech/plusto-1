
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// פונקציית עזר לחיפוש במוצרים ב-Open Food Facts
const searchOpenFoodFacts = async (productName) => {
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
            // בדיקת התאמה בסיסית - האם שם המוצר מכיל מילים מהחיפוש או להפך
            const searchWords = productName.toLowerCase().split(' ').filter(w => w.length > 2);
            const foundWords = bestMatch.product_name.toLowerCase().split(' ').filter(w => w.length > 2);
            
            const hasMatch = searchWords.some(word => 
                foundWords.some(foundWord => 
                    foundWord.includes(word) || word.includes(foundWord)
                )
            );
            
            if (hasMatch) {
                return {
                    barcode: bestMatch.code,
                    product_name: bestMatch.product_name,
                    brand: bestMatch.brands || ''
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error searching Open Food Facts:', error);
        return null;
    }
};

// פונקציית עזר להשלמת ספק באמצעות AI
const suggestSupplier = async (base44, productName, category, businessType = '') => {
    try {
        if (!productName || productName.trim() === '') return null;
        
        const prompt = `אתה מומחה בתחום אספקת מוצרים בישראל. 
        עבור המוצר "${productName}" בקטגוריה "${category || 'כללי'}"${businessType ? ` לעסק מסוג ${businessType}` : ''}:
        
        הצע ספק הגיוני וריאלי שיכול לספק את המוצר הזה בישראל.
        התמקד בספקים עיקריים, מפיצים או יצרנים ידועים.
        
        החזר רק את שם הספק, ללא הסברים נוספים.`;
        
        const response = await base44.asServiceRole.integrations.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true
        });
        
        if (response && typeof response === 'string' && response.trim().length > 0) {
            // נקה את התגובה משורות ריקות ותווים מיותרים
            const supplierName = response.trim().replace(/["\n\r]/g, '').substring(0, 100);
            return supplierName;
        }
        
        return null;
    } catch (error) {
        console.error('Error suggesting supplier:', error);
        return null;
    }
};

// עדכון רשומת תהליך עם פרטי התקדמות
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

  try {
    const { customer_email, catalog_id, action = 'start', process_id } = await req.json();

    if (!customer_email || !catalog_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'customer_email ו-catalog_id נדרשים'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'cancel' && process_id) {
      await base44.asServiceRole.entities.ProcessStatus.update(process_id, {
        status: 'cancelled',
        completed_at: new Date().toISOString()
      });
      
      return new Response(JSON.stringify({
        success: true,
        message: 'תהליך הניקוי בוטל'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Start cleaning process
    const processRecord = await base44.asServiceRole.entities.ProcessStatus.create({
      customer_email: customer_email,
      process_type: 'catalog_cleaning',
      catalog_id: catalog_id,
      status: 'running',
      progress: 0,
      current_step: 'מתחיל ניקוי חכם של הקטלוג...',
      started_at: new Date().toISOString()
    });

    // Run cleaning in background
    setTimeout(async () => {
      try {
        await performSmartCleaning(base44, customer_email, catalog_id, processRecord.id);
      } catch (error) {
        console.error('Smart cleaning error:', error);
        await base44.asServiceRole.entities.ProcessStatus.update(processRecord.id, {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        });
      }
    }, 100);

    return new Response(JSON.stringify({
      success: true,
      process_id: processRecord.id,
      message: 'תהליך הניקוי החכם החל ברקע'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in cleanCatalogSmartly:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'שגיאה בתהליך הניקוי החכם'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function performSmartCleaning(base44, customer_email, catalog_id, processId) {
  // Get all products in this catalog
  await updateProcessStatus(base44, processId, 10, 'טוען מוצרים מהקטלוג...');

  const products = await base44.asServiceRole.entities.ProductCatalog.filter({
    customer_email: customer_email,
    catalog_id: catalog_id,
    is_active: true
  });

  if (products.length === 0) {
    await updateProcessStatus(base44, processId, 100, 'הקטלוג ריק - אין מה לנקות', {
        duplicatesFound: 0,
        duplicatesMerged: 0,
        pricesFixed: 0,
        markedRecommended: 0
    });
    return;
  }

  let duplicatesMerged = 0;
  let pricesFixed = 0;
  let markedRecommended = 0;
  
  // Find and merge duplicates
  await updateProcessStatus(base44, processId, 30, 'מחפש כפילויות...');

  const duplicateGroups = findDuplicates(products);
  let duplicatesFound = 0;

  for (const group of duplicateGroups) {
    if (group.length > 1) {
      duplicatesFound += (group.length - 1);
      // Select the 'best' product (e.g., most complete data, or simply the first one in the sorted group)
      // For simplicity, let's pick the product that is "complete" if any, otherwise the first.
      const masterProduct = group.sort((a, b) => {
        if (a.data_quality === 'complete' && b.data_quality !== 'complete') return -1;
        if (b.data_quality === 'complete' && a.data_quality !== 'complete') return 1;
        return 0;
      })[0];
      
      // Keep the best product, deactivate others
      for (const duplicate of group) {
        if (duplicate.id !== masterProduct.id) {
          await base44.asServiceRole.entities.ProductCatalog.update(duplicate.id, {
            is_active: false
          });
          duplicatesMerged++;
        }
      }
    }
  }

  // Fix pricing issues
  await updateProcessStatus(base44, processId, 60, 'מתקן מחירים...');

  // Re-fetch products to ensure we are working with the most up-to-date active list
  // especially after deactivating some in the previous step
  const activeProductsAfterDuplicateMerge = await base44.asServiceRole.entities.ProductCatalog.filter({
    customer_email: customer_email,
    catalog_id: catalog_id,
    is_active: true
  });

  for (const product of activeProductsAfterDuplicateMerge) {
    let shouldUpdate = false;
    let currentCostPrice = product.cost_price || 0;
    let currentSellingPrice = product.selling_price || 0;
    let updatedCostPrice = currentCostPrice;
    let updatedSellingPrice = currentSellingPrice;

    if (currentCostPrice <= 0) {
        updatedCostPrice = 10; // Default to 10 if cost price is 0 or negative
        shouldUpdate = true;
    }

    if (updatedSellingPrice <= updatedCostPrice) {
        updatedSellingPrice = updatedCostPrice * 1.3; // Ensure at least 30% markup
        shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      const newGrossProfit = updatedSellingPrice - updatedCostPrice;
      const newProfitPercentage = (newGrossProfit / updatedCostPrice) * 100;

      await base44.asServiceRole.entities.ProductCatalog.update(product.id, {
        cost_price: updatedCostPrice,
        selling_price: updatedSellingPrice,
        gross_profit: newGrossProfit,
        profit_percentage: Math.round(newProfitPercentage)
      });
      pricesFixed++;
    }
  }

  // Mark high-profit products as recommended
  await updateProcessStatus(base44, processId, 90, 'מסמן מוצרים מומלצים...');

  // Re-fetch products again to get latest data including fixed prices and profit percentages
  const productsForRecommendation = await base44.asServiceRole.entities.ProductCatalog.filter({
    customer_email: customer_email,
    catalog_id: catalog_id,
    is_active: true
  });

  const highProfitThreshold = 30; // 30% profit margin

  for (const product of productsForRecommendation) {
    if ((product.profit_percentage || 0) >= highProfitThreshold && !(product.is_recommended)) {
      await base44.asServiceRole.entities.ProductCatalog.update(product.id, {
        is_recommended: true,
        recommendation_date: new Date().toISOString()
      });
      markedRecommended++;
    }
  }

  // Complete the process
  await updateProcessStatus(base44, processId, 100, 'ניקוי הושלם בהצלחה!', {
    duplicatesFound,
    duplicatesMerged,
    pricesFixed,
    markedRecommended
  });
}

function findDuplicates(products) {
  const groups = {};
  
  products.forEach(product => {
    // Normalize product name for grouping
    const key = product.product_name.toLowerCase().trim();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(product);
  });
  
  // Return only groups that contain more than one product
  return Object.values(groups).filter(group => group.length > 1);
}
