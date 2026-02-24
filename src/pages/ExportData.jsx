import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, CheckCircle2, XCircle, Database, AlertTriangle } from "lucide-react";

const ALL_ENTITIES = [
  "User",
  "Supplier",
  "Product",
  "Recommendation",
  "FileUpload",
  "SupplierQuote",
  "CustomerAction",
  "DashboardStats",
  "BusinessMove",
  "CustomerNotification",
  "SupportTicket",
  "Sale",
  "Promotion",
  "ExperientialProduct",
  "UserActivity",
  "RecommendationRating",
  "ProductCatalog",
  "WebsiteScanResult",
  "RecommendationFeedback",
  "UserEngagement",
  "BusinessForecast",
  "StrategicMove",
  "Catalog",
  "FinancialReport",
  "OnboardingRequest",
  "ProcessStatus",
  "StrategicPlanInput",
  "CustomerContact",
  "Lead",
  "FinancialManagerPerformance",
  "CommunicationThread",
  "ChatMessage",
  "Notification",
  "FileCategory",
  "TempUpload",
  "RecommendationSuggestion",
  "ManagerConversation",
  "ManagerMessage",
  "PurchaseRecord",
  "LeadCommission",
  "CustomerGoal",
  "GoalComment",
  "ManualForecast",
  "ManualForecastSheet",
  "ManualForecastRow",
  "ManualForecastMappingProfile",
  "ManualForecastVersion",
  "AgentSupportTicket",
  "Ofek360Model",
  "BackupLog",
  "ProjectForecast",
  "CatalogMappingProfile",
  "Department",
  "CashFlow",
  "RecurringExpense",
  "OrganizationChart",
  "GoalTemplate",
  "ServiceContact",
  "ZReportDetails",
  "UnknownFileQueue",
  "Meeting",
  "DailyChecklist360",
  "SystemCredential"
];

export default function ExportData() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({});
  const [exportDone, setExportDone] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <Card className="card-horizon p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-horizon-text mb-2">אין גישה</h2>
          <p className="text-horizon-accent">עמוד זה זמין למנהלי מערכת בלבד.</p>
        </Card>
      </div>
    );
  }

  const fetchAllRecords = async (entityName) => {
    const allRecords = [];
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const batch = await base44.entities[entityName].list("-created_date", pageSize, allRecords.length);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        allRecords.push(...batch);
        if (batch.length < pageSize) {
          hasMore = false;
        }
      }
    }

    return allRecords;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportDone(false);
    const exportData = {};
    const newProgress = {};

    for (const entityName of ALL_ENTITIES) {
      try {
        newProgress[entityName] = "loading";
        setProgress({ ...newProgress });

        const records = await fetchAllRecords(entityName);
        exportData[entityName] = records;

        newProgress[entityName] = { status: "done", count: records.length };
        setProgress({ ...newProgress });
      } catch (err) {
        console.warn(`Failed to export ${entityName}:`, err.message);
        newProgress[entityName] = { status: "error", error: err.message };
        setProgress({ ...newProgress });
      }
    }

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `app_export_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();

    setIsExporting(false);
    setExportDone(true);
  };

  const totalDone = Object.values(progress).filter(p => p?.status === "done").length;
  const totalErrors = Object.values(progress).filter(p => p?.status === "error").length;
  const totalRecords = Object.values(progress)
    .filter(p => p?.status === "done")
    .reduce((sum, p) => sum + p.count, 0);

  return (
    <div dir="rtl" className="p-6 max-w-4xl mx-auto">
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Database className="w-7 h-7 text-horizon-primary" />
            ייצוא כל נתוני המערכת
          </CardTitle>
          <p className="text-horizon-accent text-sm mt-1">
            ייצוא כל הנתונים מכל הישויות במערכת לקובץ JSON (עם סיומת .txt) לצורך ייבוא למערכת משוכפלת.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-horizon-primary gap-2 text-base px-6 py-3"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>מייצא נתונים...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>התחל ייצוא</span>
                </>
              )}
            </Button>

            {(isExporting || exportDone) && (
              <div className="flex gap-3 text-sm">
                <Badge className="bg-green-100 text-green-800">{totalDone} ישויות הושלמו</Badge>
                {totalErrors > 0 && <Badge className="bg-red-100 text-red-800">{totalErrors} שגיאות</Badge>}
                <Badge className="bg-blue-100 text-blue-800">{totalRecords.toLocaleString()} רשומות</Badge>
              </div>
            )}
          </div>

          {Object.keys(progress).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto">
              {ALL_ENTITIES.map((name) => {
                const p = progress[name];
                if (!p) return null;

                return (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-horizon bg-horizon-card text-sm"
                  >
                    <span className="font-medium text-horizon-text truncate">{name}</span>
                    {p === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-horizon-primary flex-shrink-0" />
                    ) : p.status === "done" ? (
                      <span className="flex items-center gap-1 text-green-600 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        {p.count}
                      </span>
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}