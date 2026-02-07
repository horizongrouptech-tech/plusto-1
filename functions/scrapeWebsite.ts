import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
  appId: Deno.env.get('BASE44_APP_ID'),
});

// Advanced web scraping with deep crawling capabilities
Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    base44.auth.setToken(token);
    
    const user = await base44.auth.me();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { url, deep_crawl = true, max_pages = 50 } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Starting comprehensive scrape of ${url} with deep crawling: ${deep_crawl}`);

    const scrapingResults = await performDeepWebScrape(url, { deep_crawl, max_pages });

    // ==========================================================
    // הוסף את קטע הקוד הזה לפני החזרת התוצאה מהפונקציה
    // ==========================================================
    let qualityScore = 0;
    const missingDataPoints = [];
    const consistencyIssues = [];

    // 1. בדיקת שלמות נתוני מוצרים (סה"כ 60 נקודות)
    if (scrapingResults.products && scrapingResults.products.length > 0) {
        let completeProducts = 0;
        scrapingResults.products.forEach(p => {
            let isComplete = true;
            if (!p.name) { isComplete = false; missingDataPoints.push('שם מוצר חסר'); }
            if (!p.price || p.price.current_price === null) { isComplete = false; missingDataPoints.push('מחיר חסר'); }
            if (!p.description || p.description.length < 20) { isComplete = false; missingDataPoints.push('תיאור קצר מדי'); }
            if (!p.images || p.images.length === 0) { isComplete = false; missingDataPoints.push('תמונות חסרות'); }
            if (!p.category) { isComplete = false; missingDataPoints.push('קטגוריה חסרה'); }
            
            if (isComplete) {
                completeProducts++;
            }
        });
        // ציון על בסיס אחוז המוצרים השלמים
        const completenessRatio = completeProducts / scrapingResults.products.length;
        qualityScore += Math.round(completenessRatio * 60);
    } else {
        missingDataPoints.push('לא נמצאו מוצרים כלל');
    }

    // 2. בדיקת איכות ניתוח עסקי (סה"כ 40 נקודות)
    const businessAnalysis = scrapingResults.business_analysis || {};
    if (businessAnalysis.overview && businessAnalysis.overview.length > 50) qualityScore += 10;
    else missingDataPoints.push('סקירה כללית חסרה או קצרה מדי');

    if (businessAnalysis.pricing_strategy_analysis && Object.keys(businessAnalysis.pricing_strategy_analysis).length > 1) qualityScore += 10;
    else missingDataPoints.push('ניתוח אסטרטגיית תמחור חסר');

    if (businessAnalysis.competitive_positioning && Object.keys(businessAnalysis.competitive_positioning).length > 1) qualityScore += 10;
    else missingDataPoints.push('ניתוח מיצוב תחרותי חסר');

    if (businessAnalysis.business_opportunities && Object.keys(businessAnalysis.business_opportunities).length > 1) qualityScore += 10;
    else missingDataPoints.push('זיהוי הזדמנויות עסקיות חסר');

    // הגבלת הציון המקסימלי ל-100
    qualityScore = Math.min(qualityScore, 100);

    // עדכון אובייקט התוצאה
    scrapingResults.technical_details = scrapingResults.technical_details || {};
    scrapingResults.technical_details.data_quality = {
        overall_score: qualityScore,
        missing_data_points: [...new Set(missingDataPoints)], // הסר כפילויות
        consistency_issues: [...new Set(consistencyIssues)]
    };
    // ==========================================================
    // סוף קטע הקוד להוספה
    // ==========================================================

    // Now, return the final, enriched scrapingResults
    return Response.json(scrapingResults, { status: 200 });

  } catch (error) {
    console.error('Error in scrapeWebsite:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      html: null,
      pages_scraped: 0
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function performDeepWebScrape(baseUrl, options = {}) {
  const { deep_crawl = true, max_pages = 50 } = options;
  
  const visitedUrls = new Set();
  const productLinks = new Set();
  const categoryLinks = new Set();
  const paginationLinks = new Set();
  let allHtml = '';
  let pagesScraped = 0;
  
  // Start with the main page
  const mainPageResult = await scrapeSinglePage(baseUrl);
  if (mainPageResult.success) {
    allHtml += mainPageResult.html;
    pagesScraped++;
    visitedUrls.add(baseUrl);
    
    // Extract links from main page
    const extractedLinks = extractLinksFromHtml(mainPageResult.html, baseUrl);
    extractedLinks.productLinks.forEach(link => productLinks.add(link));
    extractedLinks.categoryLinks.forEach(link => categoryLinks.add(link));
    extractedLinks.paginationLinks.forEach(link => paginationLinks.add(link));
  }

  if (!deep_crawl) {
    return {
      success: true,
      html: allHtml,
      pages_scraped: pagesScraped,
      total_links_found: productLinks.size + categoryLinks.size + paginationLinks.size
    };
  }

  // Deep crawl: Visit category pages and pagination
  const urlsToVisit = [
    ...Array.from(categoryLinks).slice(0, 10), // Limit category pages
    ...Array.from(paginationLinks).slice(0, 15) // Limit pagination pages
  ];

  for (const url of urlsToVisit) {
    if (pagesScraped >= max_pages || visitedUrls.has(url)) continue;
    
    console.log(`Scraping additional page: ${url}`);
    const pageResult = await scrapeSinglePage(url);
    
    if (pageResult.success) {
      allHtml += '\n--- PAGE SEPARATOR ---\n' + pageResult.html;
      pagesScraped++;
      visitedUrls.add(url);
      
      // Extract more links from this page
      const moreLinks = extractLinksFromHtml(pageResult.html, url);
      moreLinks.productLinks.forEach(link => productLinks.add(link));
      moreLinks.paginationLinks.forEach(link => paginationLinks.add(link));
    }
    
    // Small delay to be respectful to the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Finally, scrape some individual product pages for detailed specs
  const productUrlsToScrape = Array.from(productLinks).slice(0, 20); // Limit to 20 product pages
  
  for (const productUrl of productUrlsToScrape) {
    if (pagesScraped >= max_pages || visitedUrls.has(productUrl)) continue;
    
    console.log(`Scraping product page: ${productUrl}`);
    const productResult = await scrapeSinglePage(productUrl);
    
    if (productResult.success) {
      allHtml += '\n--- PRODUCT PAGE ---\n' + productResult.html;
      pagesScraped++;
      visitedUrls.add(productUrl);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return {
    success: true,
    html: allHtml,
    pages_scraped: pagesScraped,
    product_pages_scraped: Math.min(productUrlsToScrape.length, pagesScraped),
    total_links_found: productLinks.size + categoryLinks.size + paginationLinks.size
  };
}

async function scrapeSinglePage(url) {
  try {
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    return {
      success: true,
      html: html,
      status: response.status,
      url: url
    };

  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return {
      success: false,
      error: error.message,
      html: null,
      url: url
    };
  }
}

function extractLinksFromHtml(html, baseUrl) {
  const productLinks = new Set();
  const categoryLinks = new Set();
  const paginationLinks = new Set();
  
  try {
    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.origin;
    
    // Extract product links (common patterns)
    const productPatterns = [
      /href="([^"]*\/products\/[^"]*)"/, // Shopify pattern
      /href="([^"]*\/product\/[^"]*)"/, // WooCommerce pattern
      /href="([^"]*\/p\/[^"]*)"/, // Generic product pattern
      /href="([^"]*\/item\/[^"]*)"/, // Item pattern
    ];
    
    productPatterns.forEach(pattern => {
      const matches = html.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const link = resolveUrl(match[1], baseDomain);
        if (link && isValidProductUrl(link)) {
          productLinks.add(link);
        }
      }
    });
    
    // Extract category/collection links
    const categoryPatterns = [
      /href="([^"]*\/collections\/[^"]*)"/, // Shopify collections
      /href="([^"]*\/category\/[^"]*)"/, // Category pages
      /href="([^"]*\/shop\/[^"]*)"/, // Shop pages
    ];
    
    categoryPatterns.forEach(pattern => {
      const matches = html.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const link = resolveUrl(match[1], baseDomain);
        if (link && isValidCategoryUrl(link)) {
          categoryLinks.add(link);
        }
      }
    });
    
    // Extract pagination links
    const paginationPatterns = [
      /href="([^"]*[?&]page=[\d]+[^"]*)"/, // Page parameter
      /href="([^"]*\/page\/[\d]+[^"]*)"/, // Page in path
      /href="([^"]*[?&]p=[\d]+[^"]*)"/, // P parameter
    ];
    
    paginationPatterns.forEach(pattern => {
      const matches = html.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const link = resolveUrl(match[1], baseDomain);
        if (link) {
          paginationLinks.add(link);
        }
      }
    });
    
  } catch (error) {
    console.error('Error extracting links:', error);
  }
  
  return {
    productLinks: Array.from(productLinks),
    categoryLinks: Array.from(categoryLinks),
    paginationLinks: Array.from(paginationLinks)
  };
}

function resolveUrl(url, baseDomain) {
  try {
    if (url.startsWith('http')) {
      return url;
    } else if (url.startsWith('/')) {
      return baseDomain + url;
    } else {
      return baseDomain + '/' + url;
    }
  } catch {
    return null;
  }
}

function isValidProductUrl(url) {
  // Filter out non-product URLs
  const excludePatterns = [
    /\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf)$/i,
    /\/cart/i,
    /\/checkout/i,
    /\/account/i,
    /\/login/i,
    /\/register/i,
    /\/search/i,
    /\/blog/i,
    /\/contact/i,
    /\/about/i,
    /\/privacy/i,
    /\/terms/i,
  ];
  
  return !excludePatterns.some(pattern => pattern.test(url));
}

function isValidCategoryUrl(url) {
  const excludePatterns = [
    /\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf)$/i,
    /\/cart/i,
    /\/checkout/i,
    /\/account/i,
    /\/login/i,
    /\/register/i,
  ];
  
  return !excludePatterns.some(pattern => pattern.test(url));
}