import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  Activity, 
  Download, 
  RefreshCw,
  Filter,
  TrendingUp,
  DollarSign,
  Package,
  Calendar
} from 'lucide-react';
import PopularityAnalysis from './PopularityAnalysis';
import ProfitabilityAnalysis from './ProfitabilityAnalysis';
import TrendsAnalysis from './TrendsAnalysis';
import InventoryRecommendationsWidget from './InventoryRecommendationsWidget';
import { calculateProductPopularity, categorizeByProfitability } from './productAnalyticsEngine';
import { base44 } from '@/api/base44Client';
import { formatCurrencyHebrew } from '@/components/utils/chartConfig';

export default function CatalogAnalyticsDashboard({ products, customer, selectedCatalogId }) {
  const [zReports, setZReports] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('popularity');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [customer?.email, selectedCatalogId]);

  const loadAnalyticsData = async () => {
    if (!customer?.email) return;

    setIsLoading(true);
    try {
      const zReportsData = await base44.entities.ZReportDetails.filter({
        customer_email: customer.email
      });
      setZReports(zReportsData);

      const forecasts = await base44.entities.ManualForecast.filter({
        customer_email: customer.email
      });
      
      if (forecasts.length > 0) {
        setServices(forecasts[0].services || []);
      }

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalyticsData();
    setIsRefreshing(false);
  };

  // סינון מוצרים לפי קטגוריה
  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all' || !products) return products;
    return products.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);

  // קטגוריות ייחודיות
  const uniqueCategories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }, [products]);

  const popularityData = useMemo(() => {
    return calculateProductPopularity(zReports, filteredProducts);
  }, [zReports, filteredProducts]);

  const profitabilityData = useMemo(() => {
    return categorizeByProfitability(filteredProducts, services);
  }, [filteredProducts, services]);

  // סטטיסטיקות מהירות
  const quickStats = useMemo(() => {
    if (!products || products.length === 0) return null;
    
    const totalProducts = products.length;
    const avgPrice = products.reduce((sum, p) => sum + (p.selling_price || 0), 0) / totalProducts;
    const totalInventoryValue = products.reduce((sum, p) => 
      sum + ((p.cost_price || 0) * (p.inventory || 0)), 0
    );
    const profitableCount = profitabilityData?.profitable?.length || 0;
    
    return {
      totalProducts,
      avgPrice,
      totalInventoryValue,
      profitableCount,
      profitablePercentage: totalProducts > 0 ? (profitableCount / totalProducts * 100).toFixed(0) : 0
    };
  }, [products, profitabilityData]);

  const hasZReports = zReports && zReports.length > 0;
  const hasProducts = products && products.length > 0;

  // Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* סקלטון סטטיסטיקות */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="card-horizon">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-3 bg-horizon-primary/20" />
                <Skeleton className="h-8 w-32 bg-horizon-primary/20" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* סקלטון כרטיס ראשי */}
        <Card className="card-horizon">
          <CardHeader>
            <Skeleton className="h-8 w-64 bg-horizon-primary/20" />
            <Skeleton className="h-4 w-96 mt-2 bg-horizon-primary/20" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 bg-horizon-primary/10 rounded-xl" />
              <Skeleton className="h-80 bg-horizon-primary/10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* כרטיסי סטטיסטיקה מהירה */}
      {quickStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-horizon bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">סה"כ מוצרים</span>
              </div>
              <p className="text-3xl font-bold text-horizon-text">{quickStats.totalProducts}</p>
            </CardContent>
          </Card>
          
          <Card className="card-horizon bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">אחוז רווחיים</span>
              </div>
              <p className="text-3xl font-bold text-green-400">{quickStats.profitablePercentage}%</p>
            </CardContent>
          </Card>
          
          <Card className="card-horizon bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">מחיר ממוצע</span>
              </div>
              <p className="text-3xl font-bold text-horizon-text">{formatCurrencyHebrew(quickStats.avgPrice)}</p>
            </CardContent>
          </Card>
          
          <Card className="card-horizon bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-300">שווי מלאי</span>
              </div>
              <p className="text-3xl font-bold text-horizon-text">{formatCurrencyHebrew(quickStats.totalInventoryValue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Widget המלצות מלאי */}
      <InventoryRecommendationsWidget products={filteredProducts} zReports={zReports} />

      {/* כותרת וכלי סינון */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl text-horizon-text flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-horizon-primary" />
                📊 ניתוח ותובנות עסקיות
              </CardTitle>
              <p className="text-sm text-horizon-accent mt-2">
                ניתוח מעמיק של ביצועי המוצרים, מגמות ורווחיות
              </p>
            </div>
            
            {/* כלי סינון ופעולות */}
            <div className="flex flex-wrap items-center gap-3">
              {/* סינון קטגוריה */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-horizon-accent" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 bg-horizon-card border-horizon text-horizon-text h-9">
                    <SelectValue placeholder="כל הקטגוריות" />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon" dir="rtl">
                    <SelectItem value="all">כל הקטגוריות</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* רענון */}
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="border-horizon text-horizon-accent hover:bg-horizon-card h-9"
              >
                <RefreshCw className={`w-4 h-4 ml-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                רענן
              </Button>
            </div>
          </div>
          
          {!hasZReports && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                💡 העלה דוחות Z לניתוח מכירות מלא - כרגע מוצגים נתוני קטלוג בלבד
              </p>
            </div>
          )}
          
          {categoryFilter !== 'all' && (
            <Badge className="mt-3 bg-horizon-primary/20 text-horizon-primary border-horizon-primary/30">
              מציג: {categoryFilter} ({filteredProducts?.length || 0} מוצרים)
            </Badge>
          )}
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-horizon-card h-12">
          <TabsTrigger 
            value="popularity" 
            className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white h-10 text-sm font-medium"
          >
            <TrendingUp className="w-4 h-4 ml-2" />
            פופולאריות
          </TabsTrigger>
          <TabsTrigger 
            value="profitability" 
            className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white h-10 text-sm font-medium"
          >
            <DollarSign className="w-4 h-4 ml-2" />
            רווחיות
          </TabsTrigger>
          <TabsTrigger 
            value="trends" 
            className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white h-10 text-sm font-medium"
          >
            <Calendar className="w-4 h-4 ml-2" />
            מגמות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="popularity" className="mt-6">
          <PopularityAnalysis 
            top10={popularityData.top10}
            bottom10={popularityData.bottom10}
            products={filteredProducts}
            hasZReports={hasZReports}
          />
        </TabsContent>

        <TabsContent value="profitability" className="mt-6">
          <ProfitabilityAnalysis 
            categorizedProducts={profitabilityData}
            products={filteredProducts}
            hasZReports={hasZReports}
          />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <TrendsAnalysis 
            products={filteredProducts}
            zReports={zReports}
            services={services}
            customer={customer}
            hasZReports={hasZReports}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}