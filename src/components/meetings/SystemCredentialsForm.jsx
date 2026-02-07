import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Plus, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function SystemCredentialsForm({ customer, onClose }) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    system_name: '',
    username: '',
    password: '',
    website_url: '',
    notes: ''
  });

  // Fetch credentials
  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['systemCredentials', customer?.email],
    queryFn: async () => {
      if (!customer?.email) return [];
      const creds = await base44.entities.SystemCredential.filter({
        customer_email: customer.email
      }, '-created_date');
      return creds;
    },
    enabled: !!customer?.email
  });

  // Add credential mutation
  const addMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.SystemCredential.create({
        customer_email: customer.email,
        ...data,
        last_updated_by: customer.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['systemCredentials', customer?.email]);
      setFormData({
        system_name: '',
        username: '',
        password: '',
        website_url: '',
        notes: ''
      });
      setShowAddForm(false);
    }
  });

  // Delete credential mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.SystemCredential.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['systemCredentials', customer?.email]);
    }
  });

  const handleAddCredential = async () => {
    if (!formData.system_name.trim()) {
      alert('נא להזין שם מערכת');
      return;
    }
    addMutation.mutate(formData);
  };

  const handleDeleteCredential = (id) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את פרטי החיבור?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card className="card-horizon">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
            🔐 פרטי חיבור למערכות
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-horizon-accent" />
          ) : (
            <ChevronDown className="w-5 h-5 text-horizon-accent" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-4">
          {/* Security Notice */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
            ⚠️ אחסן מידע רגיש בזהירות. הנתונים שמורים בקובץ הלקוח בלבד.
          </div>

          {/* Credentials List */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-horizon-primary" />
            </div>
          ) : credentials.length > 0 ? (
            <div className="space-y-2">
              {credentials.map((cred) => (
                <div key={cred.id} className="p-3 bg-horizon-card rounded-lg border border-horizon/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-horizon-text">{cred.system_name}</h4>
                      {cred.website_url && (
                        <a
                          href={cred.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-horizon-primary hover:underline mt-1"
                        >
                          {cred.website_url}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCredential(cred.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-horizon-accent space-y-1">
                    {cred.username && <div>📧 שם משתמש: {cred.username}</div>}
                    {cred.password && <div>🔑 סיסמה: {'•'.repeat(cred.password.length)}</div>}
                    {cred.notes && <div>📝 הערות: {cred.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-horizon-accent text-sm py-4">אין פרטי חיבור שמורים</p>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="space-y-3 p-3 bg-horizon-card/30 rounded-lg border border-horizon">
              <Label className="text-horizon-text text-sm">שם המערכת</Label>
              <Input
                value={formData.system_name}
                onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
                placeholder="לדוגמה: Shopify, Hotbit, ..."
                className="bg-horizon-card border-horizon text-horizon-text"
              />

              <Label className="text-horizon-text text-sm">שם משתמש</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
              />

              <Label className="text-horizon-text text-sm">סיסמה</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
              />

              <Label className="text-horizon-text text-sm">כתובת אתר (אופציונלי)</Label>
              <Input
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://..."
                className="bg-horizon-card border-horizon text-horizon-text"
              />

              <Label className="text-horizon-text text-sm">הערות (אופציונלי)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="הערות נוספות..."
                className="bg-horizon-card border-horizon text-horizon-text h-20"
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleAddCredential}
                  disabled={addMutation.isPending}
                  className="btn-horizon-primary flex-1"
                >
                  {addMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'שמור'
                  )}
                </Button>
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="border-horizon text-horizon-text"
                >
                  ביטול
                </Button>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full btn-horizon-secondary"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף פרטי חיבור
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}