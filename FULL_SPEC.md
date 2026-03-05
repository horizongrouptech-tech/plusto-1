# Plusto CRM — מפרט טכני מלא + תכנית ביצוע

## Context

**מה זה:** CRM לניהול עסקי. מנהלי כספים (FM) מנהלים לקוחות עסקיים.
**Stack:** Vite + React 18 + React Router v6 + Supabase (Postgres+Auth) + shadcn/ui + Tailwind + TanStack Query v5 + Vercel API Routes
**מצב נוכחי:** ~380 קבצים, ~117K שורות. 30+ קישורי ניווט, ~50% פיצ'רים מתים, קומפוננטות ענקיות (Admin=4,448, Layout=1,045, BusinessForecastManager=3,123).
**גישה:** ניקוי → שכתוב מודולרי → שיפורים פונקציונליים.

---

# חלק א׳: מצב נוכחי — מיפוי כל קובץ

## A. Pages (28 קבצים ב-`src/pages/`)

| # | קובץ | שורות | סטטוס | גורל |
|---|-------|-------|-------|------|
| 1 | `Admin.jsx` | 4,448 | פעיל — דף הבית של FM/Admin | **פירוק** → Dashboard + Reports + UserManagement |
| 2 | `Dashboard.jsx` | 104 | פעיל — סטטיסטיקות בסיסיות | **שכתוב** → דשבורד חדש |
| 3 | `Welcome.jsx` | 216 | פעיל — דף login | **שיפור** → Google Auth בלבד |
| 4 | `CustomerManagementNew.jsx` | 552 | פעיל — 3-panel client view | **שיפור** → URL-driven tabs + header |
| 5 | `CustomerManagement.jsx` | 773 | legacy — גרסה ישנה | **מחיקה** |
| 6 | `InitialSetup.jsx` | 335 | פעיל — onboarding | **נשאר** |
| 7 | `PendingApproval.jsx` | 208 | פעיל — FM ממתין לאישור | **נשאר** |
| 8 | `TaskManagement.jsx` | 633 | פעיל — ניהול משימות | **שכתוב** → Tasks page חדש |
| 9 | `Recommendations.jsx` | 727 | פעיל — המלצות | **מחיקה** (עובר ל-tab AI chat) |
| 10 | `BusinessForecast.jsx` | 30 | wrapper בלבד | **נשאר** (wrapper) |
| 11 | `SupplierAnalysis.jsx` | 818 | פעיל — ניתוח ספקים | **מחיקה** (עובר ל-tab) |
| 12 | `FinancialFlow.jsx` | 362 | "Coming Soon" | **מחיקה** |
| 13 | `StrategicMoves.jsx` | 303 | פעיל — מהלכים אסטרטגיים | **מחיקה** |
| 14 | `ActionBank.jsx` | 197 | פעיל — בנק פעולות | **מחיקה** |
| 15 | `LeadIntakeManagement.jsx` | 429 | פעיל — ניהול לידים | **מחיקה** |
| 16 | `WhatsAppTest.jsx` | 299 | dev — בדיקות | **מחיקה** |
| 17 | `Home.jsx` | 9 | redirect בלבד | **מחיקה** |
| 18 | `ManageProducts.jsx` | 252 | פעיל — ניהול מוצרים | **מחיקה** (עובר ל-tab catalog) |
| 19 | `AddProduct.jsx` | 401 | פעיל — הוספת מוצר | **מחיקה** (עובר ל-tab catalog) |
| 20 | `CatalogPage.jsx` | 19 | wrapper | **מחיקה** |
| 21 | `ProductCatalog.jsx` | 61 | wrapper | **מחיקה** |
| 22 | `ExportData.jsx` | 237 | פעיל — ייצוא נתונים | **עובר** → Reports tab |
| 23 | `FileUpload.jsx` | 53 | wrapper | **מחיקה** (יש ב-client profile) |
| 24 | `WebsiteScan.jsx` | 66 | פעיל | **מחיקה** |
| 25 | `Promotions.jsx` | 293 | פעיל — מבצעים | **מחיקה** |
| 26 | `MyLeads.jsx` | 286 | פעיל — ממשק ספקים | **נשאר** (user_type=supplier) |
| 27 | `SupportTicket.jsx` | 273 | פעיל | **נשאר** (עובר ל-Settings) |
| 28 | `Contact.jsx` / `FAQ.jsx` | 220 | פעיל | **נשאר** (עובר ל-Settings) |

**סיכום:** 28 דפים → **7 דפים** (Dashboard, Clients, Tasks, Calendar, Reports, Settings, Welcome) + 3 מערכתיים (InitialSetup, PendingApproval, MyLeads)

---

## B. Components — מיפוי מלא (269 קבצים)

### B.1 Admin Components (`src/components/admin/` — 76 קבצים)

**נשארים (Reuse):**
| קובץ | שורות | שימוש חדש |
|-------|-------|-----------|
| `CustomerFileUploadManager.jsx` | ~400 | tab Files ב-Client Profile |
| `CustomerSuppliersTab.jsx` | 762 | tab Suppliers — ללא שינוי |
| `CustomerGoalsGantt.jsx` | 329 | tab Goals — ללא שינוי |
| `InlineEditableCustomerDetails.jsx` | ~200 | Client Overview |
| `EditCustomerModal.jsx` | ~300 | Client Settings |
| `DataCompletenessGauge.jsx` | ~150 | Client Header health score |
| `DataCompletenessIndicator.jsx` | ~100 | Client Header |
| `ManagerAssignmentBoard.jsx` | ~350 | דף FM Assignments נפרד |
| `ManagerAssignmentModal.jsx` | ~250 | דף FM Assignments |
| `OnboardingRequestsModal.jsx` | ~300 | User Management tab |
| `CreateOnboardingRequestForm.jsx` | ~250 | User Management tab |
| `FinanceManagerPerformanceTable.jsx` | ~400 | Reports → Performance tab |
| `FinanceManagerLeaderboard.jsx` | ~300 | Reports → Performance tab |
| `FailedFileUploadsManager.jsx` | ~250 | Reports → Failed Uploads tab |
| `DefaultTasksManager.jsx` | ~200 | Settings |

**נמחקים:**
| קובץ | סיבה |
|-------|-------|
| `ClientManagementDashboard.jsx` | מוחלף ע"י CustomerManagementNew + Dashboard חדש |
| `RecommendationCard.jsx` | מוחלף ע"י AI chat |
| `RecommendationDisplayCard.jsx` | מוחלף ע"י AI chat |
| `RecommendationEditModal.jsx` | מוחלף ע"י AI chat |
| `RecommendationViewModal.jsx` | מוחלף ע"י AI chat |
| `RecommendationFilters.jsx` | מוחלף ע"י AI chat sidebar |
| `RecommendationSuggestionSystem.jsx` | מוחלף ע"י AI chat |
| `ManualRecommendationModal.jsx` | מוחלף |
| `GeneralRecommendationModal.jsx` | מוחלף |
| `GoalOrientedRecommendationModal.jsx` | מוחלף |
| `TargetedRecommendationModal.jsx` | מוחלף |
| `EnhancedRecommendationOptionsModal.jsx` | מוחלף |
| `RecommendationUpgradeModal.jsx` | מוחלף |
| `RecommendationUpgradePromptModal.jsx` | מוחלף |
| `ArchivedRecommendationsModal.jsx` | מוחלף |
| `IrrelevantRecommendationsModal.jsx` | מוחלף |
| `SystemRecommendationsModal.jsx` | מוחלף |
| `CreateRecommendationButtons.jsx` | מוחלף |
| `StrategicRecommendations.jsx` | מוחלף |
| `SupplierRecommendationEngine.jsx` | מוחלף |
| `AIChatAssistant.jsx` | ישן — מוחלף ע"י AI chat חדש |
| `FloatingAgentChat.jsx` | ישן |
| `Ofek360Modal.jsx` | מוחלף |
| `DailyOfek360Checklist.jsx` | מוחלף |
| `DailyChecklistButton.jsx` | מוחלף |
| `GoalBankManager.jsx` | מוחלף |
| `GoalTemplateManager.jsx` | עובר ל-Settings |
| `ClientActivityStatusEditor.jsx` | מוחלף ע"י Client Header |
| `WebsiteScanner.jsx` | נמחק |
| `ScanInsightsDisplay.jsx` | נמחק |
| `ScanProductTable.jsx` | נמחק |
| `AgentSupportTicketsManager.jsx` | נמחק |
| `UnknownFileQueueManager.jsx` | נמחק |
| `AdminRatingWidget.jsx` | נמחק |
| `CustomerInitiatedRecommendationsModal.jsx` | מוחלף |
| `SupplierDetailsModal.jsx` | עובר ל-tab Suppliers |
| `SupplierPreviewModal.jsx` | עובר ל-tab Suppliers |
| `SupplierPartnershipManager.jsx` | עובר ל-tab Suppliers |
| `SupplierPaymentsManager.jsx` | עובר ל-tab Suppliers |
| `LeadCard.jsx` | נמחק |
| `LeadDetailModal.jsx` | נמחק |
| `BusinessMoveDetailsModal.jsx` | נמחק |
| `FindAlternativeSupplierModal.jsx` | נמחק |
| `MissingDocumentsModal.jsx` | נמחק |
| `DataGapsModal.jsx` | נמחק |

### B.2 Dashboard Components (`src/components/dashboard/` — 13 קבצים)

| קובץ | שורות | גורל |
|-------|-------|------|
| `DailyTasksDashboard.jsx` | ~600 | **Reuse** → Dashboard + Tasks page |
| `DailyTasks.jsx` | ~200 | **Reuse** |
| `TaskCard.jsx` (kanban/) | ~150 | **Reuse** |
| `KanbanColumn.jsx` (kanban/) | ~200 | **Reuse** |
| `CompletedTasksModal.jsx` (kanban/) | ~150 | **מחיקה** (הסרת "משימות שהושלמו") |
| `ClientList.jsx` | ~250 | **Reuse** → Dashboard toggle |
| `StatsCards.jsx` | ~150 | **שכתוב** → KPI cards חדשים |
| `TaskCreationModal.jsx` | ~300 | **Reuse** |
| `RecentActivity.jsx` | ~150 | **מחיקה** |
| `WelcomeSection.jsx` | ~100 | **מחיקה** |
| `QuickActions.jsx` | ~100 | **מחיקה** |
| `OnboardingFlow.jsx` | ~200 | **נשאר** |
| `OnboardingStatusTracker.jsx` | ~150 | **נשאר** |

### B.3 Forecast Components (`src/components/forecast/` — 39 קבצים)

**Main (20 קבצים):**
| קובץ | שורות | גורל |
|-------|-------|------|
| `UnifiedForecastManager.jsx` | 550 | **שיפור** — חיבור כלים מנותקים |
| `BusinessForecastManager.jsx` | 3,123 | **פירוק** → 8 sub-components |
| `ManualForecastManager.jsx` | ~400 | **נשאר** |
| `ProjectForecastManager.jsx` | ~350 | **נשאר** |
| `ProjectForecastWizard.jsx` | ~400 | **נשאר** ללא שינוי |
| `ForecastTypeSelectionModal.jsx` | ~200 | **שיפור** — חיבור ForecastTemplateSelector |
| `ForecastTemplateSelector.jsx` | 282 | **חיבור** → ForecastTypeSelectionModal |
| `ForecastComparisonModal.jsx` | 374 | **חיבור** → כפתור ב-Unified |
| `ForecastAnalytics.jsx` | 287 | **חיבור** → Step5 + Unified |
| `ForecastCharts.jsx` | ~300 | **נשאר** |
| `ForecastExporter.jsx` | ~250 | **נשאר** |
| `EditableForecastGrid.jsx` | ~400 | **נשאר** |
| `DuplicateForecastModal.jsx` | ~200 | **נשאר** |
| `ManualDataEntry.jsx` | ~300 | **נשאר** |
| `ColumnMappingWizard.jsx` | ~250 | **נשאר** |
| `UploaderArea.jsx` | ~150 | **נשאר** |
| `VersionHistoryViewer.jsx` | ~200 | **נשאר** |
| `ProcessStatusDisplay.jsx` | ~100 | **נשאר** |
| `PeriodRangePicker.jsx` | ~150 | **נשאר** |
| `StrategicPlanInputForm.jsx` | ~300 | **נשאר** |

**Manual Wizard (19 קבצים ב-`forecast/manual/`):**
| קובץ | שורות | גורל |
|-------|-------|------|
| `ManualForecastWizard.jsx` | 775 | **שיפור** — Single Source of Truth, auto-save |
| `Step1ServicesAndCosts.jsx` | 1,296 | **שכתוב UI** — cards → table |
| `Step2SalaryCosts.jsx` | 1,107 | **הסרת** hourly employee (~300 שורות) |
| `Step3SalesForecast.jsx` | 1,340 | **ללא שינוי** |
| `Step4Expenses.jsx` | 816 | **ללא שינוי** |
| `Step5ProfitLoss.jsx` | 754 | **שינוי מינורי** — toggle plan/actual |
| `ZReportUploader.jsx` | ~300 | **נשאר** |
| `ZReportEditor.jsx` | ~250 | **נשאר** |
| `ZReportProductMapper.jsx` | ~200 | **נשאר** |
| `ZReportMonthSummary.jsx` | ~150 | **נשאר** |
| `FutureRevenueUploader.jsx` | ~200 | **נשאר** |
| `ServiceCategoryGroup.jsx` | ~150 | **מחיקה** (card UI → table) |
| `PeriodSelector.jsx` | ~100 | **נשאר** |
| `LoanManagerSection.jsx` | ~200 | **נשאר** |
| `LoanAmortizationManager.jsx` | ~250 | **נשאר** |
| `AggregatePlanning.jsx` | ~150 | **נשאר** |
| `ForecastSensitivityAnalysis.jsx` | 231 | **חיבור** → section ב-Step5 |
| `TopProductsInsights.jsx` | ~150 | **נשאר** |
| `SaveProgressIndicator.jsx` | ~80 | **נשאר** |

**Utils (4 קבצים ב-`forecast/manual/`):** `numberFormatter`, `periodCalculations`, `taxCalculator`, `utils` — **נשארים**

**Project (5 קבצים ב-`forecast/project/`):** Step1-5 — **נשארים ללא שינוי**

### B.4 Cash Flow Components (`src/components/cashflow/` — 5 קבצים)

| קובץ | שורות | גורל |
|-------|-------|------|
| `CashFlowManager.jsx` | 1,239 | **שיפור** — הצגת תנועות עתידיות + ניהול קטגוריות |
| `RecurringTransactionsTab.jsx` | 496 | **שיפור** — תדירות דו-חודשי + חיבור ל-daily |
| `RecurringExpensesTable.jsx` | 1,092 | **שינוי שם** → "סיכום הוצאות" + שיוך plan/actual |
| `CreditCardsTab.jsx` | 351 | **שיפור** — ניתוח ספקים/קטגוריות + Excel |
| `FailedRowsEditor.jsx` | 331 | **נשאר** |

### B.5 Catalog Components (`src/components/catalog/` — 14 קבצים)

| קובץ | שורות | גורל |
|-------|-------|------|
| `ProductCatalogManager.jsx` | ~500 | **שיפור** — edit name + bulk delete |
| `ProductCatalogTable.jsx` | ~350 | **נשאר** |
| `ProductCatalogUpload.jsx` | ~300 | **נשאר** |
| `ProductCatalogAutoGenerator.jsx` | ~250 | **נשאר** |
| `ProductAddForm.jsx` | ~200 | **נשאר** |
| `ProductEditModal.jsx` | ~200 | **נשאר** |
| `ManualProductManagement.jsx` | ~200 | **נשאר** |
| `CatalogCreationFormModal.jsx` | ~200 | **נשאר** |
| `CatalogDeletionModal.jsx` | ~150 | **נשאר** |
| `CatalogUploadProgressCard.jsx` | ~100 | **נשאר** |
| `CatalogProgressTracker.jsx` | ~100 | **נשאר** |
| `CatalogGenerationProgressBar.jsx` | ~80 | **נשאר** |
| `ColumnMappingWizard.jsx` | ~250 | **נשאר** |
| `exportCatalog.jsx` | ~150 | **נשאר** |

### B.6 Other Component Directories

**Charts (`charts/` — 3):** NivoBarChart, NivoLineChart, NivoPieChart — **נשארים**

**Meetings (`meetings/` — 7):** MeetingsTab (1,315), MeetingPreparation, MeetingSummaryForm, MeetingSummaryViewer, MeetingTranscriptionSystem, ProductCatalogSection, SystemCredentialsForm — **נשארים**

**Goals (`goals/` — 7):** GoalsTimeline, GoalTemplateBadges, GoalTemplatePreview, GoalsTimelineNew, EnhancedGoalNode, LayoutEngine, TimelineToolbar — **נשארים**

**Upload (`upload/` — 8):** UnifiedFileUploader, SmartFileUploader, EnhancedFileUpload, UniversalFileProcessor, ColumnMappingModal, DataPreview, DocumentAnalysisViewer, DynamicFileDisplay — **נשארים**

**Shared (`shared/` — 47):**
- **נשארים:** ThemeContext, UsersContext, CreateTaskModal, UnifiedTaskModal, LoadingScreen, Pagination, MentionInput, ChatBox, NotificationCenter, FloatingNotificationCenter, TopBarActions, FileDataViewer, PrintableForecastReport, PrintableGoalsReport, generateForecastHTML, generateGoalsHTML, printUtils, svgChartGenerator, AddSupplierModal, EditSupplierModal
- **נמחקים:** RecommendationCard, RecommendationFeedbackWidget, RecommendationRating, StrategicMoveCard, BusinessMoveCard, DeeperInsightsModal, EmergencyChat, ManagerChatSystem, FeedbackAnalytics, ReportInsights, WhatsAppTestSender, SupplierQuoteRequestModal
- **Report Viewers (13 קבצים):** כולם **נשארים** (FinancialReportViewer, ProfitLossViewer, BalanceSheetViewer, BankStatementViewer, CreditCardStatementViewer, CreditCardReportViewer, CreditReportViewer, TaxAssessmentViewer, InventoryReportViewer, SalesReportViewer, PromotionsReportViewer, ESNAReportViewer, GenericReportViewer)

**Logic (`logic/` — 14):**
- **נמחקים:** recommendationEngine, enhancedRecommendationEngine, generalRecommendationEngine, unifiedRecommendationOrchestrator, strategicMovesEngine, targetedRecommendationEngine, inventoryBasedRecommendationEngine (7 קבצים — מוחלפים ע"י AI chat)
- **נשארים:** businessIntelligenceEngine, catalogManagement, userEngagementTracker, activityTracker, reportAnalysisEngine, websiteScraper, advancedWebsiteScraper

**Trial (`trial/` — 10):** WorkboardPanel, CustomerListPanel, TasksPanel, CustomerOverviewModal, CustomerSettingsDrawer, TaskBoardByCustomer, TaskDetailsModal, GoalTemplateSelector, GoalDependenciesSelector, ManagerAssignmentTab — **Reuse** ב-Client Profile החדש

**UI (`ui/` — 49):** כל shadcn/ui components — **נשארים ללא שינוי**

**Mobile (`mobile/` — 1):** MobileDashboard — **שכתוב** ב-Phase 12

**Analytics (`analytics/` — 8):** CatalogAnalyticsDashboard, productAnalyticsEngine, PopularityAnalysis, ProfitabilityAnalysis, TrendsAnalysis, InventoryRecommendationsWidget, ProductSelector, NoZReportsPlaceholder — **נשארים**

**Organization (`organization/` — 2):** OrganizationChartBuilder, EnhancedOrgNode — **נשארים**

**Leads (`leads/` — 1):** LeadManagementSystem — **נמחק**

---

## C. API Layer

### C.1 Client API (`src/api/`)
| קובץ | שורות | גורל |
|-------|-------|------|
| `entities.js` | 250 | **נשאר** — entity CRUD factory |
| `functions.js` | 161 | **שיפור** — תיקון שמות (cash_flow_entry→cash_flow) |
| `integrations.js` | 123 | **נשאר** |
| `agents.js` | 82 | **שכתוב** → OpenRouter direct |
| `supabaseClient.js` | 24 | **נשאר** |
| `openRouterClient.js` | 13 | **שיפור** → SSE streaming support |

### C.2 Backend API Handlers (`api/_handlers/` — 89 handlers)
**נשארים ללא שינוי** חוץ מ:
- `deleteCashFlowPermanently.js` — תיקון `cash_flow_entry` → `cash_flow`
- `exportCashFlowToExcel.js` — תיקון `cash_flow_entry` → `cash_flow`
- **חדש:** `streamAIChat.js` — SSE endpoint לעוזר AI

### C.3 Core Files
| קובץ | שורות | גורל |
|-------|-------|------|
| `App.jsx` | 86 | **שכתוב** — routing חדש (7 routes) |
| `Layout.jsx` | 1,045 | **פירוק** → AppLayout + Sidebar + TopBar |
| `pages.config.js` | 118 | **שכתוב** — 7 דפים חדשים |
| CSS files | ~500 | **ניקוי** — חילוץ ל-Tailwind |

---

## D. Database Schema (60 טבלאות ב-`scripts/all-tables.sql`)

**טבלאות שמשתנות:**
| טבלה | שינוי |
|-------|-------|
| `profiles` | + `role` (enum: super_admin, admin, department_manager, financial_manager, client) |
| `cash_flow` | + `is_credit_card`, `is_recurring`, `is_expected`, `file_upload_id`, `category` |
| `recurring_expense` | + `frequency` (enum: monthly, bi_monthly, quarterly, yearly) |

**טבלאות חדשות:**
| טבלה | שדות | מטרה |
|-------|-------|------|
| `ai_conversations` | id, fm_email, customer_email, messages (JSONB), created_at, updated_at | היסטוריית AI chat |
| `cash_flow_categories` | id, customer_email, name, created_at | קטגוריות תזרים |
| `pending_approvals` | id, user_id, requested_role, status, reviewed_by, created_at | אישור משתמשים חדשים |
| `department_assignments` | id, user_id, department_id, role, created_at | שיוך למחלקות |
| `client_assignments` | id, client_email, fm_email, is_primary, created_at | שיוך FM ללקוחות |

---

# חלק ב׳: מערכת חדשה — מפרט כל רכיב

## 1. ניווט חדש — 6 פריטים

### מצב נוכחי
`Layout.jsx` שורות 68-205: מערך `navigationItems` עם 26 פריטים + 3 footer items.
כל פריט: `{ name, icon, path, badge?, comingSoon? }`

### מצב חדש
```
navigationItems = [
  { name: 'דשבורד', icon: LayoutDashboard, path: '/Dashboard' },
  { name: 'לקוחות', icon: Users, path: '/Clients' },
  { name: 'משימות', icon: CheckSquare, path: '/Tasks' },
  { name: 'לוח שנה', icon: Calendar, path: '/Calendar' },
  { name: 'דוחות', icon: BarChart3, path: '/Reports' },
  { name: 'הגדרות', icon: Settings, path: '/Settings' },
]
```

### תהליך ביצוע
1. עדכון `navigationItems` ב-Sidebar component חדש (6 פריטים)
2. עדכון `App.jsx` routing (7 routes + Welcome + InitialSetup + PendingApproval + MyLeads)
3. עדכון `pages.config.js` — הסרת דפים ישנים
4. מחיקת 19 קבצי pages ישנים

---

## 2. Layout — פירוק Layout.jsx (1,045 שורות)

### מצב נוכחי
קובץ אחד `Layout.jsx` שמכיל: ThemeProvider, UsersProvider, sidebar, header, navigation, mobile responsive, role routing, CSS variables.

### קבצים חדשים

#### `src/components/layout/AppLayout.jsx` (~200 שורות)
```
Props: { children }
State: sidebarCollapsed (boolean)
תפקיד: wrapper ראשי. ThemeProvider + UsersProvider + conditional rendering by role.
מבנה:
  <ThemeProvider>
    <UsersProvider>
      <div className="flex h-screen">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggle} />
        <main className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </main>
      </div>
    </UsersProvider>
  </ThemeProvider>
```

#### `src/components/layout/Sidebar.jsx` (~250 שורות)
```
Props: { collapsed, onToggle }
State: activeItem (from URL)
תפקיד: sidebar ימני (RTL) עם 6 navigation items.
מבנה:
  - Logo section (Plusto branding)
  - 6 navigation items with active indicator
  - User info section (avatar + name + role)
  - Collapse toggle
רוחב: 280px (expanded), 64px (collapsed)
Mobile: overlay + backdrop
```

#### `src/components/layout/TopBar.jsx` (~150 שורות)
```
Props: none (reads route from React Router)
תפקיד: header bar עם page title + actions.
מבנה:
  - Page title (dynamic from route)
  - Mobile menu toggle (hamburger)
  - Search (future)
  - Notifications dropdown (reuse FloatingNotificationCenter)
  - Theme toggle
  - User avatar dropdown (profile, logout)
Reuse: TopBarActions.jsx (119 שורות) — נשאר כ-sub-component
```

### תהליך ביצוע
1. יצירת `src/components/layout/` directory
2. כתיבת `AppLayout.jsx` — חילוץ wrapper logic מ-Layout.jsx
3. כתיבת `Sidebar.jsx` — חילוץ sidebar מ-Layout.jsx + צמצום ל-6 items
4. כתיבת `TopBar.jsx` — חילוץ header מ-Layout.jsx
5. עדכון `App.jsx` — החלפת `<Layout>` ב-`<AppLayout>`
6. חילוץ CSS variables ל-`globals.css` (הסרת inline styles מ-Layout.jsx)
7. בדיקה: כל ה-routes עובדים עם layout חדש

---

## 3. Dashboard חדש

### מצב נוכחי
`Dashboard.jsx` (104 שורות) — סטטיסטיקות בסיסיות.
`Admin.jsx` (4,448 שורות) — דף הבית בפועל של FM/Admin עם כל הפונקציונליות.

### מצב חדש — שתי תצוגות

#### `src/pages/Dashboard.jsx` (שכתוב — ~300 שורות)
```
State: activeView ('dashboard' | 'clients'), toggle
תפקיד: מרכז הפיקוד של FM
מבנה (תצוגת Dashboard):
  <ViewToggle active={activeView} onChange={setActiveView} />

  <KPICards>
    - לקוחות פעילים (count)
    - משימות פתוחות (count)
    - יעדים באיחור (count + badge)
    - פגישות היום (count)
  </KPICards>

  <DailyTasksDashboard />  // Reuse existing Kanban

מבנה (תצוגת לקוחות):
  <ViewToggle />
  <ClientList filter={customerFilter} />  // Reuse existing
```

#### קומפוננטות ב-Dashboard
| קומפוננטה | מקור | שינוי |
|-----------|------|-------|
| `DailyTasksDashboard.jsx` | קיים | **Reuse** — הסרת "בנק יעדים" + "משימות שהושלמו" |
| `TaskCard.jsx` | קיים | **Reuse** ללא שינוי |
| `KanbanColumn.jsx` | קיים | **Reuse** ללא שינוי |
| `ClientList.jsx` | קיים | **Reuse** — הסרת כפתור WhatsApp מכרטיסיה |
| `KPICards.jsx` | **חדש** | 4 כרטיסי KPI (נתונים מ-TanStack Query) |
| `ViewToggle.jsx` | **חדש** | toggle בין Dashboard/Clients |
| `CompletedTasksModal.jsx` | קיים | **מחיקה** |

### תהליך ביצוע
1. יצירת `KPICards.jsx` — 4 stats cards עם useQuery
2. יצירת `ViewToggle.jsx` — shadcn Tabs component
3. שכתוב `Dashboard.jsx` — toggle + KPI + Kanban/ClientList
4. הסרת "בנק יעדים" מ-DailyTasksDashboard.jsx
5. הסרת CompletedTasksModal.jsx
6. הסרת כפתור WhatsApp מ-ClientList.jsx cards

---

## 4. Client Profile (Clients Page)

### מצב נוכחי
`CustomerManagementNew.jsx` (552 שורות) — 3-panel layout עם:
- Left: CustomerListPanel (רשימת לקוחות)
- Center: WorkboardPanel (tabs: recommendations, tasks, goals)
- Right: TasksPanel (משימות)

URL state: `?customer=email` (כבר קיים!)
Tab state: `activeWorkboardTab` — local state בלבד, לא ב-URL

### מצב חדש

#### `src/pages/Clients.jsx` (שכתוב — ~400 שורות)
```
URL: /Clients?customer=email@example.com&tab=recommendations
State from URL: customer (email), tab (string)
State local: customerFilter ('all'|'A'|'B'), sidebarCollapsed

מבנה:
  <div className="flex h-full">
    <CustomerListPanel
      filter={customerFilter}
      selected={selectedCustomer}
      onSelect={handleSelectCustomer}
    />

    {selectedCustomer ? (
      <div className="flex-1">
        <ClientHeader customer={selectedCustomer} />
        <ClientTabs activeTab={tab} onTabChange={setTab}>
          <Tab id="recommendations" label="המלצות AI" />
          <Tab id="files" label="קבצים" />
          <Tab id="catalog" label="קטלוג" />
          <Tab id="forecast" label="תחזית" />
          <Tab id="goals" label="יעדים" />
          <Tab id="suppliers" label="ספקים" />
          <Tab id="cashflow" label="תזרים" />
          <Tab id="meetings" label="פגישות" />
        </ClientTabs>
        <TabContent tab={tab} customer={selectedCustomer} />
      </div>
    ) : (
      <EmptyState />
    )}

    <TasksPanel customer={selectedCustomer} />
  </div>
```

#### קומפוננטות חדשות

##### `src/components/client/ClientHeader.jsx` (~200 שורות)
```
Props: { customer }
מבנה:
  שם עסק | סוג עסק | Badge A/B | Health Score (DataCompletenessGauge)
  כפתורים: [WhatsApp] [+ פגישה] [+ משימה] [הגדרות]
```

##### `src/components/client/ClientTabs.jsx` (~80 שורות)
```
Props: { activeTab, onTabChange, children }
UI: shadcn Tabs component עם 8 tabs
Tab state persisted to URL: ?tab=recommendations
```

##### `src/components/client/TabContent.jsx` (~100 שורות)
```
Props: { tab, customer }
Switch/case שמרנדר את ה-component הנכון:
  'recommendations' → <AIRecommendationsChat customer={customer} />
  'files' → <CustomerFileUploadManager customer={customer} />
  'catalog' → <ProductCatalogManager customer={customer} />
  'forecast' → <UnifiedForecastManager customer={customer} />
  'goals' → <CustomerGoalsGantt customer={customer} />
  'suppliers' → <CustomerSuppliersTab customer={customer} />
  'cashflow' → <CashFlowManager customer={customer} />
  'meetings' → <MeetingsTab customer={customer} />
```

#### Tab: המלצות AI (שכתוב מלא)

##### `src/components/client/AIRecommendationsChat.jsx` (~500 שורות)
```
Props: { customer }
State:
  messages: Message[] (from DB + local)
  input: string
  isStreaming: boolean
  selectedRecommendation: Recommendation | null

מבנה:
  <div className="flex h-full">
    <ChatArea className="flex-1">
      <MessageList messages={messages} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onAttachFile={handleAttach}
        isStreaming={isStreaming}
      />
    </ChatArea>
    <RecommendationsSidebar
      customer={customer}
      onSelect={setSelectedRecommendation}
    />
  </div>

API Integration:
  - POST /api/streamAIChat → SSE streaming
  - OpenRouter API (direct, invokeLLM removed)
  - 8 tool calls for customer data:
    1. getCustomerProfile → customer details
    2. getCustomerGoals → active goals
    3. getCustomerProducts → catalog
    4. getCustomerFinancials → forecast data
    5. getCustomerFiles → uploaded files
    6. getCustomerSuppliers → supplier list
    7. getCustomerCashFlow → cash flow data
    8. getCustomerMeetings → meeting history

DB: ai_conversations table (fm_email, customer_email, messages JSONB)
```

##### `src/components/client/RecommendationsSidebar.jsx` (~200 שורות)
```
Props: { customer, onSelect }
Data: useQuery(['recommendations', customer.email])
מבנה:
  <div className="w-80 border-r">
    <FilterBar status={filter} onChange={setFilter} />
    <RecommendationList>
      {recommendations.map(rec => (
        <RecommendationItem
          key={rec.id}
          recommendation={rec}
          onClick={() => onSelect(rec)}
          actions={['convertToGoal', 'sendToClient', 'archive']}
        />
      ))}
    </RecommendationList>
  </div>
```

#### Tab: קבצים
**Reuse:** `CustomerFileUploadManager.jsx` (~400 שורות)
**שינוי:** הסרת באנר "העלאת מסמכים" (UI only)

#### Tab: קטלוג
**Reuse:** `ProductCatalogManager.jsx` (~500 שורות)
**שינויים:**
- הוספת כפתור "ערוך שם קטלוג" (inline edit)
- הוספת bulk delete (checkbox + delete selected)

#### Tab: תחזית — ראה סעיף 9

#### Tab: יעדים — **ללא שינוי** (`CustomerGoalsGantt.jsx` 329 שורות)

#### Tab: ספקים — **ללא שינוי** (`CustomerSuppliersTab.jsx` 762 שורות)

#### Tab: תזרים — ראה סעיף 10

#### Tab: פגישות — **ללא שינוי** (`MeetingsTab.jsx` 1,315 שורות)

### תהליך ביצוע
1. יצירת `src/components/client/` directory
2. כתיבת `ClientHeader.jsx`
3. כתיבת `ClientTabs.jsx` (shadcn Tabs + URL persistence)
4. כתיבת `TabContent.jsx` (tab router)
5. שכתוב `Clients.jsx` — URL-driven tabs + 3-panel
6. כתיבת `AIRecommendationsChat.jsx` + `RecommendationsSidebar.jsx`
7. יצירת API endpoint `streamAIChat.js`
8. יצירת DB table `ai_conversations`
9. הסרת 14+ recommendation modals
10. הסרת 7 recommendation engines מ-`logic/`
11. בדיקה: בחירת לקוח → מעבר בין tabs → URL נשמר

---

## 5. Tasks Page

### מצב נוכחי
`TaskManagement.jsx` (633 שורות) — ממשק ניהול משימות בסיסי.
`DailyTasksDashboard.jsx` (~600 שורות) — Kanban board מלא.

### מצב חדש

#### `src/pages/Tasks.jsx` (~250 שורות)
```
State: viewMode ('kanban'|'list'|'calendar'), filters (client, priority, status)
URL: /Tasks?view=kanban&client=all&priority=all

מבנה:
  <TasksToolbar>
    <ViewToggle mode={viewMode} onChange={setViewMode} />
    <ClientFilter value={clientFilter} onChange={setClientFilter} />
    <PriorityFilter value={priorityFilter} onChange={setPriorityFilter} />
    <Button onClick={() => setShowCreateModal(true)}>+ משימה</Button>
  </TasksToolbar>

  {viewMode === 'kanban' && <DailyTasksDashboard crossClient={true} filters={filters} />}
  {viewMode === 'list' && <TaskListView tasks={filteredTasks} />}
  {viewMode === 'calendar' && <TaskCalendarView tasks={filteredTasks} />}

  <TaskCreationModal open={showCreateModal} />
```

#### קומפוננטות חדשות
| קומפוננטה | שורות | תפקיד |
|-----------|-------|--------|
| `TasksToolbar.jsx` | ~80 | toolbar עם filters + view toggle |
| `TaskListView.jsx` | ~150 | תצוגת רשימה (TanStack Table) |
| `TaskCalendarView.jsx` | ~200 | תצוגת לוח שנה (react-day-picker + tasks) |

**Reuse:** DailyTasksDashboard, TaskCard, KanbanColumn, TaskCreationModal

### תהליך ביצוע
1. כתיבת `Tasks.jsx` — wrapper עם 3 view modes
2. כתיבת `TasksToolbar.jsx` — filters
3. כתיבת `TaskListView.jsx` — TanStack Table
4. כתיבת `TaskCalendarView.jsx` — calendar grid
5. הרחבת DailyTasksDashboard — prop `crossClient` לפילטור לפי לקוח
6. בדיקה: מעבר בין views, פילטרים, יצירת משימה

---

## 6. Calendar Page

### מצב נוכחי
אין דף Calendar ייעודי. פגישות מנוהלות ב-`MeetingsTab.jsx` (1,315 שורות) בתוך Client Profile.

### מצב חדש

#### `src/pages/Calendar.jsx` (~350 שורות)
```
State: selectedDate, viewMode ('month'|'week'|'day'), events[]
Data:
  meetings = useQuery(['allMeetings']) // Meeting entity
  deadlines = useQuery(['allGoalDeadlines']) // CustomerGoal entity

מבנה:
  <div className="flex h-full">
    <CalendarGrid className="flex-1">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        modifiers={{ hasMeeting: meetingDates, hasDeadline: deadlineDates }}
      />
      {viewMode !== 'month' && <DayView events={dayEvents} />}
    </CalendarGrid>

    <EventsSidebar className="w-80">
      <h3>אירועים ב-{formatDate(selectedDate)}</h3>
      {dayEvents.map(event => <EventCard event={event} />)}
      <Button onClick={() => setShowMeetingModal(true)}>+ פגישה</Button>
    </EventsSidebar>
  </div>
```

#### קומפוננטות חדשות
| קומפוננטה | שורות | תפקיד |
|-----------|-------|--------|
| `CalendarGrid.jsx` | ~200 | react-day-picker בגודל מלא |
| `EventsSidebar.jsx` | ~150 | sidebar עם אירועי היום |
| `EventCard.jsx` | ~80 | כרטיס אירוע (פגישה/deadline) |
| `DayView.jsx` | ~150 | תצוגת יום שעה-שעה |

**Reuse:** MeetingSummaryForm (מ-meetings/), CreateTaskModal

### תהליך ביצוע
1. כתיבת `Calendar.jsx` — layout + data fetching
2. כתיבת `CalendarGrid.jsx` — react-day-picker full-size
3. כתיבת `EventsSidebar.jsx` — day events
4. כתיבת `EventCard.jsx` — meeting/deadline card
5. כתיבת `DayView.jsx` — hourly timeline
6. Query: all meetings + all goal deadlines across clients
7. בדיקה: בחירת תאריך → אירועים מוצגים → יצירת פגישה

---

## 7. Reports Page

### מצב נוכחי
פונקציונליות מפוזרת ב-`Admin.jsx`, `ExportData.jsx`, `EngagementDashboard.jsx`.

### מצב חדש

#### `src/pages/Reports.jsx` (~200 שורות)
```
State: activeTab ('performance'|'engagement'|'export'|'failed')

מבנה:
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList>
      <TabsTrigger value="performance">ביצועי FM</TabsTrigger>
      <TabsTrigger value="engagement">מעורבות</TabsTrigger>
      <TabsTrigger value="export">ייצוא נתונים</TabsTrigger>
      <TabsTrigger value="failed">העלאות שנכשלו</TabsTrigger>
    </TabsList>

    <TabsContent value="performance">
      <FinanceManagerPerformanceTable />  // Reuse
      <FinanceManagerLeaderboard />       // Reuse
    </TabsContent>

    <TabsContent value="engagement">
      <EngagementDashboard />  // Reuse (lazy load)
    </TabsContent>

    <TabsContent value="export">
      <ExportDataPanel />  // Extract from ExportData.jsx
    </TabsContent>

    <TabsContent value="failed">
      <FailedFileUploadsManager />  // Reuse
    </TabsContent>
  </Tabs>
```

**Reuse:** FinanceManagerPerformanceTable, FinanceManagerLeaderboard, EngagementDashboard, FailedFileUploadsManager

### תהליך ביצוע
1. כתיבת `Reports.jsx` — 4-tab layout
2. חילוץ ExportDataPanel מ-ExportData.jsx
3. Lazy loading לכל tab content
4. בדיקה: מעבר בין tabs, טעינת נתונים

---

## 8. Settings Page

### מצב חדש

#### `src/pages/Settings.jsx` (~250 שורות)
```
State: activeTab ('profile'|'users'|'integrations'|'system')

Tabs:
  - פרופיל: פרטי המשתמש, שינוי סיסמה
  - ניהול משתמשים: (Admin/Super Admin only) — ראה סעיף 8.1
  - אינטגרציות: WhatsApp, Fireberry settings
  - מערכת: DefaultTasksManager, GoalTemplateManager
```

### 8.1 User Management (ב-Settings → ניהול משתמשים)

#### `src/components/settings/UserManagement.jsx` (~400 שורות)
```
Access: Admin + Super Admin only
Sub-tabs: ממתינים | FM | מחלקות | כל המשתמשים

Tab "ממתינים":
  <PendingApprovalsList>
    טבלה: שם | email | תאריך בקשה | role מבוקש | [אשר] [דחה]
    Data: useQuery(['pendingApprovals'])
    Actions: useMutation → approve/reject + assign role
  </PendingApprovalsList>

Tab "FM":
  <FMAssignmentsTable>
    טבלה: FM | לקוחות מוקצים (tags) | מחלקה | [ערוך]
    Data: useQuery(['fmAssignments'])
    Actions: assign/unassign clients
  </FMAssignmentsTable>

Tab "מחלקות":
  <DepartmentsManager>
    רשימת מחלקות + משתמשים בכל מחלקה
    CRUD: הוסף/ערוך/מחק מחלקה
  </DepartmentsManager>

Tab "כל המשתמשים":
  <AllUsersTable>
    טבלה: שם | email | role | סטטוס | תאריך | [ערוך role]
    Data: useQuery(['allUsers'])
  </AllUsersTable>
```

### תהליך ביצוע
1. כתיבת `Settings.jsx` — tab layout
2. כתיבת `UserManagement.jsx` — 4 sub-tabs
3. כתיבת `PendingApprovalsList.jsx`
4. כתיבת `FMAssignmentsTable.jsx`
5. כתיבת `DepartmentsManager.jsx`
6. כתיבת `AllUsersTable.jsx`
7. יצירת DB tables: pending_approvals, department_assignments, client_assignments
8. יצירת RLS policies
9. בדיקה: approve user → assign role → assign clients

---

## 9. תחזית עסקית — מפרט מלא

### 9.1 Step1: שירותים ועלויות — Cards → Table

**קובץ:** `Step1ServicesAndCosts.jsx` (1,296 שורות → ~800 שורות)

**מצב נוכחי:** כל שירות = Card (~200px גובה) עם: שם, מחיר, מע"מ, עלויות גלם (רשימה), חישוב רווח.
**מצב חדש:** כל שירות = שורה בטבלה (~50px) עם expandable row לעלויות.

```
מבנה טבלה חדש:
┌────┬──────────────┬──────────┬──────┬──────────┬────────┬───────┬──────┐
│ #  │ שם מוצר/שירות│ מחיר ₪   │ מע"מ │ עלות גלם │ רווח ₪ │ מרווח%│ פעולות│
├────┼──────────────┼──────────┼──────┼──────────┼────────┼───────┼──────┤
│ 1  │ [inline edit]│ [number] │ [☑]  │ [summary]│ [calc] │ [calc]│ ⬆⬇🗑│
│    │              │          │      │ ▶ expand │        │       │      │
└────┴──────────────┴──────────┴──────┴──────────┴────────┴───────┴──────┘

Expanded row (עלויות גלם):
  ┌──────────────┬──────────┬──────┐
  │ שם עלות      │ סכום ₪   │ פעולות│
  │ [חומרי גלם] │ [50    ] │ 🗑   │
  │ [+ הוסף עלות]                  │
  └──────────────┴──────────┴──────┘
```

**Data model — ללא שינוי:**
```javascript
service = {
  name: string,
  price: number,
  includeVat: boolean,
  rawMaterialCosts: [{ name: string, cost: number }],
  // calculated: profit, margin
}
```

**תהליך:**
1. החלפת Card-based rendering ב-`<Table>` (shadcn)
2. כל שדה → inline editable (click to edit)
3. Expandable row עם Collapsible (shadcn)
4. Virtual scrolling עם `@tanstack/react-virtual` (ל-100+ מוצרים)
5. מחיקת `ServiceCategoryGroup.jsx` (card UI component)
6. Footer: סיכום כולל (סה"כ מוצרים, ממוצע מרווח)
7. כפתור "טען מקטלוג" — נשאר

### 9.2 Step2: הסרת עובד שעתי

**קובץ:** `Step2SalaryCosts.jsx` (1,107 שורות → ~800 שורות)

**מה נמחק:**
```javascript
// הסרת סוג 'hourly' מ-employeeTypes
// הסרת שדות: hourly_rate, hours_per_month, planned_hours, actual_hours, planned_salary, actual_salary
// הסרת UI: כל ה-inputs/cards של עובד שעתי
// הסרת חישובים: calculateHourlySalary(), hourly-related validations
```

**מה נשאר:**
- `full_time` — עובד במשרה מלאה (שכר חודשי)
- `part_time` — עובד חלקי (שכר חודשי × אחוז משרה)
- `sales_commission` — עמלת מכירות (בסיס + אחוז × מכירות)

**תהליך:**
1. הסרת `hourly` מ-employee type dropdown
2. הסרת כל ה-JSX של hourly inputs
3. הסרת hourly calculation functions
4. הסרת hourly fields מ-validation schema
5. ~300 שורות נמחקות

### 9.3 Steps 3-5

**Step3 (`Step3SalesForecast.jsx` 1,340 שורות):** ללא שינוי
**Step4 (`Step4Expenses.jsx` 816 שורות):** ללא שינוי
**Step5 (`Step5ProfitLoss.jsx` 754 שורות):** שינוי מינורי:
- הוספת Toggle "הצג ביצוע" (default: off)
- כש-on: מציג עמודת actual לצד planned
- חיבור ForecastSensitivityAnalysis כ-section

### 9.4 פירוק BusinessForecastManager (3,123 → 8 קבצים)

**מצב נוכחי:** קובץ אחד ענק שמטפל בכל: setup, AI generation, revenue display, expenses, P&L, charts, summary, export.

**קבצים חדשים ב-`src/components/forecast/business/`:**

| # | קובץ | שורות | תפקיד |
|---|-------|-------|--------|
| 1 | `BusinessForecastManager.jsx` | ~200 | coordinator — state + tab routing |
| 2 | `ForecastSetup.jsx` | ~300 | בחירת פרמטרים (תקופה, מוצרים, settings) |
| 3 | `ForecastGeneration.jsx` | ~250 | הפעלת AI + progress tracking |
| 4 | `ForecastRevenue.jsx` | ~400 | תצוגת הכנסות (טבלה + charts) |
| 5 | `ForecastExpenses.jsx` | ~400 | תצוגת הוצאות (טבלה + charts) |
| 6 | `ForecastProfitLoss.jsx` | ~350 | רווח והפסד + plan vs actual toggle |
| 7 | `ForecastChartsDashboard.jsx` | ~350 | כל הגרפים (revenue, expenses, P&L) |
| 8 | `ForecastSummaryExport.jsx` | ~300 | סיכום + PDF/Excel export |

**תהליך:**
1. מיפוי sections ב-BusinessForecastManager.jsx (3,123 שורות)
2. חילוץ כל section ל-component נפרד
3. State management: BusinessForecastManager מחזיק forecast object, מעביר ל-children
4. כתיבת coordinator חדש (~200 שורות)
5. בדיקה: כל flow עובד — setup → generate → view → export

### 9.5 חיבור כלים מנותקים

| כלי | מיקום חדש | שינוי |
|-----|----------|-------|
| `ForecastTemplateSelector.jsx` (282) | Modal ב-UnifiedForecastManager — כפתור "בחר תבנית" | import + render ב-modal |
| `ForecastComparisonModal.jsx` (374) | כפתור ב-UnifiedForecastManager header | import + כפתור "השווה תחזיות" |
| `ForecastSensitivityAnalysis.jsx` (231) | Section חדש ב-Step5ProfitLoss | import + render below P&L table |
| `ForecastAnalytics.jsx` (287) | Tab ב-UnifiedForecastManager + section ב-Step5 | import + render |

### 9.6 תיקון העברת נתונים

**בעיה:** כל Step מחזיק local state נפרד. שינוי ב-Step1 לא מגיע ל-Step5 בזמן אמת.

**פתרון:**
```javascript
// ManualForecastWizard.jsx — Single Source of Truth
const [forecastData, setForecastData] = useState(initialForecast);

// כל step מקבל:
<Step1
  data={forecastData.services}
  onUpdate={(services) => {
    const updated = { ...forecastData, services };
    setForecastData(updated);
    autoSave(updated); // debounced save to Supabase
  }}
/>
```

**תהליך:**
1. הסרת local useState מכל Step component
2. כל Step מקבל `data` + `onUpdate` props
3. ManualForecastWizard מחזיק forecastData + auto-save (debounce 2s)
4. בדיקה: שינוי ב-Step1 → מופיע ב-Step5 P&L

---

## 10. תזרים מזומנים — מפרט מלא

### 10.1 תזרים יומי — הצגת תנועות עתידיות

**קובץ:** `CashFlowManager.jsx` (1,239 שורות)

**שינוי:**
```javascript
// כשטווח תאריכים כולל עתיד:
const futureRecurring = generateProjectedTransactions(recurringTransactions, dateRange);
// futureRecurring = תנועות קבועות שמתוזמנות בטווח

// הצגה בטבלה:
<TableRow className={isProjected ? 'bg-blue-50 border-dashed' : ''}>
  {isProjected && <Badge variant="outline">צפוי</Badge>}
  ...
</TableRow>

// יתרה מצטברת כוללת projected
const runningBalance = calculateRunningBalance([...actualEntries, ...futureRecurring]);
```

**תהליך:**
1. פונקציה `generateProjectedTransactions(recurring, dateRange)` — יוצרת entries וירטואליים
2. Merge actual + projected entries לפי תאריך
3. Badge "צפוי" + background color שונה לתנועות מתוזמנות
4. Running balance כולל projected
5. שמירת יתרת פתיחה (שדה חדש `opening_balance`)

### 10.2 ניהול קטגוריות

**קומפוננטה חדשה:** `src/components/cashflow/CategoryManager.jsx` (~200 שורות)
```
Props: { customerEmail, isOpen, onClose }
Data: useQuery(['cashFlowCategories', customerEmail])
Mutations: createCategory, updateCategory, deleteCategory

מבנה:
  <Dialog open={isOpen} onOpenChange={onClose}>
    <Table>
      <Row> שם קטגוריה | מספר תנועות | [ערוך] [מחק] </Row>
    </Table>
    <AddCategoryForm name={newName} onAdd={handleAdd} />
  </Dialog>

מחיקת קטגוריה:
  - אם יש תנועות → Dialog: "בחר קטגוריה להעברה"
  - Dropdown עם שאר הקטגוריות
  - UPDATE cash_flow SET category = newCat WHERE category = oldCat
  - DELETE from cash_flow_categories
```

**DB:** `cash_flow_categories` (id, customer_email, name, created_at)

### 10.3 תנועות קבועות — שיפור

**קובץ:** `RecurringTransactionsTab.jsx` (496 שורות)

**שינויים:**
1. הוספת `bi_monthly` (דו-חודשי) ל-frequency dropdown
2. הוספת שדה `category` (dropdown מ-cash_flow_categories)
3. כפתור "הצג בתזרים" → פותח CashFlowManager עם טווח עתידי

**DB:** `recurring_expense` + `frequency` enum: monthly, bi_monthly, quarterly, yearly

### 10.4 סיכום הוצאות

**קובץ:** `RecurringExpensesTable.jsx` (1,092 שורות)

**שינויים:**
1. **שינוי שם** display: "הוצאות קבועות" → "סיכום הוצאות"
2. הוספת עמודת "שיוך לתחזית" — dropdown: ביצוע (actual) | תכנון (planned) | —
3. שינוי layout:
```
Header: סה"כ: ₪X | ממוצע חודשי: ₪Y
טבלה: קטגוריה | חודש1 | חודש2 | חודש3 | ממוצע | סה"כ | שיוך
```
4. שיוך → עדכון manual_forecast_row עם actual data

### 10.5 כרטיסי אשראי — שיפור

**קובץ:** `CreditCardsTab.jsx` (351 שורות → ~500 שורות)

**שינויים:**
1. Sub-tabs: [לפי ספקים] [לפי קטגוריות] [כל התנועות]
2. ניתוח ספקים: group by supplier → sum + count + avg
3. ניתוח קטגוריות: group by category → pie chart + table
4. ייצוא Excel: כפתור → export כל התנועות + סיכומים

**קומפוננטות חדשות:**
| קומפוננטה | שורות | תפקיד |
|-----------|-------|--------|
| `CreditCardBySupplier.jsx` | ~150 | טבלה מקובצת לפי ספק |
| `CreditCardByCategory.jsx` | ~150 | טבלה + pie chart לפי קטגוריה |

### 10.6 תיקוני תשתית

| תיקון | קובץ | שינוי |
|-------|-------|-------|
| שם טבלה | `api/_handlers/deleteCashFlowPermanently.js` | `cash_flow_entry` → `cash_flow` |
| שם טבלה | `api/_handlers/exportCashFlowToExcel.js` | `cash_flow_entry` → `cash_flow` |
| שדות חסרים | `scripts/fix-all-missing-columns.sql` | ADD `is_credit_card`, `is_recurring`, `is_expected`, `file_upload_id`, `category` |
| Console logs | `CashFlowManager.jsx` | הסרת 13 console.log statements |
| יתרת פתיחה | `CashFlowManager.jsx` | שדה `opening_balance` + save/load |

---

## 11. Client Portal

### מצב חדש
משתמש עם `role = 'client'` רואה layout שונה לגמרי.

#### `src/pages/ClientPortal.jsx` (~300 שורות)
```
Access: role === 'client' only
Tabs: סקירה | קבצים | המלצות | הודעות

Tab סקירה: פרטי העסק, יעדים פעילים, KPIs
Tab קבצים: CustomerFileUploadManager (read-only mode)
Tab המלצות: רשימת המלצות (recommendations entity, filtered by customer email)
Tab הודעות: Chat עם FM (ManagerChatSystem reuse)

RLS: כל query מפולטר ב-customer_email = auth.email()
```

### תהליך
1. יצירת `ClientPortal.jsx`
2. Routing: אם role=client → redirect ל-ClientPortal
3. RLS policies על כל טבלה רלוונטית
4. Read-only mode flags ל-reused components

---

## 12. מערכת הרשאות — 5 roles

### DB Schema
```sql
-- profiles table changes
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'financial_manager'
  CHECK (role IN ('super_admin', 'admin', 'department_manager', 'financial_manager', 'client'));

-- New tables
CREATE TABLE pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  requested_role TEXT DEFAULT 'financial_manager',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  fm_email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_email, fm_email)
);

CREATE TABLE department_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  department_id UUID REFERENCES department(id),
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Role-Based Routing
```javascript
// AppLayout.jsx
if (user.role === 'client') return <ClientPortal />
if (user.role === 'super_admin' || user.role === 'admin') return <FullApp />
if (user.role === 'department_manager') return <FullApp filteredByDepartment />
if (user.role === 'financial_manager') return <FullApp filteredByAssignedClients />
```

### RLS Policies (per role)
```sql
-- FM: רואה רק לקוחות שהוקצו לו
CREATE POLICY "fm_sees_assigned_clients" ON onboarding_request
  FOR SELECT USING (
    email IN (
      SELECT client_email FROM client_assignments WHERE fm_email = auth.email()
    )
  );

-- Client: רואה רק את עצמו
CREATE POLICY "client_sees_own_data" ON recommendation
  FOR SELECT USING (customer_email = auth.email());

-- Admin: רואה הכל
CREATE POLICY "admin_sees_all" ON onboarding_request
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

---

## 13. Auth — Google Auth בלבד

### מצב נוכחי
`Welcome.jsx` (216 שורות) — email + password login.
`AuthContext.jsx` (100 שורות) — Supabase onAuthStateChange.

### מצב חדש
```javascript
// Welcome.jsx — Google Auth only
const handleGoogleLogin = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
};

// Auth callback flow:
// 1. Google auth → callback URL
// 2. Check if profile exists in profiles table
// 3. If new user → create pending_approval record → redirect to PendingApproval
// 4. If existing user → check role → redirect accordingly
```

**תהליך:**
1. שכתוב `Welcome.jsx` — הסרת email/password form, הוספת כפתור Google
2. עדכון Supabase Auth settings (enable Google OAuth)
3. יצירת callback handler
4. עדכון `AuthContext.jsx` — בדיקת pending approval status
5. עדכון `PendingApproval.jsx` — UI עם מצב "ממתין לאישור"

---

# חלק ג׳: תכנית ביצוע — 13 Phases

## Phase 0: ניקוי (Cleanup)

**מטרה:** הסרת קוד מת, דפים לא בשימוש, CSS inline

### קבצים למחיקה (19 דפים):
```
src/pages/Home.jsx
src/pages/FinancialFlow.jsx
src/pages/StrategicMoves.jsx
src/pages/ActionBank.jsx
src/pages/LeadIntakeManagement.jsx
src/pages/WhatsAppTest.jsx
src/pages/CustomerManagement.jsx (legacy)
src/pages/ManageProducts.jsx
src/pages/AddProduct.jsx
src/pages/CatalogPage.jsx
src/pages/ProductCatalog.jsx
src/pages/ExportData.jsx (content moves to Reports)
src/pages/FileUpload.jsx
src/pages/WebsiteScan.jsx
src/pages/Promotions.jsx
src/pages/Recommendations.jsx
src/pages/SupplierAnalysis.jsx
src/pages/SupportTicket.jsx (moves to Settings)
```

### קבצי components למחיקה:
```
src/components/admin/RecommendationCard.jsx
src/components/admin/RecommendationDisplayCard.jsx
src/components/admin/RecommendationEditModal.jsx
src/components/admin/RecommendationViewModal.jsx
src/components/admin/RecommendationFilters.jsx
src/components/admin/RecommendationSuggestionSystem.jsx
src/components/admin/ManualRecommendationModal.jsx
src/components/admin/GeneralRecommendationModal.jsx
src/components/admin/GoalOrientedRecommendationModal.jsx
src/components/admin/TargetedRecommendationModal.jsx
src/components/admin/EnhancedRecommendationOptionsModal.jsx
src/components/admin/RecommendationUpgradeModal.jsx
src/components/admin/RecommendationUpgradePromptModal.jsx
src/components/admin/ArchivedRecommendationsModal.jsx
src/components/admin/IrrelevantRecommendationsModal.jsx
src/components/admin/SystemRecommendationsModal.jsx
src/components/admin/CreateRecommendationButtons.jsx
src/components/admin/StrategicRecommendations.jsx
src/components/admin/SupplierRecommendationEngine.jsx
src/components/admin/AIChatAssistant.jsx
src/components/admin/FloatingAgentChat.jsx
src/components/admin/Ofek360Modal.jsx
src/components/admin/DailyOfek360Checklist.jsx
src/components/admin/DailyChecklistButton.jsx
src/components/admin/WebsiteScanner.jsx
src/components/admin/ScanInsightsDisplay.jsx
src/components/admin/ScanProductTable.jsx
src/components/admin/AgentSupportTicketsManager.jsx
src/components/admin/UnknownFileQueueManager.jsx
src/components/admin/AdminRatingWidget.jsx
src/components/admin/CustomerInitiatedRecommendationsModal.jsx
src/components/admin/LeadCard.jsx
src/components/admin/LeadDetailModal.jsx
src/components/admin/BusinessMoveDetailsModal.jsx
src/components/admin/FindAlternativeSupplierModal.jsx
src/components/admin/MissingDocumentsModal.jsx
src/components/admin/DataGapsModal.jsx
src/components/admin/ClientManagementDashboard.jsx
src/components/admin/ClientActivityStatusEditor.jsx
src/components/admin/GoalBankManager.jsx
src/components/logic/recommendationEngine.jsx
src/components/logic/enhancedRecommendationEngine.jsx
src/components/logic/generalRecommendationEngine.jsx
src/components/logic/unifiedRecommendationOrchestrator.jsx
src/components/logic/strategicMovesEngine.jsx
src/components/logic/targetedRecommendationEngine.jsx
src/components/logic/inventoryBasedRecommendationEngine.jsx
src/components/shared/RecommendationCard.jsx
src/components/shared/RecommendationFeedbackWidget.jsx
src/components/shared/RecommendationRating.jsx
src/components/shared/StrategicMoveCard.jsx
src/components/shared/BusinessMoveCard.jsx
src/components/shared/DeeperInsightsModal.jsx
src/components/shared/EmergencyChat.jsx
src/components/shared/WhatsAppTestSender.jsx
src/components/shared/FeedbackAnalytics.jsx
src/components/shared/ReportInsights.jsx
src/components/leads/LeadManagementSystem.jsx
src/components/dashboard/CompletedTasksModal.jsx
src/components/dashboard/RecentActivity.jsx
src/components/dashboard/WelcomeSection.jsx
src/components/dashboard/QuickActions.jsx
src/components/forecast/manual/ServiceCategoryGroup.jsx
```

### CSS cleanup:
- חילוץ CSS variables מ-Layout.jsx ל-`globals.css`
- הסרת inline `<style>` tags מ-Layout.jsx

### תוצאה:
~60 קבצים נמחקים. ~8,000 שורות מת מוסרות.

---

## Phase 1: Auth — Google Auth + 5 Roles + Pending Approvals

**קבצים משתנים:**
1. `src/pages/Welcome.jsx` — שכתוב → Google Auth button
2. `src/lib/AuthContext.jsx` — הוספת role checking + pending status
3. `src/pages/PendingApproval.jsx` — עדכון UI

**קבצים חדשים:**
1. `scripts/auth-migration.sql` — profiles role column + pending_approvals + client_assignments + department_assignments tables + RLS policies

**בדיקה:** Google login → pending → admin approves → role assigned → correct redirect

---

## Phase 2: Layout + ניווט חדש

**קבצים חדשים:**
1. `src/components/layout/AppLayout.jsx` (~200)
2. `src/components/layout/Sidebar.jsx` (~250)
3. `src/components/layout/TopBar.jsx` (~150)

**קבצים משתנים:**
1. `src/App.jsx` — routing חדש (7 routes)
2. `src/pages.config.js` — 7 דפים

**קבצים מוסרים:**
1. `src/Layout.jsx` — מוחלף ע"י AppLayout

**בדיקה:** כל 7 routes נטענים, sidebar מציג 6 items, mobile responsive

---

## Phase 3: Dashboard חדש

**קבצים חדשים:**
1. `src/components/dashboard/KPICards.jsx` (~100)
2. `src/components/dashboard/ViewToggle.jsx` (~50)

**קבצים משתנים:**
1. `src/pages/Dashboard.jsx` — שכתוב (~300)
2. `src/components/dashboard/DailyTasksDashboard.jsx` — הסרת בנק יעדים
3. `src/components/dashboard/ClientList.jsx` — הסרת WhatsApp button

**בדיקה:** Dashboard toggle, Kanban drag & drop, client list filter

---

## Phase 4: Client Profile — URL-driven tabs

**קבצים חדשים:**
1. `src/pages/Clients.jsx` (~400)
2. `src/components/client/ClientHeader.jsx` (~200)
3. `src/components/client/ClientTabs.jsx` (~80)
4. `src/components/client/TabContent.jsx` (~100)

**קבצים משתנים:**
1. `src/pages/CustomerManagementNew.jsx` — מוחלף ע"י Clients.jsx
2. `src/components/catalog/ProductCatalogManager.jsx` — + edit name + bulk delete

**בדיקה:** /Clients?customer=x&tab=files — URL persistence, tab switching

---

## Phase 5: Tasks + Calendar

**קבצים חדשים:**
1. `src/pages/Tasks.jsx` (~250)
2. `src/components/tasks/TasksToolbar.jsx` (~80)
3. `src/components/tasks/TaskListView.jsx` (~150)
4. `src/components/tasks/TaskCalendarView.jsx` (~200)
5. `src/pages/Calendar.jsx` (~350)
6. `src/components/calendar/CalendarGrid.jsx` (~200)
7. `src/components/calendar/EventsSidebar.jsx` (~150)
8. `src/components/calendar/EventCard.jsx` (~80)
9. `src/components/calendar/DayView.jsx` (~150)

**בדיקה:** Tasks 3 views, Calendar date selection, event display

---

## Phase 6: פירוק Admin.jsx → Reports + User Management + Settings

**קבצים חדשים:**
1. `src/pages/Reports.jsx` (~200)
2. `src/pages/Settings.jsx` (~250)
3. `src/components/settings/UserManagement.jsx` (~400)
4. `src/components/settings/PendingApprovalsList.jsx` (~200)
5. `src/components/settings/FMAssignmentsTable.jsx` (~200)
6. `src/components/settings/DepartmentsManager.jsx` (~200)
7. `src/components/settings/AllUsersTable.jsx` (~150)

**קבצים מוסרים:**
1. `src/pages/Admin.jsx` (4,448 שורות)

**בדיקה:** Reports 4 tabs, Settings user management, pending approvals flow

---

## Phase 7: תחזית עסקית

**קבצים חדשים (פירוק BusinessForecastManager):**
1. `src/components/forecast/business/ForecastSetup.jsx` (~300)
2. `src/components/forecast/business/ForecastGeneration.jsx` (~250)
3. `src/components/forecast/business/ForecastRevenue.jsx` (~400)
4. `src/components/forecast/business/ForecastExpenses.jsx` (~400)
5. `src/components/forecast/business/ForecastProfitLoss.jsx` (~350)
6. `src/components/forecast/business/ForecastChartsDashboard.jsx` (~350)
7. `src/components/forecast/business/ForecastSummaryExport.jsx` (~300)

**קבצים משתנים:**
1. `BusinessForecastManager.jsx` — שכתוב coordinator (~200)
2. `Step1ServicesAndCosts.jsx` — שכתוב UI cards→table (~800)
3. `Step2SalaryCosts.jsx` — הסרת hourly (~800)
4. `Step5ProfitLoss.jsx` — toggle plan/actual + sensitivity
5. `ManualForecastWizard.jsx` — Single Source of Truth + auto-save
6. `UnifiedForecastManager.jsx` — חיבור Template, Comparison, Analytics

**קבצים מוסרים:**
1. `ServiceCategoryGroup.jsx`

**בדיקה:** Manual wizard 5 steps, table UI, data flow, AI forecast, comparison tool

---

## Phase 8: תזרים מזומנים

**קבצים חדשים:**
1. `src/components/cashflow/CategoryManager.jsx` (~200)
2. `src/components/cashflow/CreditCardBySupplier.jsx` (~150)
3. `src/components/cashflow/CreditCardByCategory.jsx` (~150)
4. `scripts/cashflow-migration.sql` — cash_flow_categories table + columns

**קבצים משתנים:**
1. `CashFlowManager.jsx` — projected transactions + category button + console.log cleanup
2. `RecurringTransactionsTab.jsx` — bi-monthly + category field
3. `RecurringExpensesTable.jsx` — rename + forecast linking
4. `CreditCardsTab.jsx` — sub-tabs + analysis + Excel export

**API fixes:**
1. `api/_handlers/deleteCashFlowPermanently.js` — table name fix
2. `api/_handlers/exportCashFlowToExcel.js` — table name fix

**בדיקה:** Categories CRUD, projected transactions, expense summary, credit card analysis

---

## Phase 9: עוזר AI (המלצות)

**קבצים חדשים:**
1. `src/components/client/AIRecommendationsChat.jsx` (~500)
2. `src/components/client/RecommendationsSidebar.jsx` (~200)
3. `src/components/client/ChatMessage.jsx` (~100)
4. `src/components/client/ChatInput.jsx` (~100)
5. `api/_handlers/streamAIChat.js` (~300) — SSE endpoint
6. `scripts/ai-conversations-migration.sql`

**קבצים משתנים:**
1. `src/api/openRouterClient.js` — SSE streaming support
2. `src/api/agents.js` — שכתוב → OpenRouter direct

**בדיקה:** AI chat streaming, tool calls, save recommendation, convert to goal

---

## Phase 10: Client Portal

**קבצים חדשים:**
1. `src/pages/ClientPortal.jsx` (~300)
2. `scripts/client-portal-rls.sql` — RLS policies

**קבצים משתנים:**
1. `src/components/layout/AppLayout.jsx` — conditional render for client role

**בדיקה:** Client login → portal only, RLS blocks other data

---

## Phase 11: אוטומציה

**קבצים חדשים:**
1. `api/_handlers/cronCheckDelayedGoals.js` — cron: check overdue goals
2. `api/_handlers/cronCheckInactiveClients.js` — cron: inactivity alerts
3. `api/_handlers/cronPrepMeetings.js` — cron: meeting preparation
4. `src/components/shared/HealthScore.jsx` (~100)

**Vercel cron config:** `vercel.json` → cron schedules

**בדיקה:** Cron jobs fire, notifications created, health scores calculated

---

## Phase 12: Mobile + פוליש

**קבצים משתנים:**
1. `src/components/layout/Sidebar.jsx` — mobile overlay + swipe
2. `src/components/layout/AppLayout.jsx` — responsive breakpoints
3. `src/components/mobile/MobileDashboard.jsx` — שכתוב
4. כל דפים חדשים — responsive review

**בדיקה:** Mobile view (375px, 768px), touch interactions, swipe sidebar

---

# חלק ד׳: סיכום כמותי

| מדד | לפני | אחרי |
|-----|-------|-------|
| דפים | 28 | 10 (7 main + 3 system) |
| Navigation items | 26+3 | 6 |
| Components (total files) | 269 | ~200 |
| שורות קוד (estimate) | ~117K | ~85K |
| קבצים חדשים | — | ~40 |
| קבצים למחיקה | — | ~60 |
| קבצים לשינוי | — | ~25 |
| DB tables חדשים | — | 4 |
| API handlers חדשים | — | 3 |

---

# חלק ה׳: סדר אימות (Verification)

לאחר כל Phase:
1. `npm run dev` → אין errors ב-console
2. Navigation → כל routes נטענים
3. Auth → login/logout/role redirect
4. Data → CRUD operations work
5. UI → responsive, RTL correct, theme toggle
6. Git → commit + push after each Phase
