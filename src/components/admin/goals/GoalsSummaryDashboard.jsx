import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, ListChecks, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const StatCard = ({ title, value, icon, colorClass = "text-horizon-text" }) => (
    <div className="bg-horizon-card/30 p-4 rounded-lg text-center border border-horizon-border transition-all hover:border-horizon-primary hover:bg-horizon-card/50">
        <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
        <div className="text-sm text-horizon-accent flex items-center justify-center gap-2 mt-1">
            {icon}
            <span>{title}</span>
        </div>
    </div>
);

export default function GoalsSummaryDashboard({ goalStats, subtaskStats }) {
    return (
        <Card className="card-horizon mb-6">
            <CardHeader>
                <CardTitle className="text-horizon-text">סיכום יעדים ומשימות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-horizon-primary"><Target className="w-5 h-5" />יעדים ראשיים</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard title="סה״כ יעדים" value={goalStats.total} icon={<Target className="w-4 h-4"/>} />
                        <StatCard title="הושלמו" value={`${goalStats.done}`} icon={<CheckCircle2 className="w-4 h-4 text-green-400" />} colorClass="text-green-400" />
                        <StatCard title="בתהליך" value={goalStats.in_progress} icon={<Clock className="w-4 h-4 text-blue-400" />} colorClass="text-blue-400" />
                        <StatCard title="באיחור" value={goalStats.delayed} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} colorClass="text-red-400" />
                    </div>
                </div>
                {subtaskStats.total > 0 && (
                    <div className="space-y-3 pt-4 border-t border-horizon-border">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-horizon-primary"><ListChecks className="w-5 h-5" />משימות משנה</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatCard title="סה״כ משימות" value={subtaskStats.total} icon={<ListChecks className="w-4 h-4" />} />
                            <StatCard title="הושלמו" value={`${subtaskStats.done}`} icon={<CheckCircle2 className="w-4 h-4 text-green-400" />} colorClass="text-green-400" />
                            <StatCard title="בתהליך" value={subtaskStats.in_progress} icon={<Clock className="w-4 h-4 text-blue-400" />} colorClass="text-blue-400" />
                            <StatCard title="באיחור" value={subtaskStats.delayed} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} colorClass="text-red-400" />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}