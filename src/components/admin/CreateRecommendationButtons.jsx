import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Sparkles, Target, Trophy, Edit3 } from "lucide-react";

export default function CreateRecommendationButtons({ 
  onCreateSystemRecommendations,
  onCreateTargeted, 
  onCreateGoalOriented,
  onCreateManual,
  isGenerating 
}) {
  return (
    <div className="mb-6">
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button 
            disabled={isGenerating}
            className="btn-horizon-primary h-12 px-6 text-base"
          >
            <Plus className="w-5 h-5 ml-2" />
            צור המלצות
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-horizon-dark border-horizon w-64" align="start" dir="rtl">
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onCreateSystemRecommendations?.();
            }}
            className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer py-3 px-4"
          >
            <Sparkles className="w-5 h-5 ml-3 text-blue-400" />
            <div className="flex flex-col items-start">
              <span className="font-semibold">המלצות מערכת</span>
              <span className="text-xs text-horizon-accent">1-2 מכל סוג אוטומטית</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onCreateTargeted?.();
            }}
            className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer py-3 px-4"
          >
            <Target className="w-5 h-5 ml-3 text-purple-400" />
            <div className="flex flex-col items-start">
              <span className="font-semibold">המלצה ממוקדת מוצר</span>
              <span className="text-xs text-horizon-accent">המלצה למכירת מוצר ספציפי</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onCreateGoalOriented?.();
            }}
            className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer py-3 px-4"
          >
            <Trophy className="w-5 h-5 ml-3 text-yellow-400" />
            <div className="flex flex-col items-start">
              <span className="font-semibold">המלצה ממוקדת הישג נדרש</span>
              <span className="text-xs text-horizon-accent">המלצה להשגת יעד עסקי</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onCreateManual?.();
            }}
            className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer py-3 px-4"
          >
            <Edit3 className="w-5 h-5 ml-3 text-green-400" />
            <div className="flex flex-col items-start">
              <span className="font-semibold">צור המלצה ידנית</span>
              <span className="text-xs text-horizon-accent">כתיבה ידנית מלאה</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
