import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle } from 'lucide-react';
import { toast } from "sonner";

export default function MeetingSummaryForm({ onSave, onCancel, initialCategory = '' }) {
  const categories = [
    { id: 'decision', label: 'החלטה', color: 'bg-blue-500/20 text-blue-400' },
    { id: 'action', label: 'פעולה נדרשת', color: 'bg-green-500/20 text-green-400' },
    { id: 'insight', label: 'תובנה', color: 'bg-purple-500/20 text-purple-400' },
    { id: 'follow_up', label: 'עקיבה', color: 'bg-orange-500/20 text-orange-400' },
    { id: 'risk', label: 'סיכון', color: 'bg-red-500/20 text-red-400' }
  ];

  const [itemName, setItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'decision');
  const [keyPoints, setKeyPoints] = useState([]);

  const handleAddPoint = () => {
    if (!itemName.trim()) {
      toast.warning('נא להזין נקודה');
      return;
    }

    if (keyPoints.length >= 5) {
      toast.warning('ניתן להוסיף עד 5 נקודות בלבד');
      return;
    }

    // Auto-populate name with category if not provided
    const name = itemName.trim() || categories.find(c => c.id === selectedCategory)?.label;
    
    setKeyPoints([...keyPoints, {
      id: Date.now(),
      text: name,
      category: selectedCategory
    }]);
    setItemName('');
  };

  const handleRemovePoint = (id) => {
    setKeyPoints(keyPoints.filter(p => p.id !== id));
  };

  const handleSave = () => {
    if (keyPoints.length === 0) {
      toast.warning('נא להוסיף לפחות נקודה אחת');
      return;
    }
    onSave(keyPoints);
  };

  const canAddMore = keyPoints.length < 5;

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-horizon-text">יצירת סיכום פגישה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Selection */}
        <div>
          <Label className="text-horizon-text block mb-3">קטגוריה</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setItemName(''); // Auto-clear for new category
                }}
                className={`px-3 py-2 rounded-lg transition-all ${
                  selectedCategory === cat.id
                    ? `${cat.color} ring-2 ring-offset-1 ring-horizon-primary`
                    : 'bg-horizon-card border border-horizon'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input with auto-population hint */}
        <div>
          <Label className="text-horizon-text mb-2 block">
            תוכן הנקודה
            <span className="text-xs text-horizon-accent ml-2">
              (פוך להשאיר ריק כדי להשתמש בשם הקטגוריה)
            </span>
          </Label>
          <div className="flex gap-2">
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPoint()}
              placeholder={`לדוגמה: ${categories.find(c => c.id === selectedCategory)?.label}`}
              className="bg-horizon-card border-horizon text-horizon-text"
            />
            <Button
              onClick={handleAddPoint}
              disabled={!canAddMore}
              className={canAddMore ? 'btn-horizon-primary' : 'opacity-50 cursor-not-allowed'}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Points Counter */}
        <div className="flex items-center justify-between p-3 bg-horizon-card/50 rounded-lg">
          <span className="text-sm text-horizon-accent">
            {keyPoints.length}/5 נקודות
          </span>
          {!canAddMore && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
              הגיע למקסימום
            </Badge>
          )}
        </div>

        {/* Key Points List */}
        {keyPoints.length > 0 && (
          <div className="space-y-2">
            <Label className="text-horizon-text">נקודות הסיכום:</Label>
            {keyPoints.map((point) => {
              const category = categories.find(c => c.id === point.category);
              return (
                <div
                  key={point.id}
                  className="flex items-center justify-between p-3 bg-horizon-card rounded-lg border border-horizon"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Badge className={`${category?.color} text-xs`}>
                      {category?.label}
                    </Badge>
                    <span className="text-horizon-text text-sm">{point.text}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePoint(point.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t border-horizon">
          <Button onClick={onCancel} variant="outline" className="border-horizon text-horizon-text">
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={keyPoints.length === 0}
            className="btn-horizon-primary"
          >
            שמור סיכום
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}