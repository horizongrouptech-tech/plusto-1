import React from 'react';
import { Building2 } from 'lucide-react';
import ClientHeader from '@/components/client/ClientHeader';
import ClientTabs from '@/components/client/ClientTabs';
import TabContent from '@/components/client/TabContent';

/**
 * WorkboardPanel — אזור העבודה המרכזי בדף Clients.
 * מורכב מ: ClientHeader + ClientTabs + TabContent.
 * כל הלוגיקה חולצה לקומפוננטות נפרדות ב-src/components/client/.
 */
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-horizon-dark">
      <ClientHeader customer={customer} />
      <ClientTabs activeTab={activeTab} onTabChange={onTabChange} />

      {/* Tab Content */}
      <div className="flex-1 overflow-auto py-4 px-4 lg:px-10 xl:px-20 min-w-0" dir="rtl">
        <TabContent
          tab={activeTab}
          customer={customer}
          recommendations={recommendations}
          isLoadingRecommendations={isLoadingRecommendations}
          onViewRecommendation={onViewRecommendation}
          onEditRecommendation={onEditRecommendation}
          onUpgradeRecommendation={onUpgradeRecommendation}
          onDeleteRecommendation={onDeleteRecommendation}
          onArchiveRecommendation={onArchiveRecommendation}
          onSendRecommendation={onSendRecommendation}
          isAdmin={isAdmin}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          onCreateSystemRec={onCreateSystemRec}
          onCreateTargeted={onCreateTargeted}
          onCreateGoalOriented={onCreateGoalOriented}
          onCreateManual={onCreateManual}
          isGenerating={isGenerating}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
