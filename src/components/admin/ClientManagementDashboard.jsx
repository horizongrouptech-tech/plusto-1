import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, UserPlus, UserCheck, UserX, Edit, Power, PowerOff, ArrowLeft, BarChart3, Filter, TrendingUp, Users, DollarSign, RefreshCw } from 'lucide-react';
import EditCustomerModal from './EditCustomerModal';
import ClientDetailSidebar from './ClientDetailSidebar';
import LoadingScreen from '../shared/LoadingScreen';
import OnboardingRequestsModal from './OnboardingRequestsModal';
import { Users as UsersIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CreateOnboardingRequestForm from './CreateOnboardingRequestForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManagerAssignmentBoard from './ManagerAssignmentBoard';


export default function ClientManagementDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showCreateOnboardingModal, setShowCreateOnboardingModal] = useState(false);
  const [isSubmittingNewOnboarding, setIsSubmittingNewOnboarding] = useState(false);
  const [showManagerAssignModal, setShowManagerAssignModal] = useState(false);
  const [clientToAssign, setClientToAssign] = useState(null);
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  const [revenueFilter, setRevenueFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState('clients');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['allAdminClientsAndOnboarding'],
    queryFn: async () => {
      const currentUserInQuery = await base44.auth.me();
      const isFinancialManager = currentUserInQuery?.role === 'user' && currentUserInQuery?.user_type === 'financial_manager';
      const isAdmin = currentUserInQuery?.role === 'admin';

      let users = [];
      let onboardingRequests = [];
      let allUsers = [];

      if (isAdmin) {
        [users, onboardingRequests, allUsers] = await Promise.all([
        base44.entities.User.filter({
          role: { $ne: 'admin' },
          user_type: { $ne: 'financial_manager' }
        }),
        base44.entities.OnboardingRequest.filter({}),
        base44.entities.User.list()]
        );
      } else if (isFinancialManager) {
        const allOnboardingRequests = await base44.entities.OnboardingRequest.list();
        onboardingRequests = allOnboardingRequests.filter((req) =>
        req.assigned_financial_manager_email === currentUserInQuery.email ||
        req.additional_assigned_financial_manager_emails?.includes(currentUserInQuery.email)
        );

        // טען גם Users משויכים (אם יש)
        users = await base44.entities.User.filter({
          $or: [
            { assigned_financial_manager_email: currentUserInQuery.email },
            { additional_assigned_financial_manager_emails: { $contains: currentUserInQuery.email } }
          ]
        });

        allUsers = [{
          email: currentUserInQuery.email,
          full_name: currentUserInQuery.full_name,
          user_type: 'financial_manager'
        }];
      } else {
        console.warn("User role not recognized for client management dashboard.");
        return { clients: [], allUsers: [] };
      }

      const managerMap = allUsers.reduce((acc, user) => {
        if (user.user_type === 'financial_manager') {
          acc[user.email] = user.full_name;
        }
        return acc;
      }, {});

      const uniqueClientsMap = new Map();

      users.forEach((u) => {
        uniqueClientsMap.set(u.email, {
          id: u.id,
          name: u.business_name || u.full_name || 'N/A',
          email: u.email,
          manager: managerMap[u.assigned_financial_manager_email] || 'לא שויך',
          isActive: u.is_active !== false,
          source: 'user',
          raw: u
        });
      });

      onboardingRequests.forEach((or) => {
        if (!uniqueClientsMap.has(or.email)) {
          const primaryManagerName = managerMap[or.assigned_financial_manager_email] || 'לא שויך';
          const additionalManagersCount = (or.additional_assigned_financial_manager_emails || []).
          filter((email) => managerMap[email]).length;

          const allManagersDisplay = additionalManagersCount > 0 ?
          `${primaryManagerName} + ${additionalManagersCount} נוספים` :
          primaryManagerName;

          uniqueClientsMap.set(or.email, {
            id: or.id,
            name: or.business_name || or.full_name,
            email: or.email,
            manager: allManagersDisplay,
            isActive: or.is_active !== false,
            source: 'onboarding',
            raw: or,
            onboardingStatus: or.status
          });
        }
      });

      const allClients = Array.from(uniqueClientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      return { clients: allClients, allUsers, currentUser: currentUserInQuery };
    },
    staleTime: 30000,
    cacheTime: 60000
  });

  const clients = data?.clients || [];
  const allUsers = data?.allUsers || [];
  const currentUser = data?.currentUser || null;

  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients, selectedClient]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter((client) => {
      const matchesActivity = showInactive ? !client.isActive : client.isActive;
      const matchesSearch = searchTerm === '' ||
      client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.raw?.business_name && client.raw.business_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBusinessType = businessTypeFilter === 'all' || client.raw?.business_type === businessTypeFilter;

      const matchesRevenue = (() => {
        if (revenueFilter === 'all') return true;
        const revenue = client.raw?.monthly_revenue || 0;
        if (revenueFilter === 'low') return revenue < 50000;
        if (revenueFilter === 'medium') return revenue >= 50000 && revenue < 200000;
        if (revenueFilter === 'high') return revenue >= 200000;
        return true;
      })();

      const matchesManager = managerFilter === 'all' ||
      managerFilter === 'unassigned' && client.manager === 'לא שויך' ||
      client.raw?.assigned_financial_manager_email === managerFilter;

      return matchesActivity && matchesSearch && matchesBusinessType && matchesRevenue && matchesManager;
    });
  }, [clients, searchTerm, showInactive, businessTypeFilter, revenueFilter, managerFilter]);

  const financialManagers = useMemo(() => {
    return allUsers?.filter((u) => u.user_type === 'financial_manager') || [];
  }, [allUsers]);

  const analytics = useMemo(() => {
    if (!clients) return null;

    const activeClients = clients.filter((c) => c.isActive);

    const byBusinessType = activeClients.reduce((acc, c) => {
      const type = c.raw?.business_type || 'אחר';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const byRevenue = {
      'נמוך (<50K)': activeClients.filter((c) => (c.raw?.monthly_revenue || 0) < 50000).length,
      'בינוני (50K-200K)': activeClients.filter((c) => {
        const rev = c.raw?.monthly_revenue || 0;
        return rev >= 50000 && rev < 200000;
      }).length,
      'גבוה (200K+)': activeClients.filter((c) => (c.raw?.monthly_revenue || 0) >= 200000).length
    };

    const totalRevenue = activeClients.reduce((sum, c) => sum + (c.raw?.monthly_revenue || 0), 0);

    return {
      total: clients.length,
      active: activeClients.length,
      inactive: clients.length - activeClients.length,
      byBusinessType,
      byRevenue,
      totalRevenue,
      avgRevenue: activeClients.length > 0 ? totalRevenue / activeClients.length : 0
    };
  }, [clients]);

  const handleToggleClientStatus = async (client) => {
    if (client.source !== 'user' && client.source !== 'onboarding') {
      alert('לא ניתן לשנות סטטוס ללקוח זה.');
      return;
    }
    const newStatus = !client.isActive;
    const action = newStatus ? "להפעיל" : "להעביר לארכיון";
    if (window.confirm(`האם אתה בטוח שברצונך ${action} את הלקוח "${client.name}"?`)) {
      try {
        if (client.source === 'user') {
          await base44.functions.invoke('toggleClientStatus', { clientId: client.id, isActive: newStatus });
        } else if (client.source === 'onboarding') {
          await base44.entities.OnboardingRequest.update(client.id, { is_active: newStatus });
        }
        queryClient.invalidateQueries(['allAdminClientsAndOnboarding']);
      } catch (error) {
        console.error(`Error toggling client status:`, error);
        alert(`שגיאה ב${action} הלקוח.`);
      }
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer.raw);
    setIsEditModalOpen(true);
  };

  const handleCreateOnboardingSubmit = async (formData) => {
    setIsSubmittingNewOnboarding(true);
    try {
      console.log('Creating new OnboardingRequest with data:', formData);

      const newOnboardingRequest = await base44.entities.OnboardingRequest.create({
        ...formData,
        status: 'pending',
        assigned_financial_manager_email: currentUser?.email
      });

      console.log('OnboardingRequest created:', newOnboardingRequest.id);

      const { data: approvalResult, error: approvalError } = await base44.functions.invoke('approveOnboardingRequest', {
        onboarding_request_id: newOnboardingRequest.id
      });

      if (approvalError) {
        throw new Error(approvalError.message || 'שגיאה בהפעלת תהליך האוטומציה');
      }

      console.log('Onboarding automation triggered:', approvalResult);

      alert(`הלקוח ${formData.business_name} נוצר בהצלחה! תהליכי האוטומציה (יצירת קטלוג, המלצות ועוד) יסתיימו תוך מספר דקות.`);

      queryClient.invalidateQueries(['allAdminClientsAndOnboarding']);
      queryClient.invalidateQueries(['allUsers']);

      setShowCreateOnboardingModal(false);

    } catch (error) {
      console.error('Error creating onboarding customer:', error);
      alert('שגיאה ביצירת הלקוח: ' + error.message);
    } finally {
      setIsSubmittingNewOnboarding(false);
    }
  };

  const handleAssignManager = async (clientId, clientSource, managerEmail) => {
    try {
      if (clientSource === 'onboarding') {
        await base44.entities.OnboardingRequest.update(clientId, {
          assigned_financial_manager_email: managerEmail || null
        });
      } else {
        await base44.entities.User.update(clientId, {
          assigned_financial_manager_email: managerEmail || null
        });
      }
      queryClient.invalidateQueries(['allAdminClientsAndOnboarding']);
      setShowManagerAssignModal(false);
      setClientToAssign(null);
    } catch (error) {
      console.error('Error assigning manager:', error);
      alert('שגיאה בשיוך מנהל כספים');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="טוען רשימת לקוחות..." />;
  }

  const COLORS = ['#32acc1', '#fc9f67', '#38A169', '#E53E3E', '#805AD5', '#D69E2E'];

  return (
    <TooltipProvider>
            <div className="space-y-6 p-6" dir="rtl">
                {/* Analytics Cards */}
                {analytics &&
        <div className="grid grid-cols-2 gap-4">
                        <Card className="card-horizon">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-horizon-accent mb-2">סה"כ לקוחות</p>
                                        <p className="text-3xl font-bold text-horizon-primary">{analytics.total}</p>
                                    </div>
                                    <Users className="w-12 h-12 text-horizon-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="card-horizon">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-horizon-accent mb-2">פעילים</p>
                                        <p className="text-3xl font-bold text-green-500">{analytics.active}</p>
                                    </div>
                                    <UserCheck className="w-12 h-12 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
        }

                {/* Analytics Toggle */}
                <div className="flex justify-end">
                    <Button
            onClick={() => setShowAnalytics(!showAnalytics)}
            variant="outline"
            className="border-horizon-primary text-horizon-primary">

                        <BarChart3 className="w-4 h-4 ml-2" />
                        {showAnalytics ? 'הסתר ניתוח גרפי' : 'הצג ניתוח גרפי'}
                    </Button>
                </div>

                {/* Charts Section */}
                {showAnalytics && analytics &&
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="card-horizon">
                            <CardHeader>
                                <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-horizon-primary" />
                                    התפלגות לפי סוג עסק
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between gap-6">
                                    <ResponsiveContainer width="60%" height={350}>
                                        <PieChart>
                                            <Pie
                      data={Object.entries(analytics.byBusinessType).map(([name, value]) => ({
                        name: name === 'retail' ? 'קמעונאות' :
                        name === 'wholesale' ? 'סיטונאות' :
                        name === 'manufacturing' ? 'ייצור' :
                        name === 'services' ? 'שירותים' :
                        name === 'restaurant' ? 'מסעדה' : name,
                        value
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value">

                                                {Object.keys(analytics.byBusinessType).map((key, index) =>
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2} />

                      )}
                                            </Pie>
                                            <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#112240',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }} />

                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex-1 space-y-3">
                                        {Object.entries(analytics.byBusinessType).map(([name, value], index) => {
                    const displayName = name === 'retail' ? 'קמעונאות' :
                    name === 'wholesale' ? 'סיטונאות' :
                    name === 'manufacturing' ? 'ייצור' :
                    name === 'services' ? 'שירותים' :
                    name === 'restaurant' ? 'מסעדה' : name;
                    const total = Object.values(analytics.byBusinessType).reduce((sum, v) => sum + v, 0);
                    const percentage = (value / total * 100).toFixed(0);
                    return (
                      <div key={name} className="flex items-center gap-3">
                                                    <div
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }} />

                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-horizon-text">{displayName}</span>
                                                            <span className="text-sm text-horizon-accent">{percentage}%</span>
                                                        </div>
                                                        <div className="text-xs text-horizon-accent mt-0.5">
                                                            {value} לקוחות
                                                        </div>
                                                    </div>
                                                </div>);

                  })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-horizon">
                            <CardHeader>
                                <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-horizon-primary" />
                                    התפלגות לפי מחזור
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart
                  data={Object.entries(analytics.byRevenue).map(([name, value]) => ({ name, value }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>

                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#32acc1" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#32acc1" stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                    dataKey="name"
                    stroke="#cbd5e0"
                    tick={{ fill: '#cbd5e0' }}
                    style={{ fontSize: '12px' }} />

                                        <YAxis
                    stroke="#cbd5e0"
                    tick={{ fill: '#cbd5e0' }} />

                                        <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#112240',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    cursor={{ fill: 'rgba(50, 172, 193, 0.1)' }} />

                                        <Bar
                    dataKey="value"
                    fill="url(#colorRevenue)"
                    radius={[8, 8, 0, 0]}
                    label={{
                      position: 'top',
                      fill: '#32acc1',
                      fontSize: 14,
                      fontWeight: 'bold'
                    }} />

                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
        }

                {/* Tabs Navigation */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-horizon-card border border-horizon w-full justify-start">
                        <TabsTrigger
              value="clients"
              className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">

                            <UsersIcon className="w-4 h-4 ml-2" />
                            רשימת לקוחות
                        </TabsTrigger>
                        {(currentUser?.role === 'admin' || currentUser?.email === 'omer@horizon.org.il') &&
            <TabsTrigger
              value="assignment" className="text-slate-50 px-6 py-3 text-sm font-bold rounded-lg inline-flex items-center justify-center whitespace-nowrap ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#32acc1] data-[state=active]:to-[#83ddec] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover-lift">


                                <Users className="w-4 h-4 ml-2" />
                                שיוך מנהלי כספים
                            </TabsTrigger>
            }
                    </TabsList>

                    <TabsContent value="clients" className="mt-6 space-y-6">
                        {/* Filters Section */}
                        <Card className="card-horizon">
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-horizon-accent" />
                                        <Input
                      placeholder="חפש לקוח..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-horizon-dark border-horizon text-horizon-text pr-10 w-full" />

                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <Select value={managerFilter} onValueChange={setManagerFilter}>
                                            <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text w-[180px]">
                                                <SelectValue placeholder="כל המנהלים" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-horizon-dark border-horizon">
                                                <SelectItem value="all">כל המנהלים</SelectItem>
                                                <SelectItem value="unassigned">לא משויכים</SelectItem>
                                                {financialManagers.map((fm) =>
                        <SelectItem key={fm.email} value={fm.email}>
                                                        {fm.full_name}
                                                    </SelectItem>
                        )}
                                            </SelectContent>
                                        </Select>
                                        <Select value={revenueFilter} onValueChange={setRevenueFilter}>
                                            <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text w-[180px]">
                                                <SelectValue placeholder="כל המחזורים" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-horizon-dark border-horizon">
                                                <SelectItem value="all">כל המחזורים</SelectItem>
                                                <SelectItem value="low">נמוך (&lt;50K)</SelectItem>
                                                <SelectItem value="medium">בינוני (50K-200K)</SelectItem>
                                                <SelectItem value="high">גבוה (200K+)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
                                            <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text w-[180px]">
                                                <SelectValue placeholder="כל סוגי העסק" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-horizon-dark border-horizon">
                                                <SelectItem value="all">כל סוגי העסק</SelectItem>
                                                <SelectItem value="retail">קמעונאות</SelectItem>
                                                <SelectItem value="wholesale">סיטונאות</SelectItem>
                                                <SelectItem value="manufacturing">ייצור</SelectItem>
                                                <SelectItem value="services">שירותים</SelectItem>
                                                <SelectItem value="restaurant">מסעדה</SelectItem>
                                                <SelectItem value="other">אחר</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                      onClick={() => setShowInactive(!showInactive)}
                      variant="outline"
                      className="text-horizon-accent border-horizon"
                      size="sm">

                                            {showInactive ? 'הצג פעילים' : 'הצג ארכיון'}
                                        </Button>
                                        {(businessTypeFilter !== 'all' || revenueFilter !== 'all' || managerFilter !== 'all') &&
                    <Button
                      onClick={() => {
                        setBusinessTypeFilter('all');
                        setRevenueFilter('all');
                        setManagerFilter('all');
                      }}
                      variant="ghost"
                      className="text-red-400"
                      size="sm">

                                                <RefreshCw className="w-4 h-4 ml-2" />
                                                נקה
                                            </Button>
                    }
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                    <Card className="card-horizon">
                        <CardHeader className="border-b border-horizon">
                            <CardTitle className="text-horizon-text flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-horizon-primary" />
                                רשימת לקוחות ({filteredClients.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b-horizon hover:bg-transparent">
                                            <TableHead className="text-right text-horizon-text">שם הלקוח</TableHead>
                                            <TableHead className="text-right text-horizon-text hidden lg:table-cell">מנהל כספים</TableHead>
                                            <TableHead className="text-center text-horizon-text">סטטוס</TableHead>
                                            <TableHead className="text-center text-horizon-text">פעולות</TableHead>
                                            <TableHead className="text-center text-horizon-text">ניהול</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredClients.map((client) =>
                          <TableRow
                            key={client.id}
                            className={`border-b-horizon cursor-pointer transition-colors ${selectedClient?.id === client.id ? 'bg-horizon-primary/20' : 'hover:bg-horizon-primary/10'}`}
                            onClick={() => setSelectedClient(client)}>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="font-medium text-horizon-text cursor-pointer">
                                                                    {client.name}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="left" className="bg-horizon-dark border-horizon p-4 max-w-sm">
                                                                <div className="space-y-2 text-right">
                                                                    <div className="font-bold text-horizon-text border-b border-horizon pb-2">
                                                                        {client.name}
                                                                    </div>
                                                                    <div className="text-sm space-y-1">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-horizon-text">{client.email}</span>
                                                                            <span className="text-horizon-accent">:אימייל</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-horizon-text">{client.manager}</span>
                                                                            <span className="text-horizon-accent">:מנהל</span>
                                                                        </div>
                                                                        {client.raw?.business_type &&
                                        <div className="flex justify-between">
                                                                                <span className="text-horizon-text">{client.raw.business_type}</span>
                                                                                <span className="text-horizon-accent">:סוג עסק</span>
                                                                            </div>
                                        }
                                                                        {client.raw?.customer_group &&
                                        <div className="flex justify-between">
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    קבוצה {client.raw.customer_group}
                                                                                </Badge>
                                                                                <span className="text-horizon-accent">:קבוצה</span>
                                                                            </div>
                                        }
                                                                        <div className="flex justify-between">
                                                                            <Badge variant={client.isActive ? "default" : "destructive"} className="text-xs">
                                                                                {client.isActive ? 'פעיל' : 'לא פעיל'}
                                                                            </Badge>
                                                                            <span className="text-horizon-accent">:סטטוס</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        {client.source === 'onboarding' &&
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleClientStatus(client);
                                  }}
                                  className="h-8 w-8 hover:bg-horizon-card/50">

                                                                {client.isActive ?
                                  <PowerOff className="w-4 h-4 text-red-500" /> :

                                  <Power className="w-4 h-4 text-green-500" />
                                  }
                                                            </Button>
                                }
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-horizon-accent hidden lg:table-cell">
                                                    <span>{client.manager}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {client.isActive ? <UserCheck className="w-5 h-5 text-green-500 mx-auto" /> : <UserX className="w-5 h-5 text-red-500 mx-auto" />}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-horizon-card/50" onClick={(e) => {e.stopPropagation();handleEditCustomer(client);}}>
                                                            <Edit className="w-4 h-4 text-horizon-accent hover:text-horizon-primary" />
                                                        </Button>
                                                        {client.source === 'user' &&
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-horizon-card/50" onClick={(e) => {e.stopPropagation();handleToggleClientStatus(client);}}>
                                                                {client.isActive ? <PowerOff className="w-4 h-4 text-red-500" /> : <Power className="w-4 h-4 text-green-500" />}
                                                            </Button>
                                }
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {(() => {
                                const inferred =
                                client?.source || (
                                client?.id?.startsWith('onboarding_') ? 'onboarding' :
                                client?.id?.startsWith('contact_') ? 'customer_contact' :
                                'user');
                                return (
                                  <Link to={createPageUrl('CustomerManagement') + `?clientId=${client.id}&source=${inferred}`}>
                                                                <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10 hover:border-horizon-primary active:bg-horizon-primary/20"
                                      onClick={(e) => e.stopPropagation()}>

                                                                    <ArrowLeft className="w-4 h-4 ml-2" />
                                                                    ניהול מלא
                                                                </Button>
                                                            </Link>);

                              })()}
                                                </TableCell>
                                            </TableRow>
                          )}
                                    </TableBody>
                                </Table>
                                {filteredClients.length === 0 &&
                      <div className="text-center py-10 text-horizon-accent">
                                        <p>לא נמצאו לקוחות התואמים את החיפוש.</p>
                                    </div>
                      }
                            </div>
                        </CardContent>
                    </Card>
                </div>

                        <div className="lg:col-span-1">
                            <ClientDetailSidebar client={selectedClient} allUsers={allUsers} />
                        </div>
                    </div>
                    </TabsContent>

                    {(currentUser?.role === 'admin' || currentUser?.email === 'omer@horizon.org.il') &&
          <TabsContent value="assignment" className="mt-6">
                            <ManagerAssignmentBoard
              clients={clients}
              financialManagers={financialManagers}
              onAssignmentChange={() => {
                queryClient.invalidateQueries(['allAdminClientsAndOnboarding']);
              }} />

                        </TabsContent>
          }
                </Tabs>

                {isEditModalOpen && editingCustomer &&
        <EditCustomerModal
          customer={editingCustomer}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onCustomerUpdated={(updatedCustomer) => {
            queryClient.invalidateQueries(['allAdminClientsAndOnboarding']);
            setIsEditModalOpen(false);
          }} />

        }

                <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-50">
                    {currentUser?.role === 'admin' &&
          <Button
            onClick={() => setShowOnboardingModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-14 w-14 shadow-lg flex items-center justify-center"
            title="לקוחות ממתינים">

                            <UsersIcon className="w-6 h-6" />
                        </Button>
          }
                </div>

                {showOnboardingModal &&
        <OnboardingRequestsModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)} />

        }

                {(currentUser?.role === 'admin' || currentUser?.role === 'user' && currentUser?.user_type === 'financial_manager') &&
        <Dialog open={showCreateOnboardingModal} onOpenChange={setShowCreateOnboardingModal}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon">
                            <DialogHeader>
                                <DialogTitle className="text-2xl text-horizon-text">יצירת לקוח חדש</DialogTitle>
                                <DialogDescription className="text-horizon-accent">
                                    מלא את הפרטים המלאים של הלקוח. לאחר יצירה, המערכת תפעיל אוטומטית את כל תהליכי האונבורדינג (יצירת קטלוג, המלצות ראשוניות ועוד).
                                </DialogDescription>
                            </DialogHeader>

                            <CreateOnboardingRequestForm
              onSubmit={handleCreateOnboardingSubmit}
              onCancel={() => setShowCreateOnboardingModal(false)}
              isLoading={isSubmittingNewOnboarding}
              currentUserEmail={currentUser?.email} />

                        </DialogContent>
                    </Dialog>
        }


            </div>
        </TooltipProvider>);

}