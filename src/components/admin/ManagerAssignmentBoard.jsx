import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ManagerAssignmentBoard({ 
  customers = [], 
  financialManagers = [],
  onAssignmentChange,
  currentUser 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByManager, setFilterByManager] = useState('all');
  const [filterByGroup, setFilterByGroup] = useState('all');
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [savingCustomerId, setSavingCustomerId] = useState(null);

  // סינון לקוחות
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = !searchTerm || 
        customer.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesManager = filterByManager === 'all' || 
        (filterByManager === 'unassigned' && !customer.assigned_financial_manager_email) ||
        customer.assigned_financial_manager_email === filterByManager;

      const matchesGroup = filterByGroup === 'all' || customer.customer_group === filterByGroup;

      return matchesSearch && matchesManager && matchesGroup;
    });
  }, [customers, searchTerm, filterByManager, filterByGroup]);

  // סטטיסטיקות
  const stats = useMemo(() => {
    const byManager = {};
    let unassigned = 0;

    customers.forEach(customer => {
      if (!customer.assigned_financial_manager_email) {
        unassigned++;
      } else {
        const managerEmail = customer.assigned_financial_manager_email;
        byManager[managerEmail] = (byManager[managerEmail] || 0) + 1;
      }
    });

    return { byManager, unassigned, total: customers.length };
  }, [customers]);

  const handleToggleCustomer = (customerId) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleBulkAssign = async (managerEmail) => {
    if (selectedCustomers.size === 0) {
      alert('לא נבחרו לקוחות');
      return;
    }

    setIsSavingBulk(true);
    try {
      for (const customerId of selectedCustomers) {
        const onboardingId = customerId.replace('onboarding_', '');
        await base44.entities.OnboardingRequest.update(onboardingId, {
          assigned_financial_manager_email: managerEmail === 'null' ? null : managerEmail
        });
      }
      
      alert(`${selectedCustomers.size} לקוחות שויכו בהצלחה`);
      setSelectedCustomers(new Set());
      
      if (onAssignmentChange) {
        window.location.reload(); // רענון הדף לעדכון הנתונים
      }
    } catch (error) {
      console.error('Error bulk assigning:', error);
      alert('שגיאה בשיוך מרובה');
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleSingleAssign = async (customerId, managerEmail) => {
    setSavingCustomerId(customerId);
    try {
      const onboardingId = customerId.replace('onboarding_', '');
      await base44.entities.OnboardingRequest.update(onboardingId, {
        assigned_financial_manager_email: managerEmail === 'null' ? null : managerEmail
      });

      if (onAssignmentChange) {
        onAssignmentChange(customerId, managerEmail);
      }
    } catch (error) {
      console.error('Error assigning manager:', error);
      alert('שגיאה בשיוך מנהל');
    } finally {
      setSavingCustomerId(null);
    }
  };

  const getManagerName = (email) => {
    if (!email) return 'לא משויך';
    const manager = financialManagers.find(m => m.email === email);
    return manager?.full_name || email;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* סטטיסטיקות */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-horizon-primary mx-auto mb-2" />
            <p className="text-sm text-horizon-accent mb-1">סה"כ לקוחות</p>
            <p className="text-2xl font-bold text-horizon-text">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-sm text-horizon-accent mb-1">ללא שיוך</p>
            <p className="text-2xl font-bold text-orange-400">{stats.unassigned}</p>
          </CardContent>
        </Card>

        <Card className="card-horizon">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-horizon-accent mb-1">מנהלי כספים פעילים</p>
            <p className="text-2xl font-bold text-green-400">{financialManagers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* חלוקת לקוחות לפי מנהל */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text">חלוקת לקוחות לפי מנהל כספים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {financialManagers.map(manager => (
              <div key={manager.email} className="flex items-center justify-between p-3 bg-horizon-dark/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-horizon-primary rounded-full flex items-center justify-center text-white font-bold">
                    {(stats.byManager[manager.email] || 0)}
                  </div>
                  <div>
                    <p className="font-medium text-horizon-text">{manager.full_name}</p>
                    <p className="text-xs text-horizon-accent">{manager.email}</p>
                  </div>
                </div>
                <Badge className="bg-horizon-primary/20 text-horizon-primary">
                  {stats.byManager[manager.email] || 0} לקוחות
                </Badge>
              </div>
            ))}
            {stats.unassigned > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-10 h-10 text-orange-400" />
                  <p className="font-medium text-orange-400">לקוחות ללא שיוך</p>
                </div>
                <Badge className="bg-orange-500/20 text-orange-400">
                  {stats.unassigned} לקוחות
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* סינונים וחיפוש */}
      <Card className="card-horizon">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* חיפוש */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
              <Input
                placeholder="חיפוש לקוח..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-horizon-dark border-horizon text-horizon-text"
              />
            </div>

            {/* סינון לפי מנהל */}
            <Select value={filterByManager} onValueChange={setFilterByManager}>
              <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                <SelectValue placeholder="כל המנהלים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המנהלים</SelectItem>
                <SelectItem value="unassigned">ללא שיוך</SelectItem>
                {financialManagers.map(manager => (
                  <SelectItem key={manager.email} value={manager.email}>
                    {manager.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* סינון לפי קבוצה */}
            <Select value={filterByGroup} onValueChange={setFilterByGroup}>
              <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                <SelectValue placeholder="כל הקבוצות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקבוצות</SelectItem>
                <SelectItem value="A">קבוצה A</SelectItem>
                <SelectItem value="B">קבוצה B</SelectItem>
                <SelectItem value="C">קבוצה C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* שיוך מרובה */}
      {selectedCustomers.size > 0 && (
        <Card className="card-horizon bg-horizon-primary/10 border-horizon-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-horizon-primary" />
                <span className="font-medium text-horizon-text">
                  {selectedCustomers.size} לקוחות נבחרו
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleBulkAssign} disabled={isSavingBulk}>
                  <SelectTrigger className="w-64 bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue placeholder="בחר מנהל לשיוך..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">הסר שיוך</SelectItem>
                    {financialManagers.map(manager => (
                      <SelectItem key={manager.email} value={manager.email}>
                        {manager.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomers(new Set())}
                  disabled={isSavingBulk}
                  className="border-horizon text-horizon-accent"
                >
                  ביטול בחירה
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* טבלת לקוחות */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Users className="w-5 h-5" />
              שיוך מנהלי כספים ללקוחות
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAll}
              className="border-horizon text-horizon-accent"
            >
              {selectedCustomers.size === filteredCustomers.length ? 'בטל הכל' : 'בחר הכל'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-right"></TableHead>
                  <TableHead className="text-right">שם עסק</TableHead>
                  <TableHead className="text-right">שם מנהל</TableHead>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">קבוצה</TableHead>
                  <TableHead className="text-right">מנהל כספים נוכחי</TableHead>
                  <TableHead className="text-right w-64">שיוך מנהל</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-horizon-accent">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>לא נמצאו לקוחות</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const isSelected = selectedCustomers.has(customer.id);
                    const isSaving = savingCustomerId === customer.id;
                    
                    return (
                      <TableRow key={customer.id} className={isSelected ? 'bg-horizon-primary/10' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleCustomer(customer.id)}
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-right">
                          {customer.business_name || 'ללא שם'}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.full_name || '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm text-horizon-accent">
                          {customer.email}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={
                            customer.customer_group === 'A' ? 'bg-blue-500/20 text-blue-400' :
                            customer.customer_group === 'B' ? 'bg-green-500/20 text-green-400' :
                            'bg-orange-500/20 text-orange-400'
                          }>
                            {customer.customer_group || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.assigned_financial_manager_email ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span className="text-sm text-horizon-text">
                                {getManagerName(customer.assigned_financial_manager_email)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-orange-400">ללא שיוך</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2">
                            <Select
                              value={customer.assigned_financial_manager_email || 'null'}
                              onValueChange={(value) => handleSingleAssign(customer.id, value)}
                              disabled={isSaving}
                            >
                              <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                                <SelectValue placeholder="בחר מנהל..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="null">ללא שיוך</SelectItem>
                                {financialManagers.map(manager => (
                                  <SelectItem key={manager.email} value={manager.email}>
                                    {manager.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-horizon-primary" />}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* סיכום */}
      <div className="text-center text-sm text-horizon-accent">
        מוצג {filteredCustomers.length} מתוך {customers.length} לקוחות
      </div>
    </div>
  );

  function getManagerName(email) {
    const manager = financialManagers.find(m => m.email === email);
    return manager?.full_name || email;
  }
}