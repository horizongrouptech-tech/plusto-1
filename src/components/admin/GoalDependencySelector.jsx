import React, { useState } from 'react';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, X } from 'lucide-react';

import { toast } from "sonner";
import { CustomerGoal } from '@/api/entities';
export default function GoalDependencySelector({ goal, allGoals, refreshData }) {
  const [isUpdating, setIsUpdating] = useState(false);

  // רק יעדים ראשיים (לא תת-משימות) שאינם היעד הנוכחי
  const availableGoals = allGoals.filter(g => 
    !g.parent_id && 
    g.id !== goal.id &&
    g.is_active
  );

  const currentDependencies = goal.depends_on_goal_ids || [];

  const handleAddDependency = async (goalId) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const newDeps = [...currentDependencies, goalId];
      await CustomerGoal.update(goal.id, {
        depends_on_goal_ids: newDeps
      });
      await refreshData();
    } catch (error) {
      console.error('Error adding dependency:', error);
      toast.error('שגיאה בהוספת תלות');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveDependency = async (goalId) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const newDeps = currentDependencies.filter(id => id !== goalId);
      await CustomerGoal.update(goal.id, {
        depends_on_goal_ids: newDeps
      });
      await refreshData();
    } catch (error) {
      console.error('Error removing dependency:', error);
      toast.error('שגיאה בהסרת תלות');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-horizon-primary hover:bg-horizon-primary/10 h-7 min-w-0 max-w-full"
            disabled={isUpdating}
          >
            <Link2 className="w-4 h-4 ml-1 shrink-0" />
            <span className="truncate">
              {currentDependencies.length > 0 ? `תלוי ב-${currentDependencies.length} יעדים` : (
                <>
                  <span className="hidden sm:inline">שייך ליעד אחר</span>
                  <span className="sm:hidden">קשר</span>
                </>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-horizon-dark border-horizon p-3" dir="rtl">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-horizon-text">יעדים תלויים:</p>
            
            {currentDependencies.length > 0 && (
              <div className="space-y-1 mb-3">
                {currentDependencies.map(depId => {
                  const depGoal = allGoals.find(g => g.id === depId);
                  if (!depGoal) return null;
                  return (
                    <div key={depId} className="flex items-center justify-between bg-horizon-card/50 rounded px-2 py-1">
                      <span className="text-xs text-horizon-text truncate flex-1">{depGoal.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveDependency(depId)}
                        className="h-5 w-5 p-0 text-red-400"
                        disabled={isUpdating}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {availableGoals.filter(g => !currentDependencies.includes(g.id)).length > 0 ? (
              <Select onValueChange={handleAddDependency} disabled={isUpdating}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text h-8 text-xs">
                  <SelectValue placeholder="הוסף תלות ליעד..." />
                </SelectTrigger>
                <SelectContent className="bg-horizon-dark border-horizon">
                  {availableGoals
                    .filter(g => !currentDependencies.includes(g.id))
                    .map(g => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        {g.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-horizon-accent/70">אין יעדים נוספים זמינים</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {currentDependencies.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {currentDependencies.slice(0, 2).map(depId => {
            const depGoal = allGoals.find(g => g.id === depId);
            return depGoal ? (
              <Badge key={depId} variant="outline" className="text-xs border-horizon-primary/50 text-horizon-primary">
                {depGoal.name.substring(0, 20)}...
              </Badge>
            ) : null;
          })}
          {currentDependencies.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{currentDependencies.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}