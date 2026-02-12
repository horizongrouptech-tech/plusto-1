import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Save, Trash2, Plus, Edit, Loader2, CheckCircle2 } from 'lucide-react';

import { toast } from "sonner";
const CATEGORIES = [
  'הכנסות', 'הוצאות', 'הכנסות מסליקה', 'הכנסה מסליקה', 'הכנסות סיבוס',
  'הכנסות וולט', 'הכנסות עסקיות', 'בנקאיות', 'הלוואה', 'פיקדון/חסכון',
  'שליחויות', 'ספק כללי', 'הפקדות פנסיוניות', 'חיובים באשראי', 
  'לקוח עסקי', 'ללא קטגוריה', 'אחר'
];

export default function FailedRowsEditor({ 
  isOpen, 
  onClose, 
  failedRows = [], 
  skippedRows = [],
  customerEmail,
  onSaveComplete
}) {
  const [selectedRows, setSelectedRows] = useState([]);
  const [editedRows, setEditedRows] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [activeTab, setActiveTab] = useState('failed');

  const displayRows = activeTab === 'failed' ? failedRows : skippedRows;

  const toggleRowSelection = (index) => {
    setSelectedRows(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAll = () => {
    if (selectedRows.length === displayRows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(displayRows.map((_, i) => i));
    }
  };

  const updateRowField = (index, field, value) => {
    setEditedRows(prev => ({
      ...prev,
      [index]: {
        ...(prev[index] || displayRows[index]?.data || {}),
        [field]: value
      }
    }));
  };

  const getRowData = (index) => {
    return editedRows[index] || displayRows[index]?.data || {};
  };

  const handleSaveSelected = async () => {
    if (selectedRows.length === 0) return;
    
    setIsSaving(true);
    setSavedCount(0);

    try {
      const entriesToSave = [];

      for (const index of selectedRows) {
        const rowData = getRowData(index);
        
        // וידוא שהשדות הנדרשים קיימים
        if (!rowData.date || !rowData.category) continue;
        
        // המרת תאריך אם צריך
        let dateString = rowData.date;
        if (dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3) {
            let year = parseInt(parts[2]);
            if (year < 100) year = year < 50 ? 2000 + year : 1900 + year;
            dateString = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        entriesToSave.push({
          customer_email: customerEmail,
          date: dateString,
          description: rowData.description || '',
          source: rowData.source || rowData.description || '',
          account_type: rowData.account_type || '',
          account_number: rowData.account_number || '',
          payment_type: rowData.payment_type || '',
          category: rowData.category,
          debit: parseFloat(rowData.debit) || 0,
          credit: parseFloat(rowData.credit) || 0,
          balance: parseFloat(rowData.balance) || 0,
          reference_number: rowData.reference || '',
          imported_from_file_id: 'manual_edit'
        });
      }

      if (entriesToSave.length > 0) {
        await base44.entities.CashFlow.bulkCreate(entriesToSave);
        setSavedCount(entriesToSave.length);
        
        // הסר את השורות שנשמרו מהבחירה
        setSelectedRows([]);
        
        // קריאה לרענון הנתונים
        if (onSaveComplete) {
          onSaveComplete(entriesToSave.length);
        }
      }
    } catch (error) {
      console.error('Error saving rows:', error);
      toast.error('שגיאה בשמירת הנתונים: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddManualRow = () => {
    const newIndex = displayRows.length;
    setEditedRows(prev => ({
      ...prev,
      [newIndex]: {
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'לא מסווג',
        credit: 0,
        debit: 0,
        balance: 0
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            עריכת שורות שלא עובדו
          </DialogTitle>
          <DialogDescription className="text-horizon-accent">
            השורות הבאות לא נותחו בהצלחה מהקובץ. ניתן לערוך ולשמור אותן ידנית.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-horizon pb-2">
          <Button
            variant={activeTab === 'failed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('failed')}
            className={activeTab === 'failed' ? 'bg-red-600' : ''}
          >
            שורות שנכשלו ({failedRows.length})
          </Button>
          <Button
            variant={activeTab === 'skipped' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('skipped')}
            className={activeTab === 'skipped' ? 'bg-yellow-600' : ''}
          >
            שורות שדולגו ({skippedRows.length})
          </Button>
        </div>

        {savedCount > 0 && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-400">נשמרו {savedCount} רשומות בהצלחה!</span>
          </div>
        )}

        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-horizon-dark z-10">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={selectedRows.length === displayRows.length && displayRows.length > 0}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead className="text-right text-horizon-text">שורה</TableHead>
                <TableHead className="text-right text-horizon-text">סיבה</TableHead>
                <TableHead className="text-right text-horizon-text">תאריך</TableHead>
                <TableHead className="text-right text-horizon-text">תיאור</TableHead>
                <TableHead className="text-right text-horizon-text">קטגוריה</TableHead>
                <TableHead className="text-right text-horizon-text">זכות</TableHead>
                <TableHead className="text-right text-horizon-text">חובה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-horizon-accent">
                    {activeTab === 'failed' 
                      ? 'אין שורות שנכשלו - כל הנתונים עובדו בהצלחה! 🎉'
                      : 'אין שורות שדולגו'}
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((row, index) => {
                  const rowData = getRowData(index);
                  const isSelected = selectedRows.includes(index);
                  
                  return (
                    <TableRow 
                      key={index} 
                      className={`hover:bg-horizon-card/50 ${isSelected ? 'bg-blue-500/10' : ''}`}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleRowSelection(index)}
                        />
                      </TableCell>
                      <TableCell className="text-horizon-accent font-mono text-sm">
                        #{row.row || index + 1}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                          {row.reason?.substring(0, 40) || 'לא ידוע'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={rowData.date || ''}
                          onChange={(e) => updateRowField(index, 'date', e.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="w-28 h-8 text-sm bg-horizon-card border-horizon"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={rowData.description || ''}
                          onChange={(e) => updateRowField(index, 'description', e.target.value)}
                          placeholder="תיאור"
                          className="w-40 h-8 text-sm bg-horizon-card border-horizon"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={rowData.category || 'לא מסווג'}
                          onValueChange={(val) => updateRowField(index, 'category', val)}
                        >
                          <SelectTrigger className="w-32 h-8 text-sm bg-horizon-card border-horizon">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-horizon-dark border-horizon">
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={rowData.credit || ''}
                          onChange={(e) => updateRowField(index, 'credit', e.target.value)}
                          placeholder="0"
                          className="w-24 h-8 text-sm bg-horizon-card border-horizon text-green-400"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={rowData.debit || ''}
                          onChange={(e) => updateRowField(index, 'debit', e.target.value)}
                          placeholder="0"
                          className="w-24 h-8 text-sm bg-horizon-card border-horizon text-red-400"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleAddManualRow}
              className="border-horizon"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף שורה ידנית
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-horizon">
              סגור
            </Button>
            <Button
              onClick={handleSaveSelected}
              disabled={selectedRows.length === 0 || isSaving}
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
                  שמור {selectedRows.length} שורות נבחרות
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}