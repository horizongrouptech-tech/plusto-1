import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Search
} from "lucide-react";
import SpecificFileUploadBox from "./SpecificFileUploadBox";
import { PurchaseRecord } from "@/entities/PurchaseRecord";
import { formatCurrency } from "../utils/currencyFormatter";

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

export default function SupplierDetailsModal({ supplier, customerEmail, isOpen, onClose, onFindAlternatives }) {
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [selectedPurchaseRecordId, setSelectedPurchaseRecordId] = useState(null);
  const [currentPurchaseItems, setCurrentPurchaseItems] = useState([]);
  const [expenseHistoryData, setExpenseHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);

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

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dir-rtl bg-horizon-dark border-horizon">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text text-right flex items-center gap-3">
            <Building className="w-6 h-6 text-horizon-primary" />
            פרטי ספק: {supplier.name}
          </DialogTitle>
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
                <div className="flex items-center justify-between">
                  <span className="text-horizon-accent">סטטוס:</span>
                  {renderSupplierStatus()}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-horizon-accent">דירוג:</span>
                  {renderStarRating(supplier.rating)}
                </div>

                {supplier.contact_person && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-horizon-accent" />
                    <span className="text-horizon-text">{supplier.contact_person}</span>
                  </div>
                )}

                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-horizon-accent" />
                    <a href={`tel:${supplier.phone}`} className="text-horizon-primary hover:underline">
                      {supplier.phone}
                    </a>
                  </div>
                )}

                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-horizon-accent" />
                    <a href={`mailto:${supplier.email}`} className="text-horizon-primary hover:underline">
                      {supplier.email}
                    </a>
                  </div>
                )}

                {supplier.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-horizon-accent" />
                    <span className="text-horizon-text">{supplier.address}</span>
                  </div>
                )}

                {supplier.category && (
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-horizon-accent" />
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {supplier.category}
                    </Badge>
                  </div>
                )}

                {supplier.payment_terms && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-horizon-accent" />
                    <span className="text-horizon-text">{supplier.payment_terms}</span>
                  </div>
                )}

                {supplier.delivery_time && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-horizon-accent" />
                    <span className="text-horizon-text">זמן אספקה: {supplier.delivery_time}</span>
                  </div>
                )}

                {onFindAlternatives && supplier.category && (
                  <div className="pt-3 border-t border-horizon">
                    <Button
                      variant="outline"
                      onClick={() => onFindAlternatives(supplier.category)}
                      className="w-full"
                    >
                      <Search className="w-4 h-4 ml-2" />
                      מצא ספקים חלופיים ב{supplier.category}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* העלאת מסמכי רכש */}
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  <Upload className="w-5 h-5 text-horizon-primary" />
                  העלאת מסמכי רכש
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SpecificFileUploadBox
                  key={uploadKey}
                  customerEmail={customerEmail}
                  category="purchase_document"
                  title="מסמך רכש חדש"
                  description="העלה חשבונית, תעודת משלוח או הזמנת רכש"
                  icon={FileText}
                  context={{ supplier_id: supplier.id }}
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
                <Select
                  value={selectedPurchaseRecordId || ''}
                  onValueChange={handlePurchaseRecordSelection}
                >
                  <SelectTrigger className="w-full bg-horizon-card border-2 border-horizon-primary/30 text-horizon-text font-medium">
                    <SelectValue placeholder="בחר מסמך רכש להצגת פירוט..." />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    {purchaseRecords.map((record) => (
                      <SelectItem 
                        key={record.id} 
                        value={record.id}
                        className="text-horizon-text hover:bg-horizon-primary/10"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>
                            {record.document_type === 'invoice' ? 'חשבונית' : 
                             record.document_type === 'delivery_note' ? 'תעודת משלוח' :
                             record.document_type === 'purchase_order' ? 'הזמנת רכש' : 'מסמך'} 
                            {record.invoice_number ? ` #${record.invoice_number}` : ''}
                          </span>
                          <div className="text-sm text-horizon-accent ml-4">
                            {new Date(record.purchase_date).toLocaleDateString('he-IL')} - {formatCurrency(record.total_amount)}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </Dialog>
  );
}