import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Home, Target, DollarSign, AlertCircle, CheckCircle, Clock,
  TrendingUp, TrendingDown, Calendar, ChevronRight, Loader2,
  Bell, FileText, User, Settings, BarChart3, Wallet
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// ניווט תחתון
const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'ראשי' },
  { id: 'tasks', icon: Target, label: 'משימות' },
  { id: 'cashflow', icon: Wallet, label: 'תזרים' },
  { id: 'alerts', icon: Bell, label: 'התראות' }
];

export default function MobileDashboard({ customer, currentUser }) {
  const [activeTab, setActiveTab] = useState('home');

  // טעינת משימות פתוחות
  const { data: openTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['mobileTasks', customer?.email],
    queryFn: () => base44.entities.CustomerGoal.filter({
      customer_email: customer.email,
      is_active: true,
      status: { $in: ['open', 'in_progress'] }
    }, 'end_date', 10),
    enabled: !!customer?.email
  });

  // טעינת תזרים
  const { data: cashflowData = [], isLoading: isLoadingCashflow } = useQuery({
    queryKey: ['mobileCashflow', customer?.email],
    queryFn: () => base44.entities.CashFlow.filter({
      customer_email: customer.email
    }, '-date', 30),
    enabled: !!customer?.email
  });

  // טעינת התראות (משימות באיחור)
  const { data: alerts = [] } = useQuery({
    queryKey: ['mobileAlerts', customer?.email],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const delayed = await base44.entities.CustomerGoal.filter({
        customer_email: customer.email,
        is_active: true,
        status: { $in: ['open', 'in_progress'] },
        end_date: { $lt: today }
      });
      return delayed;
    },
    enabled: !!customer?.email
  });

  // חישוב סיכומים
  const cashflowSummary = React.useMemo(() => {
    const credits = cashflowData.filter(c => c.type === 'credit').reduce((sum, c) => sum + (c.amount || 0), 0);
    const debits = cashflowData.filter(c => c.type === 'debit').reduce((sum, c) => sum + (c.amount || 0), 0);
    return { credits, debits, balance: credits - debits };
  }, [cashflowData]);

  const formatCurrency = (value) => {
    if (typeof value !== 'number') return '₪0';
    return `₪${Math.abs(Math.round(value)).toLocaleString()}`;
  };

  const getStatusBadge = (status, endDate) => {
    const today = new Date();
    const dueDate = new Date(endDate);
    const isOverdue = dueDate < today && status !== 'done';

    if (isOverdue) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">באיחור</Badge>;
    }
    
    const badges = {
      open: <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50 text-xs">פתוח</Badge>,
      in_progress: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">בביצוע</Badge>,
      done: <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">הושלם</Badge>
    };
    return badges[status] || badges.open;
  };

  // תוכן לפי טאב
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-4 pb-20">
            {/* כותרת */}
            <div className="bg-gradient-to-l from-horizon-primary/20 to-transparent rounded-xl p-4">
              <h1 className="text-xl font-bold text-horizon-text">
                שלום, {currentUser?.full_name?.split(' ')[0] || 'משתמש'} 👋
              </h1>
              <p className="text-sm text-horizon-accent mt-1">
                {customer?.business_name || 'לקוח'}
              </p>
            </div>

            {/* כרטיסי סיכום */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">הכנסות</span>
                  </div>
                  <p className="text-lg font-bold text-horizon-text">
                    {formatCurrency(cashflowSummary.credits)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">הוצאות</span>
                  </div>
                  <p className="text-lg font-bold text-horizon-text">
                    {formatCurrency(cashflowSummary.debits)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* יתרה */}
            <Card className={`border ${cashflowSummary.balance >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm text-horizon-accent">יתרה נוכחית</span>
                  <p className={`text-2xl font-bold ${cashflowSummary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(cashflowSummary.balance)}
                  </p>
                </div>
                <Wallet className={`w-10 h-10 ${cashflowSummary.balance >= 0 ? 'text-green-400/30' : 'text-red-400/30'}`} />
              </CardContent>
            </Card>

            {/* התראות */}
            {alerts.length > 0 && (
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-red-400">{alerts.length} משימות באיחור</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab('alerts')}
                    className="text-red-400 hover:bg-red-500/10 p-0"
                  >
                    צפה בפרטים
                    <ChevronRight className="w-4 h-4 mr-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* משימות קרובות */}
            <Card className="card-horizon">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-horizon-text">משימות קרובות</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab('tasks')}
                    className="text-horizon-primary text-xs"
                  >
                    הכל
                    <ChevronRight className="w-3 h-3 mr-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingTasks ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
                  </div>
                ) : openTasks.length === 0 ? (
                  <div className="text-center py-4 text-horizon-accent">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400/50" />
                    <p className="text-sm">אין משימות פתוחות! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openTasks.slice(0, 4).map(task => (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-horizon-card rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-horizon-text text-sm truncate">{task.name}</p>
                          {task.end_date && (
                            <p className="text-xs text-horizon-accent mt-1">
                              יעד: {format(new Date(task.end_date), 'dd/MM')}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(task.status, task.end_date)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-4 pb-20">
            <h2 className="text-xl font-bold text-horizon-text">משימות ({openTasks.length})</h2>
            {openTasks.length === 0 ? (
              <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400/50" />
                  <p className="text-horizon-accent">אין משימות פתוחות</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {openTasks.map(task => (
                  <Card key={task.id} className="bg-horizon-card border-horizon">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-horizon-text">{task.name}</p>
                          {task.notes && (
                            <p className="text-sm text-horizon-accent mt-1 line-clamp-2">{task.notes}</p>
                          )}
                          {task.end_date && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-horizon-accent">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.end_date), 'dd/MM/yyyy')}
                            </div>
                          )}
                        </div>
                        {getStatusBadge(task.status, task.end_date)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'cashflow':
        return (
          <div className="space-y-4 pb-20">
            <h2 className="text-xl font-bold text-horizon-text">תזרים מזומנים</h2>
            
            {/* סיכום */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-green-400">הכנסות</p>
                  <p className="font-bold text-green-400">{formatCurrency(cashflowSummary.credits)}</p>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-red-400">הוצאות</p>
                  <p className="font-bold text-red-400">{formatCurrency(cashflowSummary.debits)}</p>
                </CardContent>
              </Card>
              <Card className={cashflowSummary.balance >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-orange-500/10 border-orange-500/20'}>
                <CardContent className="p-3 text-center">
                  <p className={`text-xs ${cashflowSummary.balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>יתרה</p>
                  <p className={`font-bold ${cashflowSummary.balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                    {formatCurrency(cashflowSummary.balance)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* תנועות אחרונות */}
            <Card className="card-horizon">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-horizon-text">תנועות אחרונות</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingCashflow ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
                  </div>
                ) : cashflowData.length === 0 ? (
                  <p className="text-center py-4 text-horizon-accent text-sm">אין תנועות</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {cashflowData.slice(0, 15).map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 border-b border-horizon last:border-0"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-horizon-text truncate">{item.description || 'תנועה'}</p>
                          <p className="text-xs text-horizon-accent">{item.date}</p>
                        </div>
                        <span className={`font-semibold ${item.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                          {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'alerts':
        return (
          <div className="space-y-4 pb-20">
            <h2 className="text-xl font-bold text-horizon-text">התראות ({alerts.length})</h2>
            
            {alerts.length === 0 ? (
              <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400/50" />
                  <p className="text-horizon-accent">אין התראות</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <Card key={alert.id} className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-horizon-text">{alert.name}</p>
                          <p className="text-sm text-red-400 mt-1">
                            באיחור של {formatDistanceToNow(new Date(alert.end_date), { locale: he })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-horizon-dark" dir="rtl">
      {/* תוכן ראשי */}
      <div className="p-4">
        {renderContent()}
      </div>

      {/* ניווט תחתון */}
      <nav className="fixed bottom-0 left-0 right-0 bg-horizon-card border-t border-horizon safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasAlerts = item.id === 'alerts' && alerts.length > 0;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full relative ${
                  isActive ? 'text-horizon-primary' : 'text-horizon-accent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-horizon-primary' : ''}`} />
                <span className="text-xs mt-1">{item.label}</span>
                {hasAlerts && (
                  <span className="absolute top-2 right-[calc(50%-8px)] w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
