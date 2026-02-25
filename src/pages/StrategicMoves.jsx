import React, { useState, useEffect } from "react";


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Lightbulb,
  AlertTriangle,
  Star
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import StrategicMoveCard from "@/components/shared/StrategicMoveCard";
import { StrategicMove, User } from '@/api/entities';

export default function StrategicMovesPage() {
  const [strategicMoves, setStrategicMoves] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMoveType, setSelectedMoveType] = useState("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingMove, setViewingMove] = useState(null);

  const moveTypeTranslations = {
    platform_independence: "עצמאות מפלטפורמות",
    problem_to_asset: "הפיכת בעיה לנכס",
    system_building: "בניית מערכת",
    franchising: "זכיינות חדשנית",
    backdoor_entry: "כניסה מהדלת האחורית",
    market_disruption: "שיבוש שוק"
  };

  useEffect(() => {
    loadStrategicMoves();
  }, []);

  const loadStrategicMoves = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      if (userData) {
        const userMoves = await StrategicMove.filter({
          customer_email: userData.email
        }, "-created_date");

        // מיון לפי ציון חדשנות ופוטנציאל כספי
        userMoves.sort((a, b) => {
          const scoreA = (a.innovation_score || 5) * (a.financial_potential || 0);
          const scoreB = (b.innovation_score || 5) * (b.financial_potential || 0);
          return scoreB - scoreA;
        });

        setStrategicMoves(userMoves);
      }
    } catch (error) {
      console.error("Error loading strategic moves:", error);
    }
    setIsLoading(false);
  };

  const handleViewDetails = (move) => {
    setViewingMove(move);
    setDetailsModalOpen(true);
  };

  const handleMarkInProgress = async (moveId) => {
    try {
      await StrategicMove.update(moveId, { status: "in_execution" });
      setStrategicMoves(prev => 
        prev.map(m => m.id === moveId ? { ...m, status: "in_execution" } : m)
      );
    } catch (error) {
      console.error("Error marking move as in progress:", error);
    }
  };

  const filteredMoves = selectedMoveType === "all"
    ? strategicMoves
    : strategicMoves.filter(m => m.move_type === selectedMoveType);

  const totalPotential = strategicMoves.reduce((sum, move) => sum + (move.financial_potential || 0), 0);

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-horizon-text">מהלכים אסטרטגיים</h1>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              פורצי דרך
            </Badge>
          </div>
          <p className="text-horizon-accent text-lg">
            מהלכים חדשניים שישנו את חוקי המשחק ויפתחו הזדמנויות עסקיות חדשות
          </p>
        </div>

        {/* Stats Overview */}
        {strategicMoves.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="card-horizon">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold text-horizon-text">{strategicMoves.length}</div>
                <div className="text-sm text-horizon-accent">מהלכים זמינים</div>
              </CardContent>
            </Card>
            
            <Card className="card-horizon">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <div className="text-2xl font-bold text-green-400">
                  ₪{totalPotential.toLocaleString()}
                </div>
                <div className="text-sm text-horizon-accent">פוטנציאל כולל</div>
              </CardContent>
            </Card>

            <Card className="card-horizon">
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-yellow-400">
                  {strategicMoves.length > 0 
                    ? (strategicMoves.reduce((sum, m) => sum + (m.innovation_score || 5), 0) / strategicMoves.length).toFixed(1)
                    : '0'
                  }
                </div>
                <div className="text-sm text-horizon-accent">ציון חדשנות ממוצע</div>
              </CardContent>
            </Card>

            <Card className="card-horizon">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold text-blue-400">
                  {strategicMoves.filter(m => m.status === 'in_execution').length}
                </div>
                <div className="text-sm text-horizon-accent">בביצוע</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={() => setSelectedMoveType("all")}
            variant={selectedMoveType === "all" ? "default" : "ghost"}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedMoveType === "all"
                ? "bg-horizon-primary text-white shadow-lg"
                : "bg-horizon-card text-horizon-accent border border-horizon hover:bg-horizon-primary/20"
            }`}
          >
            כל המהלכים
          </Button>
          
          {Object.entries(moveTypeTranslations).map(([key, label]) => (
            <Button
              key={key}
              onClick={() => setSelectedMoveType(key)}
              variant={selectedMoveType === key ? "default" : "ghost"}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedMoveType === key
                  ? "bg-horizon-primary text-white shadow-lg"
                  : "bg-horizon-card text-horizon-accent border border-horizon hover:bg-horizon-primary/20"
              }`}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-horizon-accent">טוען מהלכים אסטרטגיים...</p>
          </div>
        ) : strategicMoves.length === 0 ? (
          <Card className="card-horizon">
            <CardContent className="text-center py-16">
              <Lightbulb className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
              <h3 className="text-xl font-semibold text-horizon-text mb-2">אין מהלכים אסטרטגיים זמינים</h3>
              <p className="text-horizon-accent">
                המערכת עדיין מנתחת את העסק שלך לזיהוי הזדמנויות פריצת דרך
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredMoves.map(move => (
              <StrategicMoveCard
                key={move.id}
                move={move}
                onViewDetails={handleViewDetails}
                onMarkInProgress={handleMarkInProgress}
                isAdmin={false}
              />
            ))}
          </div>
        )}

        {/* Details Modal */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
            {viewingMove && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl text-horizon-text flex items-center gap-3">
                    <Zap className="w-6 h-6 text-orange-500" />
                    {viewingMove.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Move Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <h4 className="font-medium text-orange-400 mb-2">המצב הנוכחי:</h4>
                        <p className="text-horizon-text">{viewingMove.situation_description}</p>
                      </div>

                      <div className="p-4 bg-horizon-card/20 rounded-lg">
                        <h4 className="font-medium text-horizon-primary mb-2">המהלך "{viewingMove.move_name}":</h4>
                        <p className="text-horizon-text">{viewingMove.move_description}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
                          <div className="text-xl font-bold text-green-300">
                            ₪{(viewingMove.financial_potential || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-green-400">פוטנציאל כספי</div>
                        </div>

                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                          <Star className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                          <div className="text-xl font-bold text-yellow-300">
                            {viewingMove.innovation_score}/10
                          </div>
                          <div className="text-sm text-yellow-400">ציון חדשנות</div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <h4 className="font-medium text-blue-400 mb-2">תוצאה צפויה:</h4>
                        <p className="text-blue-300">{viewingMove.expected_breakthrough}</p>
                      </div>

                      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <h4 className="font-medium text-purple-400 mb-2">יתרון תחרותי:</h4>
                        <p className="text-purple-300">{viewingMove.competitive_advantage}</p>
                      </div>
                    </div>
                  </div>

                  {/* Execution Steps */}
                  <div className="p-4 bg-horizon-card/20 rounded-lg">
                    <h4 className="font-medium text-horizon-primary mb-4">שלבי ביצוע:</h4>
                    <div className="space-y-3">
                      {viewingMove.execution_steps?.map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-horizon-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <p className="text-horizon-text">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <h4 className="font-medium text-red-400">חשוב לזכור:</h4>
                    </div>
                    <p className="text-red-300">
                      זהו מהלך אסטרטגי הדורש חשיבה ארוכת טווח ומחויבות לביצוע מלא. 
                      התוצאות עשויות להיראות לאחר {viewingMove.execution_timeframe}.
                    </p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}