
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, GitBranch } from "lucide-react";

// שדות מערכת זמינים למיפוי
const SYSTEM_FIELDS = {
  product_fields: {
    label: 'שדות מוצר',
    fields: {
      'product_name': 'שם מוצר',
      'barcode': 'ברקוד',
      'cost_price': 'מחיר עלות',
      'selling_price': 'מחיר מכירה', 
      'category': 'קטגוריה',
      'supplier': 'ספק',
      'inventory': 'מלאי',
      'monthly_sales': 'מכירות חודשיות'
    }
  },
  financial_fields: {
    label: 'שדות פיננסיים',
    fields: {
      'total_revenue': 'סך הכנסות',
      'cost_of_goods_sold': 'עלות המכר',
      'gross_profit': 'רווח גולמי',
      'operating_expenses': 'הוצאות תפעול',
      'net_profit': 'רווח נקי'
    }
  },
  sales_fields: {
    label: 'שדות מכירות',
    fields: {
      'sale_date': 'תאריך מכירה',
      'quantity': 'כמות',
      'unit_price': 'מחיר יחידה',
      'total_price': 'סך הכל',
      'customer_id': 'מזהה לקוח'
    }
  },
  promotion_fields: {
    label: 'שדות מבצעים',
    fields: {
      'promotion_code': 'קוד מבצע',
      'title': 'כותרת',
      'description': 'תיאור',
      'start_date': 'תאריך תחילה',
      'end_date': 'תאריך סיום',
      'is_active': 'פעיל'
    }
  }
};

export default function ColumnMappingModal({ 
  isOpen, 
  columns, 
  onMappingComplete, 
  onCancel,
  suggestedFileType = 'product'
}) {
  const [mappings, setMappings] = useState({});
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (columns) {
      // איתחול מיפויים עם הצעות AI
      const initialMappings = {};
      columns.forEach(col => {
        if (col.suggested_mapping && col.confidence > 0.7) {
          initialMappings[col.original_name] = col.suggested_mapping;
        }
      });
      setMappings(initialMappings);
    }
  }, [columns]);

  useEffect(() => {
    // בדיקת תקינות - לפחות עמודה אחת ממופה
    setIsValid(Object.keys(mappings).length > 0);
  }, [mappings]);

  const handleMappingChange = (columnName, systemField) => {
    setMappings(prev => ({
      ...prev,
      [columnName]: systemField === 'unmapped' ? undefined : systemField
    }));
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'ביטחון גבוה';
    if (confidence >= 0.6) return 'ביטחון בינוני';
    return 'ביטחון נמוך';
  };

  const handleSubmit = () => {
    if (isValid) {
      // סינון מיפויים ריקים
      const cleanMappings = Object.fromEntries(
        Object.entries(mappings).filter(([_, value]) => value !== undefined)
      );
      onMappingComplete(cleanMappings);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-horizon-text flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-horizon-primary" />
            מיפוי עמודות לשדות מערכת
          </DialogTitle>
          <p className="text-horizon-accent text-right">
            קבץ את העמודות שזוהו לשדות המתאימים במערכת. עמודות עם ביטחון נמוך דורשות בדיקה ידנית.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* סטטיסטיקות */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-horizon-text">{columns?.length || 0}</div>
                <div className="text-sm text-horizon-accent">עמודות זוהו</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {columns?.filter(c => c.confidence >= 0.8).length || 0}
                </div>
                <div className="text-sm text-horizon-accent">ביטחון גבוה</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-horizon-primary">
                  {Object.keys(mappings).length}
                </div>
                <div className="text-sm text-horizon-accent">ממופות</div>
              </CardContent>
            </Card>
          </div>

          {/* טבלת מיפוי */}
          <Card>
            <CardHeader>
              <CardTitle className="text-horizon-text">מיפוי עמודות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {columns?.map((column, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border border-horizon rounded-lg">
                    {/* עמודה מקורית */}
                    <div className="flex-1">
                      <div className="font-medium text-horizon-text">{column.original_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          className={`${getConfidenceColor(column.confidence)} text-white text-xs`}
                        >
                          {getConfidenceText(column.confidence)}
                        </Badge>
                        <span className="text-xs text-horizon-accent">
                          {column.data_type}
                        </span>
                      </div>
                    </div>

                    {/* חץ */}
                    <div className="text-horizon-accent">←</div>

                    {/* בחירת שדה מערכת */}
                    <div className="flex-1">
                      <Select
                        value={mappings[column.original_name] || 'unmapped'}
                        onValueChange={(value) => handleMappingChange(column.original_name, value)}
                      >
                        <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                          <SelectValue placeholder="בחר שדה מערכת" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">לא ממופה</SelectItem>
                          {Object.entries(SYSTEM_FIELDS).map(([groupKey, group]) => (
                            <React.Fragment key={groupKey}>
                              <div className="px-2 py-1 text-sm font-semibold text-horizon-accent border-b">
                                {group.label}
                              </div>
                              {Object.entries(group.fields).map(([fieldKey, fieldLabel]) => (
                                <SelectItem key={fieldKey} value={fieldKey}>
                                  {fieldLabel}
                                </SelectItem>
                              ))}
                            </React.Fragment>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* אינדיקטור סטטוס */}
                    <div className="w-6 h-6 flex items-center justify-center">
                      {mappings[column.original_name] ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid}
            className="btn-horizon-primary"
          >
            שמור מיפוי והמשך
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
