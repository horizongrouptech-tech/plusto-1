import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientList({ clients, onSelectClient, selectedClientId }) {
  const [searchTerm, setSearchTerm] = React.useState('');

  // סינון לקוחות לפי חיפוש
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter(client => 
      client.business_name?.toLowerCase().includes(term) ||
      client.full_name?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  // פונקציה לקבלת צבע וטקסט לקבוצה
  const getGroupDisplay = (group) => {
    if (!group) return null;
    
    const groupConfig = {
      'A': {
        label: 'קבוצה A',
        days: 'א׳ + ד׳',
        bgColor: 'bg-blue-500',
        textColor: 'text-white',
        borderColor: 'border-blue-500'
      },
      'B': {
        label: 'קבוצה B',
        days: 'ב׳ + ה׳',
        bgColor: 'bg-purple-500',
        textColor: 'text-white',
        borderColor: 'border-purple-500'
      }
    };

    return groupConfig[group] || null;
  };

  return (
    <Card className="card-horizon h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-horizon-text text-right">
          <Users className="w-5 h-5 text-horizon-primary" />
          הלקוחות שלי ({filteredClients.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* שדה חיפוש */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
          <Input
            type="text"
            placeholder="חיפוש לקוח..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-horizon-card border-horizon text-horizon-text"
            dir="rtl"
          />
        </div>

        {/* רשימת לקוחות */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-horizon-accent">
              {searchTerm ? 'לא נמצאו לקוחות תואמים' : 'אין לקוחות להצגה'}
            </div>
          ) : (
            filteredClients.map((client) => {
              const groupDisplay = getGroupDisplay(client.customer_group);
              const isSelected = client.id === selectedClientId;

              return (
                <button
                  key={client.id}
                  onClick={() => onSelectClient?.(client)}
                  className={cn(
                    "w-full p-3 rounded-lg border transition-all text-right",
                    "hover:border-horizon-primary hover:bg-horizon-primary/5",
                    isSelected 
                      ? "border-horizon-primary bg-horizon-primary/10" 
                      : "border-horizon bg-horizon-card"
                  )}
                  dir="rtl"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* מידע על הלקוח - מימין */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="font-semibold text-horizon-text truncate">
                        {client.business_name || client.full_name}
                      </div>
                      <div className="text-sm text-horizon-accent truncate mt-0.5">
                        {client.email}
                      </div>
                      {client.business_type && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-horizon-accent">
                          <Building2 className="w-3 h-3" />
                          <span>{client.business_type}</span>
                        </div>
                      )}
                    </div>

                    {/* תצוגת קבוצה - משמאל */}
                    {groupDisplay && (
                      <div className="flex-shrink-0">
                        <div 
                          className={cn(
                            "px-3 py-1.5 rounded-lg border-2",
                            groupDisplay.bgColor,
                            groupDisplay.borderColor,
                            "shadow-sm"
                          )}
                        >
                          <div className={cn("font-bold text-sm", groupDisplay.textColor)}>
                            {groupDisplay.label}
                          </div>
                          <div className={cn("flex items-center gap-1 text-xs mt-0.5", groupDisplay.textColor)}>
                            <Calendar className="w-3 h-3" />
                            <span>{groupDisplay.days}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}