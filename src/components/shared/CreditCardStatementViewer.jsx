import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  DollarSign
} from "lucide-react";

// Helper functions for status and category text/styling
const getStatusText = (status) => {
  const map = { uploaded: 'הועלה', processing: 'מעבד', analyzed: 'נותח', failed: 'נכשל' };
  return map[status] || status;
};
const getStatusBadgeClass = (status) => {
  const map = { analyzed: 'bg-green-500', failed: 'bg-red-500', processing: 'bg-yellow-500' };
  return map[status] || 'bg-gray-500';
};
const getCategoryText = (category) => {
  const map = { bank_statement: 'תדפיס בנק', credit_card_report: 'דוח אשראי' };
  return map[category] || category;
};

export default function CreditCardStatementViewer({ file }) {
  // 1. Safety checks to ensure data exists
  if (!file) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-horizon-accent" />
          <p className="text-horizon-accent">לא נמצאו נתוני קובץ</p>
        </CardContent>
      </Card>
    );
  }
  
  // 2. Safely access parsed data with fallbacks
  const parsedData = file.parsed_data || {};
  const headers = parsedData.headers || [];
  const rows = Array.isArray(parsedData.rows) ? parsedData.rows : [];

  // 3. Fallback UI if no structured rows were found
  if (rows.length === 0) {
    return (
      <div className="space-y-4" dir="rtl">
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-horizon-primary" />
              {file.filename}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
              <h3 className="text-lg font-semibold text-horizon-text">לא זוהו נתונים טבלאיים</h3>
              <p className="text-horizon-accent mt-2">
                המערכת עיבדה את הקובץ אך לא הצליחה לזהות בו מבנה טבלה תקין.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Calculate stats from the new object-based rows
  const totalTransactions = rows.length;
  const totalAmount = rows.reduce((sum, row) => {
    const amountKey = Object.keys(row).find(k => k.includes('סכום') || k.includes('חיוב'));
    return sum + (amountKey ? parseFloat(row[amountKey]) || 0 : 0);
  }, 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* File info card */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-horizon-primary" />
            {file.filename}
          </CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${getStatusBadgeClass(file.status)} text-white`}>
              {getStatusText(file.status)}
            </Badge>
            <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
              {getCategoryText(file.data_category)}
            </Badge>
          </div>
        </CardHeader>
      </Card>
      
      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-horizon"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-500/20 rounded-lg"><ShoppingCart className="w-5 h-5 text-blue-400" /></div><div><p className="text-sm text-horizon-accent">סה"כ עסקאות</p><p className="text-xl font-bold text-horizon-text">{totalTransactions}</p></div></CardContent></Card>
        <Card className="card-horizon"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-red-500/20 rounded-lg"><DollarSign className="w-5 h-5 text-red-400" /></div><div><p className="text-sm text-horizon-accent">סכום חיוב כולל</p><p className="text-xl font-bold text-red-400">₪{totalAmount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div></CardContent></Card>
      </div>
      
      {/* Data Table */}
      <Card className="card-horizon">
        <CardHeader><CardTitle className="text-horizon-text">פירוט עסקאות</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-horizon">
                  {headers.map((header, index) => (
                    <th key={index} className="p-3 text-horizon-accent font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-horizon/50 hover:bg-horizon-card/20">
                    {headers.map((header, colIndex) => {
                      const value = row[header] !== null && row[header] !== undefined ? row[header] : '-';
                      let cellClass = "p-3 text-horizon-text";
                      if (String(header).includes('סכום') || String(header).includes('חיוב')) {
                        cellClass = "p-3 text-red-400 font-medium";
                      }
                      
                      return (
                        <td key={colIndex} className={cellClass}>
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}