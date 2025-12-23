import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Search,
  Filter,
  Settings,
  FileText,
  Lightbulb,
  Package,
  TrendingUp,
  Target,
  Truck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function ExperimentalCRM() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('files');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // טעינת משתמש נוכחי
  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // טעינת לקוחות
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['crmCustomers'],
    queryFn: async () => {
      const onboardingRequests = await base44.entities.OnboardingRequest.filter({ is_active: true });
      return onboardingRequests;
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000
  });

  // סינון לקוחות
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // סינון לפי קבוצה
    if (groupFilter !== 'all') {
      filtered = filtered.filter(c => c.customer_group === groupFilter);
    }

    // סינון לפי חיפוש
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.business_name?.toLowerCase().includes(search) ||
        c.full_name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [customers, groupFilter, searchTerm]);

  // בחירה אוטומטית של לקוח ראשון
  useEffect(() => {
    if (filteredCustomers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(filteredCustomers[0]);
    }
  }, [filteredCustomers]);

  const tabs = [
    { id: 'files', label: 'קבצים', icon: FileText },
    { id: 'recommendations', label: 'המלצות', icon: Lightbulb },
    { id: 'catalog', label: 'קטלוג', icon: Package },
    { id: 'forecast', label: 'תוכנית עסקית', icon: TrendingUp },
    { id: 'goals', label: 'יעדים', icon: Target },
    { id: 'suppliers', label: 'ספקים', icon: Truck },
    { id: 'cashflow', label: 'תזרים', icon: BarChart3 }
  ];

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-horizon-dark">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-horizon-dark flex flex-col overflow-hidden" dir="rtl">
      {/* כותרת עליונה */}
      <div className="bg-horizon-card border-b border-horizon p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-horizon-text">דף ניסיון - CRM מנהלי כספים</h1>
        <Badge className="bg-purple-500 text-white">גרסת ניסיון</Badge>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* פאנל לקוחות - ימין */}
        {showRightPanel && (
          <div className="w-80 bg-horizon-card border-l border-horizon flex flex-col">
            {/* חיפוש וסינון */}
            <div className="p-4 border-b border-horizon space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש לקוח..."
                  className="pr-10 bg-horizon-dark border-horizon text-horizon-text"
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
                  className={groupFilter === 'A' ? 'bg-[#32acc1] text-white' : 'border-horizon text-horizon-accent'}
                >
                  קבוצה A
                </Button>
                <Button
                  size="sm"
                  variant={groupFilter === 'B' ? 'default' : 'outline'}
                  onClick={() => setGroupFilter('B')}
                  className={groupFilter === 'B' ? 'bg-[#fc9f67] text-white' : 'border-horizon text-horizon-accent'}
                >
                  קבוצה B
                </Button>
              </div>
            </div>

            {/* רשימת לקוחות */}
            <ScrollArea className="flex-1">
              {isLoadingCustomers ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedCustomer?.id === customer.id
                          ? 'bg-horizon-primary text-white'
                          : 'bg-horizon-dark hover:bg-horizon-card/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`font-semibold text-sm ${
                            selectedCustomer?.id === customer.id ? 'text-white' : 'text-horizon-text'
                          }`}>
                            {customer.business_name || customer.full_name}
                          </h4>
                          <p className={`text-xs ${
                            selectedCustomer?.id === customer.id ? 'text-white/80' : 'text-horizon-accent'
                          }`}>
                            {customer.full_name}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-xs ${
                              customer.customer_group === 'A'
                                ? 'bg-[#32acc1] text-white'
                                : customer.customer_group === 'B'
                                ? 'bg-[#fc9f67] text-white'
                                : 'bg-gray-500 text-white'
                            }`}
                          >
                            {customer.customer_group || '-'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-6 w-6 p-0 ${
                              selectedCustomer?.id === customer.id ? 'text-white' : 'text-horizon-accent'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // פתיחת הגדרות לקוח
                            }}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* כפתור כיווץ/הרחבה - ימין */}
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="w-6 bg-horizon-card border-l border-horizon hover:bg-horizon-primary/20 flex items-center justify-center transition-colors"
        >
          {showRightPanel ? <ChevronRight className="w-4 h-4 text-horizon-accent" /> : <ChevronLeft className="w-4 h-4 text-horizon-accent" />}
        </button>

        {/* אזור עבודה מרכזי */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedCustomer ? (
            <>
              {/* טאבים */}
              <div className="bg-horizon-card border-b border-horizon p-3">
                <div className="flex gap-2 overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        size="sm"
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                          activeTab === tab.id
                            ? 'bg-horizon-primary text-white'
                            : 'text-horizon-accent hover:text-horizon-text'
                        } flex items-center gap-2`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* תוכן הטאב */}
              <div className="flex-1 overflow-auto p-6">
                {activeTab === 'files' && (
                  <Card className="card-horizon">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">קבצים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-horizon-accent">אזור קבצים - בפיתוח</p>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'recommendations' && (
                  <Card className="card-horizon">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">המלצות</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-horizon-accent">אזור המלצות - בפיתוח</p>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'catalog' && (
                  <Card className="card-horizon">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">קטלוג מוצרים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-horizon-accent">קטלוג מוצרים - בפיתוח</p>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'forecast' && (
                  <Card className="card-horizon">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">תוכנית עסקית</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-horizon-accent">תוכנית עסקית - בפיתוח</p>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'goals' && (
                  <Card className="card-horizon">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">יעדים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-horizon-accent">יעדים - בפיתוח</p>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'suppliers' && (
                  <Card className="card-horizon">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">ספקים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-horizon-accent">ספקים - בפיתוח</p>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'cashflow' && (
                  <Card className="card-horizon">
                    <CardHeader>
                      <CardTitle className="text-horizon-text">תזרים מזומנים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-horizon-accent">תזרים מזומנים - בפיתוח</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
                <p className="text-horizon-accent">בחר לקוח מהרשימה</p>
              </div>
            </div>
          )}
        </div>

        {/* כפתור כיווץ/הרחבה - שמאל */}
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className="w-6 bg-horizon-card border-r border-horizon hover:bg-horizon-primary/20 flex items-center justify-center transition-colors"
        >
          {showLeftPanel ? <ChevronLeft className="w-4 h-4 text-horizon-accent" /> : <ChevronRight className="w-4 h-4 text-horizon-accent" />}
        </button>

        {/* פאנל משימות - שמאל */}
        {showLeftPanel && (
          <div className="w-80 bg-horizon-card border-r border-horizon flex flex-col">
            <div className="p-4 border-b border-horizon">
              <h3 className="font-semibold text-horizon-text mb-3">משימות</h3>
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full justify-start border-horizon text-horizon-accent">
                  היום
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start border-horizon text-horizon-accent">
                  השבוע
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start border-horizon text-horizon-accent">
                  באיחור
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start border-horizon text-horizon-accent">
                  הושלמו
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="text-center text-horizon-accent text-sm">
                אין משימות להצגה
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}