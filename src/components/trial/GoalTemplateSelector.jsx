import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Loader2, CheckCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";

export default function GoalTemplateSelector({ isOpen, onClose, onSelect, customerEmail }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['goalTemplates'],
    queryFn: () => base44.entities.GoalTemplate.filter({ is_active: true }, '-usage_count'),
    enabled: isOpen
  });

  const filteredTemplates = templates.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchTerm && !t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !t.goal_title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleSelectTemplate = async (template) => {
    try {
      // חישוב תאריכי התחלה וסיום
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (template.default_duration_days || 90));

      // יצירת היעד מהתבנית
      const newGoal = await base44.entities.CustomerGoal.create({
        customer_email: customerEmail,
        name: template.goal_title,
        notes: template.goal_description,
        success_metrics: template.success_metrics,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'open',
        task_type: 'goal',
        is_active: true
      });

      // יצירת המשימות המוצעות
      if (template.suggested_tasks && template.suggested_tasks.length > 0) {
        for (const task of template.suggested_tasks) {
          const taskStartDate = new Date();
          taskStartDate.setDate(taskStartDate.getDate() + (task.relative_days_from_start || 0));
          
          const taskEndDate = new Date(taskStartDate);
          taskEndDate.setDate(taskEndDate.getDate() + 14); // 14 יום לכל משימה

          await base44.entities.CustomerGoal.create({
            customer_email: customerEmail,
            parent_id: newGoal.id,
            name: task.task_name,
            notes: task.task_description,
            start_date: taskStartDate.toISOString().split('T')[0],
            end_date: taskEndDate.toISOString().split('T')[0],
            status: 'open',
            task_type: 'one_time',
            is_active: true
          });
        }
      }

      // עדכון מונה שימוש בתבנית
      await base44.entities.GoalTemplate.update(template.id, {
        usage_count: (template.usage_count || 0) + 1
      });

      onSelect(newGoal);
      onClose();
    } catch (error) {
      alert('שגיאה ביצירת יעד מתבנית: ' + error.message);
    }
  };

  const categories = ['כל הקטגוריות', 'כוח_אדם', 'שיווק', 'מכירות', 'תפעול', 'פיננסי', 'כללי'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-horizon-dark border-horizon max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-horizon-text flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-horizon-primary" />
            בחר יעד מבנק היעדים
          </DialogTitle>
          <p className="text-sm text-horizon-accent mt-2">
            בחר תבנית מוכנה ליצירת יעד חדש עם כל המשימות הנלוות
          </p>
        </DialogHeader>

        {/* חיפוש וסינון */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="חיפוש תבנית..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-horizon-card border-horizon text-horizon-text"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text"
          >
            <option value="all">כל הקטגוריות</option>
            <option value="כוח_אדם">כוח אדם</option>
            <option value="שיווק">שיווק</option>
            <option value="מכירות">מכירות</option>
            <option value="תפעול">תפעול</option>
            <option value="פיננסי">פיננסי</option>
            <option value="כללי">כללי</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <Card 
                key={template.id} 
                className="bg-horizon-card border-horizon hover:border-horizon-primary/50 transition-all cursor-pointer group"
                onClick={() => handleSelectTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-horizon-text group-hover:text-horizon-primary transition-colors">
                        {template.template_name}
                      </h3>
                      <Badge className="mt-1 bg-horizon-primary/20 text-horizon-primary border-horizon-primary/30 text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <CheckCircle className="w-5 h-5 text-horizon-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <p className="text-sm text-horizon-text mb-2">{template.goal_title}</p>
                  
                  {template.goal_description && (
                    <p className="text-xs text-horizon-accent line-clamp-2 mb-3">
                      {template.goal_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-horizon-accent">
                    <span>⏱ {template.default_duration_days} ימים</span>
                    {template.suggested_tasks && template.suggested_tasks.length > 0 && (
                      <span>✓ {template.suggested_tasks.length} משימות</span>
                    )}
                    <span className="text-horizon-primary">נוצל {template.usage_count || 0} פעמים</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="col-span-2 text-center py-8">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-horizon-accent opacity-50" />
                <p className="text-horizon-accent">לא נמצאו תבניות התואמות לחיפוש</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}