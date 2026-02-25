import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  Search, 
  Calendar,
  Tag,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";


import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Promotion, User } from '@/api/entities';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [filteredPromotions, setFilteredPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserAndPromotions();
  }, []);

  useEffect(() => {
    filterPromotions();
  }, [promotions, searchTerm, statusFilter]);

  const loadUserAndPromotions = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const allPromotions = await Promotion.filter({
        customer_email: currentUser.email
      }, '-created_date');
      
      setPromotions(allPromotions);
    } catch (error) {
      console.error("Error loading promotions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPromotions = () => {
    let filtered = [...promotions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(promotion =>
        promotion.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.promotion_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(promotion => {
        if (statusFilter === "active") return promotion.is_active;
        if (statusFilter === "inactive") return !promotion.is_active;
        return true;
      });
    }

    setFilteredPromotions(filtered);
  };

  const getPromotionStats = () => {
    return {
      total: promotions.length,
      active: promotions.filter(p => p.is_active).length,
      inactive: promotions.filter(p => !p.is_active).length,
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'לא צוין';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  const isPromotionExpired = (endDate) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const stats = getPromotionStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Gift className="w-12 h-12 mx-auto mb-4 text-horizon-primary animate-pulse" />
          <p className="text-horizon-accent">טוען מבצעים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="card-horizon">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl text-horizon-text flex items-center gap-3">
                  <Gift className="w-8 h-8 text-horizon-primary" />
                  ניהול מבצעים
                </CardTitle>
                <p className="text-horizon-accent mt-2">
                  צפה ונהל את כל המבצעים שלך במקום אחד
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-horizon">
            <CardContent className="p-6 text-center">
              <Tag className="w-8 h-8 mx-auto mb-4 text-horizon-primary" />
              <div className="text-3xl font-bold text-horizon-text mb-2">{stats.total}</div>
              <div className="text-sm text-horizon-accent">סה"כ מבצעים</div>
            </CardContent>
          </Card>
          
          <Card className="card-horizon">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-4 text-green-500" />
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.active}</div>
              <div className="text-sm text-horizon-accent">מבצעים פעילים</div>
            </CardContent>
          </Card>
          
          <Card className="card-horizon">
            <CardContent className="p-6 text-center">
              <XCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
              <div className="text-3xl font-bold text-red-600 mb-2">{stats.inactive}</div>
              <div className="text-sm text-horizon-accent">מבצעים לא פעילים</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                  <Input
                    placeholder="חיפוש מבצעים..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text"
              >
                <option value="all">כל המבצעים</option>
                <option value="active">מבצעים פעילים</option>
                <option value="inactive">מבצעים לא פעילים</option>
              </select>

              <Button
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                variant="outline"
              >
                נקה סינונים
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Promotions List */}
        {filteredPromotions.length === 0 ? (
          <Card className="card-horizon">
            <CardContent className="p-12 text-center">
              <Gift className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
              <h3 className="text-xl font-semibold text-horizon-text mb-2">
                {promotions.length === 0 ? 'אין מבצעים במערכת' : 'לא נמצאו מבצעים'}
              </h3>
              <p className="text-horizon-accent">
                {promotions.length === 0 
                  ? 'העלה קובץ מבצעים כדי להתחיל'
                  : 'נסה לשנות את הסינונים או את מילות החיפוש'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPromotions.map((promotion) => (
              <Card key={promotion.id} className="card-horizon">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-horizon-text">
                          {promotion.title}
                        </h3>
                        <Badge className={promotion.is_active ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                          {promotion.is_active ? 'פעיל' : 'לא פעיל'}
                        </Badge>
                        {promotion.promotion_code && (
                          <Badge variant="outline" className="border-horizon-secondary text-horizon-secondary">
                            קוד: {promotion.promotion_code}
                          </Badge>
                        )}
                        {isPromotionExpired(promotion.end_date) && (
                          <Badge className="bg-orange-500 text-white">
                            <Clock className="w-3 h-3 ml-1" />
                            פג תוקף
                          </Badge>
                        )}
                      </div>
                      
                      {promotion.description && (
                        <p className="text-horizon-accent mb-4">{promotion.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-horizon-text">תאריך התחלה:</span>
                          <div className="text-horizon-accent flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(promotion.start_date)}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-horizon-text">תאריך סיום:</span>
                          <div className="text-horizon-accent flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(promotion.end_date)}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-horizon-text">סוג מבצע:</span>
                          <div className="text-horizon-accent">
                            {promotion.promotion_type === 'quantity_deal' ? 'מבצע כמות' : 
                             promotion.promotion_type === 'price_discount' ? 'הנחת מחיר' : 
                             'אחר'}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-horizon-text">נוצר:</span>
                          <div className="text-horizon-accent">
                            {formatDate(promotion.created_date)}
                          </div>
                        </div>
                      </div>
                      
                      {promotion.analysis_notes && (
                        <div className="mt-4 pt-4 border-t border-horizon">
                          <p className="text-xs text-horizon-accent">{promotion.analysis_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}