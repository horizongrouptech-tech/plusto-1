import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  FileX, 
  User,
  FileText,
  DollarSign,
  BarChart3,
  CreditCard,
  Building2
} from "lucide-react";

const documentTypeLabels = {
  sales_report: "דוח מכירות",
  inventory_report: "דוח מלאי", 
  profit_loss: "דוח רווח והפסד",
  bank_statement: "תדפיס בנק",
  balance_sheet: "מאזן",
  credit_card_report: "דוח כרטיס אשראי",
  promotions_report: "דוח מבצעים"
};

const getDocumentIcon = (docType) => {
  const iconMap = {
    sales_report: <BarChart3 className="w-4 h-4" />,
    inventory_report: <FileText className="w-4 h-4" />,
    profit_loss: <DollarSign className="w-4 h-4" />,
    bank_statement: <Building2 className="w-4 h-4" />,
    balance_sheet: <FileText className="w-4 h-4" />,
    credit_card_report: <CreditCard className="w-4 h-4" />,
    promotions_report: <FileText className="w-4 h-4" />
  };
  return iconMap[docType] || <FileX className="w-4 h-4" />;
};

// פונקציה מתוקנת לניתוח מסמכים חסרים - משתמשת בפרמטרים חיצוניים
export const analyzeMissingDocuments = async (allCustomers, allFileUploads) => {
    try {
        console.log(`Analyzing missing documents for ${allCustomers.length} customers`);
        
        const customersWithMissing = [];
        
        const requiredDocumentTypes = [
            'sales_report',
            'inventory_report',
            'profit_loss',
            'bank_statement',
            'balance_sheet',
            'credit_card_report',
            'promotions_report'
        ];

        // מעבר על כל הלקוחות
        for (const customer of allCustomers) {
            // סינון משתמשים שאינם לקוחות רגילים
            if (customer.role === 'admin' ||
                customer.user_type === 'financial_manager' ||
                customer.user_type === 'supplier_user') {
                continue; // דלג על משתמשים אלה
            }

            // מציאת קבצים שהועלו ללקוח זה
            const customerFiles = allFileUploads.filter(file => 
                file.customer_email === customer.email &&
                file.status === 'analyzed' // רק קבצים שנותחו בהצלחה
            );
            
            // זיהוי סוגי המסמכים שהועלו
            const uploadedDocTypes = [...new Set(customerFiles.map(file => file.data_category).filter(Boolean))];
            
            // מציאת מסמכים חסרים
            const missingDocuments = requiredDocumentTypes.filter(docType =>
                !uploadedDocTypes.includes(docType)
            );

            if (missingDocuments.length > 0) {
                customersWithMissing.push({
                    email: customer.email,
                    full_name: customer.full_name || 'לא מוגדר',
                    business_name: customer.business_name || 'לא מוגדר',
                    business_type: customer.business_type || 'לא מוגדר',
                    phone: customer.phone || 'לא מוגדר',
                    missingDocuments: missingDocuments,
                    totalUploaded: customerFiles.length,
                    totalRequired: requiredDocumentTypes.length
                });
                console.log(`Customer ${customer.email} is missing ${missingDocuments.length} documents`);
            }
        }

        console.log(`Found ${customersWithMissing.length} customers with missing documents`);
        
        // עדכון ה-state הגלובלי - נוסיף את זה בהמשך אם צריך
        // setCustomersWithMissingDocs(customersWithMissing);
        
        return customersWithMissing;

    } catch (error) {
        console.error('Error analyzing missing documents:', error);
        return [];
    }
};

export default function MissingDocumentsModal({ isOpen, onClose, customersWithMissingDocs = [] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = customersWithMissingDocs.filter(customer =>
    (customer.business_name || customer.full_name || customer.email || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-text mb-4 flex items-center gap-3">
            <FileX className="w-6 h-6 text-red-400" />
            לקוחות עם מסמכים חסרים ({customersWithMissingDocs.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* שדה חיפוש */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
            <Input
              placeholder="חיפוש לקוח לפי שם עסק או אימייל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-horizon-card border-horizon text-horizon-text"
            />
          </div>

          {/* רשימת לקוחות */}
          <div className="space-y-4">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer, index) => (
                <Card key={customer.email || index} className="card-horizon">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-horizon-primary" />
                        <div className="text-right">
                          <CardTitle className="text-lg text-horizon-text">
                            {customer.business_name || customer.full_name || "לקוח ללא שם"}
                          </CardTitle>
                          <p className="text-sm text-horizon-accent">{customer.phone || 'אין טלפון'}</p>
                        </div>
                      </div>
                      <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                        {customer.missingDocuments.length} מסמכים חסרים
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-horizon-text text-right">מסמכים חסרים:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {customer.missingDocuments.map((docType, docIndex) => (
                          <div 
                            key={docIndex}
                            className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20"
                          >
                            {getDocumentIcon(docType)}
                            <span className="text-sm text-horizon-text">
                              {documentTypeLabels[docType] || docType}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-horizon-accent">
                        הועלו {customer.totalUploaded} מתוך {customer.totalRequired} מסמכים נדרשים
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : searchTerm ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto mb-3 text-horizon-accent" />
                <p className="text-horizon-accent">לא נמצאו לקוחות התואמים לחיפוש</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileX className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="text-horizon-accent">מעולה! כל הלקוחות העלו את כל המסמכים הנדרשים</p>
              </div>
            )}
          </div>

          {/* כפתור סגירה */}
          <div className="flex justify-center pt-6 border-t border-horizon">
            <Button 
              onClick={onClose} 
              className="btn-horizon-primary px-8 py-3 text-lg font-semibold"
            >
              סגור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}