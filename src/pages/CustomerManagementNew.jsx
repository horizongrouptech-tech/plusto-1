import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// קומפוננטות
import CustomerListPanel from '@/components/trial/CustomerListPanel';
import WorkboardPanel from '@/components/trial/WorkboardPanel';
import TasksPanel from '@/components/trial/TasksPanel';
import CustomerOverviewModal from '@/components/trial/CustomerOverviewModal';
import CustomerSettingsDrawer from '@/components/trial/CustomerSettingsDrawer';
import TaskDetailsModal from '@/components/trial/TaskDetailsModal';

// מודלים להמלצות
import SystemRecommendationsModal from '@/components/admin/SystemRecommendationsModal';
import TargetedRecommendationModal from '@/components/admin/TargetedRecommendationModal';
import GoalOrientedRecommendationModal from '@/components/admin/GoalOrientedRecommendationModal';
import ManualRecommendationModal from '@/components/admin/ManualRecommendationModal';
import RecommendationViewModal from '@/components/admin/RecommendationViewModal';
import RecommendationEditModal from '@/components/admin/RecommendationEditModal';
import RecommendationUpgradeModal from '@/components/admin/RecommendationUpgradeModal';

export default function CustomerManagementNew() {
  const navigate = useNavigate();
  
  // State management
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerListCollapsed, setCustomerListCollapsed] = useState(false);
  const [tasksCollapsed, setTasksCollapsed] = useState(false);
  const [activeWorkboardTab, setActiveWorkboardTab] = useState('recommendations');
  const [customerFilter, setCustomerFilter] = useState('all');
  
  // קריאת פרמטר clientId מה-URL
  const urlParams = new URLSearchParams(window.location.search);
  const clientIdFromUrl = urlParams.get('clientId');
  
  // Modal states
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Recommendation modal states
  const [systemRecModalOpen, setSystemRecModalOpen] = useState(false);
  const [targetedRecModalOpen, setTargetedRecModalOpen] = useState(false);
  const [goalOrientedRecModalOpen, setGoalOrientedRecModalOpen] = useState(false);
  const [manualRecModalOpen, setManualRecModalOpen] = useState(false);
  const [viewRecModalOpen, setViewRecModalOpen] = useState(false);
  const [editRecModalOpen, setEditRecModalOpen] = useState(false);
  const [upgradeRecModalOpen, setUpgradeRecModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);

  // Recommendation filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const queryClient = useQueryClient();

  // טעינת משתמש נוכחי
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // טעינת לקוחות (כולל ארכיון)
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['activeCustomers'],
    queryFn: async () => {
      const onboardingRequests = await base44.entities.OnboardingRequest.list();
      
      // סינון לפי הרשאות
      let filtered = onboardingRequests;
      
      if (user?.role !== 'admin') {
        // מנהל כספים או מנהל מחלקה רואה רק את הלקוחות שלו
        filtered = onboardingRequests.filter(req =>
          req.assigned_financial_manager_email === user.email ||
          req.additional_assigned_financial_manager_emails?.includes(user.email)
        );
      }
      
      return filtered.filter(req => req.is_active);
    },
    enabled: !!user
  });

  // טעינת משימות ללקוח הנבחר
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['customerGoals', selectedCustomer?.email],
    queryFn: () => base44.entities.CustomerGoal.filter({
      customer_email: selectedCustomer.email
    }, '-created_date'),
    enabled: !!selectedCustomer?.email
  });

  // טעינת המלצות ללקוח הנבחר
  const { data: recommendations = [], isLoading: isLoadingRecs } = useQuery({
    queryKey: ['customerRecommendations', selectedCustomer?.email],
    queryFn: () => base44.entities.Recommendation.filter({
      customer_email: selectedCustomer.email,
      status: { $ne: 'archived' }
    }, '-created_date'),
    enabled: !!selectedCustomer?.email
  });

  // טעינת כל המשתמשים לשיוך במשימות
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  // סינון לקוחות לפי קבוצה או ארכיון
  const filteredCustomers = useMemo(() => {
    if (customerFilter === 'archived') {
      return customers.filter(c => c.is_archived === true);
    }
    if (customerFilter === 'all') {
      return customers.filter(c => !c.is_archived);
    }
    return customers.filter(c => c.customer_group === customerFilter && !c.is_archived);
  }, [customers, customerFilter]);

  // סינון המלצות
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      if (categoryFilter !== 'all' && rec.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && rec.priority !== priorityFilter) return false;
      if (sourceFilter !== 'all' && rec.source !== sourceFilter) return false;
      return true;
    });
  }, [recommendations, categoryFilter, statusFilter, priorityFilter, sourceFilter]);

  // בחירה אוטומטית של לקוח לפי URL
  useEffect(() => {
    if (clientIdFromUrl && customers.length > 0 && !selectedCustomer) {
      const customerToSelect = customers.find(c => c.id === clientIdFromUrl);
      if (customerToSelect) {
        setSelectedCustomer(customerToSelect);
      }
    }
  }, [clientIdFromUrl, customers, selectedCustomer]);

  // Handlers
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  };

  const handleViewRecommendation = (rec) => {
    setSelectedRecommendation(rec);
    setViewRecModalOpen(true);
  };

  const handleEditRecommendation = (rec) => {
    setSelectedRecommendation(rec);
    setEditRecModalOpen(true);
  };

  const handleUpgradeRecommendation = (rec) => {
    setSelectedRecommendation(rec);
    setUpgradeRecModalOpen(true);
  };

  const handleDeleteRecommendation = async (recId) => {
    if (!confirm('האם למחוק את ההמלצה?')) return;
    
    try {
      await base44.entities.Recommendation.delete(recId);
      queryClient.invalidateQueries(['customerRecommendations', selectedCustomer.email]);
      alert('ההמלצה נמחקה');
    } catch (error) {
      alert('שגיאה במחיקת ההמלצה: ' + error.message);
    }
  };

  const handleArchiveRecommendation = async (recId) => {
    if (!confirm('האם להעביר לארכיון?')) return;
    
    try {
      await base44.entities.Recommendation.update(recId, { status: 'archived' });
      queryClient.invalidateQueries(['customerRecommendations', selectedCustomer.email]);
      alert('ההמלצה הועברה לארכיון');
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleSendRecommendation = async (rec) => {
    // לוגיקת שליחה לווטסאפ
    alert('פונקציונליות שליחה בפיתוח');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-horizon-dark" dir="rtl">
      {/* כפתור חזרה */}
      <div className="bg-horizon-card border-b border-horizon px-4 py-3">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Admin'))}
          className="text-horizon-accent hover:text-horizon-primary hover:bg-horizon-primary/10"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          חזרה לדשבורד ראשי
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* פאנל לקוחות */}
        {!customerListCollapsed && (
        <div className="w-80 border-l border-horizon flex-shrink-0">
          <CustomerListPanel
            customers={filteredCustomers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            customerFilter={customerFilter}
            onFilterChange={setCustomerFilter}
            onOpenSettings={() => setSettingsDrawerOpen(true)}
            onOpenOverview={(customer) => {
              setSelectedCustomer(customer);
              setOverviewModalOpen(true);
            }}
            onCollapse={() => setCustomerListCollapsed(true)}
            isLoading={isLoadingCustomers}
            currentUser={user}
          />
        </div>
      )}

        {/* כפתור הצגה של פאנל לקוחות */}
        {customerListCollapsed && (
          <div className="flex-shrink-0 border-l border-horizon bg-horizon-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCustomerListCollapsed(false)}
              className="h-full rounded-none hover:bg-horizon-dark"
            >
              <ChevronLeft className="w-5 h-5 text-horizon-accent" />
            </Button>
          </div>
        )}

        {/* Workboard - אזור העבודה המרכזי */}
        <WorkboardPanel
        customer={selectedCustomer}
        activeTab={activeWorkboardTab}
        onTabChange={setActiveWorkboardTab}
        recommendations={filteredRecommendations}
        isLoadingRecommendations={isLoadingRecs}
        onViewRecommendation={handleViewRecommendation}
        onEditRecommendation={handleEditRecommendation}
        onUpgradeRecommendation={handleUpgradeRecommendation}
        onDeleteRecommendation={handleDeleteRecommendation}
        onArchiveRecommendation={handleArchiveRecommendation}
        onSendRecommendation={handleSendRecommendation}
        isAdmin={user?.role === 'admin'}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        onCreateSystemRec={() => setSystemRecModalOpen(true)}
        onCreateTargeted={() => setTargetedRecModalOpen(true)}
        onCreateGoalOriented={() => setGoalOrientedRecModalOpen(true)}
        onCreateManual={() => setManualRecModalOpen(true)}
        isGenerating={isGeneratingRecs}
        currentUser={user}
      />

        {/* כפתור הצגה של פאנל משימות */}
        {tasksCollapsed && (
          <div className="flex-shrink-0 border-r border-horizon bg-horizon-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTasksCollapsed(false)}
              className="h-full rounded-none hover:bg-horizon-dark"
            >
              <ChevronRight className="w-5 h-5 text-horizon-accent" />
            </Button>
          </div>
        )}

        {/* פאנל משימות */}
        {!tasksCollapsed && (
          <div className="w-80 border-r border-horizon flex-shrink-0">
            <TasksPanel
              customer={selectedCustomer}
              tasks={tasks}
              isLoading={isLoadingTasks}
              onTaskClick={handleTaskClick}
              onCollapse={() => setTasksCollapsed(true)}
              allUsers={allUsers}
              currentUser={user}
            />
          </div>
        )}
      </div>

      {/* מודלים */}
      <CustomerOverviewModal
        customer={selectedCustomer}
        isOpen={overviewModalOpen}
        onClose={() => setOverviewModalOpen(false)}
        onOpenSettings={() => {
          setOverviewModalOpen(false);
          setSettingsDrawerOpen(true);
        }}
        onNavigateToTab={(tab) => {
          setOverviewModalOpen(false);
          setActiveWorkboardTab(tab);
        }}
        onArchive={async (customer) => {
          try {
            await base44.entities.OnboardingRequest.update(customer.id, {
              is_archived: true,
              archived_date: new Date().toISOString(),
              archived_by: user?.email
            });
            queryClient.invalidateQueries(['activeCustomers']);
            setOverviewModalOpen(false);
            setSelectedCustomer(null);
            alert('הלקוח הועבר לארכיון');
          } catch (error) {
            alert('שגיאה: ' + error.message);
          }
        }}
      />

      <CustomerSettingsDrawer
        customer={selectedCustomer}
        isOpen={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        onSave={async (updatedData) => {
          try {
            await base44.entities.OnboardingRequest.update(selectedCustomer.id, updatedData);
            queryClient.invalidateQueries(['activeCustomers']);
            setSettingsDrawerOpen(false);
            alert('הנתונים נשמרו בהצלחה');
          } catch (error) {
            alert('שגיאה: ' + error.message);
          }
        }}
      />

      <TaskDetailsModal
        task={selectedTask}
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={async (updatedTask) => {
          try {
            await base44.entities.CustomerGoal.update(updatedTask.id, updatedTask);
            queryClient.invalidateQueries(['customerGoals', selectedCustomer.email]);
            setTaskModalOpen(false);
            alert('המשימה עודכנה');
          } catch (error) {
            alert('שגיאה: ' + error.message);
          }
        }}
        allUsers={allUsers}
        customer={selectedCustomer}
        currentUser={user}
      />

      {/* מודלים להמלצות */}
      {systemRecModalOpen && (
        <SystemRecommendationsModal
          customer={selectedCustomer}
          isOpen={systemRecModalOpen}
          onClose={() => setSystemRecModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['customerRecommendations', selectedCustomer.email]);
            setSystemRecModalOpen(false);
          }}
        />
      )}

      {targetedRecModalOpen && (
        <TargetedRecommendationModal
          customer={selectedCustomer}
          isOpen={targetedRecModalOpen}
          onClose={() => setTargetedRecModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['customerRecommendations', selectedCustomer.email]);
            setTargetedRecModalOpen(false);
          }}
        />
      )}

      {goalOrientedRecModalOpen && (
        <GoalOrientedRecommendationModal
          customer={selectedCustomer}
          isOpen={goalOrientedRecModalOpen}
          onClose={() => setGoalOrientedRecModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['customerRecommendations', selectedCustomer.email]);
            setGoalOrientedRecModalOpen(false);
          }}
        />
      )}

      {manualRecModalOpen && (
        <ManualRecommendationModal
          customer={selectedCustomer}
          isOpen={manualRecModalOpen}
          onClose={() => setManualRecModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['customerRecommendations', selectedCustomer.email]);
            setManualRecModalOpen(false);
          }}
        />
      )}

      {viewRecModalOpen && selectedRecommendation && (
        <RecommendationViewModal
          recommendation={selectedRecommendation}
          isOpen={viewRecModalOpen}
          onClose={() => {
            setViewRecModalOpen(false);
            setSelectedRecommendation(null);
          }}
        />
      )}

      {editRecModalOpen && selectedRecommendation && (
        <RecommendationEditModal
          recommendation={selectedRecommendation}
          isOpen={editRecModalOpen}
          onClose={() => {
            setEditRecModalOpen(false);
            setSelectedRecommendation(null);
          }}
          onSave={async (updatedRec) => {
            try {
              await base44.entities.Recommendation.update(updatedRec.id, updatedRec);
              queryClient.invalidateQueries(['customerRecommendations', selectedCustomer.email]);
              setEditRecModalOpen(false);
              alert('ההמלצה עודכנה');
            } catch (error) {
              alert('שגיאה: ' + error.message);
            }
          }}
        />
      )}

      {upgradeRecModalOpen && selectedRecommendation && (
        <RecommendationUpgradeModal
          recommendation={selectedRecommendation}
          customer={selectedCustomer}
          isOpen={upgradeRecModalOpen}
          onClose={() => {
            setUpgradeRecModalOpen(false);
            setSelectedRecommendation(null);
          }}
          onUpgraded={() => {
            queryClient.invalidateQueries(['customerRecommendations', selectedCustomer.email]);
            setUpgradeRecModalOpen(false);
          }}
        />
      )}
    </div>
  );
}