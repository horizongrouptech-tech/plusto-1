import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Star,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  Target
} from "lucide-react";
import { Supplier } from "@/entities/Supplier";

export default function SupplierRecommendationEngine({ customer, onSupplierSelect, className = "" }) {
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [recommendedSuppliers, setRecommendedSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recommendationType, setRecommendationType] = useState('general'); // 'general' or 'replacement'

  // אלגוריתם המלצות ספקים
  const generateRecommendations = useCallback((suppliers) => {
    if (!customer) return;

    const customerBusinessType = customer.business_type || 'other';
    const customerMainProducts = (customer.main_products || '').toLowerCase();
    const customerSupplierEmails = suppliers
      .filter(s => s.customer_emails?.includes(customer.email))
      .map(s => s.id);

    // ספקים שלא משויכים כבר ללקוח
    const availableSuppliers = suppliers.filter(s => 
      !customerSupplierEmails.includes(s.id) && s.is_active
    );

    // חישוב ציון התאמה לכל ספק
    const scoredSuppliers = availableSuppliers.map(supplier => {
      let score = 0;
      const reasons = [];

      // בונוס לספקי שיתוף פעולה
      if (supplier.is_partner_supplier) {
        score += 50;
        reasons.push('ספק בשיתוף פעולה');
      }

      // התאמה לפי דירוג
      if (supplier.rating >= 4) {
        score += 30;
        reasons.push('דירוג גבוה');
      }

      // התאמה לפי תחום עסק
      const businessTypeMatches = {
        'restaurant': ['בשר ועוף', 'ירקות וניקיון', 'חד פעמי'],
        'retail': ['חד פעמי', 'טכנולוגיה', 'הובלה ולוגיסטיקה'],
        'wholesale': ['הובלה ולוגיסטיקה', 'טכנולוגיה'],
        'services': ['טכנולוגיה', 'הובלה ולוגיסטיקה']
      };

      const relevantCategories = businessTypeMatches[customerBusinessType] || [];
      if (relevantCategories.includes(supplier.category)) {
        score += 40;
        reasons.push('מתאים לתחום העסק');
      }

      // התאמה לפי מוצרים עיקריים
      if (customerMainProducts && supplier.category) {
        const categoryWords = supplier.category.toLowerCase().split(' ');
        const hasMatch = categoryWords.some(word => 
          customerMainProducts.includes(word) || word.includes(customerMainProducts)
        );
        if (hasMatch) {
          score += 35;
          reasons.push('מתאים למוצרים העיקריים');
        }
      }

      // בונוס לספקים עם תנאי תשלום נוחים
      if (supplier.payment_terms && supplier.payment_terms.includes('30')) {
        score += 15;
        reasons.push('תנאי תשלום נוחים');
      }

      // בונוס לזמן אספקה מהיר
      if (supplier.delivery_time && (
        supplier.delivery_time.includes('24') || supplier.delivery_time.includes('מיידי')
      )) {
        score += 20;
        reasons.push('אספקה מהירה');
      }

      return {
        ...supplier,
        matchScore: score,
        reasons: reasons
      };
    });

    // מיון לפי ציון התאמה
    const sortedSuppliers = scoredSuppliers
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12); // 12 המלצות מובילות

    setRecommendedSuppliers(sortedSuppliers);
  }, [customer]);

  // טעינת ספקים
  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const suppliers = await Supplier.filter({ is_active: true });
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
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-horizon-primary" />
            <p className="text-horizon-accent">מחשב המלצות חכמות...</p>
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
                <Card key={supplier.id} className="bg-horizon-card/50 border-horizon hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-horizon-text flex items-center gap-2">
                          {supplier.name}
                          {supplier.is_partner_supplier && (
                            <Badge className="bg-orange-500 text-white text-xs">שותף</Badge>
                          )}
                        </h4>
                        <p className="text-sm text-horizon-accent">{supplier.category}</p>
                      </div>
                      <Badge className={`${getScoreBadgeColor(supplier.matchScore)} text-white text-xs`}>
                        {supplier.matchScore}% התאמה
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-horizon-accent">איש קשר:</span>
                        <span className="text-horizon-text">{supplier.contact_person}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-horizon-accent">דירוג:</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="text-horizon-text">{supplier.rating}/5</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-horizon-accent">אספקה:</span>
                        <span className="text-horizon-text">{supplier.delivery_time}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-xs text-horizon-accent mb-2">סיבות להמלצה:</div>
                      <div className="flex flex-wrap gap-1">
                        {supplier.reasons.map((reason, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={() => onSupplierSelect(supplier)} 
                      className="w-full text-sm"
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