// מנוע ניתוח נתונים לקטלוג ודוחות Z
import { base44 } from '@/api/base44Client';

// קבועים להגדרת רווח תקין
export const PROFIT_MARGINS = {
  EXCELLENT: 40,
  GOOD: 25,
  ACCEPTABLE: 15,
  LOW: 10,
  POOR: 0
};

// חישוב פופולאריות מוצרים מדוחות Z
export const calculateProductPopularity = (zReports, products, selectedInterval = 'monthly') => {
  const salesMap = {};
  
  if (!zReports || zReports.length === 0) {
    return { top10: [], bottom10: [], allProducts: [] };
  }

  // צבירת נתוני מכירות מכל הדוחות
  zReports.forEach(zReport => {
    const detailedProducts = zReport.detailed_products || [];
    
    detailedProducts.forEach(p => {
      const productName = p.product_name || p.mapped_service;
      if (!productName) return;

      if (!salesMap[productName]) {
        salesMap[productName] = {
          name: productName,
          totalQuantity: 0,
          totalRevenue: 0,
          months: new Set(),
          barcode: p.barcode || ''
        };
      }
      
      salesMap[productName].totalQuantity += p.quantity_sold || 0;
      salesMap[productName].totalRevenue += p.revenue_with_vat || 0;
      salesMap[productName].months.add(zReport.month_assigned);
    });
  });

  // המרה למערך וחישוב ממוצעים
  const allProducts = Object.values(salesMap).map(item => ({
    ...item,
    monthsCount: item.months.size,
    avgMonthlyQuantity: item.months.size > 0 ? item.totalQuantity / item.months.size : 0,
    avgMonthlyRevenue: item.months.size > 0 ? item.totalRevenue / item.months.size : 0
  }));

  // מיון לפי כמות מכירות
  const sorted = allProducts.sort((a, b) => b.totalQuantity - a.totalQuantity);

  return {
    top10: sorted.slice(0, 10),
    bottom10: sorted.slice(-10).reverse(),
    allProducts: sorted
  };
};

// ניתוח רווחיות מוצרים
export const categorizeByProfitability = (products, services = []) => {
  const categorized = {
    profitable: [],
    controversial: [],
    unprofitable: [],
    unknown: []
  };

  if (!products || products.length === 0) {
    return categorized;
  }

  products.forEach(product => {
    let profitMargin = product.profit_percentage;

    // אם אין profit_percentage, נסה לחשב מ-services
    if (profitMargin === null || profitMargin === undefined) {
      const service = services.find(s => s.service_name === product.product_name);
      profitMargin = service?.calculated?.gross_margin_percentage;
    }

    // אם עדיין אין, נסה לחשב ידנית
    if (profitMargin === null || profitMargin === undefined) {
      if (product.selling_price && product.cost_price !== null && product.cost_price !== undefined) {
        const profit = product.selling_price - product.cost_price;
        profitMargin = product.selling_price > 0 ? (profit / product.selling_price) * 100 : 0;
      }
    }

    const productWithMargin = { ...product, profitMargin };

    if (profitMargin === null || profitMargin === undefined || isNaN(profitMargin)) {
      categorized.unknown.push(productWithMargin);
    } else if (profitMargin >= PROFIT_MARGINS.GOOD) {
      categorized.profitable.push(productWithMargin);
    } else if (profitMargin >= PROFIT_MARGINS.ACCEPTABLE) {
      categorized.controversial.push(productWithMargin);
    } else {
      categorized.unprofitable.push(productWithMargin);
    }
  });

  return categorized;
};

// חילוץ מגמת מוצר ספציפי לאורך זמן
export const getProductTrend = async (productName, customerEmail, zReports, services = []) => {
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const monthlyData = [];

  for (let month = 1; month <= 12; month++) {
    const zReport = zReports.find(r => r.month_assigned === month);
    const productData = zReport?.detailed_products?.find(
      p => p.product_name === productName || p.mapped_service === productName
    );

    // חישוב רווחיות
    let profitMargin = 0;
    if (productData && services) {
      const service = services.find(s => s.service_name === productName);
      if (service) {
        const revenue = productData.revenue_with_vat / (service.has_vat ? 1.17 : 1);
        const costOfSale = (service.costs || []).reduce((sum, cost) => {
          if (cost.is_percentage) {
            return sum + (revenue * cost.percentage_of_price / 100);
          }
          const costAmount = cost.has_vat ? cost.amount / 1.17 : cost.amount;
          return sum + costAmount;
        }, 0);
        
        const totalCost = costOfSale * (productData.quantity_sold || 0);
        const profit = revenue - totalCost;
        profitMargin = revenue > 0 ? (profit / revenue * 100) : 0;
      }
    }

    monthlyData.push({
      month: monthNames[month - 1],
      monthNumber: month,
      quantity: productData?.quantity_sold || 0,
      revenue: productData?.revenue_with_vat || 0,
      profitMargin: profitMargin,
      hasData: !!productData
    });
  }

  return monthlyData;
};

// ניתוח מוצרים לחודש/תקופה ספציפית
export const getProductsForPeriod = (zReports, selectedMonths = [], services = []) => {
  const productsMap = {};

  zReports
    .filter(z => selectedMonths.length === 0 || selectedMonths.includes(z.month_assigned))
    .forEach(zReport => {
      const detailedProducts = zReport.detailed_products || [];
      
      detailedProducts.forEach(p => {
        const productName = p.product_name || p.mapped_service;
        if (!productName) return;

        if (!productsMap[productName]) {
          productsMap[productName] = {
            name: productName,
            totalQuantity: 0,
            totalRevenue: 0,
            totalProfit: 0,
            monthsCount: 0
          };
        }

        productsMap[productName].totalQuantity += p.quantity_sold || 0;
        productsMap[productName].totalRevenue += p.revenue_with_vat || 0;
        productsMap[productName].monthsCount++;

        // חישוב רווח
        const service = services.find(s => s.service_name === productName);
        if (service) {
          const revenue = p.revenue_with_vat / (service.has_vat ? 1.17 : 1);
          const costOfSale = (service.costs || []).reduce((sum, cost) => {
            if (cost.is_percentage) {
              return sum + (revenue * cost.percentage_of_price / 100);
            }
            const costAmount = cost.has_vat ? cost.amount / 1.17 : cost.amount;
            return sum + costAmount;
          }, 0);
          
          const totalCost = costOfSale * (p.quantity_sold || 0);
          productsMap[productName].totalProfit += (revenue - totalCost);
        }
      });
    });

  return Object.values(productsMap).map(p => ({
    ...p,
    avgRevenue: p.monthsCount > 0 ? p.totalRevenue / p.monthsCount : 0,
    profitMargin: p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue * 100) : 0
  }));
};

// זיהוי מוצרים להוספה (ב-Z Reports אך לא בקטלוג)
export const findMissingProducts = (zReports, catalogProducts) => {
  const catalogNames = new Set(catalogProducts.map(p => p.product_name?.toLowerCase().trim()));
  const missingProducts = new Set();

  zReports.forEach(zReport => {
    const detailedProducts = zReport.detailed_products || [];
    
    detailedProducts.forEach(p => {
      const productName = p.product_name?.trim();
      if (productName && !p.mapped_service && !catalogNames.has(productName.toLowerCase())) {
        missingProducts.add(productName);
      }
    });
  });

  return Array.from(missingProducts);
};

// זיהוי מוצרים להסרה (בקטלוג אך לא נמכרו ב-6 חודשים)
export const findObsoleteProducts = (catalogProducts, zReports, monthsThreshold = 6) => {
  const recentSales = new Set();
  
  // איסוף מוצרים שנמכרו בחודשים האחרונים
  zReports.forEach(zReport => {
    const detailedProducts = zReport.detailed_products || [];
    
    detailedProducts.forEach(p => {
      const productName = p.product_name || p.mapped_service;
      if (productName) {
        recentSales.add(productName.toLowerCase().trim());
      }
    });
  });

  // מוצרים בקטלוג שלא נמכרו
  return catalogProducts.filter(product => {
    const productName = product.product_name?.toLowerCase().trim();
    return productName && !recentSales.has(productName) && product.inventory > 0;
  });
};