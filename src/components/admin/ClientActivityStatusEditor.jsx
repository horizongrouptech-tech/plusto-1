import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Save, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

import { toast } from "sonner";
export default function ClientActivityStatusEditor({ customer, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    is_active: customer.is_active ?? true,
    activity_start_date: customer.activity_start_date || '',
    activity_end_date: customer.activity_end_date || ''
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.entities.OnboardingRequest.update(customer.id, {
        is_active: editData.is_active,
        activity_start_date: editData.activity_start_date || null,
        activity_end_date: editData.activity_end_date || null
      });
      if (onUpdate) {
        await onUpdate();
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating activity status:", error);
      toast.error('שגיאה בעדכון סטטוס הפעילות');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      is_active: customer.is_active ?? true,
      activity_start_date: customer.activity_start_date || '',
      activity_end_date: customer.activity_end_date || ''
    });
    setIsEditing(false);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'לא הוגדר';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: he });
    } catch {
      return dateStr;
    }
  };

  if (isEditing) {
    return (
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-lg text-horizon-text">עריכת סטטוס פעילות לקוח</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-horizon-text">סטטוס פעילות</label>
            <div className="flex gap-3">
              <Button
                onClick={() => setEditData({ ...editData, is_active: true })}
                variant={editData.is_active ? "default" : "outline"}
                className={editData.is_active ? "btn-horizon-primary" : "border-horizon text-horizon-text"}
              >
                <CheckCircle className="w-4 h-4 ml-2" />
                פעיל
              </Button>
              <Button
                onClick={() => setEditData({ ...editData, is_active: false })}
                variant={!editData.is_active ? "default" : "outline"}
                className={!editData.is_active ? "bg-red-500 hover:bg-red-600 text-white" : "border-horizon text-horizon-text"}
              >
                <XCircle className="w-4 h-4 ml-2" />
                לא פעיל
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-horizon-text">תאריך תחילת פעילות</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right bg-horizon-card border-horizon text-horizon-text">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {editData.activity_start_date ? formatDateDisplay(editData.activity_start_date) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon" align="start" dir="rtl">
                  <Calendar
                    mode="single"
                    selected={editData.activity_start_date ? new Date(editData.activity_start_date) : undefined}
                    onSelect={(date) => setEditData({ 
                      ...editData, 
                      activity_start_date: date ? format(date, 'yyyy-MM-dd') : '' 
                    })}
                    locale={he}
                    className="text-horizon-text"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-horizon-text">תאריך סיום פעילות</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right bg-horizon-card border-horizon text-horizon-text">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {editData.activity_end_date ? formatDateDisplay(editData.activity_end_date) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-horizon-card border-horizon" align="start" dir="rtl">
                  <Calendar
                    mode="single"
                    selected={editData.activity_end_date ? new Date(editData.activity_end_date) : undefined}
                    onSelect={(date) => setEditData({ 
                      ...editData, 
                      activity_end_date: date ? format(date, 'yyyy-MM-dd') : '' 
                    })}
                    locale={he}
                    className="text-horizon-text"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={handleCancel} variant="outline" className="border-horizon text-horizon-text" disabled={isSaving}>
              ביטול
            </Button>
            <Button onClick={handleSave} className="btn-horizon-primary" disabled={isSaving}>
              {isSaving ? 'שומר...' : <><Save className="w-4 h-4 ml-2" />שמור</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-horizon">
      <CardHeader>
        <CardTitle className="text-lg text-horizon-text flex items-center justify-between">
          <span>סטטוס פעילות לקוח</span>
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10">
            ערוך
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-horizon-accent">סטטוס:</span>
          <Badge className={customer.is_active ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
            {customer.is_active ? 'פעיל' : 'לא פעיל'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-horizon-accent">תחילת פעילות:</span>
          <span className="text-sm text-horizon-text">{formatDateDisplay(customer.activity_start_date)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-horizon-accent">סיום פעילות:</span>
          <span className="text-sm text-horizon-text">{formatDateDisplay(customer.activity_end_date)}</span>
        </div>
      </CardContent>
    </Card>
  );
}