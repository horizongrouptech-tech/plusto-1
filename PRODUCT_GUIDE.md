# 📘 מורה נבוכים למערכת Plusto
## ספר המוצר והמדריך המקיף למתכנת

**גרסה:** 3.0  
**תאריך עדכון:** 24/01/2026  
**נכתב על ידי:** AI Development Assistant  

---

## תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [ארכיטקטורה ושכבות המערכת](#2-ארכיטקטורה-ושכבות-המערכת)
3. [טכנולוגיות וכלים](#3-טכנולוגיות-וכלים)
4. [מודל הנתונים (Entities)](#4-מודל-הנתונים-entities)
5. [מערכת ההרשאות](#5-מערכת-ההרשאות)
6. [פונקציות Backend (Deno Functions)](#6-פונקציות-backend-deno-functions)
7. [קומפוננטות Frontend](#7-קומפוננטות-frontend)
8. [תהליכי עבודה עסקיים](#8-תהליכי-עבודה-עסקיים)
9. [אינטגרציות חיצוניות](#9-אינטגרציות-חיצוניות)
10. [עיצוב ו-CSS](#10-עיצוב-ו-css)
11. [ניהול גרסאות ועדכון המערכת](#11-ניהול-גרסאות-ועדכון-המערכת)
12. [רשימת תיוג לחפיפה](#12-רשימת-תיוג-לחפיפה)
13. [תובנות אישיות והמלצות](#13-תובנות-אישיות-והמלצות)

---

## 1. סקירה כללית

### 1.1 מהי מערכת Plusto?

**Plusto** היא מערכת SaaS מתקדמת לניהול פיננסי עבור עסקים קטנים ובינוניים. המערכת מספקת:

- **תחזיות עסקיות** - יצירת תחזיות הכנסות, הוצאות ורווחיות
- **ניהול קטלוג מוצרים** - ניתוח רווחיות מוצרים וניהול מלאי
- **המלצות חכמות** - המלצות עסקיות מבוססות AI
- **ניהול ספקים** - מעקב אחר ספקים, תשלומים והזמנות
- **ניהול לקוחות** - עבור מנהלי כספים שמנהלים מספר לקוחות
- **דשבורד ביצועים** - מעקב אחר KPIs ומדדים עסקיים

### 1.2 קהל היעד

| תפקיד | תיאור | גישה |
|-------|-------|------|
| **Admin** | מנהל מערכת Plusto | גישה מלאה לכל הלקוחות והפיצ'רים |
| **Financial Manager** | מנהל כספים | גישה ללקוחות שהוקצו לו בלבד |
| **User** | לקוח עסקי | גישה לנתונים שלו בלבד |
| **Supplier** | ספק | גישה מוגבלת לנתונים רלוונטיים |

### 1.3 מבנה ה-URL וניווט

האפליקציה פועלת כ-**Single Page Application (SPA)** עם React Router:

```
https://app.base44.com/{app_id}/
├── /Dashboard              # דף הבית / דשבורד
├── /Admin                  # ממשק ניהול (אדמין בלבד)
├── /BusinessForecast       # תחזיות עסקיות
├── /FileUpload            # העלאת קבצים
├── /ProductCatalog        # קטלוג מוצרים
├── /SupplierAnalysis      # ניתוח ספקים
├── /Recommendations       # המלצות
├── /TaskManagement        # ניהול משימות
└── /...                   # עמודים נוספים
```

---

## 2. ארכיטקטורה ושכבות המערכת

### 2.1 דיאגרמת ארכיטקטורה

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      src/App.jsx                            ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ ││
│  │  │ AuthProvider│  │QueryClient  │  │   Router (Pages)    │ ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Layout.jsx                               ││
│  │  ┌──────────┐ ┌──────────────┐ ┌───────────────────────┐   ││
│  │  │ Sidebar  │ │   TopBar     │ │    Page Content       │   ││
│  │  │Navigation│ │   Actions    │ │    (Dynamic)          │   ││
│  │  └──────────┘ └──────────────┘ └───────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Components Layer                          ││
│  │  /admin  /forecast  /dashboard  /shared  /ui  /catalog     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               │
                     ┌─────────┴─────────┐
                     │  @base44/sdk      │
                     │  API Layer        │
                     └─────────┬─────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                     BASE44 PLATFORM                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │    Entities     │ │   Functions     │ │  Integrations   │   │
│  │   (Database)    │ │ (Deno Backend)  │ │  (AI, Email..)  │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 שכבת ה-Frontend

| תיקייה | תיאור | דוגמאות |
|--------|-------|---------|
| `src/pages/` | עמודים ראשיים (28 קבצים) | Dashboard.jsx, Admin.jsx |
| `src/components/` | קומפוננטות לפי תחום | admin/, forecast/, shared/ |
| `src/lib/` | ספריות ו-utilities | AuthContext.jsx, utils.js |
| `src/api/` | שכבת גישה ל-API | base44Client.js, entities.js |
| `src/hooks/` | React Hooks מותאמים | use-mobile.jsx |

### 2.3 שכבת ה-Backend (Base44)

**Base44** היא פלטפורמת Low-Code שמספקת:

1. **Entities** - מסד נתונים NoSQL עם CRUD אוטומטי
2. **Functions** - פונקציות Deno serverless
3. **Integrations** - חיבורים ל-AI, Email, SMS ועוד
4. **Auth** - מערכת אימות מובנית

---

## 3. טכנולוגיות וכלים

### 3.1 Frontend Stack

```json
{
  "framework": "React 18.2.0",
  "routing": "react-router-dom 6.26.0",
  "state": "@tanstack/react-query 5.84.1",
  "ui": {
    "components": "Radix UI (shadcn/ui)",
    "styling": "Tailwind CSS 3.4.17",
    "icons": "lucide-react 0.475.0"
  },
  "charts": {
    "primary": "Recharts 2.15.4",
    "advanced": "Nivo 0.87.0"
  },
  "forms": {
    "library": "react-hook-form 7.54.2",
    "validation": "zod 3.24.2"
  },
  "utilities": {
    "dates": "date-fns 3.6.0",
    "excel": "xlsx 0.18.5",
    "pdf": "jspdf 2.5.2"
  },
  "build": "Vite 6.1.0"
}
```

### 3.2 Backend Stack

```javascript
// Functions Runtime
runtime: "Deno"
sdk: "@base44/sdk@0.1.0"

// AI Models
claude: "claude-sonnet-4-20250514"
openai: "gpt-4" (via InvokeLLM)

// Storage
database: "Base44 Entities (NoSQL)"
files: "Base44 File Storage / AWS S3"
```

### 3.3 קבצי קונפיגורציה

| קובץ | תפקיד |
|------|-------|
| `vite.config.js` | Build configuration + Base44 plugin |
| `tailwind.config.js` | Tailwind CSS customization |
| `postcss.config.js` | PostCSS plugins |
| `components.json` | shadcn/ui configuration |
| `jsconfig.json` | Path aliases (@/) |
| `eslint.config.js` | Linting rules |

---

## 4. מודל הנתונים (Entities)

### 4.1 גישה ל-Entities

**חשוב:** ה-Entities מוגדרים ב-Base44 Console, לא בקוד!

```javascript
// גישה דרך SDK
import { base44 } from '@/api/base44Client';

// פעולות CRUD
await base44.entities.User.list();
await base44.entities.User.filter({ role: 'user' });
await base44.entities.User.create({ ... });
await base44.entities.User.update(id, { ... });
await base44.entities.User.delete(id);

// או דרך import ישיר (legacy)
import { User } from '@/entities/User';
```

### 4.2 רשימת Entities מלאה

#### 👤 משתמשים והרשאות

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **User** | משתמשי המערכת | email, role, business_name, business_type |
| **OnboardingRequest** | בקשות הצטרפות | email, status, assigned_financial_manager_email |
| **FinancialManagerPerformance** | ביצועי מנהלים | manager_email, period, metrics |

#### 📊 תחזיות ופיננסים

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **BusinessForecast** | תחזית עסקית | customer_email, type, profit_loss_monthly |
| **ManualForecast** | תחזית ידנית | customer_email, data, status |
| **ManualForecastSheet** | גיליון תחזית | forecast_id, sheet_data |
| **StrategicPlanInput** | קלטים אסטרטגיים | customer_email, inputs |
| **CashFlow** | תזרים מזומנים | customer_email, date, amount, type |

#### 📦 מוצרים וקטלוג

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **Product** | מוצר בודד | name, sku, cost_price, sell_price |
| **ProductCatalog** | קטלוג מוצרים | customer_email, products_count |
| **Catalog** | קטלוג חכם | customer_email, items, status |
| **Promotion** | מבצעים | product_id, discount_percentage |

#### 🚛 ספקים

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **Supplier** | ספק | name, email, payment_terms |
| **SupplierQuote** | הצעת מחיר | supplier_id, items, total |
| **PurchaseRecord** | רכישות | supplier_id, amount, date |

#### 💡 המלצות ומשימות

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **Recommendation** | המלצה עסקית | customer_email, title, priority, status |
| **RecommendationFeedback** | פידבק להמלצה | recommendation_id, rating |
| **BusinessMove** | מהלך עסקי | customer_email, status |
| **CustomerGoal** | יעד/משימה | customer_email, title, due_date, status |
| **GoalComment** | הערה ליעד | goal_id, text, created_by |
| **GoalTemplate** | תבנית יעדים | name, default_tasks |

#### 📄 קבצים ומסמכים

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **FileUpload** | קובץ שהועלה | customer_email, file_type, file_url |
| **FileCategory** | קטגוריית קובץ | name, description |
| **TempUpload** | העלאה זמנית | file_url, expiry |

#### 💬 תקשורת

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **Lead** | ליד | email, phone, status, source |
| **CustomerContact** | איש קשר | customer_email, name, role |
| **CommunicationThread** | שרשור הודעות | participants |
| **ChatMessage** | הודעת צ'אט | thread_id, sender, content |
| **Notification** | התראה | user_email, type, read |
| **CustomerNotification** | התראה ללקוח | customer_email, message |

#### 📈 ניתוח ומעקב

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **UserActivity** | פעילות משתמש | user_email, actions, last_login |
| **UserEngagement** | מעורבות | user_email, engagement_score |
| **WebsiteScanResult** | סריקת אתר | url, products_found |
| **FinancialReport** | דוח פיננסי | customer_email, report_data |

#### 🔧 מערכת

| Entity | תיאור | שדות מרכזיים |
|--------|-------|---------------|
| **ProcessStatus** | סטטוס תהליך | process_id, status, progress |
| **SupportTicket** | פניית תמיכה | user_email, subject, status |
| **AgentSupportTicket** | פנייה לסוכן | ticket_id, agent_id |
| **BackupLog** | לוג גיבוי | date, status, files_count |
| **Ofek360Model** | מודל אופק 360 | customer_email, data |

### 4.3 יחסים בין Entities

```
User
 ├── OnboardingRequest (1:1) - בקשת הצטרפות
 ├── BusinessForecast (1:N) - תחזיות
 ├── CustomerGoal (1:N) - יעדים ומשימות
 ├── Recommendation (1:N) - המלצות
 ├── FileUpload (1:N) - קבצים
 ├── Supplier (N:M via PurchaseRecord) - ספקים
 └── Lead (1:N) - לידים

OnboardingRequest
 ├── assigned_financial_manager_email → User (מנהל ראשי)
 ├── additional_assigned_financial_manager_emails[] → User[] (מנהלים משניים)
 └── customer_group → string (קבוצת לקוח)

CustomerGoal
 ├── customer_email → User
 ├── assigned_user_email → User (מבצע)
 ├── depends_on[] → CustomerGoal[] (תלויות)
 └── comments → GoalComment[] (הערות)
```

---

## 5. מערכת ההרשאות

### 5.1 תפקידים (Roles)

```javascript
const ROLES = {
  admin: {
    description: 'מנהל מערכת',
    permissions: ['all'],
    canAccessAllCustomers: true,
    canManageUsers: true,
    canManageLeads: true,
  },
  department_head: {
    description: 'ראש מחלקה',
    permissions: ['view_team', 'manage_customers'],
    canAccessAllCustomers: false,
    canManageUsers: false,
  },
  financial_manager: {
    description: 'מנהל כספים',
    permissions: ['manage_assigned_customers'],
    canAccessAllCustomers: false,
    canEditOwnCustomers: true,
  },
  user: {
    description: 'לקוח',
    permissions: ['view_own_data'],
    canAccessAllCustomers: false,
  },
  supplier: {
    description: 'ספק',
    permissions: ['view_limited'],
    canAccessAllCustomers: false,
  }
};
```

### 5.2 בדיקת הרשאות בקוד

```javascript
// src/pages/Admin.jsx - דוגמה
const { data: user } = useQuery({
  queryKey: ['currentUser'],
  queryFn: () => base44.auth.me(),
});

// הגנה על עמוד אדמין
if (!user || user.role !== 'admin') {
  return <Navigate to="/Dashboard" />;
}

// בדיקת גישה למשימות עריכה
const canEdit = user.role === 'admin' || 
                user.role === 'department_head' || 
                user.role === 'financial_manager';
```

### 5.3 סינון נתונים לפי הרשאות

```javascript
// דוגמה מ-Dashboard.jsx
const { data: clients = [] } = useQuery({
  queryKey: ['dashboardClients', user?.email],
  queryFn: async () => {
    if (!user) return [];
    
    // אדמין - רואה הכל
    if (user.role === 'admin') {
      return await base44.entities.User.filter({ 
        role: 'user', 
        user_type: 'regular' 
      });
    }
    
    // מנהל כספים - רק לקוחות שהוקצו לו
    const allOnboarding = await base44.entities.OnboardingRequest.list();
    return allOnboarding.filter(req => 
      req.assigned_financial_manager_email === user.email ||
      req.additional_assigned_financial_manager_emails?.includes(user.email)
    );
  },
});
```

### 5.4 Authentication Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │   Base44    │      │   Auth DB   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. Open App       │                    │
       │─────────────────►  │                    │
       │                    │                    │
       │  2. No token?      │                    │
       │◄───────────────────│                    │
       │                    │                    │
       │  3. Redirect to    │                    │
       │     Login Page     │                    │
       │◄───────────────────│                    │
       │                    │                    │
       │  4. User Login     │                    │
       │─────────────────►  │  5. Validate       │
       │                    │─────────────────►  │
       │                    │                    │
       │                    │  6. Token Created  │
       │  7. Token in URL   │◄─────────────────  │
       │◄───────────────────│                    │
       │                    │                    │
       │  8. App loads with │                    │
       │     access_token   │                    │
       └────────────────────┴────────────────────┘
```

---

## 6. פונקציות Backend (Deno Functions)

### 6.1 מבנה פונקציה טיפוסית

```typescript
// functions/exampleFunction.ts
import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
  appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
  try {
    // 1. אימות (אופציונלי)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      base44.auth.setToken(token);
      const user = await base44.auth.me();
      if (!user) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // 2. קריאת הבקשה
    const payload = await req.json();

    // 3. לוגיקה עסקית
    const result = await processData(payload);

    // 4. תשובה
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 6.2 קטלוג פונקציות

#### 🔄 Onboarding & Customer Management

| פונקציה | תיאור | Trigger |
|---------|-------|---------|
| `onboardNewCustomer` | יצירת בקשת הצטרפות חדשה | Webhook מ-Make.com |
| `autoOnboardingOrchestrator` | אורכסטרציה של תהליך onboarding | אוטומטי |
| `approveOnboardingRequest` | אישור בקשת הצטרפות | כפתור בממשק אדמין |
| `toggleClientStatus` | הפעלה/כיבוי סטטוס לקוח | ממשק אדמין |
| `archiveFireberryClient` | ארכוב לקוח | ממשק אדמין |

#### 📊 Forecast & Analytics

| פונקציה | תיאור | Trigger |
|---------|-------|---------|
| `orchestrateBusinessForecast` | יצירת תחזית עסקית מלאה | העלאת קבצים |
| `generateSalesForecastAI` | תחזית מכירות בינה מלאכותית | תחזית עסקית |
| `generateExpenseForecastAI` | תחזית הוצאות AI | תחזית עסקית |
| `generateEmployeeForecastAI` | תחזית עובדים AI | תחזית עסקית |
| `normalizeAndLoadForecast` | נרמול ועיבוד נתוני תחזית | העלאת קובץ |
| `exportForecastToPdf` | ייצוא תחזית ל-PDF | כפתור ייצוא |
| `exportCashFlowToExcel` | ייצוא תזרים ל-Excel | כפתור ייצוא |

#### 📦 Catalog & Products

| פונקציה | תיאור | Trigger |
|---------|-------|---------|
| `generateCatalog` | יצירת קטלוג מוצרים | העלאת קובץ |
| `generateCatalogBackground` | יצירת קטלוג ברקע | אוטומטי |
| `generateCatalogWorker` | עיבוד פריטי קטלוג | Worker |
| `generateInitialCatalog` | קטלוג ראשוני | Onboarding |
| `processCatalogUpload` | עיבוד העלאת קטלוג | העלאת קובץ |
| `processCatalogWithMapping` | עיבוד עם מיפוי עמודות | ממשק |
| `cleanCatalogSmartly` | ניקוי חכם של קטלוג | ידני |
| `cancelCatalogGeneration` | ביטול יצירת קטלוג | ידני |
| `deleteCatalogPermanently` | מחיקה סופית | ידני |
| `deleteEntireCatalog` | מחיקת כל הקטלוג | ידני |
| `exportCatalogToExcel` | ייצוא ל-Excel | כפתור |

#### 📄 File Processing

| פונקציה | תיאור | סוגי קבצים |
|---------|-------|------------|
| `parseXlsx` | פרסור Excel כללי | .xlsx, .xls |
| `parseXlsxManualForecast` | פרסור תחזית ידנית | .xlsx |
| `parseZReport` | פרסור דוח Z | .xlsx, .csv |
| `parseBizIboxFile` | פרסור קובץ BizIbox | .xlsx |
| `parseFutureRevenueFile` | פרסור הכנסות עתידיות | .xlsx |
| `parseFileHeaders` | חילוץ כותרות עמודות | * |
| `processSmartDocument` | עיבוד מסמך חכם | * |
| `processPurchaseDocument` | עיבוד מסמך רכישה | .pdf, .xlsx |
| `processCreditReport` | עיבוד דוח אשראי | .pdf |
| `processESNAReport` | עיבוד דוח ESNA | .xlsx |
| `processTaxAssessment` | עיבוד שומת מס | .pdf |
| `processManualForecastSheet` | עיבוד גיליון תחזית | .xlsx |
| `analyzeFinancialReport` | ניתוח דוח פיננסי | .pdf, .xlsx |
| `analyzeGenericFile` | ניתוח קובץ כללי | * |

#### 💡 AI & Recommendations

| פונקציה | תיאור | AI Model |
|---------|-------|----------|
| `invokeClaude` | קריאה ישירה ל-Claude | claude-sonnet-4 |
| `generateDeeperInsights` | תובנות מעמיקות | Claude |
| `generateStrategicRecommendations` | המלצות אסטרטגיות | Claude |
| `generateBusinessPlanText` | יצירת תוכנית עסקית | Claude |
| `findAlternativeSuppliersOnline` | חיפוש ספקים חלופיים | Web + AI |
| `getSuggestedSuppliers` | הצעות ספקים | AI |
| `deepSearchOro` | חיפוש מעמיק ORO | Web |
| `deepWebCrawler` | סריקת אתרים | Web Crawler |
| `scrapeWebsite` | סריקת אתר בודד | Web Scraper |

#### 📅 Tasks & Goals

| פונקציה | תיאור | Trigger |
|---------|-------|---------|
| `generateRecurringTasks` | יצירת משימות חוזרות | Cron |
| `checkDelayedGoals` | בדיקת יעדים באיחור | Cron |
| `checkDelayedTasks` | בדיקת משימות באיחור | Cron |
| `calculateManagerPerformance` | חישוב ביצועי מנהל | Cron/ידני |

#### 📱 Communication

| פונקציה | תיאור | Channel |
|---------|-------|---------|
| `sendWhatsAppMessage` | שליחת הודעת WhatsApp | WhatsApp |
| `sendWhatsAppTaskReminder` | תזכורת משימה | WhatsApp |
| `initiateWhatsAppConversation` | התחלת שיחה | WhatsApp |
| `handleWhatsAppFeedback` | קבלת פידבק | Webhook |
| `receiveWhatsAppDataWebhook` | קבלת נתונים | Webhook |
| `scheduleMeeting` | תזמון פגישה | Email/Calendar |

#### 🔗 External Integrations

| פונקציה | תיאור | Service |
|---------|-------|---------|
| `syncManagerFromFireberry` | סנכרון מנהלים | Fireberry CRM |
| `syncTaskToFireberry` | סנכרון משימות | Fireberry CRM |
| `handleFireberryAccountWebhook` | Webhook חשבון | Fireberry CRM |
| `importFireberryTasks` | ייבוא משימות | Fireberry CRM |
| `updateUsersFireberryIds` | עדכון IDs | Fireberry CRM |
| `requestSupplierQuote` | בקשת הצעת מחיר | Email |
| `receiveLeadWebhook` | קבלת ליד | Webhook |

#### 💾 Backup & Admin

| פונקציה | תיאור | Storage |
|---------|-------|---------|
| `backupDatabaseToS3` | גיבוי מסד נתונים | AWS S3 |
| `backupCodeToS3` | גיבוי קוד | AWS S3 |
| `listBackups` | רשימת גיבויים | AWS S3 |
| `manualBackupTrigger` | גיבוי ידני | AWS S3 |
| `restoreBackupPreview` | תצוגה מקדימה | AWS S3 |

#### 🔍 Data Enrichment

| פונקציה | תיאור | Source |
|---------|-------|--------|
| `getCompanies` | נתוני חברות | External API |
| `getFirmographicData` | נתונים פירמוגרפיים | External API |
| `getFundingAndAcquisitionData` | נתוני מימון | External API |
| `getTechnographicsData` | נתונים טכנולוגיים | External API |
| `getFinancialManagers` | רשימת מנהלים | Internal |
| `getAssignableUsers` | משתמשים להקצאה | Internal |
| `searchCustomers` | חיפוש לקוחות | Internal |

### 6.3 Environment Variables (Secrets)

| Variable | תיאור | שימוש |
|----------|-------|-------|
| `BASE44_APP_ID` | מזהה האפליקציה | SDK |
| `BASE44_API_KEY` | מפתח API פנימי | Internal calls |
| `CLAUDE_API_KEY` | מפתח Claude/Anthropic | AI |
| `OPENAI_API_KEY` | מפתח OpenAI | AI (backup) |
| `AWS_ACCESS_KEY_ID` | AWS Access Key | S3 Backup |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret | S3 Backup |
| `S3_BUCKET_NAME` | שם Bucket | S3 Backup |
| `WHATSAPP_API_TOKEN` | טוקן WhatsApp | Messaging |
| `FIREBERRY_API_KEY` | מפתח Fireberry | CRM Sync |

---

## 7. קומפוננטות Frontend

### 7.1 מבנה התיקיות

```
src/components/
├── admin/          # 74 קומפוננטות ניהול
│   ├── ClientManagementDashboard.jsx
│   ├── DailyOfek360Checklist.jsx
│   ├── FinanceManagerPerformanceTable.jsx
│   ├── GoalBankManager.jsx
│   ├── LeadManagementSystem.jsx  # (in leads/)
│   └── ...
│
├── forecast/       # 49 קומפוננטות תחזית
│   ├── BusinessForecastManager.jsx
│   ├── ManualForecastWizard.jsx
│   ├── manual/     # תחזית ידנית
│   │   ├── Step1ServicesAndCosts.jsx
│   │   ├── Step2SalaryCosts.jsx
│   │   ├── Step3SalesForecast.jsx
│   │   ├── Step4Expenses.jsx
│   │   └── Step5ProfitLoss.jsx
│   └── project/    # תחזית פרויקט
│
├── dashboard/      # 13 קומפוננטות דשבורד
│   ├── WelcomeSection.jsx
│   ├── DailyTasks.jsx
│   ├── ClientList.jsx
│   └── OnboardingFlow.jsx
│
├── catalog/        # 13 קומפוננטות קטלוג
│   ├── ProductCatalogManager.jsx
│   ├── CatalogItemCard.jsx
│   └── CatalogProgressTracker.jsx
│
├── shared/         # 44 קומפוננטות משותפות
│   ├── LoadingScreen.jsx
│   ├── generateForecastHTML.jsx
│   ├── svgChartGenerator.js
│   ├── EmergencyChat.jsx
│   ├── ThemeContext.jsx
│   └── UsersContext.jsx
│
├── ui/             # 49 קומפוננטות UI (shadcn)
│   ├── button.jsx
│   ├── card.jsx
│   ├── dialog.jsx
│   ├── input.jsx
│   ├── table.jsx
│   └── ...
│
├── charts/         # 3 גרפים
│   ├── NivoBarChart.jsx
│   ├── NivoLineChart.jsx
│   └── NivoPieChart.jsx
│
├── goals/          # 7 קומפוננטות יעדים
│   └── GoalsTimelineNew.jsx
│
├── meetings/       # 4 קומפוננטות פגישות
│   ├── MeetingsTab.jsx
│   └── MeetingPreparation.jsx
│
├── mobile/         # 1 קומפוננטת מובייל
│   └── MobileDashboard.jsx
│
├── leads/          # 1 קומפוננטת לידים
│   └── LeadManagementSystem.jsx
│
├── upload/         # 8 קומפוננטות העלאה
│   ├── SmartFileUploader.jsx
│   └── EnhancedFileUpload.jsx
│
├── logic/          # 14 קומפוננטות לוגיקה
│   ├── activityTracker.jsx
│   ├── userEngagementTracker.jsx
│   └── targetedRecommendationEngine.jsx
│
├── analytics/      # 8 קומפוננטות אנליטיקס
│   ├── CatalogAnalyticsDashboard.jsx
│   └── ProfitabilityAnalysis.jsx
│
├── cashflow/       # 3 קומפוננטות תזרים
│   └── CashFlowManager.jsx
│
├── trial/          # 9 קומפוננטות trial
│   └── CustomerOverviewModal.jsx
│
├── organization/   # 2 קומפוננטות ארגון
│   └── OrgChart.jsx
│
├── utils/          # 6 utilities
└── animations/     # 1 אנימציה
```

### 7.2 קומפוננטות מפתח

#### Layout.jsx (עמוד 850+ שורות)

```javascript
// המבנה הראשי של האפליקציה
export default function Layout({ children, currentPageName }) {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboardingRequests, setShowOnboardingRequests] = useState(false);
  
  // Hooks
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Mobile detection - מציג MobileDashboard בגישה ממובייל
  if (isMobile) {
    return <MobileDashboard />;
  }
  
  return (
    <ThemeProvider>
      <UsersProvider>
        <LayoutContent>
          <Sidebar navigationItems={navigationItems} />
          <TopBar />
          <MainContent>{children}</MainContent>
        </LayoutContent>
      </UsersProvider>
    </ThemeProvider>
  );
}
```

#### ClientManagementDashboard.jsx

```javascript
// ממשק ניהול לקוחות מרכזי (1000+ שורות)
export default function ClientManagementDashboard({ selectedCustomerEmail }) {
  // Tabs:
  // - סקירה כללית
  // - יעדים ומשימות (GoalsAndTasksDashboard)
  // - תחזית עסקית (ManualForecastManager)
  // - צ'קליסט יומי (DailyOfek360Checklist)
  // - קבצים (CustomerFileUploadManager)
  // - ספקים (CustomerSuppliersTab)
  // - פגישות (MeetingsTab)
}
```

#### ManualForecastWizard.jsx

```javascript
// אשף תחזית ידנית (700+ שורות)
export default function ManualForecastWizard({ customerEmail, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { name: 'שירותים ועלויות', component: Step1ServicesAndCosts },
    { name: 'עלויות שכר', component: Step2SalaryCosts },
    { name: 'תחזית מכירות', component: Step3SalesForecast },
    { name: 'הוצאות', component: Step4Expenses },
    { name: 'רווח והפסד', component: Step5ProfitLoss },
  ];
  
  // Export to PDF with graphs
  const handleExportPDF = () => {
    // Opens dialog with export options
    setShowExportDialog(true);
  };
}
```

### 7.3 Context Providers

```javascript
// src/lib/AuthContext.jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Methods: logout, navigateToLogin, checkAppState
  return (
    <AuthContext.Provider value={{ user, isAuthenticated, ... }}>
      {children}
    </AuthContext.Provider>
  );
};

// src/components/shared/ThemeContext.jsx
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  // Methods: toggleTheme
};

// src/components/shared/UsersContext.jsx
export const UsersProvider = ({ children }) => {
  const { data: users } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });
};
```

---

## 8. תהליכי עבודה עסקיים

### 8.1 Onboarding לקוח חדש

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. טופס הרשמה (Make.com → onboardNewCustomer)                   │
│    • שם עסק, אימייל, טלפון                                      │
│    • סוג עסק, גודל חברה                                        │
│    • קבצים ראשוניים                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. יצירת OnboardingRequest (status: pending)                   │
│    autoOnboardingOrchestrator מופעל אוטומטית                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. אישור אדמין (approveOnboardingRequest)                       │
│    • הקצאת מנהל כספים                                           │
│    • הגדרת קבוצת לקוח                                           │
│    • יצירת משתמש User                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. עיבוד קבצים והפקת תובנות                                     │
│    • parseXlsx / processSmartDocument                           │
│    • generateCatalog                                            │
│    • orchestrateBusinessForecast                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. יצירת המלצות ויעדים ראשוניים                                 │
│    • generateStrategicRecommendations                           │
│    • generateRecurringTasks (from GoalTemplates)                │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 יצירת תחזית עסקית

```
┌─────────────────────────────────────────────────────────────────┐
│                 FORECAST GENERATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐              ┌─────────────────────┐
│  תחזית אוטומטית      │              │   תחזית ידנית       │
│  (מבוססת קבצים)      │              │  (ManualForecast)   │
└──────────┬──────────┘              └──────────┬──────────┘
           │                                     │
           ▼                                     ▼
┌─────────────────────┐              ┌─────────────────────┐
│ העלאת קבצים:        │              │ אשף 5 שלבים:        │
│ • דוחות מכירות      │              │ 1. שירותים ועלויות  │
│ • דוחות הוצאות      │              │ 2. עלויות שכר       │
│ • דוחות Z           │              │ 3. תחזית מכירות     │
│ • תזרים מזומנים     │              │ 4. הוצאות           │
└──────────┬──────────┘              │ 5. רווח והפסד       │
           │                         └──────────┬──────────┘
           ▼                                     │
┌─────────────────────┐                          │
│ עיבוד AI:           │                          │
│ generateSalesFore..│                          │
│ generateExpenseFo..│                          │
│ generateEmployeeF..│                          │
└──────────┬──────────┘                          │
           │                                     │
           └───────────────────┬─────────────────┘
                               ▼
                  ┌─────────────────────┐
                  │ BusinessForecast    │
                  │ Entity נשמר        │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ ייצוא:              │
                  │ • PDF עם גרפים      │
                  │ • Excel             │
                  │ • הדפסה             │
                  └─────────────────────┘
```

### 8.3 מעגל המלצות

```
┌───────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDATION LIFECYCLE                           │
└───────────────────────────────────────────────────────────────────────┘

    ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ pending │ ──►  │ viewed  │ ──►  │ accepted│ ──►  │ executed│
    └─────────┘      └─────────┘      └─────────┘      └─────────┘
         │                │                │                │
         │                ▼                ▼                │
         │          ┌─────────┐      ┌─────────┐           │
         └─────────►│rejected │      │in_progr │◄──────────┘
                    └─────────┘      └─────────┘
                         │
                         ▼
                    ┌─────────┐
                    │archived │
                    └─────────┘

המלצות נוצרות מ:
1. AI (generateStrategicRecommendations)
2. מנהל כספים (ידני)
3. מערכת (לפי triggers)
```

### 8.4 ניהול משימות ויעדים

```
┌───────────────────────────────────────────────────────────────────────┐
│                    GOAL/TASK MANAGEMENT                               │
└───────────────────────────────────────────────────────────────────────┘

CustomerGoal Entity:
┌─────────────────────────────────────────────────────────────────┐
│ {                                                               │
│   customer_email: "customer@example.com",                       │
│   title: "הגדלת רווחיות ב-10%",                                 │
│   task_type: "goal" | "task" | "daily_checklist_360",          │
│   status: "pending" | "in_progress" | "completed" | "cancelled",│
│   priority: "high" | "medium" | "low",                          │
│   due_date: "2026-02-15",                                       │
│   assigned_user_email: "manager@plusto.com",                    │
│   depends_on: ["goal_id_1", "goal_id_2"],                       │
│   is_repeating: true,                                           │
│   repeat_frequency: "weekly",                                   │
│   checklist_items: [                                            │
│     { id: "1", title: "...", desired_state: true, current_state: false }│
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

Goal Templates (GoalTemplate):
- מאפשרים הגדרת משימות ברירת מחדל
- משויכים לקטגוריות (quarterly_meeting, new_customer, etc.)
- נוצרים אוטומטית ללקוחות חדשים
```

---

## 9. אינטגרציות חיצוניות

### 9.1 Base44 Integrations (SDK)

```javascript
import { base44 } from '@/api/base44Client';

// AI - InvokeLLM
const response = await base44.integrations.Core.InvokeLLM({
  prompt: "Analyze this data...",
  response_json_schema: { type: "object", ... }
});

// Email
await base44.integrations.Core.SendEmail({
  to: "user@example.com",
  subject: "Subject",
  body: "<html>...</html>",
  from_name: "Plusto"
});

// SMS
await base44.integrations.Core.SendSMS({
  to: "+972501234567",
  message: "Your OTP is..."
});

// File Upload
const fileUrl = await base44.integrations.Core.UploadFile({
  file: fileBlob,
  filename: "report.xlsx"
});

// Image Generation
const imageUrl = await base44.integrations.Core.GenerateImage({
  prompt: "A professional chart showing..."
});

// Extract Data from File
const data = await base44.integrations.Core.ExtractDataFromUploadedFile({
  file_url: "https://...",
  extraction_schema: { ... }
});
```

### 9.2 Claude AI (Direct)

```typescript
// functions/invokeClaude.ts
import Anthropic from 'npm:@anthropic-ai/sdk@0.20.1';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('CLAUDE_API_KEY'),
});

const msg = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4000,
  messages: [{ role: 'user', content: prompt }],
});
```

### 9.3 AWS S3 (Backup)

```typescript
// functions/backupDatabaseToS3.ts
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: Deno.env.get('AWS_REGION'),
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
});

await s3Client.send(new PutObjectCommand({
  Bucket: Deno.env.get('S3_BUCKET_NAME'),
  Key: `backups/${date}/database.json`,
  Body: JSON.stringify(backupData),
}));
```

### 9.4 Fireberry CRM

```typescript
// functions/syncTaskToFireberry.ts
const fireberryResponse = await fetch(
  `https://api.fireberry.com/v1/tasks`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('FIREBERRY_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  }
);
```

### 9.5 WhatsApp (via API)

```typescript
// functions/sendWhatsAppMessage.ts
const response = await fetch(
  `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: { name: templateName, language: { code: 'he' } },
    }),
  }
);
```

### 9.6 Make.com Webhooks

```
Incoming Webhooks:
1. onboardNewCustomer - קבלת לקוח חדש מטופס
2. receiveLeadWebhook - קבלת ליד חדש
3. receiveWhatsAppDataWebhook - קבלת נתונים מ-WhatsApp
4. handleFireberryAccountWebhook - סנכרון מ-Fireberry
```

---

## 10. עיצוב ו-CSS

### 10.1 מערכת הצבעים (Horizon Theme)

```css
/* Light Mode */
:root {
  --horizon-primary: #1e90b0;      /* Cyan - Primary */
  --horizon-secondary: #e67e3c;    /* Orange - Secondary */
  --horizon-text: #121725;         /* Dark text */
  --horizon-accent: #5a6c7d;       /* Gray accent */
  --horizon-dark: #f8f9fa;         /* Background */
  --horizon-card-bg: #ffffff;      /* Card background */
  --horizon-green: #38A169;        /* Success */
  --horizon-red: #E53E3E;          /* Error */
  --horizon-yellow: #fc9f67;       /* Warning */
  --horizon-blue: #32acc1;         /* Info */
}

/* Dark Mode */
[data-theme="dark"] {
  --horizon-dark: #0A192F;
  --horizon-card-bg: #112240;
  --horizon-text: #ffffff;
  --horizon-accent: #cbd5e0;
}
```

### 10.2 Tailwind Classes נפוצות

```javascript
// Backgrounds
"bg-horizon-dark"      // רקע ראשי
"bg-horizon-card"      // רקע כרטיס
"bg-horizon-primary"   // רקע ראשי (כפתורים)
"bg-horizon-secondary" // רקע משני

// Text
"text-horizon-text"    // טקסט רגיל
"text-horizon-accent"  // טקסט משני
"text-horizon-primary" // טקסט מודגש

// Components
"card-horizon"         // כרטיס עם אפקט hover
"btn-horizon-primary"  // כפתור ראשי עם gradient
```

### 10.3 קומפוננטות UI (shadcn/ui)

כל קומפוננטות ה-UI נמצאות ב-`src/components/ui/`:

```javascript
// Buttons
import { Button } from "@/components/ui/button";
<Button variant="default|outline|ghost|link" size="sm|default|lg" />

// Cards
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dialogs
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Forms
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tables
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

---

## 11. ניהול גרסאות ועדכון המערכת

### 11.1 סביבת הפיתוח

```bash
# Clone the repository
git clone https://github.com/jonny-1812/plusto.git
cd plusto

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### 11.2 העלאת עדכונים

```bash
# 1. בדיקת שינויים
git status

# 2. הוספת קבצים
git add -A

# 3. Commit עם הודעה תיאורית
git commit -m "תיאור השינוי בעברית"

# 4. Push ל-GitHub
git push origin main
```

### 11.3 Deployment (Base44)

**Base44 מבצע deploy אוטומטי:**

1. Push ל-GitHub main branch
2. Base44 מזהה שינויים
3. Build אוטומטי
4. Deploy לסביבת Production

**לבדיקת Preview:**
- Base44 Console → Preview
- URL: `https://preview-sandbox--{app_id}.base44.app/`

### 11.4 ניהול Functions

**העלאת/עדכון Function:**

1. עריכת הקובץ ב-`functions/`
2. Push ל-GitHub
3. Base44 Console → Functions
4. לחיצה על "Sync Functions"

**בדיקת לוגים:**
- Base44 Console → Functions → בחירת Function → Logs

### 11.5 גיבויים

**גיבוי אוטומטי:**
- Cron job שרץ יומית
- `backupDatabaseToS3` - גיבוי כל ה-Entities
- `backupCodeToS3` - גיבוי קוד המקור

**גיבוי ידני:**
- Admin → System → Backup Now
- מפעיל את `manualBackupTrigger`

---

## 12. רשימת תיוג לחפיפה

### ✅ שלב 1: הבנת הארכיטקטורה

- [ ] קראתי והבנתי את מבנה התיקיות
- [ ] הבנתי את החלוקה בין Frontend ל-Backend
- [ ] מכיר את פלטפורמת Base44
- [ ] מבין את מערכת ה-Entities
- [ ] מבין את מנגנון ה-Functions

### ✅ שלב 2: סביבת פיתוח

- [ ] Clone הפרויקט בהצלחה
- [ ] הרצתי `npm install`
- [ ] הרצתי `npm run dev` בהצלחה
- [ ] יש לי גישה ל-Base44 Console
- [ ] יש לי גישה ל-GitHub Repository

### ✅ שלב 3: הבנת ה-Entities

- [ ] מכיר את Entity User
- [ ] מכיר את Entity OnboardingRequest
- [ ] מכיר את Entity BusinessForecast
- [ ] מכיר את Entity CustomerGoal
- [ ] מכיר את Entity Recommendation
- [ ] מכיר את Entity Catalog
- [ ] מכיר את Entity Lead
- [ ] מכיר את Entity FileUpload

### ✅ שלב 4: הבנת הקומפוננטות המרכזיות

- [ ] מבין את Layout.jsx
- [ ] מבין את Admin.jsx
- [ ] מבין את Dashboard.jsx
- [ ] מבין את ClientManagementDashboard.jsx
- [ ] מבין את ManualForecastWizard.jsx
- [ ] מבין את GoalsAndTasksDashboard.jsx

### ✅ שלב 5: הבנת ה-Functions

- [ ] מבין את onboardNewCustomer
- [ ] מבין את orchestrateBusinessForecast
- [ ] מבין את generateCatalog
- [ ] מבין את invokeClaude
- [ ] מבין את backupDatabaseToS3

### ✅ שלב 6: הבנת מערכת ההרשאות

- [ ] מבין את ההבדל בין Admin, Financial Manager, User
- [ ] מבין איך לסנן נתונים לפי הרשאות
- [ ] מבין את AuthContext

### ✅ שלב 7: הבנת האינטגרציות

- [ ] מבין את השימוש ב-InvokeLLM
- [ ] מבין את השימוש ב-SendEmail
- [ ] מבין את החיבור ל-AWS S3
- [ ] מבין את החיבור ל-WhatsApp
- [ ] מבין את החיבור ל-Fireberry

### ✅ שלב 8: יכולת פיתוח עצמאית

- [ ] יצרתי קומפוננטה חדשה בהצלחה
- [ ] עדכנתי Entity קיים
- [ ] יצרתי Function חדש
- [ ] ביצעתי Deploy בהצלחה
- [ ] פתרתי באג ללא עזרה

---

## 13. תובנות אישיות והמלצות

### 13.1 נקודות חוזק של המערכת

1. **ארכיטקטורה מודולרית** - הפרדה ברורה בין קומפוננטות
2. **שימוש ב-React Query** - ניהול state יעיל ו-caching
3. **Base44 Platform** - פיתוח מהיר ללא צורך ב-DevOps
4. **עיצוב עקבי** - מערכת צבעים ו-components אחידה
5. **תמיכה ב-RTL** - מותאם לעברית

### 13.2 נקודות לשיפור

1. **TypeScript** - רוב הקוד ב-JavaScript, מומלץ להמיר
2. **Testing** - אין בדיקות אוטומטיות
3. **Documentation** - תיעוד בתוך הקוד (JSDoc) חסר
4. **Error Handling** - לא עקבי בכל הקומפוננטות
5. **Performance** - כמה קומפוננטות כבדות מדי (Admin.jsx)

### 13.3 המלצות לפיתוח עתידי

1. **פיצול קומפוננטות גדולות** - Admin.jsx (4300+ שורות) צריך פיצול
2. **הוספת Unit Tests** - במיוחד ל-Functions
3. **מעבר ל-TypeScript** - לפחות בקומפוננטות חדשות
4. **Storybook** - לתיעוד קומפוננטות UI
5. **Error Boundaries** - להוסיף לכל קומפוננטה ראשית

### 13.4 קיצורי דרך שימושיים

```javascript
// יצירת Entity חדש
await base44.entities.EntityName.create({ ...data });

// שליפה עם פילטר
await base44.entities.EntityName.filter({ field: value });

// שליחת הודעה ל-AI
await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema });

// Query with React Query
const { data, isLoading, refetch } = useQuery({
  queryKey: ['key'],
  queryFn: () => fetchData(),
});
```

### 13.5 בעיות נפוצות ופתרונות

| בעיה | פתרון |
|------|-------|
| `@/entities/X` לא נמצא | זה alias, צריך base44 plugin ב-vite |
| Function לא עובדת | בדוק לוגים ב-Base44 Console |
| Entity לא נשמר | בדוק את הסכימה ב-Console |
| Auth שגיאה | בדוק token ב-localStorage |
| Mobile לא עובד | בדוק `useIsMobile` hook |

---

## נספחים

### נספח א': מילון מונחים

| מונח | הסבר |
|------|------|
| Entity | טבלה/אוסף נתונים ב-Base44 |
| Function | פונקציית serverless (Deno) |
| Integration | שירות חיצוני (AI, Email) |
| OnboardingRequest | בקשת הצטרפות של לקוח חדש |
| CustomerGoal | יעד/משימה של לקוח |
| BusinessForecast | תחזית עסקית (הכנסות, הוצאות, רווח) |
| Catalog | קטלוג מוצרים חכם |

### נספח ב': קישורים שימושיים

- [Base44 Documentation](https://docs.base44.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev/icons)

---

**מסמך זה נכתב ב-24/01/2026 ומשקף את מצב המערכת נכון לתאריך זה.**
**יש לעדכן את המסמך בכל שינוי משמעותי בארכיטקטורה.**
