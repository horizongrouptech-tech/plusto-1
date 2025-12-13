import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import RecommendationDisplayCard from "./RecommendationDisplayCard";

export default function StrategicRecommendations({
  recommendations,
  isLoading,
  onView,
  onEdit,
  onUpgrade,
  onDelete,
  onArchive,
  onSendToCustomer,
  isAdmin = false
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="card-horizon">
            <CardContent className="p-4 space-y-3">
              <div className="h-5 bg-horizon-card/50 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-horizon-card/30 rounded w-1/2 animate-pulse"></div>
              <div className="h-10 bg-horizon-card/30 rounded w-full animate-pulse"></div>
              <div className="flex justify-end">
                <div className="h-8 w-20 bg-horizon-card/50 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Alert className="bg-horizon-card border-horizon text-center py-8">
        <Lightbulb className="h-8 w-8 mx-auto text-horizon-accent mb-4" />
        <AlertDescription className="text-horizon-accent">
          לא נוצרו עדיין המלצות עבור לקוח זה.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recommendations.map((recommendation) => (
        <RecommendationDisplayCard
          key={recommendation.id}
          recommendation={recommendation}
          onView={onView}
          onEdit={onEdit}
          onUpgrade={onUpgrade}
          onDelete={onDelete}
          onArchive={onArchive}
          onSendToCustomer={onSendToCustomer}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}