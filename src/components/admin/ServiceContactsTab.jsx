import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, Plus, Edit3, Trash2, Phone, Mail, Building2, Loader2, MessageSquare, Lock, Eye, EyeOff, Monitor, User, Globe, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ServiceContactsTab({ customer }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [contactMode, setContactMode] = useState('person'); // 'person' | 'system'
  const [copiedField, setCopiedField] = useState(null);

  const [formData, setFormData] = useState({
    // פרטי איש קשר
    contact_name: '',
    contact_type: 'אחר',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    // פרטי מערכת
    system_name: '',
    system_url: '',
    username: '',
    password: '',
    system_notes: '',
    // סוג הרשומה
    record_type: 'person' // 'person' | 'system'
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

  // הפרדה בין אנשי קשר למערכות
  const personContacts = contacts.filter(c => c.record_type !== 'system');
  const systemContacts = contacts.filter(c => c.record_type === 'system');

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

  const handleNew = (mode = 'person') => {
    setEditingContact(null);
    setContactMode(mode);
    setFormData({
      contact_name: '',
      contact_type: 'אחר',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      system_name: '',
      system_url: '',
      username: '',
      password: '',
      system_notes: '',
      record_type: mode
    });
    setShowModal(true);
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    const mode = contact.record_type === 'system' ? 'system' : 'person';
    setContactMode(mode);
    setFormData({
      contact_name: contact.contact_name || '',
      contact_type: contact.contact_type || 'אחר',
      company_name: contact.company_name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      notes: contact.notes || '',
      system_name: contact.system_name || '',
      system_url: contact.system_url || '',
      username: contact.username || '',
      password: contact.password || '',
      system_notes: contact.system_notes || '',
      record_type: contact.record_type || 'person'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    // ולידציה
    if (contactMode === 'person' && !formData.contact_name) {
      toast.error('נא למלא שם איש קשר');
      return;
    }
    if (contactMode === 'system' && !formData.system_name) {
      toast.error('נא למלא שם מערכת');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        customer_email: customer.email,
        record_type: contactMode,
        ...(contactMode === 'person' ? {
          contact_name: formData.contact_name,
          contact_type: formData.contact_type,
          company_name: formData.company_name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          notes: formData.notes
        } : {
          system_name: formData.system_name,
          system_url: formData.system_url,
          username: formData.username,
          password: formData.password,
          system_notes: formData.system_notes,
          contact_type: 'אחר' // ערך ברירת מחדל למערכות
        })
      };

      if (editingContact) {
        await base44.entities.ServiceContact.update(editingContact.id, data);
        toast.success('עודכן בהצלחה!');
      } else {
        await base44.entities.ServiceContact.create(data);
        toast.success(contactMode === 'person' ? 'איש קשר נוסף בהצלחה!' : 'מערכת נוספה בהצלחה!');
      }

      queryClient.invalidateQueries(['serviceContacts', customer.email]);
      setShowModal(false);
    } catch (error) {
      toast.error('שגיאה בשמירה: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contactId) => {
    if (!confirm('האם למחוק?')) return;

    try {
      await base44.entities.ServiceContact.update(contactId, { is_active: false });
      queryClient.invalidateQueries(['serviceContacts', customer.email]);
      toast.success('נמחק בהצלחה');
    } catch (error) {
      toast.error('שגיאה במחיקה: ' + error.message);
    }
  };

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleCopyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('הועתק!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('שגיאה בהעתקה');
    }
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
    <div className="space-y-6" dir="rtl">
      {/* כפתורי הוספה */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-horizon-text flex items-center gap-2">
                <Users className="w-5 h-5 text-horizon-primary" />
                אנשי קשר ומערכות
              </CardTitle>
              <p className="text-sm text-horizon-accent mt-1">
                ניהול אנשי קשר ופרטי התחברות למערכות
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleNew('person')} className="btn-horizon-primary">
                <User className="w-4 h-4 ml-2" />
                הוסף איש קשר
              </Button>
              <Button onClick={() => handleNew('system')} variant="outline" className="border-horizon text-horizon-text hover:bg-horizon-primary/10">
                <Monitor className="w-4 h-4 ml-2" />
                הוסף מערכת
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* אנשי קשר */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-blue-400" />
            אנשי קשר ({personContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personContacts.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent">אין אנשי קשר</p>
              <Button onClick={() => handleNew('person')} className="mt-4 btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                הוסף איש קשר
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personContacts.map(contact => (
                <Card key={contact.id} className="bg-horizon-card border-horizon hover:border-blue-500/50 transition-all">
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

      {/* מערכות */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2 text-lg">
            <Monitor className="w-5 h-5 text-purple-400" />
            מערכות ופרטי התחברות ({systemContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemContacts.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent">אין מערכות</p>
              <Button onClick={() => handleNew('system')} className="mt-4" variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                הוסף מערכת
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemContacts.map(system => (
                <Card key={system.id} className="bg-horizon-card border-horizon hover:border-purple-500/50 transition-all border-r-4 border-r-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-purple-400" />
                        <h3 className="font-bold text-horizon-text">{system.system_name}</h3>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                        מערכת
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-3">
                      {system.system_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="w-4 h-4 text-horizon-accent" />
                          <a 
                            href={system.system_url.startsWith('http') ? system.system_url : `https://${system.system_url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-horizon-primary hover:underline truncate flex-1"
                          >
                            {system.system_url}
                          </a>
                        </div>
                      )}
                      {system.username && (
                        <div className="flex items-center gap-2 text-sm text-horizon-text">
                          <User className="w-4 h-4 text-horizon-accent" />
                          <span className="flex-1 truncate">{system.username}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyToClipboard(system.username, `user-${system.id}`)}
                            className="h-6 w-6"
                          >
                            {copiedField === `user-${system.id}` ? (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-horizon-accent" />
                            )}
                          </Button>
                        </div>
                      )}
                      {system.password && (
                        <div className="flex items-center gap-2 text-sm text-horizon-text">
                          <Lock className="w-4 h-4 text-horizon-accent" />
                          <span className="flex-1 font-mono">
                            {showPasswords[system.id] ? system.password : '••••••••'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPasswords(prev => ({ ...prev, [system.id]: !prev[system.id] }))}
                            className="h-6 w-6"
                          >
                            {showPasswords[system.id] ? (
                              <EyeOff className="w-3 h-3 text-horizon-accent" />
                            ) : (
                              <Eye className="w-3 h-3 text-horizon-accent" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyToClipboard(system.password, `pass-${system.id}`)}
                            className="h-6 w-6"
                          >
                            {copiedField === `pass-${system.id}` ? (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-horizon-accent" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {system.system_notes && (
                      <p className="text-xs text-horizon-accent/70 mb-3 line-clamp-2">
                        {system.system_notes}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(system)}
                        className="flex-1 text-purple-400 hover:bg-purple-500/10"
                      >
                        <Edit3 className="w-3 h-3 ml-1" />
                        ערוך
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(system.id)}
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

      {/* Modal להוספה/עריכה */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-horizon-dark border-horizon max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              {contactMode === 'person' ? (
                <>
                  <User className="w-5 h-5 text-blue-400" />
                  {editingContact ? 'עריכת איש קשר' : 'איש קשר חדש'}
                </>
              ) : (
                <>
                  <Monitor className="w-5 h-5 text-purple-400" />
                  {editingContact ? 'עריכת מערכת' : 'מערכת חדשה'}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-horizon-accent">
              {contactMode === 'person' 
                ? 'הוסף פרטי איש קשר כגון ספק, יועץ או לקוח'
                : 'הוסף פרטי מערכת ופרטי התחברות'}
            </DialogDescription>
          </DialogHeader>

          {/* בחירת סוג */}
          {!editingContact && (
            <div className="mb-4">
              <RadioGroup 
                value={contactMode} 
                onValueChange={(v) => setContactMode(v)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="person" id="person" />
                  <Label htmlFor="person" className="text-horizon-text flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4 text-blue-400" />
                    איש קשר
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system" className="text-horizon-text flex items-center gap-2 cursor-pointer">
                    <Monitor className="w-4 h-4 text-purple-400" />
                    מערכת
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-4">
            {contactMode === 'person' ? (
              // טופס איש קשר
              <>
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
              </>
            ) : (
              // טופס מערכת
              <>
                <div>
                  <Label className="text-horizon-accent">שם המערכת *</Label>
                  <Input
                    value={formData.system_name}
                    onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    placeholder="לדוגמה: קופה רושמת, ביזיבוקס, חשבשבת..."
                  />
                </div>

                <div>
                  <Label className="text-horizon-accent">כתובת URL</Label>
                  <Input
                    value={formData.system_url}
                    onChange={(e) => setFormData({ ...formData, system_url: e.target.value })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label className="text-horizon-accent">שם משתמש</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    placeholder="שם משתמש למערכת"
                  />
                </div>

                <div>
                  <Label className="text-horizon-accent">סיסמה</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords['new'] ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-horizon-card border-horizon text-horizon-text pl-10"
                      placeholder="סיסמה"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    >
                      {showPasswords['new'] ? (
                        <EyeOff className="w-4 h-4 text-horizon-accent" />
                      ) : (
                        <Eye className="w-4 h-4 text-horizon-accent" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-horizon-accent">הערות</Label>
                  <Textarea
                    value={formData.system_notes}
                    onChange={(e) => setFormData({ ...formData, system_notes: e.target.value })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                    rows={3}
                    placeholder="הערות נוספות על המערכת..."
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-400">
                    🔒 פרטי ההתחברות נשמרים בצורה מאובטחת ונגישים רק למורשים.
                  </p>
                </div>
              </>
            )}
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