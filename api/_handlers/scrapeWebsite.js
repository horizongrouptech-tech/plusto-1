import { requireAuth } from '../_helpers.js';

function extractLinks(html, baseUrl) {
  const links = new Set();
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    try {
      const url = new URL(match[1], baseUrl).href;
      if (url.startsWith(baseUrl)) links.add(url);
    } catch {}
  }
  return [...links];
}

function extractProducts(html) {
  const products = [];
  // Simple heuristic: look for price patterns
  const pricePattern = /[\u20AA$€]?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*[\u20AA$€]?/g;
  const prices = [];
  let m;
  while ((m = pricePattern.exec(html)) !== null && prices.length < 50) {
    const val = parseFloat(m[1].replace(',', '.'));
    if (val > 0.5 && val < 100000) prices.push(val);
  }
  return { price_count: prices.length, sample_prices: prices.slice(0, 10) };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { url, max_pages = 5, deep_crawl = false } = req.body ?? {};
    if (!url) return res.status(400).json({ error: 'url required' });

    const baseUrl = new URL(url).origin;
    const visited = new Set();
    const results = { pages: [], products_found: 0, links_found: 0, data_quality_score: 0 };

    const toVisit = [url];

    while (toVisit.length > 0 && visited.size < max_pages) {
      const current = toVisit.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      try {
        const response = await fetch(current, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Plusto-Bot/1.0)' },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) continue;

        const html = await response.text();
        const links = extractLinks(html, baseUrl);
        const { price_count, sample_prices } = extractProducts(html);

        results.pages.push({ url: current, links_count: links.length, price_count });
        results.products_found += price_count;
        results.links_found += links.length;

        if (deep_crawl) {
          links.slice(0, 3).forEach(l => { if (!visited.has(l)) toVisit.push(l); });
        }
      } catch {}
    }

    results.data_quality_score = Math.min(100, Math.round((results.products_found / 10) * 100));
    results.pages_crawled = visited.size;

    return res.status(200).json(results);
  } catch (e) {
    console.error('[scrapeWebsite]', e);
    return res.status(500).json({ error: e.message });
  }
}
