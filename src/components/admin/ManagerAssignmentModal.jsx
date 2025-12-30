import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Save, X, Plus, Users, Building2 } from 'lucide-react';
import { getFinancialManagers } from '@/functions/getFinancialManagers';

export default function ManagerAssignmentModal({ isOpen, onClose, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState({});
  const [additionalAssignments, setAdditionalAssignments] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const queryClient = useQueryClient();

  // טעינת כל בקשות האונבורדינג
  const { data: onboardingRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['onboardingRequests'],
    queryFn: () => base44.entities.OnboardingRequest.list()
  });

  // טעינת מנהלי כספים דרך backend function
  const { data: financialManagersData, isLoading: loadingManagers } = useQuery({
    queryKey: ['financialManagers'],
    queryFn: async () => {
      const response = await getFinancialManagers({});
      return response.data?.managers || [];
    },
    enabled: !!currentUser
  });

  const financialManagers = financialManagersData || [];

  // סינון לקוחות לפי הרשאות
  const filteredRequests = useMemo(() => {
    let filtered = onboardingRequests;
    
    // מנהל מחלקה רואה את כל הלקוחות (כמו אדמין)
    if (currentUser?.department_manager_role === 'department_manager' && currentUser?.role !== 'admin') {
      filtered = onboardingRequests; // רואה את כל הלקוחות
    }
    
    // סינון לפי חיפוש
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.filter(req => req.is_active);
  }, [onboardingRequests, searchTerm, currentUser]);

  // אתחול assignments מהנתונים הקיימים
  useEffect(() => {
    if (onboardingRequests.length > 0) {
      const initialAssignments = {};
      const initialAdditional = {};
      onboardingRequests.forEach(req => {
        initialAssignments[req.id] = req.assigned_financial_manager_email || null;
        initialAdditional[req.id] = req.additional_assigned_financial_manager_emails || [];
      });
      setAssignments(initialAssignments);
      setAdditionalAssignments(initialAdditional);
    }
  }, [onboardingRequests]);

  const handleAssignmentChange = (requestId, managerEmail) => {
    setAssignments(prev => ({
      ...prev,
      [requestId]: managerEmail === 'null' ? null : managerEmail
    }));
    setHasChanges(true);
  };

  const handleAddAdditionalManager = (requestId, managerEmail) => {
    if (!managerEmail || managerEmail === 'null') return;
    
    setAdditionalAssignments(prev => ({
      ...prev,
      [requestId]: [...(prev[requestId] || []), managerEmail]
    }));
    setHasChanges(true);
  };

  const handleRemoveAdditionalManager = (requestId, managerEmail) => {
    setAdditionalAssignments(prev => ({
      ...prev,
      [requestId]: (prev[requestId] || []).filter(email => email !== managerEmail)
    }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(assignments).map(([requestId, managerEmail]) => {
        const originalRequest = onboardingRequests.find(r => r.id === requestId);
        const additionalEmails = additionalAssignments[requestId] || [];
        
        const needsUpdate = 
          originalRequest?.assigned_financial_manager_email !== managerEmail ||
          JSON.stringify(originalRequest?.additional_assigned_financial_manager_emails || []) !== JSON.stringify(additionalEmails);
        
        if (needsUpdate) {
          return base44.entities.OnboardingRequest.update(requestId, {
            assigned_financial_manager_email: managerEmail,
            additional_assigned_financial_manager_emails: additionalEmails
          });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(updates);
      
      queryClient.invalidateQueries(['onboardingRequests']);
      queryClient.invalidateQueries(['activeCustomers']);
      setHasChanges(false);
      alert(`עודכנו ${updates.length} שיוכים בהצלחה`);
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('שגיאה בשמירת השיוכים: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingRequests || loadingManagers) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader className="bg-gradient-to-l from-horizon-primary/10 to-transparent pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2 mb-2">
                <Users className="w-6 h-6 text-horizon-primary" />
                שיוך מנהלי כספים ללקוחות
              </DialogTitle>
              <p className="text-sm text-horizon-accent">
                נהל את השיוכים בין מנהלי הכספים ללקוחות במערכת
              </p>
            </div>
            {hasChanges && (
              <Button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="btn-horizon-primary shadow-lg"
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
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* סטטיסטיקות ופילטרים */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-horizon-primary/10 to-transparent border border-horizon rounded-xl p-3 text-center">
                <p className="text-xs text-horizon-accent mb-1">סה"כ לקוחות</p>
                <p className="text-2xl font-bold text-horizon-text">{filteredRequests.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30 rounded-xl p-3 text-center">
                <p className="text-xs text-green-300 mb-1">משויכים</p>
                <p className="text-2xl font-bold text-green-400">
                  {filteredRequests.filter(r => r.assigned_financial_manager_email).length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/30 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-300 mb-1">ממתינים</p>
                <p className="text-2xl font-bold text-orange-400">
                  {filteredRequests.filter(r => !r.assigned_financial_manager_email).length}
                </p>
              </div>
            </div>
            <div>
              <Input
                placeholder="🔍 חפש לקוח..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
          </div>

          {/* רשימת לקוחות */}
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const primaryManager = financialManagers.find(m => m.email === assignments[request.id]);
              const additionalManagers = (additionalAssignments[request.id] || [])
                .map(email => financialManagers.find(m => m.email === email))
                .filter(Boolean);
              const hasAssignment = !!assignments[request.id];
              const availableManagers = financialManagers.filter(m => 
                m.email !== assignments[request.id] && 
                !(additionalAssignments[request.id] || []).includes(m.email)
              );
              
              return (
                <div 
                  key={request.id} 
                  className="bg-horizon-card border border-horizon rounded-xl p-4 hover:shadow-lg transition-all hover:border-horizon-primary"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      {/* פרטי לקוח */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-horizon-primary to-horizon-secondary rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                            {request.business_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-horizon-text truncate">
                              {request.business_name || 'ללא שם'}
                            </p>
                            <p className="text-sm text-horizon-accent truncate">
                              {request.full_name} • {request.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* אינדיקטור סטטוס */}
                      <div className="flex-shrink-0">
                        {hasAssignment ? (
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        ) : (
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* מנהל ראשי */}
                      <div>
                        <p className="text-xs text-horizon-accent mb-2 font-medium">מנהל כספים ראשי:</p>
                        <Select
                          value={assignments[request.id] || 'null'}
                          onValueChange={(value) => handleAssignmentChange(request.id, value)}
                        >
                          <SelectTrigger className={`bg-horizon-dark border-2 text-horizon-text ${hasAssignment ? 'border-green-500/50' : 'border-orange-500/50'}`}>
                            <SelectValue placeholder="בחר מנהל כספים..." />
                          </SelectTrigger>
                          <SelectContent className="bg-horizon-dark border-horizon">
                            <SelectItem value="null" className="text-horizon-accent">
                              ללא שיוך
                            </SelectItem>
                            {financialManagers.map(manager => (
                              <SelectItem key={manager.email} value={manager.email} className="text-horizon-text">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-horizon-primary rounded-full flex items-center justify-center text-white text-xs">
                                    {manager.full_name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  {manager.full_name || manager.email}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* מנהלים נוספים */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-horizon-accent font-medium">מנהלים נוספים:</p>
                          {availableManagers.length > 0 && (
                            <Select
                              value="null"
                              onValueChange={(value) => {
                                if (value !== 'null') {
                                  handleAddAdditionalManager(request.id, value);
                                }
                              }}
                            >
                              <SelectTrigger className="w-32 h-8 bg-horizon-primary/20 border-horizon-primary text-horizon-primary text-xs">
                                <SelectValue>
                                  <div className="flex items-center gap-1">
                                    <Plus className="w-3 h-3" />
                                    <span>הוסף</span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-horizon-dark border-horizon">
                                <SelectItem value="null" disabled className="text-horizon-accent">
                                  בחר מנהל...
                                </SelectItem>
                                {availableManagers.map(manager => (
                                  <SelectItem key={manager.email} value={manager.email} className="text-horizon-text">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-horizon-secondary rounded-full flex items-center justify-center text-white text-xs">
                                        {manager.full_name?.charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                      {manager.full_name || manager.email}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        
                        {additionalManagers.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {additionalManagers.map((manager) => (
                              <Badge 
                                key={manager.email}
                                className="bg-horizon-secondary/20 text-horizon-secondary border-horizon-secondary flex items-center gap-1"
                              >
                                <div className="w-4 h-4 bg-horizon-secondary rounded-full flex items-center justify-center text-white text-[9px]">
                                  {manager.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                {manager.full_name || manager.email}
                                <button
                                  onClick={() => handleRemoveAdditionalManager(request.id, manager.email)}
                                  className="hover:bg-red-500/20 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-horizon-accent/50 italic">אין מנהלים נוספים</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12 bg-horizon-dark/30 rounded-xl">
              <Building2 className="w-20 h-20 mx-auto mb-4 text-horizon-accent opacity-30" />
              <p className="text-horizon-text font-medium mb-1">אין לקוחות להצגה</p>
              <p className="text-sm text-horizon-accent">נסה לשנות את תנאי החיפוש</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}