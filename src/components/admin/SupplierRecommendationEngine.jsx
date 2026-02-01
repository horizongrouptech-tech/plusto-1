import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Star,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  Target,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock
} from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SupplierRecommendationEngine({ customer, onSupplierSelect, className = "" }) {
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [recommendedSuppliers, setRecommendedSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recommendationType, setRecommendationType] = useState('general');

  /**
   * אלגוריתם המלצות ספקים משופר - מבוסס על סוג העסק והרלוונטיות
   * ⚠️ פרטיות: לא מציג נתונים פנימיים של לקוחות אחרים
   */
  const generateRecommendations = useCallback((suppliers) => {
    if (!customer) return;

    const customerBusinessType = customer.business_type || 'other';
    const customerMainProducts = (customer.main_products_services || customer.main_products || '').toLowerCase();
    const customerCategory = (customer.category || '').toLowerCase();
    
    // מפה מורחבת של התאמת סוגי עסקים לקטגוריות ספקים
    const businessTypeMatches = {
      'restaurant': ['מזון', 'בשר ועוף', 'ירקות', 'ניקיון', 'חד פעמי', 'משקאות', 'ציוד מטבח'],
      'cafe': ['קפה', 'מאפים', 'משקאות', 'חד פעמי', 'ציוד מטבח'],
      'retail': ['אספקה כללית', 'טכנולוגיה', 'לוגיסטיקה', 'אריזה', 'תצוגה'],
      'wholesale': ['לוגיסטיקה', 'אחסון', 'הובלה', 'מחשוב'],
      'services': ['טכנולוגיה', 'תוכנה', 'ייעוץ', 'שיווק'],
      'manufacturing': ['חומרי גלם', 'מכונות', 'תחזוקה', 'לוגיסטיקה'],
      'ecommerce': ['לוגיסטיקה', 'אריזה', 'משלוחים', 'טכנולוגיה'],
      'other': []
    };

    // ספקים פעילים בלבד - ללא התייחסות למידע פנימי של לקוחות אחרים
    const availableSuppliers = suppliers.filter(s => s.is_active !== false);

    // חישוב ציון התאמה מבוסס רלוונטיות עסקית
    const scoredSuppliers = availableSuppliers.map(supplier => {
      let score = 0;
      const reasons = [];

      // ✅ בונוס לספקי שיתוף פעולה (מידע ציבורי)
      if (supplier.is_partner_supplier) {
        score += 40;
        reasons.push('ספק מומלץ בשיתוף פעולה');
      }

      // ✅ התאמה לפי דירוג ספק (מידע ציבורי)
      if (supplier.rating >= 4.5) {
        score += 35;
        reasons.push('דירוג מצוין');
      } else if (supplier.rating >= 4) {
        score += 25;
        reasons.push('דירוג גבוה');
      } else if (supplier.rating >= 3) {
        score += 10;
      }

      // ✅ התאמה לפי סוג עסק הלקוח
      const relevantCategories = businessTypeMatches[customerBusinessType] || [];
      const supplierCategoryLower = (supplier.category || '').toLowerCase();
      
      if (relevantCategories.some(cat => supplierCategoryLower.includes(cat.toLowerCase()))) {
        score += 45;
        reasons.push(`מתאים לעסקי ${customerBusinessType === 'restaurant' ? 'מסעדנות' : 
                      customerBusinessType === 'retail' ? 'קמעונאות' : 
                      customerBusinessType === 'wholesale' ? 'סיטונאות' : 'שירותים'}`);
      }

      // ✅ התאמה לפי מוצרים/שירותים עיקריים של הלקוח
      if (customerMainProducts && supplier.category) {
        const categoryWords = supplierCategoryLower.split(/[\s,]+/);
        const productWords = customerMainProducts.split(/[\s,]+/);
        
        const hasMatch = categoryWords.some(catWord => 
          productWords.some(prodWord => 
            catWord.includes(prodWord) || prodWord.includes(catWord)
          )
        );
        
        if (hasMatch) {
          score += 40;
          reasons.push('התאמה למוצרים העיקריים');
        }
      }

      // ✅ התאמה לפי קטגוריית הלקוח
      if (customerCategory && supplierCategoryLower) {
        if (supplierCategoryLower.includes(customerCategory) || 
            customerCategory.includes(supplierCategoryLower.split(' ')[0])) {
          score += 30;
          reasons.push('תחום פעילות דומה');
        }
      }

      // ✅ בונוסים על מידע ציבורי של הספק
      if (supplier.payment_terms) {
        if (supplier.payment_terms.includes('שוטף') || supplier.payment_terms.includes('30')) {
          score += 15;
          reasons.push('תנאי תשלום נוחים');
        }
      }

      if (supplier.delivery_time) {
        if (supplier.delivery_time.includes('24') || 
            supplier.delivery_time.includes('מיידי') || 
            supplier.delivery_time.includes('יום')) {
          score += 20;
          reasons.push('זמן אספקה מהיר');
        }
      }

      // ✅ בונוס לספקים עם מידע מלא
      if (supplier.phone && supplier.email) {
        score += 10;
      }

      return {
        // מידע ציבורי בלבד
        id: supplier.id,
        name: supplier.name,
        category: supplier.category,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        rating: supplier.rating,
        payment_terms: supplier.payment_terms,
        delivery_time: supplier.delivery_time,
        is_partner_supplier: supplier.is_partner_supplier,
        website_url: supplier.website_url,
        notes: supplier.notes,
        // ציון התאמה
        matchScore: score,
        reasons: reasons
      };
    });

    // מיון לפי ציון התאמה ולקיחת המובילים
    const sortedSuppliers = scoredSuppliers
      .filter(s => s.matchScore > 20) // רק ספקים עם ציון מינימלי
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12);

    setRecommendedSuppliers(sortedSuppliers);
  }, [customer]);

  // טעינת ספקים - רק מידע ציבורי
  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const suppliers = await base44.entities.Supplier.filter({ is_active: true });
      setAllSuppliers(suppliers);
      generateRecommendations(suppliers);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [generateRecommendations]);

  useEffect(() => {
    if (customer) {
      loadSuppliers();
    }
  }, [customer, loadSuppliers]);

  // סינון המלצות
  const filteredRecommendations = recommendedSuppliers.filter(supplier => {
    const matchesSearch = !searchTerm || 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || supplier.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // מציאת ספק חליפי
  const findReplacementSupplier = (originalCategory) => {
    return recommendedSuppliers.filter(s => s.category === originalCategory);
  };

  // קטגוריות ייחודיות
  const uniqueCategories = [...new Set(allSuppliers.map(s => s.category).filter(Boolean))];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Card className={`card-horizon ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-horizon-primary" />
            המלצות ספקים חכמות
          </CardTitle>
          <Button onClick={loadSuppliers} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            רענן המלצות
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex gap-2">
            <Button
              variant={recommendationType === 'general' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRecommendationType('general')}
            >
              <Target className="w-4 h-4 ml-2" />
              המלצות כלליות
            </Button>
            <Button
              variant={recommendationType === 'replacement' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRecommendationType('replacement')}
            >
              <Search className="w-4 h-4 ml-2" />
              מצא ספק חליפי
            </Button>
          </div>
          
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
              <Input
                placeholder="חיפוש ספק..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40 bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="תחום" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התחומים</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 p-4 bg-horizon-card/50 rounded-lg">
                <Skeleton className="h-12 w-12 rounded-lg bg-horizon-primary/20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-horizon-primary/20" />
                  <Skeleton className="h-3 w-1/2 bg-horizon-primary/20" />
                </div>
                <Skeleton className="h-6 w-20 bg-horizon-primary/20" />
              </div>
            ))}
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-horizon-accent" />
            <p className="text-horizon-accent">לא נמצאו המלצות מתאימות</p>
            <p className="text-horizon-accent text-sm mt-2">נסה לשנות את הסינונים או הוסף מידע נוסף על העסק</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-horizon-accent">
              נמצאו {filteredRecommendations.length} המלצות מתאימות עבור {customer?.business_name}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecommendations.map(supplier => (
                <Card key={supplier.id} className="bg-horizon-card/50 border-horizon hover:shadow-lg hover:border-horizon-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-horizon-text flex items-center gap-2">
                          {supplier.name}
                          {supplier.is_partner_supplier && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              שותף מומלץ
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-horizon-accent flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3" />
                          {supplier.category}
                        </p>
                      </div>
                      <Badge className={`${getScoreBadgeColor(supplier.matchScore)} text-white text-xs px-2 py-1`}>
                        {supplier.matchScore}% התאמה
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      {supplier.contact_person && (
                        <div className="flex justify-between">
                          <span className="text-horizon-accent">איש קשר:</span>
                          <span className="text-horizon-text font-medium">{supplier.contact_person}</span>
                        </div>
                      )}
                      {supplier.rating && (
                        <div className="flex justify-between">
                          <span className="text-horizon-accent">דירוג:</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < Math.floor(supplier.rating) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} 
                              />
                            ))}
                            <span className="text-horizon-text mr-1">{supplier.rating}</span>
                          </div>
                        </div>
                      )}
                      {supplier.delivery_time && (
                        <div className="flex justify-between">
                          <span className="text-horizon-accent flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            אספקה:
                          </span>
                          <span className="text-horizon-text">{supplier.delivery_time}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex justify-between">
                          <span className="text-horizon-accent flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            טלפון:
                          </span>
                          <a href={`tel:${supplier.phone}`} className="text-horizon-primary hover:underline">
                            {supplier.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="text-xs text-horizon-accent mb-2 font-medium">למה מומלץ:</div>
                      <div className="flex flex-wrap gap-1">
                        {supplier.reasons.map((reason, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs bg-horizon-primary/5 border-horizon-primary/30 text-horizon-primary"
                          >
                            ✓ {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={() => onSupplierSelect(supplier)} 
                      className="w-full text-sm btn-horizon-primary"
                      size="sm"
                    >
                      <ArrowRight className="w-3 h-3 ml-1" />
                      בחר ספק זה
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}