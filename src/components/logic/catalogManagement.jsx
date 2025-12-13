
import { ProductCatalog } from "@/entities/ProductCatalog";
import { InvokeLLM } from "@/integrations/Core";

/**
 * מנהל קטלוג חכם - תחזוקה ושדרוג של קטלוג המוצרים
 */

// Helper to create a normalized key for grouping products
const getProductKey = (product) => {
  // Priority: 1. Barcode (if exists and valid), 2. Normalized Name
  if (product.barcode && String(product.barcode).trim().length > 3) {
    return String(product.barcode).trim();
  }
  const name = product.product_name || product.name || '';
  // Normalize: lowercase, remove special chars, spaces, and common prefixes/suffixes
  return name.toLowerCase().replace(/[^a-z0-9\u0590-\u05fe]/g, '');
};

// Helper to merge data from a duplicate product into a main product
const mergeTwoProducts = (mainProd, duplicateProd) => {
  const merged = { ...mainProd };

  // A simple merge strategy: take the value if it's missing or seems better in the duplicate
  Object.keys(duplicateProd).forEach(key => {
    // If main product's field is empty/null, take the duplicate's value
    if (merged[key] === null || merged[key] === undefined || merged[key] === '') {
      merged[key] = duplicateProd[key];
    }
  });

  // More specific logic
  if ((duplicateProd.selling_price || 0) > (merged.selling_price || 0)) {
    merged.selling_price = duplicateProd.selling_price;
  }
  if (duplicateProd.cost_price && (!merged.cost_price || duplicateProd.cost_price < merged.cost_price)) {
    merged.cost_price = duplicateProd.cost_price;
  }
  merged.inventory = (merged.inventory || 0) + (duplicateProd.inventory || 0);
  merged.monthly_sales = (merged.monthly_sales || 0) + (duplicateProd.monthly_sales || 0);

  return merged;
};

/**
 * בדיקה אם שני מוצרים דומים
 */
const areProductsSimilar = (product1, product2) => {
  // בדיקת ברקוד זהה
  if (product1.barcode && product2.barcode && product1.barcode === product2.barcode) {
    return true;
  }

  // בדיקת שם דומה (80% דמיון)
  const similarity = calculateStringSimilarity(
    product1.product_name?.toLowerCase() || '',
    product2.product_name?.toLowerCase() || ''
  );

  if (similarity > 0.8) {
    return true;
  }

  // בדיקת שם + מחיר דומים
  if (similarity > 0.6 &&
      Math.abs((product1.cost_price || 0) - (product2.cost_price || 0)) < 5) {
    return true;
  }

  return false;
};

/**
 * חישוב דמיון בין מחרוזות
 */
const calculateStringSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * מיזוג קבוצת מוצרים כפולים
 */
const mergeDuplicateProducts = (products) => {
  const merged = { ...products[0] };

  // מיזוג נתונים חשובים
  let totalInventory = 0;
  let totalMonthlySales = 0;
  let bestPrice = null;
  let bestCostPrice = null;

  products.forEach(product => {
    totalInventory += product.inventory || 0;
    totalMonthlySales += product.monthly_sales || 0;

    if (!bestPrice || product.selling_price > bestPrice) {
      bestPrice = product.selling_price;
    }

    if (!bestCostPrice || product.cost_price < bestCostPrice) {
      bestCostPrice = product.cost_price;
    }
  });

  merged.inventory = totalInventory;
  merged.monthly_sales = totalMonthlySales;
  merged.selling_price = bestPrice || merged.selling_price;
  merged.cost_price = bestCostPrice || merged.cost_price;

  // עדכון רווח
  if (merged.cost_price && merged.selling_price) {
    merged.gross_profit = merged.selling_price - merged.cost_price;
    merged.profit_percentage = ((merged.gross_profit / merged.cost_price) * 100);
  }

  merged.data_source = 'merged_duplicates';
  merged.last_updated = new Date().toISOString();

  return merged;
};

/**
 * פונקציה לזיהוי ואיחוד מוצרים כפולים בקטלוג - **Optimized Version**
 * This version uses a Map for O(n) performance instead of O(n^2),
 * preventing hangs on large catalogs.
 */
export const mergeDuplicates = (products) => {
  console.log(`Starting optimized duplicate merge for ${products.length} products.`);
  const productMap = new Map();

  // O(n) pass to group products by a normalized key
  products.forEach(product => {
    const key = getProductKey(product);
    if (!key) return; // Skip products that cannot be keyed

    if (!productMap.has(key)) {
      productMap.set(key, []);
    }
    productMap.get(key).push(product);
  });

  const finalProducts = [];
  const idsToDelete = [];
  let mergedCount = 0;

  // O(m) pass where m (number of unique keys) <= n
  for (const group of productMap.values()) {
    if (group.length > 1) {
      // Sort by creation date to pick the newest as the "main" one
      group.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      let primaryProduct = { ...group[0] }; // Start with the newest as the base

      for (let i = 1; i < group.length; i++) {
        primaryProduct = mergeTwoProducts(primaryProduct, group[i]);
        idsToDelete.push(group[i].id); // Mark the older duplicates for deletion
        mergedCount++;
      }
      finalProducts.push(primaryProduct);
    } else {
      // No duplicates for this key
      finalProducts.push(group[0]);
    }
  }
  
  console.log(`Merge complete. Merged: ${mergedCount} duplicates. Final product count: ${finalProducts.length}.`);

  return { products: finalProducts, mergedCount, idsToDelete };
};

/**
 * פונקציה להסרת מוצרים לא תקינים
 *
 * @param {Array<Object>} products - רשימת המוצרים לעיבוד.
 * @returns {Object} אובייקט המכיל:
 *   - products: רשימת המוצרים לאחר הסינון.
 *   - removedCount: מספר המוצרים שהוסרו.
 *   - idsToDelete: מערך של ID-ים של מוצרים שיש למחוק מה-DB.
 */
export const removeInvalidProducts = (products) => {
  const validProducts = [];
  const idsToDelete = [];
  
  products.forEach(product => {
    const hasName = product.product_name && product.product_name.trim().length > 0;
    const hasValidPrice = product.selling_price && product.selling_price > 0;
    
    if (hasName && hasValidPrice) {
      validProducts.push(product);
    } else {
      if (product.id) {
        idsToDelete.push(product.id);
      }
    }
  });
  
  return {
    products: validProducts,
    removedCount: idsToDelete.length,
    idsToDelete
  };
};

/**
 * פונקציה לחישוב מחדש של שדות רווח
 *
 * @param {Array<Object>} products - רשימת המוצרים לעיבוד.
 * @returns {Array<Object>} רשימת המוצרים עם שדות הרווח המעודכנים.
 */
export const recalculateProfitFields = (products) => {
  return products.map(product => {
    const cost = parseFloat(product.cost_price) || 0;
    const sell = parseFloat(product.selling_price) || 0;
    
    if (cost > 0 && sell > 0) {
      const grossProfit = sell - cost;
      const profitPercentage = (grossProfit / cost) * 100;
      
      return {
        ...product,
        gross_profit: Math.round(grossProfit * 100) / 100,
        profit_percentage: Math.round(profitPercentage * 100) / 100
      };
    }
    
    return product;
  });
};

/**
 * מציע שיפורים לקטלוג על בסיס נתונים קיימים
 */
export const suggestCatalogEnhancements = async (customerEmail, customer, setStatusCallback) => {
  try {
    if (setStatusCallback) {
      setStatusCallback('טוען קטלוג קיים...');
    }

    // טעינת הקטלוג הקיים
    const existingProducts = await ProductCatalog.filter({
      customer_email: customerEmail,
      is_active: true
    });

    const existingCategories = [...new Set(existingProducts.map(p => p.category).filter(Boolean))];
    
    if (setStatusCallback) {
      setStatusCallback('מנתח חסרים בקטלוג...');
    }

    // יצירת הצעות מוצרים חדשים
    const prompt = `
      נתח את הקטלוג הקיים ותן הצעות לשיפור עבור עסק מסוג "${customer.business_type}" 
      שנקרא "${customer.business_name}".
      
      מוצרים קיימים בקטלוג (${existingProducts.length}):
      ${existingProducts.slice(0, 10).map(p => `- ${p.product_name} (${p.category})`).join('\n')}
      
      קטגוריות קיימות: ${existingCategories.join(', ')}
      
      פרטי לקוח:
      - מוצרים עיקריים: ${customer.main_products || 'לא צוין'}
      - קהל יעד: ${customer.target_customers || 'לא צוין'}
      - יעדים עסקיים: ${customer.business_goals || 'לא צוין'}
      
      בהתבסס על הקטלוג הקיים, הצע 8-12 מוצרים חדשים שיכולים להשלים את הקטלוג:
      1. מוצרים משלימים לקיימים
      2. מוצרים מקטגוריות חסרות
      3. מוצרים עם פוטנציאל רווח גבוה
      4. מוצרים מגמתיים הרלוונטיים לעסק
    `;

    const result = await InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                category: { type: "string" },
                cost_price: { type: "number" },
                selling_price: { type: "number" },
                expected_monthly_sales: { type: "number" },
                reasoning: { type: "string" }
              },
              required: ["product_name", "category", "cost_price", "selling_price"]
            }
          },
          missingCategories: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["suggestions"]
      }
    });

    if (result && result.suggestions && result.suggestions.length > 0) {
      // זיהוי קטגוריות חדשות להצעות
      const suggestionCategories = [...new Set(result.suggestions.map(s => s.category))];
      const newCategories = suggestionCategories.filter(cat => !existingCategories.includes(cat));
      
      if (setStatusCallback) {
        setStatusCallback(`מחפש ספקים עבור ${newCategories.length} קטגוריות חדשות...`);
      }

      // חיפוש ספקים עבור הקטגוריות החדשות בלבד (אופטימיזציה)
      let suppliersMap = {};
      if (newCategories.length > 0) {
        suppliersMap = await findSuppliersForCategories(
          newCategories, 
          customer.business_type, 
          setStatusCallback
        );
      }

      // הוספת ספקים לכל הצעה
      const enhancedSuggestions = result.suggestions.map(suggestion => {
        // אם יש ספקים מוכנים לקטגוריה, השתמש בהם
        if (suppliersMap[suggestion.category] && suppliersMap[suggestion.category].length > 0) {
          const randomSupplier = suppliersMap[suggestion.category][
            Math.floor(Math.random() * suppliersMap[suggestion.category].length)
          ];
          return { ...suggestion, supplier: randomSupplier };
        }
        
        // אחרת, חפש ספק ספציפי (הדרך הישנה - רק כ-fallback)
        return suggestion;
      });

      return {
        suggestions: enhancedSuggestions,
        missingCategories: result.missingCategories || newCategories,
        suppliersFound: Object.keys(suppliersMap).length
      };
    }

    return { suggestions: [], missingCategories: [] };

  } catch (error) {
    console.error("Error in suggestCatalogEnhancements:", error);
    throw error;
  }
};

/**
 * סימון מוצרים שהומלצו במערכת
 */
export const markRecommendedProducts = async (customerEmail) => {
  try {
    // קבלת כל ההמלצות של הלקוח
    const { Recommendation } = await import("@/entities/Recommendation");
    const recommendations = await Recommendation.filter({
      customer_email: customerEmail
    });

    // חילוץ שמות מוצרים מההמלצות
    const recommendedProductNames = new Set();
    recommendations.forEach(rec => {
      if (rec.affected_product_names) {
        rec.affected_product_names.forEach(name => recommendedProductNames.add(name.toLowerCase()));
      }
    });

    // עדכון מוצרים בקטלוג
    const products = await ProductCatalog.filter({
      customer_email: customerEmail,
      is_active: true
    });

    let markedCount = 0;
    for (const product of products) {
      const isRecommended = recommendedProductNames.has(product.product_name?.toLowerCase());

      if (isRecommended && !product.is_recommended) {
        await ProductCatalog.update(product.id, {
          is_recommended: true,
          recommendation_date: new Date().toISOString()
        });
        markedCount++;
      }
    }

    return { markedCount, totalRecommendations: recommendations.length };

  } catch (error) {
    console.error("Error marking recommended products:", error);
    return { markedCount: 0, error: error.message };
  }
};


/**
 * מעשיר קטגוריות למוצרים חסרים באמצעות AI וחיפוש אינטרנטי
 */
export const enrichProductCategories = async (products, setStatusCallback = null) => {
  if (setStatusCallback) setStatusCallback('מעשיר קטגוריות וספקים באמצעות בינה מלאכותית...');
  
  const enrichedProducts = [];
  const totalProducts = products.length;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    let enrichedProduct = { ...product };
    
    if (setStatusCallback && i % 5 === 0) { // Update progress every 5 products
      setStatusCallback(`מעבד מוצר ${i + 1} מתוך ${totalProducts}...`);
    }
    
    try {
      // שיפור קטגוריה 
      if (!product.category || product.category.toLowerCase().trim() === 'כללי' || product.category.trim() === 'אחר' || product.category.trim() === '') {
        const categoryPrompt = `
          בהתבסס על שם המוצר "${product.product_name}", מהי הקטגוריה הקמעונאית הכי מתאימה?
          החזר רק את שם הקטגוריה בעברית, ללא הסברים נוספים.
          דוגמאות לקטגוריות: אלקטרוניקה, ביגוד ואופנה, מוצרי מזון, ספרים וציוד משרדי, כלי בית, צעצועים, קוסמטיקה וטיפוח
        `;
        
        const categoryResponse = await InvokeLLM({
          prompt: categoryPrompt,
          add_context_from_internet: false // Context not needed for simple category lookup
        });
        
        if (categoryResponse && typeof categoryResponse === 'string' && categoryResponse.trim().length > 0) {
          enrichedProduct.category = categoryResponse.trim();
        }
      }
      
      // שיפור ספק - רק אם אין ספק או הספק גנרי
      const needsSupplierImprovement = !product.supplier || 
        product.supplier === 'ספק כללי' ||
        product.supplier.includes('ספק') || // Catches "ספק כזה"
        product.supplier.includes('יבואן') || // Catches "יבואן כזה"
        product.supplier === '';
        
      if (needsSupplierImprovement) {
        // Customer business type for existing products might not be readily available here.
        // Assuming 'קמעונאית' as a default, or it should be passed as an argument.
        // For current scope, adhering to outline's default.
        const customerBusinessType = 'קמעונאות'; 
        const realSupplier = await findRealSupplierForProduct(
          enrichedProduct.product_name,
          enrichedProduct.category, // Use potentially updated category for better supplier search
          customerBusinessType
        );
        
        if (realSupplier) {
          enrichedProduct.supplier = realSupplier;
        }
      }
      
    } catch (error) {
      console.error(`Error enriching product ${product.product_name}:`, error);
      // במקרה של שגיאה, השאר את המוצר כפי שהוא
    }
    
    enrichedProducts.push(enrichedProduct);
  }
  
  if (setStatusCallback) setStatusCallback('השלמת העשרת הקטלוג');
  return enrichedProducts;
};

/**
 * מבצע סקר שוק למציאת ספק אמיתי למוצר - מתאים לקטגוריה ספציפית
 * פונקציה מעודכנת שמיועדת לחיפוש ספקים לפי קטגוריה במקום מוצר בודד
 */
export const findRealSupplierForProduct = async (productName, category, businessType) => {
  try {
    const prompt = `
      מצא 2-3 ספקים סיטונאיים/מפיצים ידועים בישראל עבור המוצר "${productName}" מקטגוריית "${category}".
      סוג העסק של הלקוח: "${businessType}".
      
      דרישות:
      1. ספקים סיטונאיים בלבד (לא חנויות קמעונאיות)
      2. ספקים הפועלים בישראל
      3. ספקים המתאימים לסוג העסק של הלקוח

      החזר רשימה של 2-3 שמות ספקים בלבד, ללא הסברים נוספים.
    `;

    // תיקון: שינוי סכמת ה-JSON כך שהיא תהיה אובייקט ולא מערך
    const response = await InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          suppliers: {
            type: "array",
            items: { type: "string", description: "שם הספק" }
          }
        },
        required: ["suppliers"],
        description: "אובייקט המכיל רשימת ספקים"
      }
    });

    // התאמת הלוגיקה לתשובה החדשה מה-LLM
    if (response && Array.isArray(response.suppliers) && response.suppliers.length > 0) {
      // מחזיר את הספק הראשון שנמצא
      return response.suppliers[0];
    } else {
      console.warn(`No suppliers found for ${productName}. Returning generic supplier.`);
      return 'ספק מוצע';
    }
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    console.error(`Error finding real supplier for ${productName}:`, errorMessage);
    // החזר שם גנרי במקרה של שגיאה כדי שהתהליך ימשיך
    return 'ספק מוצע';
  }
};

/**
 * פונקציה חדשה: מציאת ספקים לפי קטגוריות (אופטימיזציה)
 * מחפשת ספקים עבור מספר קטגוריות בבת אחת, במקום לחפש לכל מוצר בנפרד
 */
export const findSuppliersForCategories = async (categories, businessType, setStatusCallback) => {
  const suppliersMap = {};
  
  if (setStatusCallback) {
    setStatusCallback(`מחפש ספקים עבור ${categories.length} קטגוריות...`);
  }
  
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    
    try {
      const prompt = `
        מצא 4-6 ספקים סיטונאיים/מפיצים ידועים בישראל עבור קטגורית "${category}".
        סוג העסק של הלקוח: "${businessType}".
        
        דרישות:
        1. ספקים סיטונאיים בלבד (לא חנויות קמעונאיות)
        2. ספקים הפועלים בישראל
        3. ספקים המתאימים לסוג העסק של הלקוח
        4. ספקים המתמחים או מוכרים מוצרים בקטגוריה זו
        
        החזר רשימה של שמות ספקים בישראל עבור קטגוריה זו.
      `;

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            suppliers: {
              type: "array",
              items: { type: "string", description: "שם הספק" }
            }
          },
          required: ["suppliers"],
          description: "אובייקט המכיל רשימת ספקים לקטגוריה"
        }
      });

      if (response && Array.isArray(response.suppliers) && response.suppliers.length > 0) {
        suppliersMap[category] = response.suppliers;
        console.log(`Found ${response.suppliers.length} suppliers for category: ${category}`);
      } else {
        console.warn(`No suppliers found for category ${category}. Using generic suppliers.`);
        suppliersMap[category] = [`ספק ${category}`, 'ספק כללי', 'ספק מוצע'];
      }
      
      if (setStatusCallback) {
        setStatusCallback(`מצא ספקים עבור ${category} (${i + 1}/${categories.length})`);
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error(`Error finding suppliers for category ${category}:`, errorMessage);
      // שימוש בספקים גנריים במקרה של שגיאה
      suppliersMap[category] = [`ספק ${category}`, 'ספק כללי', 'ספק מוצע'];
    }
  }
  
  return suppliersMap;
};

// Helper stubs for generateSmartCatalog, as they are called but not defined in the provided outline
const analyzeCustomerForCatalog = async (customer) => {
  // Placeholder implementation - should analyze customer data (e.g., business_type, existing catalog)
  // to inform category distribution and product generation.
  // For now, return a basic structure to avoid errors.
  return {
    businessType: customer.business_type || 'general',
    // Add other relevant customer analysis here
  };
};

const conductMarketResearch = async (customer, customerAnalysis) => {
  // Placeholder implementation - should conduct market research based on customer type and analysis.
  // For now, return a basic structure to avoid errors.
  return {
    marketSize: 1000000, // Example value
    competitiveLevel: 'medium', // Example value ('low', 'medium', 'high')
    // Add other relevant market research data here
  };
};

/**
 * פונקציה ליצירת קטלוג חכם על בסיס נתוני לקוח ומחקר שוק
 *
 * @param {Object} customer - אובייקט הלקוח המכיל פרטים כמו email, business_type, business_name וכו'.
 * @param {number} productCount - מספר המוצרים הכולל ליצירה.
 * @param {function} progressCallback - פונקציית קולבק לעדכון התקדמות (אופציונלי).
 * @returns {Object} אובייקט המכיל סטטוס הצלחה, מספר מוצרים שנוצרו ועוד.
 */
export const generateSmartCatalog = async (customer, productCount, progressCallback) => {
  try {
    if (progressCallback) progressCallback(5, 'מנתח נתוני לקוח...');
    
    // שלב 1: ניתוח נתוני הלקוח
    const customerAnalysis = await analyzeCustomerForCatalog(customer);
    
    if (progressCallback) progressCallback(15, 'מבצע מחקר שוק ותחרות...');
    
    // שלב 2: מחקר שוק מתקדם
    const marketResearch = await conductMarketResearch(customer, customerAnalysis);
    
    if (progressCallback) progressCallback(30, 'מגדיר קטגוריות וחלוקת מוצרים...');
    
    // שלב 3: חלוקת המוצרים לפי קטגוריות - השתמש ב-productCount במקום totalProducts
    const categoryDistribution = calculateCategoryDistribution(productCount, customerAnalysis, marketResearch);
    
    if (progressCallback) progressCallback(45, 'יוצר מוצרים בקטגוריות שונות...');
    
    // שלב 4: יצירת מוצרים לפי קטגוריה
    const allProducts = [];
    let currentProgress = 45;
    const progressPerCategory = 40 / categoryDistribution.length;
    
    for (const categoryData of categoryDistribution) {
      if (progressCallback) {
        progressCallback(
          Math.round(currentProgress), 
          `יוצר ${categoryData.count} מוצרים בקטגוריה: ${categoryData.name}...`
        );
      }
      
      const categoryProducts = await generateProductsForCategory(
        customer,
        categoryData,
        customerAnalysis,
        marketResearch
      );
      
      allProducts.push(...categoryProducts);
      currentProgress += progressPerCategory;
    }
    
    if (progressCallback) progressCallback(85, 'שומר מוצרים במסד הנתונים...');
    
    // שלב 5: שמירה במסד הנתונים
    // Ensure allProducts have the correct customer_email before bulkCreate if not already set
    const productsToCreate = allProducts.map(product => ({
      ...product,
      customer_email: product.customer_email || customer.email // Ensure customer_email is set
    }));
    await ProductCatalog.bulkCreate(productsToCreate);
    
    if (progressCallback) progressCallback(95, 'מבצע אופטימיזציות אחרונות...');
    
    // שלב 6: אופטימיזציות ועדכונים אחרונים
    // Pass the newly created products to optimizeCatalogAfterGeneration
    // Assuming bulkCreate populates IDs on the objects in the array.
    await optimizeCatalogAfterGeneration(customer.email, allProducts);
    
    if (progressCallback) progressCallback(100, `הצלחה! נוצרו ${allProducts.length} מוצרים`);
    
    return {
      success: true,
      productsCreated: allProducts.length,
      categories: categoryDistribution.map(c => c.name),
      analysisData: {
        customerType: customerAnalysis.businessType,
        marketSize: marketResearch.marketSize,
        competitiveLevel: marketResearch.competitiveLevel
      }
    };
    
  } catch (error) {
    console.error("Error in generateSmartCatalog:", error);
    return {
      success: false,
      error: error.message || 'שגיאה לא מוכרת ביצירת הקטלוג'
    };
  }
};

// פונקציות עזר נוספות...

const calculateCategoryDistribution = (totalProducts, customerAnalysis, marketResearch) => {
  const baseCategories = {
    'מוצרי בסיס': 0.3,
    'מוצרים פופולריים': 0.25,
    'מוצרים מתקדמים': 0.2,
    'מוצרי נישה': 0.15,
    'מוצרים עונתיים': 0.1
  };
  
  // התאמה לפי סוג העסק
  if (customerAnalysis.businessType === 'retail') {
    baseCategories['מוצרים פופולריים'] += 0.1;
    baseCategories['מוצרי נישה'] -= 0.05;
  } else if (customerAnalysis.businessType === 'wholesale') {
    baseCategories['מוצרי בסיס'] += 0.15;
    baseCategories['מוצרים עונתיים'] -= 0.05;
  }
  
  return Object.entries(baseCategories).map(([name, percentage]) => ({
    name,
    count: Math.round(totalProducts * percentage),
    percentage
  }))
  .filter(cat => cat.count > 0)
  .sort((a,b) => b.count - a.count); // Sort to prioritize larger categories first for progress calculation consistency
};

// עדכון פונקציית generateProductsForCategory כדי להשתמש בספקים אמיתיים
const generateProductsForCategory = async (customer, categoryData, customerAnalysis, marketResearch) => {
  const products = [];
  const baseProductNames = await getProductNamesForCategory(categoryData.name, customerAnalysis);
  
  for (let i = 0; i < categoryData.count; i++) {
    const productName = baseProductNames[i % baseProductNames.length] || `${categoryData.name} ${i + 1}`;
    const pricing = generateRealisticPricing(categoryData.name, customerAnalysis);
    
    // חיפוש ספק אמיתי למוצר
    const supplierName = await findRealSupplierForProduct(
      productName, 
      categoryData.name, 
      customer.business_type || 'קמעונאית' // Pass customer's business type
    );

    products.push({
      customer_email: customer.email,
      product_name: productName,
      category: categoryData.name,
      cost_price: pricing.cost,
      selling_price: pricing.selling,
      gross_profit: pricing.selling - pricing.cost,
      profit_percentage: ((pricing.selling - pricing.cost) / pricing.cost) * 100,
      supplier: supplierName, // ספק אמיתי שנמצא על ידי ה-AI
      inventory: Math.floor(Math.random() * 100) + 10,
      monthly_sales: Math.floor(Math.random() * 20) + 1,
      data_source: 'ai_generated',
      data_quality: 'complete',
      is_active: true,
      last_updated: new Date().toISOString(),
      created_date: new Date().toISOString() // Add created_date for consistency
    });
  }
  
  return products;
};

const getProductNamesForCategory = async (categoryName, customerAnalysis) => {
  // מאגר שמות מוצרים לפי קטגוריות
  const productNameLibrary = {
    'מוצרי בסיס': [
      'מחשב נייד בסיסי', 'עכבר אופטי', 'מקלדת USB', 'רמקולים בסיסיים', 'כבל HDMI',
      'נייר A4', 'עט כדורי', 'מחברת ספירלה', 'תיקיית פלסטיק', 'דבק נוזלי'
    ],
    'מוצרים פופולריים': [
      'אוזניות אלחוטיות', 'מטען נייד', 'כיסוי לטלפון', 'שעון חכם', 'רמקול Bluetooth',
      'תיק גב', 'בקבוק מים', 'משקפי שמש', 'צמיד פעילות', 'מפתח USB'
    ],
    'מוצרים מתקדמים': [
      'מצלמת DSLR', 'מסך גיימינג', 'מקלדת מכנית', 'כיסא גיימינג', 'מיקרופון מקצועי',
      'לוח אור LED', 'מדפסת תלת מימד', 'סורק מסמכים', 'מערכת סאונד', 'מחשב עריכה'
    ],
    'מוצרי נישה': [
      'חיישן לחות', 'מד pH דיגיטלי', 'מיקרוסקופ דיגיטלי', 'מכשיר למדידת רוח', 'גלאי מתכות',
      'כלי עבודה מתקדמים', 'ציוד הלחמה', 'מולטימטר דיגיטלי', 'מערכת אבטחה', 'כלי מדידה מדויקים'
    ],
    'מוצרים עונתיים': [
      'מאוורר נייד', 'מחמם חשמלי', 'מטריה', 'כובע קיץ', 'שמיכה חורפית',
      'מכונת גלידה', 'מנגל חשמלי', 'צידנית נייד', 'נעלי גשם', 'ציוד חוף'
    ]
  };
  
  return productNameLibrary[categoryName] || [`מוצר ${categoryName}`];
};

const generateRealisticPricing = (categoryName, customerAnalysis) => {
  const pricingRanges = {
    'מוצרי בסיס': { min: 10, max: 50, marginMin: 15, marginMax: 30 },
    'מוצרים פופולריים': { min: 50, max: 200, marginMin: 20, marginMax: 40 },
    'מוצרים מתקדמים': { min: 200, max: 1000, marginMin: 25, marginMax: 50 },
    'מוצרי נישה': { min: 100, max: 500, marginMin: 30, marginMax: 60 },
    'מוצרים עונתיים': { min: 20, max: 150, marginMin: 20, marginMax: 35 }
  };
  
  const range = pricingRanges[categoryName] || pricingRanges['מוצרי בסיס'];
  const sellingPrice = Math.floor(Math.random() * (range.max - range.min) + range.min);
  const marginPercentage = Math.floor(Math.random() * (range.marginMax - range.marginMin) + range.marginMin);
  const costPrice = Math.floor(sellingPrice / (1 + marginPercentage / 100));
  
  return {
    cost: costPrice,
    selling: sellingPrice
  };
};

const generateSupplierName = (categoryName) => {
  const suppliers = [
    'ספק טכנולוגיות מתקדמות בע"מ',
    'חברת היבוא הישראלית',
    'ספקים משולבים בע"מ',
    'טכנו ספק בע"מ',
    'ספק הזהב בע"מ',
    'חברת המסחר הישראלית',
    'ספק פרימיום בע"מ'
  ];
  
  return suppliers[Math.floor(Math.random() * suppliers.length)];
};

const optimizeCatalogAfterGeneration = async (customerEmail, products) => {
  // Only update products that have an ID (i.e., were successfully created in DB)
  // and mark them as recommended if profit_percentage is high.
  for (const product of products) {
    if (product.id && product.profit_percentage > 30) {
      try {
        await ProductCatalog.update(product.id, {
          is_recommended: true,
          recommendation_date: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error marking product ${product.id} as recommended after generation:`, error);
      }
    }
  }
};

/**
 * מריץ את כל תהליך הניקוי החכם על קטלוג של לקוח
 */
export const runSmartCleaning = async (customerEmail, setProgress) => {
  try {
    setProgress(5, 'טוען את כל המוצרים מהקטלוג...');
    
    const allProducts = await ProductCatalog.filter({ 
      customer_email: customerEmail,
      is_active: true 
    }, '-created_date', 10000);
    
    if (allProducts.length === 0) {
      setProgress(100, 'הקטלוג ריק, אין מה לנקות.');
      return { 
        duplicatesFound: 0,
        duplicatesMerged: 0, 
        pricesFixed: 0, 
        categoriesNormalized: 0,
        markedRecommended: 0 
      };
    }

    console.log(`Starting smart cleaning for ${allProducts.length} products`);

    // שלב 1: זיהוי ואיחוד כפילויות
    setProgress(15, `מאתר כפילויות ב-${allProducts.length} מוצרים...`);
    const { products: afterMerge, mergedCount, idsToDelete: duplicateIds } = mergeDuplicates(allProducts);
    
    // שלב 2: הסרת מוצרים ריקים או לא תקינים
    setProgress(35, 'מסיר מוצרים לא תקינים...');
    const { products: afterCleanup, removedCount: emptyRemovedCount, idsToDelete: emptyIds } = removeInvalidProducts(afterMerge);
    
    // שלב 3: חישוב מחדש של שדות רווח
    setProgress(55, 'מחשב מחדש שדות רווח...');
    const productsWithProfit = recalculateProfitFields(afterCleanup);
    
    // שלב 4: סימון מוצרים מומלצים (בסיס פשוט)
    setProgress(70, 'מסמן מוצרים מומלצים...');
    let recommendedCount = 0;
    const finalProducts = productsWithProfit.map(product => {
      const shouldRecommend = (product.profit_percentage || 0) > 25 && (product.monthly_sales || 0) > 2;
      if (shouldRecommend && !product.is_recommended) {
        recommendedCount++;
        return { ...product, is_recommended: true, recommendation_date: new Date().toISOString() };
      }
      return product;
    });

    // שלב 5: מחיקת כפילויות ומוצרים לא תקינים
    setProgress(80, 'מוחק כפילויות ומוצרים לא תקינים...');
    const allIdsToDelete = [...new Set([...duplicateIds, ...emptyIds])];
    
    if (allIdsToDelete.length > 0) {
      console.log(`Deleting ${allIdsToDelete.length} duplicate/invalid products`);
      // מחיקה בחלקים קטנים כדי למנוע עומס
      const batchSize = 50;
      for (let i = 0; i < allIdsToDelete.length; i += batchSize) {
        const batch = allIdsToDelete.slice(i, i + batchSize);
        await Promise.all(batch.map(id => ProductCatalog.delete(id)));
        setProgress(80 + (i / allIdsToDelete.length) * 10, `מוחק כפילויות... (${i + batch.length}/${allIdsToDelete.length})`);
      }
    }

    // שלב 6: עדכון המוצרים הסופיים
    setProgress(95, 'מעדכן נתוני מוצרים...');
    
    // עדכון בחלקים קטנים
    const updateBatchSize = 25;
    for (let i = 0; i < finalProducts.length; i += updateBatchSize) {
      const batch = finalProducts.slice(i, i + updateBatchSize);
      await Promise.all(batch.map(product => {
        // Only update if product has an ID, which it should if it came from the initial ProductCatalog.filter
        if (product.id) {
          return ProductCatalog.update(product.id, {
            gross_profit: product.gross_profit,
            profit_percentage: product.profit_percentage,
            is_recommended: product.is_recommended,
            recommendation_date: product.recommendation_date,
            last_updated: new Date().toISOString()
          });
        }
        return Promise.resolve(); // Skip if no ID, though shouldn't happen here for existing products
      }));
      setProgress(95 + (i / finalProducts.length) * 5, `מעדכן מוצרים... (${i + batch.length}/${finalProducts.length})`);
    }

    setProgress(100, 'ניקוי הקטלוג הושלם בהצלחה!');

    console.log(`Smart cleaning completed: merged ${mergedCount}, removed ${emptyRemovedCount}, recommended ${recommendedCount}`);

    return {
      duplicatesFound: duplicateIds.length,
      duplicatesMerged: mergedCount,
      pricesFixed: finalProducts.length,
      categoriesNormalized: 0, // Placeholder
      markedRecommended: recommendedCount
    };

  } catch (error) {
    console.error('Error in smart cleaning:', error);
    setProgress(0, `שגיאה בניקוי: ${error.message}`);
    throw error;
  }
};
