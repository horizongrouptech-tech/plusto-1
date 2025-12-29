import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Edit, 
  Eye, 
  Trash2, 
  CheckCircle, 
  Calendar,
  User,
  ArrowUpDown,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function GoalsListView({ 
  goals = [],
  onEdit,
  onView,
  onDelete,
  onMarkComplete,
  allUsers = []
}) {
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [sortBy, setSortBy] = useState('end_date');
  const [sortOrder, setSortOrder] = useState('asc');

  const statusConfig = {
    open: { badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: '📝', label: 'פתוח' },
    in_progress: { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: '🔄', label: 'בביצוע' },
    done: { badge: 'bg-green-500/20 text-green-300 border-green-500/30', icon: '✅', label: 'הושלם' },
    delayed: { badge: 'bg-red-500/20 text-red-300 border-red-500/30', icon: '⏰', label: 'באיחור' },
    cancelled: { badge: 'bg-gray-400/20 text-gray-400 border-gray-400/30', icon: '❌', label: 'בוטל' }
  };

  const priorityConfig = {
    high: { stars: '⭐⭐⭐', color: 'text-red-400' },
    medium: { stars: '⭐⭐', color: 'text-yellow-400' },
    low: { stars: '⭐', color: 'text-blue-400' }
  };

  const sortedGoals = [...goals].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'end_date' || sortBy === 'start_date') {
      aVal = new Date(aVal || 0);
      bVal = new Date(bVal || 0);
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectGoal = (goalId) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedGoals(
      selectedGoals.length === goals.length
        ? []
        : goals.map(g => g.id)
    );
  };

  const getAssignees = (goal) => {
    return goal.assigned_users?.map(email => 
      allUsers.find(u => u.email === email)
    ).filter(Boolean) || [];
  };

  return (
    <div className="space-y-4">
      {/* כלי עזר עליונים */}
      <div className="flex items-center justify-between bg-horizon-card border border-horizon rounded-xl p-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selectedGoals.length === goals.length && goals.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-horizon-text">
            {selectedGoals.length > 0 ? `${selectedGoals.length} נבחרו` : 'בחר הכל'}
          </span>
        </div>
        {selectedGoals.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8">
              <Trash2 className="w-3 h-3 ml-1" />
              מחק
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <CheckCircle className="w-3 h-3 ml-1" />
              סמן כהושלם
            </Button>
          </div>
        )}
        <Button variant="outline" size="sm" className="h-8">
          <Download className="w-3 h-3 ml-1" />
          ייצא לExcel
        </Button>
      </div>

      {/* טבלה */}
      <Card className="card-horizon overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-horizon-dark/50 border-b-2 border-horizon sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-right w-12">
                    <Checkbox
                      checked={selectedGoals.length === goals.length && goals.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-right">
                    <button
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-2 text-horizon-text font-bold hover:text-horizon-primary transition-colors"
                    >
                      שם היעד
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button
                      onClick={() => toggleSort('status')}
                      className="flex items-center gap-2 text-horizon-text font-bold hover:text-horizon-primary transition-colors"
                    >
                      סטטוס
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button
                      onClick={() => toggleSort('priority')}
                      className="flex items-center gap-2 text-horizon-text font-bold hover:text-horizon-primary transition-colors"
                    >
                      עדיפות
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="p-3 text-right">אחראים</th>
                  <th className="p-3 text-right">
                    <button
                      onClick={() => toggleSort('end_date')}
                      className="flex items-center gap-2 text-horizon-text font-bold hover:text-horizon-primary transition-colors"
                    >
                      תאריכים
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="p-3 text-right w-32">התקדמות</th>
                  <th className="p-3 text-right w-32">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {sortedGoals.map(goal => {
                  const config = statusConfig[goal.status] || statusConfig.open;
                  const priority = priorityConfig[goal.priority] || priorityConfig.medium;
                  const assignees = getAssignees(goal);
                  const progress = goal.status === 'done' ? 100 : goal.status === 'in_progress' ? 65 : 20;

                  return (
                    <tr 
                      key={goal.id}
                      className="border-b border-horizon hover:bg-horizon-dark/30 transition-colors"
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedGoals.includes(goal.id)}
                          onCheckedChange={() => toggleSelectGoal(goal.id)}
                        />
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => onView && onView(goal)}
                          className="text-right font-medium text-horizon-text hover:text-horizon-primary transition-colors"
                        >
                          {goal.name}
                        </button>
                      </td>
                      <td className="p-3">
                        <Badge className={`${config.badge} border text-xs`}>
                          {config.icon} {config.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className={`${priority.color}`}>
                          {priority.stars}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {assignees.slice(0, 2).map(user => (
                            <Badge 
                              key={user.email}
                              variant="outline"
                              className="text-[10px] bg-horizon-primary/10 border-horizon-primary/30"
                            >
                              {user.full_name?.split(' ')[0] || user.email.split('@')[0]}
                            </Badge>
                          ))}
                          {assignees.length > 2 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{assignees.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-xs text-horizon-accent">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {goal.start_date && format(new Date(goal.start_date), 'dd/MM', { locale: he })}
                            {goal.start_date && goal.end_date && ' - '}
                            {goal.end_date && format(new Date(goal.end_date), 'dd/MM/yy', { locale: he })}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-xs text-horizon-accent font-bold w-10">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView && onView(goal)}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit && onEdit(goal)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          {goal.status !== 'done' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onMarkComplete && onMarkComplete(goal)}
                              className="h-7 w-7 p-0 text-green-400"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}