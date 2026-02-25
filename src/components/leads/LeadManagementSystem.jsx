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


import {
  Users, Plus, Search, Filter, Phone, Mail, Calendar, Building2,
  User, Clock, TrendingUp, DollarSign, ChevronRight, Loader2,
  MoreVertical, Edit3, Trash2, CheckCircle, XCircle, Star,
  MessageSquare, FileText, Target, AlertCircle, ArrowRight,
  Zap, Globe, Facebook, Instagram, Linkedin, ExternalLink,
  History, Tag, Filter as FunnelIcon, LayoutGrid, List, ChevronDown,
  Sparkles, Activity, RefreshCw, Eye, Bookmark, Archive
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Lead } from '@/api/entities';

// שלבי תהליך ליד - מותאם למבנה מהוובהוק
const LEAD_STAGES = [
  { id: 'new', label: 'חדש', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500', lightColor: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Sparkles },
  { id: 'contacted', label: 'יצרנו קשר', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-500', lightColor: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Phone },
  { id: 'meeting_scheduled', label: 'פגישה נקבעה', color: 'from-yellow-500 to-orange-500', bgColor: 'bg-yellow-500', lightColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Calendar },
  { id: 'proposal_sent', label: 'הצעה נשלחה', color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-500', lightColor: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: FileText },
  { id: 'negotiation', label: 'משא ומתן', color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-500', lightColor: 'bg-pink-500/20 text-pink-400 border-pink-500/50', icon: MessageSquare },
  { id: 'closed_won', label: 'הפך ללקוח', color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-500', lightColor: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle },
  { id: 'closed_lost', label: 'אבד', color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-500', lightColor: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: XCircle }
];

// מקורות ליד עם אייקונים
const LEAD_SOURCES = [
  { value: 'website', label: 'אתר אינטרנט', icon: Globe, color: 'text-blue-400' },
  { value: 'facebook', label: 'פייסבוק', icon: Facebook, color: 'text-blue-500' },
  { value: 'instagram', label: 'אינסטגרם', icon: Instagram, color: 'text-pink-500' },
  { value: 'linkedin', label: 'לינקדאין', icon: Linkedin, color: 'text-blue-600' },
  { value: 'google_form', label: 'גוגל', icon: Globe, color: 'text-red-400' },
  { value: 'whatsapp', label: 'וואטסאפ', icon: MessageSquare, color: 'text-green-500' },
  { value: 'referral', label: 'הפניה', icon: Users, color: 'text-purple-400' },
  { value: 'other', label: 'אחר', icon: Tag, color: 'text-gray-400' }
];

// קטגוריות ליד
const LEAD_CATEGORIES = [
  { value: 'working_meeting', label: 'פגישת עבודה', color: 'bg-indigo-500/20 text-indigo-400' },
  { value: 'club_membership', label: 'חברות מועדון', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'general', label: 'כללי', color: 'bg-gray-500/20 text-gray-400' }
];

// עדיפויות
const PRIORITIES = [
  { value: 'urgent', label: 'דחוף', color: 'bg-red-500', textColor: 'text-red-400' },
  { value: 'high', label: 'גבוה', color: 'bg-orange-500', textColor: 'text-orange-400' },
  { value: 'medium', label: 'בינוני', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  { value: 'low', label: 'נמוך', color: 'bg-gray-500', textColor: 'text-gray-400' }
];

export default function LeadManagementSystem({ currentUser }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [historyNote, setHistoryNote] = useState('');

  // טעינת לידים מהמערכת
  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: async () => {
      try {
        const result = await Lead.list('-created_date');
        return result || [];
      } catch (error) {
        console.error('Error loading leads:', error);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // refresh every minute
  });

  // סינון לידים
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const searchMatch = searchTerm === '' ||
        lead.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_phone?.includes(searchTerm);
      
      const stageMatch = stageFilter === 'all' || lead.stage === stageFilter;
      const sourceMatch = sourceFilter === 'all' || lead.lead_source === sourceFilter;
      const priorityMatch = priorityFilter === 'all' || lead.priority === priorityFilter;
      
      return searchMatch && stageMatch && sourceMatch && priorityMatch;
    });
  }, [leads, searchTerm, stageFilter, sourceFilter, priorityFilter]);

  // חישוב סטטיסטיקות מתקדמות
  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.stage === 'new').length;
    const inProgress = leads.filter(l => ['contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation'].includes(l.stage)).length;
    const won = leads.filter(l => l.stage === 'closed_won').length;
    const lost = leads.filter(l => l.stage === 'closed_lost').length;
    
    // לידים חדשים היום
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLeads = leads.filter(l => {
      const created = new Date(l.created_date);
      return created >= today;
    }).length;

    // לידים השבוע
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekLeads = leads.filter(l => {
      const created = new Date(l.created_date);
      return created >= weekAgo;
    }).length;

    // שיעור המרה
    const closedLeads = won + lost;
    const conversionRate = closedLeads > 0 ? ((won / closedLeads) * 100).toFixed(1) : 0;

    // לפי מקור
    const bySource = LEAD_SOURCES.map(source => ({
      ...source,
      count: leads.filter(l => l.lead_source === source.value).length
    })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

    // ממוצע ימים בכל שלב
    const avgDaysInPipeline = leads
      .filter(l => l.created_date && l.stage !== 'new')
      .map(l => differenceInDays(new Date(), new Date(l.created_date)))
      .reduce((sum, days, _, arr) => sum + days / arr.length, 0) || 0;

    return { 
      total, newLeads, inProgress, won, lost, todayLeads, weekLeads, 
      conversionRate, bySource, avgDaysInPipeline: Math.round(avgDaysInPipeline)
    };
  }, [leads]);

  // עדכון שלב ליד עם היסטוריה
  const handleUpdateStage = async (leadId, newStage, note = '') => {
    setIsUpdating(true);
    try {
      const lead = leads.find(l => l.id === leadId);
      const oldStage = lead?.stage;
      
      // עדכון ההיסטוריה
      const historyEntry = {
        date: new Date().toISOString(),
        action: 'stage_change',
        from_stage: oldStage,
        to_stage: newStage,
        user: currentUser?.email || 'system',
        note: note || ''
      };

      const existingHistory = lead?.history || [];
      
      await Lead.update(leadId, { 
        stage: newStage,
        history: [...existingHistory, historyEntry],
        last_activity_date: new Date().toISOString()
      });
      
      queryClient.invalidateQueries(['admin-leads']);
      
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => ({
          ...prev,
          stage: newStage,
          history: [...existingHistory, historyEntry]
        }));
      }
    } catch (error) {
      console.error('Error updating lead stage:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // הוספת הערה להיסטוריה
  const handleAddNote = async (leadId) => {
    if (!historyNote.trim()) return;
    
    setIsUpdating(true);
    try {
      const lead = leads.find(l => l.id === leadId);
      
      const historyEntry = {
        date: new Date().toISOString(),
        action: 'note',
        note: historyNote,
        user: currentUser?.email || 'system'
      };

      const existingHistory = lead?.history || [];
      
      await Lead.update(leadId, { 
        history: [...existingHistory, historyEntry],
        last_activity_date: new Date().toISOString()
      });
      
      queryClient.invalidateQueries(['admin-leads']);
      setHistoryNote('');
      
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => ({
          ...prev,
          history: [...existingHistory, historyEntry]
        }));
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStageConfig = (stageId) => {
    return LEAD_STAGES.find(s => s.id === stageId) || LEAD_STAGES[0];
  };

  const getSourceConfig = (sourceId) => {
    return LEAD_SOURCES.find(s => s.value === sourceId) || LEAD_SOURCES[LEAD_SOURCES.length - 1];
  };

  const getPriorityConfig = (priorityId) => {
    return PRIORITIES.find(p => p.value === priorityId) || PRIORITIES[2];
  };

  // כרטיס ליד מתקדם
  const LeadCard = ({ lead, compact = false }) => {
    const stage = getStageConfig(lead.stage);
    const source = getSourceConfig(lead.lead_source);
    const priority = getPriorityConfig(lead.priority);
    const SourceIcon = source.icon;
    const daysOld = lead.created_date ? differenceInDays(new Date(), new Date(lead.created_date)) : 0;
    
    return (
      <Card 
        className={`group bg-gradient-to-br from-horizon-card to-horizon-dark border-horizon hover:border-horizon-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-horizon-primary/10 hover:-translate-y-1 ${compact ? 'p-2' : ''}`}
        onClick={() => setSelectedLead(lead)}
      >
        <CardContent className={compact ? 'p-3' : 'p-4'}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-horizon-text truncate">{lead.customer_name}</h4>
                {lead.priority === 'urgent' && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>
              {lead.business_name && (
                <p className="text-sm text-horizon-accent flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{lead.business_name}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={`${stage.lightColor} text-xs`}>{stage.label}</Badge>
              <div className={`w-2 h-2 rounded-full ${priority.color}`} title={priority.label} />
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="space-y-1 text-sm mb-3">
            {lead.customer_phone && (
              <a 
                href={`tel:${lead.customer_phone}`} 
                className="text-horizon-accent flex items-center gap-2 hover:text-horizon-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3" />
                <span dir="ltr">{lead.customer_phone}</span>
              </a>
            )}
            {lead.customer_email && (
              <a 
                href={`mailto:${lead.customer_email}`}
                className="text-horizon-accent flex items-center gap-2 hover:text-horizon-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="w-3 h-3" />
                <span className="truncate">{lead.customer_email}</span>
              </a>
            )}
          </div>

          {/* Request Details */}
          {lead.request_details && !compact && (
            <div className="bg-horizon-dark/50 rounded-lg p-2 mb-3">
              <p className="text-xs text-horizon-accent line-clamp-2">{lead.request_details}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-horizon/50">
            <div className="flex items-center gap-2">
              <SourceIcon className={`w-4 h-4 ${source.color}`} />
              <span className="text-xs text-horizon-accent">{source.label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-horizon-accent">
              <Clock className="w-3 h-3" />
              {daysOld === 0 ? 'היום' : `${daysOld} ימים`}
            </div>
          </div>

          {/* Assigned Manager */}
          {lead.assigned_manager_email && (
            <div className="mt-2 pt-2 border-t border-horizon/30 flex items-center gap-2">
              <User className="w-3 h-3 text-horizon-accent" />
              <span className="text-xs text-horizon-accent truncate">{lead.assigned_manager_email}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // תצוגת קנבן מתקדמת
  const KanbanView = () => {
    const activeStages = LEAD_STAGES.filter(s => s.id !== 'closed_lost');
    
    return (
      <div className="flex gap-4 overflow-x-auto pb-6 px-1" style={{ minHeight: '600px' }}>
        {activeStages.map((stage, index) => {
          const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
          const StageIcon = stage.icon;
          
          return (
            <div key={stage.id} className="flex-shrink-0 w-80">
              {/* Column Header */}
              <div className={`rounded-t-xl p-4 bg-gradient-to-r ${stage.color} shadow-lg`}>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <StageIcon className="w-5 h-5" />
                    <span className="font-bold">{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm">
                    {stageLeads.length}
                  </Badge>
                </div>
              </div>
              
              {/* Column Body */}
              <div className="bg-gradient-to-b from-horizon-card/80 to-horizon-dark/50 rounded-b-xl p-3 space-y-3 min-h-[500px] border-x border-b border-horizon/30">
                {stageLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
                {stageLeads.length === 0 && (
                  <div className="text-center py-12 text-horizon-accent">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-horizon-dark/50 flex items-center justify-center">
                      <StageIcon className="w-6 h-6 opacity-50" />
                    </div>
                    <p className="text-sm">אין לידים בשלב זה</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // תצוגת רשימה מתקדמת
  const ListView = () => (
    <div className="bg-horizon-card rounded-xl border border-horizon overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-horizon-primary/10 to-horizon-secondary/10">
            <tr className="border-b border-horizon">
              <th className="text-right p-4 text-horizon-accent font-semibold">שם</th>
              <th className="text-right p-4 text-horizon-accent font-semibold">עסק</th>
              <th className="text-right p-4 text-horizon-accent font-semibold">טלפון</th>
              <th className="text-right p-4 text-horizon-accent font-semibold">מקור</th>
              <th className="text-right p-4 text-horizon-accent font-semibold">שלב</th>
              <th className="text-right p-4 text-horizon-accent font-semibold">עדיפות</th>
              <th className="text-right p-4 text-horizon-accent font-semibold">תאריך</th>
              <th className="text-right p-4 text-horizon-accent font-semibold">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead, index) => {
              const stage = getStageConfig(lead.stage);
              const source = getSourceConfig(lead.lead_source);
              const priority = getPriorityConfig(lead.priority);
              const SourceIcon = source.icon;
              
              return (
                <tr 
                  key={lead.id} 
                  className={`border-b border-horizon/50 hover:bg-horizon-primary/5 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-horizon-dark/20' : ''}`}
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${priority.color}`} />
                      <span className="font-medium text-horizon-text">{lead.customer_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-horizon-accent">{lead.business_name || '-'}</td>
                  <td className="p-4 text-horizon-accent" dir="ltr">{lead.customer_phone || '-'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <SourceIcon className={`w-4 h-4 ${source.color}`} />
                      <span className="text-horizon-accent text-sm">{source.label}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={stage.lightColor}>{stage.label}</Badge>
                  </td>
                  <td className="p-4">
                    <span className={`text-sm ${priority.textColor}`}>{priority.label}</span>
                  </td>
                  <td className="p-4 text-horizon-accent text-sm">
                    {lead.created_date ? format(new Date(lead.created_date), 'dd/MM/yyyy', { locale: he }) : '-'}
                  </td>
                  <td className="p-4">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-horizon-primary hover:bg-horizon-primary/10"
                      onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredLeads.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-30" />
          <p className="text-horizon-accent text-lg">לא נמצאו לידים</p>
          <p className="text-horizon-accent/60 text-sm mt-1">נסה לשנות את הסינון</p>
        </div>
      )}
    </div>
  );

  // תצוגת FunnelIcon
  const FunnelIconView = () => {
    const funnelStages = LEAD_STAGES.filter(s => !['closed_lost'].includes(s.id));
    const maxCount = Math.max(...funnelStages.map(s => filteredLeads.filter(l => l.stage === s.id).length), 1);
    
    return (
      <div className="bg-horizon-card rounded-xl border border-horizon p-6">
        <h3 className="text-lg font-bold text-horizon-text mb-6 flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-horizon-primary" />
          משפך מכירות
        </h3>
        <div className="space-y-3">
          {funnelStages.map((stage, index) => {
            const count = filteredLeads.filter(l => l.stage === stage.id).length;
            const width = (count / maxCount) * 100;
            const StageIcon = stage.icon;
            
            return (
              <div key={stage.id} className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-horizon-accent">
                  <StageIcon className="w-4 h-4" />
                  <span className="text-sm">{stage.label}</span>
                </div>
                <div className="flex-1 h-10 bg-horizon-dark/50 rounded-lg overflow-hidden relative">
                  <div 
                    className={`h-full bg-gradient-to-r ${stage.color} transition-all duration-500 flex items-center justify-end pr-3`}
                    style={{ width: `${Math.max(width, count > 0 ? 15 : 0)}%` }}
                  >
                    {count > 0 && (
                      <span className="text-white font-bold">{count}</span>
                    )}
                  </div>
                  {count === 0 && (
                    <span className="absolute inset-0 flex items-center justify-center text-horizon-accent/50 text-sm">0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-horizon-primary mx-auto mb-4" />
          <p className="text-horizon-accent">טוען לידים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-300/70">סה"כ לידים</p>
                <p className="text-3xl font-bold text-blue-300">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300/70">חדשים היום</p>
                <p className="text-3xl font-bold text-purple-300">{stats.todayLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-600/10 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-yellow-300/70">בתהליך</p>
                <p className="text-3xl font-bold text-yellow-300">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-green-300/70">הפכו ללקוחות</p>
                <p className="text-3xl font-bold text-green-300">{stats.won}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-teal-600/10 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-cyan-300/70">שיעור המרה</p>
                <p className="text-3xl font-bold text-cyan-300">{stats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/20 to-rose-600/10 border-pink-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-pink-300/70">ממוצע ימים</p>
                <p className="text-3xl font-bold text-pink-300">{stats.avgDaysInPipeline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="bg-horizon-card border-horizon">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-horizon-accent" />
              <Input
                placeholder="חיפוש לפי שם, עסק, אימייל או טלפון..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-11 bg-horizon-dark border-horizon text-horizon-text h-11"
              />
            </div>
            
            {/* Filters */}
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-36 bg-horizon-dark border-horizon text-horizon-text h-11">
                <SelectValue placeholder="כל השלבים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל השלבים</SelectItem>
                {LEAD_STAGES.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36 bg-horizon-dark border-horizon text-horizon-text h-11">
                <SelectValue placeholder="כל המקורות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המקורות</SelectItem>
                {LEAD_SOURCES.map(source => (
                  <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32 bg-horizon-dark border-horizon text-horizon-text h-11">
                <SelectValue placeholder="עדיפות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל העדיפויות</SelectItem>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-horizon-dark rounded-lg p-1 border border-horizon">
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                onClick={() => setViewMode('kanban')}
                className={`h-9 ${viewMode === 'kanban' ? 'bg-horizon-primary text-white' : 'text-horizon-accent hover:text-horizon-text'}`}
              >
                <LayoutGrid className="w-4 h-4 ml-1" />
                קנבן
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className={`h-9 ${viewMode === 'list' ? 'bg-horizon-primary text-white' : 'text-horizon-accent hover:text-horizon-text'}`}
              >
                <List className="w-4 h-4 ml-1" />
                רשימה
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'funnel' ? 'default' : 'ghost'}
                onClick={() => setViewMode('funnel')}
                className={`h-9 ${viewMode === 'funnel' ? 'bg-horizon-primary text-white' : 'text-horizon-accent hover:text-horizon-text'}`}
              >
                <FunnelIcon className="w-4 h-4 ml-1" />
                משפך
              </Button>
            </div>

            {/* Refresh */}
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="border-horizon text-horizon-accent hover:bg-horizon-primary/10 h-11"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main View */}
      {viewMode === 'kanban' && <KanbanView />}
      {viewMode === 'list' && <ListView />}
      {viewMode === 'funnel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FunnelIconView />
          <Card className="bg-horizon-card border-horizon p-6">
            <h3 className="text-lg font-bold text-horizon-text mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-horizon-primary" />
              לפי מקור
            </h3>
            <div className="space-y-4">
              {stats.bySource.slice(0, 6).map(source => {
                const SourceIcon = source.icon;
                const percentage = stats.total > 0 ? ((source.count / stats.total) * 100).toFixed(0) : 0;
                return (
                  <div key={source.value} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-horizon-dark/50 flex items-center justify-center`}>
                      <SourceIcon className={`w-5 h-5 ${source.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-horizon-text font-medium">{source.label}</span>
                        <span className="text-horizon-accent">{source.count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-horizon-dark/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-horizon-primary to-horizon-secondary transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl text-horizon-text flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getStageConfig(selectedLead.stage).color} flex items-center justify-center`}>
                  <User className="w-5 h-5 text-white" />
                </div>
                {selectedLead.customer_name}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="bg-horizon-card border border-horizon">
                <TabsTrigger value="details">פרטים</TabsTrigger>
                <TabsTrigger value="history">היסטוריה ({selectedLead.history?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-4">
                {/* Status & Stage */}
                <div className="flex flex-wrap gap-3">
                  <Badge className={getStageConfig(selectedLead.stage).lightColor}>
                    {getStageConfig(selectedLead.stage).label}
                  </Badge>
                  {selectedLead.lead_category && (
                    <Badge className={LEAD_CATEGORIES.find(c => c.value === selectedLead.lead_category)?.color || 'bg-gray-500/20 text-gray-400'}>
                      {LEAD_CATEGORIES.find(c => c.value === selectedLead.lead_category)?.label || selectedLead.lead_category}
                    </Badge>
                  )}
                  <Badge className={getPriorityConfig(selectedLead.priority).textColor + ' bg-horizon-card border border-horizon'}>
                    עדיפות: {getPriorityConfig(selectedLead.priority).label}
                  </Badge>
                </div>

                {/* Contact Info */}
                <Card className="bg-horizon-card border-horizon">
                  <CardContent className="p-4 space-y-3">
                    {selectedLead.business_name && (
                      <div className="flex items-center gap-3 text-horizon-text">
                        <Building2 className="w-5 h-5 text-horizon-accent" />
                        <span className="font-medium">{selectedLead.business_name}</span>
                      </div>
                    )}
                    {selectedLead.customer_phone && (
                      <a 
                        href={`tel:${selectedLead.customer_phone}`}
                        className="flex items-center gap-3 text-horizon-primary hover:underline"
                      >
                        <Phone className="w-5 h-5" />
                        <span dir="ltr">{selectedLead.customer_phone}</span>
                      </a>
                    )}
                    {selectedLead.customer_email && (
                      <a 
                        href={`mailto:${selectedLead.customer_email}`}
                        className="flex items-center gap-3 text-horizon-primary hover:underline"
                      >
                        <Mail className="w-5 h-5" />
                        {selectedLead.customer_email}
                      </a>
                    )}
                  </CardContent>
                </Card>

                {/* Request Details */}
                {selectedLead.request_details && (
                  <Card className="bg-horizon-card border-horizon">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-horizon-accent">פרטי הבקשה</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-horizon-text whitespace-pre-wrap">{selectedLead.request_details}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Source Info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-horizon-card border-horizon">
                    <CardContent className="p-4">
                      <p className="text-sm text-horizon-accent mb-1">מקור</p>
                      <div className="flex items-center gap-2">
                        {React.createElement(getSourceConfig(selectedLead.lead_source).icon, {
                          className: `w-5 h-5 ${getSourceConfig(selectedLead.lead_source).color}`
                        })}
                        <span className="text-horizon-text font-medium">
                          {getSourceConfig(selectedLead.lead_source).label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-horizon-card border-horizon">
                    <CardContent className="p-4">
                      <p className="text-sm text-horizon-accent mb-1">תאריך יצירה</p>
                      <p className="text-horizon-text font-medium">
                        {selectedLead.created_date ? format(new Date(selectedLead.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '-'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* UTM Info */}
                {(selectedLead.utm_source || selectedLead.utm_medium || selectedLead.utm_campaign) && (
                  <Card className="bg-horizon-card border-horizon">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-horizon-accent">מידע קמפיין</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 grid grid-cols-3 gap-4">
                      {selectedLead.utm_source && (
                        <div>
                          <p className="text-xs text-horizon-accent">Source</p>
                          <p className="text-horizon-text">{selectedLead.utm_source}</p>
                        </div>
                      )}
                      {selectedLead.utm_medium && (
                        <div>
                          <p className="text-xs text-horizon-accent">Medium</p>
                          <p className="text-horizon-text">{selectedLead.utm_medium}</p>
                        </div>
                      )}
                      {selectedLead.utm_campaign && (
                        <div>
                          <p className="text-xs text-horizon-accent">Campaign</p>
                          <p className="text-horizon-text">{selectedLead.utm_campaign}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Update Stage */}
                <Card className="bg-horizon-card border-horizon">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-horizon-accent">עדכון שלב</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select 
                      value={selectedLead.stage}
                      onValueChange={(v) => handleUpdateStage(selectedLead.id, v)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STAGES.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${stage.bgColor}`} />
                              {stage.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                {/* Add Note */}
                <Card className="bg-horizon-card border-horizon">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Textarea
                        placeholder="הוסף הערה או עדכון..."
                        value={historyNote}
                        onChange={(e) => setHistoryNote(e.target.value)}
                        className="bg-horizon-dark border-horizon text-horizon-text flex-1"
                        rows={2}
                      />
                      <Button 
                        onClick={() => handleAddNote(selectedLead.id)}
                        disabled={!historyNote.trim() || isUpdating}
                        className="btn-horizon-primary self-end"
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* History Timeline */}
                <div className="relative">
                  {selectedLead.history && selectedLead.history.length > 0 ? (
                    <div className="space-y-4">
                      {[...selectedLead.history].reverse().map((entry, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              entry.action === 'stage_change' 
                                ? 'bg-gradient-to-br from-horizon-primary to-horizon-secondary' 
                                : 'bg-horizon-card border border-horizon'
                            }`}>
                              {entry.action === 'stage_change' ? (
                                <ArrowRight className="w-5 h-5 text-white" />
                              ) : (
                                <MessageSquare className="w-5 h-5 text-horizon-accent" />
                              )}
                            </div>
                            {index < selectedLead.history.length - 1 && (
                              <div className="w-0.5 h-full bg-horizon min-h-[20px]" />
                            )}
                          </div>
                          <Card className="flex-1 bg-horizon-card border-horizon">
                            <CardContent className="p-4">
                              {entry.action === 'stage_change' ? (
                                <div>
                                  <p className="text-horizon-text font-medium">
                                    שינוי שלב: {getStageConfig(entry.from_stage).label} → {getStageConfig(entry.to_stage).label}
                                  </p>
                                  {entry.note && (
                                    <p className="text-horizon-accent mt-2">{entry.note}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-horizon-text">{entry.note}</p>
                              )}
                              <div className="flex items-center gap-2 mt-3 text-xs text-horizon-accent">
                                <Clock className="w-3 h-3" />
                                {format(new Date(entry.date), 'dd/MM/yyyy HH:mm', { locale: he })}
                                {entry.user && (
                                  <>
                                    <span>•</span>
                                    <User className="w-3 h-3" />
                                    {entry.user}
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-30" />
                      <p className="text-horizon-accent">אין היסטוריה עדיין</p>
                      <p className="text-horizon-accent/60 text-sm mt-1">הוסף הערה או עדכן שלב כדי להתחיל</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
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
