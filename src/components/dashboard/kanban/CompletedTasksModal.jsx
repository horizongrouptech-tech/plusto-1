import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Search, Calendar, User, Target, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function CompletedTasksModal({ isOpen, onClose, completedTasks, allCustomers, allGoals, onRestoreTask }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredTasks = useMemo(() => {
    let filtered = completedTasks.filter(task => {
      const matchesSearch = task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // סינון לפי תאריך
    if (dateFilter === 'today') {
      filtered = filtered.filter(task => {
        if (!task.updated_date) return false;
        const taskDate = new Date(task.updated_date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(task => {
        if (!task.updated_date) return false;
        const taskDate = new Date(task.updated_date);
        return taskDate >= weekAgo && taskDate <= today;
      });
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      filtered = filtered.filter(task => {
        if (!task.updated_date) return false;
        const taskDate = new Date(task.updated_date);
        return taskDate >= monthAgo && taskDate <= today;
      });
    }

    return filtered;
  }, [completedTasks, searchTerm, dateFilter, today]);

  const stats = useMemo(() => {
    const todayCompleted = completedTasks.filter(task => {
      if (!task.updated_date) return false;
      const taskDate = new Date(task.updated_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    }).length;

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCompleted = completedTasks.filter(task => {
      if (!task.updated_date) return false;
      const taskDate = new Date(task.updated_date);
      return taskDate >= weekAgo;
    }).length;

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthCompleted = completedTasks.filter(task => {
      if (!task.updated_date) return false;
      const taskDate = new Date(task.updated_date);
      return taskDate >= monthAgo;
    }).length;

    return { todayCompleted, weekCompleted, monthCompleted };
  }, [completedTasks, today]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            משימות שהושלמו ({completedTasks.length})
          </DialogTitle>
        </DialogHeader>

        {/* סטטיסטיקות */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="card-horizon">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.todayCompleted}</div>
              <div className="text-xs text-horizon-accent">הושלמו היום</div>
            </CardContent>
          </Card>
          <Card className="card-horizon">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.weekCompleted}</div>
              <div className="text-xs text-horizon-accent">הושלמו השבוע</div>
            </CardContent>
          </Card>
          <Card className="card-horizon">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.monthCompleted}</div>
              <div className="text-xs text-horizon-accent">הושלמו החודש</div>
            </CardContent>
          </Card>
        </div>

        {/* פילטרים */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 w-4 h-4 text-horizon-accent" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש משימה או לקוח..."
              className="pr-10 bg-horizon-card border-horizon text-horizon-text"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={dateFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setDateFilter('all')}
              className={dateFilter === 'all' ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}
            >
              הכל
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'today' ? 'default' : 'outline'}
              onClick={() => setDateFilter('today')}
              className={dateFilter === 'today' ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}
            >
              היום
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'week' ? 'default' : 'outline'}
              onClick={() => setDateFilter('week')}
              className={dateFilter === 'week' ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}
            >
              שבוע
            </Button>
            <Button
              size="sm"
              variant={dateFilter === 'month' ? 'default' : 'outline'}
              onClick={() => setDateFilter('month')}
              className={dateFilter === 'month' ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}
            >
              חודש
            </Button>
          </div>
        </div>

        {/* רשימת משימות */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-horizon-accent">לא נמצאו משימות בסינון הנוכחי</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const customer = allCustomers.find(c => c.email === task.customer_email);
              const parentGoal = task.parent_id ? allGoals.find(g => g.id === task.parent_id) : null;

              return (
                <div
                  key={task.id}
                  className="bg-horizon-card/30 p-4 rounded-lg border border-horizon hover:border-green-500/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-horizon-text mb-1">{task.name}</h4>
                      {task.notes && (
                        <p className="text-sm text-horizon-accent mb-2">{task.notes}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {customer && (
                          <Badge className={getCustomerGroupBadgeColor(customer.customer_group)}>
                            {customer.business_name || customer.full_name}
                          </Badge>
                        )}
                        {task.assignee_email && (
                          <Badge variant="outline" className="border-horizon text-horizon-accent">
                            <User className="w-3 h-3 ml-1" />
                            {task.assignee_email}
                          </Badge>
                        )}
                        {task.updated_date && (
                          <Badge variant="outline" className="border-green-500 text-green-400">
                            <CheckCircle2 className="w-3 h-3 ml-1" />
                            {format(new Date(task.updated_date), 'dd/MM HH:mm', { locale: he })}
                          </Badge>
                        )}
                        {parentGoal && (
                          <Badge variant="outline" className="border-purple-500 text-purple-400">
                            <Target className="w-3 h-3 ml-1" />
                            {parentGoal.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRestoreTask(task.id)}
                      className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}