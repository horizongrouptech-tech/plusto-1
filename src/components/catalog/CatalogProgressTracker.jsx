
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Loader2, CheckCircle, AlertTriangle, RefreshCw, Eye, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProcessStatus } from '@/api/entities';

export default function CatalogProgressTracker({ processId, onComplete }) {
    const [process, setProcess] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [intervalId, setIntervalId] = useState(null);

    useEffect(() => {
        if (processId) {
            loadProcessStatus(true); // Initial load with loader
            
            const id = setInterval(() => {
                loadProcessStatus(false); // Subsequent loads without loader
            }, 10000); // Poll every 10 seconds

            setIntervalId(id);

            return () => clearInterval(id); // Cleanup on unmount or processId change
        }
        // If processId is null or undefined, and there's an existing interval, clear it.
        // Also, set loading to false and call onComplete if no processId is provided.
        if (!processId && intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
            setIsLoading(false);
            onComplete && onComplete(); // Ensure onComplete is a function before calling
        }

        // Cleanup function for useEffect
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
                setIntervalId(null);
            }
        };
    }, [processId]); // Depend on processId to re-run effect when it changes

    const loadProcessStatus = async (showLoader = false) => {
        if (showLoader) {
            setIsLoading(true);
        }
        try {
            // Ensure processId exists before attempting to fetch
            if (!processId) {
                if (intervalId) clearInterval(intervalId);
                setIntervalId(null); // Clear the stored interval ID
                setProcess(null);
                onComplete && onComplete();
                return;
            }

            const processStatus = await ProcessStatus.get(processId);
            
            if (!processStatus) {
                // If process is not found, maybe it was deleted or never existed. Stop polling.
                if (intervalId) clearInterval(intervalId);
                setIntervalId(null); // Clear the stored interval ID
                setProcess(null); // Clear process state
                onComplete && onComplete();
                return;
            }

            setProcess(processStatus);

            if (processStatus.status !== 'running') {
                if (intervalId) clearInterval(intervalId);
                setIntervalId(null); // Clear the stored interval ID
                // Delay completion to allow user to see final status
                setTimeout(() => {
                    onComplete && onComplete();
                }, 5000); // Wait 5 seconds before calling onComplete
            }
        } catch (error) {
            console.error('Error loading process status:', error);
            if (intervalId) clearInterval(intervalId);
            setIntervalId(null); // Clear the stored interval ID
            setProcess(null); // Clear process state on error
            // Consider calling onComplete here as well if the process is inaccessible
            onComplete && onComplete();
        } finally {
            setIsLoading(false);
        }
    };
    
    const getStatusIcon = () => {
        switch (process?.status) {
            case 'running':
                return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed':
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'cancelled':
                return <AlertTriangle className="w-5 h-5 text-orange-500" />;
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        switch (process?.status) {
            case 'running': return 'blue';
            case 'completed': return 'green';
            case 'failed': return 'red';
            case 'cancelled': return 'orange';
            default: return 'gray';
        }
    };

    const getStatusText = () => {
        switch (process?.status) {
            case 'running': return 'בתהליך';
            case 'completed': return 'הושלם בהצלחה';
            case 'failed': return 'נכשל';
            case 'cancelled': return 'בוטל';
            default: return 'לא ידוע';
        }
    };

    const formatDuration = (startTime, endTime) => {
        if (!startTime) return '';
        
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : new Date();
        const durationMs = end - start;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <Card className="border-gray-700 bg-gray-800/50 mb-6">
                <CardContent className="p-4">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="mr-2 text-gray-400">בודק סטטוס תהליך...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    if (!process) {
        // This case handles when loading is finished but no process was found or it was explicitly cleared.
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
        >
            <Card className={`border-l-4 border-l-${getStatusColor()}-500 bg-horizon-card`}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            {getStatusIcon()}
                            <span>יצירת קטלוג אוטומטית</span>
                            <Badge 
                                variant="outline" 
                                className={`border-${getStatusColor()}-500 text-${getStatusColor()}-700 bg-${getStatusColor()}-50`}
                            >
                                {getStatusText()}
                            </Badge>
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowDetails(!showDetails)}
                            >
                                <Eye className="w-4 h-4 mr-1" />
                                פרטים
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => loadProcessStatus(true)} // Re-load with loader on manual refresh
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onComplete} // Allow parent to dismiss the tracker
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* מד התקדמות */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">התקדמות:</span>
                            <span className="font-medium">{process.progress || 0}%</span>
                        </div>
                        <Progress 
                            value={process.progress || 0} 
                            className="h-2"
                        />
                    </div>

                    {/* שלב נוכחי */}
                    <div className="space-y-1">
                        <div className="text-sm font-medium text-horizon-accent">שלב נוכחי:</div>
                        <div className="text-sm text-horizon-text bg-horizon-dark p-2 rounded">
                            {process.current_step || 'מתחיל תהליך...'}
                        </div>
                    </div>

                    {/* פרטים נוספים */}
                    {showDetails && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3 pt-3 border-t border-horizon"
                        >
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-horizon-accent">התחיל:</span>
                                    <div className="font-medium text-horizon-text">
                                        {process.started_at ? 
                                            new Date(process.started_at).toLocaleString('he-IL') : 
                                            'לא ידוע'
                                        }
                                    </div>
                                </div>
                                <div>
                                    <span className="text-horizon-accent">משך זמן:</span>
                                    <div className="font-medium text-horizon-text">
                                        {formatDuration(process.started_at, process.completed_at)}
                                    </div>
                                </div>
                            </div>

                            {process.status === 'completed' && process.result_data && (
                                <div className="bg-green-500/10 p-3 rounded-lg">
                                    <div className="text-sm font-medium text-green-400 mb-2">תוצאות:</div>
                                    <div className="text-sm text-green-300 space-y-1">
                                        {process.result_data.products_requested && (
                                            <div>מוצרים שהתבקשו: {process.result_data.products_requested}</div>
                                        )}
                                        {process.result_data.products_created && (
                                            <div>מוצרים שנוצרו: {process.result_data.products_created}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {process.status === 'failed' && process.error_message && (
                                <div className="bg-red-500/10 p-3 rounded-lg">
                                    <div className="text-sm font-medium text-red-400 mb-2">שגיאה:</div>
                                    <div className="text-sm text-red-300">{process.error_message}</div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* הודעת הסבר */}
                    <div className="text-xs text-horizon-accent bg-horizon-dark p-2 rounded">
                        💡 התהליך ממשיך לרוץ גם אם תעבור לדף אחר במערכת. אין צורך להישאר בעמוד זה.
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
