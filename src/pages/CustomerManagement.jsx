import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import LoadingScreen from "@/components/shared/LoadingScreen";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, User as UserIcon, FileText, Globe, Lightbulb, Package, TrendingUp, Target, Loader2, AlertCircle, ShoppingCart, Edit } from "lucide-react";
import CustomerFileUploadManager from "@/components/admin/CustomerFileUploadManager";
import StrategicRecommendations from "@/components/admin/StrategicRecommendations";
import ProductCatalogManager from "@/components/catalog/ProductCatalogManager";
import ManualForecastManager from "@/components/forecast/ManualForecastManager";
import BusinessForecastManager from "@/components/forecast/BusinessForecastManager";
import CustomerGoalsGantt from "@/components/admin/CustomerGoalsGantt";
import GoalsAndTasksDashboard from "@/components/admin/GoalsAndTasksDashboard";
import WebsiteScanner from "@/components/admin/WebsiteScanner";
import { createPageUrl } from '@/utils';
import RecommendationUpgradeModal from '@/components/admin/RecommendationUpgradeModal';
import RecommendationEditModal from '@/components/admin/RecommendationEditModal';
import RecommendationViewModal from '@/components/admin/RecommendationViewModal';
import { sendWhatsAppMessage } from "@/functions/sendWhatsAppMessage";

import CustomerNavigator from '@/components/admin/CustomerNavigator';
import RecommendationFilters from '@/components/admin/RecommendationFilters';
import CreateRecommendationButtons from '@/components/admin/CreateRecommendationButtons';
import TargetedRecommendationModal from '@/components/admin/TargetedRecommendationModal';
import ManualRecommendationModal from '@/components/admin/ManualRecommendationModal';
import CustomerSuppliersTab from '@/components/admin/CustomerSuppliersTab';
import CustomerGroupSelector from '../components/admin/CustomerGroupSelector';
import EditCustomerModal from '@/components/admin/EditCustomerModal';
import UnifiedForecastManager from '@/components/forecast/UnifiedForecastManager';
import FloatingAgentChat from '@/components/admin/FloatingAgentChat';
import Ofek360Modal from '@/components/admin/Ofek360Modal';
import SystemRecommendationsModal from '@/components/admin/SystemRecommendationsModal';
import GoalOrientedRecommendationModal from '@/components/admin/GoalOrientedRecommendationModal';
import ClientActivityStatusEditor from '@/components/admin/ClientActivityStatusEditor';

export default function CustomerManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const queryParams = new URLSearchParams(location.search);
  const customerId = queryParams.get('clientId');
  const rawSource = queryParams.get('source');
  const inferredFromId = customerId && customerId.startsWith('onboarding_') ? 'onboarding' : 'user';
  const customerSource = rawSource || inferredFromId;

  // State for recommendation modal
  const [editModalState, setEditModalState] = useState({ isOpen: false, recommendation: null });
  const [upgradeModalState, setUpgradeModalState] = useState({ isOpen: false, recommendation: null });
  const [viewModalState, setViewModalState] = useState({ isOpen: false, recommendation: null });
  const [showGeneralRecommendationModal, setShowGeneralRecommendationModal] = useState(false);
  const [showGoalOrientedModal, setShowGoalOrientedModal] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showTargetedRecommendationModal, setShowTargetedRecommendationModal] = useState(false);
  const [showManualRecommendationModal, setShowManualRecommendationModal] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');

  // Recommendation filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // State for customer edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOfekModalOpen, setIsOfekModalOpen] = useState(false);

  // Mock currentUser for admin context, replace with actual auth context
  const [currentUser, setCurrentUser] = useState({ role: 'admin', email: 'admin@example.com' });

  useEffect(() => {
    if (activeTab === 'forecast' || activeTab === 'manualForecast' || activeTab === 'systemForecast') {
      setActiveTab('businessPlan');
    }
  }, [activeTab]);

  const { data: fetchedCustomer, isLoading: isLoadingCustomerQuery } = useQuery({
    queryKey: ['customerDetails', customerId, customerSource || 'user'],
    queryFn: async () => {
      if (!customerId) return null;

      const normalizedSource = customerSource || 'user';

      const stripPrefix = (id, prefix) =>
      id && id.startsWith(prefix) ? id.substring(prefix.length) : id;


      const currentUserInQuery = await base44.auth.me();
      const isFinancialManager = currentUserInQuery?.role === 'user' && currentUserInQuery?.user_type === 'financial_manager';

      const fetchAsUser = async (id) => {
        try {
          if (isFinancialManager) {
            console.log("Financial manager detected - skipping User entity fetch");
            return null;
          }

          const u = await base44.entities.User.get(id);
          return { ...u, source: 'user' };
        } catch (e) {
          if (e?.status === 404 || e?.response?.status === 404) return null;
          if (e?.status === 403 || e?.response?.status === 403) {
            console.warn("403 Forbidden when trying to fetch User entity - returning null");
            return null;
          }
          throw e;
        }
      };

      const fetchAsOnboarding = async (id) => {
        try {
          const rawId = stripPrefix(id, 'onboarding_');
          const o = await base44.entities.OnboardingRequest.get(rawId);
          return { ...o, is_onboarding_record_only: true, source: 'onboarding' };
        } catch (e) {
          if (e?.status === 404 || e?.response?.status === 404) return null;
          if (e?.status === 403 || e?.response?.status === 403) {
            console.warn("403 Forbidden when trying to fetch OnboardingRequest - returning null");
            return null;
          }
          throw e;
        }
      };

      const fetchAsContact = async (id) => {
        try {
          const rawId = stripPrefix(id, 'contact_');
          const c = await base44.entities.CustomerContact.get(rawId);
          return {
            id: c.id,
            email: c.customer_email,
            full_name: c.full_name,
            business_name: c.business_name,
            phone: c.phone,
            business_type: c.business_type,
            customer_group: c.customer_group,
            source: 'customer_contact',
            company_size: c.company_size,
            monthly_revenue: c.monthly_revenue,
            address: c.address,
            business_city: c.business_city,
            main_products: c.main_products,
            business_goals: c.business_goals,
            website_url: c.website_url
          };
        } catch (e) {
          if (e?.status === 404 || e?.response?.status === 404) return null;
          if (e?.status === 403 || e?.response?.status === 403) {
            console.warn("403 Forbidden when trying to fetch CustomerContact - returning null");
            return null;
          }
          throw e;
        }
      };

      let data = null;

      if (normalizedSource === 'onboarding') {
        data = await fetchAsOnboarding(customerId);
        if (!data && !isFinancialManager) {
          data = await fetchAsUser(customerId);
        }
      } else if (normalizedSource === 'customer_contact') {
        data = await fetchAsContact(customerId);
        if (!data && !isFinancialManager) {
          data = await fetchAsUser(customerId);
        }
      } else {
        if (isFinancialManager) {
          data = (await fetchAsOnboarding(customerId)) || (await fetchAsContact(customerId));
        } else {
          data = await fetchAsUser(customerId);
        }
      }

      if (!data) {
        if (normalizedSource !== 'customer_contact') {
          data = data || (await fetchAsContact(customerId));
        }
        if (normalizedSource !== 'onboarding') {
          data = data || (await fetchAsOnboarding(customerId));
        }
        if (normalizedSource !== 'user' && !isFinancialManager) {
          data = data || (await fetchAsUser(customerId));
        }
      }

      if (!data) {
        console.error("No customer found for ID and source:", customerId, normalizedSource);
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        business_name: data.business_name || data.full_name,
        full_name: data.full_name || '',
        phone: data.phone || '',
        business_type: data.business_type || '',
        customer_group: data.customer_group || '',
        company_size: data.company_size || '',
        monthly_revenue: data.monthly_revenue || 0,
        address: data.address || {},
        business_city: data.business_city || '',
        main_products: data.main_products || data.main_products_services || '',
        business_goals: data.business_goals || '',
        website_url: data.website_url || '',
        is_onboarding_record_only: data.is_onboarding_record_only || false,
        source: data.source,
        ...data
      };
    },
    enabled: !!customerId
  });

  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (fetchedCustomer) {
      setCustomer(fetchedCustomer);
    }
  }, [fetchedCustomer]);

  useEffect(() => {
    if (customer) {
      setIsPageLoading(false);
    }
  }, [customer]);

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['allCustomersForNav'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      const isFinancialManager = currentUser?.role === 'user' && currentUser?.user_type === 'financial_manager';

      let users = [];
      let onboardingRequests = [];

      if (isFinancialManager) {
        // מנהל כספים - טוען דרך OnboardingRequest בלבד ומסנן בצד לקוח
        const allOnboardingRequests = await base44.entities.OnboardingRequest.filter({ is_active: true });
        onboardingRequests = allOnboardingRequests.filter((req) =>
          req.assigned_financial_manager_email === currentUser.email ||
          req.additional_assigned_financial_manager_emails?.includes(currentUser.email)
        );

        users = onboardingRequests.map((req) => ({
          id: `onboarding_${req.id}`,
          business_name: req.business_name,
          full_name: req.full_name,
          email: req.email,
          business_type: req.business_type,
          customer_group: req.customer_group,
          assigned_financial_manager_email: req.assigned_financial_manager_email,
          additional_assigned_financial_manager_emails: req.additional_assigned_financial_manager_emails,
          source: 'onboarding'
        }));
      } else {
        // אדמין - טוען מ-User וגם OnboardingRequest
        [users, onboardingRequests] = await Promise.all([
          base44.entities.User.filter({ role: { $ne: 'admin' }, user_type: { $ne: 'financial_manager' } }),
          base44.entities.OnboardingRequest.filter({ is_active: true })
        ]);

        users = users.map((u) => ({
          id: u.id,
          business_name: u.business_name,
          full_name: u.full_name,
          email: u.email,
          business_type: u.business_type,
          customer_group: u.customer_group,
          assigned_financial_manager_email: u.assigned_financial_manager_email,
          source: 'user'
        }));
      }

      const pendingClients = onboardingRequests.map((or) => ({
        id: `onboarding_${or.id}`,
        business_name: or.business_name,
        full_name: or.full_name,
        email: or.email,
        business_type: or.business_type,
        customer_group: or.customer_group,
        assigned_financial_manager_email: or.assigned_financial_manager_email,
        source: 'onboarding'
      }));

      const uniqueClientsMap = new Map();

      users.forEach((u) => {
        uniqueClientsMap.set(u.email, u);
      });

      pendingClients.forEach((pc) => {
        if (!uniqueClientsMap.has(pc.email)) {
          uniqueClientsMap.set(pc.email, pc);
        }
      });

      return Array.from(uniqueClientsMap.values()).sort((a, b) =>
        (a.business_name || a.full_name || '').localeCompare(b.business_name || b.full_name || '')
      );
    },
    staleTime: 5 * 60 * 1000, // 5 דקות cache
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const { data: recommendations = [], isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ['customerRecommendations', customer?.email],
    queryFn: () => base44.entities.Recommendation.filter({
      customer_email: customer.email,
      status: { $ne: 'archived' }
    }, '-created_date'),
    enabled: !!customer?.email && activeTab === 'recommendations',
    staleTime: 5 * 60 * 1000, // 5 דקות cache במקום 30 שניות
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      const matchesCategory = categoryFilter === 'all' || rec.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || rec.priority === priorityFilter;
      const matchesSource = sourceFilter === 'all' || rec.source === sourceFilter;
      return matchesCategory && matchesStatus && matchesPriority && matchesSource;
    });
  }, [recommendations, categoryFilter, statusFilter, priorityFilter, sourceFilter]);

  const handleEditRecommendation = (recommendation) => {
    setEditModalState({ isOpen: true, recommendation });
  };

  const handleUpgradeRecommendation = (recommendation) => {
    setUpgradeModalState({ isOpen: true, recommendation });
  };

  const handleViewRecommendation = (recommendation) => {
    setViewModalState({ isOpen: true, recommendation });
  };

  const handleDeleteRecommendation = async (recommendationId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את ההמלצה?')) return;

    try {
      await base44.entities.Recommendation.delete(recommendationId);
      queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      alert('שגיאה במחיקת ההמלצה');
    }
  };

  const handleArchiveRecommendation = async (recommendationId) => {
    try {
      await base44.entities.Recommendation.update(recommendationId, { status: 'archived' });
      queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
    } catch (error) {
      console.error('Error archiving recommendation:', error);
    }
  };

  const handleSendRecommendationWhatsApp = async (recommendation) => {
    if (!customer.phone) {
      alert('אין מספר טלפון זמין עבור לקוח זה');
      return;
    }

    try {
      await base44.functions.invoke('sendWhatsAppMessage', {
        phoneNumber: customer.phone,
        customerEmail: customer.email,
        recommendation: recommendation,
        templateType: 'auto'
      });
      alert('ההמלצה נשלחה בהצלחה לווטסאפ');
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('שגיאה בשליחת ההמלצה');
    }
  };

  const handleGenerateRecommendations = async (selectedCategories) => {
    setIsGeneratingRecommendations(true);
    try {
      await base44.functions.invoke('generateStrategicRecommendations', {
        customer_email: customer.email,
        focus_categories: selectedCategories
      });
      queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
      alert('המלצות נוצרו בהצלחה!');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('שגיאה ביצירת המלצות');
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const handleCustomerUpdated = (updatedData) => {
    setCustomer((prev) => ({ ...prev, ...updatedData }));
    queryClient.invalidateQueries({ queryKey: ['customerDetails', customerId, customerSource] });
    queryClient.invalidateQueries({ queryKey: ['allCustomersForNav'] });
    setShowEditModal(false);
  };

  if (isLoadingCustomerQuery || !customer && customerId) {
    return <LoadingScreen message="טוען נתוני לקוח..." />;
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-horizon-dark flex items-center justify-center p-6" dir="rtl">
        <Card className="card-horizon max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold text-horizon-text mb-2">לקוח לא נמצא</h2>
            <p className="text-horizon-accent mb-6">המזהה שסופק אינו תקין או שהלקוח אינו קיים במערכת.</p>
            <Button onClick={() => navigate(createPageUrl('Admin?tab=customers'))} className="btn-horizon-primary">
              חזור לדף הניהול
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div key={`${customerId}:${customerSource || 'user'}`} className="min-h-screen bg-horizon-dark p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <CustomerNavigator
          allCustomers={allCustomers}
          currentCustomerId={customerId}
          currentUser={currentUser}
          isAdmin={currentUser?.role === 'admin'}
        />

        <div className="flex justify-between items-center mb-6 mt-4">
          <div className="flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-horizon-primary" />
            <div>
              <h1 className="text-2xl font-bold text-horizon-text">{customer.business_name}</h1>
              <p className="text-sm text-horizon-accent">{customer.email}</p>
            </div>
          </div>
          <Button onClick={() => navigate(createPageUrl('Admin?tab=customers'))} variant="outline" className="border-horizon text-horizon-accent">
            <ArrowRight className="ml-2 h-4 w-4" />
            חזור לניהול לקוחות
          </Button>
        </div>

        {customer && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="flex flex-nowrap mb-6 bg-white border-2 border-[#e1e8ed] rounded-xl p-2 shadow-md" dir="rtl">
              <TabsTrigger
                value="overview"
                className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
              >
                סקירה כללית
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
              >
                קבצים
              </TabsTrigger>
              <TabsTrigger
                value="recommendations"
                className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
              >
                המלצות
              </TabsTrigger>
              <TabsTrigger
                value="catalog"
                className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
              >
                קטלוג
              </TabsTrigger>
              <TabsTrigger
                value="businessPlan"
                className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
              >
                תוכנית עסקית
              </TabsTrigger>
              <TabsTrigger
                value="goals"
                className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
              >
                יעדים ומשימות
              </TabsTrigger>
              <TabsTrigger
                value="website"
                className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
              >
                סריקת אתר
              </TabsTrigger>
              <TabsTrigger
                value="suppliers"
                className="py-3 px-6 text-horizon-accent data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-bold hover-lift"
              >
                ספקים
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="card-horizon lg:col-span-2">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl text-horizon-text text-right">פרטי לקוח</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditModal(true)}
                        className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
                      >
                        <Edit className="w-4 h-4 ml-2" />
                        ערוך פרטים
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3" dir="rtl">
                    <div className="grid grid-cols-2 gap-4 text-right">
                      <div>
                        <p className="text-sm text-horizon-accent">שם העסק</p>
                        <p className="font-medium text-horizon-text">{customer.business_name || 'לא צוין'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">שם המנהל</p>
                        <p className="font-medium text-horizon-text">{customer.full_name || customer.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">אימייל</p>
                        <p className="font-medium text-horizon-text">{customer.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">טלפון</p>
                        <p className="font-medium text-horizon-text">{customer.phone || 'לא צוין'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">סוג עסק</p>
                        <p className="font-medium text-horizon-text">{customer.business_type || 'לא צוין'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">גודל חברה</p>
                        <p className="font-medium text-horizon-text">{customer.company_size || 'לא צוין'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">מחזור חודשי</p>
                        <p className="font-medium text-horizon-text">
                          {customer.monthly_revenue ? `₪${customer.monthly_revenue.toLocaleString()}` : 'לא צוין'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">עיר</p>
                        <p className="font-medium text-horizon-text">{customer.address?.city || customer.business_city || 'לא צוין'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">אתר אינטרנט</p>
                        <p className="font-medium text-horizon-text">{customer.website_url || 'לא צוין'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-horizon-accent">סטטוס</p>
                        <p className="font-medium text-horizon-text">
                          {customer.source === 'onboarding' ? 'בתהליך אונבורדינג' : 'לקוח פעיל'}
                        </p>
                      </div>
                    </div>

                    {customer.main_products && (
                      <div className="pt-3 border-t border-horizon text-right">
                        <p className="text-sm text-horizon-accent mb-1">מוצרים עיקריים</p>
                        <p className="text-horizon-text">{customer.main_products}</p>
                      </div>
                    )}

                    {customer.business_goals && (
                      <div className="pt-3 border-t border-horizon text-right">
                        <p className="text-sm text-horizon-accent mb-1">יעדים עסקיים</p>
                        <p className="text-horizon-text">{customer.business_goals}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-horizon">
                      <Button
                        onClick={() => setIsOfekModalOpen(true)}
                        className="w-full btn-horizon-primary h-12 text-base"
                      >
                        <Target className="w-5 h-5 ml-2" />
                        מודל אופק 360 - הצ'ק ליסט
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="lg:col-span-1 space-y-6">
                  <CustomerGroupSelector
                    customer={customer}
                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ['customerDetails', customerId, customerSource] })}
                  />
                  
                  {customer.source === 'onboarding' && (
                    <ClientActivityStatusEditor
                      customer={customer}
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: ['customerDetails', customerId, customerSource] })}
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="files">
              <CustomerFileUploadManager customer={customer} />
            </TabsContent>

            <TabsContent value="catalog">
              <ProductCatalogManager customer={customer} isAdmin={true} />
            </TabsContent>

            <TabsContent value="businessPlan">
              <UnifiedForecastManager customer={customer} />
            </TabsContent>

            <TabsContent value="recommendations">
              <CreateRecommendationButtons
                onCreateSystemRecommendations={() => setShowGeneralRecommendationModal(true)}
                onCreateTargeted={() => setShowTargetedRecommendationModal(true)}
                onCreateGoalOriented={() => setShowGoalOrientedModal(true)}
                onCreateManual={() => setShowManualRecommendationModal(true)}
                isGenerating={isGeneratingRecommendations}
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
                recommendations={filteredRecommendations}
                isLoading={isLoadingRecommendations}
                onView={handleViewRecommendation}
                onEdit={handleEditRecommendation}
                onUpgrade={handleUpgradeRecommendation}
                onDelete={handleDeleteRecommendation}
                onArchive={handleArchiveRecommendation}
                onSendToCustomer={handleSendRecommendationWhatsApp}
                isAdmin={currentUser?.role === 'admin'}
              />
            </TabsContent>

            <TabsContent value="suppliers">
              <CustomerSuppliersTab
                customer={customer}
                currentUser={currentUser}
              />
            </TabsContent>

            <TabsContent value="goals">
              <GoalsAndTasksDashboard customer={customer} />
            </TabsContent>

            <TabsContent value="website">
              <WebsiteScanner customer={customer} />
            </TabsContent>
          </Tabs>
        )}

        {/* Modals */}
        {editModalState.isOpen && (
          <RecommendationEditModal
            isOpen={editModalState.isOpen}
            onClose={() => setEditModalState({ isOpen: false, recommendation: null })}
            recommendation={editModalState.recommendation}
            customer={customer}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
              setEditModalState({ isOpen: false, recommendation: null });
            }}
          />
        )}

        {upgradeModalState.isOpen && (
          <RecommendationUpgradeModal
            isOpen={upgradeModalState.isOpen}
            onClose={() => setUpgradeModalState({ isOpen: false, recommendation: null })}
            recommendation={upgradeModalState.recommendation}
            customer={customer}
            onUpgradeComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
              setUpgradeModalState({ isOpen: false, recommendation: null });
            }}
          />
        )}

        {viewModalState.isOpen && (
          <RecommendationViewModal
            isOpen={viewModalState.isOpen}
            onClose={() => setViewModalState({ isOpen: false, recommendation: null })}
            recommendation={viewModalState.recommendation}
            onEdit={handleEditRecommendation}
            onSendWhatsApp={handleSendRecommendationWhatsApp}
          />
        )}

        {showGeneralRecommendationModal && (
          <SystemRecommendationsModal
            isOpen={showGeneralRecommendationModal}
            onClose={() => setShowGeneralRecommendationModal(false)}
            onGenerate={handleGenerateRecommendations}
            isLoading={isGeneratingRecommendations}
          />
        )}

        {showGoalOrientedModal && (
          <GoalOrientedRecommendationModal
            customer={customer}
            isOpen={showGoalOrientedModal}
            onClose={() => setShowGoalOrientedModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
              setShowGoalOrientedModal(false);
            }}
          />
        )}

        {showTargetedRecommendationModal && (
          <TargetedRecommendationModal
            customer={customer}
            isOpen={showTargetedRecommendationModal}
            onClose={() => setShowTargetedRecommendationModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
              setShowTargetedRecommendationModal(false);
            }}
          />
        )}

        {showManualRecommendationModal && (
          <ManualRecommendationModal
            customer={customer}
            isOpen={showManualRecommendationModal}
            onClose={() => setShowManualRecommendationModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
              setShowManualRecommendationModal(false);
            }}
          />
        )}

        {showEditModal && (
          <EditCustomerModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            customer={customer}
            onCustomerUpdated={handleCustomerUpdated}
          />
        )}

        {isOfekModalOpen && customer && (
          <Ofek360Modal
            customer={customer}
            isOpen={isOfekModalOpen}
            onClose={() => setIsOfekModalOpen(false)}
          />
        )}
      </div>

      {currentUser && (
        <FloatingAgentChat
          currentUser={currentUser}
          agentName="plusto_user_guide_agent"
        />
      )}
    </div>
  );
}