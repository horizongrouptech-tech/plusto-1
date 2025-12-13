
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Lightbulb, 
  AlertTriangle,
  Star,
  Zap
} from "lucide-react";

export default function StrategicMoveCard({ 
  move, 
  onViewDetails, 
  onMarkInProgress, 
  isAdmin = false 
}) {
  const moveTypeTranslations = {
    platform_independence: "עצמאות מפלטפורמות",
    problem_to_asset: "הפיכת בעיה לנכס",
    system_building: "בניית מערכת",
    franchising: "זכיינות חדשנית",
    backdoor_entry: "כניסה מהדלת האחורית",
    market_disruption: "שיבוש שוק"
  };

  const riskColors = {
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  const riskTranslations = {
    low: "סיכון נמוך",
    medium: "סיכון בינוני",
    high: "סיכון גבוה"
  };

  const statusColors = {
    proposed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    under_consideration: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    in_execution: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    completed: "bg-green-600/20 text-green-300 border-green-600/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  const statusTranslations = {
    proposed: "הוצע",
    under_consideration: "בבחינה",
    approved: "אושר",
    in_execution: "בביצוע",
    completed: "הושלם",
    rejected: "נדחה"
  };

  return (
    <Card className="card-horizon border-r-4 border-r-orange-500 hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                מהלך פורץ דרך
              </Badge>
              <Badge className={statusColors[move.status] || statusColors.proposed}>
                {statusTranslations[move.status] || move.status}
              </Badge>
            </div>
            <CardTitle className="text-xl text-horizon-text mb-2">
              {move.title}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-horizon-accent">
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                {moveTypeTranslations[move.move_type] || move.move_type}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {move.execution_timeframe}
              </span>
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">
                {move.innovation_score}/10
              </span>
            </div>
            <Badge className={riskColors[move.risk_level] || riskColors.medium}>
              {riskTranslations[move.risk_level] || move.risk_level}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
          <h4 className="font-medium text-orange-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            המצב שזוהה:
          </h4>
          <p className="text-horizon-text text-sm">{move.situation_description}</p>
        </div>

        <div className="p-4 bg-horizon-card/20 rounded-lg">
          <h4 className="font-medium text-horizon-primary mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            המהלך "{move.move_name}":
          </h4>
          <p className="text-horizon-text text-sm line-clamp-3">{move.move_description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">פוטנציאל כספי</span>
            </div>
            <div className="text-lg font-bold text-green-300">
              ₪{(move.financial_potential || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">תוצאה צפויה</span>
            </div>
            <div className="text-sm text-blue-300 line-clamp-2">
              {move.expected_breakthrough}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-horizon">
          <Button
            onClick={() => onViewDetails(move)}
            className="btn-horizon-primary flex-1"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            צפה בפרטים
          </Button>
          
          {!isAdmin && move.status === 'proposed' && (
            <Button
              onClick={() => onMarkInProgress(move.id)}
              className="btn-horizon-secondary"
            >
              <Zap className="w-4 h-4 mr-2" />
              התחל ביצוע
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
