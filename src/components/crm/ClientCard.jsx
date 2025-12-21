import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function ClientCard({ client, isSelected, onSelect, onSettings }) {
  const getGroupBadgeColor = (group) => {
    if (group === 'A') return 'bg-[#32acc1] text-white';
    if (group === 'B') return 'bg-[#fc9f67] text-white';
    return 'bg-gray-500 text-white';
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'bg-horizon-primary/10 border-horizon-primary shadow-md'
          : 'bg-horizon-card border-horizon hover:border-horizon-primary/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 text-right">
          <h4 className="font-semibold text-horizon-text text-sm truncate">
            {client.business_name || client.full_name}
          </h4>
        </div>
        <Badge className={`${getGroupBadgeColor(client.customer_group)} text-xs px-2 py-0.5`}>
          {client.customer_group}
        </Badge>
      </div>
      <p className="text-xs text-horizon-accent mb-1 truncate text-right">
        {client.full_name}
      </p>
      <div className="flex justify-between items-center mt-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onSettings(client);
          }}
          className="h-7 w-7 text-horizon-accent hover:text-horizon-primary"
        >
          <Settings className="w-4 h-4" />
        </Button>
        <span className="text-xs text-horizon-accent">
          {client.business_type || 'other'}
        </span>
      </div>
    </div>
  );
}