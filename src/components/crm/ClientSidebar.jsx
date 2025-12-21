import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Search } from "lucide-react";
import ClientCard from './ClientCard';

export default function ClientSidebar({ 
  clients, 
  selectedClient, 
  onSelectClient, 
  onOpenSettings,
  isCollapsed,
  onToggleCollapse
}) {
  const [groupFilter, setGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client => {
    const matchesGroup = groupFilter === 'all' || client.customer_group === groupFilter;
    const matchesSearch = !searchTerm || 
      (client.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  if (isCollapsed) {
    return (
      <div className="w-12 bg-horizon-card border-l border-horizon flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-horizon-accent hover:text-horizon-primary"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-horizon-card border-l border-horizon flex flex-col h-full">
      <div className="p-4 border-b border-horizon">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-horizon-text">לקוחות</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-horizon-accent hover:text-horizon-primary"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
          <Input
            placeholder="חפש לקוח..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-3 pl-10 bg-horizon-dark border-horizon text-horizon-text text-right"
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={groupFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setGroupFilter('all')}
            className={groupFilter === 'all' ? 'bg-horizon-primary text-white' : 'border-horizon text-horizon-accent'}
          >
            הכל
          </Button>
          <Button
            size="sm"
            variant={groupFilter === 'A' ? 'default' : 'outline'}
            onClick={() => setGroupFilter('A')}
            className={groupFilter === 'A' ? 'bg-[#32acc1] text-white' : 'border-[#32acc1] text-[#32acc1]'}
          >
            A
          </Button>
          <Button
            size="sm"
            variant={groupFilter === 'B' ? 'default' : 'outline'}
            onClick={() => setGroupFilter('B')}
            className={groupFilter === 'B' ? 'bg-[#fc9f67] text-white' : 'border-[#fc9f67] text-[#fc9f67]'}
          >
            B
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredClients.length === 0 ? (
          <div className="text-center text-horizon-accent text-sm py-8">
            לא נמצאו לקוחות
          </div>
        ) : (
          filteredClients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              isSelected={selectedClient?.id === client.id}
              onSelect={() => onSelectClient(client)}
              onSettings={onOpenSettings}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t border-horizon text-center text-xs text-horizon-accent">
        {filteredClients.length} לקוחות
      </div>
    </div>
  );
}