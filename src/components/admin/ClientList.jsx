import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, FileText, Lightbulb, ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClientList({ clients, selectedClient, onClientSelect }) {
    // ✅ סינון לקוחות לא פעילים
    const activeClients = (clients || []).filter(client => {
        return client.is_active !== false && 
               client.is_archived !== true &&
               client.account_status !== 'archived' &&
               client.account_status !== 'inactive';
    });

    return (
        <div className="space-y-3">
            {activeClients.map(client => (
                <Card
                    key={client.id}
                    className={`card-horizon cursor-pointer transition-all hover:border-horizon-primary/50 ${
                        selectedClient?.id === client.id ? 'border-horizon-primary ring-2 ring-horizon-primary/30' : ''
                    }`}
                    onClick={() => onClientSelect(client)}
                >
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="text-right flex-1">
                                <h3 className="font-semibold text-horizon-text mb-1">{client.name}</h3>
                                <p className="text-sm text-horizon-accent">{client.email}</p>
                            </div>
                            <Building className="w-5 h-5 text-horizon-primary flex-shrink-0 mr-2" />
                        </div>

                        <div className="flex items-center gap-2 mb-3 justify-end">
                            <span className="text-xs text-horizon-accent">{client.manager}</span>
                            <Users className="w-4 h-4 text-horizon-accent" />
                        </div>

                        {/* סטטיסטיקות קבצים והמלצות */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-horizon-card/30 p-2 rounded text-center">
                                <FileText className="w-4 h-4 mx-auto mb-1 text-horizon-accent" />
                                <p className="text-xs text-horizon-accent">קבצים</p>
                            </div>
                            <div className="bg-horizon-card/30 p-2 rounded text-center">
                                <Lightbulb className="w-4 h-4 mx-auto mb-1 text-horizon-accent" />
                                <p className="text-xs text-horizon-accent">המלצות</p>
                            </div>
                        </div>

                        {/* כפתור מעבר ללקוח - ממוקם כאן */}
                        {(() => {
                            const inferred = client?.source || (client?.id?.startsWith('onboarding_') ? 'onboarding' : 'user');
                            return (
                                <Link to={createPageUrl('CustomerManagement') + `?clientId=${client.id}&source=${inferred}`}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-horizon-primary text-horizon-primary hover:bg-horizon-primary hover:text-white"
                                    >
                                        <ArrowLeft className="w-4 h-4 ml-2" />
                                        ניהול לקוח מלא
                                    </Button>
                                </Link>
                            );
                        })()}

                        {client.source === 'onboarding' && (
                            <Badge className="bg-yellow-500 text-white mt-2 w-full justify-center">
                                בתהליך קליטה
                            </Badge>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}