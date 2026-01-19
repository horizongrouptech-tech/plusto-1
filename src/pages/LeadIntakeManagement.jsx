import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Filter, Plus, Users, Phone, Mail, Calendar, 
  TrendingUp, Clock, CheckCircle, XCircle, AlertCircle,
  RefreshCw, Download, BarChart3, Loader2
} from 'lucide-react';
import LeadCard from '@/components/admin/LeadCard';
import LeadDetailModal from '@/components/admin/LeadDetailModal';
import LoadingScreen from '@/components/shared/LoadingScreen';

const LEAD_STAGES = [
  { value: 'new', label: 'חדש', color: 'bg-blue-500' },
  { value: 'contacted', label: 'נוצר קשר', color: 'bg-yellow-500' },
  { value: 'quote_sent', label: 'הצעה נשלחה', color: 'bg-orange-500' },
  { value: 'meeting_scheduled', label: 'פגישה נקבעה', color: 'bg-purple-500' },
  { value: 'tasting_scheduled', label: 'טעימה נקבעה', color: 'bg-pink-500' },
  { value: 'in_negotiation', label: 'במשא ומתן', color: 'bg-indigo-500' },
  { value: 'closed_won', label: 'נסגר בהצלחה', color: 'bg-green-500' },
  { value: 'closed_lost', label: 'אבוד', color: 'bg-red-500' },
  { value: 'no_response', label: 'אין מענה', color: 'bg-gray-500' }
];

const LEAD_CATEGORIES = [
  { value: 'all', label: 'הכל' },
  { value: 'working_meeting', label: 'פגישת עבודה' },
  { value: 'club_membership', label: 'מועדון לקוחות' },
  { value: 'general', label: 'כללי' },
  { value: 'supplier_lead', label: 'ליד ספק' },
  { value: 'premium_consultation', label: 'ייעוץ פרימיום' }
];

const LEAD_SOURCES = [
  { value: 'all', label: 'כל המקורות' },
  { value: 'facebook', label: 'פייסבוק' },
  { value: 'instagram', label: 'אינסטגרם' },
  { value: 'google_form', label: 'טופס גוגל' },
  { value: 'website', label: 'אתר' },
  { value: 'referral', label: 'הפניה' },
  { value: 'linkedin', label: 'לינקדאין' },
  { value: 'whatsapp', label: 'וואטסאפ' },
  { value: 'phone', label: 'טלפון' },
  { value: 'email', label: 'אימייל' },
  { value: 'event', label: 'אירוע' },
  { value: 'other', label: 'אחר' }
];

export default function LeadIntakeManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'

  // Load current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = currentUser?.role === 'admin';
  const isFinancialManager = currentUser?.user_type === 'financial_manager';

  // Load leads
  const { data: leads = [], isLoading: isLoadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const allLeads = await base44.entities.Lead.filter({}, '-created_date');
      
      // Filter by manager if not admin
      if (isFinancialManager && currentUser?.email) {
        return allLeads.filter(lead => 
          lead.assigned_manager_email === currentUser.email ||
          !lead.assigned_manager_email // unassigned leads visible to all managers
        );
      }
      
      return allLeads;
    },
    enabled: !!currentUser
  });

  // Load financial managers for assignment
  const { data: financialManagers = [] } = useQuery({
    queryKey: ['financialManagers'],
    queryFn: async () => {
      if (!isAdmin) return [];
      const users = await base44.entities.User.filter({ 
        user_type: 'financial_manager',
        is_active: true
      });
      return users;
    },
    enabled: isAdmin
  });

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !searchTerm || 
        lead.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_phone?.includes(searchTerm) ||
        lead.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || lead.lead_category === categoryFilter;
      const matchesSource = sourceFilter === 'all' || lead.lead_source === sourceFilter;
      const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
      const matchesManager = managerFilter === 'all' || lead.assigned_manager_email === managerFilter;
      
      return matchesSearch && matchesCategory && matchesSource && matchesStage && matchesManager;
    });
  }, [leads, searchTerm, categoryFilter, sourceFilter, stageFilter, managerFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.stage === 'new').length;
    const inProgress = leads.filter(l => ['contacted', 'quote_sent', 'meeting_scheduled', 'in_negotiation'].includes(l.stage)).length;
    const closedWon = leads.filter(l => l.stage === 'closed_won').length;
    const closedLost = leads.filter(l => l.stage === 'closed_lost').length;
    
    return { total, newLeads, inProgress, closedWon, closedLost };
  }, [leads]);

  // Group leads by stage for Kanban view
  const leadsByStage = useMemo(() => {
    const grouped = {};
    LEAD_STAGES.forEach(stage => {
      grouped[stage.value] = filteredLeads.filter(lead => lead.stage === stage.value);
    });
    return grouped;
  }, [filteredLeads]);

  const handleUpdateLeadStage = async (leadId, newStage) => {
    try {
      await base44.entities.Lead.update(leadId, { 
        stage: newStage,
        ...(newStage === 'contacted' && { first_contact_date: new Date().toISOString() }),
        last_contact_date: new Date().toISOString()
      });
      queryClient.invalidateQueries(['leads']);
    } catch (error) {
      console.error('Error updating lead stage:', error);
      alert('שגיאה בעדכון שלב הליד');
    }
  };

  const handleAssignManager = async (leadId, managerEmail) => {
    try {
      await base44.entities.Lead.update(leadId, { assigned_manager_email: managerEmail });
      queryClient.invalidateQueries(['leads']);
    } catch (error) {
      console.error('Error assigning manager:', error);
      alert('שגיאה בשיוך מנהל');
    }
  };

  if (isLoadingLeads) {
    return <LoadingScreen message="טוען לידים..." />;
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-6" dir="rtl">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-horizon-text">ניהול לידים נכנסים</h1>
            <p className="text-horizon-accent">מעקב וניהול פניות מלקוחות פוטנציאליים</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetchLeads()}
              className="border-horizon text-horizon-text"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              רענן
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="card-horizon">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">סה"כ לידים</p>
                  <p className="text-2xl font-bold text-horizon-text">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-horizon-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-horizon">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">חדשים</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.newLeads}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-horizon">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">בטיפול</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.inProgress}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-horizon">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">נסגרו בהצלחה</p>
                  <p className="text-2xl font-bold text-green-400">{stats.closedWon}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-horizon">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">אבודים</p>
                  <p className="text-2xl font-bold text-red-400">{stats.closedLost}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-horizon mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-horizon-accent w-4 h-4" />
                  <Input
                    placeholder="חיפוש לפי שם, אימייל, טלפון..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] bg-horizon-dark border-horizon text-horizon-text">
                  <SelectValue placeholder="קטגוריה" />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  {LEAD_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-horizon-text">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[160px] bg-horizon-dark border-horizon text-horizon-text">
                  <SelectValue placeholder="מקור" />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  {LEAD_SOURCES.map(src => (
                    <SelectItem key={src.value} value={src.value} className="text-horizon-text">
                      {src.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[160px] bg-horizon-dark border-horizon text-horizon-text">
                  <SelectValue placeholder="שלב" />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  <SelectItem value="all" className="text-horizon-text">כל השלבים</SelectItem>
                  {LEAD_STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value} className="text-horizon-text">
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isAdmin && financialManagers.length > 0 && (
                <Select value={managerFilter} onValueChange={setManagerFilter}>
                  <SelectTrigger className="w-[180px] bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue placeholder="מנהל כספים" />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    <SelectItem value="all" className="text-horizon-text">כל המנהלים</SelectItem>
                    {financialManagers.map(mgr => (
                      <SelectItem key={mgr.email} value={mgr.email} className="text-horizon-text">
                        {mgr.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-2 border-r border-horizon pr-4 mr-2">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className={viewMode === 'kanban' ? 'btn-horizon-primary' : 'border-horizon text-horizon-text'}
                >
                  קנבן
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'btn-horizon-primary' : 'border-horizon text-horizon-text'}
                >
                  רשימה
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {viewMode === 'kanban' ? (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {LEAD_STAGES.slice(0, 7).map(stage => (
                <div key={stage.value} className="w-[280px] flex-shrink-0">
                  <div className={`rounded-t-lg px-3 py-2 ${stage.color}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-white">{stage.label}</span>
                      <Badge className="bg-white/20 text-white">
                        {leadsByStage[stage.value]?.length || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-horizon-card/50 rounded-b-lg p-2 min-h-[400px] space-y-2">
                    {leadsByStage[stage.value]?.map(lead => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onSelect={() => setSelectedLead(lead)}
                        onUpdateStage={handleUpdateLeadStage}
                        onAssignManager={handleAssignManager}
                        managers={financialManagers}
                        isAdmin={isAdmin}
                        compact
                      />
                    ))}
                    {(!leadsByStage[stage.value] || leadsByStage[stage.value].length === 0) && (
                      <div className="text-center py-8 text-horizon-accent text-sm">
                        אין לידים בשלב זה
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.length === 0 ? (
              <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
                  <p className="text-horizon-accent">לא נמצאו לידים</p>
                </CardContent>
              </Card>
            ) : (
              filteredLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onSelect={() => setSelectedLead(lead)}
                  onUpdateStage={handleUpdateLeadStage}
                  onAssignManager={handleAssignManager}
                  managers={financialManagers}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </div>
        )}

        {/* Lead Detail Modal */}
        {selectedLead && (
          <LeadDetailModal
            lead={selectedLead}
            isOpen={!!selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={() => {
              queryClient.invalidateQueries(['leads']);
              setSelectedLead(null);
            }}
            managers={financialManagers}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}