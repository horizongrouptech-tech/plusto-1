import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, AlertCircle } from 'lucide-react';

export default function GoalDependenciesSelector({ 
  goals = [], 
  currentGoalId = null,
  selectedDependencies = [],
  onChange 
}) {
  // סינון יעדים - לא להציג את היעד הנוכחי או יעדים שתלויים בו
  const availableGoals = goals.filter(g => {
    // לא להציג את היעד הנוכחי
    if (currentGoalId && g.id === currentGoalId) return false;
    
    // לא להציג יעדים שכבר תלויים ביעד הנוכחי (למנוע מעגליות)
    if (currentGoalId && g.depends_on_goal_ids?.includes(currentGoalId)) return false;
    
    return true;
  });

  const handleToggle = (goalId) => {
    const newDependencies = selectedDependencies.includes(goalId)
      ? selectedDependencies.filter(id => id !== goalId)
      : [...selectedDependencies, goalId];
    
    onChange(newDependencies);
  };

  const getGoalStatus = (goal) => {
    const statusColors = {
      done: 'bg-green-500/20 text-green-400 border-green-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      open: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      delayed: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };

    const statusLabels = {
      done: 'הושלם',
      in_progress: 'בביצוע',
      open: 'פתוח',
      delayed: 'באיחור',
      cancelled: 'בוטל'
    };

    return {
      color: statusColors[goal.status] || statusColors.open,
      label: statusLabels[goal.status] || goal.status
    };
  };

  if (availableGoals.length === 0) {
    return (
      <div className="text-center py-6 text-horizon-accent">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">אין יעדים זמינים להגדרת תלות</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-horizon-accent">
        <Link2 className="w-4 h-4 text-horizon-primary" />
        <Label className="text-sm">יעדים שהיעד תלוי בהם</Label>
      </div>
      
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
        <p className="text-xs text-blue-300">
          💡 <strong>תלות ביעדים:</strong> היעד הנוכחי לא יתחיל עד שכל היעדים שנבחרו כאן יושלמו.
          ניתן לבחור יותר מיעד אחד.
        </p>
      </div>

      <ScrollArea className="h-[250px] border border-horizon rounded-lg p-3 bg-horizon-card/30">
        <div className="space-y-2">
          {availableGoals.map(goal => {
            const isSelected = selectedDependencies.includes(goal.id);
            const status = getGoalStatus(goal);

            return (
              <div
                key={goal.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-horizon-primary/10 border-horizon-primary' 
                    : 'bg-horizon-card border-horizon hover:border-horizon-primary/50'
                }`}
                onClick={() => handleToggle(goal.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(goal.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-horizon-text text-sm">{goal.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge className={`text-xs ${status.color}`}>
                      {status.label}
                    </Badge>
                    {goal.end_date && (
                      <Badge variant="outline" className="text-xs text-horizon-accent border-horizon">
                        {new Date(goal.end_date).toLocaleDateString('he-IL')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {selectedDependencies.length > 0 && (
        <div className="bg-horizon-primary/10 border border-horizon-primary/30 rounded-lg p-3">
          <p className="text-xs text-horizon-primary">
            ✓ היעד יתחיל רק אחרי שהושלמו {selectedDependencies.length} יעד/ים
          </p>
        </div>
      )}
    </div>
  );
}