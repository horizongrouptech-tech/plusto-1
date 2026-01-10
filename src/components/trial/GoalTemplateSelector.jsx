import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Target, Loader2, Search, Plus, CheckCircle } from 'lucide-react';

export default function GoalTemplateSelector({ customer, isOpen, onClose, onGoalCreated }) {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [customization, setCustomization] = useState({
        name: '',
        notes: '',
        end_date: '',
        duration_days: 30
    });
    const [isCreating, setIsCreating] = useState(false);

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['goalTemplates'],
        queryFn: () => base44.entities.GoalTemplate.filter({ is_active: true }, '-usage_count'),
        enabled: isOpen
    });

    const categoryLabels = {
        financial: 'פיננסי',
        operational: 'תפעולי',
        marketing: 'שיווק',
        sales: 'מכירות',
        hr: 'משאבי אנוש',
        strategic: 'אסטרטגי',
        other: 'אחר'
    };

    const filteredTemplates = templates.filter(t => 
        !searchTerm || 
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (template.estimated_duration_days || 30));
        
        setCustomization({
            name: template.name,
            notes: template.description || '',
            end_date: endDate.toISOString().split('T')[0],
            duration_days: template.estimated_duration_days || 30
        });
    };

    const handleCreateGoal = async () => {
        if (!selectedTemplate || !customization.name.trim()) {
            alert('נא לבחור תבנית ולהזין שם ליעד');
            return;
        }

        setIsCreating(true);
        try {
            const existingGoals = await base44.entities.CustomerGoal.filter({
                customer_email: customer.email
            });
            const newOrderIndex = existingGoals.filter(g => !g.parent_id).length;

            const newGoal = await base44.entities.CustomerGoal.create({
                customer_email: customer.email,
                name: customization.name.trim(),
                notes: customization.notes,
                status: 'open',
                end_date: customization.end_date,
                success_metrics: selectedTemplate.success_metrics,
                order_index: newOrderIndex,
                task_type: 'goal'
            });

            // יצירת תת-משימות אם קיימות
            if (selectedTemplate.action_steps && selectedTemplate.action_steps.length > 0) {
                const startDate = new Date();
                const subtaskPromises = selectedTemplate.action_steps.map((step, idx) => {
                    const taskDate = new Date(startDate);
                    taskDate.setDate(taskDate.getDate() + Math.floor((customization.duration_days / selectedTemplate.action_steps.length) * idx));
                    
                    return base44.entities.CustomerGoal.create({
                        customer_email: customer.email,
                        parent_id: newGoal.id,
                        name: step,
                        status: 'open',
                        end_date: taskDate.toISOString().split('T')[0],
                        order_index: idx,
                        is_active: true
                    });
                });
                await Promise.all(subtaskPromises);
            }

            // עדכון מונה השימוש בתבנית
            await base44.entities.GoalTemplate.update(selectedTemplate.id, {
                usage_count: (selectedTemplate.usage_count || 0) + 1
            });

            queryClient.invalidateQueries(['goalTemplates']);
            onGoalCreated();
            onClose();
            alert('יעד נוצר בהצלחה מהתבנית!');
        } catch (error) {
            console.error('Error creating goal from template:', error);
            alert('שגיאה ביצירת יעד: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-xl text-horizon-text flex items-center gap-2">
                        <Target className="w-5 h-5 text-horizon-primary" />
                        בחר יעד מבנק היעדים
                    </DialogTitle>
                </DialogHeader>

                {!selectedTemplate ? (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                            <Input
                                placeholder="חיפוש תבניות..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-10 bg-horizon-card border-horizon text-horizon-text"
                            />
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="text-center py-12">
                                <Target className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
                                <p className="text-horizon-accent">אין תבניות זמינות</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
                                {filteredTemplates.map(template => (
                                    <Card 
                                        key={template.id} 
                                        className="bg-horizon-card border-2 border-horizon hover:border-horizon-primary cursor-pointer transition-all hover:shadow-lg"
                                        onClick={() => handleSelectTemplate(template)}
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-horizon-text mb-2">{template.name}</h3>
                                                    <Badge className="text-xs bg-horizon-primary/20 text-horizon-primary border border-horizon-primary/30 font-medium px-3 py-1">
                                                        {categoryLabels[template.category]}
                                                    </Badge>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-xs text-horizon-accent/70">שימושים</div>
                                                    <div className="text-xl font-bold text-horizon-primary">{template.usage_count || 0}</div>
                                                </div>
                                            </div>
                                            {template.description && (
                                                <p className="text-sm text-horizon-accent leading-relaxed mb-3 border-r-2 border-horizon-primary/30 pr-3">
                                                    {template.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-horizon-accent/70 bg-horizon-primary/5 px-3 py-2 rounded-lg">
                                                <span className="font-medium">משך משוער:</span>
                                                <span className="font-bold text-horizon-primary">{template.estimated_duration_days || 30} ימים</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Card className="bg-horizon-card border-horizon">
                            <CardContent className="p-4">
                                <h3 className="font-bold text-horizon-text mb-2">{selectedTemplate.name}</h3>
                                <Badge className="text-xs bg-horizon-primary/20 text-horizon-primary mb-3">
                                    {categoryLabels[selectedTemplate.category]}
                                </Badge>
                                {selectedTemplate.description && (
                                    <p className="text-sm text-horizon-accent mb-3">{selectedTemplate.description}</p>
                                )}
                                {selectedTemplate.action_steps && selectedTemplate.action_steps.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-horizon">
                                        <p className="text-sm font-medium text-horizon-text mb-2">שלבי ביצוע:</p>
                                        <ul className="text-sm text-horizon-accent space-y-1 pr-5 list-disc">
                                            {selectedTemplate.action_steps.map((step, idx) => (
                                                <li key={idx}>{step}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-3 bg-horizon-card/30 p-4 rounded-lg">
                            <h4 className="font-medium text-horizon-text">התאמה אישית</h4>
                            
                            <div>
                                <label className="text-sm text-horizon-accent block mb-1">שם היעד</label>
                                <Input
                                    value={customization.name}
                                    onChange={(e) => setCustomization({ ...customization, name: e.target.value })}
                                    className="bg-horizon-card border-horizon text-horizon-text"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-horizon-accent block mb-1">הערות נוספות</label>
                                <Textarea
                                    value={customization.notes}
                                    onChange={(e) => setCustomization({ ...customization, notes: e.target.value })}
                                    className="bg-horizon-card border-horizon text-horizon-text"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-horizon-accent block mb-1">תאריך יעד</label>
                                    <Input
                                        type="date"
                                        value={customization.end_date}
                                        onChange={(e) => setCustomization({ ...customization, end_date: e.target.value })}
                                        className="bg-horizon-card border-horizon text-horizon-text"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-horizon-accent block mb-1">משך (ימים)</label>
                                    <Input
                                        type="number"
                                        value={customization.duration_days}
                                        onChange={(e) => {
                                            const days = parseInt(e.target.value) || 30;
                                            const endDate = new Date();
                                            endDate.setDate(endDate.getDate() + days);
                                            setCustomization({ 
                                                ...customization, 
                                                duration_days: days,
                                                end_date: endDate.toISOString().split('T')[0]
                                            });
                                        }}
                                        className="bg-horizon-card border-horizon text-horizon-text"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedTemplate(null)}
                                className="border-horizon text-horizon-accent"
                            >
                                חזור לרשימה
                            </Button>
                            <Button
                                onClick={handleCreateGoal}
                                disabled={isCreating}
                                className="btn-horizon-primary"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                        יוצר...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 ml-2" />
                                        צור יעד
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}