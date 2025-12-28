import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  FolderOpen,
  Lightbulb,
  Package,
  FileText,
  Target,
  Truck,
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter,
  UserPlus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// קומפוננטות פאנלים
import CustomerListPanel from '@/components/trial/CustomerListPanel';
import WorkboardPanel from '@/components/trial/WorkboardPanel';
import TasksPanel from '@/components/trial/TasksPanel';
import CustomerSettingsDrawer from '@/components/trial/CustomerSettingsDrawer';
import CustomerOverviewModal from '@/components/trial/CustomerOverviewModal';
import TaskDetailsModal from '@/components/trial/TaskDetailsModal';
import SystemRecommendationsModal from '@/components/admin/SystemRecommendationsModal';
import TargetedRecommendationModal from '@/components/admin/TargetedRecommendationModal';
import GoalOrientedRecommendationModal from '@/components/admin/GoalOrientedRecommendationModal';
import ManualRecommendationModal from '@/components/admin/ManualRecommendationModal';
import RecommendationEditModal from '@/components/admin/RecommendationEditModal';
import RecommendationUpgradeModal from '@/components/admin/RecommendationUpgradeModal';
import RecommendationViewModal from '@/components/admin/RecommendationViewModal';
import ManagerAssignmentBoard from '@/components/admin/ManagerAssignmentBoard';

export default function CustomerManagementNew() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('files');
  const [activeWorkboardTab, setActiveWorkboardTab] = useState('workboard');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [showSystemRecommendationModal, setShowSystemRecommendationModal] = useState(false);
  const [showTargetedRecommendationModal, setShowTargetedRecommendationModal] = useState(false);
  const [showGoalOrientedModal, setShowGoalOrientedModal] = useState(false);
  const [showManualRecommendationModal, setShowManualRecommendationModal] = useState(false);
  const [editModalState, setEditModalState] = useState({ isOpen: false, recommendation: null });
  const [upgradeModalState, setUpgradeModalState] = useState({ isOpen: false, recommendation: null });
  const [viewModalState, setViewModalState] = useState({ isOpen: false, recommendation: null });
  
  // סינוני המלצות
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // בדיקת הרשאות לגישה לטאב שיוך מנהלים
  const canAccessManagerAssignment = currentUser?.role === 'admin' || 
                                    currentUser?.user_type === 'department_manager';

  // טעינת לקוחות - גישה זהה ל-CustomerManagement
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['trialCustomers', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      
      // טעינה של כל הלקוחות הפעילים
      let filter = { is_active: true };
      
      // אם מנהל כספים - רק הלקוחות שלו
      if (currentUser.user_type === 'financial_manager' && currentUser.role !== 'admin') {
        const allRequests = await base44.entities.OnboardingRequest.filter({ is_active: true }, 'business_name');
        return allRequests.filter((req) =>
          req.assigned_financial_manager_email === currentUser.email ||
          req.additional_assigned_financial_manager_emails?.includes(currentUser.email)
        );
      }

      // אם מנהל מחלקה - רק הלקוחות שלו
      if (currentUser.user_type === 'department_manager' && currentUser.role !== 'admin') {
        const allRequests = await base44.entities.OnboardingRequest.filter({ is_active: true }, 'business_name');
        return allRequests.filter((req) =>
          req.assigned_financial_manager_email === currentUser.email ||
          req.additional_assigned_financial_manager_emails?.includes(currentUser.email)
        );
      }
      
      return base44.entities.OnboardingRequest.filter(filter, 'business_name');
    },
    enabled: !!currentUser,
  });

  // טעינת מנהלי כספים (לטאב השיוך)
  const { data: financialManagers = [] } = useQuery({
    queryKey: ['financialManagers'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({
        user_type: 'financial_manager'
      });
      return users;
    },
    enabled: canAccessManagerAssignment,
  });

  // טעינת משימות של הלקוח הנבחר
  const { data: customerTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['customerTasks', selectedCustomer?.email],
    queryFn: () => {
      if (!selectedCustomer?.email) return [];
      return base44.entities.CustomerGoal.filter({
        customer_email: selectedCustomer.email,
        is_active: true
      }, 'order_index');
    },
    enabled: !!selectedCustomer?.email,
  });

  // טעינת המלצות של הלקוח הנבחר
  const { data: recommendations = [], isLoading: isLoadingRecommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ['customerRecommendations', selectedCustomer?.email],
    queryFn: () => {
      if (!selectedCustomer?.email) return [];
      return base44.entities.Recommendation.filter({
        customer_email: selectedCustomer.email,
        status: { $ne: 'archived' }
      }, '-created_date');
    },
    enabled: !!selectedCustomer?.email,
  });

  // סינון המלצות
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      const matchesCategory = categoryFilter === 'all' || rec.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || rec.priority === priorityFilter;
      const matchesSource = sourceFilter === 'all' || rec.source === sourceFilter;
      return matchesCategory && matchesStatus && matchesPriority && matchesSource;
    });
  }, [recommendations, categoryFilter, statusFilter, priorityFilter, sourceFilter]);

  // טעינת משתמשים לאחראים במשימות
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({});
      return users;
    },
  });

  // סינון לקוחות לפי קבוצה
  const filteredCustomers = useMemo(() => {
    if (customerFilter === 'all') return customers;
    return customers.filter(c => c.customer_group === customerFilter);
  }, [customers, customerFilter]);

  // בחירת לקוח ראשון אוטומטית
  useEffect(() => {
    if (filteredCustomers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(filteredCustomers[0]);
    }
  }, [filteredCustomers, selectedCustomer]);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleOpenOverview = (customer) => {
    setSelectedCustomer(customer);
    setOverviewOpen(true);
  };

  const handleTaskClick = (task) => {
    setSelectedTaskForDetails(task);
  };

  const handleGenerateRecommendations = async (selectedCategories) => {
    setIsGeneratingRecommendations(true);
    try {
      await base44.functions.invoke('generateStrategicRecommendations', {
        customer_email: selectedCustomer.email,
        focus_categories: selectedCategories
      });
      refetchRecommendations();
      alert('המלצות נוצרו בהצלחה!');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('שגיאה ביצירת המלצות');
    } finally {
      setIsGeneratingRecommendations(false);
      setShowSystemRecommendationModal(false);
    }
  };

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
      refetchRecommendations();
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      alert('שגיאה במחיקת ההמלצה');
    }
  };

  const handleArchiveRecommendation = async (recommendationId) => {
    try {
      await base44.entities.Recommendation.update(recommendationId, { status: 'archived' });
      refetchRecommendations();
    } catch (error) {
      console.error('Error archiving recommendation:', error);
    }
  };

  const handleSendRecommendationWhatsApp = async (recommendation) => {
    if (!selectedCustomer.phone) {
      alert('אין מספר טלפון זמין עבור לקוח זה');
      return;
    }

    try {
      await base44.functions.invoke('sendWhatsAppMessage', {
        phoneNumber: selectedCustomer.phone,
        customerEmail: selectedCustomer.email,
        recommendation: recommendation,
        templateType: 'auto'
      });
      alert('ההמלצה נשלחה בהצלחה לווטסאפ');
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('שגיאה בשליחת ההמלצה');
    }
  };

  const handleManagerAssignment = (customerId, managerEmail) => {
    // רענון הדף לעדכון נתונים
    window.location.reload();
  };

  return (
    <div className="h-screen flex flex-col bg-horizon-dark" dir="rtl">
      {/* Header */}
      <header className="bg-horizon-card border-b border-horizon px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Admin')}>
            <Button variant="ghost" size="sm" className="text-horizon-accent hover:text-horizon-text">
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזרה לניהול
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-horizon-text">ניהול לקוחות מתקדם</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-horizon-primary/20 text-horizon-primary border-horizon-primary/30">
            ממשק חדש
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {canAccessManagerAssignment && activeWorkboardTab === 'manager_assignment' ? (
          // מצב שיוך מנהלים - תצוגה מלאה ללא פאנלים
          <div className="flex-1 overflow-auto p-6">
            <ManagerAssignmentBoard
              customers={customers}
              financialManagers={financialManagers}
              onAssignmentChange={handleManagerAssignment}
              currentUser={currentUser}
            />
          </div>
        ) : (
          <>
            {/* פאנל ימין - רשימת לקוחות */}
            <div className={`bg-horizon-card border-l border-horizon transition-all duration-300 flex flex-col ${
              rightPanelCollapsed ? 'w-12' : 'w-80'
            }`}>
              {rightPanelCollapsed ? (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRightPanelCollapsed(false)}
                    className="text-horizon-accent hover:text-horizon-text"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <CustomerListPanel
                  customers={filteredCustomers}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={handleCustomerSelect}
                  customerFilter={customerFilter}
                  onFilterChange={setCustomerFilter}
                  onOpenSettings={handleOpenSettings}
                  onOpenOverview={handleOpenOverview}
                  onCollapse={() => setRightPanelCollapsed(true)}
                  isLoading={loadingCustomers}
                />
              )}
            </div>

            {/* פאנל מרכזי - לוח עבודה עם טאבים */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {canAccessManagerAssignment ? (
                <div className="flex flex-col h-full">
                  {/* טאבים עליונים - לוח עבודה / שיוך מנהלים */}
                  <div className="bg-horizon-card border-b border-horizon px-4 py-2">
                    <Tabs value={activeWorkboardTab} onValueChange={setActiveWorkboardTab}>
                      <TabsList className="bg-horizon-dark">
                        <TabsTrigger value="workboard" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                          <Package className="w-4 h-4 ml-2" />
                          לוח עבודה
                        </TabsTrigger>
                        <TabsTrigger value="manager_assignment" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                          <UserPlus className="w-4 h-4 ml-2" />
                          שיוך מנהלי כספים
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* תוכן */}
                  <div className="flex-1 overflow-hidden">
                    {activeWorkboardTab === 'workboard' ? (
                      <WorkboardPanel
                        customer={selectedCustomer}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        recommendations={filteredRecommendations}
                        isLoadingRecommendations={isLoadingRecommendations}
                        onViewRecommendation={handleViewRecommendation}
                        onEditRecommendation={handleEditRecommendation}
                        onUpgradeRecommendation={handleUpgradeRecommendation}
                        onDeleteRecommendation={handleDeleteRecommendation}
                        onArchiveRecommendation={handleArchiveRecommendation}
                        onSendRecommendation={handleSendRecommendationWhatsApp}
                        isAdmin={currentUser?.role === 'admin'}
                        categoryFilter={categoryFilter}
                        setCategoryFilter={setCategoryFilter}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        priorityFilter={priorityFilter}
                        setPriorityFilter={setPriorityFilter}
                        sourceFilter={sourceFilter}
                        setSourceFilter={setSourceFilter}
                        onCreateSystemRec={() => setShowSystemRecommendationModal(true)}
                        onCreateTargeted={() => setShowTargetedRecommendationModal(true)}
                        onCreateGoalOriented={() => setShowGoalOrientedModal(true)}
                        onCreateManual={() => setShowManualRecommendationModal(true)}
                        isGenerating={isGeneratingRecommendations}
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <WorkboardPanel
                  customer={selectedCustomer}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  recommendations={filteredRecommendations}
                  isLoadingRecommendations={isLoadingRecommendations}
                  onViewRecommendation={handleViewRecommendation}
                  onEditRecommendation={handleEditRecommendation}
                  onUpgradeRecommendation={handleUpgradeRecommendation}
                  onDeleteRecommendation={handleDeleteRecommendation}
                  onArchiveRecommendation={handleArchiveRecommendation}
                  onSendRecommendation={handleSendRecommendationWhatsApp}
                  isAdmin={currentUser?.role === 'admin'}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                  sourceFilter={sourceFilter}
                  setSourceFilter={setSourceFilter}
                  onCreateSystemRec={() => setShowSystemRecommendationModal(true)}
                  onCreateTargeted={() => setShowTargetedRecommendationModal(true)}
                  onCreateGoalOriented={() => setShowGoalOrientedModal(true)}
                  onCreateManual={() => setShowManualRecommendationModal(true)}
                  isGenerating={isGeneratingRecommendations}
                />
              )}
            </div>

            {/* פאנל שמאל - משימות */}
            <div className={`bg-horizon-card border-r border-horizon transition-all duration-300 flex flex-col ${
              leftPanelCollapsed ? 'w-12' : 'w-80'
            }`}>
              {leftPanelCollapsed ? (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLeftPanelCollapsed(false)}
                    className="text-horizon-accent hover:text-horizon-text"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <TasksPanel
                  customer={selectedCustomer}
                  tasks={customerTasks}
                  onRefresh={refetchTasks}
                  onCollapse={() => setLeftPanelCollapsed(true)}
                  onTaskClick={handleTaskClick}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* גלגלת הגדרות לקוח */}
      <CustomerSettingsDrawer
        customer={selectedCustomer}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* פופ-אפ סקירה כללית */}
      {selectedCustomer && (
        <CustomerOverviewModal
          customer={selectedCustomer}
          isOpen={overviewOpen}
          onClose={() => setOverviewOpen(false)}
          onOpenSettings={() => {
            setOverviewOpen(false);
            setSettingsOpen(true);
          }}
          onNavigateToTab={(tab) => {
            setActiveTab(tab);
            setOverviewOpen(false);
          }}
        />
      )}

      {/* פופ-אפ פרטי משימה */}
      {selectedTaskForDetails && (
        <TaskDetailsModal
          task={selectedTaskForDetails}
          isOpen={!!selectedTaskForDetails}
          onClose={() => setSelectedTaskForDetails(null)}
          onSave={refetchTasks}
          onDelete={refetchTasks}
          users={allUsers}
        />
      )}

      {/* מודלים ליצירת המלצות */}
      {showSystemRecommendationModal && selectedCustomer && (
        <SystemRecommendationsModal
          isOpen={showSystemRecommendationModal}
          onClose={() => setShowSystemRecommendationModal(false)}
          onGenerate={handleGenerateRecommendations}
          isLoading={isGeneratingRecommendations}
        />
      )}

      {showTargetedRecommendationModal && selectedCustomer && (
        <TargetedRecommendationModal
          customer={selectedCustomer}
          isOpen={showTargetedRecommendationModal}
          onClose={() => setShowTargetedRecommendationModal(false)}
          onSuccess={() => {
            setShowTargetedRecommendationModal(false);
            refetchRecommendations();
          }}
        />
      )}

      {showGoalOrientedModal && selectedCustomer && (
        <GoalOrientedRecommendationModal
          customer={selectedCustomer}
          isOpen={showGoalOrientedModal}
          onClose={() => setShowGoalOrientedModal(false)}
          onSuccess={() => {
            setShowGoalOrientedModal(false);
            refetchRecommendations();
          }}
        />
      )}

      {showManualRecommendationModal && selectedCustomer && (
        <ManualRecommendationModal
          customer={selectedCustomer}
          isOpen={showManualRecommendationModal}
          onClose={() => setShowManualRecommendationModal(false)}
          onSuccess={() => {
            setShowManualRecommendationModal(false);
            refetchRecommendations();
          }}
        />
      )}

      {/* מודלים לעריכה/צפייה/שדרוג המלצות */}
      {editModalState.isOpen && (
        <RecommendationEditModal
          isOpen={editModalState.isOpen}
          onClose={() => setEditModalState({ isOpen: false, recommendation: null })}
          recommendation={editModalState.recommendation}
          customer={selectedCustomer}
          onSave={() => {
            refetchRecommendations();
            setEditModalState({ isOpen: false, recommendation: null });
          }}
        />
      )}

      {upgradeModalState.isOpen && (
        <RecommendationUpgradeModal
          isOpen={upgradeModalState.isOpen}
          onClose={() => setUpgradeModalState({ isOpen: false, recommendation: null })}
          recommendation={upgradeModalState.recommendation}
          customer={selectedCustomer}
          onUpgradeComplete={() => {
            refetchRecommendations();
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
    </div>
  );
}