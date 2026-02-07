import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, deep_crawl = true, max_pages = 50 } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`Starting scan of ${url} - max_pages: ${max_pages}`);

    // Call the deep web crawler function
    const crawlResponse = await base44.functions.invoke('deepWebCrawler', {
      url,
      max_pages,
      max_depth: 3,
      render_javascript: false,
      follow_external_links: false
    });

    const scrapingResults = crawlResponse.data;

    // Calculate quality score
    let qualityScore = 0;
    const missingDataPoints = [];
    const consistencyIssues = [];

    if (scrapingResults.products && scrapingResults.products.length > 0) {
      let completeProducts = 0;
      scrapingResults.products.forEach(p => {
        let isComplete = true;
        if (!p.name) { isComplete = false; missingDataPoints.push('שם מוצר חסר'); }
        if (!p.price || p.price.current_price === null) { isComplete = false; missingDataPoints.push('מחיר חסר'); }
        if (!p.description || p.description.length < 20) { isComplete = false; missingDataPoints.push('תיאור קצר מדי'); }
        if (!p.images || p.images.length === 0) { isComplete = false; missingDataPoints.push('תמונות חסרות'); }
        if (!p.category) { isComplete = false; missingDataPoints.push('קטגוריה חסרה'); }
        
        if (isComplete) completeProducts++;
      });
      
      const completenessRatio = completeProducts / scrapingResults.products.length;
      qualityScore += Math.round(completenessRatio * 60);
    } else {
      missingDataPoints.push('לא נמצאו מוצרים כלל');
    }

    const businessAnalysis = scrapingResults.business_analysis || {};
    if (businessAnalysis.overview && businessAnalysis.overview.length > 50) qualityScore += 10;
    if (businessAnalysis.pricing_strategy_analysis) qualityScore += 10;
    if (businessAnalysis.competitive_positioning) qualityScore += 10;
    if (businessAnalysis.business_opportunities) qualityScore += 10;

    qualityScore = Math.min(qualityScore, 100);

    scrapingResults.technical_details = scrapingResults.technical_details || {};
    scrapingResults.technical_details.data_quality = {
      overall_score: qualityScore,
      missing_data_points: [...new Set(missingDataPoints)],
      consistency_issues: [...new Set(consistencyIssues)]
    };

    return Response.json(scrapingResults, { status: 200 });

  } catch (error) {
    console.error('Error in scrapeWebsite:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, {
      status: 500
    });
  }
});