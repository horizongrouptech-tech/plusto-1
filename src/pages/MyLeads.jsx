import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Mail, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Lead } from "@/entities/Lead";
import { User } from "@/entities/User";

export default function MyLeads() {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [contactingLeadId, setContactingLeadId] = useState(null);

  useEffect(() => {
    loadUserAndLeads();
  }, []);

  const loadUserAndLeads = async () => {
    try {
      setIsLoading(true);
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.user_type === 'supplier_user') {
        const userLeads = await Lead.filter({
          assigned_to_supplier_user_email: currentUser.email
        }, '-created_date');
        setLeads(userLeads);
      }
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactLead = async (leadId) => {
    try {
      setContactingLeadId(leadId);
      await Lead.update(leadId, {
        status: 'contacted',
        last_contact_date: new Date().toISOString(),
        contact_attempts: (leads.find(l => l.id === leadId)?.contact_attempts || 0) + 1
      });
      await loadUserAndLeads();
    } catch (error) {
      console.error("Error updating lead:", error);
      alert('אירעה שגיאה בעדכון הליד');
    } finally {
      setContactingLeadId(null);
    }
  };

  const handleIgnoreLead = async (leadId) => {
    if (!confirm('האם אתה בטוח שברצונך להתעלם מליד זה?')) return;
    
    try {
      await Lead.update(leadId, {
        status: 'ignored',
        last_contact_date: new Date().toISOString()
      });
      await loadUserAndLeads();
    } catch (error) {
      console.error("Error updating lead:", error);
      alert('אירעה שגיאה בעדכון הליד');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'new': { text: 'חדש', color: 'bg-blue-500', icon: AlertCircle },
      'contacted': { text: 'נוצר קשר', color: 'bg-green-500', icon: CheckCircle },
      'ignored': { text: 'התעלמו', color: 'bg-gray-500', icon: XCircle },
      'in_progress': { text: 'בתהליך', color: 'bg-yellow-500', icon: Clock },
      'closed': { text: 'סגור', color: 'bg-gray-700', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig['new'];
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען לידים...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.user_type !== 'supplier_user') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">אין הרשאה</h2>
              <p className="text-gray-600">דף זה מיועד למשתמשי ספק בלבד.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">הלידים שלי</h1>
          <p className="text-gray-600">
            ברוכים הבאים {user?.full_name || user?.email} - כאן תוכלו לראות ולנהל את כל הפניות שהגיעו אליכם
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{leads.length}</div>
              <div className="text-sm text-gray-600">סה"כ לידים</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {leads.filter(l => l.status === 'new').length}
              </div>
              <div className="text-sm text-gray-600">לידים חדשים</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {leads.filter(l => l.status === 'contacted').length}
              </div>
              <div className="text-sm text-gray-600">נוצר קשר</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {leads.filter(l => l.status === 'in_progress').length}
              </div>
              <div className="text-sm text-gray-600">בתהליך</div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>פניות לקוחות</CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">אין לידים</h3>
                <p className="text-gray-600">עדיין לא הגיעו אליכם פניות מלקוחות.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם לקוח</TableHead>
                    <TableHead className="text-right">טלפון</TableHead>
                    <TableHead className="text-right">פרטי בקשה</TableHead>
                    <TableHead className="text-right">סוג בקשה</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.customer_name}
                      </TableCell>
                      <TableCell>
                        <a 
                          href={`tel:${lead.customer_phone}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Phone className="w-4 h-4" />
                          {lead.customer_phone}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={lead.request_details}>
                          {lead.request_details}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {lead.request_type === 'quote_request' && 'הצעת מחיר'}
                          {lead.request_type === 'service_inquiry' && 'בירור שירות'}
                          {lead.request_type === 'product_inquiry' && 'בירור מוצר'}
                          {lead.request_type === 'partnership' && 'שותפות'}
                          {lead.request_type === 'other' && 'אחר'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(lead.created_date)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(lead.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {lead.status === 'new' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleContactLead(lead.id)}
                                disabled={contactingLeadId === lead.id}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {contactingLeadId === lead.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 ml-1" />
                                    צור קשר
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIgnoreLead(lead.id)}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4 ml-1" />
                                התעלם
                              </Button>
                            </>
                          )}
                          <a 
                            href={`mailto:${lead.customer_email}`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                          >
                            <Mail className="w-4 h-4" />
                            שלח מייל
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}