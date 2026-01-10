import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Edit3, Trash2, Phone, Mail, Building2, Loader2, MessageSquare, Eye, EyeOff } from 'lucide-react';

export default function ServiceContactsTab({ customer }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    contact_name: '',
    contact_type: 'אחר',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    login_credentials: []
  });
  const [showPasswords, setShowPasswords] = useState({});

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['serviceContacts', customer?.email],
    queryFn: () => base44.entities.ServiceContact.filter({ 
      customer_email: customer.email,
      is_active: true 
    }),
    enabled: !!customer?.email
  });

  const contactTypeLabels = {
    'ספק': 'ספק',
    'רואה_חשבון': 'רואה חשבון',
    'עורך_דין': 'עורך דין',
    'יועץ_עסקי': 'יועץ עסקי',
    'בנק': 'בנק',
    'ביטוח': 'ביטוח',
    'לקוח_עיסקי': 'לקוח עיסקי',
    'אחר': 'אחר'
  };

  const contactTypeColors = {
    'ספק': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'רואה_חשבון': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'עורך_דין': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'יועץ_עסקי': 'bg-green-500/20 text-green-400 border-green-500/30',
    'בנק': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'ביטוח': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'לקוח_עיסקי': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'אחר': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  const handleNew = () => {
    setEditingContact(null);
    setFormData({
      contact_name: '',
      contact_type: 'אחר',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      contact_name: contact.contact_name,
      contact_type: contact.contact_type,
      company_name: contact.company_name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      notes: contact.notes || '',
      login_credentials: contact.login_credentials || []
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.contact_name) {
      alert('נא למלא שם איש קשר');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        customer_email: customer.email,
        ...formData
      };

      if (editingContact) {
        await base44.entities.ServiceContact.update(editingContact.id, formData);
      } else {
        await base44.entities.ServiceContact.create(data);
      }

      queryClient.invalidateQueries(['serviceContacts', customer.email]);
      setShowModal(false);
    } catch (error) {
      alert('שגיאה בשמירה: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contactId) => {
    if (!confirm('האם למחוק את איש הקשר?')) return;

    try {
      await base44.entities.ServiceContact.update(contactId, { is_active: false });
      queryClient.invalidateQueries(['serviceContacts', customer.email]);
    } catch (error) {
      alert('שגיאה במחיקה: ' + error.message);
    }
  };

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  if (!customer) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
          <p className="text-horizon-accent">בחר לקוח לצפייה באנשי קשר</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-horizon-text flex items-center gap-2">
                <Users className="w-5 h-5 text-horizon-primary" />
                אנשי קשר ושירות
              </CardTitle>
              <p className="text-sm text-horizon-accent mt-1">
                ספקים, יועצים ואנשי מקצוע הקשורים ללקוח
              </p>
            </div>
            <Button onClick={handleNew} className="btn-horizon-primary">
              <Plus className="w-4 h-4 ml-2" />
              הוסף איש קשר
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent">אין אנשי קשר</p>
              <p className="text-sm text-horizon-accent/70 mb-4">הוסף איש קשר ראשון</p>
              <Button onClick={handleNew} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                הוסף
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map(contact => (
                <Card key={contact.id} className="bg-horizon-card border-horizon hover:border-horizon-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-horizon-text">{contact.contact_name}</h3>
                        {contact.company_name && (
                          <p className="text-xs text-horizon-accent flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            {contact.company_name}
                          </p>
                        )}
                      </div>
                      <Badge className={`text-xs ${contactTypeColors[contact.contact_type]}`}>
                        {contactTypeLabels[contact.contact_type]}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-3">
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-sm text-horizon-text">
                          <Phone className="w-4 h-4 text-horizon-primary" />
                          <a href={`tel:${contact.phone}`} className="hover:underline flex-1">
                            {contact.phone}
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleWhatsApp(contact.phone)}
                            className="h-7 w-7 text-green-500 hover:text-green-400"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2 text-sm text-horizon-text">
                          <Mail className="w-4 h-4 text-horizon-primary" />
                          <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                            {contact.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {contact.notes && (
                      <p className="text-xs text-horizon-accent/70 mb-3 line-clamp-2">
                        {contact.notes}
                      </p>
                    )}

                    {contact.login_credentials && contact.login_credentials.length > 0 && (
                      <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                        <p className="text-xs text-blue-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {contact.login_credentials.length} מערכות מחוברות
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(contact)}
                        className="flex-1 text-horizon-primary hover:bg-horizon-primary/10"
                      >
                        <Edit3 className="w-3 h-3 ml-1" />
                        ערוך
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-horizon-dark border-horizon max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text">
              {editingContact ? 'עריכת איש קשר' : 'איש קשר חדש'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-horizon-accent">שם איש הקשר *</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="שם מלא"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">סוג</Label>
              <Select value={formData.contact_type} onValueChange={(v) => setFormData({ ...formData, contact_type: v })}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(contactTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-horizon-accent">שם חברה</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="שם החברה או הארגון"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-horizon-accent">טלפון</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="050-1234567"
                />
              </div>
              <div>
                <Label className="text-horizon-accent">אימייל</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <Label className="text-horizon-accent">כתובת</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="רחוב, עיר"
              />
            </div>

            <div>
              <Label className="text-horizon-accent">הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                rows={3}
                placeholder="הערות נוספות על איש הקשר"
              />
            </div>

            <div className="border-t border-horizon pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-horizon-accent">פרטי התחברות (קופות, מערכות)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData({
                    ...formData,
                    login_credentials: [...(formData.login_credentials || []), { system_name: '', username: '', password: '', url: '' }]
                  })}
                  className="border-horizon text-horizon-primary"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  הוסף מערכת
                </Button>
              </div>
              
              {(formData.login_credentials || []).map((cred, idx) => (
                <div key={idx} className="bg-horizon-card/50 p-3 rounded-lg mb-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <Input
                      value={cred.system_name}
                      onChange={(e) => {
                        const newCreds = [...(formData.login_credentials || [])];
                        newCreds[idx].system_name = e.target.value;
                        setFormData({ ...formData, login_credentials: newCreds });
                      }}
                      placeholder="שם המערכת (למשל: קופה, BiziBox)"
                      className="bg-horizon-card border-horizon text-horizon-text flex-1 ml-2"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormData({
                        ...formData,
                        login_credentials: (formData.login_credentials || []).filter((_, i) => i !== idx)
                      })}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    value={cred.username}
                    onChange={(e) => {
                      const newCreds = [...(formData.login_credentials || [])];
                      newCreds[idx].username = e.target.value;
                      setFormData({ ...formData, login_credentials: newCreds });
                    }}
                    placeholder="שם משתמש"
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                  <div className="flex gap-2">
                    <Input
                      type={showPasswords[idx] ? 'text' : 'password'}
                      value={cred.password}
                      onChange={(e) => {
                        const newCreds = [...(formData.login_credentials || [])];
                        newCreds[idx].password = e.target.value;
                        setFormData({ ...formData, login_credentials: newCreds });
                      }}
                      placeholder="סיסמה"
                      className="bg-horizon-card border-horizon text-horizon-text flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPasswords({ ...showPasswords, [idx]: !showPasswords[idx] })}
                      className="text-horizon-accent"
                    >
                      {showPasswords[idx] ? '🙈' : '👁️'}
                    </Button>
                  </div>
                  <Input
                    value={cred.url}
                    onChange={(e) => {
                      const newCreds = [...(formData.login_credentials || [])];
                      newCreds[idx].url = e.target.value;
                      setFormData({ ...formData, login_credentials: newCreds });
                    }}
                    placeholder="כתובת URL (אופציונלי)"
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-horizon text-horizon-text">
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                'שמור'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}