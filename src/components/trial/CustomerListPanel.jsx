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
  Eye,
  UserCog
} from 'lucide-react';
import ManagerAssignmentModal from '@/components/admin/ManagerAssignmentModal';

export default function CustomerListPanel({
  customers,
  selectedCustomer,
  onSelectCustomer,
  customerFilter,
  onFilterChange,
  onOpenSettings,
  onOpenOverview,
  onCollapse,
  isLoading,
  currentUser
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showManagerModal, setShowManagerModal] = React.useState(false);

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
    <>
      <div className="flex flex-col h-full" dir="rtl">
        {/* Header */}
        <div className="p-4 border-b border-horizon">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-horizon-text flex items-center gap-2 text-right">
              <Users className="w-5 h-5 text-horizon-primary" />
              לקוחות
            </h2>
            <div className="flex items-center gap-1">
              {(currentUser?.role === 'admin' || currentUser?.department_manager_role === 'department_manager') && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowManagerModal(true)}
                  className="text-horizon-primary hover:bg-horizon-primary/10 h-8 w-8"
                  title="שיוך מנהלי כספים"
                >
                  <UserCog className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onCollapse}
                className="text-horizon-accent hover:text-horizon-text h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
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
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-horizon-primary/20 border-horizon-primary shadow-md'
                      : 'hover:bg-horizon-dark border-transparent hover:border-horizon'
                  }`}
                  onClick={() => onSelectCustomer(customer)}
                >
                  <div className="space-y-2" dir="rtl">
                    {/* שורה ראשונה: שם העסק + Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-horizon-text text-base flex-1">
                        {customer.business_name || 'ללא שם עסק'}
                      </p>
                      <Badge className={`text-xs flex-shrink-0 ${groupColors[customer.customer_group] || 'bg-gray-500/20 text-gray-400'}`}>
                        {customer.customer_group || '-'}
                      </Badge>
                    </div>
                    
                    {/* שורה שנייה: שם המנהל + כפתורים */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-horizon-accent truncate flex-1">
                        {customer.full_name}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {customer.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              const whatsappUrl = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                            className="h-7 w-7 text-white bg-green-500 hover:bg-green-600 rounded-full shadow-lg transition-all hover:scale-110"
                            title="שלח וואטסאפ"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenOverview();
                          }}
                          className="h-7 w-7 text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg transition-all hover:scale-110"
                          title="לחץ לסקירה מהירה"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
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

      <ManagerAssignmentModal
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        currentUser={currentUser}
      />
    </>
  );
}