import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  LayoutGrid,
  ArrowRight,
  ArrowDown,
  Circle,
  Search,
  Filter,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

export default function TimelineToolbar({
  // פילטרים
  statusFilter = 'all',
  onStatusFilterChange,
  priorityFilter = 'all',
  onPriorityFilterChange,
  searchTerm = '',
  onSearchChange,
  
  // תצוגה
  layoutType = 'horizontal',
  onLayoutChange,
  
  // פעולות
  onAutoLayout,
  onExport,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleGroups,
  showGroups = true,
  isExporting = false,
  
  // סטטיסטיקות
  totalGoals = 0,
  visibleGoals = 0
}) {
  
  const layoutOptions = [
    { value: 'horizontal', label: 'אופקי', icon: ArrowRight },
    { value: 'vertical', label: 'אנכי', icon: ArrowDown },
    { value: 'hierarchical', label: 'היררכי', icon: LayoutGrid },
    { value: 'radial', label: 'מעגלי', icon: Circle }
  ];

  return (
    <div className="bg-horizon-card border-b-2 border-horizon p-4 space-y-4" dir="rtl">
      {/* שורה ראשונה - פילטרים וחיפוש */}
      <div className="flex flex-wrap items-center gap-3">
        {/* חיפוש */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="חפש יעד..."
            className="pr-10 bg-horizon-dark border-horizon text-horizon-text"
          />
        </div>

        {/* סינון סטטוס */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px] bg-horizon-dark border-horizon text-horizon-text">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <SelectValue placeholder="סטטוס" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-horizon-dark border-horizon">
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="open">פתוח</SelectItem>
            <SelectItem value="in_progress">בביצוע</SelectItem>
            <SelectItem value="done">הושלם</SelectItem>
            <SelectItem value="delayed">באיחור</SelectItem>
            <SelectItem value="cancelled">בוטל</SelectItem>
          </SelectContent>
        </Select>

        {/* סטטיסטיקות */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-horizon-primary/10 border border-horizon-primary/30 rounded-lg">
          <Badge variant="outline" className="border-horizon-primary text-horizon-primary">
            {visibleGoals} / {totalGoals} יעדים
          </Badge>
        </div>

        {/* מרווח */}
        <div className="flex-1 min-w-[20px]" />

        {/* כפתורי זום */}
        <div className="flex items-center gap-1 bg-horizon-dark border border-horizon rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            className="h-8 w-8 hover:bg-horizon-card"
            title="הקטן"
          >
            <ZoomOut className="w-4 h-4 text-horizon-accent" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            className="h-8 w-8 hover:bg-horizon-card"
            title="הגדל"
          >
            <ZoomIn className="w-4 h-4 text-horizon-accent" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onFitView}
            className="h-8 w-8 hover:bg-horizon-card"
            title="התאם למסך"
          >
            <Maximize className="w-4 h-4 text-horizon-accent" />
          </Button>
        </div>
      </div>

      {/* שורה שנייה - סידור ופעולות */}
      <div className="flex flex-wrap items-center gap-3">
        {/* בחירת סידור */}
        <Select value={layoutType} onValueChange={onLayoutChange}>
          <SelectTrigger className="w-[160px] bg-horizon-dark border-horizon text-horizon-text">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              <SelectValue placeholder="סידור" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-horizon-dark border-horizon">
            {layoutOptions.map(option => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* סדר מחדש */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAutoLayout}
          className="border-horizon text-horizon-text hover:bg-horizon-primary/10"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          סדר מחדש
        </Button>

        {/* הצג/הסתר קבוצות */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleGroups}
          className="border-horizon text-horizon-text hover:bg-horizon-primary/10"
        >
          {showGroups ? (
            <>
              <EyeOff className="w-4 h-4 ml-2" />
              הסתר קבוצות
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 ml-2" />
              הצג קבוצות
            </>
          )}
        </Button>

        {/* מרווח */}
        <div className="flex-1 min-w-[20px]" />

        {/* ייצוא */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          className="border-green-500 text-green-400 hover:bg-green-500/10 disabled:opacity-50"
        >
          <Download className="w-4 h-4 ml-2" />
          {isExporting ? 'מייצא...' : 'ייצא'}
        </Button>
      </div>
    </div>
  );
}