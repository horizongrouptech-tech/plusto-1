import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Truck,
  Plus,
  Search,
  Star,
  X,
  SearchCheck } from
"lucide-react";
import { base44 } from '@/api/base44Client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import AddSupplierModal from "../shared/AddSupplierModal";
import SupplierDetailsModal from "./SupplierDetailsModal";
import FindAlternativeSupplierModal from "./FindAlternativeSupplierModal";

const getCategoryBadgeStyle = (category) => {
  const styles = {
    'מזון': 'bg-green-100 text-green-800 border-green-200',
    'טכנולוגיה': 'bg-blue-100 text-blue-800 border-blue-200',
    'אופנה': 'bg-purple-100 text-purple-800 border-purple-200',
    'ניקיון': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'שירותים': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'כללי': 'bg-gray-100 text-gray-800 border-gray-200',
    'default': 'bg-slate-100 text-slate-800 border-slate-200'
  };
  return styles[category] || styles.default;
};

export default function CustomerSuppliersTab({ customer, currentUser: propCurrentUser }) {
  const [localCurrentUser, setLocalCurrentUser] = React.useState(propCurrentUser);

  React.useEffect(() => {
    const loadUser = async () => {
      if (!propCurrentUser) {
        try {
          const user = await base44.auth.me();
          setLocalCurrentUser(user);
        } catch (error) {
          console.error('Error loading user:', error);
        }
      } else {
        setLocalCurrentUser(propCurrentUser);
      }
    };
    loadUser();
  }, [propCurrentUser]);

  const currentUser = localCurrentUser;
  const [suppliers, setSuppliers] = useState([]);
  const [suggestedSuppliers, setSuggestedSuppliers] = useState([]);
  const [activeTab, setActiveTab] = useState("customer-suppliers");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [showFindAlternativeModal, setShowFindAlternativeModal] = useState(false);

  const loadSuppliers = useCallback(async () => {
    if (!customer) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // טען ספקים של הלקוח
      const customerSuppliers = await base44.entities.Supplier.filter({
        customer_emails: [customer.email],
        is_active: true
      });

      // טען ספקים מוצעים חכמים
      const { data: suggested, error } = await base44.functions.invoke('getSuggestedSuppliers', {
        customer_email: customer.email,
        customer_data: customer
      });

      if (error) {
        console.error('Error loading suggested suppliers:', error);
        // fallback - טען את כל הספקים שלא משויכים
        const allSuppliers = await base44.entities.Supplier.filter({ is_active: true });
        const filteredSuggested = allSuppliers.filter((supplier) =>
        !supplier.customer_emails?.includes(customer.email)
        );
        setSuggestedSuppliers(filteredSuggested);
      } else {
        // תיקון: הפונקציה מחזירה {success, data}, צריך לגשת ל-data
        const suppliersList = suggested?.data || suggested || [];
        setSuggestedSuppliers(Array.isArray(suppliersList) ? suppliersList : []);
      }

      setSuppliers(customerSuppliers);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      setSuggestedSuppliers([]); // ברירת מחדל למערך ריק במקרה של שגיאה
    } finally {
      setIsLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleAssignSupplier = async (supplier) => {
    try {
      const updatedEmails = supplier.customer_emails ?
      [...supplier.customer_emails, customer.email] :
      [customer.email];

      await base44.entities.Supplier.update(supplier.id, {
        customer_emails: updatedEmails
      });

      loadSuppliers();
    } catch (error) {
      console.error("Error assigning supplier:", error);
    }
  };

  const handleRemoveSupplier = async (supplier) => {
    try {
      const updatedEmails = supplier.customer_emails?.filter((email) => email !== customer.email) || [];

      await base44.entities.Supplier.update(supplier.id, {
        customer_emails: updatedEmails
      });

      loadSuppliers();
    } catch (error) {
      console.error("Error removing supplier:", error);
    }
  };

  const renderStarRating = (rating) => {
    if (!rating) return <span className="text-horizon-accent text-sm">לא דורג</span>;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) =>
        <Star
          key={star}
          className={`w-3 h-3 ${
          star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`
          } />

        )}
        <span className="text-sm text-horizon-text mr-1">{rating}/5</span>
      </div>);

  };

  const renderSupplierStatus = (supplier) => {
    if (supplier.is_partner_supplier) {
      return (
        <Badge className="bg-orange-500 text-white border-orange-600 font-semibold">
          ספק שותף
        </Badge>);

    }
    return (
      <Badge variant="outline" className="text-gray-900 px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-horizon-secondary">
        ספק רגיל
      </Badge>);

  };

  const renderCategoryBadge = (category) => {
    if (!category) return null;
    return (
      <Badge className={`${getCategoryBadgeStyle(category)} font-medium`}>
        {category}
      </Badge>);

  };

  const handleFindAlternatives = (category) => {
    setSelectedSupplier(null);
    setActiveTab('suggested-suppliers');
    setCategoryFilter(category);
    setSearchTerm('');
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
  supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuggestedSuppliers = suggestedSuppliers.filter((supplier) => {
    const searchMatch = supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = !categoryFilter || supplier.category === categoryFilter;
    return searchMatch && categoryMatch;
  });

  const canAddSupplier = currentUser && (currentUser.role === 'admin' || currentUser.user_type === 'financial_manager');

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-horizon-primary mx-auto mb-4"></div>
          <p className="text-horizon-accent">טוען ספקים...</p>
        </CardContent>
      </Card>);

  }

  if (!customer) {
    return (
      <Card className="card-horizon h-full flex items-center justify-center">
        <CardContent className="text-center py-16">
          <Truck className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
          <h3 className="text-xl font-semibold text-horizon-text mb-2">בעיה בטעינת הלקוח</h3>
          <p className="text-horizon-accent">נא לבחור לקוח מהרשימה כדי לנהל את ספקיו.</p>
        </CardContent>
      </Card>);

  }

  return (
    <Card className="card-horizon">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-horizon-text flex items-center gap-3">
            <Truck className="w-6 h-6 text-horizon-primary" />
            <span>ניהול ספקים עבור: <span className="text-horizon-primary">{customer.business_name || customer.full_name}</span></span>
          </CardTitle>
          {canAddSupplier &&
          <Button onClick={() => setShowAddModal(true)} className="btn-horizon-primary">
              <Plus className="w-4 h-4 ml-2" />
              הוסף ספק חדש
            </Button>
          }
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-2 bg-horizon-card">
            <TabsTrigger
              value="customer-suppliers"
              className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all">
              ספקים של הלקוח ({filteredSuppliers.length})
            </TabsTrigger>
            <TabsTrigger
              value="suggested-suppliers"
              className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all">
              ספקים מוצעים ({filteredSuggestedSuppliers.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
              <Input
                placeholder="חיפוש לפי שם ספק, איש קשר..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (categoryFilter) setCategoryFilter(null);
                }}
                className="pr-10 bg-horizon-card border-horizon text-horizon-text" />

            </div>
            {categoryFilter &&
            <Badge variant="secondary" className="flex items-center gap-2 text-sm p-2">
                סינון לפי קטגוריה: {categoryFilter}
                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setCategoryFilter(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            }
          </div>

          <TabsContent value="customer-suppliers" className="mt-4">
            {filteredSuppliers.length > 0 ?
            <div className="border rounded-lg overflow-hidden border-horizon">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow className="bg-horizon-card hover:bg-horizon-card/80">
                      <TableHead className="text-right text-horizon-accent">שם הספק</TableHead>
                      <TableHead className="text-right text-horizon-accent">סוג</TableHead>
                      <TableHead className="text-right text-horizon-accent">סטטוס</TableHead>
                      <TableHead className="text-right text-horizon-accent">איש קשר</TableHead>
                      <TableHead className="text-right text-horizon-accent">טלפון</TableHead>
                      <TableHead className="text-right text-horizon-accent">דירוג</TableHead>
                      <TableHead className="text-center text-horizon-accent">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) =>
                  <TableRow key={supplier.id} className="border-horizon">
                        <TableCell className="font-medium text-right">
                          <Button variant="link" onClick={() => setSelectedSupplier(supplier)} className="text-horizon-primary p-0 h-auto">
                            {supplier.name}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">{renderCategoryBadge(supplier.category)}</TableCell>
                        <TableCell className="text-right">{renderSupplierStatus(supplier)}</TableCell>
                        <TableCell className="text-horizon-accent text-right">{supplier.contact_person || '-'}</TableCell>
                        <TableCell className="text-horizon-accent text-right" dir="ltr">
                          {supplier.phone ?
                      <a href={`tel:${supplier.phone}`} className="text-horizon-primary hover:underline">{supplier.phone}</a> :
                      '-'}
                        </TableCell>
                        <TableCell className="text-right">{renderStarRating(supplier.rating)}</TableCell>
                        <TableCell className="text-center">
                          {canAddSupplier &&
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveSupplier(supplier)}>
                              הסר שיוך
                            </Button>
                      }
                        </TableCell>
                      </TableRow>
                  )}
                  </TableBody>
                </Table>
              </div> :

            <div className="text-center py-8">
                <Truck className="w-12 h-12 mx-auto mb-3 text-horizon-accent" />
                <p className="text-horizon-accent">אין ספקים מוקצים ללקוח זה</p>
              </div>
            }
          </TabsContent>

          <TabsContent value="suggested-suppliers" className="mt-4">
            {canAddSupplier &&
            <div className="mb-4 flex justify-end">
                <Button
                onClick={() => setShowFindAlternativeModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white">
                  <SearchCheck className="w-4 h-4 ml-2" />
                  מצא ספק חלופי באינטרנט
                </Button>
              </div>
            }
            
            {filteredSuggestedSuppliers.length > 0 ?
            <div className="border rounded-lg overflow-hidden border-horizon">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow className="bg-horizon-card hover:bg-horizon-card/80">
                      <TableHead className="text-right text-horizon-accent">שם הספק</TableHead>
                      <TableHead className="text-right text-horizon-accent">סוג</TableHead>
                      <TableHead className="text-right text-horizon-accent">סטטוס</TableHead>
                      <TableHead className="text-right text-horizon-accent">איש קשר</TableHead>
                      <TableHead className="text-right text-horizon-accent">טלפון</TableHead>
                      <TableHead className="text-right text-horizon-accent">דירוג</TableHead>
                      <TableHead className="text-center text-horizon-accent">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuggestedSuppliers.map((supplier) =>
                  <TableRow key={supplier.id} className="border-horizon">
                        <TableCell className="font-medium text-right">
                          <Button variant="link" onClick={() => setSelectedSupplier(supplier)} className="text-horizon-primary p-0 h-auto">
                            {supplier.name}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">{renderCategoryBadge(supplier.category)}</TableCell>
                        <TableCell className="text-right">{renderSupplierStatus(supplier)}</TableCell>
                        <TableCell className="text-slate-50 p-4 text-right align-middle [&:has([role=checkbox])]:pr-0">{supplier.contact_person || '-'}</TableCell>
                        <TableCell className="text-horizon-accent text-right" dir="ltr">
                          {supplier.phone ?
                      <a href={`tel:${supplier.phone}`} className="text-horizon-primary hover:underline">{supplier.phone}</a> :
                      '-'}
                        </TableCell>
                        <TableCell className="text-right">{renderStarRating(supplier.rating)}</TableCell>
                        <TableCell className="text-center">
                          {canAddSupplier &&
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAssignSupplier(supplier)}>
                              שייך ללקוח
                            </Button>
                      }
                        </TableCell>
                      </TableRow>
                  )}
                  </TableBody>
                </Table>
              </div> :

            <div className="text-center py-8">
                <Truck className="w-12 h-12 mx-auto mb-3 text-horizon-accent" />
                <p className="text-horizon-accent">אין ספקים זמינים להקצאה</p>
              </div>
            }
          </TabsContent>
        </Tabs>
      </CardContent>

      {showAddModal &&
      <AddSupplierModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSupplierAdded={() => {
          loadSuppliers();
          setShowAddModal(false);
        }}
        currentUser={currentUser}
        customerEmail={customer.email} />

      }

      {selectedSupplier &&
      <SupplierDetailsModal
        supplier={selectedSupplier}
        customerEmail={customer.email}
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        onFindAlternatives={handleFindAlternatives} />

      }

      {showFindAlternativeModal &&
      <FindAlternativeSupplierModal
        isOpen={showFindAlternativeModal}
        onClose={() => setShowFindAlternativeModal(false)}
        customerEmail={customer.email}
        currentUser={currentUser}
        onSupplierAdded={() => {
          loadSuppliers();
          setShowFindAlternativeModal(false);
        }} />

      }
    </Card>);

}