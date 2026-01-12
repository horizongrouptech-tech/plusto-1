import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Wand2,
  Columns,
  Eye,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { base44 } from '@/api/base44Client';

// שדות המערכת הנדרשים - מורחב לתמיכה בקטלוגים מגוונים
const SYSTEM_FIELDS = [
  { key: 'product_name', label: 'שם מוצר', required: true, type: 'text' },
  { key: 'barcode', label: 'ברקוד / מק"ט', required: false, type: 'text' },
  { key: 'cost_price', label: 'מחיר עלות', required: false, type: 'number' },
  { key: 'cost_price_no_vat', label: 'מחיר עלות ללא מע"מ', required: false, type: 'number' },
  { key: 'selling_price', label: 'מחיר לצרכן', required: false, type: 'number' },
  { key: 'store_price', label: 'מחיר בחנות', required: false, type: 'number' },
  { key: 'store_price_alt', label: 'מחיר בחנות (נוסף)', required: false, type: 'number' },
  { key: 'category', label: 'קטגוריה ראשית', required: false, type: 'text' },
  { key: 'secondary_category', label: 'קטגוריה משנית', required: false, type: 'text' },
  { key: 'supplier', label: 'ספק', required: false, type: 'text' },
  { key: 'supplier_item_code', label: 'קוד פריט ספק', required: false, type: 'text' },
  { key: 'color', label: 'צבע', required: false, type: 'text' },
  { key: 'size', label: 'מידה', required: false, type: 'text' },
  { key: 'creation_date', label: 'תאריך יצירה', required: false, type: 'text' },
  { key: 'profit_percentage', label: 'אחוז רווחיות', required: false, type: 'number' },
  { key: 'no_vat_item', label: 'פריט ללא מע"מ', required: false, type: 'text' },
  { key: 'inventory', label: 'מלאי', required: false, type: 'number' },
  { key: 'monthly_sales', label: 'מכירות חודשיות', required: false, type: 'number' },
];

// מילון התאמות אוטומטיות - מורחב לתמיכה בקטלוגים מגוונים (טמבור, כללי וכו')
const AUTO_MATCH_DICTIONARY = {
  'product_name': [
    'שם מוצר', 'שם פריט', 'שם המוצר', 'תיאור', 'תאור', 'מוצר', 
    'description', 'product_name', 'name', 'item name', 'פריט', 'תחמור'
  ],
  'barcode': [
    'ברקוד', 'מק"ט', 'קוד פריט', 'מקט', 'barcode', 'sku', 'item_code', 
    'code', 'קוד', 'ברקוד / מק"ט'
  ],
  'cost_price': [
    'מחיר עלות', 'מחיר קניה', 'עלות', 'מחיר קנייה', 'cost_price', 
    'cost', 'purchase price', 'מחיר גלם'
  ],
  'cost_price_no_vat': [
    'מחיר עלות ללא מעמ', 'מחיר עלות ללא מע"מ', 'עלות ללא מעמ', 
    'cost without vat', 'cost no vat'
  ],
  'selling_price': [
    'מחיר מכירה', 'מחיר', 'מחיר לצרכן', 'selling_price', 'price', 
    'retail price', 'sale price', 'מחיר יחידה'
  ],
  'store_price': [
    'מחיר בחנות', 'מחיר בחנות טמבור אקספרס', 'מחיר בחנות טמבור אקס', 
    'store price', 'shop price'
  ],
  'store_price_alt': [
    'מחיר בחנות טמבור אקספרס אקליפטוס', 'מחיר חנות נוסף', 'store price alt'
  ],
  'category': [
    'קטגוריה', 'קטגוריה ראשית', 'קבוצה', 'קבוצה ראשית', 'category', 
    'main category', 'סוג', 'תמחורים', 'מתחורים'
  ],
  'secondary_category': [
    'קטגוריה משנית', 'תת קטגוריה', 'sub category', 'secondary_category', 
    'תפריט - מקטע', 'תפריטים - מקטעים'
  ],
  'supplier': [
    'ספק', 'שם ספק', 'supplier', 'vendor'
  ],
  'supplier_item_code': [
    'מק"ט ספק', 'מק"ט-ספק', 'קוד פריט ספק', 'supplier_sku', 'קוד ספק'
  ],
  'color': [
    'צבע', 'color', 'colour'
  ],
  'size': [
    'מידה', 'size', 'גודל'
  ],
  'creation_date': [
    'תאריך יצירה', 'תאריך', 'creation date', 'created', 'date'
  ],
  'profit_percentage': [
    'אחוז רווחיות', 'אחוז רווח', 'רווחיות', 'profit percentage', 
    'margin', 'profit margin'
  ],
  'no_vat_item': [
    'פריט ללא מעמ', 'פריט ללא מע"מ', 'ללא מעמ', 'no vat', 'vat exempt'
  ],
  'inventory': [
    'מלאי', 'כמות במלאי', 'כמות', 'inventory', 'stock', 'quantity', 'כמה נמכר'
  ],
  'monthly_sales': [
    'מכירות חודשיות', 'מכירות', 'monthly_sales', 'sales', 
    'סה"כ מכירות', 'סהכ מכירות'
  ],
};

// ניקוי ערכים
const cleanValue = (value, type) => {
  if (value === null || value === undefined || value === '') return type === 'number' ? 0 : '';
  
  const strValue = String(value).trim();
  
  if (type === 'number') {
    const cleaned = strValue
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
      .replace(/[₪$€£,\s]/g, '')
      .replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  
  return strValue.replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '').trim();
};

// זיהוי שגיאות בשורה
const validateRow = (row, mapping) => {
  const errors = [];
  
  SYSTEM_FIELDS.forEach(field => {
    const sourceColumn = mapping[field.key];
    if (!sourceColumn) return;
    
    const value = row[sourceColumn];
    
    if (field.required && (!value || String(value).trim() === '')) {
      errors.push({ field: field.key, message: `${field.label} חסר` });
    }
    
    if (field.type === 'number' && value) {
      const cleanedValue = cleanValue(value, 'number');
      if (isNaN(cleanedValue)) {
        errors.push({ field: field.key, message: `${field.label} אינו מספר תקין` });
      }
    }
  });
  
  return errors;
};

export default function ColumnMappingWizard({
  isOpen,
  onClose,
  fileHeaders,
  rawData,
  customer,
  catalogId,
  onMappingComplete,
  existingProfiles = []
}) {
  const [step, setStep] = useState(1);
  const [mapping, setMapping] = useState({});
  const [profileName, setProfileName] = useState('');
  const [saveProfile, setSaveProfile] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [validationResults, setValidationResults] = useState({ valid: [], invalid: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [importWithErrors, setImportWithErrors] = useState(true);

  // התאמה אוטומטית של עמודות
  const autoMatchColumns = () => {
    const newMapping = {};
    
    fileHeaders.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // חיפוש התאמה מדויקת קודם, אחר כך התאמה חלקית
      for (const [systemField, variants] of Object.entries(AUTO_MATCH_DICTIONARY)) {
        // התאמה מדויקת
        const exactMatch = variants.some(variant => 
          normalizedHeader === variant.toLowerCase()
        );
        
        if (exactMatch && !newMapping[systemField]) {
          newMapping[systemField] = header;
          break;
        }
      }
    });
    
    // סיבוב שני - התאמה חלקית לשדות שטרם מופו
    fileHeaders.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [systemField, variants] of Object.entries(AUTO_MATCH_DICTIONARY)) {
        if (newMapping[systemField]) continue; // כבר מופה
        
        const partialMatch = variants.some(variant => 
          normalizedHeader.includes(variant.toLowerCase()) ||
          variant.toLowerCase().includes(normalizedHeader)
        );
        
        if (partialMatch) {
          newMapping[systemField] = header;
          break;
        }
      }
    });
    
    setMapping(newMapping);
  };

  // טעינת פרופיל קיים
  const loadProfile = (profile) => {
    if (profile?.mapping_configuration) {
      setMapping(profile.mapping_configuration);
      setSelectedProfile(profile);
    }
  };

  // יצירת תצוגה מקדימה
  useEffect(() => {
    if (step === 2 && rawData.length > 0) {
      const preview = rawData.slice(0, 20).map((row, index) => {
        const mappedRow = {};
        
        SYSTEM_FIELDS.forEach(field => {
          const sourceColumn = mapping[field.key];
          if (sourceColumn && row[sourceColumn] !== undefined) {
            mappedRow[field.key] = cleanValue(row[sourceColumn], field.type);
          } else {
            mappedRow[field.key] = field.type === 'number' ? 0 : '';
          }
        });
        
        mappedRow._originalIndex = index;
        mappedRow._errors = validateRow(row, mapping);
        
        return mappedRow;
      });
      
      setPreviewData(preview);
      
      // אימות כל הנתונים
      const allValidation = rawData.map((row, index) => {
        const errors = validateRow(row, mapping);
        return { index, errors, isValid: errors.length === 0 };
      });
      
      setValidationResults({
        valid: allValidation.filter(r => r.isValid),
        invalid: allValidation.filter(r => !r.isValid)
      });
    }
  }, [step, mapping, rawData]);

  // בדיקה אם המיפוי תקין - רק שם מוצר הוא חובה
  const isMappingValid = useMemo(() => {
    // מינימום: שם מוצר חייב להיות ממופה
    const hasProductName = !!mapping['product_name'];
    // רצוי: לפחות מחיר אחד (עלות או מכירה)
    const hasAnyPrice = mapping['cost_price'] || mapping['cost_price_no_vat'] || 
                        mapping['selling_price'] || mapping['store_price'];
    return hasProductName;
  }, [mapping]);

  // שמירת הפרופיל
  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    
    try {
      await base44.entities.CatalogMappingProfile.create({
        customer_email: customer.email,
        profile_name: profileName,
        mapping_configuration: mapping,
        identifier_column: identifierColumn,
        last_used: new Date().toISOString(),
        is_active: true
      });
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // סיום התהליך
  const handleComplete = async () => {
    setIsProcessing(true);
    
    try {
      if (saveProfile && profileName) {
        await handleSaveProfile();
      }
      
      // עדכון פרופיל קיים אם נבחר
      if (selectedProfile) {
        await base44.entities.CatalogMappingProfile.update(selectedProfile.id, {
          last_used: new Date().toISOString()
        });
      }
      
      onMappingComplete({
        mapping,
        validRows: validationResults.valid.length,
        invalidRows: validationResults.invalid.length,
        importWithErrors
      });
      
    } catch (error) {
      console.error('Error completing mapping:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const unmappedHeaders = fileHeaders.filter(h => !Object.values(mapping).includes(h));
  const mappedFieldsCount = Object.keys(mapping).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-horizon-text flex items-center gap-2">
            <Columns className="w-5 h-5 text-horizon-primary" />
            אשף מיפוי עמודות - שלב {step} מתוך 3
          </DialogTitle>
          <div className="flex gap-2 mt-2">
            <div className={`h-2 flex-1 rounded ${step >= 1 ? 'bg-horizon-primary' : 'bg-horizon-card'}`} />
            <div className={`h-2 flex-1 rounded ${step >= 2 ? 'bg-horizon-primary' : 'bg-horizon-card'}`} />
            <div className={`h-2 flex-1 rounded ${step >= 3 ? 'bg-horizon-primary' : 'bg-horizon-card'}`} />
          </div>
        </DialogHeader>

        {/* שלב 1: מיפוי עמודות */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            {/* פרופילים שמורים */}
            {existingProfiles.length > 0 && (
              <Card className="bg-horizon-card/30 border-horizon">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-horizon-accent">פרופילים שמורים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {existingProfiles.map(profile => (
                      <Button
                        key={profile.id}
                        variant={selectedProfile?.id === profile.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => loadProfile(profile)}
                        className="text-xs"
                      >
                        {profile.profile_name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* כפתור התאמה אוטומטית */}
            <div className="flex justify-between items-center">
              <span className="text-horizon-accent text-sm">
                {mappedFieldsCount} שדות מופו מתוך {SYSTEM_FIELDS.length}
              </span>
              <Button onClick={autoMatchColumns} variant="outline" className="border-horizon-primary text-horizon-primary">
                <Wand2 className="w-4 h-4 ml-2" />
                התאמה אוטומטית
              </Button>
            </div>

            {/* טבלת מיפוי */}
            <div className="grid grid-cols-2 gap-4">
              {/* שדות המערכת */}
              <div>
                <h3 className="font-semibold text-horizon-text mb-3">שדות המערכת</h3>
                <div className="space-y-3">
                  {SYSTEM_FIELDS.map(field => (
                    <div key={field.key} className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-horizon-text text-sm flex items-center gap-2">
                          {field.label}
                          {field.required && <span className="text-red-400">*</span>}
                        </Label>
                      </div>
                      <Select
                        value={mapping[field.key] || ''}
                        onValueChange={(value) => {
                          setMapping(prev => ({
                            ...prev,
                            [field.key]: value === '_none_' ? undefined : value
                          }));
                        }}
                      >
                        <SelectTrigger className="w-48 bg-horizon-card border-horizon text-horizon-text text-sm">
                          <SelectValue placeholder="בחר עמודה..." />
                        </SelectTrigger>
                        <SelectContent className="bg-horizon-dark border-horizon">
                          <SelectItem value="_none_">-- ללא --</SelectItem>
                          {fileHeaders.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mapping[field.key] && (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* עמודות שלא מופו */}
              <div>
                <h3 className="font-semibold text-horizon-text mb-3">עמודות בקובץ שלא מופו</h3>
                <div className="bg-horizon-card/30 rounded-lg p-3 max-h-80 overflow-y-auto">
                  {unmappedHeaders.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {unmappedHeaders.map(header => (
                        <Badge key={header} variant="outline" className="border-horizon text-horizon-accent">
                          {header}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-400 text-sm">כל העמודות מופו!</p>
                  )}
                </div>
              </div>
            </div>

            {/* אזהרה אם חסרים שדות חובה */}
            {!isMappingValid && (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300">
                  יש למפות את כל שדות החובה (מסומנים ב-*) לפני המשך
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* שלב 2: תצוגה מקדימה ואימות */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            {/* סיכום אימות */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-green-400">{validationResults.valid.length}</div>
                    <div className="text-sm text-green-300">שורות תקינות</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <div>
                    <div className="text-2xl font-bold text-red-400">{validationResults.invalid.length}</div>
                    <div className="text-sm text-red-300">שורות עם שגיאות</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* תצוגה מקדימה */}
            <div>
              <h3 className="font-semibold text-horizon-text mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                תצוגה מקדימה (20 שורות ראשונות)
              </h3>
              <div className="overflow-x-auto border border-horizon rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-horizon-card/50">
                      <TableHead className="text-horizon-text text-right w-12">#</TableHead>
                      {SYSTEM_FIELDS.filter(f => mapping[f.key]).map(field => (
                        <TableHead key={field.key} className="text-horizon-text text-right">
                          {field.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-horizon-text text-right">סטטוס</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow 
                        key={index}
                        className={row._errors.length > 0 ? 'bg-red-500/10' : 'hover:bg-horizon-card/30'}
                      >
                        <TableCell className="text-horizon-accent">{index + 1}</TableCell>
                        {SYSTEM_FIELDS.filter(f => mapping[f.key]).map(field => (
                          <TableCell 
                            key={field.key}
                            className={`text-horizon-text ${
                              row._errors.some(e => e.field === field.key) ? 'text-red-400' : ''
                            }`}
                          >
                            {row[field.key] || '-'}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row._errors.length > 0 ? (
                            <Badge className="bg-red-500/20 text-red-400 text-xs">
                              {row._errors.length} שגיאות
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              תקין
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* אפשרויות לטיפול בשגיאות */}
            {validationResults.invalid.length > 0 && (
              <div className="space-y-3">
                <Alert className="bg-yellow-500/10 border-yellow-500/30">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300">
                    נמצאו {validationResults.invalid.length} שורות עם שגיאות.
                  </AlertDescription>
                </Alert>
                
                {/* NEW: אפשרות לייבא גם שורות עם שגיאות */}
                <Card className="bg-horizon-card/30 border-horizon">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="importWithErrors"
                        checked={importWithErrors}
                        onChange={(e) => setImportWithErrors(e.target.checked)}
                        className="mt-1 accent-horizon-primary"
                      />
                      <div className="flex-1">
                        <Label htmlFor="importWithErrors" className="text-horizon-text cursor-pointer font-medium">
                          ייבא גם שורות עם שגיאות
                        </Label>
                        <p className="text-xs text-horizon-accent mt-1">
                          השורות עם שגיאות יסומנו כ"דורשות בדיקה" ותוכל לערוך אותן מאוחר יותר בניהול הקטלוג
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* שלב 3: הגדרות נוספות */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            {/* שמירת פרופיל */}
            <Card className="bg-horizon-card/30 border-horizon">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="saveProfile"
                    checked={saveProfile}
                    onCheckedChange={setSaveProfile}
                  />
                  <Label htmlFor="saveProfile" className="text-horizon-text cursor-pointer">
                    שמור את המיפוי לשימוש עתידי
                  </Label>
                </div>
                {saveProfile && (
                  <Input
                    placeholder="שם הפרופיל (למשל: קובץ ספק X)"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                )}
              </CardContent>
            </Card>

            {/* סיכום */}
            <Card className="bg-horizon-primary/10 border-horizon-primary/30">
              <CardContent className="p-4">
                <h4 className="font-semibold text-horizon-text mb-2">סיכום לפני ייבוא</h4>
                <ul className="text-sm text-horizon-accent space-y-1">
                  <li>• {validationResults.valid.length} שורות תקינות יייובאו</li>
                  {validationResults.invalid.length > 0 && importWithErrors && (
                    <li className="text-yellow-400">• {validationResults.invalid.length} שורות עם שגיאות יייובאו (דורשות בדיקה)</li>
                  )}
                  {validationResults.invalid.length > 0 && !importWithErrors && (
                    <li className="text-red-400">• {validationResults.invalid.length} שורות עם שגיאות יידלגו</li>
                  )}
                  <li>• כל המוצרים מהקובץ יתווספו לקטלוג</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex justify-between gap-2">

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !isMappingValid}
                className="btn-horizon-primary"
              >
                הבא
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isProcessing || (validationResults.valid.length === 0 && !importWithErrors)}
                className="btn-horizon-primary"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעבד...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 ml-2" />
                    התחל ייבוא
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}