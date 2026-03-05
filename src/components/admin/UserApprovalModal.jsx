import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/api/supabaseClient';

// מיפוי roles לתצוגה בעברית
const roleLabels = {
  financial_manager: 'מנהל כספים',
  client: 'לקוח (בעל עסק)',
  department_manager: 'מנהל מחלקה',
  supplier_user: 'משתמש ספק',
};

export default function UserApprovalModal({ isOpen, onClose, onActionComplete }) {
  const [approvals, setApprovals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chosenRole, setChosenRole] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) loadApprovals();
  }, [isOpen]);

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_approved_by_admin, is_active, created_at')
        .not('role', 'in', '("admin","super_admin")')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(p => ({
        ...p,
        user_id: p.id,
        status: p.is_approved_by_admin ? 'approved' : (p.is_active === false ? 'rejected' : 'pending'),
      }));
      setApprovals(mapped);
    } catch (error) {
      console.error('[UserApprovalModal] Error loading users:', error);
      toast.error('שגיאה בטעינת רשימת המשתמשים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (approval) => {
    setSelected(approval);
    setChosenRole('');
    setNotes('');
  };

  const handleApprove = async () => {
    if (!selected || !chosenRole) {
      toast.error('יש לבחור role לפני אישור');
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
      onActionComplete?.();
    } catch (error) {
      console.error('[UserApprovalModal] Approve error:', error);
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
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', selected.id);
      if (error) throw error;
      toast.success('הבקשה נדחתה');
      setSelected(null);
      await loadApprovals();
      onActionComplete?.();
    } catch (error) {
      console.error('[UserApprovalModal] Reject error:', error);
      toast.error(`שגיאה בדחייה: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { text: 'ממתין', icon: AlertCircle, color: 'bg-yellow-500' },
      approved: { text: 'אושר', icon: CheckCircle, color: 'bg-green-500' },
      rejected: { text: 'נדחה', icon: XCircle, color: 'bg-red-500' },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge className={`${c.color} text-white flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {c.text}
      </Badge>
    );
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-text text-right flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-horizon-primary" />
            אישור משתמשים חדשים
            {pendingCount > 0 && (
              <Badge className="bg-yellow-500 text-white mr-2">{pendingCount} ממתינים</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-horizon-primary" />
            </div>
          ) : selected ? (
            /* --- תצוגת פרטי משתמש נבחר --- */
            <div className="space-y-6">
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
              <div className="grid grid-cols-2 gap-4 p-4 bg-horizon-card rounded-lg border border-horizon">
                <div>
                  <span className="text-horizon-accent text-sm">אימייל</span>
                  <p className="text-horizon-text font-medium">{selected.email}</p>
                </div>
                <div>
                  <span className="text-horizon-accent text-sm">שם מלא</span>
                  <p className="text-horizon-text font-medium">{selected.full_name || 'לא צוין'}</p>
                </div>
                <div>
                  <span className="text-horizon-accent text-sm">תאריך הרשמה</span>
                  <p className="text-horizon-text font-medium">
                    {new Date(selected.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div>
                  <span className="text-horizon-accent text-sm">סטטוס</span>
                  <p>{getStatusBadge(selected.status)}</p>
                </div>
              </div>

              {/* בחירת role + הערות — רק אם pending */}
              {selected.status === 'pending' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-horizon-text mb-2">
                      בחר תפקיד למשתמש *
                    </label>
                    <Select value={chosenRole} onValueChange={setChosenRole}>
                      <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
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
                      className="bg-horizon-card border-horizon text-horizon-text h-20 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-horizon">
                    <Button
                      variant="outline"
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="border-red-500 text-red-400 hover:bg-red-900/20"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
                      דחה
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={isProcessing || !chosenRole}
                      className="btn-horizon-primary"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                      אשר משתמש
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* --- רשימת כל הבקשות --- */
            <div className="space-y-4">
              <div className="text-sm text-horizon-accent mb-4">
                סה"כ {approvals.length} בקשות | {pendingCount} ממתינים
              </div>

              {approvals.length === 0 ? (
                <div className="text-center py-8 text-horizon-accent">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                  <p>אין בקשות אישור</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between p-4 bg-horizon-card rounded-lg border border-horizon hover:bg-horizon-card/80 transition-colors cursor-pointer"
                      onClick={() => handleSelect(approval)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-horizon-primary/20 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-horizon-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-horizon-text">
                            {approval.full_name || 'ללא שם'}
                          </h4>
                          <p className="text-sm text-horizon-accent">
                            {approval.email}
                          </p>
                          <p className="text-xs text-horizon-accent flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(approval.created_at).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(approval.status)}
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
