import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  ShieldCheck,
  RefreshCw,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// מיפוי roles לתצוגה בעברית
const roleLabels = {
  financial_manager: 'מנהל כספים',
  client: 'לקוח (בעל עסק)',
  department_manager: 'מנהל מחלקה',
  supplier_user: 'משתמש ספק',
};

const statusConfig = {
  pending: { text: 'ממתין', icon: AlertCircle, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  approved: { text: 'אושר', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-500' },
  rejected: { text: 'נדחה', icon: XCircle, color: 'bg-red-500', textColor: 'text-red-500' },
};

export default function UserApprovalPage() {
  const { user: currentUser } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chosenRole, setChosenRole] = useState('');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      // שליפת כל המשתמשים מ-profiles (חוץ מ-admin/super_admin)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_approved_by_admin, is_active, created_at')
        .not('role', 'in', '("admin","super_admin")')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // מיפוי לפורמט אחיד עם status
      const mapped = (data || []).map(p => ({
        ...p,
        user_id: p.id,
        status: p.is_approved_by_admin ? 'approved' : (p.is_active === false ? 'rejected' : 'pending'),
      }));
      setApprovals(mapped);
    } catch (error) {
      console.error('[UserApproval] Error loading users:', error);
      toast.error('שגיאה בטעינת רשימת המשתמשים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (approval) => {
    setSelected(approval);
    // למאושרים — מציג את ה-role הנוכחי ב-dropdown
    setChosenRole(approval.status === 'approved' ? (approval.role || '') : '');
    setNotes('');
  };

  const handleApprove = async () => {
    if (!selected || !chosenRole) {
      toast.error('יש לבחור תפקיד לפני אישור');
      return;
    }

    setIsProcessing(true);
    try {
      // עדכון ישיר ב-profiles — הגדרת role + אישור
      const { error } = await supabase
        .from('profiles')
        .update({
          role: chosenRole,
          user_type: chosenRole === 'financial_manager' ? 'financial_manager'
            : chosenRole === 'supplier_user' ? 'supplier_user'
            : 'regular',
          is_approved_by_admin: true,
          onboarding_completed: true,
          is_active: true,
        })
        .eq('id', selected.id);

      if (error) throw error;

      toast.success(`המשתמש ${selected.email} אושר בהצלחה כ-${roleLabels[chosenRole]}`);
      setSelected(null);
      await loadApprovals();
    } catch (error) {
      console.error('[UserApproval] Approve error:', error);
      toast.error(`שגיאה באישור: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!confirm(`האם לדחות את בקשת ${selected.email}?`)) return;

    setIsProcessing(true);
    try {
      // סימון המשתמש כלא פעיל (דחייה)
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', selected.id);

      if (error) throw error;

      toast.success('הבקשה נדחתה');
      setSelected(null);
      setStatusFilter('rejected');
      await loadApprovals();
    } catch (error) {
      console.error('[UserApproval] Reject error:', error);
      toast.error(`שגיאה בדחייה: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // שינוי תפקיד למשתמש מאושר
  const handleChangeRole = async () => {
    if (!selected || !chosenRole) {
      toast.error('יש לבחור תפקיד');
      return;
    }
    if (chosenRole === selected.role) {
      toast.info('התפקיד לא השתנה');
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: chosenRole,
          user_type: chosenRole === 'financial_manager' ? 'financial_manager'
            : chosenRole === 'supplier_user' ? 'supplier_user'
            : 'regular',
        })
        .eq('id', selected.id);

      if (error) throw error;

      toast.success(`תפקיד ${selected.email} שונה ל-${roleLabels[chosenRole]}`);
      setSelected(null);
      await loadApprovals();
    } catch (error) {
      console.error('[UserApproval] ChangeRole error:', error);
      toast.error(`שגיאה בשינוי תפקיד: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ביטול אישור / החזרה להמתנה
  const handleRevoke = async () => {
    if (!selected) return;
    if (!confirm(`האם להחזיר את ${selected.email} לסטטוס ממתין?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_approved_by_admin: false,
          is_active: true,
          role: 'client', // reset לברירת מחדל
        })
        .eq('id', selected.id);

      if (error) throw error;

      toast.success(`המשתמש ${selected.email} הוחזר לסטטוס ממתין`);
      setSelected(null);
      setStatusFilter('pending');
      await loadApprovals();
    } catch (error) {
      console.error('[UserApproval] Revoke error:', error);
      toast.error(`שגיאה בביטול: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const c = statusConfig[status] || statusConfig.pending;
    const Icon = c.icon;
    return (
      <Badge className={`${c.color} text-white flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {c.text}
      </Badge>
    );
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;

  const filteredApprovals = statusFilter === 'all'
    ? approvals
    : approvals.filter(a => a.status === statusFilter);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#32acc1] to-[#83ddec] rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-horizon-text">אישור משתמשים</h1>
            <p className="text-sm text-horizon-accent">ניהול בקשות הצטרפות למערכת</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadApprovals}
          disabled={isLoading}
          className="border-horizon text-horizon-accent hover:text-horizon-text"
        >
          <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>

      {/* סטטיסטיקות */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-yellow-500/10 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20 transition-colors"
              onClick={() => setStatusFilter('pending')}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
              <p className="text-sm text-horizon-accent">ממתינים לאישור</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30 cursor-pointer hover:bg-green-500/20 transition-colors"
              onClick={() => setStatusFilter('approved')}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-500">{approvedCount}</p>
              <p className="text-sm text-horizon-accent">אושרו</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
              onClick={() => setStatusFilter('rejected')}>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-500">{rejectedCount}</p>
              <p className="text-sm text-horizon-accent">נדחו</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* תוכן ראשי — רשימה או פרטי משתמש */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-horizon-primary" />
        </div>
      ) : selected ? (
        /* --- תצוגת פרטי משתמש נבחר --- */
        <Card className="bg-horizon-card border-horizon">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-horizon">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setSelected(null)}
                  className="text-horizon-accent hover:text-horizon-text"
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                  חזור לרשימה
                </Button>
                <h3 className="text-xl font-bold text-horizon-text">
                  {selected.full_name || selected.email}
                </h3>
              </div>
              {getStatusBadge(selected.status)}
            </div>

            {/* פרטי המשתמש */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-horizon-dark rounded-lg">
                <span className="text-horizon-accent text-xs block mb-1">אימייל</span>
                <p className="text-horizon-text font-medium text-sm">{selected.email}</p>
              </div>
              <div className="p-4 bg-horizon-dark rounded-lg">
                <span className="text-horizon-accent text-xs block mb-1">שם מלא</span>
                <p className="text-horizon-text font-medium text-sm">{selected.full_name || 'לא צוין'}</p>
              </div>
              <div className="p-4 bg-horizon-dark rounded-lg">
                <span className="text-horizon-accent text-xs block mb-1">תאריך הרשמה</span>
                <p className="text-horizon-text font-medium text-sm">
                  {new Date(selected.created_at).toLocaleDateString('he-IL', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="p-4 bg-horizon-dark rounded-lg">
                <span className="text-horizon-accent text-xs block mb-1">סטטוס נוכחי</span>
                <div className="mt-1">{getStatusBadge(selected.status)}</div>
              </div>
            </div>

            {/* הערות קיימות */}
            {selected.notes && (
              <div className="p-4 bg-horizon-dark rounded-lg">
                <span className="text-horizon-accent text-xs block mb-1">הערות קודמות</span>
                <p className="text-horizon-text text-sm">{selected.notes}</p>
              </div>
            )}

            {/* פעולות למשתמשים מאושרים — שינוי תפקיד + ביטול */}
            {selected.status === 'approved' && (
              <div className="space-y-4 pt-4 border-t border-horizon">
                <h4 className="font-bold text-horizon-text">שינוי תפקיד</h4>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Select value={chosenRole} onValueChange={setChosenRole}>
                      <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                        <SelectValue placeholder="בחר תפקיד..." />
                      </SelectTrigger>
                      <SelectContent className="bg-horizon-card border-horizon">
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleChangeRole}
                    disabled={isProcessing || !chosenRole || chosenRole === selected.role}
                    className="bg-gradient-to-r from-[#32acc1] to-[#83ddec] hover:from-[#2a95a8] hover:to-[#6dd0e0] text-white font-bold"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                    שמור שינוי
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleRevoke}
                    disabled={isProcessing}
                    className="border-yellow-500 text-yellow-400 hover:bg-yellow-900/20"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <AlertCircle className="w-4 h-4 ml-2" />}
                    החזר להמתנה
                  </Button>
                </div>
              </div>
            )}

            {/* כפתור החזרה להמתנה — למשתמשים שנדחו */}
            {selected.status === 'rejected' && (
              <div className="flex justify-end pt-4 border-t border-horizon">
                <Button
                  variant="outline"
                  onClick={handleRevoke}
                  disabled={isProcessing}
                  className="border-yellow-500 text-yellow-400 hover:bg-yellow-900/20"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <AlertCircle className="w-4 h-4 ml-2" />}
                  החזר להמתנה
                </Button>
              </div>
            )}

            {/* בחירת role + הערות — רק אם pending */}
            {selected.status === 'pending' && (
              <div className="space-y-4 pt-4 border-t border-horizon">
                <h4 className="font-bold text-horizon-text">פעולות</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-horizon-text mb-2">
                      בחר תפקיד למשתמש *
                    </label>
                    <Select value={chosenRole} onValueChange={setChosenRole}>
                      <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                        <SelectValue placeholder="בחר תפקיד..." />
                      </SelectTrigger>
                      <SelectContent className="bg-horizon-card border-horizon">
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-horizon-text mb-2">
                      הערות (אופציונלי)
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="הערות פנימיות..."
                      className="bg-horizon-dark border-horizon text-horizon-text h-[40px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="border-red-500 text-red-400 hover:bg-red-900/20"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
                    דחה בקשה
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessing || !chosenRole}
                    className="bg-gradient-to-r from-[#32acc1] to-[#83ddec] hover:from-[#2a95a8] hover:to-[#6dd0e0] text-white font-bold"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                    אשר משתמש
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* --- רשימת בקשות --- */
        <Card className="bg-horizon-card border-horizon">
          <CardContent className="p-6">
            {/* פילטר + כותרת */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-horizon-accent" />
                <span className="text-sm text-horizon-accent">
                  מציג {filteredApprovals.length} מתוך {approvals.length} בקשות
                </span>
              </div>
              <div className="flex gap-2">
                {['pending', 'approved', 'rejected', 'all'].map(s => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                    className={statusFilter === s
                      ? 'bg-horizon-primary text-white'
                      : 'border-horizon text-horizon-accent hover:text-horizon-text'
                    }
                  >
                    {s === 'pending' ? 'ממתינים' : s === 'approved' ? 'אושרו' : s === 'rejected' ? 'נדחו' : 'הכל'}
                  </Button>
                ))}
              </div>
            </div>

            {filteredApprovals.length === 0 ? (
              <div className="text-center py-12 text-horizon-accent">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">אין בקשות {statusFilter === 'pending' ? 'ממתינות' : ''}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-4 bg-horizon-dark rounded-lg border border-horizon/50 hover:border-horizon-primary/50 transition-all cursor-pointer group"
                    onClick={() => handleSelect(approval)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-horizon-primary/20 rounded-full flex items-center justify-center group-hover:bg-horizon-primary/30 transition-colors">
                        <User className="w-5 h-5 text-horizon-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-horizon-text">
                          {approval.full_name || 'ללא שם'}
                        </h4>
                        <p className="text-sm text-horizon-accent">{approval.email}</p>
                        <p className="text-xs text-horizon-accent flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(approval.created_at).toLocaleDateString('he-IL', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {approval.status === 'approved' && roleLabels[approval.role] && (
                        <Badge variant="outline" className="border-horizon text-horizon-accent text-xs">
                          {roleLabels[approval.role]}
                        </Badge>
                      )}
                      {getStatusBadge(approval.status)}
                      <ArrowRight className="w-4 h-4 text-horizon-accent opacity-0 group-hover:opacity-100 transition-opacity rotate-180" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
