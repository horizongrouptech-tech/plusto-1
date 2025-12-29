import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from 'lucide-react';

export default function GoalFilters({ 
  searchTerm, 
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  allUsers = [],
  onClearFilters
}) {
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all';

  return (
    <div className="bg-horizon-card border border-horizon rounded-xl p-4 shadow-md">
      <div className="flex flex-wrap items-center gap-3">
        {/* חיפוש */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
          <Input
            placeholder="🔍 חפש יעד..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10 bg-horizon-dark border-horizon text-horizon-text"
          />
        </div>

        {/* סינון לפי סטטוס */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px] bg-horizon-dark border-horizon text-horizon-text">
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent className="bg-horizon-dark border-horizon">
            <SelectItem value="all" className="text-horizon-text">כל הסטטוסים</SelectItem>
            <SelectItem value="open" className="text-horizon-text">📝 פתוח</SelectItem>
            <SelectItem value="in_progress" className="text-horizon-text">🔄 בביצוע</SelectItem>
            <SelectItem value="done" className="text-horizon-text">✅ הושלם</SelectItem>
            <SelectItem value="delayed" className="text-horizon-text">⏰ באיחור</SelectItem>
            <SelectItem value="cancelled" className="text-horizon-text">❌ בוטל</SelectItem>
          </SelectContent>
        </Select>

        {/* סינון לפי עדיפות */}
        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
          <SelectTrigger className="w-[140px] bg-horizon-dark border-horizon text-horizon-text">
            <SelectValue placeholder="עדיפות" />
          </SelectTrigger>
          <SelectContent className="bg-horizon-dark border-horizon">
            <SelectItem value="all" className="text-horizon-text">כל העדיפויות</SelectItem>
            <SelectItem value="high" className="text-horizon-text">⭐⭐⭐ גבוהה</SelectItem>
            <SelectItem value="medium" className="text-horizon-text">⭐⭐ בינונית</SelectItem>
            <SelectItem value="low" className="text-horizon-text">⭐ נמוכה</SelectItem>
          </SelectContent>
        </Select>

        {/* סינון לפי אחראי */}
        <Select value={assigneeFilter} onValueChange={onAssigneeFilterChange}>
          <SelectTrigger className="w-[160px] bg-horizon-dark border-horizon text-horizon-text">
            <SelectValue placeholder="אחראי" />
          </SelectTrigger>
          <SelectContent className="bg-horizon-dark border-horizon">
            <SelectItem value="all" className="text-horizon-text">כל האחראים</SelectItem>
            {allUsers.map(user => (
              <SelectItem key={user.email} value={user.email} className="text-horizon-text">
                👤 {user.full_name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* איפוס פילטרים */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-horizon-accent hover:text-horizon-text hover:bg-horizon-dark"
          >
            <X className="w-4 h-4 ml-1" />
            נקה
          </Button>
        )}
      </div>
    </div>
  );
}