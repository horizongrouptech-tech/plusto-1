import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Building2, 
  Package, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  TrendingUp
} from "lucide-react";

// מיפוי אייקונים לפי סוג המידע
const getIconForLabel = (label) => {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('company') || lowerLabel.includes('חברה')) return Building2;
  if (lowerLabel.includes('product') || lowerLabel.includes('מוצר')) return Package;
  if (lowerLabel.includes('email') || lowerLabel.includes('מייל')) return Mail;
  if (lowerLabel.includes('phone') || lowerLabel.includes('טלפון')) return Phone;
  if (lowerLabel.includes('website') || lowerLabel.includes('אתר')) return Globe;
  if (lowerLabel.includes('address') || lowerLabel.includes('כתובת')) return MapPin;
  return Info;
};

// תרגום תוויות לעברית
const translateLabel = (label) => {
  const translations = {
    'Company Name': 'שם החברה',
    'Product Line': 'קו מוצרים',
    'Main Product Categories': 'קטגוריות מוצרים עיקריות',
    'Contact Email': 'אימייל ליצירת קשר',
    'Contact Website': 'אתר האינטרנט',
    'Contact Phone': 'טלפון ליצירת קשר',
    'Company Address': 'כתובת החברה',
    'Document Type': 'סוג המסמך',
    'Business Type': 'סוג העסק',
    'Total Products': 'סה"כ מוצרים',
    'Price Range': 'טווח מחירים',
    'Revenue': 'הכנסות',
    'Expenses': 'הוצאות',
    'Profit': 'רווח',
    'Date Range': 'טווח תאריכים'
  };
  return translations[label] || label;
};

// קביעת צבע על בסיס רמת הביטחון
const getConfidenceBadgeColor = (confidence) => {
  if (confidence >= 0.9) return 'bg-green-500 text-white';
  if (confidence >= 0.7) return 'bg-yellow-500 text-white';
  return 'bg-red-500 text-white';
};

// קביעת אייקון לרמת ביטחון
const getConfidenceIcon = (confidence) => {
  if (confidence >= 0.9) return CheckCircle;
  if (confidence >= 0.7) return AlertCircle;
  return AlertCircle;
};

export default function DocumentAnalysisViewer({ analysisData, documentType = 'מסמך' }) {
  if (!analysisData) {
    return (
      <div className="text-center py-8">
        <FileText className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
        <p className="text-horizon-accent">אין נתוני ניתוח זמינים</p>
      </div>
    );
  }

  const { 
    document_type, 
    language, 
    key_information = [], 
    summary, 
    business_relevance,
    total_products,
    categories_found,
    financial_summary
  } = analysisData;

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת וסטטוס המסמך */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-horizon-text">
            <FileText className="w-6 h-6 text-horizon-primary" />
            <div className="text-right">
              <h3 className="text-xl font-bold">
                {document_type ? `${document_type}` : documentType}
              </h3>
              <div className="flex gap-2 mt-2">
                {language && (
                  <Badge className="bg-blue-500 text-white">
                    שפה: {language === 'Hebrew' ? 'עברית' : language === 'English' ? 'אנגלית' : language}
                  </Badge>
                )}
                {total_products && (
                  <Badge className="bg-green-500 text-white">
                    <Package className="w-3 h-3 ml-1" />
                    {total_products} מוצרים
                  </Badge>
                )}
                {categories_found && (
                  <Badge className="bg-purple-500 text-white">
                    {categories_found} קטגוריות
                  </Badge>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* מידע מרכזי בטבלה מסודרת */}
      {key_information.length > 0 && (
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              מידע מרכזי שזוהה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {key_information.map((item, index) => {
                const IconComponent = getIconForLabel(item.label);
                const ConfidenceIcon = getConfidenceIcon(item.confidence);
                
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-horizon-card/30 rounded-lg border border-horizon/50 hover:border-horizon-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <IconComponent className="w-5 h-5 text-horizon-primary flex-shrink-0" />
                      <div className="text-right flex-1">
                        <div className="font-semibold text-horizon-text mb-1">
                          {translateLabel(item.label)}
                        </div>
                        <div className="text-horizon-accent text-sm break-words">
                          {item.value}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`${getConfidenceBadgeColor(item.confidence)} text-xs flex items-center gap-1`}>
                        <ConfidenceIcon className="w-3 h-3" />
                        {Math.round(item.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* סיכום עסקי */}
      {(summary || business_relevance) && (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {summary && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  סיכום המסמך
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-horizon-text text-right leading-relaxed">
                  {summary}
                </p>
              </CardContent>
            </Card>
          )}

          {business_relevance && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  רלוונטיות עסקית
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-horizon-text text-right leading-relaxed">
                  {business_relevance}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* סיכום פיננסי (אם קיים) */}
      {financial_summary && (
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              סיכום פיננסי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(financial_summary).map(([key, value], index) => (
                <div key={index} className="text-center p-3 bg-horizon-card/20 rounded-lg">
                  <div className="text-2xl font-bold text-horizon-primary">
                    {typeof value === 'number' ? `₪${value.toLocaleString()}` : value}
                  </div>
                  <div className="text-sm text-horizon-accent">{translateLabel(key)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* רמת ביטחון כללית */}
      {key_information.length > 0 && (
        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <div className="text-sm text-horizon-accent">רמת ביטחון כללית בניתוח</div>
                <div className="text-lg font-semibold text-horizon-text">
                  {Math.round((key_information.reduce((sum, item) => sum + item.confidence, 0) / key_information.length) * 100)}%
                </div>
              </div>
              <div className="text-horizon-accent">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}