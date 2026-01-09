import { Recommendation } from "@/entities/Recommendation";
import { Product } from "@/entities/Product";
import { Supplier } from "@/entities/Supplier";
import { Promotion } from "@/entities/Promotion";
import { Sale } from "@/entities/Sale";
import { ProductCatalog } from "@/entities/ProductCatalog"; // Added import for ProductCatalog

// מנוע המלצות עם חישובי רווח מדויקים
export const generateInventoryBasedRecommendations = async (customer, options = {}) => {
    if (!customer) {
        console.error("No customer provided");
        return { error: "לא סופק לקוח", success: false };
    }

    const { generateRecs = true, recommendationsCount = 12 } = options;
    console.log(`Starting accurate profit calculations for: ${customer.business_name || customer.full_name}`);

    try {
        // שלב 1: איסוף נתוני לקוח וקטלוג
        // Now using the new data gathering function that includes ProductCatalog data
        const comprehensiveData = await gatherCustomerDataWithCatalog(customer);
        
        if (generateRecs) {
            // יצירת המלצות עם חישובי רווח מדויקים
            const recommendations = await generateAccurateProfitRecommendations(comprehensiveData, recommendationsCount);
            const savedRecommendations = await saveRecommendationsToDatabase(recommendations, customer.email);
            
            return {
                success: true,
                recommendations: savedRecommendations,
                totalGenerated: savedRecommendations.length,
                comprehensiveData
            };
        }

        return { success: true, comprehensiveData };

    } catch (error) {
        console.error("Error in generateInventoryBasedRecommendations:", error);
        return {
            error: error.message || "שגיאה כללית ביצירת המלצות",
            success: false,
            totalGenerated: 0
        };
    }
};

// איסוף נתונים מקיפים כולל נתוני קטלוג מוצרים
const gatherCustomerDataWithCatalog = async (customer) => {
    try {
        const [products, suppliers, promotions, sales, catalogProducts] = await Promise.all([
            Product.filter({ created_by: customer.email }),
            Supplier.filter({ created_by: customer.email }),
            Promotion.filter({ created_by: customer.email }),
            Sale.filter({ created_by: customer.email }),
            ProductCatalog.filter({ created_by: customer.email, is_active: true }) // Fetching ProductCatalog data
        ]);

        // שילוב נתונים מהקטלוג החדש עם הנתונים הקיימים
        const enrichedProducts = [...products];
        
        // הוספת מוצרים מהקטלוג החדש שלא קיימים ברשימת המוצרים הרגילה של הלקוח
        for (const catalogProduct of catalogProducts) {
            const existingProduct = products.find(p => 
                p.name === catalogProduct.product_name || 
                p.product_code === catalogProduct.barcode
            );
            
            if (!existingProduct) {
                // הוספת מוצר מהקטלוג החדש בפורמט התואם למוצר קיים, כולל שדות הכרחיים לחישוב רווח
                enrichedProducts.push({
                    name: catalogProduct.product_name,
                    product_code: catalogProduct.barcode,
                    cost_price: catalogProduct.cost_price,
                    selling_price: catalogProduct.selling_price,
                    category: catalogProduct.category,
                    supplier: catalogProduct.supplier, // Assuming this field exists in ProductCatalog
                    margin_percentage: catalogProduct.profit_percentage,
                    inventory: catalogProduct.quantity || 0, // Map quantity from catalog to inventory
                    monthly_revenue: 0, // Not known from catalog, default to 0
                    monthly_profit: 0, // Not known from catalog, default to 0
                    created_by: customer.email, // Essential for filtering and ownership
                    data_source: 'catalog' // Identifier for the source of this product data
                });
            }
        }

        // חישוב נתוני רווח וקבלת שם הלקוח עבור ההמלצות
        const profitAnalysis = calculateAccurateProfitData(enrichedProducts);
        const customerName = getCustomerFirstName(customer);

        return {
            customer,
            products: enrichedProducts, // This is the enriched list, used for profit calculations
            suppliers,
            promotions,
            sales,
            catalogProducts, // Raw catalog data also included in the return
            profitAnalysis, // Crucial for generateAccurateProfitRecommendations
            customerName,   // Crucial for generateAccurateProfitRecommendations
            totalProducts: enrichedProducts.length,
            totalCatalogProducts: catalogProducts.length,
            totalSuppliers: suppliers.length,
            averageMargin: enrichedProducts.length > 0 ? 
                enrichedProducts.reduce((sum, p) => sum + (p.margin_percentage || 0), 0) / enrichedProducts.length : 0,
            catalogAverageMargin: catalogProducts.length > 0 ? 
                catalogProducts.reduce((sum, p) => sum + (p.profit_percentage || 0), 0) / catalogProducts.length : 0,
            totalMonthlyRevenue: enrichedProducts.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0)
        };
    } catch (error) {
        console.error("Error gathering customer data with catalog:", error);
        // Ensure a consistent return structure even on error
        return { 
            customer, 
            products: [], 
            suppliers: [], 
            promotions: [], 
            sales: [], 
            catalogProducts: [],
            profitAnalysis: { validProducts: [], incompleteDataProducts: [] },
            customerName: getCustomerFirstName(customer) 
        };
    }
};

// חישוב נתוני רווח מדויקים
const calculateAccurateProfitData = (products) => {
    const validProducts = [];
    const incompleteDataProducts = [];
    
    for (const product of products) {
        const hasCostPrice = product.cost_price && product.cost_price > 0;
        const hasSellingPrice = product.selling_price && product.selling_price > 0;
        const hasInventory = product.inventory && product.inventory > 0;
        
        if (hasCostPrice && hasSellingPrice && hasInventory) {
            // חישובי רווח מדויקים
            const profitPerUnit = product.selling_price - product.cost_price;
            const profitMarginPercent = ((profitPerUnit / product.selling_price) * 100).toFixed(1);
            const totalPotentialRevenue = product.selling_price * product.inventory;
            const totalPotentialProfit = profitPerUnit * product.inventory;
            
            // חישוב רווח עם הנחה (דוגמה ל-15%)
            const discountPercent = 15;
            const discountedPrice = product.selling_price * (1 - discountPercent / 100);
            const profitAfterDiscount = discountedPrice - product.cost_price;
            const revenueAfterDiscount = discountedPrice * product.inventory;
            const totalProfitAfterDiscount = profitAfterDiscount * product.inventory;
            
            validProducts.push({
                ...product,
                calculations: {
                    profitPerUnit,
                    profitMarginPercent: parseFloat(profitMarginPercent),
                    totalPotentialRevenue,
                    totalPotentialProfit,
                    discountedPrice: Math.round(discountedPrice),
                    profitAfterDiscount: Math.round(profitAfterDiscount),
                    revenueAfterDiscount: Math.round(revenueAfterDiscount),
                    totalProfitAfterDiscount: Math.round(totalProfitAfterDiscount),
                    hasValidData: true
                }
            });
        } else {
            // מוצרים עם נתונים חסרים
            const missingFields = [];
            if (!hasCostPrice) missingFields.push('מחיר קנייה');
            if (!hasSellingPrice) missingFields.push('מחיר מכירה');
            if (!hasInventory) missingFields.push('כמות במלאי');
            
            incompleteDataProducts.push({
                ...product,
                missingFields,
                hasValidData: false
            });
        }
    }
    
    return {
        validProducts,
        incompleteDataProducts,
        totalValidProducts: validProducts.length,
        totalIncompleteProducts: incompleteDataProducts.length
    };
};

// יצירת המלצות עם חישובי רווח מדויקים
const generateAccurateProfitRecommendations = async (data, count) => {
    const { customer, profitAnalysis, customerName, products } = data;
    const { validProducts, incompleteDataProducts } = profitAnalysis;
    
    const recommendations = [];
    
    // המלצות עם חישובי רווח מדויקים
    if (validProducts.length > 0) {
        const profitRecommendations = await generateValidProfitRecommendations(validProducts, customerName, customer);
        recommendations.push(...profitRecommendations);
    }
    
    // המלצות על מלאי (עודפים/חסרים)
    if (products && products.length > 0) {
        const inventoryAlertRecs = await generateInventoryAlertRecommendations(data, customerName);
        recommendations.push(...inventoryAlertRecs);
    }
    
    // המלצות כלליות למוצרים עם נתונים חסרים
    if (incompleteDataProducts.length > 0) {
        const generalRecommendations = await generateGeneralRecommendations(incompleteDataProducts, customerName, customer);
        recommendations.push(...generalRecommendations);
    }
    
    // אם אין מספיק המלצות, הוסף המלצות כלליות נוספות
    if (recommendations.length < count) {
        const additionalRecommendations = await generateAdditionalGeneralRecommendations(customer, customerName, count - recommendations.length);
        recommendations.push(...additionalRecommendations);
    }
    
    return recommendations.slice(0, count);
};

// יצירת המלצות עם חישובי רווח מדויקים
const generateValidProfitRecommendations = async (validProducts, customerName, customer) => {
    const recommendations = [];
    
    // המלצות מבצעים עם חישובי רווח מדויקים
    const discountRecommendations = validProducts.slice(0, 3).map(product => {
        const calc = product.calculations;
        
        return {
            title: `מבצע מחושב למוצר ${product.name}`,
            description: `היי ${customerName}, יש לך ${product.inventory} יחידות של ${product.name} שנרכשו ב-${product.cost_price} ₪ ונמכרות ב-${product.selling_price} ₪.

אם תציע אותן ב-15% הנחה (${calc.discountedPrice} ₪), תרוויח ${calc.profitAfterDiscount} ₪ ליחידה, ותוכל להכניס תזרים של ${calc.revenueAfterDiscount.toLocaleString()} ₪ עם רווח כולל של ${calc.totalProfitAfterDiscount.toLocaleString()} ₪.

המבצע יעזור לך לפנות מלאי ולייצר תזרים מיידי, תוך שמירה על רווחיות של ${((calc.profitAfterDiscount / calc.discountedPrice) * 100).toFixed(1)}%.

מומלץ להציג את המבצע כ"הזדמנות מוגבלת עד סוף השבוע" כדי ליצור דחיפות קנייה.

האם תרצה שאעזור לך להכין חבילות נוספות עם המוצר הזה?`,
            category: 'pricing',
            expected_profit: calc.totalProfitAfterDiscount,
            priority: calc.profitMarginPercent > 30 ? 'high' : 'medium',
            action_steps: [
                `עדכן מחיר ל-${calc.discountedPrice} ₪ במערכת הקופה`,
                'הכן שילוט "מבצע מוגבל" עם טיימר של 7 יום',
                'פרסם במדיה החברתית עם דגש על החיסכון',
                'עקב אחרי מכירות יומיות ושקול הארכה אם נדרש'
            ],
            related_data: {
                original_price: product.selling_price,
                discounted_price: calc.discountedPrice,
                profit_per_unit: calc.profitAfterDiscount,
                total_inventory: product.inventory,
                calculation_based_on_real_data: true
            }
        };
    });
    
    recommendations.push(...discountRecommendations);
    
    // המלצת באנדל עם חישוב מדויק
    if (validProducts.length >= 2) {
        const bundleProducts = validProducts.slice(0, 2);
        const bundleRevenue = bundleProducts.reduce((sum, p) => sum + p.calculations.totalPotentialRevenue, 0);
        const bundleProfit = bundleProducts.reduce((sum, p) => sum + p.calculations.totalPotentialProfit, 0);
        
        recommendations.push({
            title: `חבילת "קומבו חכם" - ${bundleProducts.map(p => p.name).join(' + ')}`,
            description: `היי ${customerName}, זיהיתי הזדמנות ליצור חבילה רווחית!

אם תשלב את ${bundleProducts[0].name} (${bundleProducts[0].selling_price} ₪) עם ${bundleProducts[1].name} (${bundleProducts[1].selling_price} ₪), תוכל להציע "חבילת קומבו" ב-${Math.round((bundleProducts[0].selling_price + bundleProducts[1].selling_price) * 0.9)} ₪.

החבילה תניב לך רווח של ${Math.round(bundleProfit * 0.9 / Math.min(bundleProducts[0].inventory, bundleProducts[1].inventory))} ₪ לחבילה, עם פוטנציאל תזרים של ${Math.round(bundleRevenue * 0.9).toLocaleString()} ₪.

הלקוח חוסך ${Math.round((bundleProducts[0].selling_price + bundleProducts[1].selling_price) * 0.1)} ₪ ומקבל פתרון מלא - בלי לחשוב.

שם מוצע לחבילה: "סט ${bundleProducts[0].category || 'מושלם'}" - נשמע מקצועי ומעורר רצון.

מוכן לתכנן עוד חבילות כאלה?`,
            category: 'marketing',
            expected_profit: Math.round(bundleProfit * 0.9),
            priority: 'high',
            action_steps: [
                'הכן שילוט מיוחד לחבילה עם שם ברור',
                'עדכן מחיר החבילה במערכת הקופה',
                'הדרך את הצוות למכור את החבילה כפתרון מלא',
                'צלם את החבילה ופרסם ברשתות החברתיות'
            ],
            related_data: {
                bundle_products: bundleProducts.map(p => p.name),
                individual_prices: bundleProducts.map(p => p.selling_price),
                bundle_price: Math.round((bundleProducts[0].selling_price + bundleProducts[1].selling_price) * 0.9),
                savings: Math.round((bundleProducts[0].selling_price + bundleProducts[1].selling_price) * 0.1),
                calculation_based_on_real_data: true
            }
        });
    }
    
    return recommendations;
};

// יצירת המלצות כלליות למוצרים עם נתונים חסרים
const generateGeneralRecommendations = async (incompleteProducts, customerName, customer) => {
    const recommendations = [];
    
    incompleteProducts.slice(0, 2).forEach(product => {
        recommendations.push({
            title: `בדיקת רווחיות עבור ${product.name}`,
            description: `היי ${customerName}, זיהיתי את המוצר "${product.name}" במלאי שלך.

כדי שאוכל לספק לך המלצות מדויקות על רווחיות ומבצעים, אני צריך שתשלים את הפרטים הבאים: ${product.missingFields.join(', ')}.

ברגע שהמידע יהיה שלם, אוכל לחשב בדיוק כמה תרוויח ממבצעים, באנדלים ובהתאמות מחיר.

מוצרים עם נתונים מלאים מניבים בממוצע 23% יותר רווח בזכות המלצות מותאמות.

מוכן להשלים את הנתונים ולראות את הפוטנציאל האמיתי?`,
            category: 'operations',
            expected_profit: 0,
            priority: 'medium',
            action_steps: [
                `השלם ${product.missingFields.join(', ')} עבור ${product.name}`,
                'עדכן את המידע במערכת ניהול המלאי',
                'הפעל מחדש את מנוע ההמלצות לקבלת תובנות מדויקות',
                'בדוק מוצרים נוספים שחסרים בהם נתונים'
            ],
            admin_notes: `⚠️ לא הוזנו נתונים מלאים - חישוב רווח לא בוצע. חסרים: ${product.missingFields.join(', ')}`,
            related_data: {
                missing_fields: product.missingFields,
                product_name: product.name,
                calculation_based_on_real_data: false,
                needs_data_completion: true
            }
        });
    });
    
    return recommendations;
};

// יצירת המלצות על מוצרים חסרים או עודפים
const generateInventoryAlertRecommendations = async (data, customerName) => {
    const { products, catalogProducts } = data;
    const recommendations = [];
    
    // 1. זיהוי מוצרים עם מלאי גבוה מדי (עודפים)
    const overStockedProducts = products.filter(p => {
        const inventory = p.inventory || 0;
        const monthlySales = p.monthly_sales || p.monthly_revenue / (p.selling_price || 1) || 0;
        // אם יש מלאי ליותר מ-6 חודשי מכירות
        return inventory > 0 && monthlySales > 0 && (inventory / monthlySales) > 6;
    });

    if (overStockedProducts.length > 0) {
        const topOverstocked = overStockedProducts.slice(0, 3);
        recommendations.push({
            title: `⚠️ ${topOverstocked.length} מוצרים עם עודף מלאי משמעותי`,
            description: `היי ${customerName}, זיהיתי מוצרים עם מלאי גבוה מדי ביחס למכירות:

${topOverstocked.map(p => `• ${p.name || p.product_name}: ${p.inventory} יח' במלאי (מספיק ל-${Math.round((p.inventory / (p.monthly_sales || 1)))} חודשים)`).join('\n')}

מומלץ לשקול:
1. מבצעים או הנחות לפינוי מלאי
2. שילוב בחבילות מוצרים
3. הפחתת הזמנות עתידיות

מלאי עודף תופס מקום, מקפיא הון חוזר ועלול להתיישן.`,
            category: 'inventory',
            expected_profit: 0,
            priority: 'high',
            action_steps: [
                'בדוק את המוצרים העודפים ברשימה',
                'שקול מבצע "2+1" או הנחה של 15-25%',
                'צור חבילות עם מוצרים משלימים',
                'עדכן הזמנות עתידיות בהתאם'
            ],
            related_data: {
                overstocked_products: topOverstocked.map(p => p.name || p.product_name),
                alert_type: 'overstock',
                calculation_based_on_real_data: true
            }
        });
    }

    // 2. זיהוי מוצרים עם מלאי נמוך מדי (חסרים)
    const lowStockProducts = products.filter(p => {
        const inventory = p.inventory || 0;
        const monthlySales = p.monthly_sales || 1;
        // אם יש מלאי לפחות מ-2 שבועות
        return monthlySales > 0 && inventory > 0 && inventory < (monthlySales / 2);
    });

    if (lowStockProducts.length > 0) {
        const topLowStock = lowStockProducts.slice(0, 5);
        recommendations.push({
            title: `🔴 ${topLowStock.length} מוצרים בסכנת חוסר במלאי`,
            description: `היי ${customerName}, המוצרים הבאים עומדים להיגמר:

${topLowStock.map(p => `• ${p.name || p.product_name}: רק ${p.inventory} יח' נותרו (מספיק ל-${Math.round((p.inventory / (p.monthly_sales || 1)) * 30)} ימים)`).join('\n')}

פעולות מומלצות:
1. הזמן מהספק בהקדם
2. שקול להעלות מחיר זמנית
3. הסר ממבצעים/קידומים

חוסר במלאי = לקוחות מאוכזבים = הפסד מכירות!`,
            category: 'inventory',
            expected_profit: 0,
            priority: 'high',
            action_steps: [
                'הזמן מיידית מהספק',
                'בדוק חלופות אצל ספקים אחרים',
                'עדכן את הלקוחות על זמינות מוגבלת',
                'הגדר התראת מלאי אוטומטית למניעה עתידית'
            ],
            related_data: {
                low_stock_products: topLowStock.map(p => p.name || p.product_name),
                alert_type: 'low_stock',
                calculation_based_on_real_data: true
            }
        });
    }

    // 3. זיהוי מוצרים שלא נמכרו כלל (מתים)
    const deadStockProducts = products.filter(p => {
        const inventory = p.inventory || 0;
        const monthlySales = p.monthly_sales || 0;
        return inventory > 5 && monthlySales === 0;
    });

    if (deadStockProducts.length > 0) {
        const topDeadStock = deadStockProducts.slice(0, 5);
        recommendations.push({
            title: `💀 ${topDeadStock.length} מוצרים "מתים" - אין מכירות`,
            description: `היי ${customerName}, המוצרים הבאים לא נמכרו בכלל:

${topDeadStock.map(p => `• ${p.name || p.product_name}: ${p.inventory} יח' במלאי`).join('\n')}

אפשרויות לשקול:
1. מבצע חיסול (50%+ הנחה)
2. מתנה בקנייה מעל סכום
3. החזרה לספק (אם אפשרי)
4. תרומה לעמותה (הטבת מס)

מוצר שלא נמכר = כסף שנעול במלאי.`,
            category: 'inventory',
            expected_profit: 0,
            priority: 'medium',
            action_steps: [
                'בדוק למה המוצרים לא נמכרים (מחיר? מיקום? ביקוש?)',
                'שקול מבצע חיסול משמעותי',
                'נסה לשלב כמתנה בחבילות',
                'אם אין תקווה - פנה מלאי ולמד לעתיד'
            ],
            related_data: {
                dead_stock_products: topDeadStock.map(p => p.name || p.product_name),
                alert_type: 'dead_stock',
                calculation_based_on_real_data: true
            }
        });
    }

    return recommendations;
};

// יצירת המלצות כלליות נוספות
const generateAdditionalGeneralRecommendations = async (customer, customerName, neededCount) => {
    const generalRecommendations = [
        {
            title: `שיפור מערכת תמחור`,
            description: `היי ${customerName}, כדי לקבל המלצות מדויקות יותר על רווחיות, מומלץ להשלים נתוני מוצרים במערכת.

מוצרים עם נתונים מלאים (מחיר קנייה, מחיר מכירה וכמות) מאפשרים חישובי רווח מדויקים ומבצעים חכמים.

בעסקים דומים שהשלימו את הנתונים, ראינו עלייה של 18% ברווחיות תוך 60 יום.

מוכן להשקיע חצי שעה בהשלמת הנתונים לתוצאות משמעותיות?`,
            category: 'operations',
            expected_profit: 0,
            priority: 'medium',
            action_steps: [
                'רשום את מחירי הקנייה של המוצרים העיקריים',
                'עדכן כמויות מלאי עדכניות',
                'בדוק מחירי מכירה מול השוק',
                'הכנס את הנתונים למערכת לקבלת המלצות מותאמות'
            ],
            admin_notes: "המלצה כללית - לא בוצע חישוב רווח מחוסר נתונים",
            related_data: {
                calculation_based_on_real_data: false,
                general_business_recommendation: true
            }
        },
        {
            title: `ניתוח תזרים והזדמנויות`,
            description: `היי ${customerName}, גם ללא נתונים מפורטים, אני יכול לראות שיש פוטנציאל לשיפור בעסק שלך.

מומלץ לבחון מוצרים שעומדים הרבה זמן במלאי ולשקול מבצעים או חבילות.

לקוחות שמיישמים בדיקות מלאי שבועיות מצליחים להגדיל את התזרים ב-12% בממוצע.

תתחיל עם בדיקה של 5 המוצרים הכי ישנים במלאי?`,
            category: 'inventory',
            expected_profit: 0,
            priority: 'low',
            action_steps: [
                'זהה 5 מוצרים שעומדים הכי הרבה זמן במלאי',
                'בדוק אם יש ביקוש נמוך או מחיר גבוה מדי',
                'שקול מבצע או שילוב בחבילות',
                'עקוב אחרי תוצאות ופעל לפי הלמידה'
            ],
            admin_notes: "המלצה כללית - ללא חישובי רווח ספציפיים",
            related_data: {
                calculation_based_on_real_data: false,
                general_inventory_recommendation: true
            }
        }
    ];
    
    return generalRecommendations.slice(0, neededCount);
};

// פונקציות עזר
const getCustomerFirstName = (customer) => {
    if (customer?.full_name) {
        const firstName = customer.full_name.split(' ')[0];
        return firstName;
    }
    if (customer?.business_name) {
        const businessWords = customer.business_name.split(' ');
        const commonBusinessWords = ['חברת', 'עסק', 'חנות', 'מסעדת', 'קפה', 'בר', 'סטודיו', 'מרכז'];
        const personalName = businessWords.find(word => !commonBusinessWords.includes(word));
        return personalName || businessWords[0];
    }
    return 'שותף עסקי';
};

// שמירת המלצות במסד הנתונים
const saveRecommendationsToDatabase = async (recommendations, customerEmail) => {
    const savedRecommendations = [];
    
    for (const rec of recommendations) {
        try {
            const recommendationData = {
                ...rec,
                customer_email: customerEmail,
                status: 'pending',
                delivery_status: 'not_sent'
            };
            
            const savedRec = await Recommendation.create(recommendationData);
            savedRecommendations.push(savedRec);
            
        } catch (error) {
            console.error("Error saving recommendation:", error);
        }
    }
    
    console.log(`Successfully saved ${savedRecommendations.length} recommendations with accurate profit calculations`);
    return savedRecommendations;
};