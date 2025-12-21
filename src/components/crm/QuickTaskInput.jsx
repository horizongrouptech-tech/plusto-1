import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export default function QuickTaskInput({ customerEmail, assigneeEmail, onTaskCreated }) {
  const [taskName, setTaskName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim() || !customerEmail) return;

    setIsCreating(true);
    try {
      await onTaskCreated({
        name: taskName.trim(),
        customer_email: customerEmail,
        assignee_email: assigneeEmail,
        end_date: new Date().toISOString().split('T')[0],
        start_date: new Date().toISOString().split('T')[0],
        status: 'open',
        task_type: 'one_time',
        is_active: true
      });
      setTaskName('');
    } catch (error) {
      console.error('Error creating task:', error);
      alert('שגיאה ביצירת המשימה');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Button
        type="submit"
        size="icon"
        disabled={!taskName.trim() || isCreating}
        className="bg-horizon-primary hover:bg-horizon-primary/90 h-9 w-9"
      >
        {isCreating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </Button>
      <Input
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="הוסף משימה מהירה..."
        disabled={isCreating}
        className="flex-1 bg-horizon-card border-horizon text-horizon-text text-right"
      />
    </form>
  );
}