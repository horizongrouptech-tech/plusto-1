import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  BarChart3,
  Settings,
  TrendingUp,
  LogOut,
  X,
  ShieldCheck,
  Activity,
  FileX,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/components/shared/ThemeContext";
import NotificationCenter from "@/components/shared/NotificationCenter";

// 6 פריטי ניווט ראשיים — עם הרשאות לפי role
// roles: 'all' = כולם, או רשימת roles ספציפיים
const navigationItems = [
  { title: "דשבורד", url: "/Dashboard", icon: LayoutDashboard, description: "מרכז הפיקוד היומי", roles: ["all"] },
  { title: "לקוחות", url: "/Clients", icon: Users, description: "ניהול לקוחות ופרופילים", roles: ["super_admin", "admin", "department_manager", "financial_manager"] },
  { title: "משימות", url: "/Tasks", icon: CheckSquare, description: "משימות חוצות-לקוחות", roles: ["super_admin", "admin", "department_manager", "financial_manager"] },
  { title: "לוח שנה", url: "/Calendar", icon: Calendar, description: "פגישות ותזמון", roles: ["all"] },
  { title: "דוחות", url: "/Reports", icon: BarChart3, description: "אנליטיקס וביצועים", roles: ["super_admin", "admin", "department_manager"] },
  { title: "אישור משתמשים", url: "/UserApproval", icon: ShieldCheck, description: "אישור משתמשים חדשים", roles: ["super_admin", "admin", "department_manager"] },
  { title: "ביצועי מנהלים", url: "/FMPerformance", icon: TrendingUp, description: "ביצועי מנהלי כספים", roles: ["super_admin", "admin"] },
  { title: "מעורבות ופידבק", url: "/Engagement", icon: Activity, description: "מעורבות משתמשים ופידבק", roles: ["super_admin", "admin"] },
  { title: "קבצים שנכשלו", url: "/FailedUploads", icon: FileX, description: "ניהול העלאות שנכשלו", roles: ["super_admin", "admin"] },
  { title: "הגדרות", url: "/Settings", icon: Settings, description: "הגדרות, פרופיל, משתמשים", roles: ["all"] }
];

/**
 * ממפה user ל-role אחיד (backward compat)
 */
function getEffectiveRole(user) {
  if (!user) return 'client';
  if (user.role && !['user'].includes(user.role)) return user.role;
  if (user.role === 'admin') return 'admin';
  if (user.user_type === 'financial_manager') return 'financial_manager';
  if (user.user_type === 'supplier_user') return 'supplier_user';
  if (user.user_type === 'regular') return 'client';
  return 'client';
}

// סגנון sidebar — תמיד כהה, ללא תלות ב-theme או CSS variables
const SIDEBAR = {
  bg: "linear-gradient(180deg, #0d1f3c 0%, #0A192F 100%)",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  hover: "rgba(255, 255, 255, 0.06)",
  active: "linear-gradient(135deg, #32acc1, #1e90b0)",
  activeShadow: "0 4px 12px rgba(50, 172, 193, 0.3)",
};

export default function Sidebar({ isOpen, onClose, user }) {
  const location = useLocation();
  const effectiveRole = getEffectiveRole(user);
  const { isDark, toggleTheme } = useTheme();

  // פילטור פריטים לפי role
  const visibleItems = navigationItems.filter(
    item => item.roles.includes("all") || item.roles.includes(effectiveRole)
  );

  const handleLogout = async () => {
    const { supabase } = await import("@/api/supabaseClient");
    await supabase.auth.signOut();
    window.location.href = "/Welcome";
  };

  return (
    <>
      {/* Backdrop — רק במובייל */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — תמיד כהה, ערכים ישירים */}
      <aside
        className={`
          fixed top-0 right-0 h-[100dvh] w-[280px] z-50
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shrink-0
          flex flex-col overflow-hidden
        `}
        style={{
          background: SIDEBAR.bg,
          borderLeft: `1px solid ${SIDEBAR.border}`,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)"
        }}
        aria-label="תפריט ניווט ראשי"
      >
        {/* Logo + Branding */}
        <div className="p-5" style={{ borderBottom: `1px solid ${SIDEBAR.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: SIDEBAR.active }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-white tracking-wide">Plusto</h2>
                <p className="text-xs" style={{ color: SIDEBAR.textMuted }}>מערכת חכמה לרווחיות</p>
              </div>
            </div>
            {/* כפתור סגירה — רק במובייל */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: SIDEBAR.textMuted }}
              aria-label="סגור תפריט"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* פרטי משתמש */}
          {user && (
            <div className="mt-4 flex items-center gap-3 px-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: SIDEBAR.active }}
              >
                {(user.full_name || user.business_name || "?").charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {user.business_name || user.full_name}
                </div>
                <div className="text-xs" style={{ color: SIDEBAR.textMuted }}>
                  {user.business_type === "wholesale" ? "סיטונאי" : user.business_type || "כללי"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex-grow overflow-y-auto" aria-label="ניווט ראשי">
          <div className="mb-2">
            <h3
              className="text-[10px] font-semibold uppercase tracking-widest px-3 py-2"
              style={{ color: SIDEBAR.textDim }}
            >
              ניהול עסק
            </h3>
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={onClose}
                    title={item.description}
                    aria-current={isActive ? "page" : undefined}
                    className="sidebar-nav-item flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200"
                    style={
                      isActive
                        ? {
                            background: SIDEBAR.active,
                            boxShadow: SIDEBAR.activeShadow,
                            color: "#fff",
                            fontWeight: 600
                          }
                        : { color: SIDEBAR.text }
                    }
                  >
                    <item.icon className="w-[18px] h-[18px]" style={isActive ? undefined : { color: SIDEBAR.textMuted }} />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="mt-auto" style={{ borderTop: `1px solid ${SIDEBAR.border}` }}>
          {/* User profile — לינק להגדרות */}
          {user && (
            <Link
              to="/Settings"
              onClick={onClose}
              className="flex items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-white/[0.04]"
              style={{ color: SIDEBAR.text }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: SIDEBAR.active }}
              >
                {(user.full_name || "?").charAt(0)}
              </div>
              <div className="min-w-0 flex-1 text-right">
                <div className="text-sm font-medium truncate">{user.full_name}</div>
                <div className="text-[11px] truncate" style={{ color: SIDEBAR.textDim }}>{user.email}</div>
              </div>
            </Link>
          )}

          {/* Action bar — אייקונים בשורה אחת */}
          <div
            className="flex items-center justify-around px-4 py-2"
            style={{ borderTop: `1px solid ${SIDEBAR.border}` }}
          >
            {user && <NotificationCenter user={user} />}

            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-white/[0.08] cursor-pointer"
              style={{ color: SIDEBAR.textMuted }}
              title={isDark ? "עבור למצב בהיר" : "עבור למצב כהה"}
              aria-label={isDark ? "עבור למצב בהיר" : "עבור למצב כהה"}
            >
              {isDark ? <Sun className="w-[18px] h-[18px] text-yellow-400" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>

            {user && (
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-red-500/15 cursor-pointer group"
                style={{ color: SIDEBAR.textMuted }}
                title="התנתק"
                aria-label="התנתק"
              >
                <LogOut className="w-[18px] h-[18px] group-hover:text-red-400 transition-colors" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
