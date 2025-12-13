
import React, { useState, useEffect, useMemo } from "react";
import { Recommendation } from "@/entities/Recommendation";
import { User } from "@/entities/User";
import { Product } from "@/entities/Product"; // Assuming Product entity exists for fetching
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, BarChart2, Loader2, AlertTriangle, Eye, Package, TrendingUp, Users, Building2, Plus } from "lucide-react"; 
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { trackActivity } from "@/components/logic/activityTracker"; 
import { generateInventoryBasedRecommendations } from '../components/logic/inventoryBasedRecommendationEngine';
import { motion, AnimatePresence } from "framer-motion";

import RecommendationCard from "@/components/shared/RecommendationCard";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]); // State to store user's products
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsContent, setDetailsContent] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [showDataImprovementModal, setShowDataImprovementModal] = useState(false); // New state for data improvement modal

  const categoryTranslations = {
    pricing: "תמחור",
    bundles: "בנדלים", // Added from outline
    promotions: "מבצעים", // Added from outline
    suppliers: "ספקים",
    marketing: "שיווק",
    inventory: "מלאי",
    operations: "תפעול",
    strategic_moves: "מהלכים אסטרטגיים"
  };

  useEffect(() => {
    loadUserRecommendations();
  }, []);

  // בדיקת איכות נתונים באמצעות useMemo
  const hasInaccurateData = useMemo(() => {
    // If no products are loaded yet, or products array is empty, consider data inaccurate for initial display.
    // If fewer than 5 products, regardless of their data completeness, it's considered insufficient.
    if (!products || products.length < 5) return true;
    
    // Filter products that are missing sales, inventory, or supplier data
    const missingDataProducts = products.filter(p => 
      !p.monthly_sales || p.monthly_sales === 0 || // Missing monthly sales data
      !p.inventory || p.inventory === 0 ||          // Missing inventory data
      !p.supplier || p.supplier.trim() === ''      // Missing supplier data
    );
    
    const missingDataPercentage = (missingDataProducts.length / products.length) * 100;
    
    // Check if more than 50% of products have missing data,
    // OR if core user business details are missing.
    return missingDataPercentage > 50 || 
           !user?.monthly_revenue || 
           !user?.business_goals || 
           !user?.target_customers;
  }, [products, user]);


  const loadUserRecommendations = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      if (userData) {
        // Fetch recommendations
        const allUserRecommendations = await Recommendation.filter({
          customer_email: userData.email
        }, "-created_date");

        const publishedRecommendations = allUserRecommendations.filter(rec => 
          rec.status === 'published_by_admin' || rec.status === 'executed'
        );

        const priorityOrder = { high: 1, medium: 2, low: 3 };
        publishedRecommendations.sort((a, b) => {
          const priorityDiff = (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(b.created_date) - new Date(a.created_date);
        });

        setRecommendations(publishedRecommendations);

        // Fetch user products
        try {
          const userProducts = await Product.filter({ customer_email: userData.email });
          setProducts(userProducts);
        } catch (productError) {
          console.error("Error loading products for accuracy check:", productError);
          setProducts([]); // Ensure products state is reset on error
        }
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
    }
    setIsLoading(false);
  };
  
  const generateRecommendations = async () => {
    if (!user) {
      setGenerationStatus("שגיאה: משתמש לא מזוהה.");
      return;
    }

    setIsGenerating(true);
    setGenerationStatus("מנתח את הנתונים העסקיים שלך...");

    try {
      const result = await generateInventoryBasedRecommendations(user, {
        generateRecs: true,
        recommendationsCount: 8
      });

      if (result.success && result.totalGenerated > 0) {
        setGenerationStatus(`נוצרו ${result.totalGenerated} המלצות מותאמות אישית!`);
        await loadUserRecommendations(); // Reload recommendations and products
        
        setTimeout(() => {
          setGenerationStatus("");
        }, 3000);
      } else {
        throw new Error(result.error || "לא נוצרו המלצות");
      }

    } catch (error) {
      console.error("Error generating recommendations:", error);
      setGenerationStatus("שגיאה ביצירת המלצות: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewDetails = async (recommendation) => {
    try {
      setSelectedRecommendation(recommendation);
      
      const hasRealData = recommendation.related_data?.calculation_based_on_real_data === true;
      
      if (hasRealData) {
        const realCurrentProfit = recommendation.related_data?.profit_per_unit * recommendation.related_data?.total_inventory || 0;
        const realExpectedProfit = (realCurrentProfit + (recommendation.expected_profit || 0));
        
        setDetailsContent({
          hasRealData: true,
          currentProfit: realCurrentProfit,
          expectedProfit: realExpectedProfit
        });
      } else {
        setDetailsContent({
          hasRealData: false,
          warningMessage: "המלצה זו אינה מבוססת על חישובי רווח מדויקים מחוסר נתונים מלאים."
        });
      }
      
      setDetailsModalOpen(true);
    } catch (error) {
      console.error("Error fetching recommendation details:", error);
    }
  };

  const handleSaveRecommendation = async (recId, rating) => {
    console.log(`Saving recommendation ${recId} with rating: ${rating}`);
    // Implement actual save logic here, e.g.,
    // try {
    //   await Recommendation.update(recId, { user_rating: rating }); // Assuming a 'user_rating' field exists
    //   // Optionally update local state to reflect the change
    //   setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, user_rating: rating } : r));
    // } catch (error) {
    //   console.error("Error saving recommendation:", error);
    // }
  };

  const handleMarkAsExecuted = async (rec) => { 
    if (!rec) return; 
    try {
      await Recommendation.update(rec.id, { status: "executed" }); 
      await trackActivity('REC_IMPLEMENTED'); 
      setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, status: "executed" } : r));
      setDetailsModalOpen(false); 
    } catch (error) {
      console.error("Error marking recommendation as executed:", error);
    }
  };

  const filteredRecommendations = selectedCategory === "all"
    ? recommendations
    : recommendations.filter(r => r.category === selectedCategory);

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return Math.round(value).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-horizon-dark p-6">
        <Skeleton className="h-8 w-48 mb-6 bg-horizon-card" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="card-horizon">
              <CardHeader><Skeleton className="h-6 w-3/4 bg-horizon-card" /></CardHeader>
              <CardContent><Skeleton className="h-16 w-full bg-horizon-card" /></CardContent>
              <CardFooter><Skeleton className="h-10 w-24 bg-horizon-card" /></CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-horizon-text">המלצות לשיפור</h1>
            <p className="text-horizon-accent">הצעות טקטיות לשיפור הרווחיות בעסק שלך</p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col items-end">
            <Button 
              onClick={generateRecommendations} 
              disabled={isGenerating || !user}
              className="btn-horizon-primary px-6 py-2"
            >
              {isGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> יוצר המלצות חדשות...</>
              ) : (
                "צור המלצות חדשות"
              )}
            </Button>
            {generationStatus && (
              <p className={`text-sm mt-2 ${generationStatus.includes('שגיאה') ? 'text-red-400' : 'text-green-400'}`}>
                {generationStatus}
              </p>
            )}
          </div>
        </div>

        {/* התראה על נתונים לא מדוייקים */}
        {hasInaccurateData && (
          <Card className="card-horizon border-r-4 border-r-yellow-500 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h3 className="font-semibold text-horizon-text">נתונים לא מדוייקים</h3>
                    <p className="text-sm text-horizon-accent">
                      ההמלצות עשויות להיות פחות מדוייקות בגלל חוסר במידע
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowDataImprovementModal(true)}
                  className="btn-horizon-secondary"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  ראה פרטים
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button 
              onClick={() => setSelectedCategory("all")}
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              className={`relative px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedCategory === 'all' 
                  ? 'bg-horizon-primary text-white shadow-lg hover:bg-horizon-primary/90' 
                  : 'bg-horizon-card text-horizon-accent border border-horizon hover:bg-horizon-primary/20 hover:text-white'
              }`}
          >
              כל הקטגוריות
              <Badge className="absolute -top-2 -right-2 bg-horizon-secondary text-white px-2">{recommendations.length}</Badge>
          </Button>
          {Object.entries(categoryTranslations).map(([key, value]) => {
            const count = recommendations.filter(r => r.category === key).length;
            if (count === 0 && selectedCategory !== key) return null; 
            
            return (
              <Button 
                  key={key} 
                  onClick={() => setSelectedCategory(key)}
                  variant={selectedCategory === key ? 'default' : 'ghost'}
                  className={`relative px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedCategory === key 
                      ? 'bg-horizon-primary text-white shadow-lg hover:bg-horizon-primary/90' 
                      : 'bg-horizon-card text-horizon-accent border border-horizon hover:bg-horizon-primary/20 hover:text-white'
                  }`}
              >
                  {value}
                  <Badge className="absolute -top-2 -right-2 bg-horizon-secondary text-white px-2">{count}</Badge>
              </Button>
            );
          })}
        </div>

        {/* Content Area */}
        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-16">
            <Lightbulb className="w-24 h-24 mx-auto text-horizon-accent mb-4" />
            <h2 className="text-2xl font-bold text-horizon-text">אין המלצות זמינות כרגע</h2>
            <p className="text-horizon-accent mt-2">
              {selectedCategory === "all"
                ? "נראה שאין המלצות חדשות. בדוק שוב מאוחר יותר."
                : `אין המלצות בקטגוריית ${categoryTranslations[selectedCategory]}. נסה קטגוריה אחרת.`}
            </p>
            {!isGenerating && (
              <Button 
                onClick={generateRecommendations} 
                disabled={!user}
                className="btn-horizon-primary mt-6 px-8 py-3 text-lg font-semibold"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> טוען...</>
                ) : (
                  "צור המלצות מותאמות אישית"
                )}
              </Button>
            )}
            {generationStatus && !isGenerating && (
              <p className={`text-sm mt-4 ${generationStatus.includes('שגיאה') ? 'text-red-400' : 'text-green-400'}`}>
                {generationStatus}
              </p>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredRecommendations.map((rec) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <RecommendationCard
                    recommendation={rec}
                    isAdmin={false}
                    onViewDetails={handleViewDetails}
                    onSaveRecommendation={handleSaveRecommendation}
                    onMarkExecuted={handleMarkAsExecuted}
                    showRating={true}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Details Modal with Enhanced Design */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          {selectedRecommendation && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-horizon-text mb-4">
                  {selectedRecommendation.title}
                </DialogTitle>
                {detailsContent?.hasRealData === false && (
                  <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
                    <p className="text-yellow-300 text-sm">⚠️ {detailsContent.warningMessage}</p>
                  </div>
                )}
              </DialogHeader>

              <div className="space-y-6 p-4">
                {/* Header Info */}
                <div className="flex flex-wrap gap-4 items-center pb-4 border-b border-horizon">
                  <div className="flex items-center gap-2">
                    <span className="text-horizon-accent text-sm">קטגוריה:</span>
                    <Badge className="bg-horizon-primary text-white">
                      {categoryTranslations[selectedRecommendation.category] || selectedRecommendation.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-horizon-accent text-sm">עדיפות:</span>
                    <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                      {selectedRecommendation.priority === "high" ? "גבוהה" :
                       selectedRecommendation.priority === "medium" ? "בינונית" : "נמוכה"}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xl font-semibold text-horizon-primary mb-3">פירוט על המהלך</h3>
                  <div className="bg-horizon-card/30 p-4 rounded-lg">
                    <p className="text-horizon-text leading-relaxed text-right" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedRecommendation.description}
                    </p>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Action Steps */}
                  {selectedRecommendation.action_steps && selectedRecommendation.action_steps.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-horizon-primary mb-3">שלבי ביצוע</h3>
                      <div className="space-y-3">
                        {selectedRecommendation.action_steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-horizon-card/20 rounded-lg">
                            <div className="flex-shrink-0 w-6 h-6 bg-horizon-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {i + 1}
                            </div>
                            <p className="text-horizon-text leading-relaxed text-right">
                              {step.replace(/\*\*|\\*\\*/g, '').replace(/\*|\\\*/g, '').trim()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Impact */}
                  <div>
                    <h3 className="text-xl font-semibold text-horizon-primary mb-3 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-horizon-primary"/> 
                        השפעה כספית
                    </h3>
                    
                    {detailsContent?.hasRealData ? (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart 
                            data={[
                              { 
                                name: 'רווח נוכחי', 
                                profit: detailsContent.currentProfit,
                                displayValue: formatNumber(detailsContent.currentProfit)
                              },
                              { 
                                name: 'רווח צפוי', 
                                profit: detailsContent.expectedProfit,
                                displayValue: formatNumber(detailsContent.expectedProfit)
                              }
                            ]} 
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            barCategoryGap="25%"
                          >
                             <CartesianGrid strokeDasharray="3 3" stroke="var(--horizon-border)" />
                             <XAxis 
                               dataKey="name" 
                               stroke="var(--horizon-accent)" 
                               tick={{ fill: 'var(--horizon-accent)', fontSize: 12 }}
                               axisLine={{ stroke: 'var(--horizon-border)' }}
                             />
                             <YAxis 
                               stroke="var(--horizon-accent)" 
                               tick={{ fill: 'var(--horizon-accent)', fontSize: 11 }} 
                               allowDecimals={false}
                               tickFormatter={formatNumber}
                               axisLine={{ stroke: 'var(--horizon-border)' }}
                               tickLine={{ stroke: 'var(--horizon-border)' }}
                             />
                             <Tooltip
                                contentStyle={{ 
                                  backgroundColor: 'var(--horizon-dark)', 
                                  border: '1px solid var(--horizon-border)',
                                  borderRadius: '8px'
                                }}
                                itemStyle={{ color: 'var(--horizon-text)' }}
                                labelStyle={{ color: 'var(--horizon-text)' }}
                                formatter={(value) => [`₪${formatNumber(value)}`, 'רווח']}
                              />
                             <Bar 
                               dataKey="profit" 
                               fill="var(--horizon-primary)" 
                               name="רווח (₪)" 
                               radius={[4, 4, 0, 0]}
                               maxBarSize={60}
                             />
                          </BarChart>
                        </ResponsiveContainer>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                            <h4 className="font-semibold text-horizon-text mb-1 text-sm">רווח נוכחי</h4> 
                            <p className="text-blue-400 text-lg font-bold"> 
                              ₪{formatNumber(detailsContent.currentProfit)}
                            </p>
                          </div>
                          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                            <h4 className="font-semibold text-horizon-text mb-1 text-sm">רווח צפוי</h4> 
                            <p className="text-green-400 text-lg font-bold">
                              ₪{formatNumber(detailsContent.expectedProfit)}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-yellow-300 mb-2">חסרים נתונים לחישוב רווח</h4>
                          <p className="text-yellow-200 text-sm">
                            כדי לקבל חישובי רווח מדויקים, יש להשלים את נתוני המוצרים במערכת.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Close Button */}
                <div className="flex justify-center pt-6 border-t border-horizon">
                  <Button
                    onClick={() => setDetailsModalOpen(false)}
                    className="btn-horizon-primary px-8 py-3 text-lg font-semibold"
                  >
                    סגור
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* מודל שיפור נתונים */}
      <Dialog open={showDataImprovementModal} onOpenChange={setShowDataImprovementModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              שיפור דיוק ההמלצות
            </DialogTitle>
            <DialogDescription className="text-horizon-accent">
              הוספת הנתונים הבאים תשפר משמעותית את איכות ההמלצות שלנו
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* חוסר במוצרים */}
            {(!products || products.length < 5) && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-400 mb-2">מוצרים במערכת</h4>
                    <p className="text-sm text-horizon-accent mb-3">
                      יש לך רק {products?.length || 0} מוצרים במערכת. המלצות איכותיות דורשות לפחות 10-15 מוצרים.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-horizon-text">מה לעשות:</p>
                      <ul className="text-sm text-horizon-accent space-y-1">
                        <li>• הוסף עוד מוצרים דרך "הוסף מוצר"</li>
                        <li>• העלה קובץ Excel/CSV עם כל המוצרים</li>
                        <li>• השתמש ב"קטלוג מוצרים חכם"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* חוסר בנתוני מכירות */}
            {products.length > 0 && products.filter(p => !p.monthly_sales || p.monthly_sales === 0).length > products.length * 0.7 && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-400 mb-2">נתוני מכירות חסרים</h4>
                    <p className="text-sm text-horizon-accent mb-3">
                      ל-{Math.round((products.filter(p => !p.monthly_sales || p.monthly_sales === 0).length / products.length) * 100)}% מהמוצרים אין נתוני מכירות חודשיות.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-horizon-text">מה לעשות:</p>
                      <ul className="text-sm text-horizon-accent space-y-1">
                        <li>• עדכן מכירות חודשיות לכל מוצר</li>
                        <li>• העלה דוח מכירות מהמערכת הקיימת</li>
                        <li>• הזן לפחות הערכה גסה למכירות</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* חוסר בנתוני מלאי */}
            {products.length > 0 && products.filter(p => !p.inventory || p.inventory === 0).length > products.length * 0.5 && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-400 mb-2">נתוני מלאי חסרים</h4>
                    <p className="text-sm text-horizon-accent mb-3">
                      למחצית מהמוצרים אין נתוני מלאי עדכניים.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-horizon-text">מה לעשות:</p>
                      <ul className="text-sm text-horizon-accent space-y-1">
                        <li>• ספור מלאי פיזי ועדכן במערכת</li>
                        <li>• חבר מערכת POS/מלאי קיימת</li>
                        <li>• עדכן לפחות עבור מוצרים מובילים</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* חוסר בנתוני ספקים */}
            {products.length > 0 && products.filter(p => !p.supplier || p.supplier.trim() === '').length > products.length * 0.6 && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-400 mb-2">נתוני ספקים חסרים</h4>
                    <p className="text-sm text-horizon-accent mb-3">
                      לרוב המוצרים אין מידע על ספקים, מה שמקשה על המלצות לשיפור תנאים.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-horizon-text">מה לעשות:</p>
                      <ul className="text-sm text-horizon-accent space-y-1">
                        <li>• הוסף שם ספק לכל מוצר</li>
                        <li>• הזן פרטי קשר של ספקים</li>
                        <li>• עדכן תנאי תשלום והזמנות</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* חוסר בפרטים עסקיים */}
            {user && (!user.monthly_revenue || !user.business_goals || !user.target_customers) && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-400 mb-2">פרטים עסקיים חסרים</h4>
                    <p className="text-sm text-horizon-accent mb-3">
                      חסרים פרטים חשובים על העסק שלך שמשפרים את איכות ההמלצות.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-horizon-text">מה לעשות:</p>
                      <ul className="text-sm text-horizon-accent space-y-1">
                        {!user.monthly_revenue && <li>• הוסף מחזור חודשי משוער</li>}
                        {!user.business_goals && <li>• הגדר יעדים עסקיים ברורים</li>}
                        {!user.target_customers && <li>• תאר את קהל היעד שלך</li>}
                        <li>• עדכן פרטים בדף "הגדרות פרופיל"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* סיכום ויתרונות */}
            <div className="p-4 bg-horizon-card/30 rounded-lg border border-horizon">
              <h4 className="font-medium text-horizon-text mb-3">למה זה חשוב?</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-horizon-primary mb-2">עם נתונים מלאים תקבל:</h5>
                  <ul className="text-sm text-horizon-accent space-y-1">
                    <li>• המלצות מדויקות יותר</li>
                    <li>• זיהוי הזדמנויות חבויות</li>
                    <li>• חישובי רווח מדוייקים</li>
                    <li>• המלצות מותאמות אישית</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-red-400 mb-2">ללא נתונים מלאים:</h5>
                  <ul className="text-sm text-horizon-accent space-y-1">
                    <li>• המלצות כלליות</li>
                    <li>• חישובים לא מדוייקים</li>
                    <li>• החמצת הזדמנויות</li>
                    <li>• קושי במעקב תוצאות</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-horizon">
            <Button
              onClick={() => setShowDataImprovementModal(false)}
              variant="outline"
              className="border-horizon text-horizon-text hover:bg-horizon-card"
            >
              סגור
            </Button>
            <Button
              onClick={() => {
                setShowDataImprovementModal(false);
                // נווט לדף הוספת מוצרים או הגדרות
                window.location.href = createPageUrl("AddProduct"); // Assuming "AddProduct" is a valid path/route
              }}
              className="btn-horizon-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              התחל לשפר נתונים
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
