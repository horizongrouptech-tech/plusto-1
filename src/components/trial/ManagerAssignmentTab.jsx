import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Save, UserPlus, Users } from 'lucide-react';

export default function ManagerAssignmentTab({ customer, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === 'admin';
  const isDepartmentManager = currentUser?.department_manager_role === 'department_manager';

  // טעינת כל בקשות האונבורדינג
  const { data: onboardingRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['onboardingRequests'],
    queryFn: async () => {
      const allRequests = await base44.entities.OnboardingRequest.list();
      
      // אם מנהל מחלקה - הצג רק את הלקוחות שלו
      if (isDepartmentManager && !isAdmin) {
        return allRequests.filter(req => 
          req.assigned_financial_manager_email === currentUser.email ||
          req.additional_assigned_financial_manager_emails?.includes(currentUser.email)
        );
      }
      
      // אדמין רואה הכל
      return allRequests;
    },
    enabled: isAdmin || isDepartmentManager
  });

  // טעינת רשימת מנהלי כספים
  const { data: financialManagers = [] } = useQuery({
    queryKey: ['financialManagers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'financial_manager');
    },
    enabled: isAdmin || isDepartmentManager
  });

  // אתחול assignments מהנתונים הקיימים
  useEffect(() => {
    if (onboardingRequests.length > 0) {
      const initialAssignments = {};
      onboardingRequests.forEach(req => {
        initialAssignments[req.id] = req.assigned_financial_manager_email || null;
      });
      setAssignments(initialAssignments);
    }
  }, [onboardingRequests]);

  // סינון לפי חיפוש
  const filteredRequests = onboardingRequests.filter(req => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      req.business_name?.toLowerCase().includes(term) ||
      req.full_name?.toLowerCase().includes(term) ||
      req.email?.toLowerCase().includes(term)
    );
  });

  const handleAssignmentChange = (requestId, managerEmail) => {
    setAssignments(prev => ({
      ...prev,
      [requestId]: managerEmail === 'null' ? null : managerEmail
    }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(assignments).map(([requestId, managerEmail]) => {
        const originalRequest = onboardingRequests.find(r => r.id === requestId);
        if (originalRequest?.assigned_financial_manager_email !== managerEmail) {
          return base44.entities.OnboardingRequest.update(requestId, {
            assigned_financial_manager_email: managerEmail
          });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(updates);
      
      queryClient.invalidateQueries(['onboardingRequests']);
      setHasChanges(false);
      alert(`עודכנו ${updates.length} שיוכים בהצלחה`);
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('שגיאה בשמירת השיוכים: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin && !isDepartmentManager) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
          <p className="text-horizon-accent">אין לך הרשאה לצפות בטאב זה</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingRequests) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-horizon-primary" />
              שיוך מנהלי כספים ללקוחות
            </CardTitle>
            {hasChanges && (
              <Button
                onClick={handleSaveAll}
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
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* חיפוש */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
            <Input
              placeholder="חיפוש לקוח..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-horizon-dark border-horizon text-horizon-text"
            />
          </div>

          {/* סטטיסטיקות */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-horizon-dark/50 rounded-lg p-3 text-center">
              <p className="text-sm text-horizon-accent">סה"כ לקוחות</p>
              <p className="text-2xl font-bold text-horizon-text">{filteredRequests.length}</p>
            </div>
            <div className="bg-horizon-dark/50 rounded-lg p-3 text-center">
              <p className="text-sm text-horizon-accent">עם שיוך</p>
              <p className="text-2xl font-bold text-green-400">
                {filteredRequests.filter(r => r.assigned_financial_manager_email).length}
              </p>
            </div>
            <div className="bg-horizon-dark/50 rounded-lg p-3 text-center">
              <p className="text-sm text-horizon-accent">ללא שיוך</p>
              <p className="text-2xl font-bold text-orange-400">
                {filteredRequests.filter(r => !r.assigned_financial_manager_email).length}
              </p>
            </div>
          </div>

          {/* טבלת שיוכים */}
          <div className="border border-horizon rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-horizon-dark">
                  <TableHead className="text-right text-horizon-text">שם עסק</TableHead>
                  <TableHead className="text-right text-horizon-text">שם מנהל</TableHead>
                  <TableHead className="text-right text-horizon-text">אימייל</TableHead>
                  <TableHead className="text-right text-horizon-text">טלפון</TableHead>
                  <TableHead className="text-right text-horizon-text">מנהל כספים</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-horizon-dark/30">
                    <TableCell className="text-right text-horizon-text font-medium">
                      {request.business_name || 'ללא שם'}
                    </TableCell>
                    <TableCell className="text-right text-horizon-accent">
                      {request.full_name}
                    </TableCell>
                    <TableCell className="text-right text-horizon-accent text-sm">
                      {request.email}
                    </TableCell>
                    <TableCell className="text-right text-horizon-accent text-sm">
                      {request.phone || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={assignments[request.id] || 'null'}
                        onValueChange={(value) => handleAssignmentChange(request.id, value)}
                      >
                        <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text w-full">
                          <SelectValue placeholder="בחר מנהל..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">ללא שיוך</SelectItem>
                          {financialManagers.map(manager => (
                            <SelectItem key={manager.email} value={manager.email}>
                              {manager.full_name || manager.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent">אין לקוחות להצגה</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}