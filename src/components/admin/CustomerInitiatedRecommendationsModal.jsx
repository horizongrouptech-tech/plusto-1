import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Calendar, Target, TrendingUp } from 'lucide-react';
import { Recommendation } from '@/entities/Recommendation';

export default function CustomerInitiatedRecommendationsModal({ isOpen, onClose, customerEmail }) {
  const [customerInitiatedRecs, setCustomerInitiatedRecs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !customerEmail) {
      setIsLoading(false);
      return;
    }

    const fetchCustomerRecs = async () => {
      setIsLoading(true);
      try {
        // סינון לפי customer_email ו-source 'whatsapp_request' וגם is_targeted
        const recs = await Recommendation.filter({
          customer_email: customerEmail,
          source: 'whatsapp_request'
        }, '-created_date'); // מיון מהחדש לישן
        
        // סינון נוסף ברמת הקוד לוודא שזו המלצה ממוקדת
        const targetedRecs = recs.filter(rec => 
          rec.related_data && rec.related_data.is_targeted === true
        );
        
        setCustomerInitiatedRecs(targetedRecs);
      } catch (error) {
        console.error("Error fetching customer initiated recommendations:", error);
        setCustomerInitiatedRecs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerRecs();
  }, [isOpen, customerEmail]);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'pricing': return '💰';
      case 'bundles': return '📦';
      case 'promotions': return '🎯';
      case 'suppliers': return '🏭';
      case 'strategic_moves': return '🚀';
      default: return '💡';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'pricing': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'bundles': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'promotions': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'suppliers': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'strategic_moves': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-horizon-primary">
            <MessageCircle className="w-6 h-6" />
            המלצות שנוצרו על ידי הלקוח
          </DialogTitle>
          <DialogDescription className="text-horizon-accent">
            רשימת ההמלצות הממוקדות שנוצרו לאחר שהלקוח {customerEmail} התחיל שיחה ובקש המלצות ספציפיות.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center p-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-horizon-primary" />
            <p className="text-horizon-accent mt-3">טוען המלצות...</p>
          </div>
        ) : customerInitiatedRecs.length === 0 ? (
          <div className="text-center p-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-horizon-accent" />
            <h3 className="text-lg font-semibold text-horizon-text mb-2">אין המלצות שנוצרו על ידי הלקוח</h3>
            <p className="text-horizon-accent">
              כאן יופיעו המלצות לאחר שהלקוח יתחיל שיחה ויבקש המלצה ממוקדת דרך וואטסאפ.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-horizon-card/50 rounded-lg border border-horizon">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-horizon-primary" />
                  <span className="text-horizon-text">סה"כ המלצות: {customerInitiatedRecs.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-horizon-text">
                    רווח פוטנציאלי: ₪{customerInitiatedRecs.reduce((sum, rec) => sum + (rec.expected_profit || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {customerInitiatedRecs.map(rec => (
                <Card key={rec.id} className="bg-horizon-card border-horizon hover:bg-horizon-card/80 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryIcon(rec.category)}</span>
                        <div>
                          <CardTitle className="text-horizon-text text-lg">{rec.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${getCategoryColor(rec.category)} text-xs`}>
                              {rec.category === 'pricing' ? 'תמחור' :
                               rec.category === 'bundles' ? 'חבילות' :
                               rec.category === 'promotions' ? 'מבצעים' :
                               rec.category === 'suppliers' ? 'ספקים' :
                               rec.category === 'strategic_moves' ? 'מהלכים אסטרטגיים' : rec.category}
                            </Badge>
                            {rec.priority && (
                              <Badge variant="outline" className={`${getPriorityColor(rec.priority)} border-current text-xs`}>
                                עדיפות {rec.priority === 'high' ? 'גבוהה' : rec.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-green-400">
                          ₪{(rec.expected_profit || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-horizon-accent">רווח צפוי</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-horizon-accent text-sm mb-4 leading-relaxed">
                      {rec.description}
                    </p>
                    
                    {rec.product_context && (
                      <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-sm">
                        <span className="text-blue-400 font-medium">מוצר: </span>
                        <span className="text-horizon-text">{rec.product_context}</span>
                      </div>
                    )}

                    {rec.action_steps && rec.action_steps.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-horizon-text mb-2">שלבי ביצוע:</h4>
                        <ol className="text-xs text-horizon-accent space-y-1">
                          {rec.action_steps.slice(0, 3).map((step, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="bg-horizon-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                          {rec.action_steps.length > 3 && (
                            <li className="text-horizon-accent/70 text-xs mr-6">
                              +{rec.action_steps.length - 3} שלבים נוספים...
                            </li>
                          )}
                        </ol>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-horizon-accent pt-3 border-t border-horizon">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>נוצרה: {new Date(rec.created_date).toLocaleDateString('he-IL')}</span>
                      </div>
                      {rec.related_data?.product_searched && (
                        <div className="flex items-center gap-2">
                          <Target className="w-3 h-3" />
                          <span>חיפוש עבור: {rec.related_data.product_searched}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-horizon">
          <Button onClick={onClose} variant="outline" className="btn-horizon-secondary">
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}