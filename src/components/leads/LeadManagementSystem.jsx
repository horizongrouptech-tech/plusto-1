import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Users, Plus, Search, Filter, Phone, Mail, Calendar, Building2,
  User, Clock, TrendingUp, DollarSign, ChevronRight, Loader2,
  MoreVertical, Edit3, Trash2, CheckCircle, XCircle, Star,
  MessageSquare, FileText, Target, AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// שלבי תהליך ליד
const LEAD_STAGES = [
  { id: 'new', label: 'חדש', color: 'bg-blue-500', lightColor: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  { id: 'contacted', label: 'יצרנו קשר', color: 'bg-purple-500', lightColor: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  { id: 'meeting_scheduled', label: 'פגישה נקבעה', color: 'bg-yellow-500', lightColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  { id: 'proposal_sent', label: 'הצעה נשלחה', color: 'bg-orange-500', lightColor: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  { id: 'negotiation', label: 'משא ומתן', color: 'bg-pink-500', lightColor: 'bg-pink-500/20 text-pink-400 border-pink-500/50' },
  { id: 'won', label: 'הפך ללקוח', color: 'bg-green-500', lightColor: 'bg-green-500/20 text-green-400 border-green-500/50' },
  { id: 'lost', label: 'אבד', color: 'bg-gray-500', lightColor: 'bg-gray-500/20 text-gray-400 border-gray-500/50' }
];

// מקורות ליד
const LEAD_SOURCES = [
  { value: 'website', label: 'אתר אינטרנט' },
  { value: 'referral', label: 'הפניה' },
  { value: 'social_media', label: 'רשתות חברתיות' },
  { value: 'event', label: 'אירוע/כנס' },
  { value: 'cold_call', label: 'שיחה יוצאת' },
  { value: 'advertising', label: 'פרסום' },
  { value: 'partner', label: 'שותף עסקי' },
  { value: 'other', label: 'אחר' }
];

export default function LeadManagementSystem({ currentUser }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    source: 'website',
    stage: 'new',
    estimated_value: '',
    notes: ''
  });

  // טעינת לידים
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      if (base44.entities.Lead) {
        return await base44.entities.Lead.filter({
          is_active: true
        }, '-created_date');
      }
      
      // fallback - demo data
      return [
        {
          id: '1',
          name: 'דני כהן',
          business_name: 'קפה הבורסה',
          email: 'dani@cafe.co.il',
          phone: '050-1234567',
          source: 'referral',
          stage: 'meeting_scheduled',
          estimated_value: 50000,
          created_date: '2026-01-15',
          notes: 'מעוניין בניהול כספים מלא'
        },
        {
          id: '2',
          name: 'מיכל לוי',
          business_name: 'סטודיו ללוגו',
          email: 'michal@studio.co.il',
          phone: '052-9876543',
          source: 'website',
          stage: 'new',
          estimated_value: 30000,
          created_date: '2026-01-20',
          notes: 'פנתה דרך האתר'
        },
        {
          id: '3',
          name: 'יוסי אברהם',
          business_name: 'יבוא ושיווק בע"מ',
          email: 'yossi@import.co.il',
          phone: '054-5555555',
          source: 'event',
          stage: 'proposal_sent',
          estimated_value: 120000,
          created_date: '2026-01-10',
          notes: 'הכרנו בכנס עסקי'
        }
      ];
    }
  });

  // סינון לידים
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const searchMatch = searchTerm === '' ||
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const stageMatch = stageFilter === 'all' || lead.stage === stageFilter;
      
      return searchMatch && stageMatch;
    });
  }, [leads, searchTerm, stageFilter]);

  // חישוב סטטיסטיקות
  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.stage === 'new').length;
    const inProgress = leads.filter(l => ['contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation'].includes(l.stage)).length;
    const won = leads.filter(l => l.stage === 'won').length;
    const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    
    return { total, newLeads, inProgress, won, totalValue };
  }, [leads]);

  // יצירת ליד חדש
  const handleCreateLead = async () => {
    if (!newLeadForm.name || !newLeadForm.phone) {
      alert('נא למלא שם וטלפון');
      return;
    }

    setIsCreating(true);
    try {
      if (base44.entities.Lead) {
        await base44.entities.Lead.create({
          ...newLeadForm,
          estimated_value: parseFloat(newLeadForm.estimated_value) || 0,
          assigned_to: currentUser?.email,
          is_active: true
        });
      }
      
      queryClient.invalidateQueries(['leads']);
      setShowNewLeadModal(false);
      setNewLeadForm({
        name: '',
        business_name: '',
        email: '',
        phone: '',
        source: 'website',
        stage: 'new',
        estimated_value: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('שגיאה ביצירת ליד');
    } finally {
      setIsCreating(false);
    }
  };

  // עדכון שלב ליד
  const handleUpdateStage = async (leadId, newStage) => {
    try {
      if (base44.entities.Lead) {
        await base44.entities.Lead.update(leadId, { stage: newStage });
      }
      queryClient.invalidateQueries(['leads']);
    } catch (error) {
      console.error('Error updating lead stage:', error);
    }
  };

  const getStageConfig = (stageId) => {
    return LEAD_STAGES.find(s => s.id === stageId) || LEAD_STAGES[0];
  };

  const formatCurrency = (value) => {
    if (typeof value !== 'number') return '₪0';
    return `₪${value.toLocaleString()}`;
  };

  // כרטיס ליד
  const LeadCard = ({ lead }) => {
    const stage = getStageConfig(lead.stage);
    
    return (
      <Card 
        className="bg-horizon-card border-horizon hover:border-horizon-primary/50 transition-all cursor-pointer"
        onClick={() => setSelectedLead(lead)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h4 className="font-semibold text-horizon-text">{lead.name}</h4>
              {lead.business_name && (
                <p className="text-sm text-horizon-accent flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {lead.business_name}
                </p>
              )}
            </div>
            <Badge className={stage.lightColor}>{stage.label}</Badge>
          </div>
          
          <div className="space-y-1 text-sm">
            {lead.phone && (
              <p className="text-horizon-accent flex items-center gap-2">
                <Phone className="w-3 h-3" />
                {lead.phone}
              </p>
            )}
            {lead.email && (
              <p className="text-horizon-accent flex items-center gap-2">
                <Mail className="w-3 h-3" />
                {lead.email}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-horizon">
            <span className="text-sm text-horizon-accent">
              {formatDistanceToNow(new Date(lead.created_date), { addSuffix: true, locale: he })}
            </span>
            {lead.estimated_value > 0 && (
              <span className="text-sm font-semibold text-green-400">
                {formatCurrency(lead.estimated_value)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // תצוגת קנבן
  const KanbanView = () => (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '500px' }}>
      {LEAD_STAGES.filter(s => s.id !== 'lost').map(stage => {
        const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
        const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
        
        return (
          <div key={stage.id} className="flex-shrink-0 w-72">
            <div className={`rounded-t-lg p-3 ${stage.color}`}>
              <div className="flex items-center justify-between text-white">
                <span className="font-semibold">{stage.label}</span>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {stageLeads.length}
                </Badge>
              </div>
              {stageValue > 0 && (
                <p className="text-white/80 text-sm mt-1">{formatCurrency(stageValue)}</p>
              )}
            </div>
            <div className="bg-horizon-card/50 rounded-b-lg p-2 space-y-2 min-h-[400px]">
              {stageLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
              {stageLeads.length === 0 && (
                <p className="text-center text-horizon-accent text-sm py-8">
                  אין לידים בשלב זה
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // תצוגת רשימה
  const ListView = () => (
    <div className="space-y-2">
      {filteredLeads.map(lead => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
      {filteredLeads.length === 0 && (
        <Card className="card-horizon">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
            <p className="text-horizon-accent">לא נמצאו לידים</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* כרטיסי סטטיסטיקות */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-horizon-accent">סה"כ לידים</p>
                <p className="text-2xl font-bold text-horizon-text">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-horizon-accent">בתהליך</p>
                <p className="text-2xl font-bold text-horizon-text">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-horizon-accent">הפכו ללקוחות</p>
                <p className="text-2xl font-bold text-horizon-text">{stats.won}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-horizon-accent">שווי צפוי</p>
                <p className="text-xl font-bold text-horizon-text">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* כלים */}
      <Card className="card-horizon">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
              <Input
                placeholder="חיפוש לפי שם, עסק או אימייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
            
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40 bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="כל השלבים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל השלבים</SelectItem>
                {LEAD_STAGES.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-1 bg-horizon-card rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                onClick={() => setViewMode('kanban')}
                className={viewMode === 'kanban' ? 'bg-horizon-primary' : ''}
              >
                קנבן
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-horizon-primary' : ''}
              >
                רשימה
              </Button>
            </div>

            <Button onClick={() => setShowNewLeadModal(true)} className="btn-horizon-primary">
              <Plus className="w-4 h-4 ml-2" />
              ליד חדש
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* תצוגה */}
      {viewMode === 'kanban' ? <KanbanView /> : <ListView />}

      {/* מודל ליד חדש */}
      <Dialog open={showNewLeadModal} onOpenChange={setShowNewLeadModal}>
        <DialogContent className="max-w-md bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              <Plus className="w-5 h-5 text-horizon-primary" />
              ליד חדש
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">שם איש קשר *</label>
                <Input
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  placeholder="דני כהן"
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">שם עסק</label>
                <Input
                  value={newLeadForm.business_name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, business_name: e.target.value })}
                  placeholder="שם החברה"
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">טלפון *</label>
                <Input
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  placeholder="050-0000000"
                  className="bg-horizon-card border-horizon text-horizon-text"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">אימייל</label>
                <Input
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-horizon-card border-horizon text-horizon-text"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">מקור</label>
                <Select 
                  value={newLeadForm.source} 
                  onValueChange={(v) => setNewLeadForm({ ...newLeadForm, source: v })}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(source => (
                      <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">שווי משוער</label>
                <Input
                  type="number"
                  value={newLeadForm.estimated_value}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, estimated_value: e.target.value })}
                  placeholder="0"
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
            </div>

            <div>
              <label className="text-horizon-accent text-sm mb-2 block">הערות</label>
              <Textarea
                value={newLeadForm.notes}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                placeholder="מידע נוסף על הליד..."
                className="bg-horizon-card border-horizon text-horizon-text"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewLeadModal(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button 
              onClick={handleCreateLead}
              disabled={isCreating}
              className="btn-horizon-primary"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  יוצר...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-2" />
                  צור ליד
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* מודל פרטי ליד */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-lg bg-horizon-dark border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-horizon-text">
                {selectedLead.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={getStageConfig(selectedLead.stage).lightColor}>
                  {getStageConfig(selectedLead.stage).label}
                </Badge>
                {selectedLead.estimated_value > 0 && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    {formatCurrency(selectedLead.estimated_value)}
                  </Badge>
                )}
              </div>

              {selectedLead.business_name && (
                <div className="flex items-center gap-2 text-horizon-text">
                  <Building2 className="w-4 h-4 text-horizon-accent" />
                  {selectedLead.business_name}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedLead.phone && (
                  <a 
                    href={`tel:${selectedLead.phone}`}
                    className="flex items-center gap-2 text-horizon-primary hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    {selectedLead.phone}
                  </a>
                )}
                {selectedLead.email && (
                  <a 
                    href={`mailto:${selectedLead.email}`}
                    className="flex items-center gap-2 text-horizon-primary hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    {selectedLead.email}
                  </a>
                )}
              </div>

              {selectedLead.notes && (
                <div className="bg-horizon-card rounded-lg p-3">
                  <p className="text-sm text-horizon-accent">{selectedLead.notes}</p>
                </div>
              )}

              {/* עדכון שלב */}
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">עדכון שלב</label>
                <Select 
                  value={selectedLead.stage}
                  onValueChange={(v) => handleUpdateStage(selectedLead.id, v)}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedLead(null)} className="btn-horizon-primary">
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
