
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Package, TrendingUp, DollarSign, Target, Lightbulb, Shield, BarChart3, Info, CheckCircle, Settings, Award, Server, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// פונקציה חכמה לתרגום מושגים באנגלית לעברית
const translateKey = (key) => {
  // מפת תרגום בסיסית למושגים נפוצים
  const translations = {
    // General terms
    'overview': 'סקירה כללית',
    'conclusion': 'מסקנה',
    'market_trends': 'מגמות שוק',
    'business_info': 'מידע עסקי',
    'name': 'שם',
    'type': 'סוג',
    'location': 'מיקום',
    'description': 'תיאור',
    'target_audience': 'קהל יעד',
    'operating_hours': 'שעות פעילות',
    
    // Strategy & Pricing
    'strategy': 'אסטרטגיה',
    'strategy_type': 'סוג אסטרטגיה',
    'strategy type': 'סוג אסטרטגיה',
    'pricing_model': 'מודל תמחור',
    'pricing model': 'מודל תמחור',
    'market_positioning': 'מיצוב שוק',
    'market positioning': 'מיצוב שוק',
    'value_proposition': 'הצעת ערך',
    'value proposition': 'הצעת ערך',
    'pricing_strategy_analysis': 'ניתוח אסטרטגיית תמחור',
    'pricing_factors': 'גורמי תמחור',
    'shipping_policy': 'מדיניות משלוחים',
    'shipping policy': 'מדיניות משלוחים',
    
    // Portfolio & Services
    'portfolio_strength': 'חוזק הפורטפוליו',
    'portfolio strength': 'חוזק הפורטפוליו',
    'portfolio_depth': 'עומק פורטפוליו',
    'portfolio depth': 'עומק פורטפוליו',
    'portfolio_breadth': 'רוחב פורטפוליו',
    'portfolio breadth': 'רוחב פורטפוליו',
    'portfolio_gaps': 'פערי פורטפוליו',
    'portfolio gaps': 'פערי פורטפוליו',
    'core_services': 'שירותים עיקריים',
    'core services': 'שירותים עיקריים',
    'service_depth': 'עומק שירות',
    'service depth': 'עומק שירות',
    'service_synergy': 'סינרגיה שירותית',
    'service synergy': 'סינרגיה שירותית',
    'key_series': 'סדרות מפתח',
    'key series': 'סדרות מפתח',
    'quality_tiers': 'רמות איכות',
    'quality tiers': 'רמות איכות',
    
    // Competitive & Market
    'competitive_positioning': 'מיצוב תחרותי',
    'competitive positioning': 'מיצוב תחרותי',
    'market_position': 'מיצוב שוק',
    'market position': 'מיצוב שוק',
    'unique_selling_points': 'נקודות מכירה ייחודיות',
    'unique selling points': 'נקודות מכירה ייחודיות',
    'competitive_advantages': 'יתרונות תחרותיים',
    'competitive advantages': 'יתרונות תחרותיים',
    'differentiation': 'בידול',
    'strengths': 'חוזקות',
    'weaknesses': 'חולשות',
    'opportunities': 'הזדמנויות',
    'threats': 'איומים',
    
    // Business Opportunities
    'business_opportunities': 'הזדמנויות עסקיות',
    'business opportunities': 'הזדמנויות עסקיות',
    'growth_areas': 'תחומי צמיחה',
    'growth areas': 'תחומי צמיחה',
    'market_gaps': 'פערי שוק',
    'market gaps': 'פערי שוק',
    'potential_markets': 'שווקים פוטנציאליים',
    'potential markets': 'שווקים פוטנציאליים',
    'service_expansion': 'הרחבת שירותים',
    'service expansion': 'הרחבת שירותים',
    
    // Strategic Recommendations
    'strategic_recommendations': 'המלצות אסטרטגיות',
    'strategic recommendations': 'המלצות אסטרטגיות',
    'immediate_actions': 'פעולות מיידיות',
    'immediate actions': 'פעולות מיידיות',
    'short_term': 'טווח קצר',
    'short term': 'טווח קצר',
    'medium_term': 'טווח בינוני',
    'medium term': 'טווח בינוני',
    'mid_term': 'טווח בינוני',
    'mid term': 'טווח בינוני',
    'long_term': 'טווח ארוך',
    'long term': 'טווח ארוך',
    
    // Category Analysis
    'category_analysis': 'ניתוח קטגוריות',
    'category analysis': 'ניתוח קטגוריות',
    'main_categories': 'קטגוריות עיקריות',
    'main categories': 'קטגוריות עיקריות',
    'strongest_category': 'קטגוריה חזקה',
    'strongest category': 'קטגוריה חזקה',
    'growth_potential': 'פוטנציאל צמיחה',
    'growth potential': 'פוטנציאל צמיחה',
    
    // Technical
    'technical_details': 'פרטים טכניים',
    'technical details': 'פרטים טכניים',
    'data_quality': 'איכות נתונים',
    'data quality': 'איכות נתונים',
    'site_structure': 'מבנה אתר',
    'site structure': 'מבנה אתר',
    'scraping_challenges': 'אתגרי סריקה',
    'scraping challenges': 'אתגרי סריקה',
    'crawler_stats': 'סטטיסטיקות Crawler',
    'urls_discovered': 'כתובות שהתגלו',
    'urls_crawled': 'כתובות שנסרקו',
    'failed_urls': 'כתובות כושלות',
    'sitemap_found': 'Sitemap נמצא',

    // Informational Analysis
    'overall_effectiveness_score': 'ציון אפקטיביות כולל',
    'value_proposition_clarity': 'בהירות הצעת הערך',
    'call_to_action_analysis': 'ניתוח קריאות לפעולה',
    'ux_assessment': 'הערכת חווית משתמש',
    'seo_recommendations': 'המלצות SEO',
    'content_improvement_suggestions': 'הצעות לשיפור תוכן',
    'lead_generation_opportunities': 'הזדמנויות ליצירת לידים',
    'conversion_optimization_tips': 'טיפים לאופטימיזציה של המרות',
    'cta_text': 'טקסט קריאה לפעולה',
    'strength': 'חוזק',
    'suggestions': 'הצעות',
    'clear': 'ברור',
    'somewhat_clear': 'בהיר חלקית',
    'not_clear': 'לא ברור',
    'strong': 'חזק',
    'moderate': 'בינוני',
    'weak': 'חלש',
  };

  // בדיקה ישירה במפה
  if (translations[key]) {
    return translations[key];
  }

  // תרגום אוטומטי למושגים נפוצים
  const autoTranslate = (text) => {
    const lowerText = text.toLowerCase();
    
    // מושגים נפוצים
    if (lowerText.includes('strategy')) return text.replace(/strategy/gi, 'אסטרטגיה');
    if (lowerText.includes('pricing')) return text.replace(/pricing/gi, 'תמחור');
    if (lowerText.includes('market')) return text.replace(/market/gi, 'שוק');
    if (lowerText.includes('portfolio')) return text.replace(/portfolio/gi, 'פורטפוליו');
    if (lowerText.includes('service')) return text.replace(/service/gi, 'שירות');
    if (lowerText.includes('competitive')) return text.replace(/competitive/gi, 'תחרותי');
    if (lowerText.includes('business')) return text.replace(/business/gi, 'עסקי');
    if (lowerText.includes('growth')) return text.replace(/growth/gi, 'צמיחה');
    if (lowerText.includes('opportunity')) return text.replace(/opportunity/gi, 'הזדמנות');
    if (lowerText.includes('recommendation')) return text.replace(/recommendation/gi, 'המלצה');
    if (lowerText.includes('analysis')) return text.replace(/analysis/gi, 'ניתוח');
    if (lowerText.includes('category')) return text.replace(/category/gi, 'קטגוריה');
    if (lowerText.includes('strength')) return text.replace(/strength/gi, 'חוזק');
    if (lowerText.includes('weakness')) return text.replace(/weakness/gi, 'חולשה');
    if (lowerText.includes('threat')) return text.replace(/threat/gi, 'איום');
    if (lowerText.includes('positioning')) return text.replace(/positioning/gi, 'מיצוב');
    if (lowerText.includes('value')) return text.replace(/value/gi, 'ערך');
    if (lowerText.includes('proposition')) return text.replace(/proposition/gi, 'הצעה');
    if (lowerText.includes('advantage')) return text.replace(/advantage/gi, 'יתרון');
    if (lowerText.includes('differentiation')) return text.replace(/differentiation/gi, 'בידול');
    if (lowerText.includes('potential')) return text.replace(/potential/gi, 'פוטנציאל');
    if (lowerText.includes('expansion')) return text.replace(/expansion/gi, 'הרחבה');
    if (lowerText.includes('synergy')) return text.replace(/synergy/gi, 'סינרגיה');
    if (lowerText.includes('depth')) return text.replace(/depth/gi, 'עומק');
    if (lowerText.includes('breadth')) return text.replace(/breadth/gi, 'רוחב');
    if (lowerText.includes('gap')) return text.replace(/gap/gi, 'פער');
    if (lowerText.includes('core')) return text.replace(/core/gi, 'ליבה');
    if (lowerText.includes('key')) return text.replace(/key/gi, 'מפתח');
    if (lowerText.includes('quality')) return text.replace(/quality/gi, 'איכות');
    if (lowerText.includes('tier')) return text.replace(/tier/gi, 'רמה');
    if (lowerText.includes('series')) return text.replace(/series/gi, 'סדרה');
    if (lowerText.includes('model')) return text.replace(/model/gi, 'מודל');
    if (lowerText.includes('type')) return text.replace(/type/gi, 'סוג');
    if (lowerText.includes('policy')) return text.replace(/policy/gi, 'מדיניות');
    if (lowerText.includes('shipping')) return text.replace(/shipping/gi, 'משלוח');
    if (lowerText.includes('immediate')) return text.replace(/immediate/gi, 'מיידי');
    if (lowerText.includes('action')) return text.replace(/action/gi, 'פעולה');
    if (lowerText.includes('short')) return text.replace(/short/gi, 'קצר');
    if (lowerText.includes('medium')) return text.replace(/medium/gi, 'בינוני');
    if (lowerText.includes('mid')) return text.replace(/mid/gi, 'בינוני');
    if (lowerText.includes('long')) return text.replace(/long/gi, 'ארוך');
    if (lowerText.includes('term')) return text.replace(/term/gi, 'טווח');
    if (lowerText.includes('technical')) return text.replace(/technical/gi, 'טכני');
    if (lowerText.includes('detail')) return text.replace(/detail/gi, 'פרט');
    if (lowerText.includes('data')) return text.replace(/data/gi, 'נתון');
    if (lowerText.includes('site')) return text.replace(/site/gi, 'אתר');
    if (lowerText.includes('structure')) return text.replace(/structure/gi, 'מבנה');
    if (lowerText.includes('scraping')) return text.replace(/scraping/gi, 'סריקה');
    if (lowerText.includes('challenge')) return text.replace(/challenge/gi, 'אתגר');
    if (lowerText.includes('crawler')) return text.replace(/crawler/gi, 'Crawler');
    if (lowerText.includes('urls')) return text.replace(/urls/gi, 'כתובות');
    if (lowerText.includes('discovered')) return text.replace(/discovered/gi, 'התגלו');
    if (lowerText.includes('crawled')) return text.replace(/crawled/gi, 'נסרקו');
    if (lowerText.includes('failed')) return text.replace(/failed/gi, 'כושלות');
    if (lowerText.includes('sitemap')) return text.replace(/sitemap/gi, 'Sitemap');
    if (lowerText.includes('found')) return text.replace(/found/gi, 'נמצא');
    if (lowerText.includes('effectiveness')) return text.replace(/effectiveness/gi, 'אפקטיביות');
    if (lowerText.includes('score')) return text.replace(/score/gi, 'ציון');
    if (lowerText.includes('overall')) return text.replace(/overall/gi, 'כולל');
    if (lowerText.includes('clarity')) return text.replace(/clarity/gi, 'בהירות');
    if (lowerText.includes('call_to_action')) return text.replace(/call_to_action/gi, 'קריאה לפעולה');
    if (lowerText.includes('ux')) return text.replace(/ux/gi, 'חווית משתמש');
    if (lowerText.includes('assessment')) return text.replace(/assessment/gi, 'הערכה');
    if (lowerText.includes('seo')) return text.replace(/seo/gi, 'SEO');
    if (lowerText.includes('content')) return text.replace(/content/gi, 'תוכן');
    if (lowerText.includes('improvement')) return text.replace(/improvement/gi, 'שיפור');
    if (lowerText.includes('suggestions')) return text.replace(/suggestions/gi, 'הצעות');
    if (lowerText.includes('lead')) return text.replace(/lead/gi, 'ליד');
    if (lowerText.includes('generation')) return text.replace(/generation/gi, 'יצירה');
    if (lowerText.includes('conversion')) return text.replace(/conversion/gi, 'המרות');
    if (lowerText.includes('optimization')) return text.replace(/optimization/gi, 'אופטימיזציה');
    if (lowerText.includes('tips')) return text.replace(/tips/gi, 'טיפים');
    if (lowerText.includes('text')) return text.replace(/text/gi, 'טקסט');
    
    return text;
  };

  // נסה תרגום אוטומטי
  const autoTranslated = autoTranslate(key);
  if (autoTranslated !== key) {
    return autoTranslated;
  }

  // אם לא נמצא תרגום, החזר את המפתח המקורי עם פורמטינג
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

// פונקציה לטיפול בערכים מורכבים
const formatValue = (value) => {
  if (value === null || value === undefined) return null;
  
  // אם זה אובייקט, נסה לחלץ את התוכן
  if (typeof value === 'object' && !Array.isArray(value)) {
    // אם יש תכונות ספציפיות, הצג אותן
    if (value.text || value.description || value.content) {
      return value.text || value.description || value.content;
    }
    // אחרת, הצג את כל התכונות
    return Object.entries(value)
      .map(([key, val]) => `${translateKey(key)}: ${val}`)
      .join(', ');
  }
  
  // אם זה מערך
  if (Array.isArray(value)) {
    return value;
  }
  
  // אם זה מחרוזת שנראית כמו מערך
  if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsedArray = JSON.parse(value);
      if (Array.isArray(parsedArray)) {
        return parsedArray;
      }
    } catch (e) {
      console.warn("Could not parse stringified array, treating as string:", value, e);
    }
  }
  
  return value;
};

// רכיב עזר להצגת פריט בודד בניתוח
const AnalysisItem = ({ label, value }) => {
  const displayValue = formatValue(value);
  
  if (!displayValue && typeof displayValue !== 'boolean' && typeof displayValue !== 'number') return null;
  if (Array.isArray(displayValue) && displayValue.length === 0) return null;

  return (
    <li className="flex flex-col">
      <span className="font-semibold text-horizon-text">{label}:</span>
      {Array.isArray(displayValue) ? (
        <ul className="list-disc pr-5 mt-1 space-y-1">
          {displayValue.map((item, index) => (
            <li key={index} className="text-horizon-accent">{String(item)}</li>
          ))}
        </ul>
      ) : (
        <p className="text-horizon-accent pr-2">{String(displayValue)}</p>
      )}
    </li>
  );
};

// רכיב עזר להצגת סעיף ניתוח שלם
const AnalysisSection = ({ title, icon: Icon, data }) => {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return null;
  
  const entries = Object.entries(data).filter(([_, value]) => value !== null && value !== undefined && value !== '');
  if (entries.length === 0) return null;

  return (
    <AccordionItem value={title.toLowerCase().replace(/\s/g, '-')}>
      <AccordionTrigger className="text-horizon-text hover:no-underline">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-horizon-primary" />
          {title}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-3 text-sm text-right pr-4 border-r-2 border-horizon-secondary mr-2">
          {entries.map(([key, value]) => (
            <AnalysisItem key={key} label={translateKey(key)} value={value} />
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
};

// פונקציית עזר לקבלת צבע על פי אחוזים
const getPercentageColor = (percentage) => {
    if (percentage === null || typeof percentage === 'undefined') return 'text-gray-400';
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 70) return 'text-yellow-400';
    return 'text-red-400';
};

export default function ScanInsightsDisplay({ insights, technicalRecommendations, websiteType, informationalAnalysis }) {
  if (!insights && !technicalRecommendations && !informationalAnalysis) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center text-horizon-accent">
          לא נמצאו נתוני ניתוח.
        </CardContent>
      </Card>
    );
  }

  const {
    overview,
    category_analysis,
    pricing_strategy_analysis,
    product_portfolio_analysis,
    competitive_positioning,
    business_opportunities,
    strategic_recommendations,
    market_trends,
    conclusion
  } = insights || {};
  
  const { data_quality, site_structure, scraping_challenges, crawler_stats } = technicalRecommendations || {};

  return (
    <>
      {/* ניתוח אתרי תדמית */}
      {informationalAnalysis && (websiteType === 'informational' || websiteType === 'hybrid') && (
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lightbulb className="w-6 h-6 text-horizon-primary" />
              ניתוח אתר תדמית והמלצות לשיפור
            </CardTitle>
            <CardDescription className="text-horizon-accent">
              ניתוח מעמיק של אפקטיביות האתר, מסרים שיווקיים וחווית משתמש
            </CardDescription>
          </CardHeader>
          <CardContent>
            {informationalAnalysis.overall_effectiveness_score !== undefined && (
              <div className="mb-6 text-center">
                <div className="text-4xl font-bold text-horizon-primary">
                  {informationalAnalysis.overall_effectiveness_score}/100
                </div>
                <div className="text-sm text-horizon-accent">{translateKey('overall_effectiveness_score')}</div>
              </div>
            )}

            <Accordion type="multiple" defaultValue={['value-prop', 'cta']}>
              {informationalAnalysis.value_proposition_clarity && (
                <AccordionItem value="value-prop">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-horizon-primary" />
                      {translateKey('value_proposition_clarity')}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Badge className={
                      informationalAnalysis.value_proposition_clarity === 'clear' ? 'bg-green-500/20 text-green-400' :
                      informationalAnalysis.value_proposition_clarity === 'somewhat_clear' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }>
                      {informationalAnalysis.value_proposition_clarity === 'clear' ? translateKey('clear') :
                       informationalAnalysis.value_proposition_clarity === 'somewhat_clear' ? translateKey('somewhat_clear') : translateKey('not_clear')}
                    </Badge>
                  </AccordionContent>
                </AccordionItem>
              )}

              {informationalAnalysis.call_to_action_analysis && informationalAnalysis.call_to_action_analysis.length > 0 && (
                <AccordionItem value="cta">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-horizon-primary" />
                      {translateKey('call_to_action_analysis')} ({informationalAnalysis.call_to_action_analysis.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {informationalAnalysis.call_to_action_analysis.map((cta, idx) => (
                        <div key={idx} className="bg-horizon-card/30 p-3 rounded-lg">
                          <div className="font-semibold text-horizon-text">"{cta.cta_text}"</div>
                          <div className="text-sm text-horizon-accent">{translateKey('location')}: {cta.location}</div>
                          <Badge className={
                            cta.strength === 'strong' ? 'bg-green-500/20 text-green-400 mt-1' :
                            cta.strength === 'moderate' ? 'bg-yellow-500/20 text-yellow-400 mt-1' :
                            'bg-red-500/20 text-red-400 mt-1'
                          }>
                            {cta.strength === 'strong' ? translateKey('strong') : cta.strength === 'moderate' ? translateKey('moderate') : translateKey('weak')}
                          </Badge>
                          {cta.suggestions && cta.suggestions.length > 0 && (
                            <ul className="list-disc pr-5 mt-2 text-sm text-horizon-accent">
                              {cta.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {informationalAnalysis.ux_assessment && (
                <AnalysisSection title={translateKey('ux_assessment')} icon={Award} data={informationalAnalysis.ux_assessment} />
              )}

              {informationalAnalysis.seo_recommendations && informationalAnalysis.seo_recommendations.length > 0 && (
                <AccordionItem value="seo">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-horizon-primary" />
                      {translateKey('seo_recommendations')}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pr-5 space-y-1 text-sm text-horizon-accent">
                      {informationalAnalysis.seo_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {informationalAnalysis.content_improvement_suggestions && informationalAnalysis.content_improvement_suggestions.length > 0 && (
                <AccordionItem value="content">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-horizon-primary" />
                      {translateKey('content_improvement_suggestions')}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pr-5 space-y-1 text-sm text-horizon-accent">
                      {informationalAnalysis.content_improvement_suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {informationalAnalysis.lead_generation_opportunities && informationalAnalysis.lead_generation_opportunities.length > 0 && (
                <AccordionItem value="leads">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-horizon-primary" />
                      {translateKey('lead_generation_opportunities')}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pr-5 space-y-1 text-sm text-horizon-accent">
                      {informationalAnalysis.lead_generation_opportunities.map((opp, i) => <li key={i}>{opp}</li>)}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {informationalAnalysis.conversion_optimization_tips && informationalAnalysis.conversion_optimization_tips.length > 0 && (
                <AccordionItem value="conversion">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-horizon-primary" />
                      {translateKey('conversion_optimization_tips')}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pr-5 space-y-1 text-sm text-horizon-accent">
                      {informationalAnalysis.conversion_optimization_tips.map((tip, i) => <li key={i}>{tip}</li>)}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* ניתוח עסקי (לכל סוג אתר) */}
      {insights && (
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-6 h-6 text-horizon-primary" />
              ניתוח עסקי ותובנות אסטרטגיות
            </CardTitle>
            <CardDescription className="text-horizon-accent">
              סקירה מקיפה של המצב העסקי הנוכחי, אסטרטגיות ומגמות שוק.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={['overview']}>
              {overview && (
                <AccordionItem value="overview">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2"><Info className="w-5 h-5 text-horizon-primary" />סקירה כללית</div>
                  </AccordionTrigger>
                  <AccordionContent><p className="text-horizon-accent text-sm pr-4 border-r-2 border-horizon-secondary mr-2">{overview}</p></AccordionContent>
                </AccordionItem>
              )}
              
              <AnalysisSection title="ניתוח קטגוריות" icon={Package} data={category_analysis} />
              <AnalysisSection title="ניתוח אסטרטגיית תמחור" icon={DollarSign} data={pricing_strategy_analysis} />
              <AnalysisSection title="ניתוח פורטפוליו מוצרים" icon={Package} data={product_portfolio_analysis} />
              <AnalysisSection title="מיצוב תחרותי" icon={Target} data={competitive_positioning} />
              <AnalysisSection title="הזדמנויות עסקיות" icon={Lightbulb} data={business_opportunities} />
              <AnalysisSection title="המלצות אסטרטגיות" icon={Shield} data={strategic_recommendations} />

              {market_trends && (
                <AccordionItem value="market-trends">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-horizon-primary" />מגמות שוק</div>
                  </AccordionTrigger>
                  <AccordionContent><p className="text-horizon-accent text-sm pr-4 border-r-2 border-horizon-secondary mr-2">{market_trends}</p></AccordionContent>
                </AccordionItem>
              )}

              {conclusion && (
                <AccordionItem value="conclusion">
                  <AccordionTrigger className="text-horizon-text hover:no-underline">
                    <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-horizon-primary" />מסקנה</div>
                  </AccordionTrigger>
                  <AccordionContent><p className="text-horizon-accent text-sm pr-4 border-r-2 border-horizon-secondary mr-2">{conclusion}</p></AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* פרטים טכניים */}
      {technicalRecommendations && (
        <Card className="card-horizon">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Settings className="w-6 h-6 text-horizon-primary" />
                    פרטים טכניים וסטטיסטיקות סריקה
                </CardTitle>
                <CardDescription className="text-horizon-accent">
                    מידע על תהליך הסריקה, איכות נתונים ואתגרים שזוהו
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={['crawler-stats']}>
                    {crawler_stats && (
                        <AccordionItem value="crawler-stats">
                            <AccordionTrigger className="text-horizon-text hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <Server className="w-5 h-5 text-horizon-primary" />
                                    {translateKey('crawler_stats')}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-horizon-card/30 p-3 rounded-lg">
                                        <div className="text-xs text-horizon-accent">{translateKey('urls_discovered')}</div>
                                        <div className="text-2xl font-bold text-horizon-text">{crawler_stats.urls_discovered || 0}</div>
                                    </div>
                                    <div className="bg-horizon-card/30 p-3 rounded-lg">
                                        <div className="text-xs text-horizon-accent">{translateKey('urls_crawled')}</div>
                                        <div className="text-2xl font-bold text-blue-400">{crawler_stats.urls_crawled || 0}</div>
                                    </div>
                                    <div className="bg-horizon-card/30 p-3 rounded-lg">
                                        <div className="text-xs text-horizon-accent">{translateKey('failed_urls')}</div>
                                        <div className="text-2xl font-bold text-red-400">{crawler_stats.failed_urls || 0}</div>
                                    </div>
                                    <div className="bg-horizon-card/30 p-3 rounded-lg">
                                        <div className="text-xs text-horizon-accent">{translateKey('sitemap_found')}</div>
                                        <div className="text-lg font-bold">{crawler_stats.sitemap_found ? '✓ ' + translateKey('found') : '✗ ' + translateKey('not_found')}</div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    
                    {data_quality && (
                        <AnalysisSection title="איכות נתונים" icon={Award} data={data_quality} />
                    )}
                    {site_structure && (
                        <AnalysisSection title="מבנה אתר" icon={Server} data={site_structure} />
                    )}
                    {scraping_challenges && scraping_challenges.length > 0 && (
                        <AccordionItem value="scraping-challenges">
                            <AccordionTrigger className="text-horizon-text hover:no-underline">
                                <div className="flex items-center gap-2"><Server className="w-5 h-5 text-horizon-primary" />אתגרי סריקה</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc pr-5 mt-1 space-y-1">
                                    {scraping_challenges.map((challenge, index) => (
                                        <li key={index} className="text-horizon-accent">{challenge}</li>
                                    ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion>
            </CardContent>
        </Card>
      )}
    </>
  );
}
