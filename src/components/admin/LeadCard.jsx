import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, Mail, Building2, Calendar, User, 
  ChevronLeft, Clock, MessageSquare, ExternalLink,
  Facebook, Instagram, Globe, Users
} from 'lucide-react';
import { format } from 'date-fns';

const STAGE_CONFIG = {
  new: { label: 'חדש', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  contacted: { label: 'נוצר קשר', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  quote_sent: { label: 'הצעה נשלחה', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  meeting_scheduled: { label: 'פגישה נקבעה', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  tasting_scheduled: { label: 'טעימה נקבעה', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  in_negotiation: { label: 'במשא ומתן', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  closed_won: { label: 'נסגר בהצלחה', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed_lost: { label: 'אבוד', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  no_response: { label: 'אין מענה', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
};

const SOURCE_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  website: Globe,
  google_form: Globe,
  referral: Users,
  linkedin: Globe,
  whatsapp: MessageSquare,
  phone: Phone,
  email: Mail,
  event: Calendar,
  other: Globe
};

const SOURCE_LABELS = {
  facebook: 'פייסבוק',
  instagram: 'אינסטגרם',
  website: 'אתר',
  google_form: 'טופס גוגל',
  referral: 'הפניה',
  linkedin: 'לינקדאין',
  whatsapp: 'וואטסאפ',
  phone: 'טלפון',
  email: 'אימייל',
  event: 'אירוע',
  other: 'אחר'
};

const CATEGORY_LABELS = {
  working_meeting: 'פגישת עבודה',
  club_membership: 'מועדון לקוחות',
  general: 'כללי',
  supplier_lead: 'ליד ספק',
  premium_consultation: 'ייעוץ פרימיום'
};

const PRIORITY_CONFIG = {
  low: { label: 'נמוכה', color: 'bg-gray-500/20 text-gray-400' },
  medium: { label: 'בינונית', color: 'bg-blue-500/20 text-blue-400' },
  high: { label: 'גבוהה', color: 'bg-orange-500/20 text-orange-400' },
  urgent: { label: 'דחופה', color: 'bg-red-500/20 text-red-400' }
};

export default function LeadCard({ 
  lead, 
  onSelect, 
  onUpdateStage, 
  onAssignManager,
  managers = [],
  isAdmin = false,
  compact = false 
}) {
  const stageConfig = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.new;
  const SourceIcon = SOURCE_ICONS[lead.lead_source] || Globe;
  const priorityConfig = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG.medium;

  const handleStageChange = (newStage) => {
    if (onUpdateStage) {
      onUpdateStage(lead.id, newStage);
    }
  };

  const handleManagerChange = (email) => {
    if (onAssignManager) {
      onAssignManager(lead.id, email);
    }
  };

  if (compact) {
    return (
      <Card 
        className="card-horizon cursor-pointer hover:border-horizon-primary transition-all"
        onClick={onSelect}
      >
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-horizon-text text-sm truncate">
              {lead.customer_name}
            </h4>
            {lead.priority === 'urgent' && (
              <Badge className="bg-red-500/20 text-red-400 text-xs">דחוף</Badge>
            )}
          </div>
          
          {lead.business_name && (
            <p className="text-xs text-horizon-accent mb-2 truncate">
              {lead.business_name}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-horizon-accent mb-2">
            <SourceIcon className="w-3 h-3" />
            <span>{SOURCE_LABELS[lead.lead_source] || 'אחר'}</span>
          </div>
          
          {lead.created_date && (
            <div className="flex items-center gap-1 text-xs text-horizon-accent">
              <Clock className="w-3 h-3" />
              <span>{format(new Date(lead.created_date), 'dd/MM/yy')}</span>
            </div>
          )}
          
          {lead.assigned_manager_email && (
            <div className="mt-2 pt-2 border-t border-horizon">
              <p className="text-xs text-horizon-accent truncate">
                {managers.find(m => m.email === lead.assigned_manager_email)?.full_name || lead.assigned_manager_email}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-horizon hover:border-horizon-primary transition-all">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          {/* Main Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-lg text-horizon-text">{lead.customer_name}</h3>
              <Badge className={stageConfig.color}>{stageConfig.label}</Badge>
              {lead.priority && lead.priority !== 'medium' && (
                <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
              )}
            </div>
            
            {lead.business_name && (
              <div className="flex items-center gap-2 text-horizon-accent mb-2">
                <Building2 className="w-4 h-4" />
                <span>{lead.business_name}</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-horizon-accent">
              {lead.customer_phone && (
                <a 
                  href={`tel:${lead.customer_phone}`} 
                  className="flex items-center gap-1 hover:text-horizon-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-4 h-4" />
                  {lead.customer_phone}
                </a>
              )}
              
              {lead.customer_email && (
                <a 
                  href={`mailto:${lead.customer_email}`}
                  className="flex items-center gap-1 hover:text-horizon-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="w-4 h-4" />
                  {lead.customer_email}
                </a>
              )}
              
              <div className="flex items-center gap-1">
                <SourceIcon className="w-4 h-4" />
                {SOURCE_LABELS[lead.lead_source] || 'אחר'}
              </div>
              
              {lead.lead_category && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {CATEGORY_LABELS[lead.lead_category] || lead.lead_category}
                </div>
              )}
            </div>
            
            {lead.request_details && (
              <p className="mt-2 text-sm text-horizon-accent line-clamp-2">
                {lead.request_details}
              </p>
            )}
            
            {lead.created_date && (
              <div className="flex items-center gap-1 mt-2 text-xs text-horizon-accent">
                <Calendar className="w-3 h-3" />
                <span>נוצר: {format(new Date(lead.created_date), 'dd/MM/yyyy HH:mm')}</span>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-2 mr-4">
            <Select 
              value={lead.stage} 
              onValueChange={handleStageChange}
            >
              <SelectTrigger className="w-[140px] bg-horizon-dark border-horizon text-horizon-text text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-horizon-card border-horizon">
                {Object.entries(STAGE_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value} className="text-horizon-text text-xs">
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {isAdmin && managers.length > 0 && (
              <Select 
                value={lead.assigned_manager_email || ''} 
                onValueChange={handleManagerChange}
              >
                <SelectTrigger className="w-[140px] bg-horizon-dark border-horizon text-horizon-text text-xs">
                  <SelectValue placeholder="שייך מנהל" />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  {managers.map(mgr => (
                    <SelectItem key={mgr.email} value={mgr.email} className="text-horizon-text text-xs">
                      {mgr.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelect}
              className="text-horizon-primary hover:bg-horizon-primary/10"
            >
              פרטים
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
        
        {/* Assigned Manager */}
        {lead.assigned_manager_email && (
          <div className="mt-3 pt-3 border-t border-horizon flex items-center gap-2">
            <User className="w-4 h-4 text-horizon-accent" />
            <span className="text-sm text-horizon-accent">
              משויך ל: {managers.find(m => m.email === lead.assigned_manager_email)?.full_name || lead.assigned_manager_email}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}