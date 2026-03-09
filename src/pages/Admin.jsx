
import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from "react";



// import { Product } from "@/entities/Product"; // Removed unused import









import { trackActivity } from "@/components/logic/activityTracker";
// import ProductCatalogManager from "../components/catalog/ProductCatalogManager"; // Removed unused import
// import EngagementDashboard from "../components/admin/EngagementDashboard"; // Removed direct import, lazy loaded
// import FeedbackAnalytics from "@/components/shared/FeedbackAnalytics"; // Removed unused import
// import BusinessForecastManager from "@/components/forecast/BusinessForecastManager"; // Removed unused import
// import CustomerFileUploadManager from "@/components/admin/CustomerFileUploadManager"; // Removed unused import
import { enhanceRecommendationWithPrompt } from "@/components/logic/targetedRecommendationEngine";



// import SpecificFileUploadBox from "../components/admin/SpecificFileUploadBox"; // Removed unused import

import StrategicPlanInputForm from "../components/forecast/StrategicPlanInputForm";

import EnhancedRecommendationOptionsModal from "@/components/admin/EnhancedRecommendationOptionsModal";


// import { Supplier } from "@/entities/Supplier"; // Removed duplicate import
import AddSupplierModal from "@/components/shared/AddSupplierModal";
import AssignSupplierUserModal from "@/components/admin/AssignSupplierUserModal";
import { CircleDotDashed, Star, Edit, Trash2, ListChecks, FileSpreadsheet, LayoutDashboard, ArrowLeft, Users, FileArchive, Lightbulb, Send, Edit3, Eye, TrendingUp, DollarSign, Building2, Package, RefreshCw, User as UserIcon, CheckCircle, AlertCircle, BarChart2, Target, MessageSquare, Calendar, Activity, Clock, Award, Loader2, Upload, Banknote, FileText, Gift, BarChart3, ReceiptText, ScanLine, UserCheck, UserX, Filter, Search, Power, PowerOff, Info, Database, Globe, ArrowRight, Save, X, Plus, MessageCircle, AlertTriangle, ThumbsDown, XCircle, Archive, FileX, Bell, UserPlus, Download, Truck, Bot, ShieldCheck } from "lucide-react"; // Consolidated all Lucide icons
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Progress } from "@/components/ui/progress";

// import WebsiteScanner from "@/components/admin/WebsiteScanner"; // Removed unused import
import TargetedRecommendationModal from "../components/admin/TargetedRecommendationModal";
import AdminRatingWidget from "@/components/admin/AdminRatingWidget";
import IrrelevantRecommendationsModal from '@/components/admin/IrrelevantRecommendationsModal';
import ArchivedRecommendationsModal from '@/components/admin/ArchivedRecommendationsModal';
import MissingDocumentsModal from "@/components/admin/MissingDocumentsModal";
import OnboardingRequestsModal from "@/components/admin/OnboardingRequestsModal";
import UserApprovalModal from "@/components/admin/UserApprovalModal";
import RecommendationUpgradeModal from "@/components/admin/RecommendationUpgradeModal";




// import FinanceManagerPerformanceTable from "@/components/admin/FinanceManagerPerformanceTable"; // Removed direct import, lazy loaded
// import FinanceManagerLeaderboard from "@/components/admin/FinanceManagerLeaderboard"; // Removed direct import, lazy loaded
// import NotificationCenter from "@/components/shared/NotificationCenter"; // Removed direct import, lazy loaded
// import ChatBox from "@/components/shared/ChatBox"; // Removed direct import, lazy loaded

// import RecommendationSuggestionSystem from "@/components/admin/RecommendationSuggestionSystem"; // Removed unused import
import ManagerChatSystem from "@/components/admin/ManagerChatSystem";
// import AdvancedCatalogManager from "@/components/admin/AdvancedCatalogManager"; // Removed unused import
// import CatalogProgressTracker from "@/components/catalog/CatalogProgressTracker"; // Removed unused import
import FloatingNotificationCenter from "@/components/shared/FloatingNotificationCenter";
import LeadManagementSystem from "@/components/leads/LeadManagementSystem";
// import ManagerChatSystem from '../components/admin/ManagerChatSystem'; // Removed duplicate import
// import FloatingNotificationCenter from '../components/shared/FloatingNotificationCenter'; // Removed duplicate import
import CustomerInitiatedRecommendationsModal from "@/components/admin/CustomerInitiatedRecommendationsModal";
// import CustomerSuppliersTab from "../components/admin/CustomerSuppliersTab"; // Removed unused import
// import SupplierPartnershipManager from "../components/admin/SupplierPartnershipManager"; // Removed unused import
import EditSupplierModal from "@/components/shared/EditSupplierModal";
import { Switch } from "@/components/ui/switch";
// import CustomerGoalsGantt from '../components/admin/CustomerGoalsGantt'; // Removed unused import
// import ManualForecastManager from "../components/forecast/ManualForecastManager"; // Removed unused import
import { ScrollArea } from "@/components/ui/scroll-area"; // Consolidated
import ReactMarkdown from 'react-markdown'; // Consolidated
// import ClientManagementDashboard from '../components/admin/ClientManagementDashboard'; // Removed direct import, lazy loaded
import LoadingScreen from '@/components/shared/LoadingScreen';
// import RecommendationDisplayCard from '@/components/admin/RecommendationDisplayCard'; // Removed unused import
// import DailyTasksDashboard from '../components/dashboard/DailyTasksDashboard'; // Removed direct import, lazy loaded
import TaskManagement from './TaskManagement';
import FailedFileUploadsManager from '../components/admin/FailedFileUploadsManager';
import { toast } from "sonner";
import { BusinessForecast, BusinessMove, ChatMessage, CommunicationThread, CustomerContact, CustomerNotification, FileUpload, FinancialManagerPerformance, Lead, Notification, OnboardingRequest, ProductCatalog, Recommendation, RecommendationFeedback, StrategicPlanInput, Supplier, SupportTicket, User, UserActivity } from '@/api/entities';
import { autoOnboardingOrchestrator, calculateManagerPerformance, exportBusinessPlanToPdf, generateBusinessPlanText, initiateWhatsAppConversation, sendWhatsAppMessage } from '@/api/functions';

// Lazy loading של קומפוננטים כבדים
const ClientManagementDashboard = lazy(() => import('../components/admin/ClientManagementDashboard'));
const EngagementDashboard = lazy(() => import('../components/admin/EngagementDashboard'));
const FinanceManagerPerformanceTable = lazy(() => import('../components/admin/FinanceManagerPerformanceTable'));
const DailyTasksDashboard = lazy(() => import('../components/dashboard/DailyTasksDashboard'));
const FinanceManagerLeaderboard = lazy(() => import('../components/admin/FinanceManagerLeaderboard'));
const NotificationCenter = lazy(() => import('../components/shared/NotificationCenter'));
const ChatBox = lazy(() => import('../components/shared/ChatBox'));

// Helper function to format numbers with K/M suffixes
const getBusinessTypeDisplay = (type) => {
  switch (type) {
    case 'retail': return 'קמעונאות';
    case 'wholesale': return 'סיטונאות';
    case 'manufacturing': return 'ייצור';
    case 'import': return 'יבוא';
    case 'export': return 'יצוא';
    case 'services': return 'שירותים';
    case 'restaurant': return 'מסעדה';
    case 'fashion': return 'אופנה';
    case 'tech': return 'טכנולוגיה';
    case 'supplier': return 'ספק';
    case 'other': return 'אחר';
    default: return 'לא צוין';
  }
};
const getCompanySizeDisplay = (size) => {
  switch (size) {
    case '1-10': return '1-10 עובדים';
    case '11-50': return '11-50 עובדים';
    case '51-200': return '51-200 עובדים';
    case '200+': return '200+ עובדים';
    default: return 'לא צוין';
  }
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return Math.round(value).toLocaleString();
};

// Helper functions for recommendation display in modal
const getPriorityText = (priority) => {
  switch (priority) {
    case 'high': return 'גבוהה';
    case 'medium': return 'בינונית';
    case 'low': return 'נמוכה';
    default: return priority;
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};
const getCustomerGroupBadgeColor = (group) => {
  if (group === 'A') return 'bg-[#32acc1] text-white';
  if (group === 'B') return 'bg-[#fc9f67] text-white';
  return 'bg-gray-500 text-white';
};
// פונקציית עזר להחזרת צבעים לפי קטגוריה (אותה פונקציה כמו ב-CustomerSuppliersTab)
const getCategoryBadgeStyle = (category) => {
  const styles = {
    'חומרי גלם': 'bg-green-100 text-green-800 border-green-200',
    'אריזה ועיצוב': 'bg-blue-100 text-blue-800 border-blue-200',
    'לוגיסטיקה ושילוח': 'bg-purple-100 text-purple-800 border-purple-200',
    'שיווק ופרסום': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'טכנולוגיה ומערכות מידע': 'bg-teal-100 text-teal-800 border-teal-200',
    'שירותים מקצועיים': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'ציוד ומכונות': 'bg-pink-100 text-pink-800 border-pink-200',
    'תחזוקה ותיקונים': 'bg-orange-100 text-orange-800 border-orange-200',
    'ייעוץ עסקי': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'שירותים פיננסיים': 'bg-lime-100 text-lime-800 border-lime-200',
    'אחר': 'bg-gray-100 text-gray-800 border-gray-200',
    'default': 'bg-slate-100 text-slate-800 border-slate-200'
  };
  return styles[category] || styles.default;
};

// פונקציית עזר להצגת דירוג כוכבים (אותה פונקציה כמו ב-CustomerSuppliersTab)
const renderStarRating = (rating) => {
  if (!rating) return <span className="text-horizon-accent text-sm">לא דורג</span>;

  return (
    <div className="flex items-center gap-1" dir="ltr"> {/* dir="ltr" to ensure stars are left-to-right */}
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
      <span className="text-sm text-horizon-text ml-1">{rating}/5</span>
    </div>
  );
};

// פונקציית עזר להצגת סטטוס ספק (אותה פונקציה כמו ב-CustomerSuppliersTab)
const renderSupplierStatus = (supplier) => {
  if (supplier.is_partner_supplier) {
    return (
      <Badge className="bg-orange-500 text-white border-orange-600 font-semibold">
        ספק שותף
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-horizon-secondary text-horizon-accent">
      ספק רגיל
    </Badge>
  );
};
const renderCategoryBadge = (category) => {
  if (!category) {
    return (
      <Badge className="bg-gray-100 text-gray-600 border-gray-200">
        לא צוין
      </Badge>
    );
  }
  return (
    <Badge className={`${getCategoryBadgeStyle(category)} font-medium`}>
      {category}
    </Badge>
  );
};

const getStatusText = (status) => {
  switch (status) {
    case 'pending': return 'ממתין';
    case 'published_by_admin': return 'פורסם ע"י אדמין';
    case 'executed': return 'יושם';
    case 'dismissed': return 'נדחה';
    case 'archived': return 'בארכיון';
    default: return status;
  }
};
// NEW: Helper for profit calculation explanation
const getProfitCalculationExplanation = (category, expectedProfit) => {
  if (!expectedProfit || expectedProfit <= 0) return null;

  const explanations = {
    suppliers: `האומדן מבוסס על זיהוי פערי מחירים בין הספק הנוכחי לספקים אלטרנטיביים. ה-AI משווה את עלות הרכש הנוכחית לממוצע השוק, ומחשב את החיסכון הפוטנציאלי לחודש בהתבסס על כמויות המכירה המשוערות.`,
    bundles: `האומדן מתבסס על עלייה צפויה בסל הקנייה הממוצע. ה-AI לוקח בחשבון את הרווחיות של כל מוצר בבנדל, מעריך את קצב המכירות הנוכחי, ומחשב את הרווח הנוסף מעלייה במכירות משולבות.`,
    pricing: `האומדן מבוסס על השוואת מחירים למתחרים והערכת אלסטיות הביקוש. ה-AI בוחן את פער המחירים הנוכחי, מעריך את ההשפעה על כמות המכירות, ומחשב את הרווח הנוסף מהתאמת המחיר.`,
    promotions: `האומדן מתבסס על עלייה זמנית בתנועה ומכירות. ה-AI מעריך את העלייה הצפויה בכמות המכירות במהלך המבצע, מפחית את עלות ההנחה, ומחשב את הרווח הסופי תוך התחשבות בעלות המבצע.`,
    inventory: `האומדן מבוסס על חיסכון בעלויות אחסון ופוטנציאל מימוש מלאי תקוע. ה-AI מחשב את הערך הכספי של שחרור מלאי איטי/עודף והפיכתו למזומן.`,
    operations: `האומדן מבוסס על חיסכון בעלויות תפעוליות כתוצאה מייעול תהליכים. ה-AI מזהה נקודות כשל תפעוליות ומחשב את החיסכון הצפוי מכוח אדם, זמן, ומשאבים אחרים.`,
    strategic_moves: `האומדן מבוסס על הגדלת נתח שוק או יצירת זרמי הכנסה חדשים. ה-AI מעריך את ההשפעה ארוכת הטווח של המהלך על בסיס נתוני שוק ומגמות צמיחה.`,
    marketing: `האומדן מבוסס על הגדלת חשיפה, לידים, והמרות. ה-AI בוחן את הערוצים השיווקיים הקיימים, מציע שיפורים ומחשב את פוטנציאל ההכנסות הנוסף מפעילויות שיווק ממוקדות ויעילות.`
  };

  return explanations[category] || `חישוב הרווח מבוסס על ניתוח נתונים מקיף וייחודי לקטגוריית ${category}.`;
};
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md';
    case 'published_by_admin': return 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md';
    case 'executed': return 'bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-md';
    case 'dismissed': return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md';
    case 'archived': return 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md';
    default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md';
  }
};

// Helper for category colors (kept from original)
const getCategoryColor = (category) => {
    switch (category) {
      case 'pricing': return 'bg-blue-500';
      case 'suppliers': return 'bg-purple-500';
      case 'inventory': return 'bg-orange-500';
      case 'promotions': return 'bg-pink-500';
      case 'bundles': return 'bg-teal-500';
      case 'marketing': return 'bg-indigo-500';
      case 'operations': return 'bg-cyan-500';
      case 'strategic_moves': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

// NEW: DataCompletenessIndicator Component
const DataCompletenessIndicator = ({ recommendation }) => {
  const completenessScore = useMemo(() => {
    const data = recommendation.related_data;
    if (!data) return 0;

    let score = 0;
    let maxScore = 100; // Base score without bonuses

    // Base on calculation_based_on_real_data
    if (data.calculation_based_on_real_data === true) {
      score += 40; // Significant boost for real data
    }

    // Add score based on data_sources_coverage
    if (data.data_sources_coverage) {
      const sources = data.data_sources_coverage;
      let coveredSources = 0;
      let totalSources = 0;
      for (const key in sources) {
        totalSources++;
        if (sources[key] > 0.7) { // Consider a source well-covered if > 70%
          coveredSources++;
        }
      }
      if (totalSources > 0) {
        score += (coveredSources / totalSources) * 30; // Up to 30 points for source coverage
      }
    }

    // Add score based on data_freshness
    if (data.data_freshness === 'recent') {
      score += 20; // 20 points for fresh data
    } else if (data.data_freshness === 'outdated') {
      score -= 10; // Penalty for outdated data
    }

    // Adjust based on confidence_score (if available and not already part of initial calculation)
    if (typeof data.confidence_score === 'number') {
        score += (data.confidence_score / 100) * 10; // Up to 10 points based on confidence
    }

    // Cap the score between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [recommendation.related_data]);

  const progressColor = useMemo(() => {
    if (completenessScore >= 80) return "bg-green-500";
    if (completenessScore >= 50) return "bg-yellow-500";
    return "bg-red-500";
  }, [completenessScore]);

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-sm font-medium text-horizon-accent whitespace-nowrap">שלמות נתונים:</span>
      <div className="relative w-full h-2 rounded-full overflow-hidden bg-horizon-card">
        <div
          className={`h-full ${progressColor}`}
          style={{ width: `${completenessScore}%`, transition: 'width 0.5s ease-in-out' }}
        ></div>
      </div>
      <span className="text-sm font-bold text-horizon-text min-w-[30px] text-left">{`${completenessScore}%`}</span>
    </div>
  );
};

// NEW: DataGapsModal Component with live data checking
const DataGapsModal = ({ recommendation, isOpen, onClose }) => {
  const [liveData, setLiveData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchLiveCustomerData = async () => {
      if (!isOpen || !recommendation?.customer_email) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      try {
        // טעינת כל הנתונים הרלוונטיים של הלקוח בזמן אמת
        const [catalogProducts, uploadedFiles, customerData] = await Promise.all([
          ProductCatalog.filter({ customer_email: recommendation.customer_email, is_active: true }),
          FileUpload.filter({ customer_email: recommendation.customer_email }), // Corrected to use customer_email
          User.filter({ email: recommendation.customer_email })
        ]);
        
        setLiveData({
          catalogProducts: catalogProducts || [],
          uploadedFiles: uploadedFiles || [],
          customer: customerData[0] || null
        });

      } catch (error) {
        console.error("Error fetching live customer data:", error);
        setLiveData({ catalogProducts: [], uploadedFiles: [], customer: null });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchLiveCustomerData();
  }, [isOpen, recommendation?.customer_email]);

  const missingInfo = useMemo(() => {
    if (isLoadingData || !liveData) {
      return [];
    }

    const gaps = [];
    const { catalogProducts, uploadedFiles, customer } = liveData;

    // בדיקה 1: מוצרים בקטלוג - בדיקה חיה
    if (!catalogProducts || catalogProducts.length === 0) {
      gaps.push({ 
        type: 'products', 
        message: 'לא נמצאו מוצרים בקטלוג המערכת.', 
        solution: 'העלה קובץ מלאי או קטלוג מוצרים עדכני כדי לאפשר המלצות מבוססות מוצר.' 
      });
    } else {
      // בדיקת איכות נתוני המוצרים
      const incompleteProducts = catalogProducts.filter(p => 
        !p.cost_price || p.cost_price <= 0 || 
        !p.selling_price || p.selling_price <= 0
      );
      if (incompleteProducts.length > catalogProducts.length * 0.3) {
        gaps.push({ 
          type: 'product_quality', 
          message: `זוהו ${incompleteProducts.length} מוצרים עם נתונים חסרים או לא תקינים (מחירים).`, 
          solution: 'עדכן את פרטי המוצרים החסרים או העלה קובץ מלאי מעודכן.' 
        });
      }
    }

    // בדיקה 2: קבצים שהועלו ונותחו בהצלחה
    const analyzedFiles = uploadedFiles.filter(f => f.status === 'analyzed');
    if (uploadedFiles.length > 0 && analyzedFiles.length === 0) {
      gaps.push({ 
        type: 'file_analysis', 
        message: 'הועלו קבצים אך לא נותחו בהצלחה.', 
        solution: 'בדוק את סטטוס הקבצים שהועלו וודא שהם בפורמט תקין.' 
      });
    }

    // בדיקה 3: דוחות מכירה ספציפיים
    const salesReports = analyzedFiles.filter(f => f.data_category === 'sales_report');
    if (salesReports.length === 0) {
      gaps.push({ 
        type: 'sales_data', 
        message: 'חסרים דוחות מכירות מנותחים.', 
        solution: 'העלה דוח מכירות (Excel, CSV) כדי לאפשר ניתוח מכירות מדויק.' 
      });
    }

    // בדיקה 4: נתוני לקוח בסיסיים מתוך ישות User
    if (!customer) {
      gaps.push({ 
        type: 'customer_missing', 
        message: 'לא נמצאו פרטי לקוח במערכת.', 
        solution: 'וודא שפרטי הלקוח קיימים ועדכניים במערכת.' 
      });
    } else {
      // בדיקת שדות חיוניים בפרופיל הלקוח
      if (!customer.business_goals || customer.business_goals.trim() === '') {
        gaps.push({ 
          type: 'business_goals', 
          message: 'חסרים יעדים עסקיים בפרופיל הלקוח.', 
          solution: 'הגדר יעדים עסקיים ברורים בפרופיל הלקוח לשיפור ההמלצות.' 
        });
      }

      if (!customer.monthly_revenue || customer.monthly_revenue <= 0) {
        gaps.push({ 
          type: 'monthly_revenue', 
          message: 'חסר מחזור חודשי בפרופיל הלקוח.', 
          solution: 'הזן מחזור חודשי מדוייק לחישוב פוטנציאל רווח.' 
        });
      }

      if (!customer.main_products || customer.main_products.trim() === '') {
        gaps.push({ 
          type: 'main_products', 
          message: 'חסר תיאור המוצרים העיקריים של העסק.', 
          solution: 'הוסף תיאור של המוצרים/שירותים העיקריים בפרופיל הלקוח.' 
        });
      }
    }

    // בדיקה 5: קבצים כלליים
    if (uploadedFiles.length === 0) {
      gaps.push({ 
        type: 'no_files', 
        message: 'לא הועלו קבצים עסקיים כלל.', 
        solution: 'העלה דוחות עסקיים (מלאי, מכירות, רווח והפסד) לשיפור איכות הניתוח.' 
      });
    }

    return gaps;
  }, [liveData, isLoadingData]);

  const hasIssues = missingInfo.length > 0;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            ניתוח חוסרי נתונים עבור ההמלצה
          </DialogTitle>
        </DialogHeader>
        
        {isLoadingData ? (
          <div className="text-center p-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-horizon-primary" />
            <p className="text-horizon-accent">בודק נתונים עדכניים של הלקוח...</p>
          </div>
        ) : hasIssues ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            <p className="text-horizon-accent text-sm">
              זוהו חוסרי הנתונים הבאים על בסיס המצב העדכני של הלקוח. הששלמתם תשפר את דיוק ההמלצות:
            </p>
            {missingInfo.map((info, index) => (
              <Card key={index} className="card-horizon bg-horizon-card/30">
                <CardHeader className="p-3">
                  <CardTitle className="text-base text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {info.message}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-sm text-horizon-accent">
                    <strong>פתרון מומלץ:</strong> {info.solution}
                  </p>
                </CardContent>
              </Card>
            ))}
            <div className="text-center pt-4">
              <Button onClick={onClose} className="btn-horizon-primary">
                סגור
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">אין חוסרי נתונים משמעותיים!</h3>
              <p className="text-horizon-accent text-sm">
                המלצה זו מבוססת על נתונים איכותיים ועדכניים המבוססים על:
              </p>
              <ul className="text-xs text-horizon-accent mt-3 space-y-1 text-right">
                {liveData?.catalogProducts?.length > 0 && (
                  <li>• {liveData.catalogProducts.length} מוצרים בקטלוג</li>
                )}
                {liveData?.uploadedFiles?.length > 0 && (
                  <li>• {liveData.uploadedFiles.length} קבצים הועלו למערכת</li>
                )}
                {liveData?.customer && (
                  <li>• פרופיל לקוח מעודכן עם נתונים עסקיים</li>
                )}
              </ul>
            </div>
            <Button onClick={onClose} className="btn-horizon-primary">
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Recommendation Card Component with upgrade functionality
function EnhancedRecommendationCard({ recommendation, onUpdate, onEdit, onViewDetails, onDelete, onShowUpgradeModal, onRatingUpdate, isUpgrading, isPublishing, onPublish, isSendingWhatsAppGlobal, sendingWhatsAppRecIdGlobal, onSendWhatsAppClick, onArchive, onChatToggle }) {
  // Removed internal isSending and sendError states as AdminPage manages global sending state
  const [showDataGaps, setShowDataGaps] = useState(false);

  // Use global sending state for this specific recommendation
  const isSendingThisRecommendation = isSendingWhatsAppGlobal && sendingWhatsAppRecIdGlobal === recommendation.id;

  // בדיקה אם ההמלצה שודרגה לאחרונה (ב-24 השעות האחרונות)
  const isRecentlyUpgraded = recommendation.last_upgraded &&
    new Date(recommendation.last_upgraded) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  const getBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'published_by_admin': return 'bg-green-500'; 
      case 'executed': return 'bg-blue-500';
      case 'dismissed': return 'bg-red-500';
      case 'archived': return 'bg-gray-600';
      default: return 'bg-gray-500';
    }
  };

  const getDeliveryBadgeColor = (status) => {
    switch (status) {
      case 'not_sent': return 'border-gray-500 text-gray-400';
      case 'sent': return 'border-blue-500 text-blue-400';
      case 'delivered': return 'border-green-500 text-green-400';
      case 'failed': return 'border-red-500 text-red-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  const hasDataIssues = recommendation.related_data?.calculation_based_on_real_data === false ||
                       recommendation.admin_notes?.includes('לא מבוסס') ||
                       recommendation.expected_profit <= 0;

  const categoryTranslations = {
    pricing: "תמחור",
    suppliers: "ספקים",
    inventory: "מלאי",
    promotions: "מבצעים שוטפים",
    bundles: "בנדלים", // Corrected typo
    strategic_moves: "מהלכים אסטרטגיים",
  };
  // NEW: useQuery for Recommendations - loads only when 'recommendations' tab is active
  // We also enable it for 'overview' because the overview might show recommendation stats.
  // const { data: recommendationsData, isLoading: isLoadingRecs } = useQuery({ // Replaced by commenting out
  //   queryKey: ['adminRecommendations'],
  //   queryFn: () => Recommendation.list('-created_date'),
  //   enabled: activeTab === 'customers', // רק כשהטאב recommendations פעיל
  //   staleTime: 10 * 60 * 1000, // 10 דקות במקום 5
  //   refetchOnWindowFocus: false,
  // });

  // Update the local 'recommendations' state when 'recommendationsData' changes
  // useEffect(() => { // Replaced by commenting out
  //   if (recommendationsData) {
  //     setRecommendations(recommendationsData.filter(rec => rec.status !== 'archived'));
  //   }
  // }, [recommendationsData]); // Dependency array: re-run if recommendationsData changes


  // NEW: useQuery for Support Tickets - loads only when 'overview' tab is active (or wherever relevant)
  // const { data: supportTicketsData, isLoading: isLoadingTickets } = useQuery({ // Replaced by commenting out
  //   queryKey: ['adminSupportTickets'],
  //   queryFn: () => SupportTicket.list('-created_date'),
  //   enabled: activeTab === 'overview', // רק לטאב overview
  //   staleTime: 10 * 60 * 1000, // 10 דקות במקום 5
  //   refetchOnWindowFocus: false,
  // });

  // useEffect(() => { // Replaced by commenting out
  //   if (supportTicketsData) {
  //     setSupportTickets(supportTicketsData);
  //     setPendingSupportTickets(supportTicketsData.filter(t => t.status === 'open' || t.status === 'in_progress'));
  //   }
  // }, [supportTicketsData]);


  // NEW: useQuery for FileUploads - for overview tab
  // const { data: fileUploadsData, isLoading: isLoadingFileUploads } = useQuery({ // Replaced by commenting out
  //   queryKey: ['adminFileUploads'],
  //   queryFn: () => FileUpload.list(),
  //   enabled: activeTab === 'overview', // רק לטאב overview
  //   staleTime: 10 * 60 * 1000, // 10 דקות במקום 5
  //   refetchOnWindowFocus: false,
  // });

  // useEffect(() => { // Replaced by commenting out
  //   if (fileUploadsData) {
  //     setAllUploads(fileUploadsData);
  //   }
  // }, [fileUploadsData]);

  // const { data: businessForecastsData, isLoading: isLoadingBusinessForecasts } = useQuery({
  // NEW: useQuery for BusinessForecast - for overview tab
  // const { data: businessForecastsData, isLoading: isLoadingBusinessForecasts } = useQuery({ // Replaced by commenting out
  //   queryKey: ['adminBusinessForecasts'],
  //   queryFn: () => BusinessForecast.list(),
  //   enabled: activeTab === 'overview', // רק לטאב overview
  //   staleTime: 10 * 60 * 1000, // 10 דקות במקום 5
  //   refetchOnWindowFocus: false,
  // });

  // If you have a state for businessForecasts, update it here:
  // useEffect(() => { if (businessForecastsData) { setBusinessForecasts(businessForecastsData); } }, [businessForecastsData]);


  // NEW: useQuery for UserActivity - for overview tab
  // const { data: userActivitiesData, isLoading: isLoadingUserActivities } = useQuery({ // Replaced by commenting out
  //   queryKey: ['adminUserActivities'],
  //   queryFn: () => UserActivity.list('-last_login'),
  //   enabled: activeTab === 'overview', // רק לטאב overview
  //   staleTime: 10 * 60 * 1000, // 10 דקות במקום 5
  //   refetchOnWindowFocus: false,
  // });

  // useEffect(() => { // Replaced by commenting out
  //   if(userActivitiesData) {
  //     setAllUserActivities(userActivitiesData);
  //   }
  // }, [userActivitiesData]);


  // NEW: useQuery for Leads - for suppliers tab
  // const { data: leadsData, isLoading: isLoadingLeads } = useQuery({ // Replaced by commenting out
  //   queryKey: ['adminLeads'],
  //   queryFn: () => Lead.list(),
  //   enabled: activeTab === 'suppliers', // This query is currently disabled as leads are not actively used in the AdminPage or Supplier tab.
  //   staleTime: 10 * 60 * 1000, // 10 דקות במקום 5
  //   refetchOnWindowFocus: false,
  // });
  // If you have a state for leads, update it here:
  // useEffect(() => { if (leadsData) { setLeads(leadsData); } }, [leadsData]);


  // NEW: useQuery for CommunicationThreads - for overview tab (or specific chat tab if exists)
  // const { data: communicationThreadsData, isLoading: isLoadingThreads } = useQuery({ // Replaced by commenting out
  //   queryKey: ['adminCommunicationThreads'],
  //   queryFn: () => CommunicationThread.list('-last_message_timestamp'),
  //   enabled: activeTab === 'overview', // רק לטאב overview
  //   staleTime: 10 * 60 * 1000, // 10 דקות במקום 5
  //   refetchOnWindowFocus: false,
  // });

  // useEffect(() => { // Replaced by commenting out
  //   if (communicationThreadsData) {
  //     setCommunicationThreads(communicationThreadsData);
  //   }
  // }, [communicationThreadsData]);


  // NEW: useQuery for Suppliers - for suppliers tab
  // const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery({ // Replaced by commenting out
  //   queryKey: ['adminSuppliers'],
  //   queryFn: () => Supplier.list(),
  //   enabled: activeTab === 'suppliers', // רק לטאב suppliers
  //   staleTime: 10 * 60 * 1000, // 10 דקות במקום 5
  //   refetchOnWindowFocus: false,
  // });

  // useEffect(() => { // Replaced by commenting out
  //   if (suppliersData) {
  //     setSuppliers(suppliersData);
  //   }
  // }, [suppliersData]);

  return (
    <>
      <Card
        className="card-horizon relative" 
        dir="rtl"
      >
        <CardContent
          className="p-4" 
          onClick={(e) => {
            const isInteractiveElement = e.target.closest('button, a, input, select, .admin-rating-widget'); 
            if (!isInteractiveElement) {
              onViewDetails(recommendation);
            }
          }}
        >
          {/* סימון איכות נתונים */}
          {hasDataIssues && (
            <div className="absolute top-2 left-2 bg-yellow-600       text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <span>⚠️</span>
              <span>נתונים לא מדויקים</span>
            </div>
          )}

          {/* סימון פורמט חדש */}
          {recommendation.related_data?.calculation_based_on_real_data && (
            <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <span>✓</span>
              <span>מבוסס נתונים</span>
            </div>
          )}
          
          <div className="flex justify-between items-start mb-3 mt-6">
            <div className="flex-1 text-right">
              <h4 className="font-semibold text-horizon-text text-right">{recommendation.title}</h4>
              <p className="text-sm text-horizon-accent mt-1 line-clamp-3 text-right" style={{ whiteSpace: 'pre-wrap' }}>
                {recommendation.description?.slice(0, 200)}...
              </p>
            </div>
            <div className="flex gap-2 mr-4 flex-col items-end">
              <Badge className={`${getBadgeColor(recommendation.status)} text-white`}>
                {getStatusText(recommendation.status)}
              </Badge>
              {recommendation.delivery_status && (
                <Badge variant="outline" className={`${getDeliveryBadgeColor(recommendation.delivery_status)}`}>
                  {recommendation.delivery_status === 'not_sent' ? 'לא נשלח' :
                   recommendation.delivery_status === 'sent' ? 'נשלח' :
                   recommendation.delivery_status === 'delivered' ? 'נמסר' :
                   recommendation.delivery_status === 'failed' ? 'נכשל' : recommendation.delivery_status}
                </Badge>
              )}
            </div>
          </div>

          {/* NEW: Data Completeness Indicator and Analyze Gaps Button */}
          <div className="mt-3 pt-3 border-t border-horizon flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <DataCompletenessIndicator recommendation={recommendation} />
              <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setShowDataGaps(true); }}
                  className="text-orange-400 hover:text-orange-300 text-xs flex-shrink-0"
              >
                  <AlertTriangle className="w-4 h-4 ml-1" />
                  נתח חוסרים
              </Button>
          </div>

          {/* הצגת נתוני רווח */}
          <div className="flex justify-between items-center text-sm mb-3">
            <div className="flex gap-4 text-right">
              <span className={hasDataIssues ? "text-gray-400" : "text-green-400"}>
                {hasDataIssues ? "רווח: נדרש חישוב" : `רווח צפוי: ₪${recommendation.expected_profit?.toLocaleString('he-IL') || 0}`}
              </span>
              <span className="text-horizon-accent">
                קטגוריה: {categoryTranslations[recommendation.category] || recommendation.category}
              </span>
              <span className="text-horizon-accent">
                עדיפות: {getPriorityText(recommendation.priority)}
              </span>
            </div>
          </div>

          {/* Profit Calculation Explanation for Admin */}
          {!hasDataIssues && recommendation.expected_profit > 0 && (
            <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3 mb-3 text-right">
              <div className="flex items-center gap-2 mb-2 justify-end">
                <span className="font-semibold text-green-400">בסיס חישוב הרווח:</span>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-xs text-horizon-accent leading-relaxed">
                {getProfitCalculationExplanation(recommendation.category, recommendation.expected_profit)}
              </p>
            </div>
          )}

          {/* הערות מנהל */}
          {recommendation.admin_notes && (
            <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-300 text-right">
              {recommendation.admin_notes}
            </div>
          )}

          {/* כפתורי פעולה */}
          <div className="flex gap-2 justify-start">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEdit(recommendation); }} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
              <Edit3 className="w-3 h-3 mr-1" />
              ערוך
            </Button>
            {recommendation.status !== 'archived' && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onSendWhatsAppClick(recommendation); }}
              className="bg-green-400 hover:bg-green-500 text-white"
              disabled={isSendingThisRecommendation || recommendation.delivery_status === 'delivered'}
            >
              {isSendingThisRecommendation ? (
                <>
                  <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <MessageCircle className="w-3 h-3 mr-1" />
                  שלח לוואטסאפ
                </>
              )}
            </Button>
            )}
            {recommendation.status !== 'archived' && (
            <Button
                onClick={(e) => { e.stopPropagation(); onShowUpgradeModal(recommendation); }} 
                className={`bg-purple-500 text-white ${isUpgrading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'}`} 
                size="sm"
                disabled={isUpgrading} 
                title={isUpgrading ? 'ההמלצה משודרגת...' : 'שדרג המלצה'}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  משדרג...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  שדרג המלצה
                </>
              )}
            </Button>
            )}
            {recommendation.status !== 'archived' && (
            <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onArchive(recommendation.id); }} // Changed to pass ID
                className="text-blue-400 hover:text-blue-300"
                variant="ghost"
            >
                <Archive className="w-4 h-4 mr-1" />
                העבר לארכיון
            </Button>
            )}
            {/* NEW: כפתור הצ'אט */}
            <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onChatToggle(recommendation); }}
                className="text-horizon-primary hover:text-horizon-accent"
                variant="ghost"
            >
                <MessageCircle className="w-4 h-4 mr-1" />
                 דיון
            </Button> 
          </div>
        </CardContent>
        <CardFooter className="bg-horizon-card/20 p-3 flex-col items-stretch">
          <AdminRatingWidget 
            recommendation={recommendation}
            onRatingUpdate={onRatingUpdate} 
          />
        </CardFooter>
      </Card>

      {/* מודלים */}
      <DataGapsModal
        recommendation={recommendation}
        isOpen={showDataGaps}
        onClose={() => setShowDataGaps(false)}
      />
    </>
  );
}


export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [customers, setCustomers] = useState([]); // This will now hold ALL user-role customers
  const [recommendations, setRecommendations] = useState([]); 
  const [supportTickets, setSupportTickets] = useState([]);
  const [allUserActivities, setAllUserActivities] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingAdditional, setIsLoadingAdditional] = useState(false);
  
  // NEW: Financial Manager states
  const [financialManagers, setFinancialManagers] = useState([]); // List of users with user_type: 'financial_manager'
  const [selectedFinancialManager, setSelectedFinancialManager] = useState('all'); // Filter for admin view
  const [filteredCustomers, setFilteredCustomers] = useState([]); // Customers list after filtering by financial manager or for FM user

  // תיקון: הוספת משתנים חסרים
  const [allUploads, setAllUploads] = useState([]);
  const [pendingSupportTickets, setPendingSupportTickets] = useState([]);
  const [customersWithMissingDocs, setCustomersWithMissingDocs] = useState([]);
  const [showMissingDocsModal, setShowMissingDocsModal] = useState(false);
  
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingRecommendation, setViewingRecommendation] = useState(null);
  const [editingRecommendation, setEditingRecommendation] = useState(null); 
  const [isEditingInModal, setIsEditingInModal] = useState(false); 

  const [selectedCategory, setSelectedCategory] = useState("all"); 

  const [recommendationCategoryFilter, setRecommendationCategoryFilter] = useState('all');
  const [recommendationSort, setRecommendationSort] = useState('-created_date'); 

  const [publishingRecommendations, setPublishingRecommendations] = useState({});
  const [updatingRecommendations, setUpdatingRecommendations] = useState({});


  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const [dailyStats, setDailyStats] = useState(null);
  const [overallStats, setOverallStats] = useState(null); 
  const [showManualRecommendationModal, setShowManualRecommendationModal] = useState(false); 
  const [manualRecommendation, setManualRecommendation] = useState({ 
    title: '',
    description: '',
    category: 'pricing',
    expected_profit: 0,
    priority: 'medium',
    action_steps: ['', '', '', '']
  });
  const [viewTicketModalOpen, setViewTicketModalOpen] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);

  // Removed: userUploadFile, userUploadStatus, userUploadResults from here
  

  const [showFileUpload, setShowFileUpload] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAssignSupplierUserModal, setShowAssignSupplierUserModal] = useState(false);
  const [supplierToAssignUser, setSupplierToAssignUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // לטעינת כל המשתמשים כדי למצוא משתמשי ספקים קיימים
  const [editingSupplier, setEditingSupplier] = useState(null); // ספק הנערך
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false); // מודאל עריכת ספק
  const [customerFilter, setCustomerFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [togglingCustomer, setTogglingCustomer] = useState(null);

  const [accuracyGuideOpen, setAccuracyGuideOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");

  const [customerDetailsTimeframe, setCustomerDetailsTimeframe] = useState(30);

  const [showDataImprovementModal, setShowDataImprovementModal] = useState(false);
  const [products, setProducts] = useState([]);

  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false); 
  const [sendingWhatsAppRecId, setSendingWhatsAppRecId] = useState(null); 

  const [showDataGapsModal, setShowDataGapsModal] = useState(false);
  const [dataGapsRecommendation, setDataGapsRecommendation] = useState(null);

  const [recommendationToUpgrade, setRecommendationToUpgrade] = useState(null); 
  const [isUpgradePromptModalOpen, setIsUpgradePromptModalOpen] = useState(false);
  const [isUpgradingWithPrompt, setIsUpgradingWithPrompt] = useState(false);
  const [showFocusedOnly, setShowFocusedOnly] = useState(false);
  const [showTargetedModal, setShowTargetedModal] = useState(false);

  const [irrelevantRecs, setIrrelevantRecs] = useState([]);
  const [isIrrelevantModalOpen, setIsIrrelevantModalOpen] = useState(false);
  const [recommendationToManage, setRecommendationToManage] = useState(null); 

  const [showArchivedRecommendations, setShowArchivedRecommendations] = useState(false);
  const [archivedRecommendations, setArchivedRecommendations] = useState([]);

  const [pendingRequests, setPendingRequests] = useState([]);
  const [businessMoves, setBusinessMoves] = useState([]); // State for BusinessMoves

  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showUserApprovalModal, setShowUserApprovalModal] = useState(false);
  const [selectedRecommendationForUpgrade, setSelectedRecommendationForUpgrade] = useState(null); 
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false); 
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [currentPlanText, setCurrentPlanText] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [editedPlanText, setEditedPlanText] = useState(''); // הטקסט הנערך
  const [isSavingPlan, setIsSavingPlan] = useState(false); // מצב שמירה של התוכנית
  const [isEditingPlan, setIsEditingPlan] = useState(false); // מצב עריכת התוכנית
  const [isExportingPlan, setIsExportingPlan] = useState(false); // מצב ייצוא PDF     
  const businessPlanScrollAreaRef = useRef(null);
  const [showStrategicInputForm, setShowStrategicInputForm] = useState(false); // לשליטה על הצגת טופס הקלט האסטרטגי
  const [selectedForecastForPlan, setSelectedForecastForPlan] = useState(null); // התחזית שנבחרה ליצירת תוכנית  
  const [existingStrategicInputForForm, setExistingStrategicInputForForm] = useState(null); 
  const [isInitiatingChat, setIsInitiatingChat] = useState(false);
  const [showRecommendationOptionsModal, setShowRecommendationOptionsModal] = useState(false); // NEW STATE
  const [performanceData, setPerformanceData] = useState([]);
  const [communicationThreads, setCommunicationThreads] = useState([]);
  const [showChatBox, setShowChatBox] = useState(false);
  const [selectedEntityForChat, setSelectedEntityForChat] = useState(null);
  const [refreshPerformance, setRefreshPerformance] = useState(0);
  const [chatInitialThreadId, setChatInitialThreadId] = useState(null);
  const [customerInitiatedRecsCount, setCustomerInitiatedRecsCount] = useState(0);
  const [showCustomerInitiatedRecsModal, setShowCustomerInitiatedRecsModal] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false); // <--- הוסף שורה זו
  
  const categoryTranslations = {
    pricing: "תמחור",
    suppliers: "ספקים",
    inventory: "מלאי",
    promotions: "מבצעים שוטפים",
    bundles: "בנדלים", // Corrected typo
    marketing: "שיווק",
    operations: "תפעול",
    strategic_moves: "מהלכים אסטרטגיים",
  };

  // ===== פונקציות רענון סלקטיביות =====
  const loadRecommendationsOnly = async () => {
    const recommendationData = await Recommendation.list('-created_date');
    setRecommendations(recommendationData.filter(rec => rec.status !== 'archived'));
  };

  const loadCustomersOnly = async () => {
  try {
    let customersList = [];
    let managersList = [];
    
    if (currentUser.role === 'admin') {
      // אדמין - טוען גם מ-User וגם מ-OnboardingRequest
      const [allUsers, allOnboardingRequests] = await Promise.all([
        User.list(),
        OnboardingRequest.filter({ is_active: true })
      ]);
      
      customersList = allUsers.filter(user => user.role === 'user' && user.user_type !== 'financial_manager');
      managersList = allUsers.filter(user => user.role === 'user' && user.user_type === 'financial_manager');
      
      // הוספת לקוחות OnboardingRequest שאין להם User
      const existingUserEmails = new Set(customersList.map(u => u.email));
      const onboardingCustomers = allOnboardingRequests
        .filter(req => !existingUserEmails.has(req.email))
        .map(req => ({
          id: `onboarding_${req.id}`,
          email: req.email,
          full_name: req.full_name || '',
          business_name: req.business_name || '',
          phone: req.phone || '',
          business_type: req.business_type || 'other',
          company_size: req.company_size || '1-10',
          monthly_revenue: parseFloat(req.monthly_revenue) || 0,
          address: {
            city: req.business_city || '',
            street: ''
          },
          main_products: req.main_products_services || '',
          target_customers: req.target_audience || '',
          business_goals: req.business_goals || '',
          website_url: req.website_url || '',
          onboarding_completed: true,
          is_active: req.is_active !== false,
          is_onboarding_record_only: true,
          assigned_financial_manager_email: req.assigned_financial_manager_email || null,
          customer_group: req.customer_group,
          created_date: req.created_date
        }));
      
      customersList = [...customersList, ...onboardingCustomers];
      
    } else if (currentUser.user_type === 'financial_manager') {
      // מנהל כספים - טוען מ-OnboardingRequest ו-CustomerContact (כולל מנהלים משניים)
      const allOnboardingRequests = await OnboardingRequest.list();
      const onboardingRequests = allOnboardingRequests.filter(req =>
        req.assigned_financial_manager_email === currentUser.email ||
        req.additional_assigned_financial_manager_emails?.includes(currentUser.email)
      );
      
      const onboardingEmails = onboardingRequests.map(req => req.email);

      // שלוף רק CustomerContacts שמשויכים ללקוחות שיש להם OnboardingRequest
      const customerContacts = await CustomerContact.filter({
          customer_email: { $in: onboardingEmails }
      });
      const relevantCustomerContacts = customerContacts.filter(contact => 
        onboardingEmails.includes(contact.customer_email)
      );
      
      customersList = relevantCustomerContacts.map(cc => ({
        id: cc.id,
        email: cc.customer_email,
        full_name: cc.full_name,
        business_name: cc.business_name,
        phone: cc.phone,
        business_type: cc.business_type,
        role: 'user',
        user_type: 'regular',
        assigned_financial_manager_email: currentUser.email
      }));
      
      managersList = [{
        email: currentUser.email,
        full_name: currentUser.full_name,
        role: 'user',
        user_type: 'financial_manager'
      }];
    }

      const allFileUploadsData = await FileUpload.list(); 
      setAllUploads(allFileUploadsData); 
      
      const customersWithFilesData = await Promise.all(
        customersList.map(async (customer) => {
          const customerFiles = allFileUploadsData.filter(f => f.customer_email === customer.email);
          return {
            ...customer,
            filesData: {
              total: customerFiles.length,
              analyzed: customerFiles.filter(f => f.status === 'analyzed').length,
              failed: customerFiles.filter(f => f.status === 'failed').length,
              recent: customerFiles.filter(f => {
                const fileDate = new Date(f.created_date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return fileDate > thirtyDaysAgo;
              }).length
            }
          };
        })
      );
      
      setCustomers(customersWithFilesData);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const refreshSingleCustomerFileData = async (customerEmail) => {
    try {
      const customerFiles = await FileUpload.filter({ customer_email: customerEmail });
      
      const updatedFilesData = {
        total: customerFiles.length,
        analyzed: customerFiles.filter(f => f.status === 'analyzed').length,
        failed: customerFiles.filter(f => f.status === 'failed').length,
        recent: customerFiles.filter(f => {
          const fileDate = new Date(f.created_date);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return fileDate > thirtyDaysAgo;
        }).length
      };

      // עדכון רק הלקוח הספציפי
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer.email === customerEmail 
            ? { ...customer, filesData: updatedFilesData }
            : customer
        )
      );
    } catch (error) {
      console.error(`Error refreshing file data for ${customerEmail}:`, error);
    }
  };

  // NEW: Initial load for current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // NEW: Load all main data once currentUser is set
  useEffect(() => {
    if (currentUser) {
      loadInitialData();
      // טען נתונים נוספים ברקע אחרי 2 שניות
      setTimeout(() => {
        loadAdditionalData();
      }, 2000);
    }
  }, [currentUser]);
  
 
  // NEW: Filter customers based on selected financial manager or current user's role
  useEffect(() => {
    if (customers.length > 0) { // וודא שיש לקוחות לפני הפעלת הפילטור
      filterCustomersByFinancialManager();
    }
  }, [customers, selectedFinancialManager, currentUser, customerFilter, customerSearch, customerTypeFilter, recommendations]);
  const handleChatNotificationClick = (threadId) => {
    setChatInitialThreadId(threadId);
  };
  const loadCurrentUser = async () => {
  setIsLoading(true); // הוסף את זה
  try {
    const user = await User.me();
    setCurrentUser(user);
  } catch (error) {
    console.error("Error loading current user:", error);
  }
  // אל תשים setIsLoading(false) כאן כי זה יקרה ב-loadData()
  };

  // ... existing code ...
  const handlePartnerToggle = async (supplierId, isPartner) => {
    try {
        // עדכון אופטימיסטי של ה-UI: משנה את ה-state לפני קבלת אישור מהשרת
        setSuppliers(prevSuppliers =>
            prevSuppliers.map(s => (s.id === supplierId ? { ...s, is_partner_supplier: isPartner } : s))
        );

        // קריאה לשרת לעדכון הסטטוס של הספק
        await Supplier.update(supplierId, { is_partner_supplier: isPartner });
        toast.success("סטטוס שותפות עודכן בהצלחה!");
    } catch (error) {
        console.error("שגיאה בשינוי סטטוס השותפות:", error);
        toast.error("שגיאה בשינוי סטטוס השותפות של הספק: " + error.message);
        // אם הייתה שגיאה בשרת, רענן את הנתונים כדי לסנכרן מחדש את ה-UI עם ה-DB
        loadInitialData(); // פונקציה זו כבר קיימת וטוענת את כל הנתונים מחדש
    }
  };
  // פונקציה לטעינת נתונים בסיסיים בלבד
  const loadInitialData = async () => {
    setIsLoading(true);
    
    try {
      // טען רק נתונים בסיסיים - לקוחות בלבד (כולל OnboardingRequest)
      await loadCustomersOnly();
      
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // פונקציה לטעינת נתונים נוספים (תרוץ ברקע)
  const loadAdditionalData = async () => {
    try {
      // טען נתונים נוספים רק לטאב overview
      if (activeTab === 'overview') {
        const [supportTickets, fileUploads, userActivities, communicationThreads] = await Promise.all([
          SupportTicket.list('-created_date'),
          FileUpload.list(),
          UserActivity.list('-last_login'),
          CommunicationThread.list('-last_message_timestamp')
        ]);
        
        setSupportTickets(supportTickets);
        setAllUploads(fileUploads);
        setAllUserActivities(userActivities);
        setCommunicationThreads(communicationThreads);
      }
      
      // טען נתונים נוספים רק לטאב suppliers
      if (activeTab === 'suppliers') {
        const [/* leads, */ suppliers] = await Promise.all([ // Commented out `leads`
          // Lead.list(), // Commented out
          Supplier.list()
        ]);
        
        // setLeads(leads); // Commented out
        setSuppliers(suppliers);
      }
      
    } catch (error) {
      console.error("Error loading additional data:", error);
    }
  };

    const fetchIrrelevantRecommendations = async () => {
      try {
        // Get all recommendations
        const allRecommendations = await Recommendation.list('-created_date');
      
        // Get all feedback with rating 3 (irrelevant)
        const irrelevantFeedbacks = await RecommendationFeedback.filter({ rating: 3 });
      
        // Get recommendation IDs that have rating 3 feedback
        const irrelevantRecIds = new Set(irrelevantFeedbacks.map(f => f.recommendation_id));
      
        // Filter recommendations that have rating 3 feedback
        const irrelevantRecommendations = allRecommendations.filter(rec => 
          irrelevantRecIds.has(rec.id)
        );
      
        setIrrelevantRecs(irrelevantRecommendations);
      } catch (error) {
        console.error("Error fetching irrelevant recommendations:", error);
      }
    };
  // NEW: Filter customers by financial manager (for both admin and FM users)
  // ... existing code ...
  const filterCustomersByFinancialManager = () => {
    if (!currentUser) {
      setFilteredCustomers([]);
      return;
    }

    if (!customers || customers.length === 0) {
      setFilteredCustomers([]);
      return;
    }

    let currentFiltered = [...customers];

    // If current user is a financial manager, filter to show only their assigned customers
    if (currentUser.role === 'user' && currentUser.user_type === 'financial_manager') {
      currentFiltered = customers.filter(customer => {
        // בדוק גם מנהל ראשי וגם מנהלים משניים
        const isPrimaryManager = customer.assigned_financial_manager_email === currentUser.email;
        const isAdditionalManager = customer.additional_assigned_financial_manager_emails?.includes(currentUser.email);
        const isAssigned = isPrimaryManager || isAdditionalManager;
        
        console.log(`Customer ${customer.email}: primary=${isPrimaryManager}, additional=${isAdditionalManager}, isAssigned=${isAssigned}`);
        return isAssigned;
      });
      console.log(`Financial manager ${currentUser.email} has ${currentFiltered.length} assigned customers out of ${customers.length} total`);
    }
    // If current user is an admin, apply the admin's selected filter
    else if (currentUser.role === 'admin') {
      if (selectedFinancialManager !== 'all') {
        if (selectedFinancialManager === 'unassigned') {
          currentFiltered = customers.filter(customer => !customer.assigned_financial_manager_email);
        } else {
          currentFiltered = customers.filter(customer =>
            customer.assigned_financial_manager_email === selectedFinancialManager
          );
        }
      }
    }

    // Apply existing search and other filters
    let finalFiltered = currentFiltered;

    if (customerSearch.trim()) {
      const searchTerm = customerSearch.toLowerCase();
      finalFiltered = finalFiltered.filter(user =>
        user.business_name?.toLowerCase().includes(searchTerm) ||
        user.full_name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
      );
    }

    // ... rest of the filtering logic remains the same ...

    setFilteredCustomers(finalFiltered);
  };
// ... existing code ...

  // ===== useEffect עם מעקב אחר עדכוני נתונים =====
  useEffect(() => {
    const handleCustomerDataUpdate = (event) => {
      const { customerEmail, updateType } = event.detail;
      console.log(`Activity tracked for ${customerEmail}: ${updateType}`);
      
      // רענון ספציפי במקום loadData()
      if (updateType === 'file_upload') {
        refreshSingleCustomerFileData(customerEmail);
      } else if (updateType === 'customer_info') {
        loadCustomersOnly();
      }
    };

    window.addEventListener('customerDataUpdated', handleCustomerDataUpdate);
    return () => window.removeEventListener('customerDataUpdated', handleCustomerDataUpdate);
  }, []);

  useEffect(() => {
    const loadCustomerSpecificData = async () => {
        if (selectedCustomer) {
            try {
                const customerProducts = await ProductCatalog.filter({ customer_email: selectedCustomer.email, is_active: true });
                setProducts(customerProducts);
            } catch (error) {
                console.error("Error loading products for selected customer:", error);
                setProducts([]);
            }
        } else {
            setProducts([]); 
        }
    };
    loadCustomerSpecificData();
  }, [selectedCustomer]); 
  useEffect(() => {
    const loadCustomerSpecificCounts = async () => {
      if (selectedCustomer) {
        try {
          const customerRecsFromClient = await Recommendation.filter({
            customer_email: selectedCustomer.email,
            source: 'whatsapp_request'
          });
          
          const targetedRecs = customerRecsFromClient.filter(rec => 
            rec.related_data && rec.related_data.is_targeted === true
          );
          
          setCustomerInitiatedRecsCount(targetedRecs.length);
        } catch (error) {
          console.error("Error loading customer initiated recs count:", error);
          setCustomerInitiatedRecsCount(0);
        }
      } else {
        setCustomerInitiatedRecsCount(0);
      }
    };

    loadCustomerSpecificCounts();
  }, [selectedCustomer]);
  const hasInaccurateData = useMemo(() => {
    if (!selectedCustomer) return false;

    const insufficientProducts = !products || products.length < 5;
    let missingProductSales = false;
    let missingProductSupplierOrInventory = false;

    if (products && products.length > 0) {
        const productsWithMissingSales = products.filter(p => !p.monthly_sales || p.monthly_sales === 0);
        if (productsWithMissingSales.length / products.length > 0.7) { 
            missingProductSales = true;
        }

        const productsWithMissingSupplierOrInventory = products.filter(p => !p.supplier || p.supplier.trim() === '' || !p.inventory);
        if (productsWithMissingSupplierOrInventory.length / products.length > 0.5) { 
            missingProductSupplierOrInventory = true;
        }
    }

    const missingCustomerInfo = !selectedCustomer?.monthly_revenue ||
                                !selectedCustomer?.business_goals ||
                                !selectedCustomer?.target_customers;

    return insufficientProducts || missingProductSales || missingProductSupplierOrInventory || missingCustomerInfo;
  }, [products, selectedCustomer]);

  const analyzeMissingDocuments = async () => {
    try {
        // --- START OF MODIFICATION ---
        let usersFromUserEntity = []; // הגדרת usersFromUserEntity
        let allCustomersForProcessing = []; // משתנה חדש שירכז את כל הלקוחות לעיבוד

        if (currentUser.role === 'admin') {
            // אדמין - טוען את כל המשתמשים הרגילים מישות User
            usersFromUserEntity = await User.filter({ role: 'user', user_type: 'regular' });
        } else if (currentUser.user_type === 'financial_manager') {
            // מנהל כספים - משתמש בנתונים שכבר נטעמו ב-customers (שכולל את CustomerContact ו-OnboardingRequest)
            // נסנן לקוחות שהם לא admin או FM בעצמם
            usersFromUserEntity = customers.filter(c => c.user_type !== 'financial_manager' && c.role !== 'admin' && !c.is_onboarding_record_only);
            // אם המשתמש הוא מנהל כספים, ה-customers state כבר אמור להכיל את הלקוחות המשויכים אליו.
            // אין צורך לטעון Users נוספים.
        }

        const approvedOnboardingRequests = await OnboardingRequest.filter({ status: 'approved' });

        // השתמש ב-usersFromUserEntity שהוגדר כעת
        const existingUserEmails = new Set(usersFromUserEntity.map(u => u.email));

        // Map approved onboarding requests to a 'customer-like' structure
        const onboardingCustomers = approvedOnboardingRequests
            .filter(req => !existingUserEmails.has(req.email)) // Exclude requests that already have a User entity
            .map(req => ({
                id: `onboarding_req_${req.id}`, // Unique ID to prevent conflicts with User IDs
                email: req.email,
                full_name: req.full_name || '',
                business_name: req.business_name || '',
                phone: req.phone || '',
                business_type: req.business_type || 'other',
                company_size: req.company_size || '1-10',
                monthly_revenue: parseFloat(req.monthly_revenue) || 0,
                address: {
                    city: req.business_city || '',
                    street: ''
                },
                main_products: req.main_products_services || '',
                target_customers: req.target_audience || '',
                business_goals: req.business_goals || '',
                website_url: req.website_url || '',
                onboarding_completed: true, // Flag it as completed for display purposes
                is_active: true, // Assume active for display
                is_onboarding_record_only: true, // Flag to identify these as onboarding records
                created_date: req.created_date // Use the request creation date
            }));

        // השתמש ב-usersFromUserEntity שהוגדר כעת
        const regularBusinessCustomers = usersFromUserEntity.filter(user =>
            user.role === 'user' && user.user_type === 'regular'
        );
        allCustomersForProcessing = [...regularBusinessCustomers, ...onboardingCustomers];
        // --- END OF MODIFICATION ---
        const allFileUploads = await FileUpload.list();

        const customersWithMissing = [];

        // רשימת סוגי מסמכים קריטיים
        const requiredDocumentTypes = [
            'sales_report',
            'inventory_report',
            'profit_loss',
            'bank_statement',
            'balance_sheet',
            'credit_card_report',
            'promotions_report'
        ];

        for (const customer of allCustomersForProcessing) { // 👈 שימוש ב-allCustomersForProcessing
            // דילוג על משתמשי אדמין ו-FM, אבל רק אם הם לא לקוחות רגילים או Onboarding
            if (customer.role === 'admin' || customer.user_type === 'financial_manager') continue; 
            
            // מציאת כל הקבצים שהעלה הלקוח הזה
            const customerFiles = allFileUploads.filter(file => file.customer_email === customer.email);
            
            // זיהוי סוגי המסמכים שהועלו
            const uploadedDocTypes = [...new Set(customerFiles.map(file => file.data_category).filter(Boolean))];
            
            // זיהוי המסמכים החסרים
            const missingDocuments = requiredDocumentTypes.filter(docType =>
                !uploadedDocTypes.includes(docType)
            );

            // אם יש מסמכים חסרים, הוסף ללרשימה
            if (missingDocuments.length > 0) {
                customersWithMissing.push({
                    email: customer.email,
                    full_name: customer.full_name,
                    business_name: customer.business_name,
                    business_type: customer.business_type,
                    phone: customer.phone,
                    missingDocuments: missingDocuments,
                    totalUploaded: customerFiles.length
                });
            }
        }

        setCustomersWithMissingDocs(customersWithMissing);
    } catch (error) {
        console.error("Error analyzing missing documents:", error);
        setCustomersWithMissingDocs([]);
    }
  };

  // NEW: Load pending onboarding requests
  const loadOnboardingRequests = async () => {
    try {
      const requests = await OnboardingRequest.list(); // Changed from filter({ status: 'pending' })
      setPendingRequests(Array.isArray(requests) ? requests.filter(req => req.status === 'pending') : []); // Filter here
    } catch (error) {
      console.error("Error loading onboarding requests:", error);
      setPendingRequests([]);
    }
  };

  const loadOverallStats = async ({ allCustomers, allRecommendations, allFileUploads }) => {
    try {
      console.log("Loading admin overall stats with corrected file logic...");
      
      const activeCustomers = allCustomers.filter(c => c.is_active).length;
      
      const filesByCustomer = {};
      allFileUploads.forEach(file => {
        if (file.customer_email) { // Ensure file.customer_email exists
          if (!filesByCustomer[file.customer_email]) {
            filesByCustomer[file.customer_email] = 0;
          }
          filesByCustomer[file.customer_email]++;
        }
      });

      const customersWithFiles = Object.keys(filesByCustomer).length;
      const totalFilesUploaded = allFileUploads.length;
      const analyzedFiles = allFileUploads.filter(f => f.status === 'analyzed').length;

      const stats = {
        totalCustomers: allCustomers.length,
        activeCustomers,
        totalRecommendations: allRecommendations.length,
        customersWithFiles, 
        totalFilesUploaded,
        analyzedFiles,
        fileAnalysisRate: totalFilesUploaded > 0 ? Math.round((analyzedFiles / totalFilesUploaded) * 100) : 0
      };

      setOverallStats(stats);
      console.log("Admin overall stats loaded successfully:", stats);

    } catch (error) {
      console.error("Error loading admin overall stats:", error);
    }
  };

  const loadArchivedRecommendations = async () => {
    try {
      const archived = await Recommendation.filter({ status: 'archived' }, '-created_date');
      setArchivedRecommendations(archived);
    } catch (error) {
      console.error("Error loading archived recommendations:", error);
      setArchivedRecommendations([]);
    }
  };

  const loadDailyStats = ({ customers, recommendations, supportTickets }) => {
    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      const todayUsers = customers.filter(u => u.created_date && format(new Date(u.created_date), 'yyyy-MM-dd') === todayStr); 
      const todayRecs = recommendations.filter(r => r.created_date && format(new Date(r.created_date), 'yyyy-MM-dd') === todayStr); 
      const todayTickets = supportTickets.filter(t => t.created_date && format(new Date(t.created_date), 'yyyy-MM-dd') === todayStr);

      setDailyStats({
        newUsers: todayUsers.length,
        newRecommendations: todayRecs.length,
        newTickets: todayTickets.length,
        totalUsers: customers.length, 
        totalRecommendations: recommendations.length, 
        openTickets: supportTickets.filter(t => t.status === 'open').length
      });
    } catch (error) {
      console.error("Error loading daily stats:", error);
    }
  };
  const handleInitiateWhatsAppChat = async () => {
    if (!selectedCustomer) return;
  
    setIsInitiatingChat(true);
    try {
      const response = await initiateWhatsAppConversation({
        customerEmail: selectedCustomer.email
      });
    
      if (response.data.success) {
        toast.success(`שיחת וואטסאפ התחילה בהצלחה עם ${response.data.customer_name}`);
      } else {
        throw new Error(response.data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error initiating WhatsApp chat:', error);
      toast.error(`שגיאה ביצירת שיחת וואטסאפ: ${error.message}`);
    } finally {
      setIsInitiatingChat(false);
    }
  };
  const handleRecalculatePerformance = async () => { // <--- שינוי שם הפונקציה כאן
    setIsRecalculating(true); // <--- הוספה כאן
    try {
        // ישויות ה-User מכילות את כל המשתמשים. נסנן את אלו שהם מנהלי כספים.
        // נשתמש ב-allUsers המעודכן שלנו, שהוא כבר נטען.
        const financialManagerEmails = allUsers.filter(u => u.user_type === 'financial_manager').map(u => u.email);
    
        if (financialManagerEmails.length === 0) {
            toast.warning('לא נמצאו מנהלי כספים במערכת לחישוב ביצועים.');
            setIsRecalculating(false); // <--- הוספה כאן, אם הפונקציה מסתיימת מוקדם
            return;
        }

        toast.info('מתחיל בחישוב מחדש של ביצועי מנהלי הכספים. התהליך עשוי לקחת מספר דקות.');

        for (const managerEmail of financialManagerEmails) {
            // קריאה לפונקציית ה-backend calculateManagerPerformance
            await calculateManagerPerformance({
                manager_email: managerEmail,
                calculation_date: new Date().toISOString().split('T')[0]
            });
        }
    
        // רענן את הנתונים לאחר החישובים
        setRefreshPerformance(prev => prev + 1); // טריגר לרענון קומפוננטות שמקבלות את זה כפרופ
        toast.success('נתוני ביצוע מנהלי הכספים עודכנו בהצלחה!');
    } catch (error) {
        console.error("Error refreshing performance data:", error);
        toast.error('שגיאה בעדכון נתוני ביצועים: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
        setIsRecalculating(false); // <--- הוספה כאן לוודא שהמצב מתאפס גם בשגיאה
    }
  };
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setRecommendationCategoryFilter("all");
    setRecommendationSort("-created_date");
  };
  // ... existing code ...
  const updateCustomerFinancialManager = async (customerId, managerEmail) => {
    try {
      const finalManagerEmail = managerEmail === "null" || managerEmail === "" ? null : managerEmail;
      let updatedCustomerData = null;

      // ישויות OnboardingRequest מזהות לפי ID שמתחיל ב-'onboarding_'
      if (typeof customerId === 'string' && customerId.startsWith('onboarding_')) {
        const onboardingRequestId = customerId.replace('onboarding_', '');
        const updatedReq = await OnboardingRequest.update(onboardingRequestId, {
          assigned_financial_manager_email: finalManagerEmail
        });
        updatedCustomerData = {
          ...updatedReq,
          id: `onboarding_${updatedReq.id}`,
          is_onboarding_record_only: true,
          assigned_financial_manager_email: finalManagerEmail,
          created_date: updatedReq.created_date // וודא ש-created_date מועבר גם
        };
      } else {
        // עבור ישויות User רגילות
        updatedCustomerData = await User.update(customerId, {
          assigned_financial_manager_email: finalManagerEmail
        });
      }

      // עדכן את רשימת הלקוחות הראשית (customers) עם הלקוח המעודכן
      setCustomers(prevCustomers => prevCustomers.map(c =>
        c.id === (updatedCustomerData.id || customerId) ? { ...c, ...updatedCustomerData } : c // השתמש ב-customerId כ-fallback
      ));

      // עדכן את הלקוח הנבחר (selectedCustomer) ישירות לאובייקט המעודכן
      setSelectedCustomer(prevSelectedCustomer => {
        if (!prevSelectedCustomer) return updatedCustomerData;
        // אם הלקוח המעודכן הוא הלקוח הנבחר, עדכן אותו
        if (prevSelectedCustomer.id === (updatedCustomerData.id || customerId)) {
          return { ...prevSelectedCustomer, ...updatedCustomerData };
        }
        return prevSelectedCustomer;
      });

      // אין צורך ב-setTimeout וקריאה ל-filterCustomersByFinancialManager()
      // filterCustomersByFinancialManager כבר רץ ב-useEffect כאשר customers משתנה

    } catch (error) {
      console.error("Error updating financial manager for customer:", error);
      toast.error("שגיאה בעדכון מנהל הכספים: " + error.message);
    }
  };
// ... existing code ...
  const handleGenerateBusinessPlan = async (forecastId, customerEmail, strategicInputId) => {
    setIsGeneratingPlan(true); // עכשיו מפעילים טעינה רק כאן, עבור שלב יצירת התוכנית!
    setCurrentPlanText('מייצר תוכנית עסקית, אנא המתן...'); // הודעה שהתוכנית נוצרת
    // מודאל התוכנית העסקית כבר פתוח מ-handleInitiateBusinessPlanGeneration, והוא יציג את הסטטוס הזה
    
    try {
        const forecastObj = await BusinessForecast.get(forecastId);
        setSelectedForecastForPlan(forecastObj);
             // --- הוסף את הקוד הזה כאן ---
        // שליפת אובייקט הלקוח המלא.selectedCustomer  כ כבר מכיל את הנתונים העדכניים.
        const customerObject = selectedCustomer; 

        // שליפת אובייקט הקלט האסטרטגי המלא, אם קיים
        let strategicInputObject = null;
        if (strategicInputId) {
            try {
                strategicInputObject = await StrategicPlanInput.get(strategicInputId);
            } catch (error) {
                console.warn("שגיאה באיתור StrategicPlanInput, ממשיך בלעדיו:", error);
                // במקרה של שגיאה, ה-strategicInputObject יישאר null
            }
        }
        // --- סוף הקוד שצריך להוסיף ---
        const response = await generateBusinessPlanText({
         forecast: forecastObj,         // שלח את אובייקט התחזית המלא
         customerData: customerObject,     // שלח את אובייקט הלקוח המלא
         strategicInput: strategicInputObject // שלח את אובייקט התכנון האסטרטגי המלא
        });
        
        if (response.success) {
            setCurrentPlanText(response.business_plan_text); // הצג את טקסט התוכנית שנוצר
            setEditedPlanText(response.business_plan_text); // הגדר גם לטקסט העריכה
        } else {
            throw new Error(response.error || "יצירת התוכנית העסקית נכשלה.");
        }

    } catch (error) {
        console.error("Error generating business plan:", error);
        setCurrentPlanText(`שגיאה ביצירת התוכנית העסקית: ${error.message}. נסה שוב מאוחר יותר.`);
    } finally {
        setIsGeneratingPlan(false); // סיום מצב הטעינה
        // גלול לראש המודאל לאחר טעינה/שגיאה (חשוב במקרה של תוכנית ארוכה)
        if (businessPlanScrollAreaRef.current) {
            businessPlanScrollAreaRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
    }
  };
  // ===== עדכון דירוג עם אופטימיזציה אופטימיסטית =====
  const handleRatingUpdate = async (recommendationId, newRating) => {
    try {
      // עדכון מיידי בממשק
      setRecommendations(prevRecs => 
        prevRecs.map(rec =>
          rec.id === recommendationId
            ? { ...rec, admin_rating: newRating, last_rated_by_admin_date: new Date().toISOString() }
            : rec
        )
      );

      // עדכון בשרת
      await Recommendation.update(recommendationId, {
        admin_rating: newRating,
        last_rated_by_admin_date: new Date().toISOString()
      });
      
      console.log('Rating updated successfully');
    } catch (error) {
      console.error("Error updating recommendation rating:", error);
      // במקרה של שגיאה - טען מחדש רק המלצות
      await loadRecommendationsOnly();
      toast.error('שגיאה בעדכון הדירוג.');
    }
  };

  // ===== יצירת המלצות משודרגות עם עדכון אופטימסטי =====
  const handleGenerateEnhancedRecommendations = async (customer, selectedFocusCategories = []) => { 
    if (generatingRecommendations || !customer) return;

    setGeneratingRecommendations(true);
    setGenerationStatus(`מפעיל מנוע המלצות משודרג עבור ${customer.business_name || customer.full_name}...`);
    setProgress(5);

    try {
      setProgress(20);
      setGenerationStatus('אוסף נתונים מקומפוננטות השונות...');

      const { generateEnhancedRecommendations } = await import("@/components/logic/enhancedRecommendationEngine");

      setProgress(40);
      setGenerationStatus('מנתח מוצרים וחושב על המלצות מעולות..');

      const result = await generateEnhancedRecommendations(customer, {
        generateRecs: true,
        recommendationsCount: 8,
        focusCategories: selectedFocusCategories.length > 0 ? selectedFocusCategories : ['pricing', 'promotions', 'bundles', 'suppliers', 'inventory', 'operations', 'strategic_moves', 'marketing'],
        onProgress: (prog, status) => { // זו פונקציה שתתעדכן מתוך generateEnhancedRecommendations
          setProgress(prog); // תעדכן את ה-progress state של עמוד Admin
          setGenerationStatus(status); // תעדכן את ה-generationStatus state של עמוד Admin
        }  
      });


      setProgress(80);

      if (result.success && result.recommendations && result.recommendations.length > 0) {
        setGenerationStatus(`נוצרו ${result.recommendations.length} המלצות מבוססות נתונים אמיתיים!`);
        await loadRecommendationsOnly();

        loadOverallStats({
          allCustomers: customers,
          allRecommendations: [...recommendations, ...result.recommendations],
          allRecommendations: await Recommendation.list('-created_date'), // טען מחדש או קבל את הרשימה המעודכנת
          allFileUploads: allUploads
        });
        loadDailyStats({
          customers: customers,
          recommendations: [...recommendations, ...result.recommendations],
          recommendations: await Recommendation.list('-created_date'), // טען מחדש או קבל את הרשימה המעודכנת
          supportTickets: supportTickets
        });

        setTimeout(() => {
          setGenerationStatus(`המלצות משודרגות נוצרו בהצלחה! איכות נתונים: ${result.dataQuality}%`);
        }, 1000);
      } else {
        throw new Error("יצירת המלצות נכשלה. " + (result.error || ""));
      }
    } catch (error) {
      console.error("Error generating enhanced recommendations:", error);
      setGenerationStatus(`שגיאה ביצירת המלצות: ${error.message}`);
      setTimeout(() => {
        toast.error(`שגיאה ביצירת המלצות: ${error.message}`);
      }, 500);
      await loadRecommendationsOnly();
    } finally {
      setGeneratingRecommendations(false);
      setProgress(100);
      setTimeout(() => {
        setProgress(0);
        setGenerationStatus("");
      }, 2000);
    }
  };

  const handleResetAllRecommendations = async () => {
    try {
      setIsLoading(true);

      const allRecs = await Recommendation.list();
      for (const rec of allRecs) {
        await Recommendation.delete(rec.id);
      }

      await loadInitialData();
      setResetConfirmOpen(false);

      toast.success(`נמחקו ${allRecs.length} המלצות מהמערכת`);

    } catch (error) {
      console.error("Error resetting recommendations:", error);
      toast.error("שגיאה במחיקת ההמלצות: " + error.message);
    } finally {
        setIsLoading(false);
    }
  };

  // ===== פרסום המלצה עם עדכון אופטימסטי =====
  const handlePublishRecommendation = async (recommendation) => { 
    setPublishingRecommendations(prev => ({ ...prev, [recommendation.id]: true }));
    try {
      const customer = customers.find(u => u.email === recommendation.customer_email); 
      if (!customer) {
          throw new Error(`Customer with email ${recommendation.customer_email} not found.`);
      }

      let finalRecommendation;

      if (typeof recommendation.id === 'string' && recommendation.id.startsWith('temp_')) {
        const { id, ...recData } = recommendation;
        const createdRec = await Recommendation.create({
            ...recData,
            customer_email: customer.email,
            status: 'published_by_admin',
            published_date: new Date().toISOString(),
            delivery_status: 'delivered'
        });
        setRecommendations(prev => [...prev, createdRec]);
        finalRecommendation = createdRec;
        console.log(`Published new recommendation with ID: ${finalRecommendation.id} for customer ${customer.email}`);
      } else {
        const updatedRecommendation = { ...recommendation, status: 'published_by_admin', published_date: new Date().toISOString(), delivery_status: 'delivered' };
        setRecommendations(prev => prev.map(rec =>
          rec.id === recommendation.id ? updatedRecommendation : rec
        ));
        await Recommendation.update(recommendation.id, {
          status: 'published_by_admin',
          published_date: new Date().toISOString(),
          delivery_status: 'delivered'
        });
        finalRecommendation = updatedRecommendation;
        console.log(`Published existing recommendation with ID: ${finalRecommendation.id} for customer ${customer.email}`);
      }

      await CustomerNotification.create({
        customer_email: customer.email,
        notification_type: 'new_recommendation',
        title: 'המלצה חדשה מאושרת',
        message: `ההמלצה "${finalRecommendation.title}" אושרה ומוכנה ליישום`,
        related_item_id: finalRecommendation.id,
        is_read: false
      });
      console.log(`Notification created for customer: ${customer.email} about published recommendation`);

      console.log("ההמלצה פורסמה והועברה ללקוח בהצלחה!");
      toast.success("ההמלצה פורסמה בהצלחה!");

    } catch (error) {
      console.error("Error publishing recommendation:", error);
      toast.error("שגיאה בפרסום ההמלצה: " + error.message);
      await loadRecommendationsOnly();
    } finally {
        setPublishingRecommendations(prev => ({ ...prev, [recommendation.id]: false }));
    }
  };

  // ===== שליחת וואטסאפ עם עדכון אופטימסטי =====
  const handleSendRecommendationWhatsApp = async (rec) => {
    setIsSendingWhatsApp(true);
    setSendingWhatsAppRecId(rec.id);

    try {
        console.log('Attempting to find contact for email:', rec.customer_email);

        // Step 1: Find the contact in our new, accessible CustomerContact entity
        const contacts = await CustomerContact.filter({ customer_email: rec.customer_email });

        if (contacts.length === 0) {
            console.error('Contact not found in CustomerContact entity for email:', rec.customer_email);
            throw new Error("לא נמצא איש קשר עם המייל המשויך להמלצה. יש לוודא שהלקוח אושר ורשומת יצירת קשר נוצרה עבורו.");
        }

        const customerContact = contacts[0];
        console.log('Contact found:', customerContact);

        if (!customerContact.phone) {
            throw new Error("לאיש קשר זה אין מספר טלפון שמור במערכת.");
        }

        // Step 2: Call the backend function with the confirmed phone number
        const { data: result, error } = await sendWhatsAppMessage({
            phoneNumber: customerContact.phone,
            customerEmail: customerContact.customer_email,
            recommendation: rec,
        });

        if (error || !result?.success) {
            throw new Error(result?.error || 'שליחת ההודעה נכשלה');
        }

        // Step 3: Optimistically update the UI
        setRecommendations(prev =>
            prev.map(r =>
                r.id === rec.id ? { ...r, delivery_status: 'sent' } : r
            )
        );
        toast.success('הודעה נשלחה בהצלחה!');

    } catch (error) {
        console.error("Error sending WhatsApp:", error);
        toast.error(`שגיאה בשליחת וואטסאפ: ${error.message}`);
        await loadRecommendationsOnly(); // Refresh data on error
    } finally {
        setIsSendingWhatsApp(false);
        setSendingWhatsAppRecId(null);
    }
  };

  const handleGenerateAndSend = async (customer) => {
    // This function was likely intended to be part of an integration point.
    // Its actual implementation details were not provided, and it's not currently called.
    // Keeping it as a placeholder if needed for future features.
  };

  const openViewModal = (recommendation) => {
    setViewingRecommendation(recommendation);
    setIsEditingInModal(false); 
    setDetailsModalOpen(true);
  };

  const openEditRecommendationModal = (recommendation) => {
    setViewingRecommendation(recommendation); 
    setEditingRecommendation({ ...recommendation }); 
    setIsEditingInModal(true); 
    setDetailsModalOpen(true); 
  };

  const handleEditRecommendation = (recommendation) => {
    setEditingRecommendation({ ...recommendation });
    setIsEditingInModal(true);
  };

  const handleSaveRecommendationEdit = async () => {
    if (!editingRecommendation) return;

    try {
      await Recommendation.update(editingRecommendation.id, {
        title: editingRecommendation.title,
        description: editingRecommendation.description,
        category: editingRecommendation.category,
        expected_profit: editingRecommendation.expected_profit,
        priority: editingRecommendation.priority,
        action_steps: editingRecommendation.action_steps,
        admin_notes: editingRecommendation.admin_notes
      });

      await loadInitialData(); 
      setViewingRecommendation(editingRecommendation); 
      setIsEditingInModal(false); 
      setEditingRecommendation(null); 
      toast.success("ההמלצה נשמרה בהצלחה");
    } catch (error) {
      console.error("Error updating recommendation:", error);
      toast.error("שגיאה בשמירת ההמלצה");
    }
  };

  const handleCancelRecommendationEdit = () => {
    setIsEditingInModal(false);
    setEditingRecommendation(null); 
  };

  const addActionStep = () => {
    if (!editingRecommendation) return;
    setEditingRecommendation(prev => ({
      ...prev,
      action_steps: [...(prev.action_steps || []), ""]
    }));
  };

  const removeActionStep = (index) => {
    if (!editingRecommendation) return;
    setEditingRecommendation(prev => ({
      ...prev,
      action_steps: prev.action_steps.filter((_, i) => i !== index)
    }));
  };

  const updateActionStep = (index, value) => {
    if (!editingRecommendation) return;
    setEditingRecommendation(prev => {
      const newSteps = [...prev.action_steps];
      newSteps[index] = value;
      return {
        ...prev,
        action_steps: newSteps
      };
    });
  };

  


  const downloadCustomersData = () => {
    const csvContent = [
      ['שם עסק', 'אימייל', 'טלפון', 'סוג עסק', 'מחזור חודשי', 'תאריך הצטרפות'].join(','),
      ...customers.map(user => [ 
        `"${(user.business_name || user.full_name || '').replace(/"/g, '""')}"`,
        `"${(user.email || '').replace(/"/g, '""')}"`,
        `"${(user.phone || '').replace(/"/g, '""')}"`,
        `"${(user.business_type || '').replace(/"/g, '""')}"`,
        user.monthly_revenue || 0,
        user.created_date ? new Date(user.created_date).toLocaleDateString('he-IL') : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `לקוחות_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    document.body.removeChild(link);
    link.click();
  };

  // ===== פתרון טיקט עם עדכון אופטימטי =====
  const handleResolveTicket = async (ticket) => {
    try {
      // עדכון מיידי בממשק
      const updatedTicket = {
        ...ticket,
        status: 'resolved',
        resolved_date: new Date().toISOString()
      };
      
      setSupportTickets(prev => prev.map(t =>
        t.id === ticket.id
          ? updatedTicket
          : t
      ));
      // Update pending support tickets state as well
      setPendingSupportTickets(prev => prev.filter(t => t.id !== ticket.id));
      
      // עדכון בשרת
      await SupportTicket.update(ticket.id, {
        status: 'resolved',
        resolved_date: new Date().toISOString()
    });
      toast.success(`פנייה "${ticket.subject}" סומנה כנפתרה.`);
    } catch (error) {
      console.error("Error resolving ticket:", error);
      // במקרה של שגיאה - טען מחדש רק טיקטים
      try {
        const ticketsData = await SupportTicket.list('-created_date');
        setSupportTickets(ticketsData);
        setPendingSupportTickets(ticketsData.filter(t => t.status === 'open' || t.status === 'in_progress'));
      } catch (reloadError) {
        console.error("Error reloading tickets:", reloadError);
      }
      toast.error("שגיאה בסימון הפנייה כנפתרה: " + error.message);
    }
  };

  const handleViewTicketDetails = (ticket) => {
    setViewingTicket(ticket);
    setViewTicketModalOpen(true);
  };

  // ===== יצירת המלצה ידנית עם עדכון אופטימסטי =====
  const handleCreateManualRecommendation = async () => { 
    if (!selectedCustomer || !manualRecommendation.title || !manualRecommendation.description) {
      toast.warning('יש למלא את כל השדות הנדרשים');
      return;
    }

    try {
      const validActionSteps = manualRecommendation.action_steps.filter(step => step.trim() !== '');

      const recommendationData = {
        ...manualRecommendation,
        customer_email: selectedCustomer.email,
        status: 'pending',
        delivery_status: 'not_sent',
        action_steps: validActionSteps.length > 0 ? validActionSteps : [
          'בחינת המצב הקיים והכנת תוכנית מפורטת',
          'גיבוש תוכנית פעולה עם לוחות זמנים',
          'יישום השינויים הנדרשים בשלבים',
          'מדידת תוצאות והתאמות לפי הצורך'
        ]
      };

      const createdRec = await Recommendation.create(recommendationData);
      setRecommendations(prev => [...prev, createdRec]); // Optimistic update
      
      setShowManualRecommendationModal(false); 
      setManualRecommendation({ 
        title: '',
        description: '',
        category: 'pricing',
        expected_profit: 0,
        priority: 'medium',
        action_steps: ['', '', '', '']
      });

      toast.success(`ההמלצה נוצרה בהצלחה עבור ${selectedCustomer.business_name || selectedCustomer.full_name}!`);
    } catch (error) {
      console.error('Error creating recommendation:', error);
      toast.error('שגיאה ביצירת ההמלצה: ' + error.message);
      await loadRecommendationsOnly();
    }
  };

  const handleActionStepChange = (index, value) => {
    setManualRecommendation(prev => ({
      ...prev,
      action_steps: prev.action_steps.map((step, i) => i === index ? value : step)
    }));
  };

  const addNewRecActionStep = () => {
    setManualRecommendation(prev => ({
      ...prev,
      action_steps: [...prev.action_steps, '']
    }));
  };

  const removeNewRecActionStep = (index) => {
    if (manualRecommendation.action_steps.length > 1) { // Ensure at least one action step remains
      setManualRecommendation(prev => ({
        ...prev,
        action_steps: prev.action_steps.filter((_, i) => i !== index)
      }));
    }
  };

  // ===== שינוי סטטוס לקוח עם עדכון אופטימסטי =====
  const handleToggleCustomerStatus = async (customer) => {
      if (!customer) return;

      setTogglingCustomer(customer.id);
      try {
          const newStatus = !customer.is_active;

          // עדכון אופטימסטי בממשק המשתמש
          setCustomers(prevUsers => prevUsers.map(u =>
              u.id === customer.id ? { ...u, is_active: newStatus } : u
          ));

          // *** לוגיקת עדכון Entity בהתאם לסוג הלקוח ***
          // אם הלקוח הוא רשומת אונבורדינג (onboarding_record_only)
          if (customer.is_onboarding_record_only) {
              // מזהה את ה-ID האמיתי של בקשת האונבורדינג
              const onboardingRequestId = customer.id.replace('onboarding_', '');
              await OnboardingRequest.update(onboardingRequestId, { is_active: newStatus });
              console.log(`Onboarding customer ${customer.business_name || customer.full_name} status changed to: ${newStatus ? 'active' : 'inactive'}`);
          } else {
              // אם זהו לקוח User רגיל
              await User.update(customer.id, {
                  is_active: newStatus,
                  last_activity: new Date().toISOString()
              });
              console.log(`User customer ${customer.business_name || customer.full_name} status changed to: ${newStatus ? 'active' : 'inactive'}`);
          }

      } catch (error) {
          console.error("שגיאה בעדכון סטטוס הלקוח:", error);
          // במקרה של שגיאה - החזר למצב קודם (אופטימסטי)
          setCustomers(prevUsers => prevUsers.map(u =>
              u.id === customer.id ? { ...u, is_active: customer.is_active } : u
          ));
          toast.error("שגיאה בעדכון סטטוס הלקוח: " + error.message);
      } finally {
          setTogglingCustomer(null);
      }
  };
  const handleDeleteOnboardingCustomer = async (customerId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את לקוח הפילאאוט הזה? פעולה זו בלתי הפיכה ותמחק את בקשת האונבורדינג שלו.")) {
      return;
    }
    try {
      // מזהה שהלקוח הוא מטיפוס 'onboarding_request'
      if (typeof customerId === 'string' && customerId.startsWith('onboarding_')) {
        const onboardingRequestId = customerId.replace('onboarding_', '');
        await OnboardingRequest.delete(onboardingRequestId);
        toast.success("לקוח הפילאאוט נמחק בהצלחה!");
      } else {
        toast.error("שגיאה: לא ניתן למחוק לקוח זה בדרך זו. נראה שזוהי אינה בקשת פילאאוט.");
        return;
      }

      // רענן את נתוני המנהל כדי לעדכן את הרשימה
      await loadInitialData(); // טעינה מחדש של כל הנתונים תבטיח עקביות

    } catch (error) {
      console.error("שגיאה במחיקת לקוח אונבורדינג:", error);
      toast.error("שגיאה במחיקת לקוח הפילאאוט: " + error.message);
    }
  };
    // הוספה: פונקציות לניהול ספקים
  const handleAddSupplier = () => {
    setShowAddSupplierModal(true);
  };

  const handleSupplierAdded = (newSupplier) => {
    // רענן את נתוני הספקים לאחר הוספה
    loadInitialData(); // לטעון מחדש את כל הנתונים כולל הלידים והמשתמשים המשויכים
    setShowAddSupplierModal(false);
  };
    const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setShowEditSupplierModal(true);
  };

  const handleSupplierUpdated = () => {
    setShowEditSupplierModal(false);
    setEditingSupplier(null);
    loadInitialData(); // רענן את כל הנתונים לאחר העדכון
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הספק? פעולה זו תסיר אותו מהמערכת.")) {
      return;
    }
    try {
      // מחיקה רכיבה: עדכון is_active ל-false
      await Supplier.update(supplierId, { is_active: false });
      toast.success("הספק נמחק בהצלחה!");
      loadInitialData(); // רענן את הנתונים לאחר המחיקה
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("שגיאה במחיקת הספק: " + error.message);
    }
  };
  const handleAssignSupplierUserClick = (supplier) => {
    setSupplierToAssignUser(supplier);
    setShowAssignSupplierUserModal(true);
  };

  const handleSupplierUserAssigned = () => {
    // רענן נתונים לאחר שיוך משתמש ספק
    loadInitialData();
    setShowAssignSupplierUserModal(false);
    setSupplierToAssignUser(null);
  };
  const handleSetCustomerType = async (customer, newType) => {
    if (!customer) return;

    try {
      await User.update(customer.id, {
        customer_type: newType,
        last_activity: new Date().toISOString()
      });

      setCustomers(prevUsers => prevUsers.map(u => 
        u.id === customer.id ? { ...u, customer_type: newType } : u
      ));

      console.log(`Customer ${customer.business_name} type changed to: ${newType}`);
    } catch (error) {
      console.error("Error updating customer type:", error);
      toast.error("שגיאה בעדכון סוג הלקוח");
    }
  };

  const handleOpenEditCustomerModal = (customer) => {
    setCustomerToEdit(customer);
    setShowEditCustomerModal(true);
  };


  const handleCustomerUpdated = (updatedCustomer) => { // קבל את הנתונים המעודכנים כפרמטר
    setShowEditCustomerModal(false);

    // עדכן את רשימת הלקוחות הראשית
    setCustomers(prevCustomers => prevCustomers.map(c =>
      c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c
    ));

    // עדכן את הלקוח הנבחר אם הוא הלקוח שעודכן
    setSelectedCustomer(prevSelected => {
      if (prevSelected && prevSelected.id === updatedCustomer.id) {
        return updatedCustomer;
      }
      return prevSelected;
    });
    // אין צורך ב-loadData();

  };

  const getFilteredCustomers = () => { // This function is now superseded by filterCustomersByFinancialManager
    // This function logic is now merged into `filterCustomersByFinancialManager`
    // and `filteredCustomers` state directly holds the final filtered list.
    // This function can be removed if not called directly elsewhere, or its name changed for clarity
    // if it's meant to apply *additional* filters on top of the FM filter.
    return filteredCustomers; // Return the already filtered list
  };

  const handleShowIrrelevantRecs = async (customer) => {
    setIsIrrelevantModalOpen(true);
  };
  
  const handleOpenUpgradeModalFromList = (recommendation) => {
    setSelectedRecommendationForUpgrade(recommendation);
    setIsUpgradeModalOpen(true);
  };

  const handleRecommendationUpdated = () => {
    setIsUpgradeModalOpen(false);
    loadInitialData();
  };

  const handleUpgradeRecommendationClick = (rec) => {
    setSelectedRecommendationForUpgrade(rec);
    setIsUpgradeModalOpen(true);
  };
  
  const handleUpgradePromptSubmit = async (userPrompt) => {
    if (!recommendationToUpgrade) return;
    
    setIsUpgradingWithPrompt(true);
    setUpdatingRecommendations(prev => ({ ...prev, [recommendationToUpgrade.id]: true }));

    try {
      const customer = customers.find(c => c.email === recommendationToUpgrade.customer_email); 
      if (!customer) {
        throw new Error("Customer not found for this recommendation");
      }
      
      console.log("Starting recommendation upgrade with prompt:", userPrompt);
      
      const upgradedRec = await enhanceRecommendationWithPrompt(
        recommendationToUpgrade,
        userPrompt,
        customer
      );
      
      console.log("Received upgraded recommendation:", upgradedRec);
      
      if (upgradedRec && upgradedRec.title) {
        await Recommendation.update(recommendationToUpgrade.id, {
          title: upgradedRec.title || recommendationToUpgrade.title,
          description: upgradedRec.description || recommendationToUpgrade.description,
          category: upgradedRec.category || recommendationToUpgrade.category,
          expected_profit: upgradedRec.expected_profit, // Use only the upgraded expected_profit
          profit_percentage: upgradedRec.profit_percentage || recommendationToUpgrade.profit_percentage,
          priority: upgradedRec.priority || recommendationToUpgrade.priority,
          action_steps: upgradedRec.action_steps || recommendationToUpgrade.action_steps,
          implementation_effort: upgradedRec.implementation_effort || recommendationToUpgrade.implementation_effort,
          timeframe: upgradedRec.timeframe || recommendationToUpgrade.timeframe,
          status: 'published_by_admin', // Mark as published on upgrade
          last_upgraded: new Date().toISOString(),
          admin_rating: null,
          last_rated_by_admin_date: null,
          customer_email: recommendationToUpgrade.customer_email, 
          related_data: {
            ...recommendationToUpgrade.related_data,
            ...upgradedRec.related_data,
            upgrade_history: [
              ...(recommendationToUpgrade.related_data?.upgrade_history || []),
              {
                upgraded_at: new Date().toISOString(),
                upgrade_prompt: userPrompt,
                previous_title: recommendationToUpgrade.title,
                previous_description: recommendationToUpgrade.description?.substring(0, 100) + "..."
              }
            ]
          }
        });

        toast.success('ההמלצה שודרגה בהצלחה על בסיס ההנחיה שלך!');
      } else {
        throw new Error("הבינה המלאכותית לא החזירה המלצה משודרגת. נסה הנחיה אחרת.");
      }
    } catch (error) {
      console.error("Error upgrading recommendation with prompt:", error);
      toast.error("שגיאה בשדרוג ההמלצה: " + error.message);
    } finally {
      setIsUpgradingWithPrompt(false);
      setIsUpgradePromptModalOpen(false);
      setUpdatingRecommendations(prev => ({ ...prev, [recommendationToUpgrade.id]: false }));
      setRecommendationToUpgrade(null); 
      loadInitialData();
    }
  };

  const handleDeleteRecommendation = async (recommendationId) => { 
    if (!recommendationId) return;
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ההמלצה? פעולה זו בלתי הפיכה.`)) {
        return;
    }

    try {
        setIsLoading(true);
        await Recommendation.delete(recommendationId);
        await loadInitialData();
        setDetailsModalOpen(false); 
        setViewingRecommendation(null);
        toast.success("ההמלצה נמקה בהצלחה!");
    } catch (error) {
        console.error("Error deleting recommendation:", error);
        toast.error("שגיאה במחיקת ההמלצה: " + error.message);
    } finally {
        setIsLoading(false);
    }
  };
  

// פונקציה לטיפול בסיום הזנת הקלט האסטרטגי (קריאה מהשאלון)
  const handleStrategicInputSubmitted = async (savedInput) => {
      setShowStrategicInputForm(false); // סגור את מודאל הקלט האסטרטגי
      
      // וודא ש-savedInput ו-selectedForecastForPlan קיימים לפני הקריאה ל-generateBusinessPlanText
      if (savedInput && savedInput.id && selectedForecastForPlan) {
          // הפעל את יצירת התוכנית העסקית בפועל עם ה-ID של הקלט האסטרטגי שנשמר/עודכן
          // קריאה לפונקציית handleGenerateBusinessPlan החדשה
          await handleGenerateBusinessPlan(selectedForecastForPlan.id, selectedCustomer.email, savedInput.id);
      } else {
          console.error("Missing saved input or selected forecast for plan generation.");
          setCurrentPlanText('שגיאה: חסרים נתונים ליצירת התוכנית העסקית.');
          setIsGeneratingPlan(false); // בטל טעינה אם יש שגיאה
      }
      await loadInitialData(); // רענן את כל הנתונים של האדמין (ייתכן וקלט אסטרטגי חדש נוסף/עודכן)
  };
  const handleSaveBusinessPlanText = async () => {
    if (!selectedForecastForPlan || !editedPlanText) return;

    setIsSavingPlan(true);
    try {
        // שמירת הטקסט הערוך לישות BusinessForecast
        await BusinessForecast.update(selectedForecastForPlan.id, { business_plan_text: editedPlanText });
        setCurrentPlanText(editedPlanText); // עדכן את הטקסט המוצג לטקסט שנשמר
        setIsEditingPlan(false); // צא ממצב עריכה
        toast.success('התוכנית נשמרה בהצלחה!');

        // רענן את רשימת התחזיות כדי שהשינוי ישתקף
        const updatedForecasts = await BusinessForecast.filter({ customer_email: selectedCustomer.email });
        // MODIFY: Use setForecasts if it exists and is intended for this purpose
        // setForecasts(updatedForecasts); // עדכן את state התחזיות הכללי
        // עדכן את selectedForecast אם הוא זהה
        // if (selectedForecast && selectedForecast.id === selectedForecastForPlan.id) {
        //     setSelectedForecast(updatedForecasts.find(f => f.id === selectedForecastForPlan.id));
        // }
    } catch (error) {
        console.error("Error saving edited plan:", error);
        toast.error("שגיאה בשמירת התוכנית העסקית: " + error.message);
    } finally {
        setIsSavingPlan(false);
    }
};

  const handleEditBusinessPlan = () => {
      setIsEditingPlan(true);
      setEditedPlanText(currentPlanText); // טען את הטקסט הנוכחי לעריכה
  };

  const handleCancelEditBusinessPlan = () => {
      setIsEditingPlan(false);
      setEditedPlanText(''); // נקה את הטקסט הערוך
  };

  const handleExportBusinessPlanPdf = async () => {
      if (!currentPlanText || !selectedForecastForPlan || isExportingPlan) return;

      setIsExportingPlan(true);
      try {
         // קריאה לפונקציית ה-Backend לייצוא PDF
          const response = await fetch('/api/functions/exportBusinessPlanToPdf', { // ודא שזה הנתיב הנכון לפונקציה שלך
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('supabase-auth-token')}` // ודא שיש לך טוקן אימות
             },
              body: JSON.stringify({
                  business_plan_text: isEditingPlan ? editedPlanText : currentPlanText, // ייצא את הטקסט הערוך אם במצב עריכה, אחרת את המוצג
                  business_name: selectedCustomer?.business_name || selectedCustomer?.full_name,
                  forecast_name: selectedForecastForPlan.forecast_name
              }),
          });

         if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `PDF export failed with status: ${response.status}`);
          }

          // קבלת הקובץ כ-Blob והורדה
          const blob = await response.blob();
          const filename = response.headers.get('Content-Disposition')?.split('filename=')[1] || `תוכנית_עסקית_${selectedForecastForPlan.forecast_name}.pdf`;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename.replace(/"/g, ''); // הסר גרשיים כפולות אם קיימות
          document.body.appendChild(a);
          document.body.removeChild(a);
          a.click();
         window.URL.revokeObjectURL(url);
         toast.success('התוכנית העסקית יוצאה ל-PDF בהצלחה!');
     } catch (error) {
         console.error("Error exporting business plan to PDF:", error);
          toast.error("שגיאה בייצוא התוכנית העסקית ל-PDF: " + error.message);
     } finally {
          setIsExportingPlan(false);
     }
  };
  const handleInitiateBusinessPlanGeneration = async (forecast) => {
      if (!selectedCustomer?.email) {
          toast.error("שגיאה: לקוח לא נבחר או אימייל לקוח חסר.");
          return;
      }

      // אל תפעיל setIsGeneratingPlan(true) כאן! הטעינה תופעל רק לאחר הגשת השאלון.
      setCurrentPlanText('טוען שאלון אסטרטגי...'); // הודעה שתוצג במודאל התוכנית העסקית
      setIsPlanModalOpen(true); // פתח את מודאל התוכנית העסקית מיד (הוא יציג את ההודעה לעיל)
      setSelectedForecastForPlan(forecast); // שמור את התחזית הנבחרת

      try {
          // תמיד נחפש אם קיים קלט אסטרטגי כדי לטעון אותו לטופס
          const existingInput = await StrategicPlanInput.filter({ customer_email: selectedCustomer.email });
          setExistingStrategicInputForForm(existingInput.length > 0 ? existingInput[0] : null); // שמור את הקלט הקיים לטופס

          // תמיד נפתח את מודאל השאלון
          setShowStrategicInputForm(true);

      } catch (error) {
          console.error("Error initiating business plan generation:", error);
          setCurrentPlanText(`שגיאה בהפעלת יצירת התוכנית העסקית: ${error.message}`);
          setIsGeneratingPlan(false); // בטל מצב טעינה אם משהו השתבש לפני שהגיע לשאלון
      }
  };
  const handleArchiveRecommendation = async (recId) => { // Changed param to recId
    if (!confirm(`האם אתה בטוח שברצונך להעביר את ההמלצה לארכיון? פעולה זו תסיר אותה מרשימת ההמלצות הפעילות.`)) {
      return;
    }

    try {
      await Recommendation.update(recId, { 
        status: 'archived',
        admin_notes: `הועבר לארכיון על ידי אדמין בתאריך ${new Date().toLocaleDateString('he-IL')}`
      });
      
      await loadRecommendationsOnly(); // Refresh active recommendations
      await loadArchivedRecommendations(); // Refresh archived recommendations
      
      toast.success("ההמלצה הועברה לארכיון בהצלחה");
    } catch (error) {
      console.error("Error archiving recommendation:", error);
      toast.error("שגיאה בהעברה לארכיון: " + error.message);
    }
  };

  const handleViewArchivedRecommendations = async () => {
    await loadArchivedRecommendations();
    setShowArchivedRecommendations(true);
  };

  // NEW: Callback for when an onboarding request is approved
  const handleOnboardingApproved = () => {
    setShowOnboardingModal(false);
    loadInitialData();// Reload all admin data after an approval to update customer list and pending requests
  };

  // const filteredCustomers = getFilteredCustomers(); // No longer directly called, logic is now in filterCustomersByFinancialManager effect.


  const selectedCustomerRecs = selectedCustomer ? recommendations.filter(r => r.customer_email === selectedCustomer.email) : []; 
  const selectedCustomerUploads = selectedCustomer ? allUploads.filter(u => u.customer_email === selectedCustomer.email) : []; 
  const selectedCustomerActivity = selectedCustomer ? allUserActivities.find(act => act.user_email === selectedCustomer.email) : null;

  const filteredAndSortedRecommendations = useMemo(() => {
    if (!selectedCustomerRecs) return [];
  
    let recommendations = [...selectedCustomerRecs];
  
    // 1. סינון לפי קטגוריה
    if (recommendationCategoryFilter !== 'all') {
      recommendations = recommendations.filter(rec => rec.category === recommendationCategoryFilter);
    }
    // פילטר להמלצות ממוקדות
    if (showFocusedOnly) {
      recommendations = recommendations.filter(rec => rec.isFocusedRecommendation);
    }
    // 2. מיון
    const sortField = recommendationSort.replace('-', '');
    const sortOrder = recommendationSort.startsWith('-') ? 'desc' : 'asc';
  
    recommendations.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'admin_rating') {
        if (valA === null || valA === undefined) valA = -Infinity;
        if (valB === null || valB === undefined) valB = -Infinity;
      }

      if (sortField === 'created_date') {
        valA = new Date(valA);
        valB = new Date(valB);
      }
  
      if (valA < valB) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  
    return recommendations;
  }, [selectedCustomerRecs, recommendationCategoryFilter, recommendationSort]);


  // Determine if the current user is a financial manager or an admin
  const isFinancialManager = currentUser?.role === 'user' && currentUser?.user_type === 'financial_manager';
  const isAdmin = currentUser?.role === 'admin';

  if (isLoading) {
    return <LoadingScreen message="  טוען את לוח הבקרה שלך... " />;
  }

  // Access control check based on role and user_type
  if (!currentUser || !(isAdmin || isFinancialManager)) {
    return (
      <div className="min-h-screen bg-horizon-dark p-6 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4 text-horizon-text">אין לך הרשאת גישה לדף זה.</h1>
        <Button asChild className="btn-horizon-primary">
          <Link to={createPageUrl("Dashboard")}>חזור לדשבורד</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Message for Ofek */}
        <div className="p-8 bg-gradient-to-l from-[#32acc1]/10 via-white to-[#fc9f67]/10 border-b-2 border-[#32acc1]/20 animate-fadeInUp">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#32acc1] to-[#83ddec] rounded-xl flex items-center justify-center shadow-lg hover-scale">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#fc9f67] mb-1" style={{ fontFamily: "'Heebo', sans-serif" }}>
                דשבורד ניהול
              </h1>
              <p className="text-sm text-horizon-accent">מערכת ניהול חכמה ומתקדמת</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-6">
          <div></div> {/* Spacer */}
          <NotificationCenter />
        </div>

        {generatingRecommendations && (
          <Alert className="mb-6 bg-blue-900/20 border-blue-500/50">
            <div className="flex items-center">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <AlertDescription className="text-blue-300 flex-grow">{generationStatus}</AlertDescription>
            </div>
            {progress > 0 && <Progress value={progress} className="h-2 mt-2" indicatorColor="bg-horizon-primary" />}
          </Alert>
        )}

        {/* Daily Statistics Cards - show only for admin */}
        {isAdmin && dailyStats && overallStats && (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
            <Card className="card-horizon hover-lift stagger-item relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#32acc1]/10 to-transparent rounded-full -mr-16 -mt-16"></div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-horizon-accent mb-2">לקוחות חדשים היום</p>
                    <div className="text-3xl font-bold text-[#32acc1] mb-1 animate-fadeInScale">
                      {dailyStats.newUsers}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-horizon-accent">סה"כ: {overallStats.totalCustomers}</span>
                    </div>
                  </div>
                  
                  <div className="w-14 h-14 bg-gradient-to-br from-[#fc9f67] to-[#fc8a68] rounded-xl flex items-center justify-center shadow-lg hover-scale">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            

          

            {/* NEW: Irrelevant Recommendations Card */}
            <Card 
              className="card-horizon hover-lift stagger-item relative overflow-hidden cursor-pointer"
              onClick={() => setIsIrrelevantModalOpen(true)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-horizon-accent mb-2">המלצות לא רלוונטיות</p>
                    <div className="text-3xl font-bold text-red-500 mb-1 animate-fadeInScale">
                      {irrelevantRecs.length}
                    </div>
                    <p className="text-xs text-horizon-accent">סה"כ במערכת</p>
                  </div>
                  
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg hover-scale">
                    <XCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            
          </div>
        )}

        <div className="w-full">
          {/* כפתורי פעולה מהירים */}
          <div className="flex gap-3 mb-4">
            <Button
              onClick={() => setShowUserApprovalModal(true)}
              className="bg-gradient-to-r from-[#32acc1] to-[#83ddec] hover:from-[#2a95a8] hover:to-[#6dd0e0] text-white font-bold shadow-md"
            >
              <ShieldCheck className="w-4 h-4 ml-2" />
              אישור משתמשים חדשים
            </Button>
          </div>

          {/* Main Content Area */}
          <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-nowrap  mb-6 bg-white border-2 border-[#e1e8ed] rounded-xl p-2 shadow-md">
                <TabsTrigger 
                  value="overview" 
                  className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  סקירה כללית
                </TabsTrigger>
                <TabsTrigger 
                  value="customers"
                  className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
                >
                  <Users className="w-4 h-4 mr-2" />
                  ניהול לקוחות
                </TabsTrigger>

              </TabsList>

              <TabsContent value="overview">
                <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}>
                  <DailyTasksDashboard currentUser={currentUser} isAdmin={isAdmin} />
                </Suspense>
              </TabsContent>

              <TabsContent value="customers">
                <Navigate to={createPageUrl("CustomerManagementNew")} replace />
              </TabsContent>
              <TabsContent value="tasks">
                <TaskManagement />
              </TabsContent>

              {/* New System Management tab (combining old catalog and support) */}
              
              <TabsContent value="archive" className="space-y-6">
                <Card className="card-horizon">
                  <CardHeader>
                    <CardTitle className="text-horizon-text flex items-center gap-2">
                      <Archive className="w-6 h-6 text-orange-500" />
                      ניהול ארכיון
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <Button
                        onClick={handleViewArchivedRecommendations}
                        className="btn-horizon-secondary justify-start h-12"
                      >
                        <Archive className="w-5 h-5 ml-2" />
                        צפה בארכיון המלצות ({archivedRecommendations.length})
                      </Button>
                      
                      <div className="text-sm text-horizon-accent">
                        <p>ארכיון המלצות מכיל את כל ההמלצות שהועברו לארכיון על ידי צוות הניהול.</p>
                        <p>המלצות בארכיון נשמרות למטרות מעקב והיסטוריה, ואינן מוצגות ללקוחות.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
              </TabsContent>
                     {/* הוספה: טאב ניהול ספקים */}
              <TabsContent value="suppliers">
                  <Card className="card-horizon mt-6">
                      <CardHeader>
                          <div className="flex justify-between items-center">
                              <CardTitle className="text-horizon-text flex items-center gap-2">
                                  <Truck className="w-5 h-5" />
                                  ניהול ספקים
                              </CardTitle>
                              <Button onClick={() => setShowAddSupplierModal(true)} className="btn-horizon-primary">
                                  <Plus className="w-4 h-4 ml-2" />
                                  הוסף ספק חדש
                              </Button>
                          </div>
                      </CardHeader>
                      <CardContent>
                          {suppliers.length === 0 ? (
                              <div className="text-center py-8">
                                  <Truck className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
                                  <h3 className="text-lg font-semibold text-horizon-text mb-2">אין ספקים במערכת</h3>
                                  <p className="text-horizon-accent mb-4">התחל על ידי הוספת ספק חדש.</p>
                              </div>
                          ) : (
                              <div className="overflow-x-auto">
                                  <Table dir="rtl"> {/* הוספנו dir="rtl" */}
                                      <TableHeader>
                                          <TableRow>
                                              <TableHead className="text-right">שם הספק</TableHead>
                                              <TableHead className="text-right">סוג</TableHead>
                                              <TableHead className="text-right">איש קשר</TableHead>
                                              <TableHead className="text-right">טלפון</TableHead>
                                              <TableHead className="text-right">אימייל</TableHead>
                                              <TableHead className="text-right">דירוג</TableHead>
                                              <TableHead className="text-right">נוסף על ידי</TableHead>
                                              <TableHead className="text-right">סטטוס ספק</TableHead> {/* חדש */}
                                              <TableHead className="text-right">פעולות</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {suppliers.filter(s => s.is_active).map((supplier) => { {/* סינון ספקים לא פעילים */}
                                              const assignedSupplierUser = allUsers.find(
                                                  user => user.user_type === 'supplier_user' && user.email === supplier.supplier_user_email
                                              );
                                              return (
                                                  <TableRow key={supplier.id}>
                                                      <TableCell className="font-medium text-right">{supplier.name}</TableCell>
                                                      <TableCell className="text-right">
                                                          {renderCategoryBadge(supplier.category)} {/* שימוש בפונקציה */}
                                                      </TableCell>
                                                      <TableCell className="text-right">{supplier.contact_person}</TableCell>
                                                      <TableCell className="text-right">{supplier.phone}</TableCell>
                                                      <TableCell className="text-right">{supplier.email}</TableCell>
                                                      <TableCell className="text-right">
                                                          {renderStarRating(supplier.rating)} {/* שימוש בפונקציה */}
                                                      </TableCell>
                                                      <TableCell className="text-right">{supplier.added_by_full_name || 'מערכת'}</TableCell>
                                                      <TableCell className="text-right">
                                                          <div className="flex items-center gap-2 justify-end">
                                                              {renderSupplierStatus(supplier)} {/* שימוש בפונקציה */}
                                                              {isAdmin && ( /* רק אדמין יכול לערוך סטטוס שותף */
                                                                  <Switch
                                                                      checked={supplier.is_partner_supplier || false}
                                                                      onCheckedChange={(checked) => handlePartnerToggle(supplier.id, checked)}
                                                                      id={`partner-switch-${supplier.id}`}
                                                                  />
                                                              )}
                                                          </div>
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                          <div className="flex gap-2 justify-end">
                                                              <Button
                                                                  size="sm"
                                                                  variant="outline"
                                                                  onClick={() => handleEditSupplier(supplier)}
                                                              >
                                                                  <Edit className="w-4 h-4 ml-1" />
                                                                  ערוך
                                                              </Button>
                                                              <Button
                                                                  size="sm"
                                                                  variant="destructive"
                                                                  onClick={() => handleDeleteSupplier(supplier.id)}
                                                              >
                                                                  <Trash2 className="w-4 h-4 ml-1" />
                                                                  מחק
                                                              </Button>
                                                          </div>
                                                      </TableCell>
                                                  </TableRow>
                                              );
                                          })}
                                      </TableBody>
                                  </Table>
                              </div>
                          )}

                      </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

      {/* חלון צפייה ועריכת המלצה */}
      {detailsModalOpen && viewingRecommendation && (
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <DialogTitle className="text-xl font-bold text-horizon-text">
                  {isEditingInModal ? "עריכת המלצה" : "פרטי המלצה"}
                </DialogTitle>
                <div className="flex gap-2">
                  {!isEditingInModal ? (
                    <>
                      <Button
                        onClick={() => { 
                            setEditingRecommendation({ ...viewingRecommendation });
                            setIsEditingInModal(true);
                        }}
                        className="btn-horizon-secondary"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        ערוך
                      </Button>

                      <Button
                        onClick={(e) => { 
                          e.stopPropagation();
                          handleUpgradeRecommendationClick(viewingRecommendation); 
                        }}
                        className={`bg-purple-500 text-white ${isUpgradingWithPrompt || updatingRecommendations[viewingRecommendation.id] ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'}`}
                        size="sm"
                        disabled={isUpgradingWithPrompt || updatingRecommendations[viewingRecommendation.id]}
                        title={isUpgradingWithPrompt || updatingRecommendations[viewingRecommendation.id] ? 'המלצה זו משודרגת כעת...' : 'שדרג המלצה'}
                      >
                        {isUpgradingWithPrompt || updatingRecommendations[viewingRecommendation.id] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            משדרג...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            שדרג המלצה
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => {
                          handleSendRecommendationWhatsApp(viewingRecommendation);
                        }}
                        className="bg-green-400 hover:bg-green-500 text-white"
                        size="sm"
                        disabled={isSendingWhatsApp && sendingWhatsAppRecId === viewingRecommendation.id || viewingRecommendation.delivery_status === 'delivered'} 
                      >
                        {isSendingWhatsApp && sendingWhatsAppRecId === viewingRecommendation.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            שולח...
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            שלח לוואטסאפ
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => handleDeleteRecommendation(viewingRecommendation.id)} 
                        className="text-red-400 hover:text-red-300"
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        מחק
                      </Button>
                    </>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveRecommendationEdit}
                      className="btn-horizon-primary"
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      שמור
                    </Button>
                    <Button
                      onClick={handleCancelRecommendationEdit}
                      variant="outline"
                      size="sm"
                      className="border-horizon-accent text-horizon-accent hover:bg-horizon-card/60"
                    >
                      <X className="w-4 h-4 mr-2" />
                      ביטול
                    </Button>
                  </div>
                )}
              </div>
            </div>
            </DialogHeader>

            <div className="space-y-6 p-4">
              {isEditingInModal && editingRecommendation ? (
                /* מצב עריכה */
                <div className="space-y-6">
                  {/* כותרת */}
                  <div>
                    <Label className="text-horizon-text font-medium">כותרת ההמלצה</Label>
                    <Input
                      value={editingRecommendation.title}
                      onChange={(e) => setEditingRecommendation({
                        ...editingRecommendation,
                        title: e.target.value
                      })}
                      className="bg-horizon-card border-horizon text-horizon-text text-right mt-2"
                    />
                  </div>

                  {/* קטגוריה ועדיפות */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-horizon-text font-medium">קטגוריה</Label>
                      <select
                        value={editingRecommendation.category}
                        onChange={(e) => setEditingRecommendation({
                          ...editingRecommendation,
                          category: e.target.value
                        })}
                        className="w-full mt-2 px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text"
                      >
                        <option value="pricing">תמחור</option>
                        <option value="suppliers">ספקים</option>
                        <option value="inventory">מלאי</option>
                        <option value="promotions">מבצעים שוטפים</option>
                        <option value="bundles">בנדלים</option>
                        <option value="marketing">שיווק</option>
                        <option value="operations">תפעול</option>
                        <option value="strategic_moves">מהלכים אסטרטגיים</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-horizon-text font-medium">עדיפות</Label>
                      <select
                        value={editingRecommendation.priority}
                        onChange={(e) => setEditingRecommendation({
                          ...editingRecommendation,
                          priority: e.target.value
                        })}
                        className="w-full mt-2 px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text"
                      >
                        <option value="high">גבוהה</option>
                        <option value="medium">בינונית</option>
                        <option value="low">נמוכה</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-horizon-text font-medium">רווח צפוי (₪)</Label>
                      <Input
                        type="number"
                        value={editingRecommendation.expected_profit || 0}
                        onChange={(e) => setEditingRecommendation({
                          ...editingRecommendation,
                          expected_profit: parseFloat(e.target.value) || 0
                        })}
                        className="bg-horizon-card border-horizon text-horizon-text text-right mt-2"
                      />
                    </div>
                  </div>

                  {/* תיאור */}
                  <div>
                    <Label className="text-horizon-text font-medium">תיאור ההמלצה</Label>
                    <Textarea
                      value={editingRecommendation.description}
                      onChange={(e) => setEditingRecommendation({
                        ...editingRecommendation,
                        description: e.target.value
                      })}
                      rows={6}
                      className="w-full mt-2 px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text text-right resize-none"
                    />
                  </div>

                  {/* שלבי ביצוע */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-horizon-text font-medium">שלבי ביצוע</Label>
                      <Button
                        type="button"
                        onClick={addActionStep}
                        size="sm"
                        className="btn-horizon-secondary"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        הוסף שלב
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(editingRecommendation.action_steps || []).map((step, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <span className="text-horizon-accent font-medium min-w-[30px] text-center">
                            {index + 1}.
                          </span>
                          <Input
                            value={step}
                            onChange={(e) => updateActionStep(index, e.target.value)}
                            placeholder={`שלב ${index + 1}`}
                            className="bg-horizon-card border-horizon text-horizon-text flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => removeActionStep(index)}
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {(!editingRecommendation.action_steps || editingRecommendation.action_steps.length === 0) && (
                      <div className="text-center py-6 text-horizon-accent">
                        <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>אין שלבי ביצוע. לחץ על "הוסף שלב" כדי להתחיל.</p>
                      </div>
                    )}
                  </div>

                  {/* הערות אדמין */}
                  <div>
                    <Label className="text-horizon-text font-medium">הערות אדמין</Label>
                    <Textarea
                      value={editingRecommendation.admin_notes || ""}
                      onChange={(e) => setEditingRecommendation({
                        ...editingRecommendation,
                        admin_notes: e.target.value
                      })}
                      rows={3}
                      placeholder="הערות פנימיות עבור צוות הוריזון..."
                      className="w-full mt-2 px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text text-right resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* מצב צפייה */
                <div className="space-y-6">
                  {/* פרטי ההמלצה */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-horizon">
                    <div className="text-center">
                      <Badge className={getPriorityColor(viewingRecommendation.priority)}>
                        {getPriorityText(viewingRecommendation.priority)}
                      </Badge>
                      <p className="text-sm text-horizon-accent mt-1">עדיפות</p>
                    </div>
                    <div className="text-center">
                      <Badge className={getCategoryColor(viewingRecommendation.category)}>
                        {categoryTranslations[viewingRecommendation.category] || viewingRecommendation.category}
                      </Badge>
                      <p className="text-sm text-horizon-accent mt-1">קטגוריה</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        ₪{(viewingRecommendation.expected_profit || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-horizon-accent mt-1">רווח צפוי</p>
                    </div>
                  </div>

                  {/* פירוט על המהלך */}
                  <div>
                    <h3 className="text-lg font-semibold text-horizon-primary mb-3">פירוט על המהלך</h3>
                    <div className="bg-horizon-card/30 p-4 rounded-lg">
                      <div className="text-horizon-text leading-relaxed whitespace-pre-line">
                        {viewingRecommendation.description}
                      </div>
                    </div>
                  </div>

                  {/* שלבי ביצוע */}
                  {viewingRecommendation.action_steps && viewingRecommendation.action_steps.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-horizon-primary mb-3">שלבי ביצוע</h3>
                      <div className="space-y-3">
                        {viewingRecommendation.action_steps.map((step, index) => (
                          <div key={index} className="flex items-start gap-3 bg-horizon-card/20 p-3 rounded-lg">
                            <div className="flex-shrink-0 w-6 h-6 bg-horizon-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <p className="text-horizon-text leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* מידע נוסף */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-horizon">
                    <div>
                      <h4 className="font-medium text-horizon-text mb-2">סטטוס:</h4>
                      <Badge className={getStatusColor(viewingRecommendation.status)}>
                        {getStatusText(viewingRecommendation.status)}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-horizon-text mb-2">נוצר בתאריך:</h4>
                      <p className="text-horizon-accent">
                        {viewingRecommendation.created_date ? new Date(viewingRecommendation.created_date).toLocaleDateString('he-IL') : 'לא זמין'}
                      </p>
                    </div>
                  </div>

                  {/* הערות אדמין */}
                  {viewingRecommendation.admin_notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-400 mb-2">הערות אדמין:</h4>
                      <p className="text-horizon-text whitespace-pre-line">
                        {viewingRecommendation.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

        {/* Create Recommendation Modal */}
        {selectedCustomer && (
          <Dialog open={showManualRecommendationModal} onOpenChange={setShowManualRecommendationModal}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
                <DialogHeader className="sticky top-0 bg-horizon-dark z-10 py-4">
                  <DialogTitle className="text-2xl text-horizon-text">יצירת המלצה ידנית</DialogTitle>
                  <DialogDescription className="text-horizon-accent">
                    יוצר המלצה עבור: {selectedCustomer?.business_name || selectedCustomer?.full_name}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div>
                    <Label className="block text-sm font-medium text-horizon-text mb-2">כותרת *</Label>
                    <Input
                      value={manualRecommendation.title}
                      onChange={(e) => setManualRecommendation({...manualRecommendation, title: e.target.value})}
                      placeholder="הכנס כותרת להמלצה"
                      className="bg-horizon-card border-horizon text-horizon-text"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-horizon-text mb-2">תיאור מפורט *</Label>
                    <Textarea
                      value={manualRecommendation.description}
                      onChange={(e) => setManualRecommendation({...manualRecommendation, description: e.target.value})}
                      placeholder="הכנס תיאור מפורט של ההמלצה"
                      className="bg-horizon-card border-horizon text-horizon-text h-24"
                      dir="rtl"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="block text-sm font-medium text-horizon-text mb-2">עדיפות</Label>
                      <select
                        value={manualRecommendation.priority}
                        onChange={(e) => setManualRecommendation({...manualRecommendation, priority: e.target.value})}
                        className="w-full px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text"
                        dir="rtl"
                      >
                        <option value="low">נמוכה</option>
                        <option value="medium">בינונית</option>
                        <option value="high">גבוהה</option>
                      </select>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium text-horizon-text mb-2">רווח צפוי (₪)</Label>
                      <Input
                        type="number"
                        value={manualRecommendation.expected_profit}
                        onChange={(e) => setManualRecommendation({...manualRecommendation, expected_profit: parseFloat(e.target.value) || 0})}
                        placeholder="0"
                        className="bg-horizon-card border-horizon text-horizon-text"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-medium text-horizon-text mb-2">קטגוריה</Label>
                      <select
                        value={manualRecommendation.category}
                        onChange={(e) => setManualRecommendation({...manualRecommendation, category: e.target.value})}
                        className="w-full px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text"
                        dir="rtl"
                      >
                        <option value="pricing">תמחור</option>
                        <option value="suppliers">ספקים</option>
                        <option value="marketing">שיווק</option>
                        <option value="inventory">מלאי</option>
                        <option value="operations">תפעול</option>
                        <option value="promotions">מבצעים</option>
                        <option value="bundles">בנדלים</option>
                        <option value="strategic_moves">מהלכים אסטרטגיים</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label className="block text-sm font-medium text-horizon-text">שלבי ביצוע</Label>
                      <Button
                        type="button"
                        onClick={addNewRecActionStep}
                        className="btn-horizon-secondary"
                        size="sm"
                      >
                        Hוסף שלב
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {manualRecommendation.action_steps.map((step, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-8 h-8 bg-horizon-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <Textarea
                            value={step}
                            onChange={(e) => handleActionStepChange(index, e.target.value)}
                            placeholder={`שלב ${index + 1} - תאר את הפעולה הנדרשת`}
                            className="flex-1 bg-horizon-card border-horizon text-horizon-text"
                            rows={2}
                            dir="rtl"
                          />
                          <Button
                            type="button"
                            onClick={() => removeNewRecActionStep(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                          >
                            הסר
                          </Button>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-horizon-accent mt-3">
                      הוסף שלבי ביצוע מפורטים כדי לע giúp ללקוח ליישם את ההמלצה בצורה מעשית ויעילה
                    </p>
                  </div>

                  <DialogFooter className="flex justify-end gap-3 pt-6 border-t border-horizon sticky bottom-0 bg-horizon-dark z-10 py-4">
                    <Button
                      onClick={() => setShowManualRecommendationModal(false)}
                      variant="outline"
                      className="border-horizon text-horizon-text hover:bg-horizon-card"
                    >
                      ביטול
                    </Button>
                    <Button
                      onClick={handleCreateManualRecommendation}
                      className="btn-horizon-primary"
                    >
                      צור המלצה
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
        )}

        {/* Reset All Recommendations Confirmation Modal */}
        <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <DialogContent className="bg-horizon-dark text-horizon-text border-horizon">
            <DialogHeader>
              <DialogTitle className="text-red-400">אישור מחיקת כל ההמלצות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-horizon-text">האם אתה בטוח שברצונך למחוק את <strong>כל ההמלצות</strong> במערכת?</p>
              <Alert className="bg-red-900/20 border-red-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-300">
                  פעולה זו תמחק {recommendations.length} המלצות ולא ניתן לביטולה! 
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetConfirmOpen(false)} className="border-horizon-accent text-horizon-accent hover:bg-horizon-card/60">
                ביטול
              </Button>
              <Button onClick={handleResetAllRecommendations} className="bg-red-600 hover:bg-red-700 text-white">
                מחק את כל ההמלצות
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Support Ticket Details Modal */}
        <Dialog open={viewTicketModalOpen} onOpenChange={setViewTicketModalOpen}>
          <DialogContent className="sm:max-w-2xl bg-horizon-dark text-horizon-text border-horizon">
            {viewingTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-horizon-text">{viewingTicket.subject}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-horizon-text">שם הלקוח:</span>
                      <p className="text-horizon-accent">{viewingTicket.customer_name || 'לא צוין'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-horizon-text">אימייל:</span>
                      <p className="text-horizon-accent">{viewingTicket.customer_email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-horizon-text">סטטוס:</span>
                      <Badge className={
                        viewingTicket.status === 'open' ? 'bg-red-500' :
                        viewingTicket.status === 'in_progress' ? 'bg-yellow-500' :
                        viewingTicket.status === 'resolved' ? 'bg-green-500' : 'bg-gray-500'
                      }>
                        {viewingTicket.status === 'open' ? 'פתוח' :
                         viewingTicket.status === 'in_progress' ? 'בטיפול' :
                         viewingTicket.status === 'resolved' ? 'נפתר' : 'סגור'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium text-horizon-text">סוג פנייה:</span>
                      <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                        {viewingTicket.ticket_type === 'technical_issue' ? 'תקלה טכנית' :
                         viewingTicket.ticket_type === 'feature_request' ? 'בקשת תכונה' :
                         viewingTicket.ticket_type === 'general_question' ? 'שאלה כללית' : 'דיווח באג'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium text-horizon-text">תאריך יצירה:</span>
                      <p className="text-horizon-accent">
                        {viewingTicket.created_date ? format(new Date(viewingTicket.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : 'לא זמין'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-horizon-text">עדיפות:</span>
                      <Badge className={
                        viewingTicket.priority === 'urgent' ? 'bg-red-600' :
                        viewingTicket.priority === 'high' ? 'bg-orange-500' :
                        viewingTicket.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }>
                        {viewingTicket.priority === 'urgent' ? 'דחוף' :
                         viewingTicket.priority === 'high' ? 'גבוה' :
                         viewingTicket.priority === 'medium' ? 'בינוני' : 'נמוך'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-horizon-text block mb-2">תיאור הבעיה:</span>
                    <div className="bg-horizon-card p-4 rounded-lg">
                      <p className="text-horizon-text leading-relaxed">{viewingTicket.description}</p>
                    </div>
                  </div>

                  {viewingTicket.admin_notes && (
                    <div>
                      <span className="font-medium text-horizon-text block mb-2">הערות מנהל:</span>
                      <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                        <p className="text-horizon-text">{viewingTicket.admin_notes}</p>
                      </div>
                    </div>
                  )}
                  {viewingTicket.resolved_date && (
                    <div>
                      <span className="font-medium text-horizon-text block mb-2">תאריך פתרון:</span>
                      <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                        <p className="text-horizon-text">
                          {format(new Date(viewingTicket.resolved_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                        </p>
                      </div>
                    </div>
                  )}


                  <div className="flex gap-3 pt-4">
                    {(viewingTicket.status === 'open' || viewingTicket.status === 'in_progress') && (
                      <Button
                        onClick={() => {
                          handleResolveTicket(viewingTicket);
                          setViewTicketModalOpen(false);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        סמן כנפתר
                      </Button>
                    )}
                    <Button
                      onClick={() => setViewTicketModalOpen(false)}
                      variant="outline"
                      className="border-horizon-accent text-horizon-accent hover:bg-horizon-card/60"
                    >
                      סגור
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>



        {/* Data Improvement Modal */}
        {showDataImprovementModal && selectedCustomer && (
          <Dialog open={showDataImprovementModal} onOpenChange={setShowDataImprovementModal}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  שיפור דיוק ההמלצות
                </DialogTitle>
                <DialogDescription className="text-horizon-accent">
                  הוספת הנתונים הבאים עבור {selectedCustomer.business_name || selectedCustomer.full_name} תשפר את איכות ההמלצות.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4 px-2">
                {(!products || products.length < 5) && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-400 mb-2">מוצרים במערכת</h4>
                        <p className="text-sm text-horizon-accent mb-3">
                          יש רק {products?.length || 0} מוצרים במערכת. המלצות איכותיות דורשות לפחות 10-15 מוצרים.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {products && products.length > 0 && products.filter(p => !p.monthly_sales || p.monthly_sales === 0).length / products.length > 0.7 && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-400 mb-2">נתוני מכירות חסרים</h4>
                        <p className="text-sm text-horizon-accent mb-3">
                          ל-{Math.round((products.filter(p => !p.monthly_sales || p.monthly_sales === 0).length / products.length) * 100)}% מהמוצרים אין נתוני מכירות חודשיות.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {products && products.length > 0 && products.filter(p => !p.supplier || p.supplier.trim() === '' || !p.inventory).length / products.length > 0.5 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-400 mb-2">נתוני ספקים/מלאי חסרים</h4>
                        <p className="text-sm text-horizon-accent mb-3">
                          ל-{Math.round((products.filter(p => !p.supplier || p.supplier.trim() === '' || !p.inventory).length / products.length) * 100)}% מהמוצרים חסרים נתוני ספק או מלאי.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(!selectedCustomer?.monthly_revenue || !selectedCustomer?.business_goals || !selectedCustomer?.target_customers) && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-400 mb-2">פרטים עסקיים חסרים</h4>
                        <p className="text-sm text-horizon-accent mb-3">
                          חסרים פרטים חשובים על העסק שמשפרים את איכות ההמלצות.
                        </p>
                        <ul className="text-sm text-horizon-accent space-y-1 list-disc list-inside">
                          {!selectedCustomer?.monthly_revenue && <li>מחזור חודשי משוער</li>}
                          {!selectedCustomer?.business_goals && <li>יעדים עסקיים</li>}
                          {!selectedCustomer?.target_customers && <li>קהל יעד</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-horizon">
                <Button onClick={() => setShowDataImprovementModal(false)} variant="outline" className="border-horizon-accent text-horizon-accent hover:bg-horizon-card/60">
                  סגור
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* NEW: Data Gaps Modal */}
        {showDataGapsModal && dataGapsRecommendation && (
          <DataGapsModal
            recommendation={dataGapsRecommendation}
            isOpen={showDataGapsModal}
            onClose={() => setShowDataGapsModal(false)}
          />
        )}
      </div>

      {/* NEW: Targeted Recommendation Modal */}
      {showTargetedModal && selectedCustomer && (
        <TargetedRecommendationModal
          customer={selectedCustomer}
          isOpen={showTargetedModal}
          onClose={() => setShowTargetedModal(false)}
          onSuccess={() => {
            loadRecommendationsOnly(); 
            setShowTargetedModal(false);
          }}
        />
      )}

      {/* NEW: RecommendationUpgradeModal (modified to be the primary upgrade modal) */}
      {isUpgradeModalOpen && selectedRecommendationForUpgrade && (
        <RecommendationUpgradeModal
          isOpen={isUpgradeModalOpen}
          recommendation={selectedRecommendationForUpgrade}
          customer={selectedCustomer} 
          onClose={() => {
            setIsUpgradeModalOpen(false);
            setSelectedRecommendationForUpgrade(null);
          }}
          onUpgraded={handleRecommendationUpdated}
          isFromIrrelevantModal={irrelevantRecs.some(rec => rec.id === selectedRecommendationForUpgrade.id)}
        />
      )}

      {/* Irrelevant Recommendations Modal */}
      {isIrrelevantModalOpen && (
        <IrrelevantRecommendationsModal
          isOpen={isIrrelevantModalOpen}
          onClose={() => setIsIrrelevantModalOpen(false)}
          recommendations={irrelevantRecs}
          customerEmail={selectedCustomer?.email} 
          onUpgradeRecommendation={handleOpenUpgradeModalFromList} // This is the prop name for the outline's onUpgradeRecommendation
        />
      )}

      {/* Archived Recommendations Modal */}
      <ArchivedRecommendationsModal
        isOpen={showArchivedRecommendations}
        onClose={() => setShowArchivedRecommendations(false)}
        archivedRecommendations={archivedRecommendations}
      />

      {customerToEdit && (
        <EditCustomerModal
          customer={customerToEdit}
          isOpen={showEditCustomerModal}
          onClose={() => setShowEditCustomerModal(false)}
          onUpdate={handleCustomerUpdated}
        />
      )}
      {showEditSupplierModal && editingSupplier && (
        <EditSupplierModal
          isOpen={showEditSupplierModal}
          onClose={() => setShowEditSupplierModal(false)}
          supplier={editingSupplier}
          onUpdate={handleSupplierUpdated}
        />
      )}
      {/* מודאל מסמכים חסרים */}
      <MissingDocumentsModal
        isOpen={showMissingDocsModal}
        onClose={() => setShowMissingDocsModal(false)}
        customersWithMissingDocs={customersWithMissingDocs}
      />
      {/* כאן תוסיף את קוד המודאל החדש: */}
      {selectedCustomer && (
        <EnhancedRecommendationOptionsModal
          isOpen={showRecommendationOptionsModal}
          onClose={() => setShowRecommendationOptionsModal(false)}
          onGenerate={(selectedCategories) => {
            handleGenerateEnhancedRecommendations(selectedCustomer, selectedCategories);
          }}
          isLoading={generatingRecommendations}
        />
      )}
      {/* NEW: Onboarding Requests Modal */}
      {showOnboardingModal && (
        <OnboardingRequestsModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          requests={pendingRequests}
          onActionComplete={handleOnboardingApproved}
        />
      )}
      {/* מודאל אישור משתמשים חדשים */}
      {showUserApprovalModal && (
        <UserApprovalModal
          isOpen={showUserApprovalModal}
          onClose={() => setShowUserApprovalModal(false)}
          onActionComplete={() => {
            setShowUserApprovalModal(false);
            loadInitialData();
          }}
        />
      )}
      {/* הוספה: מודאל הוספת ספק */}
      {showAddSupplierModal && (
          <AddSupplierModal
              isOpen={showAddSupplierModal}
              onClose={() => setShowAddSupplierModal(false)}
              onSupplierAdded={() => {
                  setShowAddSupplierModal(false);
                  loadInitialData(); // רענון הנתונים לאחר הוספה
              }}
              currentUser={currentUser} // העברת המשתמש הנוכחי למודאל
          />
      )}

      {showAssignSupplierUserModal && supplierToAssignUser && ( // שימוש ב-showAssignSupplierUserModal ו-supplierToAssignUser
          <AssignSupplierUserModal
              isOpen={showAssignSupplierUserModal}
              onClose={() => setShowAssignSupplierUserModal(false)}
              supplier={supplierToAssignUser} // שימוש ב-supplierToAssignUser
              onAssigned={() => {
                  setShowAssignSupplierUserModal(false);
                  loadInitialData(); // רענון הנתונים לאחר שיוך
              }}
              allUsers={allUsers}
          />
      )}
      {/* Business Plan Modal - ENHANCED */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-horizon-dark text-horizon-text border-horizon">
          <DialogHeader>
            <div className="flex justify-between items-start w-full">
              <div>
                <DialogTitle className="text-horizon-primary">תוכנית עסקית במלל</DialogTitle>
                <DialogDescription className="text-horizon-accent">
                  זוהי התוכנית העסקית שנוצרה על ידי ה-AI בהתבסס על נתוני התחזית וההנחיות האסטרטגיות.
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {isEditingPlan ? (
                  <>
                    <Button onClick={handleSaveBusinessPlanText} disabled={isSavingPlan} className="btn-horizon-primary" size="sm">
                      {isSavingPlan ? <Loader2 className="w-4 h-4 ml-2 animate-spin"/> : <Save className="w-4 h-4 ml-2"/>}
                      שמור שינויים
                    </Button>
                    <Button variant="outline" onClick={handleCancelEditBusinessPlan} disabled={isSavingPlan} className="border-horizon-accent text-horizon-accent" size="sm">
                      <X className="w-4 h-4 ml-2"/>
                      ביטול
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleEditBusinessPlan} className="border-horizon-accent text-horizon-accent" size="sm">
                      <Edit className="w-4 h-4 ml-2"/>
                      ערוך
                    </Button>
                    <Button variant="outline" onClick={handleExportBusinessPlanPdf} disabled={isExportingPlan || (!currentPlanText && !editedPlanText)} className="border-horizon-accent text-horizon-accent" size="sm">
                        {isExportingPlan ? <Loader2 className="w-4 h-4 ml-2 animate-spin"/> : <Download className="w-4 h-4 ml-2"/>}
                        ייצא ל-PDF
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 my-4 pr-4 -mr-4" ref={businessPlanScrollAreaRef}>
            {isGeneratingPlan ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary mb-4" />
                <p className="text-horizon-accent">מייצר תוכנית עסקית, אנא המתן...</p>
              </div>
            ) : isEditingPlan ? (
              <Textarea 
                className="w-full h-full min-h-[500px] bg-horizon-card border-horizon text-horizon-text text-base p-4 resize-none"
                value={editedPlanText}
                onChange={(e) => setEditedPlanText(e.target.value)}
                dir="rtl"
              />
            ) : (
              <div className="prose prose-invert prose-p:text-horizon-text prose-headings:text-horizon-primary rtl text-right">
                <ReactMarkdown>{currentPlanText}</ReactMarkdown>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
             <Button onClick={() => {
                setIsPlanModalOpen(false); 
                setIsGeneratingPlan(false); 
                setIsEditingPlan(false); // Reset edit mode on close
                setEditedPlanText(''); // Clear edited text
                if (showStrategicInputForm) {
                    setShowStrategicInputForm(false);
                }
           }} variant="outline" className="border-horizon text-horizon-text">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* The Strategic Input Form Modal */}
      {showStrategicInputForm && ( // 1. המודאל יוצג רק כאשר showStrategicInputForm הוא true
          <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
              <StrategicPlanInputForm
                  customerEmail={selectedCustomer?.email} // 2. העברת אימייל הלקוח לשאלון
                  onFormSubmit={handleStrategicInputSubmitted} // 3. זוהי פונקציית ה-callback שתיקרא כשהמשתמש יגיש את השאלון
                  existingInput={existingStrategicInputForForm} // 4. העברת הקלט האסטרטגי הקיים (אם נמצא) לטופס, כדי שימולא אוטומטית
                  onClose={() => { // 5. זוהי פונקציית ה-callback שתיקרא אם המשתמש יסגור את המודאל בלי להגיש את הטופס
                      setShowStrategicInputForm(false); // א. סגור את מודאל השאלון
                      // אם מודאל התוכנית העסקית עדיין פתוח, סגור אותו ובטל טעינה
                      // זה יקרה אם המשתמש סגר את השאלון בלי לשמור, ואנחנו רוצים לחזור למצב רגיל.
                      if (isPlanModalOpen) { // ב. בדיקה אם מודאל ה"תוכנית העסקית במלל" פתוח
                          setIsPlanModalOpen(false); // ג. אם כן, סגור אותו
                      }
                      setIsGeneratingPlan(false); // ד. בטל את מצב הטעינה הגלובלי (כי התהליך לא הושלם)
                  }}
              />
          </div>
      )}
      {/* מיקום רכיב ה-ChatBox הראשי */}
      {showChatBox && selectedEntityForChat && (
        <div className="fixed bottom-4 left-4 z-50"> {/* הצמדה לפינה השמאלית תחתונה */}
          <ChatBox
            relatedEntityId={selectedEntityForChat.id}
            relatedEntityType={selectedEntityForChat.type}
            currentUser={currentUser} // העברת פרטי המשתמש המחובר
            isOpen={showChatBox} // קובע אם הצ'אט פתוח
            onToggle={() => setShowChatBox(!showChatBox)} // פונקציה לסגירה/פתיחה
            title={selectedEntityForChat.title} // כותרת הצ'אט (מגיעה מפרטי ההמלצה/תוכנית)
          />
        </div>
      )}
       {/* Customer Initiated Recommendations Modal */}
      {showCustomerInitiatedRecsModal && selectedCustomer && (
        <CustomerInitiatedRecommendationsModal
          isOpen={showCustomerInitiatedRecsModal}
          onClose={() => setShowCustomerInitiatedRecsModal(false)}
          customerEmail={selectedCustomer.email}
        />
      )}
    </div> 
  );
}

const EditCustomerModal = ({ customer, isOpen, onClose, onUpdate }) => {
  const [updatedCustomerData, setUpdatedCustomerData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customer && isOpen) { 
      setUpdatedCustomerData({
        full_name: customer.full_name || '',
        business_name: customer.business_name || '',
        email: customer.email || '', 
        phone: customer.phone || '',
        business_type: customer.business_type || 'other', 
        customer_type: customer.customer_type || 'retail', 
        company_size: customer.company_size || '1-10', 
        website_platform: customer.website_platform || 'none', 
        website_url: customer.website_url || '',
        monthly_revenue: customer.monthly_revenue || 0,
        address: customer.address || { city: '', street: '' }, // הוספה זו
        // תיקון המיפוי - מ-OnboardingRequest ל-User
        main_products: customer.main_products_services || customer.main_products || '',
        target_customers: customer.target_audience || customer.target_customers || '',
        business_goals: customer.business_goals || '',
        main_challenges: customer.main_challenges || '',
        competitors: customer.competitors || '',
        sales_channels: customer.sales_channels || '',
        bestselling_products: customer.bestselling_products || '',
        unwanted_products: customer.unwanted_products || '',
      });
    }
  }, [customer, isOpen]); 

  const handleFieldChange = (field, value) => {
    if (field === 'address') {
      setUpdatedCustomerData(prev => ({
        ...prev,
        address: value
      }));
    } else {
      setUpdatedCustomerData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changes = Object.keys(updatedCustomerData).reduce((acc, key) => {
        if (key !== 'email' && updatedCustomerData[key] !== customer[key]) {
          acc[key] = updatedCustomerData[key];
        }
        return acc;
      }, {});
      let finalUpdatedCustomer = { ...customer, ...updatedCustomerData }; // אובייקט לקוח מעודכן

      if (Object.keys(changes).length > 0) {
        if (customer.is_onboarding_record_only) {
          // מיפוי שדות מ-User ל-OnboardingRequest
          const mappedChanges = {};
          
          // שדות זהים
          if (changes.full_name !== undefined) mappedChanges.full_name = changes.full_name;
          if (changes.business_name !== undefined) mappedChanges.business_name = changes.business_name;
          if (changes.phone !== undefined) mappedChanges.phone = changes.phone;
          if (changes.business_type !== undefined) mappedChanges.business_type = changes.business_type;
          if (changes.company_size !== undefined) mappedChanges.company_size = changes.company_size;
          if (changes.monthly_revenue !== undefined) mappedChanges.monthly_revenue = changes.monthly_revenue;
          if (changes.website_url !== undefined) mappedChanges.website_url = changes.website_url;
          if (changes.business_goals !== undefined) mappedChanges.business_goals = changes.business_goals;
          // בתוך הפונקציה handleSave, אחרי השורה שמגדירה mappedChanges:
          if (changes.address !== undefined) mappedChanges.address = changes.address;
          // שדות שצריכים מיפוי
          if (changes.main_products !== undefined) mappedChanges.main_products_services = changes.main_products;
          if (changes.target_customers !== undefined) mappedChanges.target_audience = changes.target_customers;
          
          // טיפול בשדות שמגיעים כ-array אבל צריכים להיות מחרוזות
          if (changes.bestselling_products !== undefined) {
            mappedChanges.bestselling_products = Array.isArray(changes.bestselling_products) 
              ? changes.bestselling_products.join(', ') 
              : changes.bestselling_products;
          }
          
          if (changes.unwanted_products !== undefined) {
            mappedChanges.unwanted_products = Array.isArray(changes.unwanted_products) 
              ? changes.unwanted_products.join(', ') 
              : changes.unwanted_products;
          }
          
          await OnboardingRequest.update(customer.id.replace('onboarding_', ''), mappedChanges);
        } else {
          await User.update(customer.id, changes); 
        }
        toast.success("פרטי הלקוח עודכנו בהצלחה!");
      } else {
        toast.info("לא בוצעו שינויים.");
      }
      onUpdate(finalUpdatedCustomer); 
      onClose(); 
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("שגיאה בעדכון פרטי הלקוח: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">עריכת פרטי לקוח: {customer.full_name || customer.business_name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">שם מלא</Label>
              <Input
                  value={updatedCustomerData.full_name || ''}
                  onChange={(e) => handleFieldChange('full_name', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text"
              />
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">שם עסק</Label>
              <Input
                  value={updatedCustomerData.business_name || ''}
                  onChange={(e) => handleFieldChange('business_name', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text"
              />
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">אימייל</Label>
              <Input
                  value={updatedCustomerData.email || ''}
                  disabled
                  className="bg-horizon-card border-horizon text-horizon-text"
              />
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">טלפון</Label>
              <Input
                  value={updatedCustomerData.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text"
              />
          </div>
          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">עיר</Label>
              <Input
                  value={updatedCustomerData.address?.city || ''}
                  onChange={(e) => handleFieldChange('address', { ...updatedCustomerData.address, city: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
              />
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">סוג העסק</Label>
              <Select
                  value={updatedCustomerData.business_type || ''}
                  onValueChange={(value) => handleFieldChange('business_type', value)}
              >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר סוג עסק..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="retail">קמעונאות</SelectItem>
                      <SelectItem value="wholesale">סיטונאות</SelectItem>
                      <SelectItem value="manufacturing">ייצור</SelectItem>
                      <SelectItem value="import">ייבוא</SelectItem>
                      <SelectItem value="export">ייצוא</SelectItem>
                      <SelectItem value="services">שירותים</SelectItem>
                      <SelectItem value="restaurant">מסעדה</SelectItem>
                      <SelectItem value="fashion">אופנה</SelectItem>
                      <SelectItem value="tech">טכנולוגיה</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
              </Select>
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">סיווג לקוח</Label>
              <Select
                  value={updatedCustomerData.customer_type || ''}
                  onValueChange={(value) => handleFieldChange('customer_type', value)}
              >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר סוג לקוח..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="retail">קמעונאי</SelectItem>
                      <SelectItem value="wholesale">סיטונאי</SelectItem>
                      <SelectItem value="import">יבואן</SelectItem>
                      <SelectItem value="manufacturing">יצרן</SelectItem>
                      <SelectItem value="services">שירותים</SelectItem>
                      <SelectItem value="restaurant">מסעדה</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
              </Select>
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">גודל חברה</Label>
              <Select
                  value={updatedCustomerData.company_size || ''}
                  onValueChange={(value) => handleFieldChange('company_size', value)}
              >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר גודל חברה..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="1-10">1-10 עובדים</SelectItem>
                      <SelectItem value="11-50">11-50 עובדים</SelectItem>
                      <SelectItem value="51-200">51-200 עובדים</SelectItem>
                      <SelectItem value="200+">200+ עובדים</SelectItem>
                  </SelectContent>
              </Select>
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">פלטפורמת אתר</Label>
              <Select
                  value={updatedCustomerData.website_platform || ''}
                  onValueChange={(value) => handleFieldChange('website_platform', value)}
              >
                  <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר פלטפורמת אתר..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="shopify">Shopify</SelectItem>
                      <SelectItem value="woocommerce">WooCommerce</SelectItem>
                      <SelectItem value="wolt">Wolt</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                      <SelectItem value="none">אין אתר</SelectItem>
                  </SelectContent>
              </Select>
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">כתובת אתר</Label>
              <Input
                  value={updatedCustomerData.website_url || ''}
                  onChange={(e) => handleFieldChange('website_url', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  dir="ltr"
              />
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">מחזור חודשי (₪)</Label>
              <Input
                  type="number"
                  value={updatedCustomerData.monthly_revenue || ''}
                  onChange={(e) => handleFieldChange('monthly_revenue', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text"
              />
          </div>

          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">מוצרים/שירותים עיקריים</Label>
              <Textarea
                  value={updatedCustomerData.main_products || ''}
                  onChange={(e) => handleFieldChange('main_products', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text h-20"
              />
          </div>
          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">קהל יעד</Label>
              <Textarea
                  value={updatedCustomerData.target_customers || ''}
                  onChange={(e) => handleFieldChange('target_customers', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text h-20"
              />
          </div>
          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">יעדים עסקיים</Label>
              <Textarea
                  value={updatedCustomerData.business_goals || ''}
                  onChange={(e) => handleFieldChange('business_goals', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text h-20"
              />
          </div>
          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">אתגרים עיקריים</Label>
              <Textarea
                  value={updatedCustomerData.main_challenges || ''}
                  onChange={(e) => handleFieldChange('main_challenges', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text h-20"
              />
          </div>
          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">מתחרים</Label>
              <Input
                  value={updatedCustomerData.competitors || ''}
                  onChange={(e) => handleFieldChange('competitors', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text"
              />
          </div>
          <div className="space-y-2 text-right">
              <Label className="text-horizon-text">ערוצי מכירה</Label>
              <Input
                  value={updatedCustomerData.sales_channels || ''}
                  onChange={(e) => handleFieldChange('sales_channels', e.target.value)}
                  className="bg-horizon-card border-horizon text-horizon-text"
              />
          </div>
        </div>
        <DialogFooter className="pt-4 border-t border-horizon gap-2">
            <Button onClick={onClose} variant="outline" className="border-horizon-accent text-horizon-accent hover:bg-horizon-card/60">
                ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-horizon-primary">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                שמור שינויים
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const BusinessFileUploadArea = ({ title, description, icon: Icon, accent }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUploadedFile(file);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-horizon-card/30 border border-horizon rounded-lg p-4 hover:border-horizon-primary/50 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${accent}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h5 className="font-semibold text-horizon-text text-sm">{title}</h5>
          <p className="text-xs text-horizon-accent">{description}</p>
        </div>
      </div>

      <div className="relative">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".xls,.xlsx,.csv,.pdf"
          className="hidden"
          id={`business-file-${title.replace(/\s+/g, '-')}`}
          disabled={isUploading}
        />
        <Label
          htmlFor={`business-file-${title.replace(/\s+/g, '-')}`}
          className="block w-full p-3 border-2 border-dashed border-horizon/50 rounded-lg text-center cursor-pointer hover:border-horizon-primary/50 transition-colors"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-horizon-primary" />
          ) : uploadedFile ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 truncate">{uploadedFile.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-4 h-4 text-horizon-accent" />
              <span className="text-xs text-horizon-accent">העלה קובץ</span>
            </div>
          )}
        </Label>
      </div>
    <ManagerChatSystem 
      currentManagerEmail={currentUser.email} 
      isFloating={true} 
      initialThreadId={chatInitialThreadId}
      onClose={() => setChatInitialThreadId(null)}
    />
    <FloatingNotificationCenter 
      userEmail={currentUser.email} 
      onChatNotificationClick={handleChatNotificationClick}
    />
    
    </div>

  );
};
