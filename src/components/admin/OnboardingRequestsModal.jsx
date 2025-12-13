
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building,
  Target,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowRight
} from "lucide-react";
import { OnboardingRequest } from "@/entities/OnboardingRequest";
// ייבוא רק הפונקציה הראשית
import { approveOnboardingRequest } from '@/functions/approveOnboardingRequest';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OnboardingRequestsModal({ isOpen, onClose }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  const loadRequests = async () => {
    setIsLoading(true);
    setApprovalStatus('');
    try {
      const allRequests = await OnboardingRequest.filter({}, '-created_date');
      setRequests(allRequests);
    } catch (error) {
      console.error("Error loading onboarding requests:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const businessTypeReverseMap = {
    'retail': 'קמעונאות',
    'wholesale': 'סיטונאות', 
    'import': 'ייבוא',
    'manufacturing': 'ייצור',
    'export': 'יצוא',
    'services': 'שירותים',
    'restaurant': 'מסעדות/קייטרינג',
    'fashion': 'אופנה',
    'tech': 'טכנולוגיה',
    'other': 'אחר'
  };

  const companySizeReverseMap = {
    '1-10': '1-10 עובדים',
    '11-50': '11-50 עובדים', 
    '51-200': '51-200 עובדים',
    '200+': 'מעל 200 עובדים'
  };
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setEditFormData({
      full_name: request.full_name || '',
      email: request.email || '',
      phone: request.phone || '',
      business_name: request.business_name || '',
      business_type: businessTypeReverseMap[request.business_type] || request.business_type || '',
      company_size: companySizeReverseMap[request.company_size] || request.company_size || '',
      monthly_revenue: request.monthly_revenue || '',
      business_city: request.business_city || '',
      website_url: request.website_url || '',
      main_products_services: request.main_products_services || '',
      target_audience: request.target_audience || '',
      business_goals: request.business_goals || '',
      bestselling_products: request.bestselling_products || '',
      unwanted_products: request.unwanted_products || '',
      admin_notes: request.admin_notes || ''
    });
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequest) return;
    
    try {
      // Maps להמרה חזרה מאנגלית לעברית
      const businessTypeMap = {
        'קמעונאות': 'retail',
        'סיטונאות': 'wholesale',
        'ייבוא': 'import',
        'ייצור': 'manufacturing',
        'יצוא': 'export',
        'שירותים': 'services',
        'מסעדות/קייטרינג': 'restaurant',
        'אופנה': 'fashion',
        'טכנולוגיה': 'tech',
        'אחר': 'other'
      };

      const companySizeMap = {
        '1-10 עובדים': '1-10',
        '11-50 עובדים': '11-50',
        '51-200 עובדים': '51-200',
        'מעל 200 עובדים': '200+'
      };

      const updatedData = {
        ...editFormData,
        // המרה חזרה מאנגלית לעברית
        business_type: businessTypeMap[editFormData.business_type] || editFormData.business_type,
        company_size: companySizeMap[editFormData.company_size] || editFormData.company_size,
        // השאר את השדות האחרים כמו שהם
        unwanted_products: editFormData.unwanted_products || '',
        bestselling_products: editFormData.bestselling_products || ''
      };

      await OnboardingRequest.update(selectedRequest.id, updatedData);
      // ...
    } catch (error) {
      // ...
    }
  };

  // פונקציית אישור פשוטה - רק מסמנת את הבקשה כמאושרת
  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    setIsApproving(true);
    setApprovalStatus('מאשר בקשה...');

    try {
      // MODIFICATION START: Pass the entire selectedRequest object
      const approvalResponse = await approveOnboardingRequest({ onboardingRequest: selectedRequest });
      // MODIFICATION END

      if (approvalResponse.data?.success) {
        setApprovalStatus('הבקשה אושרה בהצלחה!');
        alert('הלקוח אושר בהצלחה! ניתן לנהל אותו דרך רשימת הבקשות המאושרות.');
        await loadRequests(); // רענון הרשימה
        setSelectedRequest(null); // סגור את תצוגת הבקשה
      } else {
        throw new Error(approvalResponse.data?.error || 'שגיאה באישור הבקשה');
      }

    } catch (error) {
      console.error("Approval process failed:", error);
      setApprovalStatus(`שגיאה: ${error.message}`);
      alert(`שגיאה בתהליך האישור: ${error.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  // פונקציה לביטול אישור
  const handleRevokeApproval = async () => {
    if (!selectedRequest) return;
    
    const confirmRevoke = confirm(
      `האם אתה בטוח שברצונך לבטל את האישור של הבקשה עבור ${selectedRequest.full_name}?\n\n` +
      'שים לב: פעולה זו תשנה את סטטוס הבקשה חזרה ל"ממתין" אך לא תמחק משתמשים או המלצות שכבר נוצרו במערכת.'
    );
    
    if (!confirmRevoke) return;

    setIsRevoking(true);
    setApprovalStatus('מבטל אישור...');

    try {
      const updatedRequest = await OnboardingRequest.update(selectedRequest.id, {
        status: 'pending',
        admin_notes: (selectedRequest.admin_notes || '') + `\nאישור בוטל על ידי אדמין בתאריך ${new Date().toLocaleDateString('he-IL')}`
      });

      setSelectedRequest(prev => ({ ...prev, status: 'pending', admin_notes: updatedRequest.admin_notes }));
      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id ? { ...req, status: 'pending', admin_notes: updatedRequest.admin_notes } : req
      ));

      setApprovalStatus('האישור בוטל בהצלחה');
      alert('האישור בוטל בהצלחה. הבקשה חזרה למצב "ממתין".');
      
      setTimeout(() => {
        setApprovalStatus('');
      }, 3000);

    } catch (error) {
      console.error("Error revoking approval:", error);
      setApprovalStatus(`שגיאה בביטול האישור: ${error.message}`);
      alert(`שגיאה בביטול האישור: ${error.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: 'ממתין', icon: AlertCircle, color: 'bg-yellow-500' },
      approved: { text: 'אושר', icon: CheckCircle, color: 'bg-green-500' },
      rejected: { text: 'נדחה', icon: XCircle, color: 'bg-red-500' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const formatProductList = (products) => {
    if (!Array.isArray(products) || products.length === 0) {
      return <span className="text-horizon-accent">לא צוין</span>;
    }
    return products.map((product, index) => (
      <div key={index} className="flex items-center gap-2 text-sm">
        <span className="w-2 h-2 bg-horizon-primary rounded-full"></span>
        <span className="text-horizon-text">{product}</span>
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-text text-right">
            בקשות הצטרפות למערכת
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-horizon-primary"></div>
            </div>
          ) : selectedRequest ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-horizon">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedRequest(null)}
                    className="text-horizon-accent hover:text-horizon-text"
                  >
                    <ArrowRight className="w-4 h-4 ml-2" />
                    חזור לרשימה
                  </Button>
                  <h3 className="text-xl font-bold text-horizon-text">
                    פרטי בקשה: {selectedRequest.full_name}
                  </h3>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-horizon-primary">
                      <User className="w-5 h-5" />
                      <h3 className="font-semibold">פרטים אישיים</h3>
                    </div>
                    <div className="space-y-2 pr-4">
                      <div><span className="text-horizon-accent">שם מלא: </span><span className="text-horizon-text">{selectedRequest.full_name}</span></div>
                      <div><span className="text-horizon-accent">אימייל: </span><span className="text-horizon-text">{selectedRequest.email}</span></div>
                      <div><span className="text-horizon-accent">טלפון: </span><span className="text-horizon-text">{selectedRequest.phone}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-horizon-primary">
                      <Building className="w-5 h-5" />
                      <h3 className="font-semibold">פרטי עסק</h3>
                    </div>
                    <div className="space-y-2 pr-4">
                      <div><span className="text-horizon-accent">שם עסק: </span><span className="text-horizon-text">{selectedRequest.business_name}</span></div>
                      <div><span className="text-horizon-accent">סוג עסק: </span><span className="text-horizon-text">{selectedRequest.business_type || 'לא צוין'}</span></div>
                      <div><span className="text-horizon-accent">גודל חברה: </span><span className="text-horizon-text">{selectedRequest.company_size || 'לא צוין'}</span></div> {/* ADD THIS LINE */}
                      <div><span className="text-horizon-accent">עיר: </span><span className="text-horizon-text">{selectedRequest.business_city || 'לא צוין'}</span></div>
                      <div><span className="text-horizon-accent">מחזור חודשי: </span><span className="text-horizon-text">₪{selectedRequest.monthly_revenue}</span></div>
                      <div><span className="text-horizon-accent">אתר: </span><span className="text-horizon-text">{selectedRequest.website_url || 'לא צוין'}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-horizon-primary">
                      <Package className="w-5 h-5" />
                      <h3 className="font-semibold">מוצרים/שירותים</h3>
                    </div>
                    <div className="pr-4">
                      <p className="text-horizon-text">{selectedRequest.main_products_services || 'לא צוין'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-horizon-primary">
                      <Target className="w-5 h-5" />
                      <h3 className="font-semibold">קהל יעד ויעדים</h3>
                    </div>
                    <div className="space-y-2 pr-4">
                      <div><span className="text-horizon-accent">קהל יעד: </span><span className="text-horizon-text">{selectedRequest.target_audience || 'לא צוין'}</span></div>
                      <div><span className="text-horizon-accent">יעדים עסקיים: </span><span className="text-horizon-text">{selectedRequest.business_goals || 'לא צוין'}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* ודא שזהו הבלוק הנכון */}
                      <div className="space-y-4">
                          <div className="flex items-center gap-2 text-horizon-primary">
                              <TrendingDown className="w-5 h-5" />
                              <h3 className="font-semibold">מוצרים "להעיף"</h3>
                          </div>
                          <div className="pr-4 space-y-1">
                              <p className="text-horizon-text">{selectedRequest.unwanted_products || 'לא צוין'}</p> {/* ADD THIS LINE */}
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex items-center gap-2 text-horizon-primary">
                              <TrendingUp className="w-5 h-5" />
                              <h3 className="font-semibold">מוצרים נמכרים ביותר</h3>
                          </div>
                          <div className="pr-4 space-y-1">
                              <p className="text-horizon-text">{selectedRequest.bestselling_products || 'לא צוין'}</p> {/* ADD THIS LINE */}
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <h3 className="font-semibold text-horizon-primary">הערות אדמין</h3>
                    <Textarea
                      readOnly
                      value={selectedRequest.admin_notes || 'אין הערות'}
                      className="bg-horizon-card border-horizon text-horizon-text h-20 resize-none"
                    />
                  </div>
                </div>
              ) : (
                // תצוגת עריכה
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-horizon-primary">פרטים אישיים</h3>
                    <Input
                      placeholder="שם מלא"
                      value={editFormData.full_name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                    <Input
                      placeholder="אימייל"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                    <Input
                      placeholder="טלפון"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-horizon-primary">פרטי עסק</h3>
                    <Input
                      placeholder="שם עסק"
                      value={editFormData.business_name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, business_name: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                    <div>
                      <label className="block text-sm font-medium text-horizon-text mb-2">סוג עסק</label>
                      <Select
                        value={editFormData.business_type}
                        onValueChange={(value) => setEditFormData(prev => ({ ...prev, business_type: value }))}
                      >
                        <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                          <SelectValue placeholder="בחר סוג עסק" />
                        </SelectTrigger>
                        <SelectContent className="bg-horizon-card border-horizon">
                          <SelectItem value="retail">קמעונאות</SelectItem>
                          <SelectItem value="wholesale">סיטונאות</SelectItem>
                          <SelectItem value="manufacturing">ייצור</SelectItem>
                          <SelectItem value="import">יבוא</SelectItem>
                          <SelectItem value="export">יצוא</SelectItem>
                          <SelectItem value="services">שירותים</SelectItem>
                          <SelectItem value="restaurant">מסעדנות</SelectItem>
                          <SelectItem value="fashion">אופנה</SelectItem>
                          <SelectItem value="tech">טכנולוגיה</SelectItem>
                          <SelectItem value="other">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div> {/* ADD THIS BLOCK */}
                        <label className="block text-sm font-medium text-horizon-text mb-2">גודל חברה</label>
                        <Select
                            value={editFormData.company_size}
                            onValueChange={(value) => setEditFormData(prev => ({ ...prev, company_size: value }))}
                        >
                            <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                                <SelectValue placeholder="כמה עובדים?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1-10">1-10 עובדים</SelectItem>
                                <SelectItem value="11-50">11-50 עובדים</SelectItem>
                                <SelectItem value="51-200">51-200 עובדים</SelectItem>
                                <SelectItem value="200+">מעל 200 עובדים</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>
                    <Input
                      placeholder="עיר"
                      value={editFormData.business_city}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, business_city: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                    <Input
                      placeholder="מחזור חודשי"
                      value={editFormData.monthly_revenue}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, monthly_revenue: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                    <Input
                      placeholder="כתובת אתר"
                      value={editFormData.website_url}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, website_url: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <h3 className="font-semibold text-horizon-primary">מוצרים ושירותים</h3>
                    <Textarea
                      placeholder="תאר את המוצרים או השירותים העיקריים שלך..."
                      value={editFormData.main_products_services}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, main_products_services: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text h-24"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-horizon-primary">קהל יעד</h3>
                    <Textarea
                      placeholder="תאר את קהל היעד שלך..."
                      value={editFormData.target_audience}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text h-24"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-horizon-primary">יעדים עסקיים</h3>
                    <Textarea
                      placeholder="תאר את היעדים העסקיים שלך..."
                      value={editFormData.business_goals}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, business_goals: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text h-24"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-red-400">מוצרים "להעיף"</h3>
                    <Textarea
                      placeholder="הזן רשימת המוצרים מופרדים בפסיק..."
                      value={editFormData.unwanted_products}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, unwanted_products: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text h-20"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-green-400">מוצרים נמכרים ביותר</h3>
                    <Textarea
                      placeholder="הזן רשימת המוצרים מופרדים בפסיק..."
                      value={editFormData.bestselling_products}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, bestselling_products: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text h-20"
                    />
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <h3 className="font-semibold text-horizon-primary">הערות אדמין</h3>
                    <Textarea
                      placeholder="הערות פנימיות..."
                      value={editFormData.admin_notes}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                      className="bg-horizon-card border-horizon text-horizon-text h-20"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col items-end gap-3 pt-4 border-t border-horizon">
                <div className="flex justify-end gap-3 w-full">
                  {!isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        className="border-horizon-accent text-horizon-accent hover:bg-horizon-accent hover:text-white"
                        disabled={isApproving || isRevoking}
                      >
                        ערוך פרטים
                      </Button>
                      
                      {selectedRequest && selectedRequest.status === 'pending' && (
                        <Button
                          onClick={handleApproveRequest}
                          className="btn-horizon-primary"
                          disabled={isApproving || isRevoking}
                        >
                          {isApproving ? (
                            <>
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                              מעבד...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 ml-2" />
                              אשר בקשה
                            </>
                          )}
                        </Button>
                      )}
                      
                      {selectedRequest && selectedRequest.status === 'approved' && (
                        <Button
                          onClick={handleRevokeApproval}
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-900/20"
                          disabled={isApproving || isRevoking}
                        >
                          {isRevoking ? (
                            <>
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                              מבטל...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 ml-2" />
                              בטל אישור
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="border-horizon-accent text-horizon-accent hover:bg-horizon-accent hover:text-white"
                        disabled={isApproving || isRevoking}
                      >
                        ביטול
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        className="btn-horizon-primary"
                        disabled={isApproving || isRevoking}
                      >
                        שמור שינויים
                      </Button>
                    </>
                  )}
                </div>
                
                {(isApproving || isRevoking) && (
                  <div className="text-sm text-horizon-accent mt-2 animate-pulse w-full text-left">
                    {approvalStatus}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-horizon-accent mb-4">
                סה"כ {requests.length} בקשות הצטרפות
              </div>
              
              {requests.length === 0 ? (
                <div className="text-center py-8 text-horizon-accent">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                  <p>אין בקשות הצטרפות חדשות</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-horizon-card rounded-lg border border-horizon hover:bg-horizon-card/80 transition-colors cursor-pointer"
                      onClick={() => handleViewRequest(request)}
                    >
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-horizon-accent hover:text-horizon-text"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <div>
                          <h4 className="font-semibold text-horizon-text">
                            {request.business_name}
                          </h4>
                          <p className="text-sm text-horizon-accent">
                            בעל העסק: {request.full_name} | אימייל: {request.email}
                          </p>
                          <p className="text-sm text-horizon-accent">
                            טלפון: {request.phone} | מחזור חודשי: ₪{parseFloat(request.monthly_revenue || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
