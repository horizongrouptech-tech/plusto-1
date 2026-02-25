import React, { useState } from 'react';

import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  FileQuestion, AlertTriangle, CheckCircle, XCircle, 
  ExternalLink, Eye, Loader2, RefreshCw, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

import { toast } from "sonner";
import { UnknownFileQueue } from '@/api/entities';
const STATUS_CONFIG = {
  pending: { label: 'ממתין', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle },
  reviewed: { label: 'נבדק', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Eye },
  resolved: { label: 'נפתר', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  rejected: { label: 'נדחה', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  learned: { label: 'נלמד', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: CheckCircle }
};

const CATEGORY_LABELS = {
  bizibox: 'BiziBox',
  z_report: 'דוח Z',
  catalog: 'קטלוג',
  profit_loss: 'רווח והפסד',
  balance_sheet: 'מאזן',
  bank_statement: 'תדפיס בנק',
  credit_card: 'כרטיס אשראי',
  other: 'אחר'
};

const RESOLUTION_ACTIONS = [
  { value: 'manual_import', label: 'ייבוא ידני' },
  { value: 'new_parser_created', label: 'נוצר פרסר חדש' },
  { value: 'user_error', label: 'שגיאת משתמש' },
  { value: 'unsupported_format', label: 'פורמט לא נתמך' }
];

export default function UnknownFileQueueManager() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionAction, setResolutionAction] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['unknownFileQueue', statusFilter],
    queryFn: async () => {
      const filter = statusFilter === 'all' ? {} : { status: statusFilter };
      return UnknownFileQueue.filter(filter, '-created_date');
    }
  });

  const handleOpenDetail = (file) => {
    setSelectedFile(file);
    setAdminNotes(file.admin_notes || '');
    setResolutionAction(file.resolution_action || '');
    setNewStatus(file.status || 'pending');
    setIsDetailOpen(true);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      const updateData = {
        admin_notes: adminNotes,
        status: newStatus
      };
      
      if (newStatus === 'resolved' || newStatus === 'rejected' || newStatus === 'learned') {
        updateData.resolution_action = resolutionAction;
        updateData.resolved_by = currentUser.email;
        updateData.resolved_date = new Date().toISOString();
      }
      
      await UnknownFileQueue.update(selectedFile.id, updateData);
      queryClient.invalidateQueries(['unknownFileQueue']);
      setIsDetailOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error updating file:', error);
      toast.error('שגיאה בעדכון');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('האם למחוק את הרשומה?')) return;
    try {
      await UnknownFileQueue.delete(fileId);
      queryClient.invalidateQueries(['unknownFileQueue']);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('שגיאה במחיקה');
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-horizon-primary" />
              תור קבצים לא מזוהים
              {pendingCount > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 mr-2">{pendingCount} ממתינים</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-horizon-dark border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  <SelectItem value="all" className="text-horizon-text">הכל</SelectItem>
                  <SelectItem value="pending" className="text-horizon-text">ממתינים</SelectItem>
                  <SelectItem value="reviewed" className="text-horizon-text">נבדקו</SelectItem>
                  <SelectItem value="resolved" className="text-horizon-text">נפתרו</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()} className="border-horizon text-horizon-text">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-50" />
              <p className="text-horizon-accent">אין קבצים בתור</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map(file => {
                const statusConfig = STATUS_CONFIG[file.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card key={file.id} className="bg-horizon-dark border-horizon">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="w-3 h-3 ml-1" />
                              {statusConfig.label}
                            </Badge>
                            <Badge className="bg-horizon-card text-horizon-accent">
                              {CATEGORY_LABELS[file.attempted_category] || file.attempted_category}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-horizon-text mb-1">
                            {file.file_name || 'קובץ ללא שם'}
                          </p>
                          
                          <p className="text-xs text-horizon-accent mb-2">
                            לקוח: {file.customer_email}
                          </p>
                          
                          <p className="text-sm text-red-400">
                            סיבה: {file.failure_reason}
                          </p>
                          
                          {file.created_date && (
                            <p className="text-xs text-horizon-accent mt-2">
                              {format(new Date(file.created_date), 'dd/MM/yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {file.file_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(file.file_url, '_blank')}
                              className="border-horizon text-horizon-text"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(file)}
                            className="border-horizon text-horizon-text"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(file.id)}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-horizon-card border-horizon text-horizon-text max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי קובץ לא מזוהה</DialogTitle>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              <div className="bg-horizon-dark rounded-lg p-4 space-y-2">
                <p><strong>שם קובץ:</strong> {selectedFile.file_name || 'לא ידוע'}</p>
                <p><strong>לקוח:</strong> {selectedFile.customer_email}</p>
                <p><strong>קטגוריה שניסו:</strong> {CATEGORY_LABELS[selectedFile.attempted_category]}</p>
                <p><strong>סיבת כשלון:</strong> {selectedFile.failure_reason}</p>
                {selectedFile.detected_format && (
                  <p><strong>פורמט שזוהה:</strong> {selectedFile.detected_format}</p>
                )}
                {selectedFile.detected_columns?.length > 0 && (
                  <div>
                    <strong>עמודות שזוהו:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedFile.detected_columns.map((col, i) => (
                        <Badge key={i} className="bg-horizon-card text-horizon-accent text-xs">
                          {col}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-horizon-accent mb-1 block">סטטוס</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    <SelectItem value="pending" className="text-horizon-text">ממתין</SelectItem>
                    <SelectItem value="reviewed" className="text-horizon-text">נבדק</SelectItem>
                    <SelectItem value="resolved" className="text-horizon-text">נפתר</SelectItem>
                    <SelectItem value="rejected" className="text-horizon-text">נדחה</SelectItem>
                    <SelectItem value="learned" className="text-horizon-text">נלמד (פרסר חדש)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(newStatus === 'resolved' || newStatus === 'rejected' || newStatus === 'learned') && (
                <div>
                  <label className="text-sm text-horizon-accent mb-1 block">פעולה שננקטה</label>
                  <Select value={resolutionAction} onValueChange={setResolutionAction}>
                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר פעולה" />
                    </SelectTrigger>
                    <SelectContent className="bg-horizon-card border-horizon">
                      {RESOLUTION_ACTIONS.map(action => (
                        <SelectItem key={action.value} value={action.value} className="text-horizon-text">
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="text-sm text-horizon-accent mb-1 block">הערות אדמין</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="bg-horizon-dark border-horizon text-horizon-text min-h-[100px]"
                  placeholder="הערות לגבי הטיפול בקובץ..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}