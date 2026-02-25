import { requireAuth } from '../_helpers.js';

function isStaticFile(url) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|xml|json|woff|woff2|ttf|eot|mp4|mp3|webm|webp|xsl|map)$/i.test(url);
}

function isNonContentPage(url) {
  return /\/(cart|checkout|account|login|register|sign[-_]?in|sign[-_]?up|password|privacy|terms|cookie|admin|wp-admin|wp-json|feed|rss|email-protection|cdn-cgi)/i.test(url);
}

function resolveUrl(href, baseDomain, currentUrl) {
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return baseDomain + href;
    const currentUrlObj = new URL(currentUrl);
    const pathParts = currentUrlObj.pathname.split('/').slice(0, -1);
    return baseDomain + pathParts.join('/') + '/' + href;
  } catch { return null; }
}

function extractLinksFromHtml(html, currentUrl, baseDomain, followExternal) {
  const links = new Set();
  const matches = html.matchAll(/href=["']([^"']+)["']/gi);
  for (const match of matches) {
    const link = match[1];
    if (link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('javascript:')) continue;
    const absUrl = resolveUrl(link, baseDomain, currentUrl);
    if (!absUrl) continue;
    try {
      const linkDomain = new URL(absUrl).origin;
      if (!followExternal && linkDomain !== baseDomain) continue;
    } catch { continue; }
    if (isStaticFile(absUrl) || isNonContentPage(absUrl)) continue;
    links.add(absUrl);
  }
  return Array.from(links);
}

function extractTextFromHtml(html) {
  let text = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&[a-z]+;/gi, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

async function tryLoadSitemap(baseDomain) {
  const urls = [];
  for (const path of ['/sitemap.xml', '/sitemap_index.xml']) {
    try {
      const r = await fetch(baseDomain + path);
      if (r.ok) {
        const xml = await r.text();
        for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
          if (!isStaticFile(m[1]) && !isNonContentPage(m[1])) urls.push(m[1]);
        }
        break;
      }
    } catch {}
  }
  return urls;
}

async function performDeepCrawl(baseUrl, options = {}) {
  const { max_pages = 100, max_depth = 3, follow_external_links = false } = options;
  const startTime = Date.now();
  const baseUrlObj = new URL(baseUrl);
  const baseDomain = baseUrlObj.origin;

  const visitedUrls = new Set();
  const urlsQueue = [{ url: baseUrl, depth: 0 }];
  const crawledPages = [];
  const failedUrls = [];

  const sitemapUrls = await tryLoadSitemap(baseDomain);
  sitemapUrls.forEach((u) => { if (!visitedUrls.has(u)) urlsQueue.push({ url: u, depth: 1 }); });

  while (urlsQueue.length > 0 && crawledPages.length < max_pages) {
    const { url: currentUrl, depth } = urlsQueue.shift();
    if (visitedUrls.has(currentUrl) || depth > max_depth) continue;
    if (isStaticFile(currentUrl) || isNonContentPage(currentUrl)) continue;

    visitedUrls.add(currentUrl);

    try {
      const response = await fetch(currentUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PlustoBot/1.0)', 'Accept': 'text/html', 'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) { failedUrls.push({ url: currentUrl, error: `HTTP ${response.status}` }); continue; }
      const html = await response.text();
      const text = extractTextFromHtml(html);
      if (!text || text.length < 100) continue;

      const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || '';
      crawledPages.push({ url: currentUrl, text: text.substring(0, 2000), title, depth });

      if (depth < max_depth) {
        const links = extractLinksFromHtml(html, currentUrl, baseDomain, follow_external_links);
        links.forEach((l) => { if (!visitedUrls.has(l) && !urlsQueue.find((i) => i.url === l)) urlsQueue.push({ url: l, depth: depth + 1 }); });
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      failedUrls.push({ url: currentUrl, error: err.message });
    }
  }

  return {
    success: true,
    base_url: baseUrl,
    pages_crawled: crawledPages.length,
    urls_discovered: visitedUrls.size,
    duration_seconds: (Date.now() - startTime) / 1000,
    sitemap_found: sitemapUrls.length > 0,
    crawled_pages: crawledPages,
    failed_urls: failedUrls,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { url, max_pages = 100, max_depth = 3, follow_external_links = false } = req.body ?? {};
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const result = await performDeepCrawl(url, { max_pages, max_depth, follow_external_links });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[deepWebCrawler]', error);
    return res.status(500).json({ error: error.message, success: false });
  }
}
