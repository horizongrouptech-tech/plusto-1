import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Table, 
  Eye, 
  Download,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";

export default function DynamicFileDisplay({ 
  fileData, 
  customer, 
  onSave 
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const { fileMetadata, analysisResult, extractedData } = fileData;

  const getFileTypeIcon = (strategy) => {
    switch (strategy) {
      case 'tabular': return FileSpreadsheet;
      case 'document': return FileText;
      case 'structured': return Table;
      case 'image': return Eye;
      default: return FileText;
    }
  };

  const getFileTypeBadge = (fileType) => {
    const typeMap = {
      'products': { label: 'מוצרים', color: 'bg-blue-500' },
      'sales': { label: 'מכירות', color: 'bg-green-500' },
      'financial': { label: 'פיננסי', color: 'bg-purple-500' },
      'promotions': { label: 'מבצעים', color: 'bg-orange-500' },
      'inventory': { label: 'מלאי', color: 'bg-teal-500' },
      'other': { label: 'אחר', color: 'bg-gray-500' }
    };

    const type = typeMap[fileType] || typeMap.other;
    return <Badge className={`${type.color} text-white`}>{type.label}</Badge>;
  };

  const getLanguageBadge = (language) => {
    const langMap = {
      'hebrew': { label: 'עברית', color: 'bg-blue-600' },
      'english': { label: 'English', color: 'bg-red-600' },
      'mixed': { label: 'מעורב', color: 'bg-yellow-600' }
    };

    const lang = langMap[language] || langMap.mixed;
    return <Badge className={`${lang.color} text-white`}>{lang.label}</Badge>;
  };

  const renderTablePreview = (data, maxRows = 5) => {
    if (!data || data.length === 0) return <p className="text-horizon-accent">אין נתונים להצגה</p>;

    const headers = Object.keys(data[0]);
    const displayData = data.slice(0, maxRows);

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-horizon">
          <thead>
            <tr className="bg-horizon-card">
              {headers.map((header, index) => (
                <th key={index} className="border border-horizon p-2 text-right text-horizon-text font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-horizon-card/50">
                {headers.map((header, colIndex) => (
                  <td key={colIndex} className="border border-horizon p-2 text-right text-horizon-text">
                    {String(row[header] || '').substring(0, 50)}
                    {String(row[header] || '').length > 50 && '...'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > maxRows && (
          <p className="text-sm text-horizon-accent mt-2 text-center">
            מציג {maxRows} מתוך {data.length} רשומות
          </p>
        )}
      </div>
    );
  };

  const IconComponent = getFileTypeIcon(fileMetadata.strategy);

  return (
    <Card className="card-horizon">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <IconComponent className="w-6 h-6 text-horizon-primary" />
            תוצאות עיבוד קובץ: {fileMetadata.name}
          </CardTitle>
          <div className="flex gap-2">
            {getFileTypeBadge(analysisResult.file_type)}
            {getLanguageBadge(analysisResult.language)}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-4 bg-horizon-card">
            <TabsTrigger value="overview">סקירה</TabsTrigger>
            <TabsTrigger value="structure">מבנה</TabsTrigger>
            <TabsTrigger value="data">נתונים</TabsTrigger>
            <TabsTrigger value="analysis">ניתוח</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-horizon-text">
                    {fileMetadata.strategy}
                  </div>
                  <div className="text-sm text-horizon-accent">אסטרטגיית עיבוד</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-horizon-text">
                    {analysisResult.total_rows || extractedData?.total_extracted || 0}
                  </div>
                  <div className="text-sm text-horizon-accent">רשומות</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-horizon-text">
                    {analysisResult.columns_detected?.length || 0}
                  </div>
                  <div className="text-sm text-horizon-accent">עמודות</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {Math.round((fileMetadata.size / 1024) * 100) / 100}KB
                  </div>
                  <div className="text-sm text-horizon-accent">גודל קובץ</div>
                </CardContent>
              </Card>
            </div>

            {/* המלצות עיבוד */}
            {analysisResult.processing_recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-horizon-text flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    המלצות עיבוד
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.processing_recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-horizon-text">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="structure" className="space-y-4">
            {/* מבנה עמודות */}
            {analysisResult.columns_detected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-horizon-text">מבנה העמודות</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResult.columns_detected.map((col, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-horizon rounded-lg">
                        <div>
                          <div className="font-medium text-horizon-text">{col.original_name}</div>
                          <div className="text-sm text-horizon-accent">
                            סוג: {col.data_type} | מיפוי מוצע: {col.suggested_mapping || 'לא זוהה'}
                          </div>
                        </div>
                        <Badge 
                          className={
                            col.confidence >= 0.8 ? 'bg-green-500 text-white' :
                            col.confidence >= 0.6 ? 'bg-yellow-500 text-white' :
                            'bg-red-500 text-white'
                          }
                        >
                          {Math.round(col.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            {/* תצוגת נתונים */}
            <Card>
              <CardHeader>
                <CardTitle className="text-horizon-text">דגימת נתונים</CardTitle>
              </CardHeader>
              <CardContent>
                {analysisResult.sample_data ? 
                  renderTablePreview(analysisResult.sample_data) :
                  extractedData?.records ? 
                    renderTablePreview(extractedData.records) :
                    <p className="text-horizon-accent">אין נתונים זמינים לתצוגה</p>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {/* ניתוח מתקדם */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-horizon-text">איכות נתונים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">שלמות נתונים:</span>
                      <span className="text-horizon-text font-medium">
                        {Math.round((analysisResult.columns_detected?.filter(c => c.confidence > 0.7).length || 0) / 
                        (analysisResult.columns_detected?.length || 1) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">אמינות זיהוי:</span>
                      <span className="text-horizon-text font-medium">
                        {analysisResult.columns_detected ? 
                          Math.round(analysisResult.columns_detected.reduce((acc, col) => acc + col.confidence, 0) / 
                          analysisResult.columns_detected.length * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-horizon-text">מטאדטה</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">סוג MIME:</span>
                      <span className="text-horizon-text">{fileMetadata.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">אסטרטגיה:</span>
                      <span className="text-horizon-text">{fileMetadata.strategy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">זוהה כ:</span>
                      <span className="text-horizon-text">{analysisResult.file_type}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* כפתורי פעולה */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-horizon">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            ייצא תוצאות
          </Button>
          <Button 
            onClick={() => onSave(fileData)}
            className="btn-horizon-primary gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            שמור והמשך
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}