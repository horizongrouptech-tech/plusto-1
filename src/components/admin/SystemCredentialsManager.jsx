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
import { Plus, Edit3, Trash2, Loader2, Lock, Eye, EyeOff, Monitor, User, Globe, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemCredentialsManager({ customer }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});

  const [formData, setFormData] = useState({
    system_name: '',
    system_url: '',
    username: '',
    password: '',
    system_notes: '',
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['serviceContacts', customer?.email],
    queryFn: () => base44.entities.ServiceContact.filter({ 
      customer_email: customer.email,
      is_active: true 
    }),
    enabled: !!customer?.email
  });

  // סינון רק מערכות
  const systemContacts = contacts.filter(c => c.record_type === 'system');

  const handleNew = () => {
    setEditingSystem(null);
    setFormData({
      system_name: '',
      system_url: '',
      username: '',
      password: '',
      system_notes: '',
    });
    setShowModal(true);
  };

  const handleEdit = (system) => {
    setEditingSystem(system);
    setFormData({
      system_name: system.system_name || '',
      system_url: system.system_url || '',
      username: system.username || '',
      password: system.password || '',
      system_notes: system.system_notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.system_name) {
      toast.error('נא למלא שם מערכת');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        customer_email: customer.email,
        record_type: 'system',
        system_name: formData.system_name,
        system_url: formData.system_url,
        username: formData.username,
        password: formData.password,
        system_notes: formData.system_notes,
        contact_type: 'אחר' // ערך ברירת מחדל למערכות
      };

      if (editingSystem) {
        await base44.entities.ServiceContact.update(editingSystem.id, data);
        toast.success('מערכת עודכנה בהצלחה!');
      } else {
        await base44.entities.ServiceContact.create(data);
        toast.success('מערכת נוספה בהצלחה!');
      }

      queryClient.invalidateQueries(['serviceContacts', customer.email]);
      setShowModal(false);
    } catch (error) {
      toast.error('שגיאה בשמירה: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (systemId) => {
    if (!confirm('האם למחוק?')) return;

    try {
      await base44.entities.ServiceContact.update(systemId, { is_active: false });
      queryClient.invalidateQueries(['serviceContacts', customer.email]);
      toast.success('נמחק בהצלחה');
    } catch (error) {
      toast.error('שגיאה במחיקה: ' + error.message);
    }
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

  if (!customer) return null;

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
    <>
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2 text-lg">
              <Monitor className="w-5 h-5 text-purple-400" />
              מערכות ופרטי התחברות ({systemContacts.length})
            </CardTitle>
            <Button onClick={handleNew} variant="outline" className="border-horizon text-horizon-text hover:bg-horizon-primary/10">
              <Monitor className="w-4 h-4 ml-2" />
              הוסף מערכת
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {systemContacts.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent">אין מערכות</p>
              <Button onClick={handleNew} className="mt-4" variant="outline">
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

      {/* Modal להוספה/עריכת מערכת */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-horizon-dark border-horizon max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              <Monitor className="w-5 h-5 text-purple-400" />
              {editingSystem ? 'עריכת מערכת' : 'מערכת חדשה'}
            </DialogTitle>
            <DialogDescription className="text-horizon-accent">
              הוסף פרטי מערכת ופרטי התחברות
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
                פרטי ההתחברות נשמרים בצורה מאובטחת ונגישים רק למורשים.
              </p>
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
    </>
  );
}
