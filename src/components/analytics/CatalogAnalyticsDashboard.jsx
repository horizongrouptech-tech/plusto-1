import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import PopularityAnalysis from './PopularityAnalysis';
import ProfitabilityAnalysis from './ProfitabilityAnalysis';
import TrendsAnalysis from './TrendsAnalysis';
import { calculateProductPopularity, categorizeByProfitability } from './productAnalyticsEngine';
import { base44 } from '@/api/base44Client';

export default function CatalogAnalyticsDashboard({ products, customer, selectedCatalogId }) {
  const [zReports, setZReports] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('popularity');

  useEffect(() => {
    loadAnalyticsData();
  }, [customer?.email, selectedCatalogId]);

  const loadAnalyticsData = async () => {
    if (!customer?.email) return;

    setIsLoading(true);
    try {
      // טעינת דוחות Z
      const zReportsData = await base44.entities.ZReportDetails.filter({
        customer_email: customer.email
      });
      setZReports(zReportsData);

      // טעינת תחזיות לשליפת services
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

  const popularityData = useMemo(() => {
    return calculateProductPopularity(zReports, products);
  }, [zReports, products]);

  const profitabilityData = useMemo(() => {
    return categorizeByProfitability(products, services);
  }, [products, services]);

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-horizon-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-horizon-accent">טוען נתוני ניתוח...</p>
        </CardContent>
      </Card>
    );
  }

  if (!zReports || zReports.length === 0) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
          <h3 className="text-xl font-semibold text-horizon-text mb-2">אין נתוני מכירות</h3>
          <p className="text-horizon-accent">
            העלה דוחות Z מהקופה כדי לראות ניתוח גרפי מפורט
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-2xl text-horizon-text flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-horizon-primary" />
            📊 ניתוח ותובנות עסקיות
          </CardTitle>
          <p className="text-sm text-horizon-accent mt-2">
            ניתוח מעמיק של ביצועי המוצרים, מגמות ורווחיות
          </p>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-horizon-card">
          <TabsTrigger value="popularity" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
            פופולאריות
          </TabsTrigger>
          <TabsTrigger value="profitability" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
            רווחיות
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
            מגמות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="popularity" className="mt-6">
          <PopularityAnalysis 
            top10={popularityData.top10}
            bottom10={popularityData.bottom10}
          />
        </TabsContent>

        <TabsContent value="profitability" className="mt-6">
          <ProfitabilityAnalysis 
            categorizedProducts={profitabilityData}
          />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <TrendsAnalysis 
            products={products}
            zReports={zReports}
            services={services}
            customer={customer}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}