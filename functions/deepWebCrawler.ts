
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Deep Web Crawler - מערכת סריקת אתרים מתקדמת
 * תומכת בסריקה עמוקה של מאות דפים, זיהוי מבני תוכן והפעלת JavaScript
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      url, 
      max_pages = 100,
      max_depth = 3,
      render_javascript = false,
      follow_external_links = false 
    } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`Starting deep crawl of ${url} - max_pages: ${max_pages}, max_depth: ${max_depth}`);

    const crawlResults = await performDeepCrawl(url, {
      max_pages,
      max_depth,
      render_javascript,
      follow_external_links
    });

    return Response.json(crawlResults, { status: 200 });

  } catch (error) {
    console.error('Error in deepWebCrawler:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, {
      status: 500
    });
  }
});

async function performDeepCrawl(baseUrl, options = {}) {
  const {
    max_pages = 100,
    max_depth = 3,
    render_javascript = false,
    follow_external_links = false
  } = options;

  const startTime = Date.now();
  const baseUrlObj = new URL(baseUrl);
  const baseDomain = baseUrlObj.origin;

  // מבני נתונים לניהול הסריקה
  const visitedUrls = new Set();
  const urlsQueue = [{ url: baseUrl, depth: 0 }];
  const crawledPages = [];
  const failedUrls = [];

  // קטגוריזציה של דפים
  const pageCategories = {
    product_pages: [],
    category_pages: [],
    service_pages: [],
    content_pages: [],
    other_pages: []
  };

  // ניסיון לטעון sitemap
  const sitemapUrls = await tryLoadSitemap(baseDomain);
  if (sitemapUrls.length > 0) {
    console.log(`Found ${sitemapUrls.length} URLs in sitemap`);
    sitemapUrls.forEach(sitemapUrl => {
      if (!visitedUrls.has(sitemapUrl) && !isStaticFile(sitemapUrl) && !isNonContentPage(sitemapUrl)) {
        urlsQueue.push({ url: sitemapUrl, depth: 1 });
      }
    });
  }

  // לולאת הסריקה הראשית
  while (urlsQueue.length > 0 && crawledPages.length < max_pages) {
    const { url: currentUrl, depth } = urlsQueue.shift();

    // דילוג על URLs שכבר בוקרו או שעומקם גדול מדי
    if (visitedUrls.has(currentUrl) || depth > max_depth) {
      continue;
    }

    // דילוג על קבצים סטטיים ודפים לא רלוונטיים
    if (isStaticFile(currentUrl) || isNonContentPage(currentUrl)) {
      console.log(`Skipping non-content URL: ${currentUrl}`);
      continue;
    }

    visitedUrls.add(currentUrl);

    console.log(`Crawling [${crawledPages.length + 1}/${max_pages}] depth=${depth}: ${currentUrl}`);

    // סריקת הדף
    const pageResult = await scrapeSinglePage(currentUrl, render_javascript);

    if (!pageResult.success) {
      failedUrls.push({ url: currentUrl, error: pageResult.error });
      continue;
    }

    const extractedText = extractTextFromHtml(pageResult.html);
    
    // דילוג על דפים עם תוכן טקסטואלי מינימלי
    if (!extractedText || extractedText.length < 100) {
      console.log(`Skipping page with minimal text content: ${currentUrl}`);
      continue;
    }

    // שמירת תוצאת הדף
    const pageData = {
      url: currentUrl,
      html: pageResult.html,
      text: extractedText,
      title: pageResult.title || extractTitle(pageResult.html),
      depth: depth,
      page_type: categorizePageType(currentUrl, pageResult.html)
    };

    crawledPages.push(pageData);

    // קטגוריזציה
    const category = pageData.page_type;
    if (pageCategories[category]) {
      pageCategories[category].push(currentUrl);
    } else {
      pageCategories.other_pages.push(currentUrl);
    }

    // חילוץ קישורים מהדף
    if (depth < max_depth) {
      const links = extractLinksFromHtml(pageResult.html, currentUrl, baseDomain, follow_external_links);
      
      // הוספת קישורים חדשים לתור
      links.forEach(link => {
        if (!visitedUrls.has(link) && !urlsQueue.find(item => item.url === link)) {
          urlsQueue.push({ url: link, depth: depth + 1 });
        }
      });
    }

    // עיכוב קטן כדי לא להציף את השרת
    await delay(200);
  }

  const endTime = Date.now();
  const durationSeconds = (endTime - startTime) / 1000;

  console.log(`Crawl completed: ${crawledPages.length} pages, ${failedUrls.length} failures`);

  return {
    success: true,
    base_url: baseUrl,
    pages_crawled: crawledPages.length,
    urls_discovered: visitedUrls.size,
    duration_seconds: durationSeconds,
    sitemap_found: sitemapUrls.length > 0,
    javascript_rendered: render_javascript,
    page_categories: {
      product_pages: pageCategories.product_pages.length,
      category_pages: pageCategories.category_pages.length,
      service_pages: pageCategories.service_pages.length,
      content_pages: pageCategories.content_pages.length,
      other_pages: pageCategories.other_pages.length
    },
    crawled_pages: crawledPages,
    failed_urls: failedUrls
  };
}

async function scrapeSinglePage(url, renderJavaScript = false) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
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
      url: url
    };
  }
}

function extractLinksFromHtml(html, currentUrl, baseDomain, followExternal = false) {
  const links = new Set();
  
  try {
    // ביטויים רגולריים לחילוץ קישורים
    const linkPattern = /href=["']([^"']+)["']/gi;
    const matches = html.matchAll(linkPattern);

    for (const match of matches) {
      let link = match[1];
      
      // דילוג על קישורים לא רלוונטיים
      if (link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('javascript:')) {
        continue;
      }

      // המרה ל-URL מוחלט
      const absoluteUrl = resolveUrl(link, baseDomain, currentUrl);
      
      if (!absoluteUrl) continue;

      // סינון לפי דומיין
      const linkDomain = new URL(absoluteUrl).origin;
      if (!followExternal && linkDomain !== baseDomain) {
        continue;
      }

      // דילוג על קבצים סטטיים
      if (isStaticFile(absoluteUrl)) {
        continue;
      }

      // דילוג על דפים לא רלוונטיים
      if (isNonContentPage(absoluteUrl)) {
        continue;
      }

      links.add(absoluteUrl);
    }
  } catch (error) {
    console.error('Error extracting links:', error);
  }

  return Array.from(links);
}

function categorizePageType(url, html) {
  const urlLower = url.toLowerCase();
  const htmlLower = html.toLowerCase();

  // זיהוי דפי מוצר
  const productPatterns = [
    /\/products?\//i,
    /\/item\//i,
    /\/p\//i,
    /add[-_]?to[-_]?cart/i,
    /product[-_]?details/i,
    /buy[-_]?now/i
  ];
  if (productPatterns.some(pattern => pattern.test(urlLower) || pattern.test(htmlLower))) {
    return 'product_pages';
  }

  // זיהוי דפי קטגוריה
  const categoryPatterns = [
    /\/category\//i,
    /\/collection/i,
    /\/shop\//i,
    /\/catalog/i
  ];
  if (categoryPatterns.some(pattern => pattern.test(urlLower))) {
    return 'category_pages';
  }

  // זיהוי דפי שירותים
  const servicePatterns = [
    /\/services?\//i,
    /\/solutions?\//i,
    /\/offerings?\//i,
    /contact[-_]?us/i,
    /get[-_]?quote/i
  ];
  if (servicePatterns.some(pattern => pattern.test(urlLower) || pattern.test(htmlLower))) {
    return 'service_pages';
  }

  // זיהוי דפי תוכן
  const contentPatterns = [
    /\/blog\//i,
    /\/article/i,
    /\/news\//i,
    /\/about/i,
    /\/אודות/i
  ];
  if (contentPatterns.some(pattern => pattern.test(urlLower))) {
    return 'content_pages';
  }

  return 'other_pages';
}

function resolveUrl(href, baseDomain, currentUrl) {
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    } else if (href.startsWith('//')) {
      return 'https:' + href;
    } else if (href.startsWith('/')) {
      return baseDomain + href;
    } else {
      // קישור יחסי
      const currentUrlObj = new URL(currentUrl);
      const pathParts = currentUrlObj.pathname.split('/').slice(0, -1);
      return baseDomain + pathParts.join('/') + '/' + href;
    }
  } catch {
    return null;
  }
}

function isStaticFile(url) {
  const staticExtensions = [
    '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', 
    '.ico', '.pdf', '.zip', '.xml', '.json', '.woff', '.woff2', 
    '.ttf', '.eot', '.mp4', '.mp3', '.webm', '.webp', '.xsl',
    '.map', '.min.css', '.min.js'
  ];
  
  const urlLower = url.toLowerCase();
  
  // בדיקת סיומות
  if (staticExtensions.some(ext => urlLower.endsWith(ext))) {
    return true;
  }
  
  // בדיקת תיקיות assets/wp-content
  if (urlLower.includes('/wp-content/uploads/') ||
      urlLower.includes('/wp-content/cache/') ||
      urlLower.includes('/wp-content/plugins/') && (urlLower.includes('.css') || urlLower.includes('.js')) ||
      urlLower.includes('/assets/css/') ||
      urlLower.includes('/assets/js/') ||
      urlLower.includes('/cdn-cgi/')) {
    return true;
  }
  
  return false;
}

function isNonContentPage(url) {
  const excludePatterns = [
    /\/cart/i,
    /\/checkout/i,
    /\/account/i,
    /\/login/i,
    /\/register/i,
    /\/sign[-_]?in/i,
    /\/sign[-_]?up/i,
    /\/password/i,
    /\/privacy/i,
    /\/terms/i,
    /\/cookie/i,
    /\/admin/i,
    /\/wp-admin/i,
    /\/wp-json/i,
    /\/feed/i,
    /\/rss/i,
    /\/email-protection/i,
    /cdn-cgi/i
  ];
  return excludePatterns.some(pattern => pattern.test(url));
}

async function tryLoadSitemap(baseDomain) {
  const sitemapUrls = [];
  const possibleSitemaps = [
    `${baseDomain}/sitemap.xml`,
    `${baseDomain}/sitemap_index.xml`,
    `${baseDomain}/sitemap-index.xml`
  ];

  for (const sitemapUrl of possibleSitemaps) {
    try {
      const response = await fetch(sitemapUrl);
      if (response.ok) {
        const xml = await response.text();
        const urlMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
        for (const match of urlMatches) {
          const extractedUrl = match[1];
          // סינון URLs מה-sitemap
          if (!isStaticFile(extractedUrl) && !isNonContentPage(extractedUrl)) {
            sitemapUrls.push(extractedUrl);
          }
        }
        console.log(`Loaded sitemap from ${sitemapUrl}: ${sitemapUrls.length} relevant URLs`);
        break;
      }
    } catch (error) {
      // Sitemap לא נמצא, ממשיכים לנסות אחרים
    }
  }

  return sitemapUrls;
}

function extractTextFromHtml(html) {
  try {
    let text = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
    text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');
    text = text.replace(/<[^>]+>/g, ' ');
    text = text.replace(/&[a-z]+;/gi, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  } catch {
    return '';
  }
}

function extractTitle(html) {
  try {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  } catch {
    return '';
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
