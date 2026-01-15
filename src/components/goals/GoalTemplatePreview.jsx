import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge, PopularBadge } from './GoalTemplateBadges';
import { Clock, CheckCircle2, Target, Copy } from 'lucide-react';

export default function GoalTemplatePreview({ template, showUsageCount = true }) {
  if (!template) return null;

  return (
    <Card className="bg-horizon-card border-2 border-horizon">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-xl text-horizon-text mb-3">{template.name}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <CategoryBadge category={template.category} />
              {showUsageCount && <PopularBadge usageCount={template.usage_count} />}
            </div>
          </div>
          {showUsageCount && (
            <div className="text-center">
              <div className="flex items-center gap-1 text-horizon-accent text-xs mb-1">
                <Copy className="w-3 h-3" />
                <span>שימושים</span>
              </div>
              <div className="text-2xl font-bold text-horizon-primary">
                {template.usage_count || 0}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {template.description && (
          <div className="bg-horizon-primary/5 rounded-lg p-4 border-r-4 border-horizon-primary">
            <p className="text-sm text-horizon-text leading-relaxed">
              {template.description}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 bg-horizon-primary/10 rounded-lg px-4 py-3">
          <Clock className="w-4 h-4 text-horizon-primary" />
          <span className="text-sm font-medium text-horizon-text">משך משוער:</span>
          <span className="text-lg font-bold text-horizon-primary">
            {template.estimated_duration_days || 30} ימים
          </span>
        </div>

        {template.success_metrics && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-horizon-secondary" />
              <span className="text-sm font-semibold text-horizon-text">מדדי הצלחה:</span>
            </div>
            <p className="text-sm text-horizon-accent pr-6">{template.success_metrics}</p>
          </div>
        )}

        {template.action_steps && template.action_steps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-horizon-primary" />
              <span className="text-sm font-semibold text-horizon-text">שלבי ביצוע:</span>
            </div>
            <div className="space-y-2">
              {template.action_steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 bg-horizon-dark/30 rounded-lg p-3 border border-horizon"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-horizon-primary/20 text-horizon-primary text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-horizon-text flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}