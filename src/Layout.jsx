import React, { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Upload,
  PlusCircle,
  Lightbulb,
  LogOut,
  TrendingUp,
  Menu,
  X,
  Users,
  Package,
  HelpCircle,
  Phone,
  Mail,
  ScanSearch,
  DollarSign,
  Loader2,
  ShieldAlert,
  Tag,
  User as UserIcon,
  BarChart3,
  Handshake,
  MessageSquare,
  FileUp,
  Truck,
  Building2,
  Briefcase,
  Zap,
  LifeBuoy,
  Bell,
  Home,
  Settings,
  ChevronDown,
  RefreshCw,
  Bot,
  Target,
  FileQuestion,
  Building,
  Plane,
  Heart,
  BrainCircuit,
  FileCheck2,
  ListChecks,
  AreaChart,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { trackActivity } from "./components/logic/userEngagementTracker";
import EmergencyChat from "./components/shared/EmergencyChat";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import OnboardingRequestsModal from "@/components/admin/OnboardingRequestsModal";
import MissingDocumentsModal from "@/components/admin/MissingDocumentsModal";
import TopBarActions from "@/components/shared/TopBarActions";
import LoadingScreen from "./components/shared/LoadingScreen";
import { ThemeProvider, useTheme } from "./components/shared/ThemeContext";
import { UsersProvider } from "./components/shared/UsersContext";
import MobileDashboard from "./components/mobile/MobileDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/sonner";

const navigationItems = [
  {
    title: "דשבורד",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    available: true
  },
  {
    title: "העלאת קבצים",
    url: createPageUrl("FileUpload"),
    icon: FileUp,
    available: true,
    description: 'העלה נתוני עסק, מוצרים ומבצעים'
  },
  {
    title: "הוספת מוצר",
    url: createPageUrl("AddProduct"),
    icon: PlusCircle,
    available: true
  },
  {
    title: "ניהול מוצרים",
    url: createPageUrl("ManageProducts"),
    icon: Package,
    available: true
  },
  {
    title: "קטלוג מוצרים",
    url: createPageUrl("ProductCatalog"),
    icon: Package,
    available: true,
    description: 'קטלוג מוצרים חכם עם חישובי רווח'
  },
  {
    title: "סריקת אתר",
    url: createPageUrl("WebsiteScan"),
    icon: ScanSearch,
    available: true
  },
  {
    title: "ניהול מבצעים",
    url: createPageUrl("Promotions"),
    icon: Tag,
    available: true,
    description: "צפייה וניהול מבצעים שהועלו"
  },
  {
    title: "תחזית עסקית",
    url: createPageUrl("BusinessForecast"),
    icon: TrendingUp,
    available: true,
    description: 'תכנון והזנת תחזיות פיננסיות'
  },
  {
    title: "מסע הכסף - בקרוב...",
    url: createPageUrl("FinancialFlow"),
    icon: DollarSign,
    available: false
  },
  {
    title: "המלצות",
    url: createPageUrl("Recommendations"),
    icon: Lightbulb,
    available: true
  },
  {
    title: "ניתוח ספקים",
    url: createPageUrl("SupplierAnalysis"),
    icon: Users,
    available: true
  },
  {
    title: "ניהול חשבונות",
    url: createPageUrl("AccountManagement"),
    icon: UserIcon,
    available: true
  },
  {
    title: "ניתוח מתחרים",
    url: createPageUrl("CompetitorAnalysis"),
    icon: BarChart3,
    available: true
  },
  {
    title: "קשרי לקוחות",
    url: createPageUrl("CustomerRelations"),
    icon: Handshake,
    available: true
  },
  {
    title: "תקשורת שיווקית",
    url: createPageUrl("MarketingCommunication"),
    icon: MessageSquare,
    available: true
  },
  {
    title: "לוגיסטיקה ומשלוחים",
    url: createPageUrl("LogisticsShipping"),
    icon: Truck,
    available: true
  },
  {
    title: "ניהול נדל״ן",
    url: createPageUrl("RealEstateManagement"),
    icon: Building2,
    available: true
  },
  {
    title: "אוטומציה עסקית",
    url: createPageUrl("BusinessAutomation"),
    icon: Zap,
    available: true
  },
  {
    title: "תמיכה טכנית",
    url: createPageUrl("TechnicalSupport"),
    icon: LifeBuoy,
    available: true
  }
];

const footerNavigationItems = [
  {
    title: "שאלות נפוצות",
    url: createPageUrl("FAQ"),
    icon: HelpCircle,
  },
  {
    title: "צור קשר",
    url: createPageUrl("Contact"),
    icon: Phone,
  },
  {
    title: "פניית תמיכה",
    url: createPageUrl("SupportTicket"),
    icon: Mail,
  }
];

// Global Theme Styles Component
function GlobalThemeStyles() {
  return (
    <style>
      {`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&family=Rubik:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');

        /* Light Mode (Default) */
        :root,
        [data-theme="light"] {
          --horizon-dark: #f8f9fa;
          --horizon-card-bg: #ffffff;
          --horizon-border: #e1e8ed;
          
          --horizon-primary: #32acc1;
          --horizon-secondary: #fc9f67;
          
          --horizon-text: #121725;
          --horizon-accent: #5a6c7d;
          
          --horizon-green: #38A169;
          --horizon-red: #E53E3E;
          --horizon-yellow: #fc9f67;
          --horizon-blue: #32acc1;
          
          --gradient-primary: linear-gradient(135deg, #32acc1 0%, #83ddec 100%);
          --gradient-secondary: linear-gradient(135deg, #fc9f67 0%, #fc8a68 100%);
          --gradient-card: linear-gradient(135deg, rgba(50, 172, 193, 0.03) 0%, rgba(252, 159, 103, 0.03) 100%);
          --gradient-bg: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
          --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
          --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
          --shadow-xl: 0 12px 32px rgba(50, 172, 193, 0.2);
          --shadow-horizon: 0 4px 14px 0 rgba(0, 0, 0, 0.1);
          --shadow-horizon-strong: 0 10px 30px 0 rgba(0, 0, 0, 0.2);
          
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
          
          --transition-fast: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          --transition-base: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          --transition-slow: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Dark Mode - Based on Welcome Page */
        [data-theme="dark"] {
          --horizon-dark: #0A192F;
          --horizon-card-bg: #112240;
          --horizon-border: rgba(255, 255, 255, 0.1);
          
          --horizon-primary: #32acc1;
          --horizon-secondary: #fc9f67;
          
          --horizon-text: #ffffff;
          --horizon-accent: #cbd5e0;
          
          --horizon-green: #48BB78;
          --horizon-red: #FC8181;
          --horizon-yellow: #fc9f67;
          --horizon-blue: #63B3ED;
          
          --gradient-primary: linear-gradient(135deg, #32acc1 0%, #83ddec 100%);
          --gradient-secondary: linear-gradient(135deg, #fc9f67 0%, #fc8a68 100%);
          --gradient-card: linear-gradient(135deg, rgba(50, 172, 193, 0.05) 0%, rgba(252, 159, 103, 0.05) 100%);
          --gradient-bg: linear-gradient(135deg, #0A192F 0%, #112240 50%, #0A192F 100%);
          
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
          --shadow-xl: 0 12px 32px rgba(50, 172, 193, 0.3);
          --shadow-horizon: 0 4px 14px 0 rgba(0, 0, 0, 0.3);
          --shadow-horizon-strong: 0 10px 30px 0 rgba(0, 0, 0, 0.5);
        }

        /* Utility Classes */
        .bg-horizon-primary { background-color: var(--horizon-primary); }
        .bg-horizon-secondary { background-color: var(--horizon-secondary); }
        .bg-horizon-dark { background-color: var(--horizon-dark); }
        .bg-horizon-card { background-color: var(--horizon-card-bg); }

        .text-horizon-primary { color: var(--horizon-primary); }
        .text-horizon-secondary { color: var(--horizon-secondary); }
        .text-horizon-dark { color: var(--horizon-dark); }
        .text-horizon-text { color: var(--horizon-text); }
        .text-horizon-accent { color: var(--horizon-accent); }

        .border-horizon { border-color: var(--horizon-border); }
        .border-horizon-primary { border-color: var(--horizon-primary); }

        /* Button Styles */
        .btn-horizon-primary {
          background: linear-gradient(135deg, #fc9f67 0%, #fc8a68 100%);
          color: #FFFFFF;
          border: none;
          font-weight: 700;
          padding: 12px 24px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          transition: var(--transition-base);
          position: relative;
          overflow: hidden;
        }

        .btn-horizon-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #fc8a68 0%, #fc9f67 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 0;
        }

        .btn-horizon-primary:hover::before {
          opacity: 1;
        }

        .btn-horizon-primary:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: var(--shadow-xl);
        }

        .btn-horizon-primary:active {
          transform: translateY(0) scale(0.98);
        }

        .btn-horizon-primary > * {
          position: relative;
          z-index: 1;
        }

        /* Card Styles */
        .card-horizon {
          background: var(--horizon-card-bg);
          border: 2px solid var(--horizon-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          transition: var(--transition-base);
          color: var(--horizon-text);
          position: relative;
          overflow: hidden;
        }

        .card-horizon::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--gradient-primary);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-horizon:hover::before {
          transform: scaleX(1);
        }

        .card-horizon:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-4px);
          border-color: var(--horizon-primary);
        }

        /* Typography */
        body {
          font-family: 'Inter', 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 400;
          line-height: 1.6;
          background-color: var(--horizon-dark);
          color: var(--horizon-text);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        h1, h2, h3, h4, h5, h6 {
          font-weight: 600;
          color: var(--horizon-text);
        }

        /* Sidebar Styles */
        .sidebar-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 40;
        }

        .sidebar {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 280px;
          background: var(--horizon-dark);
          border-left: 1px solid var(--horizon-border);
          transform: translateX(100%);
          transition: transform 0.3s ease;
          z-index: 50;
          overflow-y: auto;
        }

        .sidebar.open {
          transform: translateX(0);
        }

        @media (min-width: 1024px) {
          .sidebar {
            position: relative;
            transform: translateX(0);
            border-left: none;
            border-right: 1px solid var(--horizon-border);
          }

          .sidebar-backdrop {
            display: none;
          }
        }

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
        }

        .animate-fadeInScale {
          animation: fadeInScale 0.4s ease-out;
        }

        .stagger-item {
          opacity: 0;
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .stagger-item:nth-child(1) { animation-delay: 0.05s; }
        .stagger-item:nth-child(2) { animation-delay: 0.1s; }
        .stagger-item:nth-child(3) { animation-delay: 0.15s; }
        .stagger-item:nth-child(4) { animation-delay: 0.2s; }
        .stagger-item:nth-child(5) { animation-delay: 0.25s; }

        .hover-lift {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hover-lift:hover {
          transform: translateY(-4px);
        }

        .hover-scale {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hover-scale:hover {
          transform: scale(1.05);
        }

        /* Scrollbar Styles */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: var(--horizon-dark);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--horizon-border);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--horizon-accent);
        }

        html {
          scrollbar-width: thin;
          scrollbar-color: var(--horizon-border) var(--horizon-dark);
        }

        /* Theme Toggle Button */
        .theme-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--horizon-card-bg);
          border: 1px solid var(--horizon-border);
          color: var(--horizon-text);
          cursor: pointer;
          transition: var(--transition-base);
        }

        .theme-toggle-btn:hover {
          background: var(--horizon-primary);
          color: #ffffff;
          transform: rotate(15deg) scale(1.1);
        }

        .theme-toggle-btn svg {
          transition: transform 0.3s ease;
        }

        .theme-toggle-btn:hover svg {
          transform: rotate(-15deg);
        }

        /* Dark Mode Enhancements */
        [data-theme="dark"] .bg-horizon-dark {
          background: linear-gradient(135deg, #0A192F 0%, #112240 50%, #0A192F 100%);
        }

        [data-theme="dark"] .card-horizon {
          background: rgba(17, 34, 64, 0.8);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        [data-theme="dark"] input,
        [data-theme="dark"] textarea,
        [data-theme="dark"] select {
          background-color: var(--horizon-card-bg);
          border-color: var(--horizon-border);
          color: var(--horizon-text);
        }

        [data-theme="dark"] input::placeholder,
        [data-theme="dark"] textarea::placeholder {
          color: var(--horizon-accent);
        }

        /* Gradient Background */
        .horizon-gradient {
          background: var(--gradient-primary);
        }

        .horizon-gradient-secondary {
          background: var(--gradient-secondary);
        }
      `}
    </style>
  );
}

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showMobileView, setShowMobileView] = useState(true);
  
  // בדיקת מובייל
  const isMobile = useIsMobile();
  
  // Safe theme hook usage - only use if available
  let theme = 'light';
  let toggleTheme = () => {};
  let isDark = false;
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    toggleTheme = themeContext.toggleTheme;
    isDark = themeContext.isDark;
  } catch (e) {
    // Theme context not available yet
  }

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser) {
        setTimeout(async () => {
          try {
            if (currentUser.id) {
              await base44.entities.User.update(currentUser.id, {
                last_activity: new Date().toISOString()
              });
            }
            
            if (currentUser.email) {
              const userNotifications = await base44.entities.Notification.filter(
                { recipient_email: currentUser.email, is_read: false },
                '-created_date',
                10
              );
              setNotifications(userNotifications);
            }

            await trackActivity('LOGIN', { userEmail: currentUser.email });
            
          } catch (error) {
            console.error("Error loading background data:", error);
          }
        }, 2000);
      }

    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [location.pathname, currentPageName]);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <LoadingScreen message="טוען את המערכת..." />
    );
  }

  const publicRoutes = ['/Welcome', '/PendingApproval'];
  const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    return <Navigate to="/Welcome" replace />;
  }

  if (user && location.pathname === '/Welcome') {
    if (!user.onboarding_completed) {
      return <Navigate to="/InitialSetup" replace />;
    } else if (user.user_type === 'financial_manager') {
      if (!user.is_approved_by_admin) {
        return <Navigate to="/PendingApproval" replace />;
      } else {
        return <Navigate to="/Admin" replace />;
      }
    } else if (user.role === 'admin') {
      return <Navigate to="/Admin" replace />;
    } else if (user.user_type === 'regular') {
      return <Navigate to="/Dashboard" replace />;
    } else if (user.user_type === 'supplier_user') {
      return <Navigate to={createPageUrl('MyLeads')} replace />;
    }
  }

  if (user && !user.onboarding_completed && location.pathname !== '/InitialSetup') {
    return <Navigate to="/InitialSetup" replace />;
  }
  
  if (user && user.user_type === 'financial_manager' && !user.is_approved_by_admin && location.pathname !== '/PendingApproval') {
    return <Navigate to="/PendingApproval" replace />;
  }

  if (user && user.onboarding_completed && user.user_type === 'regular' && location.pathname === '/pending-approval') {
      return <Navigate to="/Dashboard" replace />;
  }

  if (user && user.onboarding_completed) {
    const allowedAdminPaths = ['/Admin', '/CustomerManagement', '/TrialDashboard'];
    const isAllowed = allowedAdminPaths.some(path => location.pathname.startsWith(path));

    if (user.role === 'admin' && !isAllowed) {
      return <Navigate to="/Admin" replace />;
    }
    
    if (user.user_type === 'financial_manager' && user.is_approved_by_admin && !isAllowed) {
      return <Navigate to="/Admin" replace />;
    }
  }

  if (isPublicRoute || location.pathname === '/InitialSetup' || location.pathname === '/PendingApproval') {
    return (
      <>
        <GlobalThemeStyles />
        {children}
      </>
    );
  }

  if (user && user.user_type === 'supplier_user') {
    return (
      <div dir="rtl" className="min-h-screen bg-horizon-dark" data-theme={theme}>
        <GlobalThemeStyles />
        <header className="bg-horizon-card shadow-sm border-b border-horizon">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-horizon-text">פלטפורמת ספקים - Horizon</h1>
              </div>
              <div className="flex items-center gap-4">
                {/* Theme Toggle for Supplier */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="theme-toggle-btn h-9 w-9 rounded-full"
                  title={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
                >
                  {isDark ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-horizon-accent" />
                  )}
                </Button>
                <span className="text-sm text-horizon-accent">
                  שלום, {user.full_name || user.email}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={async () => {
                    try {
                      await base44.auth.logout();
                      window.location.reload();
                    } catch (error) {
                      console.error("Logout error:", error);
                    }
                  }}
                  className="text-red-500 hover:text-red-400"
                >
                  התנתק
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <main>
          {children}
        </main>
      </div>
    );
  }

  if (user && user.role === 'admin' || user.user_type == 'financial_manager') {
    // הצגת ממשק מובייל רק אם המשתמש בעמוד הבית או Admin
    const isHomePage = location.pathname === '/' || location.pathname === '/Admin' || location.pathname === '/Dashboard';
    if (isMobile && showMobileView && isHomePage) {
      return (
        <div data-theme={theme}>
          <GlobalThemeStyles />
          <MobileDashboard 
            currentUser={user} 
            onLogout={handleLogout}
          />
          {/* כפתור למעבר לממשק מלא */}
          <button
            onClick={() => setShowMobileView(false)}
            className="fixed bottom-20 left-4 bg-horizon-card border border-horizon rounded-full px-4 py-2 text-xs text-horizon-accent shadow-lg z-50"
          >
            ממשק מלא
          </button>
        </div>
      );
    }
    
    return (
      <div dir="rtl" className="min-h-screen bg-horizon-dark" data-theme={theme}>
        <GlobalThemeStyles />
        {/* Admin Header with Theme Toggle */}
        <header className="bg-horizon-card/80 backdrop-blur-sm border-b border-horizon px-4 sm:px-6 py-3 shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-horizon-text">ניהול מערכת</h1>
              {/* כפתור חזרה למובייל */}
              {isMobile && !showMobileView && (
                <button
                  onClick={() => setShowMobileView(true)}
                  className="text-xs text-horizon-primary underline mr-3"
                >
                  חזור לתצוגת מובייל
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user && <TopBarActions user={user} />}
            </div>
          </div>
        </header>
        {children}
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div dir="rtl" className="min-h-screen bg-horizon-dark" data-theme={theme}>
      <GlobalThemeStyles />
      <Toaster position="bottom-center" richColors dir="rtl" />

      <div className="min-h-screen flex">
        {isSidebarOpen && (
          <div
            className="sidebar-backdrop lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className={`sidebar ${isSidebarOpen ? 'open' : ''} flex flex-col`}>
          <div className="p-6 border-b border-horizon">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 horizon-gradient rounded-xl flex items-center justify-center shadow-horizon">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-xl text-horizon-text">Plusto</h2>
                  <p className="text-sm text-horizon-accent">מערכת חכמה לרווחיות</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-horizon-text hover:bg-horizon-card"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {user && (
              <div className="mt-4 text-center">
                <div className="text-sm font-medium text-horizon-text">
                  {user.business_name || user.full_name}
                </div>
                <div className="text-xs text-horizon-accent">
                  עסק {user.business_type === 'wholesale' ? 'wholesale' : (user.business_type || 'כללי')}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 flex-grow overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-horizon-accent uppercase tracking-wider px-3 py-3">
                ניהול עסק
              </h3>
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Component = item.available ? Link : 'div';
                  const props = item.available ? { to: item.url } : {};

                  return (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>
                        <Component
                          {...props}
                          onClick={item.available ? () => setIsSidebarOpen(false) : undefined}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                            item.available && location.pathname === item.url
                              ? 'bg-horizon-primary text-white font-semibold shadow-horizon'
                              : item.available
                              ? 'text-horizon-text hover:bg-horizon-card hover:text-horizon-accent cursor-pointer'
                              : 'text-gray-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Component>
                      </TooltipTrigger>
                      {item.description && (
                        <TooltipContent side="left" className="bg-horizon-card text-horizon-text border-horizon">
                          <p>{item.description}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-horizon mt-auto">
            <div className="space-y-1 mb-4">
                {footerNavigationItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      location.pathname === item.url
                        ? 'bg-horizon-primary text-white font-semibold shadow-horizon'
                        : 'text-horizon-text hover:bg-horizon-card hover:text-horizon-accent'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                ))}
              </div>
            {user && (
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors duration-200 justify-start text-horizon-accent hover:bg-horizon-card hover:text-horizon-text"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">התנתק</span>
              </Button>
            )}
          </div>
        </div>

        <main className="flex-1 flex flex-col min-h-screen relative">
          <header className="bg-horizon-card/80 backdrop-blur-sm border-b border-horizon px-4 sm:px-6 py-3 shadow-sm sticky top-0 z-30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden text-horizon-text hover:bg-horizon-card h-9 w-9"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-bold text-horizon-text hidden sm:block">
                    {navigationItems.find(item => item.url === location.pathname)?.title || currentPageName || "דשבורד"}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {user && <TopBarActions user={user} notifications={notifications} />}
              </div>
            </div>
          </header>

          <div className="flex-1">
            {children}
          </div>

          <div className="fixed bottom-6 left-6 space-y-3 z-50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsChatOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full h-16 w-16 shadow-horizon-strong flex items-center justify-center"
                >
                  <ShieldAlert className="w-8 h-8" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-horizon-card text-horizon-text border-horizon">
                <p>סיוע חירום עסקי</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setContactDialogOpen(true)}
                  className="btn-horizon-primary rounded-full h-16 w-16 shadow-horizon-strong flex items-center justify-center"
                >
                  <Phone className="w-8 h-8" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-horizon-card text-horizon-text border-horizon">
                <p>צור קשר עם מנהל כספים</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
            <DialogContent className="bg-horizon-dark text-horizon-text border-horizon">
              <DialogHeader>
                <DialogTitle className="text-2xl text-horizon-primary">יצירת קשר עם מנהל כספים</DialogTitle>
                <DialogDescription className="text-horizon-accent">
                  צוות המומחים של הורייזן זמין עבורך לכל שאלה, ייעוץ או תמיכה.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Phone className="w-5 h-5 text-horizon-primary" />
                  <a href="tel:0533027572" className="hover:underline">053-302-7572</a>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-horizon-primary" />
                  <a href="mailto:office@horizon.org.il" className="hover:underline">office@horizon.org.il</a>
                </div>
                <Button onClick={() => window.open('https://horizon.org.il/', '_blank')} className="w-full mt-4 btn-horizon-secondary">
                  לאתר הורייזן
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <EmergencyChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}

// Main Layout Export with ThemeProvider and UsersProvider wrapper
function Layout({ children, currentPageName }) {
  return (
    <ThemeProvider>
      <UsersProvider>
        <LayoutContent children={children} currentPageName={currentPageName} />
      </UsersProvider>
    </ThemeProvider>
  );
}

export default Layout;