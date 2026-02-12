import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bug, Lightbulb, MoreVertical, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

import { toast } from "sonner";
export default function AgentSupportTicketsManager() {
  const queryClient = useQueryClient();
  const [editingTicket, setEditingTicket] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ['agentSupportTickets'],
    queryFn: () => base44.entities.AgentSupportTicket.list('-created_date'),
  });

  const updateTicketMutation = useMutation({
    mutationFn: (updatedTicketData) => base44.entities.AgentSupportTicket.update(editingTicket.id, updatedTicketData),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentSupportTickets']);
      setIsEditModalOpen(false);
      setEditingTicket(null);
      toast.success('הפנייה עודכנה בהצלחה!');
    },
  });

  const handleEditClick = (ticket) => {
    setEditingTicket(ticket);
    setResolutionNotes(ticket.resolution_notes || '');
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    const updateData = { 
      resolution_notes: resolutionNotes, 
      status, 
      priority 
    };
    
    if (status === 'resolved' && !editingTicket.resolved_date) {
      updateData.resolved_date = new Date().toISOString();
    }
    
    updateTicketMutation.mutate(updateData);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-500 text-white">חדש</Badge>;
      case 'in_review': return <Badge className="bg-yellow-500 text-white">בבדיקה</Badge>;
      case 'prioritized': return <Badge className="bg-purple-500 text-white">תועדף</Badge>;
      case 'resolved': return <Badge className="bg-green-500 text-white">נפתר</Badge>;
      case 'rejected': return <Badge className="bg-red-500 text-white">נדחה</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent': return <Badge className="bg-red-700 text-white">דחוף</Badge>;
      case 'high': return <Badge className="bg-red-500 text-white">גבוהה</Badge>;
      case 'medium': return <Badge className="bg-yellow-500 text-white">בינונית</Badge>;
      case 'low': return <Badge className="bg-green-500 text-white">נמוכה</Badge>;
      default: return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-horizon-primary" />
          <p className="text-horizon-accent">טוען פניות...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <p className="text-red-500">שגיאה בטעינת פניות: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-horizon" dir="rtl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-horizon-text text-right">
            <Bug className="w-5 h-5 text-horizon-primary" />
            פניות מנהלי כספים ({tickets?.length || 0})
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries(['agentSupportTickets'])}
            className="border-horizon text-horizon-accent hover:bg-horizon-card"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            רענן
          </Button>
        </div>
        <p className="text-sm text-horizon-accent mt-2 text-right">
          פניות שנוצרו על ידי סוכן ה-AI עבור דיווחי באגים ובקשות פיצ'רים
        </p>
      </CardHeader>
      <CardContent>
        {tickets && tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-horizon">
                  <TableHead className="text-right text-horizon-text">נושא</TableHead>
                  <TableHead className="text-right text-horizon-text">סוג</TableHead>
                  <TableHead className="text-right text-horizon-text hidden md:table-cell">מנהל כספים</TableHead>
                  <TableHead className="text-right text-horizon-text">סטטוס</TableHead>
                  <TableHead className="text-right text-horizon-text">עדיפות</TableHead>
                  <TableHead className="text-right text-horizon-text hidden lg:table-cell">תאריך יצירה</TableHead>
                  <TableHead className="text-center text-horizon-text">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-b-horizon hover:bg-horizon-card/30">
                    <TableCell className="font-medium text-horizon-text">{ticket.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ticket.type === 'bug_report' ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400'}>
                        {ticket.type === 'bug_report' ? <Bug className="w-3 h-3 ml-1" /> : <Lightbulb className="w-3 h-3 ml-1" />}
                        {ticket.type === 'bug_report' ? 'באג' : 'פיצ׳ר'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-horizon-accent hidden md:table-cell">{ticket.manager_email}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="text-horizon-accent hidden lg:table-cell">
                      {format(new Date(ticket.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(ticket)} className="text-horizon-accent hover:text-horizon-primary">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-horizon-accent">
            <Bug className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">אין פניות באגים או בקשות פיצ'רים כרגע</p>
            <p className="text-sm mt-2">השתמש בסוכן ה-AI כדי לדווח על באגים או לבקש פיצ'רים חדשים</p>
          </div>
        )}
      </CardContent>

      {editingTicket && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right text-xl">ערוך פנייה: {editingTicket.subject}</DialogTitle>
              <DialogDescription className="text-right text-horizon-accent space-y-2 mt-4">
                <div className="p-3 bg-horizon-card/50 rounded-lg">
                  <p className="font-semibold text-horizon-text mb-2">תיאור הפנייה:</p>
                  <p className="text-sm">{editingTicket.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div>
                    <span className="font-medium">מנהל כספים:</span> {editingTicket.manager_email}
                  </div>
                  {editingTicket.customer_email && editingTicket.customer_email !== editingTicket.manager_email && (
                    <div>
                      <span className="font-medium">לקוח:</span> {editingTicket.customer_email}
                    </div>
                  )}
                  {editingTicket.related_context && (
                    <div className="col-span-2">
                      <span className="font-medium">הקשר:</span> {editingTicket.related_context}
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="status" className="text-right block mb-2 text-horizon-text">סטטוס</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text text-right">
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    <SelectItem value="new">חדש</SelectItem>
                    <SelectItem value="in_review">בבדיקה</SelectItem>
                    <SelectItem value="prioritized">תועדף</SelectItem>
                    <SelectItem value="resolved">נפתר</SelectItem>
                    <SelectItem value="rejected">נדחה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority" className="text-right block mb-2 text-horizon-text">עדיפות</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-full bg-horizon-card border-horizon text-horizon-text text-right">
                    <SelectValue placeholder="בחר עדיפות" />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="urgent">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resolutionNotes" className="text-right block mb-2 text-horizon-text">הערות פתרון</Label>
                <Textarea
                  id="resolutionNotes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-horizon-card border-horizon text-horizon-text text-right min-h-[100px]"
                  placeholder="הוסף הערות על הפתרון או הטיפול בפנייה..."
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="border-horizon text-horizon-text">
                ביטול
              </Button>
              <Button type="button" onClick={handleSaveEdit} disabled={updateTicketMutation.isLoading} className="btn-horizon-primary">
                {updateTicketMutation.isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                שמור שינויים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}