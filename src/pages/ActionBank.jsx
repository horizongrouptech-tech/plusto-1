
import React, { useState, useEffect } from "react";


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

import BusinessMoveCard from "@/components/shared/BusinessMoveCard";
import BusinessMoveDetailsModal from "@/components/admin/BusinessMoveDetailsModal";
import { BusinessMove, User } from '@/api/entities';

export default function ActionBankPage() {
  const [businessMoves, setBusinessMoves] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingBusinessMove, setViewingBusinessMove] = useState(null);
  const [detailsContent, setDetailsContent] = useState(""); // This state variable is not used in the provided outline for this component. Keep for safety.
  const [isFetchingDetails, setIsFetchingDetails] = useState(false); // This state variable is not used in the provided outline for this component. Keep for safety.

  const categoryTranslations = {
    growth: "צמיחה",
    efficiency: "יעילות",
    market_expansion: "הרחבת שוק",
    digital_transformation: "דיגיטציה",
    cost_reduction: "הפחתת עלויות",
    innovation: "חדשנות"
  };

  const moveComplexityTranslations = {
    simple: "פשוטה",
    moderate: "בינונית",
    complex: "מורכבת"
  };

  const moveTimeframeTranslations = {
    short_term: "קצר (עד 3 חודשים)",
    medium_term: "בינוני (3-12 חודשים)",
    long_term: "ארוך (מעל 12 חודשים)"
  };

  useEffect(() => {
    loadBusinessMoves();
  }, []);

  const loadBusinessMoves = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      if (userData) {
        const userBusinessMoves = await BusinessMove.filter({
          customer_email: userData.email
        }, "-created_date");

        const priorityOrder = { high: 1, medium: 2, low: 3 };
        userBusinessMoves.sort((a, b) => {
          const priorityDiff = (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(b.created_date) - new Date(a.created_date);
        });

        setBusinessMoves(userBusinessMoves);
      }
    } catch (error) {
      console.error("Error loading business moves:", error);
    }
    setIsLoading(false);
  };

  const handleViewDetails = (move) => { // Renamed from handleViewBusinessMove
    setViewingBusinessMove(move);
    setDetailsModalOpen(true);
  };

  const handleMarkInProgress = async (moveId) => {
    try {
      await BusinessMove.update(moveId, { status: "in_progress" });
      setBusinessMoves(prev => prev.map(m => m.id === moveId ? { ...m, status: "in_progress" } : m));
    } catch (error) {
      console.error("Error marking move as in progress:", error);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '';
    return new Intl.NumberFormat('he-IL').format(num);
  };

  const filteredMoves = selectedCategory === "all"
    ? businessMoves
    : businessMoves.filter(m => m.category === selectedCategory);

  const groupedMoves = filteredMoves.reduce((acc, move) => {
    const categoryKey = move.category || 'growth';
    if (!acc[categoryKey]) {
      acc[categoryKey] = [];
    }
    acc[categoryKey].push(move);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3 text-horizon-text">בנק מהלכים אסטרטגיים</h1>
          <p className="text-horizon-accent">מהלכים אסטרטגיים לצמיחה ושיפור הביצועים העסקיים</p>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={() => setSelectedCategory("all")}
            variant={selectedCategory === "all" ? "default" : "ghost"}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedCategory === "all"
                ? "bg-horizon-primary text-white shadow-lg hover:bg-horizon-primary/90"
                : "bg-horizon-card text-horizon-accent border border-horizon hover:bg-horizon-primary/20 hover:text-white"
            }`}
          >
            כל הקטגוריות
          </Button>
          
          {Object.entries(categoryTranslations).map(([key, label]) => (
            <Button
              key={key}
              onClick={() => setSelectedCategory(key)}
              variant={selectedCategory === key ? "default" : "ghost"}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedCategory === key
                  ? "bg-horizon-primary text-white shadow-lg hover:bg-horizon-primary/90"
                  : "bg-horizon-card text-horizon-accent border border-horizon hover:bg-horizon-primary/20 hover:text-white"
              }`}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Content based on loading state */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-horizon-primary mx-auto mb-4"></div>
            <p className="text-horizon-accent">טוען מהלכים אסטרטגיים...</p>
          </div>
        ) : businessMoves.length === 0 ? (
          <Card className="card-horizon">
            <CardContent className="text-center py-16">
              <Target className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
              <h3 className="text-xl font-semibold text-horizon-text mb-2">אין מהלכים זמינים</h3>
              <p className="text-horizon-accent">עדיין לא נוצרו מהלכים אסטרטגיים עבורך</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {Object.entries(groupedMoves).map(([category, moves]) => (
              <div key={category}>
                <h2 className="text-xl font-semibold text-horizon-primary mb-4 border-b border-horizon pb-2">
                  {categoryTranslations[category] || category}
                </h2>
                <div className="grid gap-4">
                  {moves.map(move => (
                    <BusinessMoveCard
                      key={move.id}
                      move={move}
                      isAdmin={false}
                      onViewDetails={handleViewDetails}
                      onMarkInProgress={handleMarkInProgress}
                      moveComplexityTranslations={moveComplexityTranslations}
                      moveTimeframeTranslations={moveTimeframeTranslations}
                      formatNumber={formatNumber}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Business Move Details Modal */}
      <BusinessMoveDetailsModal
        move={viewingBusinessMove}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        customer={user}
        moveComplexityTranslations={moveComplexityTranslations}
        moveTimeframeTranslations={moveTimeframeTranslations}
      />
    </div>
  );
}
