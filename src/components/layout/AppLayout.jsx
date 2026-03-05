import React, { useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackActivity } from "@/components/logic/userEngagementTracker";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { useTheme } from "@/components/shared/ThemeContext";
import MobileDashboard from "@/components/mobile/MobileDashboard";
import TopBarActions from "@/components/shared/TopBarActions";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

/**
 * AppLayout — ה-wrapper הראשי של האפליקציה.
 * מטפל ב: auth redirects, role-based rendering, sidebar + topbar, mobile.
 * מחליף את LayoutContent הישן מ-Layout.jsx (1,045 שורות → ~200 שורות).
 */
/**
 * ממפה user object ל-role אחיד (backward compat עם user_type הישן)
 */
function getEffectiveRole(user) {
  if (!user) return null;
  // role חדש (5-value system)
  if (user.role && !['user'].includes(user.role)) return user.role;
  // fallback מ-user_type הישן
  if (user.role === 'admin') return 'admin';
  if (user.user_type === 'financial_manager') return 'financial_manager';
  if (user.user_type === 'supplier_user') return 'supplier_user';
  if (user.user_type === 'regular') return 'client';
  return 'client';
}

export default function AppLayout({ children }) {
  const location = useLocation();
  const { user, isLoadingAuth } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileView, setShowMobileView] = useState(true);
  const isMobile = useIsMobile();

  // Theme — תמיד זמין כי AppLayout רץ בתוך ThemeProvider (ב-Layout.jsx)
  const { theme, toggleTheme, isDark } = useTheme();

  // עדכון last_activity + טעינת notifications (פעם אחת כש-user נטען)
  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(async () => {
      try {
        await supabase
          .from("profiles")
          .update({ last_activity: new Date().toISOString() })
          .eq("id", user.id);
        await trackActivity("LOGIN", { userEmail: user.email });
      } catch (error) {
        console.error("[AppLayout] Error updating activity:", error);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/Welcome";
  };

  // --- Loading ---
  if (isLoadingAuth) {
    return <LoadingScreen message="טוען את המערכת..." />;
  }

  // --- Auth Redirects ---
  const publicRoutes = ["/Welcome", "/PendingApproval"];
  const isPublicRoute = publicRoutes.some((r) => location.pathname.startsWith(r));

  if (!user && !isPublicRoute) {
    return <Navigate to="/Welcome" replace />;
  }

  const effectiveRole = getEffectiveRole(user);

  // משתמש מחובר בדף Welcome → redirect לפי סטטוס אישור ו-role
  if (user && location.pathname === "/Welcome") {
    // admin/super_admin — תמיד לדשבורד
    if (['admin', 'super_admin'].includes(effectiveRole)) {
      return <Navigate to="/Dashboard" replace />;
    }
    // לא מאושר — לדף המתנה
    if (!user.is_approved_by_admin) {
      return <Navigate to="/PendingApproval" replace />;
    }
    // מאושר — redirect לפי role
    if (effectiveRole === 'supplier_user') {
      return <Navigate to="/MyLeads" replace />;
    }
    return <Navigate to="/Dashboard" replace />;
  }

  // משתמש לא מאושר (שלא admin) — חסימה לכל דף חוץ מ-PendingApproval
  if (
    user &&
    !user.is_approved_by_admin &&
    !['admin', 'super_admin'].includes(effectiveRole) &&
    location.pathname !== "/PendingApproval"
  ) {
    return <Navigate to="/PendingApproval" replace />;
  }

  // --- Public / System Routes (ללא sidebar) ---
  if (isPublicRoute || location.pathname === "/PendingApproval") {
    return <>{children}</>;
  }

  // --- Supplier Layout (header בלבד) ---
  if (user && effectiveRole === "supplier_user") {
    return (
      <div dir="rtl" className="min-h-screen bg-horizon-dark" data-theme={theme}>
        <Toaster position="bottom-left" richColors dir="rtl" duration={5000} />
        <header className="bg-horizon-card shadow-sm border-b border-horizon">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-xl font-bold text-horizon-text">
                פלטפורמת ספקים - Plusto
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-horizon-accent">
                  שלום, {user.full_name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-red-500 hover:text-red-400 text-sm"
                >
                  התנתק
                </button>
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  // --- Mobile Dashboard (FM/Admin בדף הבית) ---
  const isHomePage =
    location.pathname === "/" ||
    location.pathname === "/Dashboard" ||
    location.pathname === "/Admin";

  if (isMobile && showMobileView && isHomePage) {
    return (
      <div data-theme={theme}>
        <Toaster position="bottom-left" richColors dir="rtl" duration={5000} />
        <MobileDashboard currentUser={user} onLogout={handleLogout} />
        <button
          onClick={() => setShowMobileView(false)}
          className="fixed bottom-20 left-4 bg-horizon-card border border-horizon rounded-full px-4 py-2 text-xs text-horizon-accent shadow-lg z-50"
        >
          ממשק מלא
        </button>
      </div>
    );
  }

  // --- Main Layout: Sidebar + TopBar + Content ---
  return (
    <TooltipProvider>
      <div dir="rtl" className="min-h-screen bg-horizon-dark" data-theme={theme}>
        <Toaster position="bottom-left" richColors dir="rtl" duration={5000} />

        <div className="min-h-screen flex">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            user={user}
          />

          <main className="flex-1 flex flex-col min-h-screen relative">
            <TopBar
              user={user}
              onOpenSidebar={() => setIsSidebarOpen(true)}
            />

            <div className="flex-1">{children}</div>

            {/* כפתור חזרה למובייל */}
            {isMobile && !showMobileView && (
              <button
                onClick={() => setShowMobileView(true)}
                className="fixed bottom-6 left-6 bg-horizon-card border border-horizon rounded-full px-4 py-2 text-xs text-horizon-accent shadow-lg z-50"
              >
                תצוגת מובייל
              </button>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
