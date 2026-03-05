import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import TopBarActions from "@/components/shared/TopBarActions";

// מיפוי route → כותרת עמוד
const pageTitles = {
  "/Dashboard": "דשבורד",
  "/Clients": "לקוחות",
  "/Tasks": "משימות",
  "/Calendar": "לוח שנה",
  "/Reports": "דוחות",
  "/Settings": "הגדרות",
  "/Admin": "ניהול מערכת",
  "/CustomerManagementNew": "ניהול לקוחות",
  "/BusinessForecast": "תחזית עסקית",
  "/ExportData": "ייצוא נתונים",
  "/InitialSetup": "הגדרה ראשונית",
  "/PendingApproval": "ממתין לאישור",
  "/UserApproval": "אישור משתמשים",
  "/FMPerformance": "ביצועי מנהלי כספים",
  "/Engagement": "מעורבות ופידבק",
  "/FailedUploads": "קבצים שנכשלו",
};

export default function TopBar({ user, onOpenSidebar }) {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || "דשבורד";

  return (
    <header className="bg-horizon-card/80 backdrop-blur-sm border-b border-horizon px-4 sm:px-6 py-2 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* כפתור פתיחת sidebar — רק במובייל, מינימום 44x44 touch target */}
          <button
            onClick={onOpenSidebar}
            className="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg text-horizon-text hover:bg-horizon-card transition-colors cursor-pointer"
            aria-label="פתח תפריט ניווט"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* כותרת דף — תמיד מוצגת (גם במובייל) */}
          <h1 className="text-base sm:text-lg font-bold text-horizon-text truncate">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {user && <TopBarActions user={user} />}
        </div>
      </div>
    </header>
  );
}
