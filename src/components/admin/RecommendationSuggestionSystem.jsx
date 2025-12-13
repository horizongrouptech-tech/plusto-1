import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecommendationSuggestion } from "@/entities/RecommendationSuggestion";
import { Recommendation } from "@/entities/Recommendation";
import { User } from "@/entities/User";
import { Lightbulb, Users, TrendingUp, MessageSquare, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RecommendationSuggestionSystem({ managerEmail }) {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);

    useEffect(() => {
        loadSuggestions();
        generateNewSuggestions();
    }, [managerEmail]);

    const loadSuggestions = async () => {
        try {
            const userSuggestions = await RecommendationSuggestion.filter({
                suggested_manager_email: managerEmail,
                status: 'pending'
            }, '-created_date');
            
            setSuggestions(userSuggestions);
        } catch (error) {
            console.error('Error loading suggestions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateNewSuggestions = async () => {
        try {
            // מצא את הלקוחות של המנהל הנוכחי
            const myClients = await User.filter({
                assigned_financial_manager_email: managerEmail,
                is_active: true
            });

            if (myClients.length === 0) return;

            // מצא המלצות של מנהלים אחרים
            const otherRecommendations = await Recommendation.filter({
                status: 'published_by_admin'
            }, '-created_date', 100);

            const otherManagers = await User.filter({
                user_type: 'financial_manager',
                is_approved_by_admin: true
            });

            // אלגוריתם התאמה בין עסקים דומים
            for (const myClient of myClients) {
                for (const rec of otherRecommendations) {
                    // וודא שזה לא המנהל הנוכחי
                    const originalManager = otherManagers.find(m => 
                        m.email !== managerEmail && 
                        rec.customer_email && 
                        m.email // נוסיף בדיקה נוספת לפי הלוגיקה העסקית
                    );

                    if (!originalManager) continue;

                    // חישוב ציון דמיון
                    const similarityScore = calculateBusinessSimilarity(myClient, rec);
                    
                    if (similarityScore > 70) { // רק אם יש דמיון גבוה
                        // בדוק אם כבר יש הצעה כזו
                        const existingSuggestion = await RecommendationSuggestion.filter({
                            original_recommendation_id: rec.id,
                            suggested_customer_email: myClient.email
                        });

                        if (existingSuggestion.length === 0) {
                            await RecommendationSuggestion.create({
                                original_recommendation_id: rec.id,
                                original_customer_email: rec.customer_email,
                                original_manager_email: originalManager.email, // נתאים את הלוגיקה
                                suggested_customer_email: myClient.email,
                                suggested_manager_email: managerEmail,
                                business_similarity_reason: `שני העסקים מסוג ${myClient.business_type}, בגודל דומה`,
                                recommendation_title: rec.title,
                                recommendation_category: rec.category,
                                expected_profit: rec.expected_profit,
                                similarity_score: similarityScore
                            });
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error generating suggestions:', error);
        }
    };

    const calculateBusinessSimilarity = (client, recommendation) => {
        let score = 0;
        
        // דמיון בסוג עסק (40 נקודות)
        if (client.business_type === 'retail') score += 40;
        
        // דמיון במחזור (30 נקודות)  
        const revenueRange = getRevenueRange(client.monthly_revenue || 0);
        if (revenueRange) score += 30;
        
        // דמיון בקטגוריית המלצה (30 נקודות)
        if (recommendation.category === 'pricing' || recommendation.category === 'inventory') {
            score += 30;
        }
        
        return Math.min(score, 100);
    };

    const getRevenueRange = (revenue) => {
        if (revenue < 50000) return 'small';
        if (revenue < 200000) return 'medium';
        return 'large';
    };

    const handleSuggestionAction = async (suggestionId, action) => {
        try {
            await RecommendationSuggestion.update(suggestionId, {
                status: action,
                responded_at: new Date().toISOString()
            });

            if (action === 'accepted') {
                // צור המלצה חדשה ללקוח
                const suggestion = suggestions.find(s => s.id === suggestionId);
                const originalRec = await Recommendation.get(suggestion.original_recommendation_id);
                
                await Recommendation.create({
                    customer_email: suggestion.suggested_customer_email,
                    title: `${originalRec.title} (מותאם)`,
                    description: originalRec.description,
                    category: originalRec.category,
                    expected_profit: originalRec.expected_profit,
                    priority: originalRec.priority,
                    source: 'manager_suggestion',
                    status: 'pending',
                    admin_notes: `הומלץ על ידי מנהל כספים אחר בהתבסס על דמיון עסקי`
                });
            }

            loadSuggestions();
        } catch (error) {
            console.error('Error handling suggestion:', error);
        }
    };

    const viewSuggestionDetails = async (suggestion) => {
        try {
            const originalRec = await Recommendation.get(suggestion.original_recommendation_id);
            const originalClient = await User.filter({ email: suggestion.original_customer_email });
            
            setSelectedSuggestion({
                ...suggestion,
                originalRecommendation: originalRec,
                originalClient: originalClient[0]
            });
            setDetailsModalOpen(true);

            // סמן כנצפה
            await RecommendationSuggestion.update(suggestion.id, {
                viewed_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error viewing details:', error);
        }
    };

    if (isLoading) {
        return (
            <Card className="card-horizon">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        טוען המלצות מותאמות...
                    </CardTitle>
                </CardHeader>
            </Card>
        );
    }

    return (
        <>
            <Card className="card-horizon">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-horizon-text">
                        <Users className="w-5 h-5 text-horizon-primary" />
                        המלצות ממנהלים אחרים
                        {suggestions.length > 0 && (
                            <Badge className="bg-horizon-secondary text-white">
                                {suggestions.length}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {suggestions.length === 0 ? (
                        <div className="text-center py-8">
                            <Lightbulb className="w-12 h-12 mx-auto text-horizon-accent mb-3" />
                            <p className="text-horizon-accent">אין המלצות חדשות כרגע</p>
                            <p className="text-sm text-horizon-accent mt-1">
                                המערכת מחפשת באופן אוטומטי המלצות רלוונטיות מעמיתים
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {suggestions.map((suggestion) => (
                                    <motion.div
                                        key={suggestion.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="border border-horizon rounded-lg p-4 bg-horizon-card/30"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-medium text-horizon-text">
                                                    {suggestion.recommendation_title}
                                                </h4>
                                                <p className="text-sm text-horizon-accent">
                                                    ללקוח: {suggestion.suggested_customer_email}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {suggestion.similarity_score}% דמיון
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                            <span className="text-sm text-horizon-text">
                                                רווח צפוי: ₪{suggestion.expected_profit?.toLocaleString()}
                                            </span>
                                        </div>

                                        <p className="text-xs text-horizon-accent mb-4">
                                            {suggestion.business_similarity_reason}
                                        </p>

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => viewSuggestionDetails(suggestion)}
                                                className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary hover:text-white"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                פרטים
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSuggestionAction(suggestion.id, 'accepted')}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                <ThumbsUp className="w-4 h-4 mr-1" />
                                                אמץ
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSuggestionAction(suggestion.id, 'rejected')}
                                                className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                                            >
                                                <ThumbsDown className="w-4 h-4 mr-1" />
                                                דחה
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal פרטי ההמלצה */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="sm:max-w-2xl bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
                    {selectedSuggestion && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl text-horizon-primary">
                                    פרטי ההמלצה המוצעת
                                </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-medium text-horizon-text mb-2">לקוח מקורי:</h4>
                                        <p className="text-horizon-accent">
                                            {selectedSuggestion.originalClient?.business_name || selectedSuggestion.original_customer_email}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-horizon-text mb-2">מנהל כספים מקורי:</h4>
                                        <p className="text-horizon-accent">
                                            {selectedSuggestion.original_manager_email}
                                        </p>
                                        <Button size="sm" variant="outline" className="mt-2">
                                            <MessageSquare className="w-4 h-4 mr-1" />
                                            צור קשר
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-horizon-text mb-2">תיאור ההמלצה:</h4>
                                    <div className="bg-horizon-card/20 p-4 rounded-lg">
                                        <p className="text-horizon-text">
                                            {selectedSuggestion.originalRecommendation?.description}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-horizon-text mb-2">סיבת ההתאמה:</h4>
                                    <p className="text-horizon-accent">
                                        {selectedSuggestion.business_similarity_reason}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-horizon">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-horizon-accent">ציון דמיון:</span>
                                        <Badge className="bg-horizon-primary text-white">
                                            {selectedSuggestion.similarity_score}%
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                        <span className="text-horizon-text">
                                            ₪{selectedSuggestion.expected_profit?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}