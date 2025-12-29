import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FolderOpen,
  Lightbulb,
  Package,
  FileText,
  Target,
  Truck,
  DollarSign,
  Building2,
  Globe
} from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';

// ייבוא קומפוננטות קיימות
import CustomerFileUploadManager from '@/components/admin/CustomerFileUploadManager';
import StrategicRecommendations from '@/components/admin/StrategicRecommendations';
import ProductCatalogManager from '@/components/catalog/ProductCatalogManager';
import UnifiedForecastManager from '@/components/forecast/UnifiedForecastManager';
import CustomerGoalsGantt from '@/components/admin/CustomerGoalsGantt';
import CustomerSuppliersTab from '@/components/admin/CustomerSuppliersTab';
import WebsiteScanner from '@/components/admin/WebsiteScanner';
import CreateRecommendationButtons from '@/components/admin/CreateRecommendationButtons';
import RecommendationFilters from '@/components/admin/RecommendationFilters';
import ManagerAssignmentTab from './ManagerAssignmentTab';
import CashFlowManager from '@/components/cashflow/CashFlowManager';
import GoalsTimeline from '@/components/goals/GoalsTimeline';
import GoalsTimelineNew from '@/components/goals/timeline/GoalsTimelineNew';
import OrganizationChartBuilder from '@/components/organization/OrganizationChartBuilder';

const tabs = [
  { id: 'files', label: 'קבצים', icon: FolderOpen },
  { id: 'recommendations', label: 'המלצות', icon: Lightbulb },
  { id: 'catalog', label: 'קטלוג', icon: Package },
  { id: 'forecast', label: 'תוכנית עסקית', icon: FileText },
  { id: 'goals', label: 'יעדים', icon: Target },
  { id: 'suppliers', label: 'ספקים', icon: Truck },
  { id: 'website', label: 'סריקת אתר', icon: Globe },
  { id: 'cashflow', label: 'תזרים כספים', icon: DollarSign },
  { id: 'org_chart', label: 'עץ ארגוני', icon: Building2 }
];

export default function WorkboardPanel({ 
  customer, 
  activeTab, 
  onTabChange,
  recommendations = [],
  isLoadingRecommendations = false,
  onViewRecommendation,
  onEditRecommendation,
  onUpgradeRecommendation,
  onDeleteRecommendation,
  onArchiveRecommendation,
  onSendRecommendation,
  isAdmin = false,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  sourceFilter,
  setSourceFilter,
  onCreateSystemRec,
  onCreateTargeted,
  onCreateGoalOriented,
  onCreateManual,
  isGenerating,
  currentUser
}) {
  const [goalsView, setGoalsView] = React.useState('table');
  if (!customer) {
    return (
      <div className="flex-1 flex items-center justify-center bg-horizon-dark">
        <div className="text-center text-horizon-accent">
          <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">בחר לקוח מהרשימה</p>
        </div>
      </div>
    );
  }

  // כל הטאבים זמינים לכולם
  const visibleTabs = tabs;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-horizon-dark">
      {/* Customer Header */}
      <div className="bg-horizon-card border-b border-horizon px-6 py-4" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <h2 className="text-xl font-bold text-horizon-text">
              {customer.business_name || 'ללא שם עסק'}
            </h2>
            <p className="text-sm text-horizon-accent">
              {customer.full_name} • {customer.email}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-horizon-card border-b border-horizon px-4 py-2" dir="rtl">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-horizon-primary text-white' 
                    : 'text-horizon-accent hover:text-horizon-text hover:bg-horizon-dark'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4" dir="rtl">
        {activeTab === 'files' && (
          <CustomerFileUploadManager customer={customer} />
        )}
        
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <CreateRecommendationButtons
              onCreateSystemRecommendations={onCreateSystemRec}
              onCreateTargeted={onCreateTargeted}
              onCreateGoalOriented={onCreateGoalOriented}
              onCreateManual={onCreateManual}
              isGenerating={isGenerating}
            />

            <RecommendationFilters
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              sourceFilter={sourceFilter}
              setSourceFilter={setSourceFilter}
            />

            <StrategicRecommendations 
              recommendations={recommendations}
              isLoading={isLoadingRecommendations}
              onView={onViewRecommendation}
              onEdit={onEditRecommendation}
              onUpgrade={onUpgradeRecommendation}
              onDelete={onDeleteRecommendation}
              onArchive={onArchiveRecommendation}
              onSendToCustomer={onSendRecommendation}
              isAdmin={isAdmin}
            />
          </div>
        )}
        
        {activeTab === 'catalog' && (
          <ProductCatalogManager customer={customer} isAdmin={true} />
        )}
        
        {activeTab === 'forecast' && (
          <UnifiedForecastManager customer={customer} />
        )}
        
        {activeTab === 'goals' && (
          <>
            <div className="flex gap-2 mb-4">
              <Button
                variant={goalsView === 'table' ? 'default' : 'outline'}
                onClick={() => setGoalsView('table')}
                className={goalsView === 'table' ? 'bg-horizon-primary text-white' : ''}
              >
                תצוגת טבלה
              </Button>
              <Button
                variant={goalsView === 'timeline' ? 'default' : 'outline'}
                onClick={() => setGoalsView('timeline')}
                className={goalsView === 'timeline' ? 'bg-horizon-primary text-white' : ''}
              >
                ציר זמן
              </Button>
            </div>
            
            {goalsView === 'table' ? (
              <CustomerGoalsGantt customer={customer} />
            ) : (
              <ReactFlowProvider>
                <GoalsTimelineNew customer={customer} />
              </ReactFlowProvider>
            )}
          </>
        )}
        
        {activeTab === 'suppliers' && (
          <CustomerSuppliersTab customer={customer} />
        )}
        
        {activeTab === 'website' && (
          <WebsiteScanner customer={customer} />
        )}
        
        {activeTab === 'cashflow' && (
          <CashFlowManager customer={customer} />
        )}
        
        {activeTab === 'org_chart' && (
          <OrganizationChartBuilder customer={customer} />
        )}
      </div>
    </div>
  );
}