import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Globe, Search, AlertCircle, CheckCircle, Package, Briefcase } from "lucide-react";
import { performAdvancedWebsiteScan } from "@/components/logic/advancedWebsiteScraper";

import { useAuth } from '@/lib/AuthContext';
import ScanProductTable from "./ScanProductTable";
import ScanInsightsDisplay from "./ScanInsightsDisplay";
import { WebsiteScanResult } from '@/api/entities';

export default function WebsiteScanner({ customer }) {
  const { user: currentUser } = useAuth();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scanType, setScanType] = useState('comprehensive');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLatestScan = async () => {
      try {
        // אם יש customer - טוען את הסריקות שלו, אחרת - של המשתמש המחובר
        const customerEmail = customer?.email || currentUser?.email;
        
        if (!customerEmail) {
          setIsLoading(false);
          return;
        }
        
        const latestScans = await WebsiteScanResult.filter(
          { customer_email: customerEmail },
          '-created_date',
          1
        );
        
        if (latestScans && latestScans.length > 0) {
          setScanResults(latestScans[0]);
        }
      } catch (err) {
        console.error("Failed to load latest scan", err);
        setError("שגיאה בטעינת סריקה קודמת.");
      } finally {
        setIsLoading(false);
      }
    };
    loadLatestScan();
  }, [customer?.email]);

  const handleScan = async () => {
    if (!websiteUrl) {
      setError('יש להזין כתובת אתר');
      return;
    }

    setIsScanning(true);
    setError('');
    setScanResults(null);

    try {
      console.log(`Starting optimized ${scanType} scan for ${websiteUrl}`);

      const scanResult = await performAdvancedWebsiteScan(websiteUrl, scanType);

      // שמירה עם האימייל של הלקוח או המשתמש המחובר
      const customerEmail = customer?.email || currentUser?.email;

      const savedResult = await WebsiteScanResult.create({
        customer_email: customerEmail,
        website_url: websiteUrl,
        ...scanResult
      });

      setScanResults(savedResult);
      console.log('Optimized scan completed successfully:', savedResult);

    } catch (err) {
      console.error('Error during optimized scan:', err);

      let errorMessage = 'שגיאה בסריקה';

      if (err.response?.data?.error) {
        errorMessage = `שגיאה: ${err.response.data.error}`;
      } else if (err.message) {
        if (err.message.includes('rate_limit_error') || err.message.includes('429')) {
          errorMessage = 'הסריקה נכשלה עקב עומס. אנא נסה שוב בעוד מספר דקות.';
        } else if (err.message.includes('tokens') || err.message.includes('too long')) {
          errorMessage = 'האתר גדול מדי לסריקה. אנא נסה עם אתר קטן יותר או בחר "סריקה מהירה".';
        } else {
          errorMessage = `שגיאה בסריקה: ${err.message}`;
        }
      }

      setError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const getQualityScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const qualityScore = scanResults?.technical_details?.data_quality?.overall_score || 0;
  const displayScore = Math.round(qualityScore);

  const pagesScanned = scanResults?.scan_metadata?.total_pages_scraped || 0;
  const productsFound = scanResults?.scan_metadata?.total_products_found || 0;
  const servicesFound = scanResults?.scan_metadata?.total_services_found || 0;
  const profitOpportunities = scanResults?.business_analysis?.business_opportunities?.immediate_opportunities?.length || 0;
  const websiteType = scanResults?.website_type || 'unknown';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
        <p className="mr-4 text-horizon-text">טוען נתוני סריקה...</p>
      </div>);

  }

  return (
    <div className="max-w-7xl mx-auto p-6" dir="rtl">
      <Card className="card-horizon mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Globe className="w-6 h-6 text-horizon-primary" />
            סריקת אתרים מתקדמת - עד 100 דפים
          </CardTitle>
          <p className="text-horizon-accent mt-2">
            סריקה חכמה של אתרי מסחר ותדמית עם המלצות מותאמות
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <Label htmlFor="websiteUrl" className="text-horizon-text">כתובת אתר לסריקה</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
                disabled={isScanning} />

            </div>

            <div>
              <Label htmlFor="scanType" className="text-horizon-text">סוג סריקה</Label>
              <Select value={scanType} onValueChange={setScanType} disabled={isScanning}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">סריקה מקיפה (עד 100 דפים)</SelectItem>
                  <SelectItem value="basic">סריקה מהירה (עד 30 דפים)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleScan}
            disabled={isScanning || !websiteUrl}
            className="w-full btn-horizon-primary">

            {isScanning ?
            <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מבצע סריקה מתקדמת...
              </> :

            <>
                <Search className="w-4 h-4 mr-2" />
                התחל סריקה חכמה
              </>
            }
          </Button>

          {error &&
          <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          }
        </CardContent>
      </Card>

      {scanResults &&
      <div className="space-y-6">
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-horizon-text">
                  תוצאות סריקה
                </h3>
                <Badge className={
              websiteType === 'e-commerce' ? 'bg-blue-500/20 text-blue-400' :
              websiteType === 'informational' ? 'bg-purple-500/20 text-purple-400' :
              websiteType === 'hybrid' ? 'bg-green-500/20 text-green-400' :
              'bg-gray-500/20 text-gray-400'
              }>
                  {websiteType === 'e-commerce' ? 'אתר מסחר' :
                websiteType === 'informational' ? 'אתר תדמית' :
                websiteType === 'hybrid' ? 'היברידי' : 'לא זוהה'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-horizon-card/30 p-4 rounded-lg text-center">
                <p className="text-sm text-horizon-accent">דפים שנסרקו</p>
                <p className="text-2xl font-bold text-blue-400">{pagesScanned}</p>
              </div>
              {productsFound > 0 &&
            <div className="bg-horizon-card/30 p-4 rounded-lg text-center">
                  <p className="text-sm text-horizon-accent">מוצרים שנמצאו</p>
                  <p className="text-2xl font-bold text-horizon-text">{productsFound}</p>
                </div>
            }
              {servicesFound > 0 &&
            <div className="bg-horizon-card/30 p-4 rounded-lg text-center">
                  <p className="text-sm text-horizon-accent">שירותים שזוהו</p>
                  <p className="text-2xl font-bold text-purple-400">{servicesFound}</p>
                </div>
            }
              <div className="bg-horizon-card/30 p-4 rounded-lg text-center">
                <p className="text-sm text-horizon-accent">המלצות לשיפור</p>
                <p className="text-2xl font-bold text-green-400">{profitOpportunities}</p>
              </div>
              <div className="bg-horizon-card/30 p-4 rounded-lg text-center">
                <p className="text-sm text-horizon-accent">ציון איכות</p>
                <p className={`text-2xl font-bold ${getQualityScoreColor(displayScore)}`}>
                  {displayScore}/100
                </p>
              </div>
            </CardContent>
          </Card>
          
          <ScanInsightsDisplay
          insights={scanResults.business_analysis}
          informationalAnalysis={scanResults.informational_analysis}
          websiteType={scanResults.website_type}
          technicalRecommendations={scanResults.technical_details} />

          
          {scanResults.products && scanResults.products.length > 0 &&
        <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-horizon-primary">
                  <Package className="w-5 h-5" />
                  קטלוג מוצרים מלא ({scanResults.products.length} מוצרים)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScanProductTable products={scanResults.products} />
              </CardContent>
            </Card>
        }

          {scanResults.services && scanResults.services.length > 0 &&
        <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-horizon-primary">
                  <Briefcase className="w-5 h-5" />
                  שירותים שזוהו ({scanResults.services.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanResults.services.map((service, idx) =>
              <div key={idx} className="bg-horizon-card/30 p-4 rounded-lg border border-horizon">
                      <h4 className="font-semibold text-horizon-text text-lg">{service.name}</h4>
                      {service.category &&
                <Badge className="text-zinc-900 mt-2 px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" variant="outline">{service.category}</Badge>
                }
                      <p className="text-sm text-horizon-accent mt-2">{service.description}</p>
                      {service.features && service.features.length > 0 &&
                <ul className="list-disc pr-5 mt-2 text-sm text-horizon-accent">
                          {service.features.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                }
                    </div>
              )}
                </div>
              </CardContent>
            </Card>
        }
        </div>
      }
    </div>);

}