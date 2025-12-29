import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Calendar, Target, Loader2, LayoutGrid, List, BarChart3 } from 'lucide-react';

// תצוגות
import GoalsGanttView from './GoalsGanttView';
import GoalsKanbanView from './GoalsKanbanView';
import GoalsListView from './GoalsListView';
import GoalFilters from './GoalFilters';
import GoalStats from './GoalStats';



export default function GoalsTimeline({ customer, onGoalClick }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('gantt'); // gantt, kanban, list
  
  // פילטרים
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // טעינת יעדים
  const { data: allGoals = [], isLoading } = useQuery({
    queryKey: ['customerGoals', customer?.email],
    queryFn: () => base44.entities.CustomerGoal.filter({
      customer_email: customer.email,
      is_active: true
    }, 'end_date'),
    enabled: !!customer?.email
  });

  // טעינת משתמשים
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  // סינון יעדים
  const goals = useMemo(() => {
    return allGoals.filter(goal => {
      // חיפוש
      if (searchTerm && !goal.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // סטטוס
      if (statusFilter !== 'all' && goal.status !== statusFilter) {
        return false;
      }
      // עדיפות
      if (priorityFilter !== 'all' && goal.priority !== priorityFilter) {
        return false;
      }
      // אחראי
      if (assigneeFilter !== 'all' && !goal.assigned_users?.includes(assigneeFilter)) {
        return false;
      }
      return true;
    });
  }, [allGoals, searchTerm, statusFilter, priorityFilter, assigneeFilter]);

  // Mutations
  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, data }) => base44.entities.CustomerGoal.update(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customerGoals', customer.email]);
    }
  });

  const handleStatusChange = async (goalId, newStatus) => {
    await updateGoalMutation.mutateAsync({
      goalId,
      data: { status: newStatus }
    });
  };

  const handleDateChange = async (goalId, startDate, endDate) => {
    await updateGoalMutation.mutateAsync({
      goalId,
      data: { 
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }
    });
  };

  const handleMarkComplete = async (goal) => {
    await updateGoalMutation.mutateAsync({
      goalId: goal.id,
      data: { status: 'done' }
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  if (allGoals.length === 0) {
    return (
      <Card className="card-horizon">
        <div className="p-12 text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
          <p className="text-horizon-text font-medium mb-2">אין יעדים להצגה</p>
          <p className="text-sm text-horizon-accent">צור יעד ראשון כדי להתחיל לעבוד עם ניהול היעדים</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת וכפתורי תצוגה */}
      <Card className="card-horizon">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-horizon-primary to-horizon-secondary rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-horizon-text">ניהול יעדים</CardTitle>
                <p className="text-sm text-horizon-accent mt-1">
                  {goals.length} {goals.length === 1 ? 'יעד' : 'יעדים'} מתוך {allGoals.length} כולל
                </p>
              </div>
            </div>
            
            {/* כפתורי החלפת תצוגות */}
            <div className="flex gap-2 bg-horizon-dark/50 p-1 rounded-xl border border-horizon">
              <Button
                variant={viewMode === 'gantt' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('gantt')}
                className={`gap-2 ${viewMode === 'gantt' ? 'bg-horizon-primary' : ''}`}
              >
                <BarChart3 className="w-4 h-4" />
                Gantt
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={`gap-2 ${viewMode === 'kanban' ? 'bg-horizon-primary' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
                קנבן
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`gap-2 ${viewMode === 'list' ? 'bg-horizon-primary' : ''}`}
              >
                <List className="w-4 h-4" />
                רשימה
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* סטטיסטיקות */}
      <GoalStats goals={allGoals} />

      {/* פילטרים */}
      <GoalFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        allUsers={allUsers}
        onClearFilters={clearFilters}
      />

      {/* תצוגות דינמיות */}
      {viewMode === 'gantt' && (
        <GoalsGanttView
          goals={goals}
          onTaskClick={onGoalClick}
          onDateChange={handleDateChange}
        />
      )}

      {viewMode === 'kanban' && (
        <GoalsKanbanView
          goals={goals}
          onStatusChange={handleStatusChange}
          onEdit={onGoalClick}
          onView={onGoalClick}
          onMarkComplete={handleMarkComplete}
          allUsers={allUsers}
        />
      )}

      {viewMode === 'list' && (
        <GoalsListView
          goals={goals}
          onEdit={onGoalClick}
          onView={onGoalClick}
          onMarkComplete={handleMarkComplete}
          allUsers={allUsers}
        />
      )}
    </div>
  );
}