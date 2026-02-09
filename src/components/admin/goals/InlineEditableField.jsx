import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function InlineEditableField({ 
  value, 
  onSave, 
  type = 'text', 
  className = '',
  displayValue = null,
  placeholder = '',
  multiline = false 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        handleSave();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, editValue]);

  const handleSave = async (valueToSave) => {
    const finalValue = valueToSave !== undefined ? valueToSave : editValue;
    if (finalValue !== value) {
      await onSave(finalValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div 
        onClick={() => setIsEditing(true)}
        className={`cursor-pointer hover:bg-horizon-primary/10 rounded px-2 py-1 transition-colors ${className}`}
        title="לחץ לעריכה"
      >
        {displayValue || value || <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div ref={containerRef} className="flex items-center gap-1">
        <Popover open={isEditing} onOpenChange={(open) => !open && handleCancel()}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-horizon-card border-horizon-primary">
              <CalendarIcon className="w-3 h-3 ml-1" />
              {editValue ? format(new Date(editValue), 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon">
            <Calendar
              mode="single"
              selected={editValue ? new Date(editValue) : undefined}
              onSelect={(date) => {
                if (date) {
                  const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  setEditValue(formatted);
                  handleSave(formatted);
                }
              }}
              locale={he}
              className="text-horizon-text"
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-6 w-6 text-red-400"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      {multiline ? (
        <Textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-horizon-card border-horizon-primary text-horizon-text min-h-[60px] text-sm"
          placeholder={placeholder}
        />
      ) : (
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-horizon-card border-horizon-primary text-horizon-text h-8 text-sm"
          placeholder={placeholder}
        />
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSave}
        className="h-6 w-6 text-green-400"
      >
        <Check className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="h-6 w-6 text-red-400"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}