import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export default function RecommendationFilters({ 
  categoryFilter, 
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  sourceFilter,
  setSourceFilter
}) {
  const hasActiveFilters = categoryFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || sourceFilter !== 'all';

  const clearFilters = () => {
    setCategoryFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSourceFilter('all');
  };

  return (
    <Card className="card-horizon mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-horizon-text">
            <Filter className="w-4 h-4 text-horizon-primary" />
            <span className="font-semibold">סינון המלצות:</span>
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 bg-horizon-card border-horizon text-horizon-text">
              <SelectValue placeholder="קטגוריה" />
            </SelectTrigger>
            <SelectContent className="bg-horizon-card border-horizon">
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              <SelectItem value="pricing">תמחור</SelectItem>
              <SelectItem value="bundles">בנדלים</SelectItem>
              <SelectItem value="promotions">מבצעים</SelectItem>
              <SelectItem value="suppliers">ספקים</SelectItem>
              <SelectItem value="inventory">מלאי</SelectItem>
              <SelectItem value="strategic_moves">מהלכים אסטרטגיים</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-horizon-card border-horizon text-horizon-text">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent className="bg-horizon-card border-horizon">
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="pending">ממתין</SelectItem>
              <SelectItem value="published_by_admin">פורסם</SelectItem>
              <SelectItem value="saved">נשמר</SelectItem>
              <SelectItem value="executed">בוצע</SelectItem>
              <SelectItem value="dismissed">נדחה</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32 bg-horizon-card border-horizon text-horizon-text">
              <SelectValue placeholder="עדיפות" />
            </SelectTrigger>
            <SelectContent className="bg-horizon-card border-horizon">
              <SelectItem value="all">כל העדיפויות</SelectItem>
              <SelectItem value="high">גבוהה</SelectItem>
              <SelectItem value="medium">בינונית</SelectItem>
              <SelectItem value="low">נמוכה</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40 bg-horizon-card border-horizon text-horizon-text">
              <SelectValue placeholder="מקור" />
            </SelectTrigger>
            <SelectContent className="bg-horizon-card border-horizon">
              <SelectItem value="all">כל המקורות</SelectItem>
              <SelectItem value="admin_generated">נוצר ע״י אדמין</SelectItem>
              <SelectItem value="whatsapp_request">בקשת לקוח</SelectItem>
              <SelectItem value="automatic_engine">מנוע אוטומטי</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-horizon-accent"
            >
              <X className="w-4 h-4 ml-2" />
              נקה סינונים
            </Button>
          )}

          {hasActiveFilters && (
            <Badge variant="secondary" className="bg-horizon-primary/20 text-horizon-primary">
              {Object.values({ categoryFilter, statusFilter, priorityFilter, sourceFilter }).filter(f => f !== 'all').length} פילטרים פעילים
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}