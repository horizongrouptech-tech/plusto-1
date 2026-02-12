import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Star,
  Phone,
  Mail,
  MapPin,
  Package,
  TrendingUp,
  Upload,
  FileText,
  DollarSign,
  ShoppingCart,
  Building,
  User,
  Clock,
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  X
} from "lucide-react";
import SpecificFileUploadBox from "./SpecificFileUploadBox";
import { PurchaseRecord } from "@/entities/PurchaseRecord";
import { formatCurrency } from "../utils/currencyFormatter";
import { base44 } from '@/api/base44Client';
import EditSupplierModal from "../shared/EditSupplierModal";

import { toast } from "sonner";
// פונקציית עזר לעיבוד נתוני הגרף לפי חודשים
const processExpenseDataByMonth = (purchaseRecords) => {
  const monthlyData = {};
  
  purchaseRecords.forEach(record => {
    if (!record.purchase_date || !record.total_amount) return;
    
    const date = new Date(record.purchase_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthLabel,
        amount: 0,
        sortKey: monthKey
      };
    }
    
    monthlyData[monthKey].amount += record.total_amount;
  });
  
  return Object.values(monthlyData)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(item => ({
      month: item.month,
      amount: item.amount
    }));
};

export default function SupplierDetailsModal({ supplier, customerEmail, isOpen, onClose, onFindAlternatives, onSupplierUpdated }) {
  const [currentSupplier, setCurrentSupplier] = useState(supplier);
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [selectedPurchaseRecordId, setSelectedPurchaseRecordId] = useState(null);
  const [currentPurchaseItems, setCurrentPurchaseItems] = useState([]);
  const [expenseHistoryData, setExpenseHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditSupplierDialog, setShowEditSupplierDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [manualEntry, setManualEntry] = useState({
    document_type: 'invoice',
    purchase_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    total_amount: 0,
    items: [{ description: '', quantity: 1, unit_price: 0, total_price: 0 }]
  });

  useEffect(() => {
    setCurrentSupplier(supplier);
  }, [supplier]);

  useEffect(() => {
    if (isOpen && supplier) {
      // טעינת נתוני מסמכי הרכש
      const loadPurchaseData = async () => {
        if (!supplier?.id) return;
        
        setIsLoading(true);
        try {
          const records = await PurchaseRecord.filter({ supplier_id: supplier.id }, '-purchase_date');
          setPurchaseRecords(records);
          
          if (records.length > 0) {
            // בחר את המסמך האחרון כברירת מחדל
            const latestRecord = records[0];
            setSelectedPurchaseRecordId(latestRecord.id);
            setCurrentPurchaseItems(latestRecord.items || []);
          } else {
            setSelectedPurchaseRecordId(null);
            setCurrentPurchaseItems([]);
          }
          
          // עיבוד נתוני הגרף לפי חודשים
          const monthlyExpenseData = processExpenseDataByMonth(records);
          setExpenseHistoryData(monthlyExpenseData);
          
        } catch (error) {
          console.error("Error loading purchase records:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadPurchaseData();
    }
  }, [isOpen, supplier]);

  // פונקציה לטיפול בבחירת מסמך רכש
  const handlePurchaseRecordSelection = (recordId) => {
    const selectedRecord = purchaseRecords.find(record => record.id === recordId);
    if (selectedRecord) {
      setSelectedPurchaseRecordId(recordId);
      setCurrentPurchaseItems(selectedRecord.items || []);
    }
  };

  // פונקציה לטיפול בהשלמת העלאת מסמך
  const handleUploadComplete = () => {
    // רענן את רשימת מסמכי הרכש
    const loadPurchaseData = async () => {
      if (!supplier?.id) return;
      
      setIsLoading(true);
      try {
        const records = await PurchaseRecord.filter({ supplier_id: supplier.id }, '-purchase_date');
        setPurchaseRecords(records);
        
        if (records.length > 0) {
          // בחר את המסמך האחרון כברירת מחדל
          const latestRecord = records[0];
          setSelectedPurchaseRecordId(latestRecord.id);
          setCurrentPurchaseItems(latestRecord.items || []);
        } else {
          setSelectedPurchaseRecordId(null);
          setCurrentPurchaseItems([]);
        }
        
        // עיבוד נתוני הגרף לפי חודשים
        const monthlyExpenseData = processExpenseDataByMonth(records);
        setExpenseHistoryData(monthlyExpenseData);
        
      } catch (error) {
        console.error("Error loading purchase records:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPurchaseData();
    // רענן את מפתח ה-upload כדי לאפשר העלאות חדשות
    setUploadKey(prev => prev + 1);
  };

  const renderStarRating = (rating) => {
    if (!rating) return <span className="text-horizon-accent text-sm">לא דורג</span>;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-horizon-text mr-1">{rating}/5</span>
      </div>
    );
  };

  /* commented out - partner supplier feature disabled for now
  const renderSupplierStatus = () => {
    if (supplier.is_partner_supplier) {
      return (
        <Badge className="bg-orange-500 text-white border-orange-600 font-semibold">
          ספק שותף
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-horizon-secondary text-horizon-accent">
        ספק רגיל
      </Badge>
    );
  };
  */

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dir-rtl bg-horizon-dark border-horizon">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl text-horizon-text text-right flex items-center gap-3">
              <Building className="w-6 h-6 text-horizon-primary" />
              פרטי ספק: {currentSupplier.name}
            </DialogTitle>
            <Button
              variant="outline"
              onClick={() => {
                setEditingSupplier(currentSupplier);
                setShowEditSupplierDialog(true);
              }}
              className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
            >
              <Edit className="w-4 h-4 ml-2" />
              ערוך ספק
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* פרטי הספק */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* כרטיס פרטי ספק */}
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  <User className="w-5 h-5 text-horizon-primary" />
                  פרטי הספק
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* commented out - partner supplier feature disabled for now
                <div className="flex items-center justify-between">
                  <span className="text-horizon-accent">סטטוס:</span>
                  {renderSupplierStatus()}
                </div>
                */}
                
                <div className="flex items-center justify-between">
                  <span className="text-horizon-accent">דירוג:</span>
                  {renderStarRating(supplier.rating)}
                </div>

                {currentSupplier.contact_person && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-horizon-accent" />
                    <span className="text-horizon-text">{currentSupplier.contact_person}</span>
                  </div>
                )}

                {currentSupplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-horizon-accent" />
                    <a href={`tel:${currentSupplier.phone}`} className="text-horizon-primary hover:underline">
                      {currentSupplier.phone}
                    </a>
                  </div>
                )}

                {currentSupplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-horizon-accent" />
                    <a href={`mailto:${currentSupplier.email}`} className="text-horizon-primary hover:underline">
                      {currentSupplier.email}
                    </a>
                  </div>
                )}

                {currentSupplier.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-horizon-accent" />
                    <span className="text-horizon-text">{currentSupplier.address}</span>
                  </div>
                )}

                {currentSupplier.category && (
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-horizon-accent" />
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {currentSupplier.category}
                    </Badge>
                  </div>
                )}

                {currentSupplier.payment_terms && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-horizon-accent" />
                    <span className="text-horizon-text">{currentSupplier.payment_terms}</span>
                  </div>
                )}

                {currentSupplier.delivery_time && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-horizon-accent" />
                    <span className="text-horizon-text">זמן אספקה: {currentSupplier.delivery_time}</span>
                  </div>
                )}

                {onFindAlternatives && currentSupplier.category && (
                  <div className="pt-3 border-t border-horizon">
                    <Button
                      variant="outline"
                      onClick={() => onFindAlternatives(currentSupplier.category)}
                      className="w-full"
                    >
                      <Search className="w-4 h-4 ml-2" />
                      מצא ספקים חלופיים ב{currentSupplier.category}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* העלאת מסמכי רכש */}
            <Card className="card-horizon">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-horizon-text flex items-center gap-2">
                    <Upload className="w-5 h-5 text-horizon-primary" />
                    העלאת מסמכי רכש
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setManualEntry({
                        document_type: 'invoice',
                        purchase_date: new Date().toISOString().split('T')[0],
                        invoice_number: '',
                        total_amount: 0,
                        items: [{ description: '', quantity: 1, unit_price: 0, total_price: 0 }]
                      });
                      setShowManualEntryDialog(true);
                    }}
                    className="btn-horizon-primary"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף רכישה ידנית
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <SpecificFileUploadBox
                  key={uploadKey}
                  customerEmail={customerEmail}
                  category="purchase_document"
                  title="מסמך רכש חדש"
                  description="העלה חשבונית, תעודת משלוח או הזמנת רכש"
                  icon={FileText}
                  context={{ supplier_id: currentSupplier.id }}
                  onUploadComplete={handleUploadComplete}
                />
              </CardContent>
            </Card>
          </div>

          {/* בחירת מסמך רכש לצפייה */}
          {purchaseRecords.length > 0 && (
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  <FileText className="w-5 h-5 text-horizon-primary" />
                  בחר מסמך רכש לצפייה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {purchaseRecords.map((record) => (
                    <div
                      key={record.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedPurchaseRecordId === record.id
                          ? 'bg-horizon-primary/10 border-horizon-primary'
                          : 'bg-horizon-card border-horizon hover:border-horizon-primary/50'
                      } cursor-pointer transition-all`}
                      onClick={() => handlePurchaseRecordSelection(record.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-horizon-text">
                            {record.document_type === 'invoice' ? 'חשבונית' : 
                             record.document_type === 'delivery_note' ? 'תעודת משלוח' :
                             record.document_type === 'purchase_order' ? 'הזמנת רכש' : 'מסמך'} 
                            {record.invoice_number ? ` #${record.invoice_number}` : ''}
                          </span>
                        </div>
                        <div className="text-sm text-horizon-accent mt-1">
                          {new Date(record.purchase_date).toLocaleDateString('he-IL')} - {formatCurrency(record.total_amount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRecord(record);
                            setShowEditDialog(true);
                          }}
                          className="h-8 w-8 text-horizon-primary hover:bg-horizon-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('האם אתה בטוח שברצונך למחוק את המסמך?')) {
                              try {
                                await PurchaseRecord.delete(record.id);
                                handleUploadComplete();
                              } catch (error) {
                                console.error('Error deleting record:', error);
                                toast.error('שגיאה במחיקת המסמך: ' + error.message);
                              }
                            }
                          }}
                          className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* גרף הוצאות לאורך זמן */}
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-horizon-primary" />
                  הוצאות לאורך זמן
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenseHistoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={expenseHistoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => `₪${(value/1000).toFixed(0)}K`}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'סכום']}
                        labelFormatter={(label) => `חודש: ${label}`}
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB',
                          direction: 'rtl'
                        }}
                      />
                      <Bar 
                        dataKey="amount" 
                        fill="#00C184" 
                        radius={[4, 4, 0, 0]}
                        name="סכום הוצאות"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 text-horizon-accent" />
                    <p className="text-horizon-accent">אין נתוני הוצאות להצגה</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* פירוט מוצרים שנרכשו */}
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-horizon-primary" />
                  פירוט מוצרים שנרכשו
                  {selectedPurchaseRecordId && (
                    <Badge variant="outline" className="mr-2">
                      מסמך נבחר
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-horizon-primary ml-3" />
                    <span className="text-horizon-accent">טוען נתונים...</span>
                  </div>
                ) : currentPurchaseItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-horizon">
                          <th className="text-right py-2 text-horizon-accent">תיאור</th>
                          <th className="text-right py-2 text-horizon-accent">כמות</th>
                          <th className="text-right py-2 text-horizon-accent">מחיר יחידה</th>
                          <th className="text-right py-2 text-horizon-accent">סה"כ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPurchaseItems.map((item, index) => (
                          <tr key={index} className="border-b border-horizon/50">
                            <td className="py-2 text-horizon-text">{item.description || '-'}</td>
                            <td className="py-2 text-horizon-text">{item.quantity || '-'}</td>
                            <td className="py-2 text-horizon-text">
                              {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                            </td>
                            <td className="py-2 text-horizon-text font-medium">
                              {item.total_price ? formatCurrency(item.total_price) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-horizon-accent" />
                    <p className="text-horizon-accent">
                      {selectedPurchaseRecordId 
                        ? "לא נמצאו פריטים במסמך הנבחר" 
                        : "בחר מסמך רכש כדי לראות את הפירוט"
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>

      {/* דיאלוג הוספת רכישה ידנית */}
      <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text">הוספת רכישה ידנית</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-horizon-accent">סוג מסמך</Label>
                <Select
                  value={manualEntry.document_type}
                  onValueChange={(v) => setManualEntry({ ...manualEntry, document_type: v })}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">חשבונית</SelectItem>
                    <SelectItem value="delivery_note">תעודת משלוח</SelectItem>
                    <SelectItem value="purchase_order">הזמנת רכש</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-horizon-accent">תאריך</Label>
                <Input
                  type="date"
                  value={manualEntry.purchase_date}
                  onChange={(e) => setManualEntry({ ...manualEntry, purchase_date: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-horizon-accent">מספר חשבונית/מסמך</Label>
                <Input
                  value={manualEntry.invoice_number}
                  onChange={(e) => setManualEntry({ ...manualEntry, invoice_number: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="אופציונלי"
                />
              </div>
              <div>
                <Label className="text-horizon-accent">סה"כ (₪)</Label>
                <Input
                  type="number"
                  value={manualEntry.total_amount}
                  onChange={(e) => setManualEntry({ ...manualEntry, total_amount: parseFloat(e.target.value) || 0 })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
            </div>
            <div>
              <Label className="text-horizon-accent mb-2 block">פריטים</Label>
              <div className="space-y-2">
                {manualEntry.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 p-2 bg-horizon-card rounded">
                    <Input
                      placeholder="תיאור"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...manualEntry.items];
                        newItems[idx].description = e.target.value;
                        setManualEntry({ ...manualEntry, items: newItems });
                      }}
                      className="bg-horizon-dark border-horizon text-horizon-text"
                    />
                    <Input
                      type="number"
                      placeholder="כמות"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...manualEntry.items];
                        newItems[idx].quantity = parseFloat(e.target.value) || 0;
                        newItems[idx].total_price = newItems[idx].quantity * newItems[idx].unit_price;
                        setManualEntry({ ...manualEntry, items: newItems });
                      }}
                      className="bg-horizon-dark border-horizon text-horizon-text"
                    />
                    <Input
                      type="number"
                      placeholder="מחיר יחידה"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...manualEntry.items];
                        newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                        newItems[idx].total_price = newItems[idx].quantity * newItems[idx].unit_price;
                        setManualEntry({ ...manualEntry, items: newItems });
                      }}
                      className="bg-horizon-dark border-horizon text-horizon-text"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="סהכ"
                        value={item.total_price}
                        readOnly
                        className="bg-horizon-dark/50 border-horizon text-horizon-text"
                      />
                      {manualEntry.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newItems = manualEntry.items.filter((_, i) => i !== idx);
                            setManualEntry({ ...manualEntry, items: newItems });
                          }}
                          className="text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setManualEntry({
                      ...manualEntry,
                      items: [...manualEntry.items, { description: '', quantity: 1, unit_price: 0, total_price: 0 }]
                    });
                  }}
                  className="w-full border-horizon text-horizon-text"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף פריט
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowManualEntryDialog(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={async () => {
                setIsSaving(true);
                try {
                  const total = manualEntry.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
                  await PurchaseRecord.create({
                    supplier_id: supplier.id,
                    customer_email: customerEmail,
                    document_type: manualEntry.document_type,
                    purchase_date: manualEntry.purchase_date,
                    invoice_number: manualEntry.invoice_number || null,
                    total_amount: total || manualEntry.total_amount,
                    items: manualEntry.items
                  });
                  handleUploadComplete();
                  setShowManualEntryDialog(false);
                } catch (error) {
                  console.error('Error creating purchase record:', error);
                  toast.error('שגיאה ביצירת רכישה: ' + error.message);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="btn-horizon-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג עריכת מסמך */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text">עריכת מסמך רכש</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-horizon-accent">סוג מסמך</Label>
                  <Select
                    value={editingRecord.document_type}
                    onValueChange={(v) => setEditingRecord({ ...editingRecord, document_type: v })}
                  >
                    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">חשבונית</SelectItem>
                      <SelectItem value="delivery_note">תעודת משלוח</SelectItem>
                      <SelectItem value="purchase_order">הזמנת רכש</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-horizon-accent">תאריך</Label>
                  <Input
                    type="date"
                    value={editingRecord.purchase_date ? new Date(editingRecord.purchase_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, purchase_date: e.target.value })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-horizon-accent">מספר חשבונית/מסמך</Label>
                  <Input
                    value={editingRecord.invoice_number || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, invoice_number: e.target.value })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>
                <div>
                  <Label className="text-horizon-accent">סה"כ (₪)</Label>
                  <Input
                    type="number"
                    value={editingRecord.total_amount || 0}
                    onChange={(e) => setEditingRecord({ ...editingRecord, total_amount: parseFloat(e.target.value) || 0 })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>
              </div>
              <div>
                <Label className="text-horizon-accent mb-2 block">פריטים</Label>
                <div className="space-y-2">
                  {(editingRecord.items || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 p-2 bg-horizon-card rounded">
                      <Input
                        placeholder="תיאור"
                        value={item.description || ''}
                        onChange={(e) => {
                          const newItems = [...(editingRecord.items || [])];
                          newItems[idx].description = e.target.value;
                          setEditingRecord({ ...editingRecord, items: newItems });
                        }}
                        className="bg-horizon-dark border-horizon text-horizon-text"
                      />
                      <Input
                        type="number"
                        placeholder="כמות"
                        value={item.quantity || 0}
                        onChange={(e) => {
                          const newItems = [...(editingRecord.items || [])];
                          newItems[idx].quantity = parseFloat(e.target.value) || 0;
                          newItems[idx].total_price = newItems[idx].quantity * (newItems[idx].unit_price || 0);
                          setEditingRecord({ ...editingRecord, items: newItems });
                        }}
                        className="bg-horizon-dark border-horizon text-horizon-text"
                      />
                      <Input
                        type="number"
                        placeholder="מחיר יחידה"
                        value={item.unit_price || 0}
                        onChange={(e) => {
                          const newItems = [...(editingRecord.items || [])];
                          newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                          newItems[idx].total_price = newItems[idx].quantity * newItems[idx].unit_price;
                          setEditingRecord({ ...editingRecord, items: newItems });
                        }}
                        className="bg-horizon-dark border-horizon text-horizon-text"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="סהכ"
                          value={item.total_price || 0}
                          readOnly
                          className="bg-horizon-dark/50 border-horizon text-horizon-text"
                        />
                        {(editingRecord.items || []).length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newItems = (editingRecord.items || []).filter((_, i) => i !== idx);
                              setEditingRecord({ ...editingRecord, items: newItems });
                            }}
                            className="text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRecord({
                        ...editingRecord,
                        items: [...(editingRecord.items || []), { description: '', quantity: 1, unit_price: 0, total_price: 0 }]
                      });
                    }}
                    className="w-full border-horizon text-horizon-text"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף פריט
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={async () => {
                setIsSaving(true);
                try {
                  const total = (editingRecord.items || []).reduce((sum, item) => sum + (item.total_price || 0), 0);
                  await PurchaseRecord.update(editingRecord.id, {
                    document_type: editingRecord.document_type,
                    purchase_date: editingRecord.purchase_date,
                    invoice_number: editingRecord.invoice_number || null,
                    total_amount: total || editingRecord.total_amount,
                    items: editingRecord.items
                  });
                  handleUploadComplete();
                  setShowEditDialog(false);
                } catch (error) {
                  console.error('Error updating purchase record:', error);
                  toast.error('שגיאה בעדכון המסמך: ' + error.message);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="btn-horizon-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור שינויים
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג עריכת הספק */}
      {showEditSupplierDialog && editingSupplier && (
        <EditSupplierModal
          isOpen={showEditSupplierDialog}
          onClose={() => {
            setShowEditSupplierDialog(false);
            setEditingSupplier(null);
          }}
          supplier={editingSupplier}
          onUpdate={async (updatedSupplier) => {
            // עדכון הספק המקומי עם הנתונים החדשים
            if (updatedSupplier) {
              setCurrentSupplier(updatedSupplier);
              
              // עדכון הספק בקומפוננטה האב
              if (onSupplierUpdated) {
                onSupplierUpdated(updatedSupplier);
              }
            }
            
            // רענון נתוני הרכישות
            if (currentSupplier?.id) {
              setIsLoading(true);
              try {
                const records = await PurchaseRecord.filter({ supplier_id: currentSupplier.id }, '-purchase_date');
                setPurchaseRecords(records);
                
                if (records.length > 0) {
                  const latestRecord = records[0];
                  setSelectedPurchaseRecordId(latestRecord.id);
                  setCurrentPurchaseItems(latestRecord.items || []);
                }
                
                const monthlyExpenseData = processExpenseDataByMonth(records);
                setExpenseHistoryData(monthlyExpenseData);
              } catch (error) {
                console.error("Error loading purchase records:", error);
              } finally {
                setIsLoading(false);
              }
            }
            
            setShowEditSupplierDialog(false);
            setEditingSupplier(null);
          }}
        />
      )}
    </Dialog>
  );
}