import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Edit, Eye, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Progress } from "@/components/ui/progress";

export default function GoalCard({ 
  goal, 
  onEdit, 
  onView, 
  onDelete, 
  onMarkComplete,
  allUsers = []
}) {
  const statusConfig = {
    open: {
      badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      icon: '📝',
      label: 'פתוח'
    },
    in_progress: {
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: '🔄',
      label: 'בביצוע'
    },
    done: {
      badge: 'bg-green-500/20 text-green-300 border-green-500/30',
      icon: '✅',
      label: 'הושלם'
    },
    delayed: {
      badge: 'bg-red-500/20 text-red-300 border-red-500/30',
      icon: '⏰',
      label: 'באיחור'
    },
    cancelled: {
      badge: 'bg-gray-400/20 text-gray-400 border-gray-400/30',
      icon: '❌',
      label: 'בוטל'
    }
  };

  const priorityConfig = {
    high: { stars: '⭐⭐⭐', color: 'text-red-400' },
    medium: { stars: '⭐⭐', color: 'text-yellow-400' },
    low: { stars: '⭐', color: 'text-blue-400' }
  };

  const config = statusConfig[goal.status] || statusConfig.open;
  const priority = priorityConfig[goal.priority] || priorityConfig.medium;

  // חישוב התקדמות (אם יש תת-משימות נשתמש בזה, אחרת לפי סטטוס)
  const progress = goal.status === 'done' ? 100 : goal.status === 'in_progress' ? 65 : 20;

  const assignees = goal.assigned_users?.map(email => 
    allUsers.find(u => u.email === email)
  ).filter(Boolean) || [];

  return (
    <Card className="card-horizon hover:border-horizon-primary transition-all group">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${config.badge} border text-xs`}>
                  {config.icon} {config.label}
                </Badge>
                {goal.priority && (
                  <span className={`text-sm ${priority.color}`}>
                    {priority.stars}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-horizon-text break-words leading-tight">
                {goal.name}
              </h3>
            </div>
          </div>

          {/* התקדמות */}
          <div>
            <div className="flex items-center justify-between text-xs text-horizon-accent mb-1">
              <span>התקדמות</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* תאריכים */}
          {goal.end_date && (
            <div className="flex items-center gap-2 text-xs text-horizon-accent">
              <Calendar className="w-3 h-3" />
              <span>
                {goal.start_date && format(new Date(goal.start_date), 'dd/MM', { locale: he })} 
                {goal.start_date && ' - '}
                {format(new Date(goal.end_date), 'dd/MM/yy', { locale: he })}
              </span>
            </div>
          )}

          {/* אחראים */}
          {assignees.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-3 h-3 text-horizon-accent" />
              <div className="flex gap-1 flex-wrap">
                {assignees.slice(0, 2).map(user => (
                  <Badge 
                    key={user.email}
                    variant="outline" 
                    className="text-[10px] bg-horizon-primary/10 border-horizon-primary/30"
                  >
                    {user.full_name || user.email.split('@')[0]}
                  </Badge>
                ))}
                {assignees.length > 2 && (
                  <Badge variant="outline" className="text-[10px] bg-horizon-dark border-horizon">
                    +{assignees.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* תיאור קצר */}
          {goal.notes && (
            <p className="text-xs text-horizon-accent line-clamp-2">
              {goal.notes}
            </p>
          )}

          {/* פעולות */}
          <div className="flex gap-2 pt-2 border-t border-horizon opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView && onView(goal)}
              className="flex-1 h-8 text-xs"
            >
              <Eye className="w-3 h-3 ml-1" />
              הצג
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit && onEdit(goal)}
              className="flex-1 h-8 text-xs"
            >
              <Edit className="w-3 h-3 ml-1" />
              ערוך
            </Button>
            {goal.status !== 'done' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkComplete && onMarkComplete(goal)}
                className="flex-1 h-8 text-xs text-green-400 hover:text-green-300"
              >
                <CheckCircle className="w-3 h-3 ml-1" />
                סיים
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}