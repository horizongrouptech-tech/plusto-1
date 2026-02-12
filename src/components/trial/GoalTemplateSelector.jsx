import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Target, Loader2, Search, Plus, CheckCircle, Clock, ListChecks } from 'lucide-react';
import { CategoryBadge, PopularBadge } from '@/components/goals/GoalTemplateBadges';
import GoalTemplatePreview from '@/components/goals/GoalTemplatePreview';
import { toast } from "sonner";

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

    const [selectedCategory, setSelectedCategory] = useState('all');

    const categoryLabels = {
        financial: 'פיננסי',
        operational: 'תפעולי',
        marketing: 'שיווק',
        sales: 'מכירות',
        hr: 'משאבי אנוש',
        strategic: 'אסטרטגי',
        other: 'אחר'
    };

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = !searchTerm || 
            t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });

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
            toast.warning('נא לבחור תבנית ולהזין שם ליעד');
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
            toast.success('יעד נוצר בהצלחה מהתבנית!');
        } catch (error) {
            console.error('Error creating goal from template:', error);
            toast.error('שגיאה ביצירת יעד: ' + error.message);
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

                        {/* סינון קטגוריות */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory('all')}
                                className={selectedCategory === 'all' ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}
                            >
                                הכל ({templates.length})
                            </Button>
                            {Object.entries(categoryLabels).map(([key, label]) => {
                                const count = templates.filter(t => t.category === key).length;
                                if (count === 0) return null;
                                return (
                                    <Button
                                        key={key}
                                        size="sm"
                                        variant={selectedCategory === key ? 'default' : 'outline'}
                                        onClick={() => setSelectedCategory(key)}
                                        className={selectedCategory === key ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}
                                    >
                                        {label} ({count})
                                    </Button>
                                );
                            })}
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
                                        className="bg-horizon-card border-2 border-horizon hover:border-horizon-primary cursor-pointer transition-all hover:shadow-lg group"
                                        onClick={() => handleSelectTemplate(template)}
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-horizon-text mb-2 group-hover:text-horizon-primary transition-colors">
                                                        {template.name}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        <CategoryBadge category={template.category} showIcon={true} />
                                                        <PopularBadge usageCount={template.usage_count} />
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-xs text-horizon-accent/70">שימושים</div>
                                                    <div className="text-xl font-bold text-horizon-primary">{template.usage_count || 0}</div>
                                                </div>
                                            </div>
                                            {template.description && (
                                                <p className="text-sm text-horizon-accent leading-relaxed mb-3 line-clamp-2">
                                                    {template.description}
                                                </p>
                                            )}
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm bg-horizon-primary/5 px-3 py-2 rounded-lg">
                                                    <Clock className="w-4 h-4 text-horizon-primary" />
                                                    <span className="font-medium text-horizon-text">משך:</span>
                                                    <span className="font-bold text-horizon-primary">{template.estimated_duration_days || 30} ימים</span>
                                                </div>
                                                
                                                {template.action_steps && template.action_steps.length > 0 && (
                                                    <div className="flex items-center gap-2 text-xs bg-horizon-secondary/10 px-3 py-2 rounded-lg">
                                                        <ListChecks className="w-4 h-4 text-horizon-secondary" />
                                                        <span className="font-medium text-horizon-text">
                                                            {template.action_steps.length} שלבי ביצוע
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <GoalTemplatePreview template={selectedTemplate} showUsageCount={false} />

                        <div className="space-y-4 bg-horizon-card/30 p-5 rounded-lg border border-horizon">
                            <h4 className="font-semibold text-horizon-text flex items-center gap-2">
                                <Target className="w-4 h-4 text-horizon-primary" />
                                התאמה אישית
                            </h4>
                            
                            <div>
                                <label className="text-sm text-horizon-accent block mb-2 font-medium">שם היעד *</label>
                                <Input
                                    value={customization.name}
                                    onChange={(e) => setCustomization({ ...customization, name: e.target.value })}
                                    className="bg-horizon-card border-horizon text-horizon-text"
                                    placeholder="הזן שם מותאם אישית ליעד"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-horizon-accent block mb-2 font-medium">הערות נוספות</label>
                                <Textarea
                                    value={customization.notes}
                                    onChange={(e) => setCustomization({ ...customization, notes: e.target.value })}
                                    className="bg-horizon-card border-horizon text-horizon-text"
                                    rows={3}
                                    placeholder="הוסף הערות או הנחיות ספציפיות ללקוח"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-horizon-accent block mb-2 font-medium">תאריך יעד</label>
                                    <Input
                                        type="date"
                                        value={customization.end_date}
                                        onChange={(e) => setCustomization({ ...customization, end_date: e.target.value })}
                                        className="bg-horizon-card border-horizon text-horizon-text"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-horizon-accent block mb-2 font-medium">משך (ימים)</label>
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

                            {/* תצוגה מקדימה של תת-משימות */}
                            {selectedTemplate.action_steps && selectedTemplate.action_steps.length > 0 && (
                                <div className="bg-horizon-primary/5 rounded-lg p-4 border border-horizon-primary/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ListChecks className="w-4 h-4 text-horizon-secondary" />
                                        <span className="text-sm font-semibold text-horizon-text">
                                            תת-משימות שייווצרו ({selectedTemplate.action_steps.length}):
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {selectedTemplate.action_steps.map((step, idx) => {
                                            const taskDate = new Date();
                                            taskDate.setDate(taskDate.getDate() + Math.floor((customization.duration_days / selectedTemplate.action_steps.length) * idx));
                                            
                                            return (
                                                <div key={idx} className="flex items-start gap-2 text-xs bg-horizon-dark/30 p-2 rounded">
                                                    <Badge variant="outline" className="text-xs border-horizon-accent text-horizon-accent">
                                                        {taskDate.toLocaleDateString('he-IL')}
                                                    </Badge>
                                                    <span className="text-horizon-text flex-1">{step}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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