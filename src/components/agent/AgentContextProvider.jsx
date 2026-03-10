import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// מיפוי route → שם עמוד בעברית (לשימוש ב-system prompt של האייגנט)
const PAGE_NAMES = {
  '/Dashboard': 'דשבורד',
  '/Clients': 'ניהול לקוחות',
  '/CustomerManagement': 'ניהול לקוחות',
  '/CustomerManagementNew': 'ניהול לקוחות',
  '/Tasks': 'משימות ויעדים',
  '/TaskManagement': 'משימות ויעדים',
  '/Calendar': 'לוח שנה',
  '/CalendarPage': 'לוח שנה',
  '/BusinessForecast': 'תחזית עסקית',
  '/FinancialFlow': 'תזרים מזומנים',
  '/Recommendations': 'המלצות',
  '/StrategicMoves': 'צעדים אסטרטגיים',
  '/FileUpload': 'העלאת קבצים',
  '/FailedUploads': 'קבצים שנכשלו',
  '/ProductCatalog': 'קטלוג מוצרים',
  '/CatalogPage': 'קטלוג',
  '/SupplierAnalysis': 'ניתוח ספקים',
  '/LeadIntakeManagement': 'ניהול לידים',
  '/MyLeads': 'הלידים שלי',
  '/Promotions': 'מבצעים',
  '/Engagement': 'מעורבות ופידבק',
  '/ExportData': 'ייצוא נתונים',
  '/Reports': 'דוחות',
  '/Admin': 'ניהול מערכת',
  '/Settings': 'הגדרות',
  '/FMPerformance': 'ביצועי מנהלי כספים',
};

const AgentContext = createContext(null);

export function AgentContextProvider({ children }) {
  const location = useLocation();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pageContext, setPageContext] = useState({});

  // שם העמוד הנוכחי — נגזר אוטומטית מה-URL
  const currentPageName = PAGE_NAMES[location.pathname] || '';

  // כשמשנים עמוד — מנקים את ה-customer context (אם הוא לא רלוונטי לעמוד החדש)
  useEffect(() => {
    setPageContext({});
  }, [location.pathname]);

  const value = {
    currentPageName,
    currentPath: location.pathname,
    selectedCustomer,
    setSelectedCustomer,
    pageContext,
    setPageContext,
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const ctx = useContext(AgentContext);
  // אם אין provider — מחזיר ערכי ברירת מחדל (לא שובר את האפליקציה)
  if (!ctx) {
    return {
      currentPageName: '',
      currentPath: '',
      selectedCustomer: null,
      setSelectedCustomer: () => {},
      pageContext: {},
      setPageContext: () => {},
    };
  }
  return ctx;
}
