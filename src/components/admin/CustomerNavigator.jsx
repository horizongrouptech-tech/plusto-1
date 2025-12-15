import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Filter, X, Calendar, Building2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUsers } from '../shared/UsersContext';
import { useDebouncedValue } from '../utils/useDebouncedValue';

export default function CustomerNavigator({ 
  allCustomers, 
  currentCustomerId, 
  currentUser,
  isAdmin 
}) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebouncedValue(searchInput, 300); // Debounced search
  const [managerFilter, setManagerFilter] = useState('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  // שימוש ב-Context במקום query מקומי
  const { financialManagers: allFinancialManagers = [] } = useUsers();

  // Get unique financial managers for filter - מעודכן להציג שם במקום email
  const financialManagers = useMemo(() => {
    if (!allCustomers || !allFinancialManagers) return [];
    
    // יצירת מפה של email -> { email, name }
    const managerMap = new Map();
    allFinancialManagers.forEach(manager => {
      const managerName = manager.full_name || manager.business_name || manager.email;
      managerMap.set(manager.email, {
        email: manager.email,
        name: managerName
      });
    });
    
    // איסוף מיילים של מנהלים משויכים
    const assignedEmails = new Set();
    allCustomers.forEach(c => {
      if (c.assigned_financial_manager_email) {
        assignedEmails.add(c.assigned_financial_manager_email);
      }
    });
    
    // החזרת רשימת מנהלים עם שם ומייל (רק מנהלים שיש להם לקוחות משויכים)
    return Array.from(assignedEmails)
      .map(email => managerMap.get(email))
      .filter(manager => manager !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name)); // מיון לפי שם
  }, [allCustomers, allFinancialManagers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!allCustomers) return [];
    
    return allCustomers.filter(customer => {
      const matchesSearch = !searchTerm || 
        (customer.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesManager = managerFilter === 'all' || 
        customer.assigned_financial_manager_email === managerFilter ||
        (managerFilter === 'unassigned' && !customer.assigned_financial_manager_email);
      
      const matchesBusinessType = businessTypeFilter === 'all' || 
        customer.business_type === businessTypeFilter;
      
      const matchesGroup = groupFilter === 'all' || 
        customer.customer_group === groupFilter;
      
      return matchesSearch && matchesManager && matchesBusinessType && matchesGroup;
    });
  }, [allCustomers, searchTerm, managerFilter, businessTypeFilter, groupFilter]);

  

  const currentIndex = filteredCustomers.findIndex(c => c.id === currentCustomerId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < filteredCustomers.length - 1;

  const navigateToCustomer = (customer) => {
    navigate(createPageUrl('CustomerManagement') + `?clientId=${customer.id}&source=${customer.source || 'user'}`);
  };
    // הוסף כאן:
  useEffect(() => {
    if (filteredCustomers.length === 1 && searchTerm) {
      const singleCustomer = filteredCustomers[0];
      // תנאי: נווט רק אם זה לא הלקוח הנוכחי (למנוע לולאה אינסופית)
      if (singleCustomer.id !== currentCustomerId) {
        navigateToCustomer(singleCustomer);
      }
    }
  }, [filteredCustomers, searchTerm, currentCustomerId, navigateToCustomer]);
  const handlePrevious = () => {
    if (hasPrevious) {
      navigateToCustomer(filteredCustomers[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      navigateToCustomer(filteredCustomers[currentIndex + 1]);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setManagerFilter('all');
    setBusinessTypeFilter('all');
    setGroupFilter('all');
  };

  const hasActiveFilters = searchInput || managerFilter !== 'all' || businessTypeFilter !== 'all' || groupFilter !== 'all';

  // פונקציה לקבלת תצוגת קבוצה (no longer used in SelectItem, but kept if used elsewhere or for future)
  const getGroupBadge = (group) => {
    if (!group) return null;
    
    const groupConfig = {
      'A': { label: 'קבוצה A', days: 'א׳+ד׳', color: 'bg-blue-500 text-white' },
      'B': { label: 'קבוצה B', days: 'ב׳+ה׳', color: 'bg-purple-500 text-white' }
    };

    return groupConfig[group] || null;
  };

  return (
    <Card className="card-horizon mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="border-horizon text-horizon-text"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Select 
              value={currentCustomerId} 
              onValueChange={(id) => {
                const customer = filteredCustomers.find(c => c.id === id);
                if (customer) navigateToCustomer(customer);
              }}
            >
              <SelectTrigger className="w-80 bg-horizon-card border-horizon text-horizon-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-horizon-card border-horizon max-h-80" dir="rtl">
                {filteredCustomers.map(customer => {
                  return (
                    <SelectItem 
                      key={customer.id} 
                      value={customer.id}
                      className="text-horizon-text cursor-pointer py-1.5"
                    >
                      <div className="flex items-center gap-2 w-full text-right" dir="rtl">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {customer.business_name || customer.full_name}
                          </div>
                          {customer.business_type && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-horizon-accent">
                              <Building2 className="w-2.5 h-2.5" />
                              <span>{customer.business_type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNext}
              disabled={!hasNext}
              className="border-horizon text-horizon-text"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <span className="text-sm text-horizon-accent whitespace-nowrap">
              {currentIndex + 1} מתוך {filteredCustomers.length}
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
              <Input
                placeholder="חיפוש לקוח..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pr-10 bg-horizon-card border-horizon text-horizon-text"
                dir="rtl"
              />
            </div>

            {isAdmin && (
              <Select value={managerFilter} onValueChange={setManagerFilter}>
                <SelectTrigger className="w-48 bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="מנהל כספים" />
                </SelectTrigger>
                <SelectContent className="bg-horizon-card border-horizon">
                  <SelectItem value="all">כל המנהלים</SelectItem>
                  <SelectItem value="unassigned">ללא מנהל</SelectItem>
                  {financialManagers.map(manager => (
                    <SelectItem key={manager.email} value={manager.email}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
              <SelectTrigger className="w-40 bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="סוג עסק" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-card border-horizon">
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="retail">קמעונאי</SelectItem>
                <SelectItem value="wholesale">סיטונאי</SelectItem>
                <SelectItem value="manufacturing">יצרן</SelectItem>
                <SelectItem value="services">שירותים</SelectItem>
                <SelectItem value="restaurant">מסעדה</SelectItem>
                <SelectItem value="fashion">אופנה</SelectItem>
                <SelectItem value="tech">טכנולוגיה</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>

            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-32 bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="קבוצה" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-card border-horizon">
                <SelectItem value="all">כל הקבוצות</SelectItem>
                <SelectItem value="A">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500 text-white text-xs">A</Badge>
                    <span>א׳ + ד׳</span>
                  </div>
                </SelectItem>
                <SelectItem value="B">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500 text-white text-xs">B</Badge>
                    <span>ב׳ + ה׳</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-horizon-accent"
              >
                <X className="w-4 h-4 ml-2" />
                נקה סינונים
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}