import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Upload, 
  User, 
  MessageSquare, 
  ExternalLink,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DataGapsModal({ recommendation, isOpen, onClose }) {
  if (!recommendation?.related_data) return null;

  const {
    data_completeness_percentage = 0,
    data_completeness_status = 'incomplete',
    data_sources_used = [],
    missing_data_points = []
  } = recommendation.related_data;

  const getStatusConfig = () => {
    switch (data_completeness_status) {
      case 'complete':
        return { color: 'text-green-600', icon: CheckCircle };
      case 'partial':
        return { color: 'text-orange-600', icon: AlertTriangle };
      default:
        return { color: 'text-red-600', icon: XCircle };
    }
  };

  const { color, icon: StatusIcon } = getStatusConfig();

  const getActionSuggestions = () => {
    const suggestions = [];
    
    // בדיקה לפי סוגי החסרים
    missing_data_points.forEach(issue => {
      if (issue.includes('מחזור חודשי') || issue.includes('יעדים עסקיים')) {
        suggestions.push({
          type: 'customer_data',
          title: 'עדכן פרטי לקוח',
          description: 'השלם מידע על מחזור חודשי ויעדים עסקיים',
          action: 'edit_customer',
          icon: User
        });
      }
      
      if (issue.includes('מוצרים') || issue.includes('מחיר') || issue.includes('מלאי')) {
        suggestions.push({
          type: 'product_data',
          title: 'העלה קובץ מוצרים',
          description: 'העלה דוח מלאי או מכירות עדכני',
          action: 'upload_file',
          icon: Upload
        });
      }

      if (issue.includes('מכירות') || issue.includes('נתוני')) {
        suggestions.push({
          type: 'sales_data',
          title: 'העלה דוח מכירות',
          description: 'העלה נתוני מכירות חודשיים לשיפור דיוק ההמלצות',
          action: 'upload_file',
          icon: Upload
        });
      }
    });

    // הסרת כפילויות
    return suggestions.filter((item, index, self) => 
      index === self.findIndex(s => s.type === item.type)
    );
  };

  const actionSuggestions = getActionSuggestions();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-text flex items-center gap-2">
            <StatusIcon className={`w-6 h-6 ${color}`} />
            ניתוח איכות נתונים להמלצה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* כרטיס סטטוס כללי */}
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-primary text-lg">מצב כללי</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-horizon-text">רמת שלמות נתונים:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-horizon-primary">{data_completeness_percentage}%</span>
                  <Badge className={
                    data_completeness_status === 'complete' ? 'bg-green-100 text-green-800' :
                    data_completeness_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {data_completeness_status === 'complete' ? 'מלא' :
                     data_completeness_status === 'partial' ? 'חלקי' : 'חסר'}
                  </Badge>
                </div>
              </div>
              
              {data_sources_used.length > 0 && (
                <div>
                  <h4 className="font-semibold text-horizon-text mb-2">מקורות מידע זמינים:</h4>
                  <div className="flex flex-wrap gap-2">
                    {data_sources_used.map((source, index) => (
                      <Badge key={index} className="bg-green-100 text-green-800">
                        ✓ {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* חסרים מזוהים */}
          {missing_data_points.length > 0 && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-red-400 text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  חסרים מזוהים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {missing_data_points.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2 text-horizon-accent">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* הצעות פעולה */}
          {actionSuggestions.length > 0 && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-primary text-lg">פעולות מומלצות לשיפור</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actionSuggestions.map((suggestion, index) => {
                    const ActionIcon = suggestion.icon;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-horizon-card/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <ActionIcon className="w-5 h-5 text-horizon-primary" />
                          <div>
                            <h4 className="font-semibold text-horizon-text">{suggestion.title}</h4>
                            <p className="text-sm text-horizon-accent">{suggestion.description}</p>
                          </div>
                        </div>
                        
                        {suggestion.action === 'upload_file' && (
                          <Link to={createPageUrl("FileUpload")}>
                            <Button size="sm" className="btn-horizon-primary">
                              <ExternalLink className="w-4 h-4 ml-1" />
                              בצע
                            </Button>
                          </Link>
                        )}
                        
                        {suggestion.action === 'edit_customer' && (
                          <Link to={createPageUrl("CustomerManagement")}>
                            <Button size="sm" className="btn-horizon-secondary">
                              <ExternalLink className="w-4 h-4 ml-1" />
                              ערוך
                            </Button>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* הסבר על השפעה */}
          <Card className="card-horizon bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">מדוע זה חשוב?</h4>
                  <p className="text-sm text-horizon-accent">
                    ככל שיש יותר נתונים מדויקים ומלאים, כך ההמלצות יהיו ממוקדות ומדויקות יותר. 
                    השלמת הנתונים החסרים תשפר משמעותית את איכות ההמלצות העתידיות ואת הפוטנציאל הרווח שלהן.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* כפתור סגירה */}
          <div className="flex justify-center pt-4">
            <Button onClick={onClose} className="btn-horizon-primary px-8">
              סגור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}