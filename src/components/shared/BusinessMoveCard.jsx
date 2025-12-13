
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Edit3, Target, Info } from "lucide-react";

const categoryTranslations = {
  growth: "צמיחה",
  efficiency: "יעילות",
  market_expansion: "הרחבת שוק",
  digital_transformation: "דיגיטציה",
  cost_reduction: "הפחתת עלויות",
  innovation: "חדשנות"
};

const priorityTranslations = {
  high: "גבוהה",
  medium: "בינונית",
  low: "נמוכה"
};

const statusTranslations = {
  pending_approval: "ממתין לאישור",
  approved_by_admin: "אושר",
  in_progress: "בביצוע",
  completed: "הושלם",
  cancelled: "בוטל"
};

const complexityTranslations = {
  simple: "פשוטה",
  moderate: "בינונית", 
  complex: "מורכבת"
};

export default function BusinessMoveCard({ 
  move, 
  isAdmin = false, 
  onEdit = null, 
  onApprove = null, 
  onViewDetails = null,
  onMarkInProgress = null 
}) {
  return (
    <Card 
      key={move.id}
      className="card-horizon flex flex-col cursor-pointer hover:bg-horizon-card/60 transition-colors duration-200"
    >
      <CardHeader>
        <div className="flex justify-between items-start mb-3" onClick={() => onViewDetails && onViewDetails(move)}>
          <div className="flex-1">
            <CardTitle className="text-lg text-horizon-text">{move.title}</CardTitle>
            <p className="text-sm text-horizon-accent mt-1 line-clamp-2">{move.description}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={
                move.status === 'approved_by_admin' ? 'bg-green-500' :
                move.status === 'pending_approval' ? 'bg-yellow-500' : 
                move.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-500'
            }>
              {statusTranslations[move.status] || move.status}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 pt-2 flex-wrap">
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Target className="w-3 h-3 mr-1" />
            ₪{(move.expected_impact || 0).toLocaleString()}
          </Badge>
          <Badge variant="outline" className="border-horizon-secondary text-horizon-secondary">
            {categoryTranslations[move.category] || move.category}
          </Badge>
          <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
            עדיפות: {priorityTranslations[move.priority] || move.priority}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-grow">
        <div className="flex justify-between items-center text-sm cursor-pointer" onClick={() => onViewDetails && onViewDetails(move)}>
          <div className="flex gap-4">
            <span className="text-blue-400">השפעה: ₪{(move.expected_impact || 0).toLocaleString()}</span>
            <span className="text-horizon-accent">מורכבות: {complexityTranslations[move.implementation_complexity] || move.implementation_complexity}</span>
            <span className="text-horizon-accent">טווח זמן: {move.timeframe}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center">
        <Button 
          variant="outline" 
          className="text-horizon-primary border-horizon-primary" 
          onClick={(e) => { 
            e.stopPropagation(); 
            onViewDetails && onViewDetails(move); 
          }}
        >
          <Info className="w-4 h-4 mr-2" />
          פירוט נוסף
        </Button>

        <div className="flex gap-2">
          {isAdmin ? (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onEdit && onEdit(move); 
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                ערוך
              </Button>
              {move.status === 'pending_approval' && (
                <Button 
                  size="sm" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onApprove && onApprove(move); 
                  }} 
                  className="btn-horizon-primary"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  אשר מהלך
                </Button>
              )}
            </>
          ) : (
            move.status === 'approved_by_admin' && move.status !== 'in_progress' && move.status !== 'completed' && (
              <Button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onMarkInProgress && onMarkInProgress(move.id); 
                }} 
                className="btn-horizon-secondary"
              >
                <Target className="w-4 h-4 mr-2" />
                התחל יישום
              </Button>
            )
          )}
          
          {!isAdmin && move.status === 'in_progress' && (
            <span className="text-sm text-blue-500 flex items-center gap-1">
              <Target className="w-4 h-4" /> בביצוע
            </span>
          )}
          
          {!isAdmin && move.status === 'completed' && (
            <span className="text-sm text-green-500 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> הושלם
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
