import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function ProcessStatusDisplay({ process, onClearProcess }) {
    if (!process) return null;

    const getStatusIcon = () => {
        switch(process.status) {
            case 'running': 
                return <Loader2 className="w-5 h-5 animate-spin text-horizon-primary" />;
            case 'completed': 
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed': 
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
            default: 
                return null;
        }
    };

    const getStatusColor = () => {
        switch(process.status) {
            case 'running': return 'border-horizon-primary';
            case 'completed': return 'border-green-500';
            case 'failed': return 'border-red-500';
            default: return 'border-gray-400';
        }
    };

    const getProgressColor = () => {
        switch(process.status) {
            case 'running': return 'bg-horizon-primary';
            case 'completed': return 'bg-green-500';
            case 'failed': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <Card className={`card-horizon mb-6 border-2 ${getStatusColor()}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                        {getStatusIcon()}
                        {process.status === 'running' && 'יוצר תחזית עסקית...'}
                        {process.status === 'completed' && 'התחזית נוצרה בהצלחה!'}
                        {process.status === 'failed' && 'שגיאה ביצירת התחזית'}
                    </CardTitle>
                    {(process.status === 'completed' || process.status === 'failed') && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onClearProcess}
                            className="text-horizon-accent hover:text-horizon-text"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <p className="text-horizon-accent text-sm">
                        {process.current_step}
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                            style={{ width: `${process.progress || 0}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-horizon-accent">
                        <span>התקדמות</span>
                        <span>{process.progress || 0}%</span>
                    </div>
                    {process.status === 'failed' && process.error_message && (
                        <p className="text-red-400 text-sm mt-2">
                            שגיאה: {process.error_message}
                        </p>
                    )}
                    {process.status === 'completed' && (
                        <p className="text-green-400 text-sm font-semibold">
                            התחזית החדשה נטענה אוטומטיט. תוכל לערוך אותה בטאבים למטה.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}