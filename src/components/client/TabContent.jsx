import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReactFlowProvider } from "reactflow";

// ייבוא קומפוננטות קיימות — כל tab טוען component אחר
import CustomerFileUploadManager from "@/components/admin/CustomerFileUploadManager";
import StrategicRecommendations from "@/components/admin/StrategicRecommendations";
import ProductCatalogManager from "@/components/catalog/ProductCatalogManager";
import UnifiedForecastManager from "@/components/forecast/UnifiedForecastManager";
import CustomerGoalsGantt from "@/components/admin/CustomerGoalsGantt";
import CustomerSuppliersTab from "@/components/admin/CustomerSuppliersTab";
import WebsiteScanner from "@/components/admin/WebsiteScanner";
import CreateRecommendationButtons from "@/components/admin/CreateRecommendationButtons";
import RecommendationFilters from "@/components/admin/RecommendationFilters";
import CashFlowManager from "@/components/cashflow/CashFlowManager";
import GoalsTimelineNew from "@/components/goals/timeline/GoalsTimelineNew";
import OrganizationChartBuilder from "@/components/organization/OrganizationChartBuilder";
import SystemCredentialsManager from "@/components/admin/SystemCredentialsManager";
import MeetingsTab from "@/components/meetings/MeetingsTab";

/**
 * TabContent — מרנדר את התוכן של ה-tab הנבחר.
 * מקבל את כל ה-props הנדרשים ומעביר לקומפוננטה הרלוונטית.
 */
export default function TabContent({
  tab,
  customer,
  // recommendation props
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
  currentUser,
}) {
  const [goalsView, setGoalsView] = useState("table");

  if (tab === "files") {
    return (
      <div className="space-y-6">
        <CustomerFileUploadManager customer={customer} />
        <WebsiteScanner customer={customer} />
        <SystemCredentialsManager customer={customer} />
      </div>
    );
  }

  if (tab === "recommendations") {
    return (
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
    );
  }

  if (tab === "catalog") {
    return <ProductCatalogManager customer={customer} isAdmin={true} />;
  }

  if (tab === "forecast") {
    return <UnifiedForecastManager customer={customer} />;
  }

  if (tab === "goals") {
    return (
      <>
        <div className="flex gap-2 mb-4">
          <Button
            variant={goalsView === "table" ? "default" : "outline"}
            onClick={() => setGoalsView("table")}
            className={goalsView === "table" ? "bg-horizon-primary text-white" : ""}
          >
            תצוגת טבלה
          </Button>
          <Button
            variant={goalsView === "timeline" ? "default" : "outline"}
            onClick={() => setGoalsView("timeline")}
            className={goalsView === "timeline" ? "bg-horizon-primary text-white" : ""}
          >
            ציר זמן
          </Button>
        </div>
        {goalsView === "table" ? (
          <CustomerGoalsGantt customer={customer} />
        ) : (
          <ReactFlowProvider>
            <GoalsTimelineNew customer={customer} />
          </ReactFlowProvider>
        )}
      </>
    );
  }

  if (tab === "suppliers") {
    return <CustomerSuppliersTab customer={customer} />;
  }

  if (tab === "cashflow") {
    return <CashFlowManager customer={customer} />;
  }

  if (tab === "org_chart") {
    return <OrganizationChartBuilder customer={customer} />;
  }

  if (tab === "meetings") {
    return <MeetingsTab customer={customer} currentUser={currentUser} />;
  }

  return null;
}
