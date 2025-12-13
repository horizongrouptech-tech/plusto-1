import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, CheckCircle, AlertTriangle } from "lucide-react";

export default function DataCompletenessGauge({ recommendation }) {
  const calculateCompleteness = () => {
    const totalPotentialPoints = 5; // לדוגמה: נתוני מלאי, מכירות, לקוחות, פיננסים, תפעול
    const gaps = recommendation.data_gaps || [];
    const completeness = Math.max(0, ((totalPotentialPoints - gaps.length) / totalPotentialPoints) * 100);
    return Math.round(completeness);
  };

  const getStatus = (completeness) => {
    if (completeness === 100) return { text: "נתונים מלאים", color: "bg-green-500", icon: <CheckCircle className="w-4 h-4" /> };
    if (completeness > 60) return { text: "נתונים טובים", color: "bg-yellow-500", icon: <Info className="w-4 h-4" /> };
    return { text: "חסר מידע קריטי", color: "bg-red-500", icon: <AlertTriangle className="w-4 h-4" /> };
  };

  const completeness = calculateCompleteness();
  const status = getStatus(completeness);
  const dataSources = recommendation.category ? [recommendation.category] : ['general'];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 relative cursor-pointer my-2">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${status.color}`}
              style={{ width: `${completeness}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white mix-blend-difference">{completeness}% השלמה</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-4 max-w-sm">
          <div className="space-y-3">
            <div className="font-bold flex items-center gap-2">{status.icon} {status.text}</div>
            <div className="text-xs">
              <p><strong>מקורות נתונים בשימוש:</strong></p>
              <div className="flex gap-1 mt-1">
                {dataSources.map(source => <Badge key={source} variant="secondary">{source}</Badge>)}
              </div>
            </div>
            {recommendation.data_gaps?.length > 0 && (
              <div className="text-xs border-t pt-2">
                <p><strong>מידע חסר לשיפור ההמלצה:</strong></p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  {recommendation.data_gaps.map((gap, index) => (
                    <li key={index}>{gap.missing_data}: {gap.why_needed}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}