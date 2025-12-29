import React, { useMemo } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Calendar } from 'lucide-react';

export default function GoalsGanttView({ goals = [], onTaskClick, onDateChange }) {
  const [viewMode, setViewMode] = React.useState(ViewMode.Month);

  const tasks = useMemo(() => {
    return goals
      .filter(goal => goal.start_date && goal.end_date)
      .map(goal => {
        const statusColors = {
          open: '#94A3B8',
          in_progress: '#3B82F6',
          done: '#10B981',
          delayed: '#EF4444',
          cancelled: '#6B7280'
        };

        return {
          id: goal.id,
          name: goal.name,
          start: new Date(goal.start_date),
          end: new Date(goal.end_date),
          progress: goal.status === 'done' ? 100 : goal.status === 'in_progress' ? 65 : 20,
          type: 'task',
          styles: {
            backgroundColor: statusColors[goal.status] || statusColors.open,
            backgroundSelectedColor: statusColors[goal.status] || statusColors.open,
            progressColor: '#32acc1',
            progressSelectedColor: '#32acc1'
          },
          dependencies: goal.depends_on_goal_id ? [goal.depends_on_goal_id] : [],
          project: goal.parent_id || undefined
        };
      });
  }, [goals]);

  if (tasks.length === 0) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
          <p className="text-horizon-text font-medium mb-1">אין יעדים עם תאריכים</p>
          <p className="text-sm text-horizon-accent">הוסף תאריכי התחלה וסיום ליעדים כדי להציג אותם בציר הזמן</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* בקרות תצוגה */}
      <div className="flex items-center justify-between bg-horizon-card border border-horizon rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-horizon-primary" />
          <span className="text-sm font-medium text-horizon-text">תצוגת Gantt</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === ViewMode.Day ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode(ViewMode.Day)}
            className="h-8 text-xs"
          >
            יום
          </Button>
          <Button
            variant={viewMode === ViewMode.Week ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode(ViewMode.Week)}
            className="h-8 text-xs"
          >
            שבוע
          </Button>
          <Button
            variant={viewMode === ViewMode.Month ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode(ViewMode.Month)}
            className="h-8 text-xs"
          >
            חודש
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card className="card-horizon overflow-hidden">
        <CardContent className="p-0">
          <div className="gantt-container" style={{ 
            height: '600px',
            direction: 'ltr',
            backgroundColor: 'var(--horizon-dark)'
          }}>
            <Gantt
              tasks={tasks}
              viewMode={viewMode}
              onClick={(task) => {
                const goal = goals.find(g => g.id === task.id);
                if (goal && onTaskClick) {
                  onTaskClick(goal);
                }
              }}
              onDateChange={(task, start, end) => {
                if (onDateChange) {
                  onDateChange(task.id, start, end);
                }
              }}
              locale="he"
              rtl={false}
              columnWidth={viewMode === ViewMode.Month ? 65 : viewMode === ViewMode.Week ? 250 : 60}
              listCellWidth="200px"
              barBackgroundColor="#32acc1"
              barBackgroundSelectedColor="#fc9f67"
              barProgressColor="#10B981"
              barProgressSelectedColor="#10B981"
              projectBackgroundColor="#32acc1"
              projectProgressColor="#10B981"
              projectProgressSelectedColor="#10B981"
              milestoneBackgroundColor="#fc9f67"
              milestoneBackgroundSelectedColor="#fc9f67"
              rowHeight={50}
              ganttHeight={600}
              fontSize="12px"
              fontFamily="Inter, Heebo, sans-serif"
              todayColor="rgba(252, 159, 103, 0.2)"
              TooltipContent={({ task }) => {
                const goal = goals.find(g => g.id === task.id);
                return (
                  <div className="bg-horizon-card border border-horizon rounded-lg p-3 shadow-xl" style={{ direction: 'rtl' }}>
                    <p className="font-bold text-horizon-text mb-1">{task.name}</p>
                    <p className="text-xs text-horizon-accent">
                      {task.start.toLocaleDateString('he-IL')} - {task.end.toLocaleDateString('he-IL')}
                    </p>
                    <p className="text-xs text-horizon-accent mt-1">
                      התקדמות: {task.progress}%
                    </p>
                    {goal?.notes && (
                      <p className="text-xs text-horizon-accent mt-2 pt-2 border-t border-horizon">
                        {goal.notes}
                      </p>
                    )}
                  </div>
                );
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* מקרא */}
      <Card className="card-horizon bg-gradient-to-r from-horizon-card to-horizon-dark/50">
        <CardContent className="p-4">
          <p className="text-xs text-horizon-accent font-bold mb-3 text-center">מקרא סטטוסים</p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 rounded" style={{ backgroundColor: '#94A3B8' }}></div>
              <span className="text-xs text-horizon-text">פתוח</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-xs text-horizon-text">בביצוע</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-xs text-horizon-text">הושלם</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
              <span className="text-xs text-horizon-text">באיחור</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 rounded" style={{ backgroundColor: '#6B7280' }}></div>
              <span className="text-xs text-horizon-text">בוטל</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}