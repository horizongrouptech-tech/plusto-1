
import { invokeClaude } from '@/functions/invokeClaude';
import { deepWebCrawler } from '@/functions/deepWebCrawler';

// סכימה לחילוץ מוצרים מדפי מוצר
const productExtractionSchema = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          subcategory: { type: "string" },
          brand: { type: "string" },
          price: {
            type: "object",
            properties: {
              current_price: { type: "number" },
              original_price: { type: "number" },
              is_on_sale: { type: "boolean" }
            }
          },
          description: { type: "string" },
          images: { type: "array", items: { type: "string" } },
          availability: {
            type: "object",
            properties: {
              in_stock: { type: "boolean" },
              stock_status: { type: "string" }
            }
          }
        }
      }
    }
  }
};

// סכימה לניתוח אתר תדמית/שירותים
const informationalAnalysisSchema = {
  type: "object",
  properties: {
    website_type: {
      type: "string",
      enum: ["e-commerce", "informational", "hybrid"]
    },
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          service_id: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          pricing: {
            type: "object",
            properties: {
              price_type: { type: "string" },
              amount: { type: "number" }
            }
          },
          features: { type: "array", items: { type: "string" } }
        }
      }
    },
    informational_analysis: {
      type: "object",
      properties: {
        value_proposition_clarity: { 
          type: "string", 
          enum: ["clear", "somewhat_clear", "unclear"] 
        },
        target_audience_appeal: { 
          type: "string", 
          enum: ["strong", "moderate", "weak"] 
        },
        messaging_effectiveness: {
          type: "object",
          properties: {
            main_message: { type: "string" },
            consistency: { type: "string" },
            differentiation: { type: "string" }
          }
        },
        call_to_action_analysis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              cta_text: { type: "string" },
              location: { type: "string" },
              strength: { type: "string" },
              suggestions: { type: "array", items: { type: "string" } }
            }
          }
        },
        ux_assessment: {
          type: "object",
          properties: {
            navigation_clarity: { type: "string" },
            mobile_friendliness: { type: "string" },
            content_readability: { type: "string" }
          }
        },
        seo_recommendations: { type: "array", items: { type: "string" } },
        content_improvement_suggestions: { type: "array", items: { type: "string" } },
        lead_generation_opportunities: { type: "array", items: { type: "string" } },
        conversion_optimization_tips: { type: "array", items: { type: "string" } },
        overall_effectiveness_score: { type: "number" }
      }
    },
    business_analysis: {
      type: "object",
      properties: {
        overview: { type: "string" },
        competitive_positioning: { type: "object", additionalProperties: true },
        business_opportunities: { type: "object", additionalProperties: true },
        strategic_recommendations: { type: "object", additionalProperties: true },
        market_trends: { type: "string" },
        conclusion: { type: "string" }
      }
    }
  }
};

export const performAdvancedWebsiteScan = async (websiteUrl, scanType = 'comprehensive') => {
  console.log(`Starting advanced scan for ${websiteUrl} - type: ${scanType}`);

  try {
    // שלב 1: Crawling עמוק
    const maxPages = scanType === 'comprehensive' ? 100 : 30;
    console.log(`Calling deepWebCrawler with max_pages: ${maxPages}`);
    
    const { data: crawlResult, error: crawlError } = await deepWebCrawler({
      url: websiteUrl,
      max_pages: maxPages,
      max_depth: 3,
      render_javascript: false,
      follow_external_links: false
    });

    if (crawlError || !crawlResult?.success) {
      console.error('Deep crawl failed:', crawlError);
      throw new Error(`Deep crawl failed: ${crawlError?.message || 'Unknown error'}`);
    }

    console.log(`Crawl completed: ${crawlResult.pages_crawled} pages, ${crawlResult.page_categories.product_pages} product pages, ${crawlResult.page_categories.service_pages} service pages`);

    // שלב 2: זיהוי סוג האתר (ללא LLM - רק לוגיקה)
    const websiteType = identifyWebsiteTypeByLogic(crawlResult);
    console.log(`Website type identified (logic-based): ${websiteType}`);

    // שלב 3: ניתוח מותאם לפי סוג האתר
    let analysisResult;
    
    if (websiteType === 'e-commerce' || websiteType === 'hybrid') {
      analysisResult = await analyzeEcommerceWebsite(crawlResult, websiteUrl);
    } else {
      analysisResult = await analyzeInformationalWebsite(crawlResult, websiteUrl);
    }

    // שלב 4: חישוב ציון איכות נתונים
    const dataQuality = calculateDataQuality(analysisResult, crawlResult);

    // שלב 5: בניית תוצאה סופית
    return {
      website_type: websiteType,
      scan_metadata: {
        site_url: websiteUrl,
        scan_timestamp: new Date().toISOString(),
        total_pages_scraped: crawlResult.pages_crawled,
        total_products_found: analysisResult.products?.length || 0,
        total_services_found: analysisResult.services?.length || 0,
        categories_discovered: extractUniqueCategories(analysisResult).length,
        scan_duration_seconds: crawlResult.duration_seconds,
        success_rate: crawlResult.pages_crawled > 0 
          ? ((crawlResult.pages_crawled / (crawlResult.pages_crawled + crawlResult.failed_urls.length)) * 100) 
          : 0,
        pages_categorized: crawlResult.page_categories
      },
      products: analysisResult.products || [],
      services: analysisResult.services || [],
      business_analysis: analysisResult.business_analysis || {},
      informational_analysis: analysisResult.informational_analysis || {},
      technical_details: {
        site_structure: crawlResult.page_categories,
        data_quality: dataQuality,
        scraping_challenges: identifyChallenges(crawlResult),
        crawler_stats: {
          urls_discovered: crawlResult.urls_discovered,
          urls_crawled: crawlResult.pages_crawled,
          failed_urls: crawlResult.failed_urls.length,
          javascript_rendered: crawlResult.javascript_rendered,
          sitemap_found: crawlResult.sitemap_found
        }
      },
      scan_settings: {
        max_pages: maxPages,
        scan_depth: 3,
        scan_type: scanType
      }
    };

  } catch (error) {
    console.error('Error in advanced website scan:', error);
    throw new Error(`Scan failed: ${error.message}`);
  }
};

function identifyWebsiteTypeByLogic(crawlResult) {
  const { page_categories } = crawlResult;

  // אם יש הרבה דפי מוצר, זה אתר מסחר
  if (page_categories.product_pages > 10) {
    return page_categories.service_pages > 5 ? 'hybrid' : 'e-commerce';
  }

  // אם יש דפי שירותים אבל מעט/אפס דפי מוצר
  if (page_categories.service_pages > 5 && page_categories.product_pages < 5) {
    return 'informational';
  }

  // אם יש מעט דפי מוצר אבל יש תוכן
  if (page_categories.product_pages >= 3 && page_categories.product_pages <= 10) {
    return 'e-commerce';
  }

  // אם יש הרבה דפי תוכן ומעט מוצרים/שירותים
  if (page_categories.content_pages > 10) {
    return 'informational';
  }

  // ברירת מחדל - היברידי או לא זוהה
  return page_categories.product_pages > 0 || page_categories.service_pages > 0 ? 'hybrid' : 'informational';
}

async function analyzeEcommerceWebsite(crawlResult, websiteUrl) {
  console.log('Analyzing as e-commerce website...');

  try {
    // חילוץ דפי מוצר
    const productPages = crawlResult.crawled_pages.filter(p => 
      p.page_type === 'product_pages' && 
      p.text && 
      p.text.length > 100
    );
    
    console.log(`Found ${productPages.length} product pages to analyze`);

    if (productPages.length === 0) {
      console.log('No product pages found, returning empty analysis');
      return {
        products: [],
        business_analysis: {
          overview: 'לא נמצאו דפי מוצרים לניתוח',
          pricing_strategy_analysis: {},
          strategic_recommendations: {},
          conclusion: 'האתר אינו מכיל מוצרים מזוהים או שהמבנה שלו אינו תואם לזיהוי אוטומטי'
        }
      };
    }

    // מגבלה על מספר דפים לניתוח (למניעת חריגה מטוקנים)
    const pagesToAnalyze = productPages.slice(0, 20);

    // בניית פרומפט לחילוץ מוצרים - קצר ומדויק
    const productsText = pagesToAnalyze.map((page, idx) => `
מוצר ${idx + 1}:
URL: ${page.url}
כותרת: ${page.title}
תוכן: ${(page.text || '').substring(0, 800)}
---
    `).join('\n');

    console.log(`Sending ${pagesToAnalyze.length} product pages to LLM for analysis`);
    console.log(`Total prompt length: ~${productsText.length} chars`);

    const ecommercePrompt = `
אתה מומחה לניתוח אתרי מסחר אלקטרוני.

חלץ מידע על מוצרים מהדפים הבאים. עבור כל מוצר, חלץ רק את המידע הזמין:
- שם המוצר
- קטגוריה (אם ניתן לזהות)
- מחיר נוכחי (במספרים בלבד)
- תיאור קצר
- האם במלאי

${productsText}

לאחר מכן, כתוב סיכום קצר של אסטרטגיית המחירים והמלצה אחת לשיפור.
    `;

    const { data: ecommerceAnalysis, error: llmError } = await invokeClaude({
      prompt: ecommercePrompt,
      response_json_schema: {
        type: "object",
        properties: {
          products: productExtractionSchema.properties.products,
          business_analysis: {
            type: "object",
            properties: {
              overview: { type: "string" },
              pricing_strategy_analysis: { 
                type: "object",
                additionalProperties: true 
              },
              strategic_recommendations: { 
                type: "object",
                additionalProperties: true 
              },
              conclusion: { type: "string" }
            }
          }
        }
      }
    });

    if (llmError) {
      console.error('LLM analysis failed for e-commerce:', llmError);
      return {
        products: [],
        business_analysis: {
          overview: 'ניתוח LLM נכשל',
          pricing_strategy_analysis: {},
          strategic_recommendations: {},
          conclusion: `שגיאה: ${llmError.message || 'Unknown LLM error'}`
        }
      };
    }

    console.log(`E-commerce analysis completed: ${ecommerceAnalysis.products?.length || 0} products extracted`);
    return ecommerceAnalysis;

  } catch (error) {
    console.error('Error in analyzeEcommerceWebsite:', error);
    return {
      products: [],
      business_analysis: {
        overview: 'שגיאה בניתוח אתר המסחר',
        pricing_strategy_analysis: {},
        strategic_recommendations: {},
        conclusion: error.message
      }
    };
  }
}

async function analyzeInformationalWebsite(crawlResult, websiteUrl) {
  console.log('Analyzing as informational/corporate website...');

  try {
    // איסוף דפי תוכן רלוונטיים
    const relevantPages = crawlResult.crawled_pages.filter(p => 
      (p.page_type === 'service_pages' || 
       p.page_type === 'content_pages' || 
       p.page_type === 'other_pages') &&
      p.text && 
      p.text.length > 100
    ).slice(0, 15);

    console.log(`Found ${relevantPages.length} relevant pages for informational analysis`);

    if (relevantPages.length === 0) {
      console.log('No relevant pages found, returning minimal analysis');
      return {
        services: [],
        informational_analysis: {
          overall_effectiveness_score: 50,
          seo_recommendations: ['לא ניתן לנתח - אין מספיק תוכן'],
          content_improvement_suggestions: ['יש להעלות תוכן איכותי יותר']
        },
        business_analysis: {
          overview: 'לא נמצא תוכן מספיק לניתוח',
          conclusion: 'האתר דורש תוכן נוסף'
        }
      };
    }

    const contentText = relevantPages.map((page, idx) => `
דף ${idx + 1}:
URL: ${page.url}
כותרת: ${page.title}
תוכן: ${(page.text || '').substring(0, 600)}
---
    `).join('\n');

    console.log(`Sending ${relevantPages.length} pages to LLM for informational analysis`);
    console.log(`Total prompt length: ~${contentText.length} chars`);

    const informationalPrompt = `
אתה יועץ שיווק דיגיטלי ו-UX מומחה.

נתח את האתר הבא ותן המלצות קצרות ומעשיות:

${contentText}

בצע ניתוח קצר של:
1. האם הצעת הערך ברורה? (clear/somewhat_clear/unclear)
2. האם האתר מושך את קהל היעד? (strong/moderate/weak)
3. 3-5 המלצות SEO מעשיות
4. 3-5 הצעות לשיפור תוכן
5. 2-3 הזדמנויות ליצירת לידים
6. ציון כולל לאפקטיביות (0-100)

אם זיהית שירותים, רשום אותם.
    `;

    const { data: informationalAnalysis, error: llmError } = await invokeClaude({
      prompt: informationalPrompt,
      response_json_schema: informationalAnalysisSchema
    });

    if (llmError) {
      console.error('LLM analysis failed for informational site:', llmError);
      return {
        services: [],
        informational_analysis: {
          overall_effectiveness_score: 50,
          seo_recommendations: ['ניתוח LLM נכשל'],
          content_improvement_suggestions: [`שגיאה: ${llmError.message}`]
        },
        business_analysis: {
          overview: 'ניתוח LLM נכשל',
          conclusion: 'אנא נסה שוב מאוחר יותר'
        }
      };
    }

    console.log(`Informational analysis completed successfully`);
    return informationalAnalysis;

  } catch (error) {
    console.error('Error in analyzeInformationalWebsite:', error);
    return {
      services: [],
      informational_analysis: {
        overall_effectiveness_score: 50,
        seo_recommendations: ['שגיאה בניתוח'],
        content_improvement_suggestions: [error.message]
      },
      business_analysis: {
        overview: 'שגיאה בניתוח אתר התדמית',
        conclusion: error.message
      }
    };
  }
}

function calculateDataQuality(analysisResult, crawlResult) {
  let score = 0;
  const issues = [];

  // איכות נתוני מוצרים (אם קיימים)
  if (analysisResult.products && analysisResult.products.length > 0) {
    const completeProducts = analysisResult.products.filter(p => 
      p.name && p.price?.current_price && p.description
    ).length;
    const completeness = (completeProducts / analysisResult.products.length) * 60;
    score += completeness;
    
    if (completeness < 30) {
      issues.push('נתוני מוצרים חלקיים - חסרים פרטים במוצרים רבים');
    }
  } else if (analysisResult.services && analysisResult.services.length > 0) {
    // איכות נתוני שירותים
    const completeServices = analysisResult.services.filter(s => 
      s.name && s.description
    ).length;
    const completeness = (completeServices / analysisResult.services.length) * 60;
    score += completeness;
    
    if (completeness < 30) {
      issues.push('נתוני שירותים חלקיים');
    }
  }

  // איכות ניתוח עסקי
  if (analysisResult.business_analysis?.overview) score += 10;
  if (analysisResult.business_analysis?.strategic_recommendations) score += 15;
  if (analysisResult.informational_analysis?.overall_effectiveness_score) score += 15;

  return {
    overall_score: Math.min(Math.round(score), 100),
    missing_data_points: issues,
    consistency_issues: []
  };
}

function extractUniqueCategories(analysisResult) {
  const categories = new Set();
  
  if (analysisResult.products) {
    analysisResult.products.forEach(p => {
      if (p.category) categories.add(p.category);
    });
  }
  
  if (analysisResult.services) {
    analysisResult.services.forEach(s => {
      if (s.category) categories.add(s.category);
    });
  }
  
  return Array.from(categories);
}

function identifyChallenges(crawlResult) {
  const challenges = [];
  
  if (crawlResult.failed_urls && crawlResult.failed_urls.length > 0) {
    challenges.push(`${crawlResult.failed_urls.length} דפים נכשלו בסריקה`);
  }
  
  if (!crawlResult.sitemap_found) {
    challenges.push('לא נמצא קובץ sitemap.xml - הסריקה עשויה להיות חלקית');
  }
  
  if (crawlResult.pages_crawled < 10) {
    challenges.push('מספר דפים קטן נסרק - ייתכן שהאתר חוסם בוטים');
  }
  
  return challenges;
}
