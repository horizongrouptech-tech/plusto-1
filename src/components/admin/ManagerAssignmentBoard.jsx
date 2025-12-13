import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserX, Search, ArrowRight, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ManagerAssignmentBoard({ clients, financialManagers, onAssignmentChange }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedManager, setSelectedManager] = useState(null);
    const [showAssignToExistingModal, setShowAssignToExistingModal] = useState(false);
    const [managerForExisting, setManagerForExisting] = useState(null);
    const [existingClientsSearch, setExistingClientsSearch] = useState('');

    const unassignedClients = useMemo(() => {
        return clients.filter(c => !c.raw?.assigned_financial_manager_email && c.isActive);
    }, [clients]);

    const filteredUnassigned = useMemo(() => {
        if (!searchTerm) return unassignedClients;
        return unassignedClients.filter(c => 
            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [unassignedClients, searchTerm]);

    const handleAssignClient = async (client, managerEmail) => {
        try {
            if (client.source === 'onboarding') {
                await base44.entities.OnboardingRequest.update(client.id, { 
                    assigned_financial_manager_email: managerEmail 
                });
            } else {
                await base44.entities.User.update(client.id, { 
                    assigned_financial_manager_email: managerEmail 
                });
            }
            onAssignmentChange();
        } catch (error) {
            console.error('Error assigning:', error);
            alert('שגיאה בשיוך לקוח');
        }
    };

    const handleUnassignClient = async (client) => {
        try {
            if (client.source === 'onboarding') {
                await base44.entities.OnboardingRequest.update(client.id, { 
                    assigned_financial_manager_email: null 
                });
            } else {
                await base44.entities.User.update(client.id, { 
                    assigned_financial_manager_email: null 
                });
            }
            onAssignmentChange();
        } catch (error) {
            console.error('Error unassigning:', error);
            alert('שגיאה בהסרת שיוך');
        }
    };

    const handleAddAsSecondary = async (client, managerEmail) => {
        try {
            const currentAdditional = client.raw?.additional_assigned_financial_manager_emails || [];
            if (currentAdditional.includes(managerEmail)) {
                alert('מנהל זה כבר משויך ללקוח');
                return;
            }
            
            const updatedAdditional = [...currentAdditional, managerEmail];
            
            if (client.source === 'onboarding') {
                await base44.entities.OnboardingRequest.update(client.id, { 
                    additional_assigned_financial_manager_emails: updatedAdditional 
                });
            } else {
                await base44.entities.User.update(client.id, { 
                    additional_assigned_financial_manager_emails: updatedAdditional 
                });
            }
            onAssignmentChange();
        } catch (error) {
            console.error('Error adding secondary manager:', error);
            alert('שגיאה בשיוך מנהל משני');
        }
    };

    const handleRemoveSecondary = async (client, managerEmail) => {
        try {
            const currentAdditional = client.raw?.additional_assigned_financial_manager_emails || [];
            const updatedAdditional = currentAdditional.filter(email => email !== managerEmail);
            
            if (client.source === 'onboarding') {
                await base44.entities.OnboardingRequest.update(client.id, { 
                    additional_assigned_financial_manager_emails: updatedAdditional 
                });
            } else {
                await base44.entities.User.update(client.id, { 
                    additional_assigned_financial_manager_emails: updatedAdditional 
                });
            }
            onAssignmentChange();
        } catch (error) {
            console.error('Error removing secondary manager:', error);
            alert('שגיאה בהסרת מנהל משני');
        }
    };

    const activeClientsForModal = useMemo(() => {
        if (!managerForExisting) return [];
        return clients.filter(c => c.isActive);
    }, [clients, managerForExisting]);

    const filteredExistingClients = useMemo(() => {
        if (!existingClientsSearch) return activeClientsForModal;
        return activeClientsForModal.filter(c =>
            c.name?.toLowerCase().includes(existingClientsSearch.toLowerCase()) ||
            c.email?.toLowerCase().includes(existingClientsSearch.toLowerCase())
        );
    }, [activeClientsForModal, existingClientsSearch]);

    return (
        <div className="space-y-6" dir="rtl">
            {/* Unassigned Clients Pool */}
            <Card className="card-horizon">
                <CardHeader className="border-b border-horizon">
                    <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                        <UserX className="w-5 h-5 text-red-400" />
                        לקוחות ללא שיוך ({unassignedClients.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                            <Input
                                placeholder="חפש לקוח..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-horizon-dark border-horizon text-horizon-text pr-10"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                        {filteredUnassigned.map(client => (
                            <div
                                key={client.id}
                                className="p-3 bg-horizon-card/50 rounded-lg border border-horizon hover:border-red-400/50 transition-all"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-horizon-text text-sm truncate">{client.name}</p>
                                        <p className="text-xs text-horizon-accent truncate">{client.email}</p>
                                        {client.raw?.business_type && (
                                            <Badge variant="outline" className="mt-1 text-xs">
                                                {client.raw.business_type}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {selectedManager && (
                                    <Button
                                        onClick={() => handleAssignClient(client, selectedManager.email)}
                                        size="sm"
                                        className="w-full mt-3 bg-horizon-primary hover:bg-horizon-primary/90 text-white"
                                    >
                                        <ArrowRight className="w-3 h-3 ml-1" />
                                        שייך ל-{selectedManager.full_name?.split(' ')[0]}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                    {filteredUnassigned.length === 0 && (
                        <div className="text-center py-8 text-horizon-accent">
                            <p className="text-sm">אין לקוחות ללא שיוך</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Managers with their clients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {financialManagers.map(manager => {
                    const primaryClients = clients.filter(c => 
                        c.raw?.assigned_financial_manager_email === manager.email && c.isActive
                    );
                    const secondaryClients = clients.filter(c => 
                        c.raw?.additional_assigned_financial_manager_emails?.includes(manager.email) && c.isActive
                    );
                    const totalClients = primaryClients.length + secondaryClients.length;
                    const isSelected = selectedManager?.email === manager.email;

                    return (
                        <Card 
                            key={manager.email} 
                            className={`card-horizon transition-all ${isSelected ? 'ring-2 ring-horizon-primary' : ''}`}
                        >
                            <CardHeader className="border-b border-horizon">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-horizon-primary flex items-center justify-center">
                                            <span className="text-white font-bold text-xl">
                                                {manager.full_name?.charAt(0) || 'M'}
                                            </span>
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg text-horizon-text">{manager.full_name}</CardTitle>
                                            <p className="text-xs text-horizon-accent">{manager.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge className="bg-horizon-primary/20 text-horizon-primary">
                                            {primaryClients.length} ראשי
                                        </Badge>
                                        {secondaryClients.length > 0 && (
                                            <Badge className="bg-horizon-secondary/20 text-horizon-secondary">
                                                {secondaryClients.length} משני
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                    {/* Primary Clients Section */}
                                    {primaryClients.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-px flex-1 bg-horizon-primary/30"></div>
                                                <p className="text-xs font-semibold text-horizon-primary">מנהל ראשי</p>
                                                <div className="h-px flex-1 bg-horizon-primary/30"></div>
                                            </div>
                                            <div className="space-y-2">
                                                {primaryClients.map(client => (
                                                    <div
                                                        key={client.id}
                                                        className="p-3 bg-horizon-primary/10 rounded-lg border border-horizon-primary/30 hover:border-horizon-primary/50 transition-all group"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-horizon-text text-sm truncate">{client.name}</p>
                                                                <p className="text-xs text-horizon-accent truncate">{client.email}</p>
                                                                {client.raw?.business_type && (
                                                                    <Badge variant="outline" className="mt-1 text-xs">
                                                                        {client.raw.business_type}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <Button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUnassignClient(client);
                                                                }}
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                                                            >
                                                                <UserX className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Secondary Clients Section */}
                                    {secondaryClients.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-px flex-1 bg-horizon-secondary/30"></div>
                                                <p className="text-xs font-semibold text-horizon-secondary">מנהל משני</p>
                                                <div className="h-px flex-1 bg-horizon-secondary/30"></div>
                                            </div>
                                            <div className="space-y-2">
                                                {secondaryClients.map(client => (
                                                    <div
                                                        key={client.id}
                                                        className="p-3 bg-horizon-secondary/10 rounded-lg border border-horizon-secondary/30 hover:border-horizon-secondary/50 transition-all group"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-horizon-text text-sm truncate">{client.name}</p>
                                                                <p className="text-xs text-horizon-accent truncate">{client.email}</p>
                                                                {client.raw?.business_type && (
                                                                    <Badge variant="outline" className="mt-1 text-xs">
                                                                        {client.raw.business_type}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <Button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveSecondary(client, manager.email);
                                                                }}
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                                                            >
                                                                <UserX className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {totalClients === 0 && (
                                        <div className="text-center py-8 text-horizon-accent">
                                            <UserX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">אין לקוחות משויכים</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    {unassignedClients.length > 0 && (
                                        <Button
                                            onClick={() => setSelectedManager(isSelected ? null : manager)}
                                            variant={isSelected ? "default" : "outline"}
                                            className={`flex-1 ${isSelected ? 'bg-horizon-primary text-white' : 'border-horizon-primary text-horizon-primary'}`}
                                        >
                                            {isSelected ? 'בוטל - לחץ על לקוח למעלה' : 'שייך לקוחות חדשים'}
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => {
                                            setManagerForExisting(manager);
                                            setShowAssignToExistingModal(true);
                                        }}
                                        variant="outline"
                                        className="flex-1 border-horizon-secondary text-horizon-secondary hover:bg-horizon-secondary/10"
                                    >
                                        <UserPlus className="w-4 h-4 ml-2" />
                                        שייך ללקוחות קיימים
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Assign to Existing Clients Modal */}
            {showAssignToExistingModal && managerForExisting && (
                <Dialog open={showAssignToExistingModal} onOpenChange={setShowAssignToExistingModal}>
                    <DialogContent className="max-w-2xl bg-horizon-dark border-horizon" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-xl text-horizon-text flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-horizon-secondary" />
                                שיוך {managerForExisting.full_name} ללקוחות קיימים
                            </DialogTitle>
                            <DialogDescription className="text-horizon-accent">
                                בחר לקוחות לשיוך {managerForExisting.full_name} כמנהל משני
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                                <Input
                                    placeholder="חפש לקוח..."
                                    value={existingClientsSearch}
                                    onChange={(e) => setExistingClientsSearch(e.target.value)}
                                    className="bg-horizon-card border-horizon text-horizon-text pr-10"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto">
                                {filteredExistingClients.map(client => {
                                    const isPrimary = client.raw?.assigned_financial_manager_email === managerForExisting.email;
                                    const isSecondary = client.raw?.additional_assigned_financial_manager_emails?.includes(managerForExisting.email);
                                    const isAlreadyAssigned = isPrimary || isSecondary;
                                    
                                    return (
                                        <div
                                            key={client.id}
                                            className={`p-4 rounded-lg border transition-all ${
                                                isAlreadyAssigned 
                                                    ? 'border-green-500/50 bg-green-500/10' 
                                                    : 'border-horizon bg-horizon-card/50 hover:border-horizon-secondary/50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-horizon-text">{client.name}</p>
                                                    <p className="text-xs text-horizon-accent truncate">{client.email}</p>
                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                        {client.raw?.business_type && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {client.raw.business_type}
                                                            </Badge>
                                                        )}
                                                        {isPrimary && (
                                                            <Badge className="bg-horizon-primary/20 text-horizon-primary text-xs">
                                                                מנהל ראשי
                                                            </Badge>
                                                        )}
                                                        {isSecondary && (
                                                            <Badge className="bg-horizon-secondary/20 text-horizon-secondary text-xs">
                                                                מנהל משני
                                                            </Badge>
                                                        )}
                                                        {client.raw?.assigned_financial_manager_email && !isPrimary && (
                                                            <Badge variant="outline" className="text-xs">
                                                                מנהל ראשי: {financialManagers.find(fm => fm.email === client.raw.assigned_financial_manager_email)?.full_name || 'אחר'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    {isPrimary ? (
                                                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                                                            משויך כראשי
                                                        </Badge>
                                                    ) : isSecondary ? (
                                                        <Button
                                                            onClick={() => handleRemoveSecondary(client, managerForExisting.email)}
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-red-500 text-red-400 hover:bg-red-500/10"
                                                        >
                                                            הסר שיוך
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            onClick={() => handleAddAsSecondary(client, managerForExisting.email)}
                                                            size="sm"
                                                            className="bg-horizon-secondary hover:bg-horizon-secondary/90 text-white"
                                                        >
                                                            <UserPlus className="w-3 h-3 ml-1" />
                                                            שייך כמשני
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {filteredExistingClients.length === 0 && (
                                <div className="text-center py-8 text-horizon-accent">
                                    <p className="text-sm">לא נמצאו לקוחות</p>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-4 border-t border-horizon">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setShowAssignToExistingModal(false);
                                        setManagerForExisting(null);
                                        setExistingClientsSearch('');
                                    }}
                                    className="border-horizon text-horizon-text"
                                >
                                    סגור
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}