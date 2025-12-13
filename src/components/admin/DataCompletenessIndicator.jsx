import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function DataCompletenessIndicator({ recommendation, showDetailed = false }) {
  const completenessData = recommendation.related_data || {};
  const percentage = completenessData.data_completeness_percentage || 0;
  const status = completenessData.data_completeness_status || 'incomplete';
  const dataSources = completenessData.data_sources_used || [];

  const getStatusConfig = (status, percentage) => {
    switch (status) {
      case 'complete':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          text: 'נתונים מלאים'
        };
      case 'partial':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
          text: 'נתונים חלקיים'
        };
      default:
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          iconColor: 'text-red-600',
          text: 'נתונים חסרים'
        };
    }
  };

  const config = getStatusConfig(status, percentage);
  const StatusIcon = config.icon;

  if (showDetailed) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
          <span className="font-medium text-horizon-text">איכות נתונים: {percentage}%</span>
          <Badge className={`${config.color} border`}>
            {config.text}
          </Badge>
        </div>
        
        {dataSources.length > 0 && (
          <div className="text-sm">
            <span className="text-horizon-accent">מקורות זמינים: </span>
            <span className="text-horizon-text">{dataSources.join(', ')}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
      <Badge className={`${config.color} border text-xs`}>
        {percentage}% נתונים
      </Badge>
    </div>
  );
}