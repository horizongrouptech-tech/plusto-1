import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  CreditCard, 
  Filter,
  Loader2,
  FileSpreadsheet,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CreditCardsTab({ customer, dateRange }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCard, setSelectedCard] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const queryClient = useQueryClient();

  // טעינת תנועות כרטיסי אשראי
  const { data: creditCardTransactions = [], isLoading } = useQuery({
    queryKey: ['creditCardTransactions', customer?.email, dateRange],
    queryFn: () => base44.entities.CashFlow.filter({
      customer_email: customer.email,
      is_credit_card: true,
      date: { 
        $gte: dateRange.start, 
        $lte: dateRange.end 
      }
    }, '-date'),
    enabled: !!customer?.email
  });

  // טעינת קטגוריות קיימות
  const { data: allCategories = [] } = useQuery({
    queryKey: ['cashFlowCategories', customer?.email],
    queryFn: async () => {
      const entries = await base44.entities.CashFlow.filter({
        customer_email: customer.email
      });
      const categories = [...new Set(entries.map(e => e.category).filter(Boolean))];
      return categories.sort();
    },
    enabled: !!customer?.email
  });

  // קבלת רשימת כרטיסים ייחודיים
  const uniqueCards = useMemo(() => {
    const cards = [...new Set(creditCardTransactions
      .map(t => t.card_last_digits)
      .filter(Boolean))];
    return cards;
  }, [creditCardTransactions]);

  // סינון תנועות
  const filteredTransactions = useMemo(() => {
    let filtered = [...creditCardTransactions];
    
    if (selectedCard !== 'all') {
      filtered = filtered.filter(t => t.card_last_digits === selectedCard);
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    return filtered;
  }, [creditCardTransactions, selectedCard, categoryFilter]);

  // סיכומים
  const totals = useMemo(() => {
    const totalSpent = filteredTransactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const byCategory = {};
    const byCard = {};

    filteredTransactions.forEach(t => {
      const cat = t.category || 'ללא קטגוריה';
      byCategory[cat] = (byCategory[cat] || 0) + (t.debit || 0);
      
      const card = t.card_last_digits || 'לא ידוע';
      byCard[card] = (byCard[card] || 0) + (t.debit || 0);
    });

    return { totalSpent, byCategory, byCard };
  }, [filteredTransactions]);

  // העלאת קובץ כרטיס אשראי
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // שמירה ל-FileUpload entity
      await base44.entities.FileUpload.create({
        customer_email: customer.email,
        filename: file.name,
        file_url: file_url,
        file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        status: 'processing',
        data_category: 'credit_card_report'
      });

      // ניתוח הקובץ
      const response = await base44.functions.invoke('parseBizIboxFile', {
        fileUrl: file_url,
        customerEmail: customer.email,
        fileType: 'credit_card'
      });

      if (response.data.success) {
        queryClient.invalidateQueries(['creditCardTransactions', customer.email]);
        toast.success(`נוספו ${response.data.processed || 0} תנועות כרטיס אשראי`);
      } else {
        throw new Error(response.data.error || 'שגיאה בניתוח הקובץ');
      }
    } catch (error) {
      console.error('Error uploading credit card file:', error);
      toast.error('שגיאה בהעלאת קובץ כרטיס אשראי');
    } finally {
      setIsUploading(false);
      const fileInput = document.getElementById('credit-card-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  // עדכון קטגוריה
  const handleCategoryChange = async (transactionId, newCategory) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const transaction = creditCardTransactions.find(t => t.id === transactionId);
      const transactionDate = new Date(transaction.date);
      
      // שיוך קטגוריה רק לתנועות עתידיות או מהיום
      if (transactionDate < today) {
        toast.warning('שיוך קטגוריה חל רק על תנועות מהיום והלאה');
        return;
      }

      await base44.entities.CashFlow.update(transactionId, { 
        category: newCategory,
        category_assignment_date: new Date().toISOString()
      });
      queryClient.invalidateQueries(['creditCardTransactions', customer.email]);
      toast.success('קטגוריה עודכנה');
    } catch (error) {
      toast.error('שגיאה בעדכון קטגוריה');
    }
  };

  const getCardTypeLabel = (type) => {
    switch (type) {
      case 'visa': return 'ויזה';
      case 'mastercard': return 'מאסטרקארד';
      case 'amex': return 'אמריקן אקספרס';
      case 'diners': return 'דיינרס';
      case 'isracard': return 'ישראכרט';
      default: return type || 'לא ידוע';
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* כותרת והעלאה */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-horizon-primary" />
              כרטיסי אשראי
            </CardTitle>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="credit-card-upload"
              />
              <Button
                onClick={() => document.getElementById('credit-card-upload').click()}
                disabled={isUploading}
                className="btn-horizon-primary"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעלה...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 ml-2" />
                    העלה דוח כרטיס אשראי
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* סיכומים */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                <span className="text-sm text-horizon-accent">סה"כ הוצאות</span>
              </div>
              <p className="text-2xl font-bold text-red-400">
                ₪{totals.totalSpent.toLocaleString()}
              </p>
            </div>
            
            {/* חלוקה לפי כרטיס */}
            <div className="bg-horizon-card/50 border border-horizon rounded-lg p-4">
              <span className="text-sm text-horizon-accent block mb-2">לפי כרטיס:</span>
              <div className="space-y-1">
                {Object.entries(totals.byCard).slice(0, 3).map(([card, amount]) => (
                  <div key={card} className="flex justify-between text-sm">
                    <span className="text-horizon-accent">****{card}</span>
                    <span className="text-horizon-text">₪{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* חלוקה לפי קטגוריה */}
            <div className="bg-horizon-card/50 border border-horizon rounded-lg p-4">
              <span className="text-sm text-horizon-accent block mb-2">לפי קטגוריה:</span>
              <div className="space-y-1">
                {Object.entries(totals.byCategory).slice(0, 3).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-horizon-accent">{cat}</span>
                    <span className="text-horizon-text">₪{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* סינון */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-horizon-accent" />
              <span className="text-sm text-horizon-accent">סנן:</span>
            </div>
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger className="w-40 bg-horizon-dark border-horizon text-horizon-text">
                <SelectValue placeholder="כל הכרטיסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הכרטיסים</SelectItem>
                {uniqueCards.map(card => (
                  <SelectItem key={card} value={card}>****{card}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40 bg-horizon-dark border-horizon text-horizon-text">
                <SelectValue placeholder="כל הקטגוריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {allCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* טבלת תנועות */}
      <Card className="card-horizon">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent mb-2">אין תנועות כרטיס אשראי</p>
              <p className="text-sm text-horizon-accent">העלה דוח כרטיס אשראי כדי להתחיל</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-horizon-dark">
                <TableRow>
                  <TableHead className="text-right text-horizon-text">תאריך</TableHead>
                  <TableHead className="text-right text-horizon-text">כרטיס</TableHead>
                  <TableHead className="text-right text-horizon-text">תיאור</TableHead>
                  <TableHead className="text-right text-horizon-text">קטגוריה</TableHead>
                  <TableHead className="text-right text-horizon-text">סכום</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-horizon-dark/20">
                    <TableCell className="text-right text-horizon-text">
                      {format(new Date(transaction.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="border-horizon text-horizon-accent">
                        {getCardTypeLabel(transaction.card_type)} ****{transaction.card_last_digits || '----'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-horizon-accent">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={transaction.category || ''}
                        onValueChange={(value) => handleCategoryChange(transaction.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8 bg-horizon-dark border-horizon text-horizon-text text-sm">
                          <SelectValue placeholder="בחר קטגוריה" />
                        </SelectTrigger>
                        <SelectContent>
                          {allCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-red-400 font-medium">
                      ₪{(transaction.debit || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}