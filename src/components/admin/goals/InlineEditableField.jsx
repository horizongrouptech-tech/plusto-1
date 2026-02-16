import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parse, isValid } from 'date-fns';
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const popoverContentRef = useRef(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = useCallback(async (valueToSave) => {
    if (isSavingRef.current) return; // Prevent concurrent saves
    isSavingRef.current = true;
    
    try {
      const finalValue = valueToSave !== undefined ? valueToSave : editValue;
      if (finalValue !== value) {
        await onSave(finalValue);
      }
      setIsEditing(false);
    } finally {
      isSavingRef.current = false;
    }
  }, [editValue, value, onSave]);

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
      if (popoverContentRef.current?.contains(event.target)) return;
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
  }, [isEditing, handleSave]);

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
    const normalizeDateInput = (input) => {
      if (!input || !input.trim()) return null;
      const s = input.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      try {
        const parsed = parse(s, 'dd/MM/yyyy', new Date(), { locale: he });
        if (isValid(parsed)) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch (_) {}
      return null;
    };

    const displayDateForInput = (val) => {
      if (!val) return '';
      try {
        const d = new Date(val);
        if (isValid(d)) return format(d, 'dd/MM/yyyy', { locale: he });
      } catch (_) {}
      return val;
    };

    return (
      <div ref={containerRef} className="flex items-center gap-1">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <div
              className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-[7rem] bg-horizon-card border border-horizon-primary rounded-md h-8 px-2 hover:border-horizon-primary/80 transition-colors"
              onClick={() => setCalendarOpen(true)}
            >
              <Input
                ref={inputRef}
                type="text"
                value={displayDateForInput(editValue)}
                onChange={(e) => setEditValue(normalizeDateInput(e.target.value) || e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setCalendarOpen(true)}
                placeholder="DD/MM/YYYY"
                className="bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-7 px-0 text-sm w-full min-w-0 cursor-pointer"
              />
              <CalendarIcon className="w-3 h-3 shrink-0 text-horizon-primary" />
            </div>
          </PopoverTrigger>
          <PopoverContent ref={popoverContentRef} className="w-auto p-0 bg-horizon-card border-horizon">
            <Calendar
              mode="single"
              selected={editValue && isValid(new Date(editValue)) ? new Date(editValue) : undefined}
              onSelect={async (date) => {
                if (date) {
                  const formatted = format(date, 'yyyy-MM-dd');
                  setEditValue(formatted);
                  await handleSave(formatted);
                  setCalendarOpen(false);
                }
              }}
              locale={he}
              className="text-horizon-text"
            />
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" onClick={() => {
          const normalized = normalizeDateInput(editValue) || (editValue && /^\d{4}-\d{2}-\d{2}$/.test(editValue) ? editValue : null);
          if (normalized) {
            handleSave(normalized);
          } else {
            handleCancel();
          }
        }} className="h-6 w-6 text-green-400 shrink-0">
          <Check className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleCancel} className="h-6 w-6 text-red-400 shrink-0">
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
        onClick={() => handleSave()}
        className="h-6 w-6 text-green-400"
      >
        <Check className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleCancel()}
        className="h-6 w-6 text-red-400"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}