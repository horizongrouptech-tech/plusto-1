import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Target, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function GoalStats({ goals = [] }) {
  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter(g => g.status === 'done').length;
    const inProgress = goals.filter(g => g.status === 'in_progress').length;
    const delayed = goals.filter(g => g.status === 'delayed').length;
    const open = goals.filter(g => g.status === 'open').length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // חישוב ממוצע ימים נותרים
    const goalsWithDates = goals.filter(g => g.end_date && g.status !== 'done' && g.status !== 'cancelled');
    const avgDaysRemaining = goalsWithDates.length > 0
      ? Math.round(
          goalsWithDates.reduce((sum, g) => {
            const days = differenceInDays(new Date(g.end_date), new Date());
            return sum + days;
          }, 0) / goalsWithDates.length
        )
      : 0;

    return {
      total,
      completed,
      inProgress,
      delayed,
      open,
      completionRate,
      avgDaysRemaining
    };
  }, [goals]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* סה"כ יעדים */}
      <Card className="bg-gradient-to-br from-horizon-primary/10 to-transparent border-horizon-primary/30 hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-horizon-accent mb-1">סה"כ יעדים</p>
              <p className="text-2xl font-bold text-horizon-text">{stats.total}</p>
            </div>
            <Target className="w-8 h-8 text-horizon-primary opacity-60" />
          </div>
        </CardContent>
      </Card>

      {/* הושלמו */}
      <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30 hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-300 mb-1">הושלמו</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500 opacity-60" />
          </div>
        </CardContent>
      </Card>

      {/* בביצוע */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30 hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-300 mb-1">בביצוע</p>
              <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500 opacity-60" />
          </div>
        </CardContent>
      </Card>

      {/* באיחור */}
      <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/30 hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-300 mb-1">באיחור</p>
              <p className="text-2xl font-bold text-red-400">{stats.delayed}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500 opacity-60" />
          </div>
        </CardContent>
      </Card>

      {/* אחוז התקדמות */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30 hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-300 mb-1">התקדמות</p>
              <p className="text-2xl font-bold text-purple-400">{stats.completionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500 opacity-60" />
          </div>
        </CardContent>
      </Card>

      {/* ממוצע ימים נותרים */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/30 hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-300 mb-1">ממוצע ימים</p>
              <p className="text-2xl font-bold text-orange-400">{stats.avgDaysRemaining}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500 opacity-60" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}