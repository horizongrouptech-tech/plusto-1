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
  SearchCheck,
  Trash2,
  Unlink,
  ChevronLeft,
  ChevronRight,
  Filter } from
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AddSupplierModal from "../shared/AddSupplierModal";
import SupplierDetailsModal from "./SupplierDetailsModal";
import SupplierPreviewModal from "./SupplierPreviewModal";
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("customer-suppliers");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedSuggestedSupplier, setSelectedSuggestedSupplier] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [showFindAlternativeModal, setShowFindAlternativeModal] = useState(false);
  
  // Pagination state for suggested suppliers
  const [suggestedPage, setSuggestedPage] = useState(1);
  const PAGE_SIZE = 20;

  // ✅ טעינת ספקי הלקוח - מהיר, מיד, עם React Query
  const { 
    data: suppliers = [], 
    isLoading: isLoadingCustomerSuppliers,
    refetch: refetchCustomerSuppliers 
  } = useQuery({
    queryKey: ['customerSuppliers', customer?.email],
    queryFn: async () => {
      if (!customer?.email) return [];
      return await base44.entities.Supplier.filter({
        customer_emails: [customer.email],
        is_active: true
      });
    },
    enabled: !!customer?.email,
    staleTime: 5 * 60 * 1000, // 5 דקות cache
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // ✅ ספירת ספקים מוצעים - מיידי, לא תלוי בטאב
  const { 
    data: suggestedSuppliersCount = 0, 
    isLoading: isLoadingSuggestedCount 
  } = useQuery({
    queryKey: ['suggestedSuppliersCount', customer?.email],
    queryFn: async () => {
      if (!customer?.email) return 0;
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );
        const result = await Promise.race([
          base44.functions.invoke('getSuggestedSuppliers', {
            customer_email: customer.email,
            customer_data: customer
          }),
          timeoutPromise
        ]);
        const { data: suggested, error } = result || {};
        if (error) throw new Error(error);
        const suppliersList = suggested?.data || suggested || [];
        return Array.isArray(suppliersList) ? suppliersList.length : 0;
      } catch (error) {
        console.warn('AI suggestion count failed, using fallback:', error);
        const allSuppliers = await base44.entities.Supplier.filter({ is_active: true });
        return allSuppliers.filter((supplier) =>
          !supplier.customer_emails?.includes(customer.email)
        ).length;
      }
    },
    enabled: !!customer?.email,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // ✅ טעינת ספקים מוצעים - איטי, lazy loading, רק כשצריך
  const { 
    data: allSuggestedSuppliers = [], 
    isLoading: isLoadingSuggested,
    refetch: refetchSuggested 
  } = useQuery({
    queryKey: ['suggestedSuppliers', customer?.email],
    queryFn: async () => {
      if (!customer?.email) return [];
      
      try {
        // נסה AI call עם timeout קצר
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );
        
        const result = await Promise.race([
          base44.functions.invoke('getSuggestedSuppliers', {
            customer_email: customer.email,
            customer_data: customer
          }),
          timeoutPromise
        ]);
        
        const { data: suggested, error } = result || {};
        if (error) throw new Error(error);
        
        const suppliersList = suggested?.data || suggested || [];
        return Array.isArray(suppliersList) ? suppliersList : [];
      } catch (error) {
        console.warn('AI suggestion failed, using fallback:', error);
        // Fallback: טען את כל הספקים הפעילים (ללא AI)
        const allSuppliers = await base44.entities.Supplier.filter({ is_active: true });
        return allSuppliers.filter((supplier) =>
          !supplier.customer_emails?.includes(customer.email)
        );
      }
    },
    enabled: !!customer?.email && activeTab === 'suggested-suppliers', // ✅ רק כשצריך
    staleTime: 10 * 60 * 1000, // 10 דקות cache (AI call יקר)
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // ✅ סינון ספקים מוצעים (חיפוש + קטגוריה) -- לפני pagination
  const filteredAllSuggested = React.useMemo(() => 
    allSuggestedSuppliers.filter((supplier) => {
      const searchMatch = !searchTerm || 
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = !categoryFilter || supplier.category === categoryFilter;
      return searchMatch && categoryMatch;
    }), [allSuggestedSuppliers, searchTerm, categoryFilter]
  );

  // ✅ חישוב עמודים
  const totalSuggestedPages = Math.max(1, Math.ceil(filteredAllSuggested.length / PAGE_SIZE));

  // ✅ Pagination עבור ספקים מוצעים -- עמוד נוכחי בלבד
  const paginatedSuggestedSuppliers = React.useMemo(() => {
    const startIndex = (suggestedPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return filteredAllSuggested.slice(startIndex, endIndex);
  }, [filteredAllSuggested, suggestedPage]);

  // ✅ חילוץ קטגוריות ייחודיות מהספקים המוצעים
  const suggestedCategories = React.useMemo(() => {
    const cats = new Set();
    allSuggestedSuppliers.forEach(s => { if (s.category) cats.add(s.category); });
    return Array.from(cats).sort();
  }, [allSuggestedSuppliers]);

  // ✅ איפוס pagination כשמשנים טאב או מסננים
  useEffect(() => {
    setSuggestedPage(1);
  }, [activeTab, categoryFilter, searchTerm]);

  const handleAssignSupplier = async (supplier) => {
    try {
      const updatedEmails = supplier.customer_emails ?
      [...supplier.customer_emails, customer.email] :
      [customer.email];

      await base44.entities.Supplier.update(supplier.id, {
        customer_emails: updatedEmails
      });

      // ✅ רענון עם React Query
      queryClient.invalidateQueries(['customerSuppliers', customer.email]);
      queryClient.invalidateQueries(['suggestedSuppliers', customer.email]);
      queryClient.invalidateQueries(['suggestedSuppliersCount', customer.email]);
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

      // ✅ רענון עם React Query
      queryClient.invalidateQueries(['customerSuppliers', customer.email]);
      queryClient.invalidateQueries(['suggestedSuppliers', customer.email]);
      queryClient.invalidateQueries(['suggestedSuppliersCount', customer.email]);
    } catch (error) {
      console.error("Error removing supplier:", error);
    }
  };

  // ✅ מחיקת ספק לצמיתות - רק ספקים שהוקמו ידנית (source: manual)
  const handleDeleteSupplier = async (supplier) => {
    try {
      const otherCustomerEmails = (supplier.customer_emails || []).filter(
        (email) => email !== customer.email
      );

      if (otherCustomerEmails.length > 0) {
        // הספק משויך גם ללקוחות אחרים - נשלוף את שמותיהם
        let customerNames = [];
        try {
          const customerContacts = await base44.entities.CustomerContact.filter({});
          customerNames = otherCustomerEmails.map((email) => {
            const contact = customerContacts.find((c) => c.customer_email === email);
            return contact?.business_name || contact?.full_name || email;
          });
        } catch {
          // fallback - אם לא הצלחנו לשלוף שמות, נציג אימיילים
          customerNames = otherCustomerEmails;
        }

        const namesStr = customerNames.join(', ');
        const confirmed = window.confirm(
          `שים לב! הספק "${supplier.name}" משויך גם ללקוחות הבאים:\n${namesStr}\n\nמחיקת הספק תסיר אותו גם מהלקוחות הללו.\nהאם אתה בטוח שברצונך למחוק את הספק לצמיתות?`
        );
        if (!confirmed) return;
      } else {
        // הספק משויך רק ללקוח הנוכחי
        const confirmed = window.confirm(
          `האם אתה בטוח שברצונך למחוק את הספק "${supplier.name}" לצמיתות מהמערכת?`
        );
        if (!confirmed) return;
      }

      await base44.entities.Supplier.delete(supplier.id);

      // ✅ רענון עם React Query
      queryClient.invalidateQueries(['customerSuppliers', customer.email]);
      queryClient.invalidateQueries(['suggestedSuppliers', customer.email]);
      queryClient.invalidateQueries(['suggestedSuppliersCount', customer.email]);
    } catch (error) {
      console.error("Error deleting supplier:", error);
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

  /* commented out - partner supplier feature disabled for now
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
  */

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

  const filteredSuppliers = React.useMemo(() => 
    suppliers.filter((supplier) =>
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [suppliers, searchTerm]
  );

  // filteredSuggestedSuppliers is now paginatedSuggestedSuppliers (filtering happens before pagination)

  const canAddSupplier = currentUser && (currentUser.role === 'admin' || currentUser.user_type === 'financial_manager');

  // ✅ טעינה רק עבור ספקי הלקוח (מהיר) - לא חוסם את כל הממשק
  const isLoading = isLoadingCustomerSuppliers;

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
              ספקים מוצעים ({activeTab === 'suggested-suppliers' && !isLoadingSuggested ? allSuggestedSuppliers.length : (isLoadingSuggestedCount ? '...' : suggestedSuppliersCount)})
              {isLoadingSuggested && activeTab === 'suggested-suppliers' && (
                <span className="mr-2 animate-spin">⏳</span>
              )}
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
                      {/* <TableHead className="text-right text-horizon-accent">סטטוס</TableHead> */}
                      <TableHead className="text-right text-horizon-accent">איש קשר</TableHead>
                      <TableHead className="text-right text-horizon-accent">טלפון</TableHead>
                      <TableHead className="text-right text-horizon-accent">דירוג</TableHead>
                      <TableHead className="text-right text-horizon-accent">מקור</TableHead>
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
                        {/* <TableCell className="text-right">{renderSupplierStatus(supplier)}</TableCell> */}
                        <TableCell className="text-horizon-accent text-right">{supplier.contact_person || '-'}</TableCell>
                        <TableCell className="text-horizon-accent text-right" dir="ltr">
                          {supplier.phone ?
                      <a href={`tel:${supplier.phone}`} className="text-horizon-primary hover:underline">{supplier.phone}</a> :
                      '-'}
                        </TableCell>
                        <TableCell className="text-right">{renderStarRating(supplier.rating)}</TableCell>
                        <TableCell className="text-right">
                          {supplier.created_for_customer_email === customer.email ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 font-medium">
                              ספק של הלקוח
                            </Badge>
                          ) : supplier.created_for_customer_email ? (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium">
                              שויך מלקוח אחר
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 font-medium">
                              טרם סווג
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {canAddSupplier && (
                            supplier.source === 'manual' && (!supplier.created_for_customer_email || supplier.created_for_customer_email === customer.email) ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-700 hover:bg-red-800"
                                onClick={() => handleDeleteSupplier(supplier)}>
                                <Trash2 className="w-3.5 h-3.5 ml-1" />
                                מחק ספק
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-orange-400 text-orange-500 hover:bg-orange-50 hover:text-orange-600 font-medium"
                                onClick={() => handleRemoveSupplier(supplier)}>
                                <Unlink className="w-3.5 h-3.5 ml-1" />
                                הסר שיוך
                              </Button>
                            )
                          )}
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
            <div className="mb-4 flex justify-between items-center">
                {/* סינון לפי קטגוריה */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-horizon-accent" />
                  <select
                    value={categoryFilter || ''}
                    onChange={(e) => setCategoryFilter(e.target.value || null)}
                    className="bg-horizon-card border border-horizon rounded-md px-3 py-1.5 text-sm text-horizon-text"
                    dir="rtl"
                  >
                    <option value="">כל הקטגוריות</option>
                    {suggestedCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <Button
                onClick={() => setShowFindAlternativeModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white">
                  <SearchCheck className="w-4 h-4 ml-2" />
                  מצא ספק חלופי באינטרנט
                </Button>
              </div>
            }

            {/* מידע על תוצאות */}
            {!isLoadingSuggested && filteredAllSuggested.length > 0 && (
              <div className="mb-3 text-sm text-horizon-accent flex items-center justify-between">
                <span>
                  מציג {Math.min((suggestedPage - 1) * PAGE_SIZE + 1, filteredAllSuggested.length)}-{Math.min(suggestedPage * PAGE_SIZE, filteredAllSuggested.length)} מתוך {filteredAllSuggested.length} ספקים
                  {(searchTerm || categoryFilter) && ` (סה"כ במערכת: ${allSuggestedSuppliers.length})`}
                </span>
              </div>
            )}
            
            {isLoadingSuggested ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-horizon-primary mx-auto mb-4"></div>
                <p className="text-horizon-accent">טוען ספקים מוצעים...</p>
              </div>
            ) : paginatedSuggestedSuppliers.length > 0 ?
            <>
              <div className="border rounded-lg overflow-hidden border-horizon">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow className="bg-horizon-card hover:bg-horizon-card/80">
                      <TableHead className="text-right text-horizon-accent">שם הספק</TableHead>
                      <TableHead className="text-right text-horizon-accent">סוג</TableHead>
                      <TableHead className="text-right text-horizon-accent">איש קשר</TableHead>
                      <TableHead className="text-right text-horizon-accent">טלפון</TableHead>
                      <TableHead className="text-right text-horizon-accent">דירוג</TableHead>
                      <TableHead className="text-center text-horizon-accent">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSuggestedSuppliers.map((supplier) =>
                  <TableRow key={supplier.id} className="border-horizon">
                        <TableCell className="font-medium text-right">
                          <Button variant="link" onClick={() => setSelectedSuggestedSupplier(supplier)} className="text-horizon-primary p-0 h-auto">
                            {supplier.name}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">{renderCategoryBadge(supplier.category)}</TableCell>
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
              </div>
              
              {/* Pagination Controls */}
              {totalSuggestedPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-4" dir="rtl">
                  <Button
                    onClick={() => setSuggestedPage(prev => Math.max(1, prev - 1))}
                    variant="outline"
                    size="sm"
                    className="border-horizon text-horizon-text"
                    disabled={suggestedPage === 1}
                  >
                    <ChevronRight className="w-4 h-4 ml-1" />
                    הקודם
                  </Button>
                  <span className="text-sm text-horizon-text font-medium">
                    עמוד {suggestedPage} מתוך {totalSuggestedPages}
                  </span>
                  <Button
                    onClick={() => setSuggestedPage(prev => Math.min(totalSuggestedPages, prev + 1))}
                    variant="outline"
                    size="sm"
                    className="border-horizon text-horizon-text"
                    disabled={suggestedPage === totalSuggestedPages}
                  >
                    הבא
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              )}
            </> :

            <div className="text-center py-8">
                <Truck className="w-12 h-12 mx-auto mb-3 text-horizon-accent" />
                <p className="text-horizon-accent">
                  {(searchTerm || categoryFilter) ? 'לא נמצאו ספקים מוצעים לפי הסינון' : 'אין ספקים זמינים להקצאה'}
                </p>
              </div>
            }
          </TabsContent>
        </Tabs>
      </CardContent>

      {showAddModal &&
      <AddSupplierModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSupplierAdded={async () => {
          // ✅ רענון עם React Query
          queryClient.invalidateQueries(['customerSuppliers', customer.email]);
          queryClient.invalidateQueries(['suggestedSuppliers', customer.email]);
          queryClient.invalidateQueries(['suggestedSuppliersCount', customer.email]);
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
        onFindAlternatives={handleFindAlternatives}
        onSupplierUpdated={async (updatedSupplier) => {
          // ✅ רענון עם React Query
          queryClient.invalidateQueries(['customerSuppliers', customer.email]);
          queryClient.invalidateQueries(['suggestedSuppliers', customer.email]);
          queryClient.invalidateQueries(['suggestedSuppliersCount', customer.email]);
          
          // עדכון הספק הנבחר להצגת הנתונים החדשים
          if (updatedSupplier) {
            setSelectedSupplier(updatedSupplier);
          }
        }} />

      }

      {showFindAlternativeModal &&
      <FindAlternativeSupplierModal
        isOpen={showFindAlternativeModal}
        onClose={() => setShowFindAlternativeModal(false)}
        customerEmail={customer.email}
        currentUser={currentUser}
        onSupplierAdded={async () => {
          // ✅ רענון עם React Query
          queryClient.invalidateQueries(['customerSuppliers', customer.email]);
          queryClient.invalidateQueries(['suggestedSuppliers', customer.email]);
          queryClient.invalidateQueries(['suggestedSuppliersCount', customer.email]);
          setShowFindAlternativeModal(false);
        }} />

      }

      {/* מודל תצוגה מקדימה לספקים מוצעים - מציג רק פרטים בסיסיים */}
      {selectedSuggestedSupplier &&
      <SupplierPreviewModal
        supplier={selectedSuggestedSupplier}
        isOpen={!!selectedSuggestedSupplier}
        onClose={() => setSelectedSuggestedSupplier(null)}
        onAssign={(supplier) => {
          handleAssignSupplier(supplier);
          setSelectedSuggestedSupplier(null);
        }}
        canAssign={canAddSupplier} />

      }
    </Card>);

}