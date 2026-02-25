import React, { useState, useEffect } from "react";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Send, CheckCircle, Clock, AlertTriangle, Eye } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { SupportTicket, User } from '@/api/entities';

export default function SupportTicketPage() {
  const [tickets, setTickets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    ticket_type: 'problem',
    priority: 'medium'
  });

  useEffect(() => {
    loadUserAndTickets();
  }, []);

  const loadUserAndTickets = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const userTickets = await SupportTicket.filter({ customer_email: user.email }, '-created_date');
      setTickets(userTickets);
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      await SupportTicket.create({
        ...formData,
        customer_email: currentUser.email,
        customer_name: currentUser.business_name || currentUser.full_name
      });

      setFormData({
        subject: '',
        description: '',
        ticket_type: 'problem',
        priority: 'medium'
      });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      
      await loadUserAndTickets();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("שגיאה ביצירת הפנייה");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { color: 'bg-red-500', text: 'פתוח' },
      in_progress: { color: 'bg-yellow-500', text: 'בטיפול' },
      resolved: { color: 'bg-green-500', text: 'נפתר' },
      closed: { color: 'bg-gray-500', text: 'סגור' }
    };
    
    const config = statusConfig[status] || statusConfig.open;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      urgent: { color: 'bg-red-600', text: 'דחוף' },
      high: { color: 'bg-orange-500', text: 'גבוה' },
      medium: { color: 'bg-yellow-500', text: 'בינוני' },
      low: { color: 'bg-green-500', text: 'נמוך' }
    };
    
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 text-right">
          <h1 className="text-3xl font-bold text-horizon-text mb-2 flex items-center justify-end gap-3">
            <MessageSquare className="w-8 h-8 text-horizon-primary" />
            פניות לקוחות ותקלות
          </h1>
          <p className="text-horizon-accent">שלח פנייה חדשה או עקב אחר הפניות הקיימות שלך</p>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <Alert className="mb-6 bg-green-900/20 border-green-500/50 text-right">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              הפנייה נשלחה בהצלחה! נחזור אליך בהקדם האפשרי.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* New Ticket Form */}
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-primary text-right">פנייה חדשה</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
                <div className="text-right">
                  <Label htmlFor="subject" className="text-horizon-text">נושא הפנייה *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="תאר בקצרה את הנושא"
                    required
                    className="bg-horizon-card border-horizon text-horizon-text text-right"
                    dir="rtl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-right">
                    <Label htmlFor="ticket_type" className="text-horizon-text">סוג הפנייה</Label>
                    <Select value={formData.ticket_type} onValueChange={(value) => setFormData({...formData, ticket_type: value})}>
                      <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text" dir="rtl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="problem">בעיה/תקלה</SelectItem>
                        <SelectItem value="improvement">בקשת שיפור</SelectItem>
                        <SelectItem value="question">שאלה כללית</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-right">
                    <Label htmlFor="priority" className="text-horizon-text">רמת דחיפות</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                      <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text" dir="rtl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">נמוכה</SelectItem>
                        <SelectItem value="medium">בינונית</SelectItem>
                        <SelectItem value="high">גבוהה</SelectItem>
                        <SelectItem value="urgent">דחופה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-right">
                  <Label htmlFor="description" className="text-horizon-text">תיאור מפורט *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="אנা תאר את הבעיה או השאלה בפירוט"
                    required
                    className="bg-horizon-card border-horizon text-horizon-text h-32 text-right"
                    dir="rtl"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full btn-horizon-primary flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      שלח פנייה
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Previous Tickets */}
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-primary text-right flex items-center justify-between">
                <span>הפניות שלי ({tickets.length})</span>
                <Eye className="w-5 h-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
                  <p className="text-horizon-accent">עדיין לא שלחת פניות</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="border border-horizon rounded-lg p-4 bg-horizon-card/30" dir="rtl">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-right flex-1">
                          <h4 className="font-semibold text-horizon-text text-right">{ticket.subject}</h4>
                          <p className="text-sm text-horizon-accent text-right">
                            {ticket.created_date ? format(new Date(ticket.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 mr-4">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </div>
                      
                      <p className="text-horizon-text text-sm mb-3 text-right line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-horizon-accent justify-end">
                        {ticket.status === 'open' && (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>ממתין לטיפול</span>
                          </>
                        )}
                        {ticket.status === 'in_progress' && (
                          <>
                            <AlertTriangle className="w-3 h-3 text-yellow-400" />
                            <span>בטיפול</span>
                          </>
                        )}
                        {ticket.status === 'resolved' && (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span>נפתר</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}