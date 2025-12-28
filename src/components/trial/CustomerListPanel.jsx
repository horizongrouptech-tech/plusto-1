import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight,
  Settings,
  Search,
  Users,
  Loader2,
  Eye
} from 'lucide-react';

export default function CustomerListPanel({
  customers,
  selectedCustomer,
  onSelectCustomer,
  customerFilter,
  onFilterChange,
  onOpenSettings,
  onOpenOverview,
  onCollapse,
  isLoading
}) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.business_name?.toLowerCase().includes(term) ||
      c.full_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const groupColors = {
    'A': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'B': 'bg-green-500/20 text-green-400 border-green-500/30',
    'C': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-horizon">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-horizon-text flex items-center gap-2">
            <Users className="w-5 h-5 text-horizon-primary" />
            לקוחות
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className="text-horizon-accent hover:text-horizon-text h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* חיפוש */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
          <Input
            placeholder="חיפוש לקוח..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-horizon-dark border-horizon text-horizon-text placeholder:text-horizon-accent"
          />
        </div>

        {/* סינון קבוצות */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={customerFilter === 'all' ? 'default' : 'outline'}
            onClick={() => onFilterChange('all')}
            className={customerFilter === 'all' 
              ? 'bg-horizon-primary text-white' 
              : 'border-horizon text-horizon-accent hover:text-horizon-text'
            }
          >
            הכל
          </Button>
          <Button
            size="sm"
            variant={customerFilter === 'A' ? 'default' : 'outline'}
            onClick={() => onFilterChange('A')}
            className={customerFilter === 'A' 
              ? 'bg-blue-500 text-white' 
              : 'border-horizon text-horizon-accent hover:text-horizon-text'
            }
          >
            קבוצה A
          </Button>
          <Button
            size="sm"
            variant={customerFilter === 'B' ? 'default' : 'outline'}
            onClick={() => onFilterChange('B')}
            className={customerFilter === 'B' 
              ? 'bg-green-500 text-white' 
              : 'border-horizon text-horizon-accent hover:text-horizon-text'
            }
          >
            קבוצה B
          </Button>
        </div>
      </div>

      {/* רשימת לקוחות */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-horizon-accent">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">אין לקוחות להצגה</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedCustomer?.id === customer.id
                    ? 'bg-horizon-primary/20 border border-horizon-primary'
                    : 'hover:bg-horizon-dark border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-horizon-text truncate">
                      {customer.business_name || 'ללא שם עסק'}
                    </p>
                    <p className="text-sm text-horizon-accent truncate">
                      {customer.full_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    <Badge className={`text-xs ${groupColors[customer.customer_group] || 'bg-gray-500/20 text-gray-400'}`}>
                      {customer.customer_group || '-'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(customer);
                        if (onOpenOverview) onOpenOverview(customer);
                      }}
                      className="h-8 w-8 text-white bg-horizon-primary hover:bg-horizon-primary/80 rounded-full shadow-md transition-all hover:scale-110"
                      title="סקירה כללית"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer - סה"כ לקוחות */}
      <div className="p-3 border-t border-horizon bg-horizon-dark/50">
        <p className="text-sm text-horizon-accent text-center">
          {filteredCustomers.length} לקוחות
        </p>
      </div>
    </div>
  );
}