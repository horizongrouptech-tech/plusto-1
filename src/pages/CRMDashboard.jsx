import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import ClientSidebar from '../components/crm/ClientSidebar';
import WorkspaceCenter from '../components/crm/WorkspaceCenter';
import TasksSidebar from '../components/crm/TasksSidebar';
import ClientSettingsModal from '../components/crm/ClientSettingsModal';
import TaskCreationModal from '../components/dashboard/TaskCreationModal';

export default function CRMDashboard() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [isClientSidebarCollapsed, setIsClientSidebarCollapsed] = useState(false);
  const [isTasksSidebarCollapsed, setIsTasksSidebarCollapsed] = useState(false);
  const [settingsClient, setSettingsClient] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // טעינת משתמש נוכחי
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.user_type === 'financial_manager';

  // טעינת לקוחות
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['crmClients', currentUser?.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const onboardingReqs = await base44.entities.OnboardingRequest.filter({ is_active: true });
        return onboardingReqs.map(req => ({
          id: req.id,
          email: req.email,
          full_name: req.full_name,
          business_name: req.business_name,
          customer_group: req.customer_group,
          assigned_financial_manager_email: req.assigned_financial_manager_email,
          business_type: req.business_type,
          phone: req.phone
        }));
      } else {
        const allOnboardingReqs = await base44.entities.OnboardingRequest.filter({ is_active: true });
        const myClients = allOnboardingReqs.filter(req =>
          req.assigned_financial_manager_email === currentUser.email ||
          req.additional_assigned_financial_manager_emails?.includes(currentUser.email)
        );
        return myClients.map(req => ({
          id: req.id,
          email: req.email,
          full_name: req.full_name,
          business_name: req.business_name,
          customer_group: req.customer_group,
          assigned_financial_manager_email: req.assigned_financial_manager_email,
          business_type: req.business_type,
          phone: req.phone
        }));
      }
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  // טעינת משימות של הלקוח הנבחר
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['crmClientTasks', selectedClient?.email],
    queryFn: () => base44.entities.CustomerGoal.filter({
      customer_email: selectedClient.email,
      is_active: true
    }, 'end_date'),
    enabled: !!selectedClient,
    staleTime: 2 * 60 * 1000,
  });

  // Mutation לעדכון פרטי לקוח
  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, data }) => {
      return await base44.asServiceRole.entities.OnboardingRequest.update(clientId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crmClients']);
      alert('פרטי הלקוח עודכנו בהצלחה');
    },
    onError: (error) => {
      console.error('Error updating client:', error);
      alert('שגיאה בעדכון פרטי הלקוח');
    }
  });

  // Mutation ליצירת משימה
  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.CustomerGoal.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries(['crmClientTasks']);
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      alert('שגיאה ביצירת המשימה');
    }
  });

  const handleSaveClientSettings = async (clientId, data) => {
    await updateClientMutation.mutateAsync({ clientId, data });
  };

  const handleTaskCreated = async (taskData) => {
    await createTaskMutation.mutateAsync(taskData);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-horizon-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-horizon-primary mb-4" />
          <p className="text-horizon-accent">טוען מערכת CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-horizon-dark" dir="rtl">
      {/* פאנל לקוחות - ימין */}
      <ClientSidebar
        clients={clients}
        selectedClient={selectedClient}
        onSelectClient={setSelectedClient}
        onOpenSettings={setSettingsClient}
        isCollapsed={isClientSidebarCollapsed}
        onToggleCollapse={() => setIsClientSidebarCollapsed(!isClientSidebarCollapsed)}
      />

      {/* לוח עבודה - אמצע */}
      <WorkspaceCenter
        selectedClient={selectedClient}
        currentUser={currentUser}
        isAdmin={isAdmin}
      />

      {/* פאנל משימות - שמאל */}
      <TasksSidebar
        tasks={tasks}
        selectedClient={selectedClient}
        currentUserEmail={currentUser?.email}
        onTaskClick={(task) => {
          setSelectedTask(task);
          setIsTaskModalOpen(true);
        }}
        onTaskCreated={handleTaskCreated}
        isCollapsed={isTasksSidebarCollapsed}
        onToggleCollapse={() => setIsTasksSidebarCollapsed(!isTasksSidebarCollapsed)}
      />

      {/* מודאל הגדרות לקוח */}
      <ClientSettingsModal
        client={settingsClient}
        isOpen={!!settingsClient}
        onClose={() => setSettingsClient(null)}
        onSave={handleSaveClientSettings}
      />

      {/* מודאל עריכת משימה */}
      {selectedTask && (
        <TaskCreationModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
          currentUser={currentUser}
          isAdmin={isAdmin}
          customers={clients}
          taskToEdit={selectedTask}
        />
      )}
    </div>
  );
}