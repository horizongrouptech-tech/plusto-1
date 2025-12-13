
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Target, CheckCircle2, TrendingUp, Building2, DollarSign, Lightbulb 
} from "lucide-react";
import { InvokeLLM } from "@/integrations/Core";

const BusinessMoveDetailsModal = ({ move, isOpen, onClose, customer, moveComplexityTranslations, moveTimeframeTranslations }) => {
  const [realWorldExamples, setRealWorldExamples] = useState([]);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);

  useEffect(() => {
    if (isOpen && move && customer) {
      fetchRealWorldExamples();
    }
  }, [isOpen, move, customer]);

  const fetchRealWorldExamples = async () => {
    setIsLoadingExamples(true);
    setRealWorldExamples([]); // Clear previous examples
    try {
      const examplesPrompt = `
      מצא עד 3 דוגמאות אמיתיות של חברות ישראליות, רצוי מהתחום של "${customer.business_type}" או תחומים משיקים, שביצעו מהלך אסטרטגי דומה למהלך הבא עבור עסק בשם "${customer.business_name}":
      
      **המהלך האסטרטגי:** "${move.title}"
      **תיאור המהלך:** "${move.description}"

      לכל דוגמה, ספק את הפרטים הבאים בעברית, בהתבסס על מידע מהימן ומאומת:
      1. company_name: שם החברה הישראלית.
      2. action_taken: תיאור ספציפי, ברור ומפורט של מה שהחברה עשתה בפועל.
      3. results: התוצאות המדידות והמוכחות של המהלך (לדוגמה, אחוז צמיחה, הגדלת נתח שוק, שיפור ברווחיות).
      4. year: השנה בה המהלך יושם או הפך למשמעותי.
      5. market_impact: כיצד המהלך השפיע על השוק או על המתחרים.

      הדגש הוא על רלוונטיות לעסק הלקוח ועל איכות ועומק הדוגמאות. אל תכלול קישורים או מקורות בטקסט.
      `;

      const examplesResponse = await InvokeLLM({
        prompt: examplesPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            examples: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company_name: { type: "string" },
                  action_taken: { type: "string" },
                  results: { type: "string" },
                  year: { type: "string" },
                  market_impact: { type: "string" }
                },
                required: ["company_name", "action_taken", "results", "year"]
              }
            }
          },
          required: ["examples"]
        }
      });

      console.log('Raw examples response from LLM:', examplesResponse);

      const cleanExamples = (examplesResponse?.examples || []).map(example => ({
        ...example,
        action_taken: (example.action_taken || '').replace(/\*\*|\[.*?\]|\(.*?\)|https?:\/\/[^\s]+/gi, '').trim(),
        results: (example.results || '').replace(/\*\*|\[.*?\]|\(.*?\)|https?:\/\/[^\s]+/gi, '').trim(),
        market_impact: (example.market_impact || '').replace(/\*\*|\[.*?\]|\(.*?\)|https?:\/\/[^\s]+/gi, '').trim()
      })).filter(example => 
        example.company_name && 
        example.action_taken && 
        example.results &&
        example.company_name.length > 2 &&
        example.action_taken.length > 10 && 
        example.results.length > 5
      ).slice(0, 3);
      
      console.log('Cleaned and filtered examples:', cleanExamples);
      setRealWorldExamples(cleanExamples);
      
    } catch (error) {
      console.error("Error fetching real world examples:", error);
      setRealWorldExamples([]);
    }
    setIsLoadingExamples(false);
  };

  if (!move) return null;

  const categoryTranslations = {
    growth: "צמיחה",
    efficiency: "יעילות", 
    market_expansion: "הרחבת שוק",
    digital_transformation: "דיגיטציה",
    cost_reduction: "הפחתת עלויות",
    innovation: "חדשנות"
  };

  const complexityColors = {
    simple: "bg-green-500",
    moderate: "bg-orange-500", 
    complex: "bg-red-500"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-text mb-4 flex items-center gap-3">
            <Target className="w-6 h-6 text-horizon-primary" />
            {move.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Header Info */}
          <div className="flex flex-wrap gap-4 items-center pb-4 border-b border-horizon">
            <Badge className="bg-horizon-primary text-white">
              {categoryTranslations[move.category] || move.category}
            </Badge>
            <Badge className={`${complexityColors[move.implementation_complexity]} text-white`}>
              {moveComplexityTranslations[move.implementation_complexity] || move.implementation_complexity}
            </Badge>
            <Badge variant="outline" className="border-horizon-secondary text-horizon-secondary">
              {moveTimeframeTranslations[move.timeframe] || move.timeframe}
            </Badge>
          </div>

          {/* Main Grid Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Left Column - Description and Implementation */}
            <div className="space-y-6">
              
              {/* Description */}
              <Card className="card-horizon">
                <CardHeader>
                  <CardTitle className="text-horizon-primary flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    תיאור המהלך האסטרטגי
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-horizon-text leading-relaxed">{move.description}</p>
                </CardContent>
              </Card>

              {/* Implementation Phases */}
              {move.implementation_phases && move.implementation_phases.length > 0 && (
                <Card className="card-horizon">
                  <CardHeader>
                    <CardTitle className="text-horizon-primary flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      שלבי ביצוע
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {move.implementation_phases.map((phase, i) => (
                        <div key={i} className="border border-horizon rounded-lg p-4 bg-horizon-card/20">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-horizon-primary rounded-full flex items-center justify-center text-white font-bold">
                              {i + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-horizon-text">{phase.phase_name}</h4>
                              <p className="text-sm text-horizon-accent">משך: {phase.duration}</p>
                            </div>
                          </div>
                          <p className="text-horizon-text mb-3">{phase.description}</p>
                          {phase.key_activities && phase.key_activities.length > 0 && (
                            <div>
                              <p className="font-medium text-horizon-text mb-2">פעילויות מרכזיות:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-horizon-accent">
                                {phase.key_activities.map((activity, j) => (
                                  <li key={j}>{activity}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Impact and Examples */}
            <div className="space-y-6">
              
              {/* Expected Impact */}
              <Card className="card-horizon">
                <CardHeader>
                  <CardTitle className="text-horizon-primary flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    השפעה צפויה
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      ₪{(move.expected_impact || 0).toLocaleString()}
                    </div>
                    <p className="text-horizon-accent">השפעה כספית צפויה</p>
                  </div>
                  
                  {move.impact_percentage > 0 && (
                    <div className="text-center pt-3 border-t border-horizon">
                      <div className="text-xl font-bold text-blue-400 mb-1">
                        +{move.impact_percentage?.toFixed(1)}%
                      </div>
                      <p className="text-horizon-accent">שיפור באחוזים</p>
                    </div>
                  )}
                  
                  {move.competitive_advantage && (
                    <div className="pt-3 border-t border-horizon">
                      <h5 className="font-semibold text-horizon-text mb-2">יתרון תחרותי:</h5>
                      <p className="text-horizon-accent text-sm">{move.competitive_advantage}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resources Required */}
              {move.required_resources && (
                <Card className="card-horizon">
                  <CardHeader>
                    <CardTitle className="text-horizon-primary flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      משאבים נדרשים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {move.required_resources.budget > 0 && (
                      <div className="flex justify-between">
                        <span className="text-horizon-accent">תקציב:</span>
                        <span className="text-horizon-text font-medium">₪{move.required_resources.budget?.toLocaleString()}</span>
                      </div>
                    )}
                    {move.required_resources.team_size > 0 && (
                      <div className="flex justify-between">
                        <span className="text-horizon-accent">גודל צוות:</span>
                        <span className="text-horizon-text font-medium">{move.required_resources.team_size} אנשים</span>
                      </div>
                    )}
                    {move.required_resources.external_support && (
                      <div>
                        <span className="text-horizon-accent block mb-1">תמיכה חיצונית:</span>
                        <p className="text-horizon-text text-sm">{move.required_resources.external_support}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Success Indicators */}
              {move.success_indicators && move.success_indicators.length > 0 && (
                <Card className="card-horizon">
                  <CardHeader>
                    <CardTitle className="text-horizon-primary flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      מדדי הצלחה
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {move.success_indicators.map((indicator, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-horizon-text text-sm">{indicator}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Real World Examples Section */}
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-primary flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                דוגמאות מהשטח - חברות אמיתיות
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingExamples ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="border border-horizon rounded-lg p-4">
                      <Skeleton className="h-6 w-1/3 mb-2 bg-horizon-card" />
                      <Skeleton className="h-4 w-full mb-2 bg-horizon-card" />
                      <Skeleton className="h-4 w-2/3 bg-horizon-card" />
                    </div>
                  ))}
                </div>
              ) : realWorldExamples.length > 0 ? (
                <div className="space-y-4">
                  {realWorldExamples.map((example, i) => (
                    <div key={i} className="border border-horizon rounded-lg p-4 bg-horizon-card/20">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-semibold text-horizon-text">{example.company_name}</h5>
                          {example.industry && (
                            <p className="text-sm text-horizon-accent">{example.industry}</p>
                          )}
                        </div>
                        {example.year && (
                          <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                            {example.year}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-horizon-text">מה עשו: </span>
                          <span className="text-horizon-accent">{example.action_taken}</span>
                        </div>
                        <div>
                          <span className="font-medium text-horizon-text">תוצאות: </span>
                          <span className="text-horizon-accent">{example.results}</span>
                        </div>
                        {example.market_impact && (
                          <div>
                            <span className="font-medium text-horizon-text">השפעה על השוק: </span>
                            <span className="text-horizon-accent">{example.market_impact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-horizon-accent" />
                  <p className="text-horizon-accent">לא נמצאו דוגמאות מהשטח עבור מהלך זה</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-center pt-6 border-t border-horizon">
            <Button 
              onClick={onClose} 
              className="btn-horizon-primary px-8 py-3 text-lg font-semibold"
            >
              סגור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessMoveDetailsModal;
