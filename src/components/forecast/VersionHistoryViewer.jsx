import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ManualForecastVersion } from "@/entities/ManualForecastVersion";
import { 
    History, 
    RotateCcw, 
    User, 
    Calendar,
    Loader2
} from "lucide-react";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function VersionHistoryViewer({ forecast, onRestore }) {
    const [versions, setVersions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadVersions = useCallback(async () => {
        setIsLoading(true);
        try {
            const versionsList = await ManualForecastVersion.filter(
                { forecast_id: forecast.id },
                '-version_number'
            );
            setVersions(versionsList);
        } catch (error) {
            console.error("Error loading versions:", error);
        } finally {
            setIsLoading(false);
        }
    }, [forecast.id]);

    useEffect(() => {
        loadVersions();
    }, [loadVersions]);

    const handleRestore = async (version) => {
        if (!confirm(`האם אתה בטוח שברצונך לשחזר לגרסה ${version.version_number}?`)) {
            return;
        }

        alert('שחזור גרסאות יתווסף בשלב הבא');
        onRestore();
    };

    if (isLoading) {
        return (
            <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-horizon-primary" />
                    <p className="text-horizon-accent mt-2">טוען היסטוריה...</p>
                </CardContent>
            </Card>
        );
    }

    if (versions.length === 0) {
        return (
            <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                    <History className="w-12 h-12 mx-auto mb-4 text-horizon-accent opacity-50" />
                    <h3 className="text-lg font-semibold text-horizon-text mb-2">
                        אין עדיין גרסאות שמורות
                    </h3>
                    <p className="text-horizon-accent">
                        גרסאות יישמרו אוטומטית כאשר תבצע שינויים בנתונים
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="card-horizon">
            <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                    <History className="w-5 h-5 text-horizon-primary" />
                    היסטוריית גרסאות ({versions.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                        {versions.map((version, idx) => (
                            <div 
                                key={version.id}
                                className="p-4 bg-horizon-card/50 rounded-lg border border-horizon hover:border-horizon-primary/50 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge className="bg-horizon-primary text-white">
                                                גרסה {version.version_number}
                                            </Badge>
                                            {idx === 0 && (
                                                <Badge className="bg-green-500 text-white">
                                                    נוכחית
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <h4 className="font-medium text-horizon-text mb-2">
                                            {version.change_summary}
                                        </h4>
                                        
                                        <div className="flex items-center gap-4 text-sm text-horizon-accent">
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                <span>{version.changed_by}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                    {format(new Date(version.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                                                </span>
                                            </div>
                                        </div>

                                        {version.snapshot_data && (
                                            <div className="mt-3 p-3 bg-horizon-dark rounded text-xs">
                                                <pre className="text-horizon-accent overflow-x-auto">
                                                    {JSON.stringify(version.snapshot_data, null, 2).substring(0, 200)}...
                                                </pre>
                                            </div>
                                        )}
                                    </div>

                                    {idx > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRestore(version)}
                                            className="border-horizon text-horizon-text"
                                        >
                                            <RotateCcw className="w-3 h-3 ml-1" />
                                            שחזר
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}