import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Users, Loader2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const getCustomerGroupBadgeColor = (group) => {
  if (group === 'A') return 'bg-[#32acc1] text-white';
  if (group === 'B') return 'bg-[#fc9f67] text-white';
  return 'bg-gray-500 text-white';
};

export default function ManagerCustomersPanel({
  customers = [],
  selectedManager,
  isCollapsed = false,
  onCollapse,
  isLoading = false,
  onOpenOverview
}) {
  const [expanded, setExpanded] = React.useState(!isCollapsed);

  return (
    <div className="flex flex-col h-full bg-horizon-dark border-r border-horizon" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-horizon">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-horizon-text flex items-center gap-2 text-right">
            <Users className="w-5 h-5 text-horizon-primary" />
            לקוחות {selectedManager && `- ${selectedManager}`}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="text-horizon-accent hover:text-horizon-text h-8 w-8"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-horizon-accent">
          סה"כ {customers.length} לקוחות
        </p>
      </div>

      {/* Customers List */}
      {expanded && (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-horizon-accent">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">אין לקוחות משויכים למנהל זה</p>
              </div>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-3 rounded-lg border border-horizon hover:border-horizon-primary/50 hover:bg-horizon-primary/5 transition-all"
                >
                  <div className="space-y-2" dir="rtl">
                    {/* Name + Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-horizon-text text-sm flex-1 truncate">
                        {customer.business_name || customer.full_name}
                      </p>
                      <Badge className={`text-xs flex-shrink-0 ${getCustomerGroupBadgeColor(customer.customer_group)}`}>
                        {customer.customer_group || '-'}
                      </Badge>
                    </div>

                    {/* Email */}
                    <p className="text-xs text-horizon-accent truncate">
                      {customer.email}
                    </p>

                    {/* Business Type */}
                    <p className="text-xs text-horizon-accent">
                      {customer.business_type || 'לא צוין'}
                    </p>

                    {/* Action Button */}
                    <Link to={createPageUrl('CustomerManagementNew') + `?clientId=${customer.id}`}>
                      <Button
                        size="sm"
                        className="w-full bg-[#32acc1] hover:bg-[#32acc1]/90 text-white rounded-lg h-8 text-xs"
                      >
                        <Eye className="w-3 h-3 ml-1" />
                        עבור ללקוח
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {expanded && (
        <div className="p-3 border-t border-horizon bg-horizon-dark/50">
          <p className="text-xs text-horizon-accent text-center">
            {customers.length} לקוחות
          </p>
        </div>
      )}
    </div>
  );
}