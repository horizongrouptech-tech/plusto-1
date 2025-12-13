import React, { useState, useEffect } from 'react';
import { ProcessStatus } from '@/entities/ProcessStatus';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function OnboardingStatusTracker({ customerEmail }) {
    const [process, setProcess] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!customerEmail) return;

        const checkForOnboardingProcess = async () => {
            try {
                const runningProcesses = await ProcessStatus.filter({
                    customer_email: customerEmail,
                    process_type: 'onboarding',
                    status: 'running'
                }, '-started_at', 1);

                if (runningProcesses.length > 0) {
                    setProcess(runningProcesses[0]);
                }
            } catch (error) {
                console.error("Error checking for onboarding process:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkForOnboardingProcess();
    }, [customerEmail]);

    useEffect(() => {
        if (!process || process.status !== 'running') return;

        const interval = setInterval(async () => {
            try {
                const updatedProcess = await ProcessStatus.get(process.id);
                setProcess(updatedProcess);

                if (updatedProcess.status !== 'running') {
                    clearInterval(interval);
                    setTimeout(() => setProcess(null), 15000); 
                }
            } catch (error) {
                console.error("Error polling process status:", error);
                clearInterval(interval);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [process]);

    if (isLoading || !process) {
        return null;
    }

    const getIcon = () => {
        switch(process.status) {
            case 'running': return <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />;
            case 'completed': return <CheckCircle className="w-6 h-6 text-green-500" />;
            case 'failed': return <AlertTriangle className="w-6 h-6 text-red-500" />;
            default: return null;
        }
    };

    return (
        <Card className="card-horizon mb-6">
            <CardHeader>
                <CardTitle className="text-lg text-horizon-text flex items-center justify-between">
                    <span>תהליך קליטת העסק שלך למערכת</span>
                    {getIcon()}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <p className="text-horizon-accent text-sm">{process.current_step}</p>
                    <Progress value={process.progress} />
                    {process.status === 'failed' && (
                        <p className="text-red-400 text-xs">שגיאה: {process.error_message}</p>
                    )}
                     {process.status === 'completed' && (
                        <p className="text-green-400 text-sm font-semibold">התהליך הושלם! רענן את העמוד כדי לראות את כל הנתונים.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}