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
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// קומפוננטות פאנלים
import CustomerListPanel from '@/components/trial/CustomerListPanel';
import WorkboardPanel from '@/components/trial/WorkboardPanel';
import TasksPanel from '@/components/trial/TasksPanel';
import CustomerSettingsDrawer from '@/components/trial/CustomerSettingsDrawer';

export default function TrialDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('files');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  // טעינת לקוחות
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['trialCustomers', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      
      let filter = { status: 'approved', is_active: true };
      
      // אם מנהל כספים - רק הלקוחות שלו
      if (currentUser.user_type === 'financial_manager' && currentUser.role !== 'admin') {
        filter.assigned_financial_manager_email = currentUser.email;
      }
      
      return base44.entities.OnboardingRequest.filter(filter, 'business_name');
    },
    enabled: !!currentUser,
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
          <h1 className="text-xl font-bold text-horizon-text">דשבורד CRM - גרסת ניסיון</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            גרסת ניסיון
          </Badge>
        </div>
      </header>

      {/* Main Content - 3 Panels */}
      <div className="flex-1 flex overflow-hidden">
        
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
              onCollapse={() => setRightPanelCollapsed(true)}
              isLoading={loadingCustomers}
            />
          )}
        </div>

        {/* פאנל מרכזי - לוח עבודה */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <WorkboardPanel
            customer={selectedCustomer}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
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
            />
          )}
        </div>
      </div>

      {/* גלגלת הגדרות לקוח */}
      <CustomerSettingsDrawer
        customer={selectedCustomer}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}