import React, { useState, useMemo, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar,
  Award,
  Target,
  Loader2,
  RefreshCw,
  BarChart3,
  Trophy,
  FlaskConical
} from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function FinanceManagerPerformanceTable() {
  const [activeView, setActiveView] = useState('performance');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  const queryClient = useQueryClient();

  const { data: performanceData = [], isLoading, refetch } = useQuery({
    queryKey: ['financeManagerPerformance'],
    queryFn: () => base44.entities.FinancialManagerPerformance.filter({}, '-manager_score'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allManagers = [], refetch: refetchManagers } = useQuery({
    queryKey: ['allFinancialManagers'],
    queryFn: () => base44.entities.User.filter({ 
      user_type: 'financial_manager',
      is_active: true 
    }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allOnboardingRequests = [], refetch: refetchOnboarding } = useQuery({
    queryKey: ['allOnboardingRequests'],
    queryFn: () => base44.entities.OnboardingRequest.filter({ 
      status: 'approved',
      is_active: true 
    }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // חישוב לקוחות משויכים לכל מנהל
  const managersWithClients = useMemo(() => {
    return allManagers.map(manager => {
      const assignedClients = allOnboardingRequests.filter(
        req => req.assigned_financial_manager_email === manager.email
      );
      
      const performance = performanceData.find(p => p.manager_email === manager.email);
      
      return {
        ...manager,
        assignedClientsCount: assignedClients.length,
        performance: performance || {
          manager_score: 0,
          active_clients_count: 0,
          quality_recommendations_count: 0,
          estimated_client_profit: 0,
          last_system_login: null
        }
      };
    });
  }, [allManagers, allOnboardingRequests, performanceData]);

  // טבלת מובילים - מנהלים ממוינים לפי ציון
  const leaderboard = useMemo(() => {
    return [...managersWithClients]
      .sort((a, b) => (b.performance.manager_score || 0) - (a.performance.manager_score || 0))
      .slice(0, 10);
  }, [managersWithClients]);

  const handleCalculatePerformance = async () => {
    setIsCalculating(true);
    try {
      console.log('🔄 Starting performance calculation...');
      
      // קריאה לפונקציה ו-AWAIT לסיום
      const response = await base44.functions.invoke('calculateManagerPerformance');
      
      console.log('✅ Performance calculation response:', response);
      console.log('📊 Response data:', response.data);
      
      // בדיקת תוצאה
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'שגיאה לא ידועה');
      }
      
      console.log(`✨ Updated ${response.data.updated_count} manager performance records`);
      
      // המתנה של 2 שניות לפני refetch - כדי לתת למערכת זמן לעדכן
      console.log('⏳ Waiting 2 seconds before refresh...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // ניקוי קאש ורענון כל הנתונים
      console.log('🔄 Invalidating queries and refetching...');
      queryClient.invalidateQueries({ queryKey: ['financeManagerPerformance'] });
      queryClient.invalidateQueries({ queryKey: ['allFinancialManagers'] });
      queryClient.invalidateQueries({ queryKey: ['allOnboardingRequests'] });
      
      // רענון מפורש של כל ה-queries
      await Promise.all([
        refetch(),
        refetchManagers(),
        refetchOnboarding()
      ]);
      
      console.log('✅ All data refreshed successfully');
      
      // הצגת הודעת הצלחה
      alert(`✅ חישוב ביצועים הושלם בהצלחה!\n\n${response.data.updated_count} מנהלים עודכנו`);
      
    } catch (error) {
      console.error("❌ Error calculating performance:", error);
      console.error("Error details:", error.response?.data);
      alert("❌ שגיאה בחישוב ביצועים:\n\n" + (error.response?.data?.error || error.message));
    } finally {
      setIsCalculating(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { label: 'מצוין', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    if (score >= 60) return { label: 'טוב', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    if (score >= 40) return { label: 'בינוני', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    return { label: 'נמוך', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת וכפתורי פעולה */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-horizon-text">ביצועי מנהלי כספים</h2>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
            asChild
          >
            <a href={createPageUrl('TrialDashboard')}>
              <FlaskConical className="w-4 h-4 ml-2" />
              דף ניסיון
            </a>
          </Button>
          <Button
            onClick={handleCalculatePerformance}
            disabled={isCalculating}
            className="btn-horizon-primary"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מחשב...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 ml-2" />
                חשב מחדש
              </>
            )}
          </Button>
        </div>
      </div>

      {/* סטטיסטיקות כלליות */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-horizon border-l-4 border-l-horizon-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-horizon-accent mb-1">סה"כ מנהלים</p>
                <p className="text-2xl font-bold text-horizon-text">{allManagers.length}</p>
              </div>
              <Users className="w-8 h-8 text-horizon-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-horizon-accent mb-1">סה"כ לקוחות</p>
                <p className="text-2xl font-bold text-horizon-text">{allOnboardingRequests.length}</p>
              </div>
              <Target className="w-8 h-8 text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-horizon-accent mb-1">ממוצע לקוחות למנהל</p>
                <p className="text-2xl font-bold text-horizon-text">
                  {allManagers.length > 0 ? (allOnboardingRequests.length / allManagers.length).toFixed(1) : 0}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-horizon-accent mb-1">ציון ממוצע</p>
                <p className="text-2xl font-bold text-horizon-text">
                  {managersWithClients.length > 0 
                    ? (managersWithClients.reduce((sum, m) => sum + (m.performance.manager_score || 0), 0) / managersWithClients.length).toFixed(0)
                    : 0}
                </p>
              </div>
              <Award className="w-8 h-8 text-yellow-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* בחירת תצוגה */}
      <div className="flex gap-2 border-b border-horizon pb-2">
        <Button
          variant={activeView === 'performance' ? 'default' : 'ghost'}
          onClick={() => startTransition(() => setActiveView('performance'))}
          className={activeView === 'performance' ? 'btn-horizon-primary' : 'text-horizon-text hover:bg-horizon-card'}
          disabled={isPending}
        >
          <BarChart3 className="w-4 h-4 ml-2" />
          טבלת ביצועים
        </Button>
        <Button
          variant={activeView === 'leaderboard' ? 'default' : 'ghost'}
          onClick={() => startTransition(() => setActiveView('leaderboard'))}
          className={activeView === 'leaderboard' ? 'btn-horizon-primary' : 'text-horizon-text hover:bg-horizon-card'}
          disabled={isPending}
        >
          <Trophy className="w-4 h-4 ml-2" />
          טבלת מובילים
        </Button>
      </div>

      {/* תצוגת טבלת ביצועים */}
      {activeView === 'performance' && (
        <Card className="card-horizon">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-horizon">
                  <tr className="text-right">
                    <th className="p-4 text-sm font-semibold text-horizon-accent">מנהל</th>
                    <th className="p-4 text-sm font-semibold text-horizon-accent text-center">לקוחות משויכים</th>
                    <th className="p-4 text-sm font-semibold text-horizon-accent text-center">המלצות איכותיות</th>
                    <th className="p-4 text-sm font-semibold text-horizon-accent text-center">רווח פוטנציאלי</th>
                    <th className="p-4 text-sm font-semibold text-horizon-accent text-center">פעילות אחרונה</th>
                    <th className="p-4 text-sm font-semibold text-horizon-accent text-center">ציון</th>
                  </tr>
                </thead>
                <tbody>
                  {managersWithClients.map((manager, index) => {
                    const scoreBadge = getScoreBadge(manager.performance.manager_score || 0);
                    return (
                      <tr 
                        key={manager.id} 
                        className="border-b border-horizon/30 hover:bg-horizon-card/30 transition-colors"
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-horizon-text">{manager.full_name}</p>
                            <p className="text-sm text-horizon-accent">{manager.email}</p>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Users className="w-4 h-4 text-horizon-accent" />
                            <span className="font-semibold text-horizon-text">{manager.assignedClientsCount}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-horizon-text">
                            {manager.performance.quality_recommendations_count || 0}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-green-400">
                            ₪{(manager.performance.estimated_client_profit || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="w-4 h-4 text-horizon-accent" />
                            <span className="text-sm text-horizon-accent">
                              {manager.performance.last_system_login
                                ? format(new Date(manager.performance.last_system_login), 'dd/MM/yy')
                                : 'לא ידוע'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-2xl font-bold ${getScoreColor(manager.performance.manager_score || 0)}`}>
                              {manager.performance.manager_score || 0}
                            </span>
                            <Badge className={`${scoreBadge.color} text-xs`}>
                              {scoreBadge.label}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {managersWithClients.length === 0 && (
              <div className="text-center py-12 text-horizon-accent">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>אין מנהלי כספים במערכת</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* תצוגת טבלת מובילים */}
      {activeView === 'leaderboard' && (
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              10 המנהלים המובילים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 p-4">
              {leaderboard.map((manager, index) => {
                const scoreBadge = getScoreBadge(manager.performance.manager_score || 0);
                const medalColors = ['text-yellow-400', 'text-gray-400', 'text-orange-400'];
                
                return (
                  <div
                    key={manager.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-horizon-card/50 hover:bg-horizon-card transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* מיקום */}
                      <div className={`text-2xl font-bold w-8 text-center ${index < 3 ? medalColors[index] : 'text-horizon-accent'}`}>
                        {index < 3 ? '🏆' : `#${index + 1}`}
                      </div>

                      {/* פרטי מנהל */}
                      <div className="flex-1">
                        <p className="font-semibold text-horizon-text">{manager.full_name}</p>
                        <p className="text-sm text-horizon-accent">{manager.email}</p>
                      </div>

                      {/* סטטיסטיקות */}
                      <div className="flex gap-6 text-center">
                        <div>
                          <p className="text-xs text-horizon-accent mb-1">לקוחות</p>
                          <p className="font-bold text-horizon-text">{manager.assignedClientsCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-horizon-accent mb-1">המלצות</p>
                          <p className="font-bold text-horizon-text">{manager.performance.quality_recommendations_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-horizon-accent mb-1">רווח</p>
                          <p className="font-bold text-green-400">
                            ₪{((manager.performance.estimated_client_profit || 0) / 1000).toFixed(0)}K
                          </p>
                        </div>
                      </div>

                      {/* ציון */}
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="text-xs text-horizon-accent mb-1">ציון</p>
                          <p className={`text-3xl font-bold ${getScoreColor(manager.performance.manager_score || 0)}`}>
                            {manager.performance.manager_score || 0}
                          </p>
                        </div>
                        <Badge className={`${scoreBadge.color}`}>
                          {scoreBadge.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {leaderboard.length === 0 && (
              <div className="text-center py-12 text-horizon-accent">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>אין נתוני ביצועים זמינים</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}