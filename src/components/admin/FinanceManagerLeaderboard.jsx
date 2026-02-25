import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Loader2, Trophy, Award, Star, Medal, Crown } from 'lucide-react';
import { FinancialManagerPerformance } from '@/api/entities';

export default function FinanceManagerLeaderboard({ refreshTrigger, financialManagers }) {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboardData();
    }, [refreshTrigger]);

    const fetchLeaderboardData = async () => {
        setIsLoading(true);
        try {
            // Get all performance data, sorted by date descending
            const allData = await FinancialManagerPerformance.list('-calculation_date');
            
            // Group by manager_email and keep only the latest record for each manager
            const latestDataByManager = {};
            allData.forEach(record => {
                if (!latestDataByManager[record.manager_email] || 
                    new Date(record.calculation_date) > new Date(latestDataByManager[record.manager_email].calculation_date)) {
                    latestDataByManager[record.manager_email] = record;
                }
            });

            // Convert to array and sort by manager_score descending, then take top 5
            const sortedData = Object.values(latestDataByManager)
                .sort((a, b) => (b.manager_score || 0) - (a.manager_score || 0))
                .slice(0, 5);

            setLeaderboardData(sortedData);
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const getRankIcon = (index) => {
        switch(index) {
            case 0: return <Crown className="w-6 h-6 text-yellow-400" />;
            case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
            case 2: return <Medal className="w-5 h-5 text-yellow-600" />;
            case 3: return <Award className="w-5 h-5 text-blue-400" />;
            case 4: return <Star className="w-5 h-5 text-blue-500" />;
            default: return <span className="text-sm font-bold w-5 text-center text-horizon-accent">{index + 1}</span>;
        }
    };

    const getScoreBadgeVariant = (score) => {
        if (score >= 80) return "default";
        if (score >= 60) return "secondary"; 
        if (score >= 40) return "outline";
        return "destructive";
    };

    if (isLoading) {
        return (
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle className="text-horizon-text">מובילי הביצועים</CardTitle>
              <CardDescription className="text-horizon-accent">טוען נתונים...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
              </div>
            </CardContent>
          </Card>
        );
    }
    
    return (
        <Card className="card-horizon">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-horizon-text">
                    <Trophy className="w-6 h-6 text-horizon-primary"/>
                    מנהלי הכספים המובילים
                </CardTitle>
                <CardDescription className="text-horizon-accent text-right">
                    5 מנהלי הכספים עם הציון הגבוה ביותר
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {leaderboardData.length > 0 ? leaderboardData.map((manager, index) => {
                        // מצא את אובייקט המנהל המלא מתוך הרשימה שהועברה כ-prop
                        const fm = (financialManagers || []).find(f => f.email === manager.manager_email);
                        // השתמש בשם המלא מהביצועים או מרשימת המנהלים
                        const displayName = manager.manager_full_name || (fm ? fm.full_name : manager.manager_email);
                        
                        return (
                            <div key={manager.manager_email} className="flex items-center justify-between p-4 bg-horizon-card/30 rounded-xl hover:bg-horizon-card/50 transition-all duration-200 border border-horizon/50">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-10 h-10 bg-horizon-dark rounded-full">
                                        {getRankIcon(index)}
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-horizon-text text-lg">
                                            {displayName}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm text-horizon-accent">
                                                {manager.active_clients_count || 0} לקוחות פעילים
                                            </span>
                                            <span className="text-sm text-blue-400">
                                                {manager.quality_recommendations_count || 0} המלצות איכות
                                            </span>
                                        </div>
                                        <div className="text-xs text-green-400 mt-1 font-medium">
                                            רווח צפוי: ₪{(manager.estimated_client_profit || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <Badge 
                                        variant={getScoreBadgeVariant(manager.manager_score)} 
                                        className="text-lg font-bold px-4 py-2 shadow-lg"
                                    >
                                        {manager.manager_score || 0}
                                    </Badge>
                                    <span className="text-xs text-horizon-accent">ציון</span>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-horizon-card rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trophy className="w-8 h-8 text-horizon-accent" />
                            </div>
                            <p className="text-horizon-accent font-medium">אין נתוני ביצועים זמינים</p>
                            <p className="text-sm text-horizon-accent mt-1">לחץ על "חישוב מחדש" ליצירת לוח המובילים</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}