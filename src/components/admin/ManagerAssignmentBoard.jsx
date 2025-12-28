import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  UserCog,
  Search,
  Filter,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserPlus,
  Save
} from 'lucide-react';

export default function ManagerAssignmentBoard({ 
  customers = [], 
  financialManagers = [], 
  onAssignmentChange,
  currentUser 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [bulkAssignManager, setBulkAssignManager] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // סינון לקוחות
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = 
        customer.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesManager = 
        managerFilter === 'all' ||
        (managerFilter === 'unassigned' && !customer.assigned_financial_manager_email) ||
        customer.assigned_financial_manager_email === managerFilter;

      const matchesGroup = 
        groupFilter === 'all' || 
        customer.customer_group === groupFilter;

      return matchesSearch && matchesManager && matchesGroup;
    });
  }, [customers, searchTerm, managerFilter, groupFilter]);

  // חישוב סטטיסטיקות
  const stats = useMemo(() => {
    const managerStats = {};
    let unassigned = 0;

    customers.forEach((customer) => {
      const managerEmail = customer.assigned_financial_manager_email;
      if (!managerEmail) {
        unassigned++;
      } else {
        if (!managerStats[managerEmail]) {
          const manager = financialManagers.find(m => m.email === managerEmail);
          managerStats[managerEmail] = {
            name: manager?.full_name || managerEmail,
            count: 0
          };
        }
        managerStats[managerEmail].count++;
      }
    });

    return { managerStats, unassigned };
  }, [customers, financialManagers]);

  // בחירת/ביטול בחירה של לקוח
  const toggleCustomerSelection = (customerId) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  // שיוך מרובה
  const handleBulkAssign = async () => {
    if (selectedCustomers.length === 0 || !bulkAssignManager) {
      alert('יש לבחור לקוחות ומנהל כספים');
      return;
    }

    setIsSaving(true);
    try {
      for (const customerId of selectedCustomers) {
        await onAssignmentChange(customerId, bulkAssignManager);
      }
      setSelectedCustomers([]);
      setBulkAssignManager('');
      alert(`${selectedCustomers.length} לקוחות שוייכו בהצלחה!`);
    } catch (error) {
      console.error('Error bulk assigning:', error);
      alert('שגיאה בשיוך מרובה');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-horizon-dark p-6" dir="rtl">
      {/* כותרת וסטטיסטיקות */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-horizon-text flex items-center gap-3 mb-4">
          <UserCog className="w-7 h-7 text-horizon-primary" />
          שיוך מנהלי כספים ללקוחות
        </h2>

        {/* סטטיסטיקות */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="card-horizon">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-horizon-accent mb-1">סה"כ לקוחות</p>
              <p className="text-2xl font-bold text-horizon-text">{customers.length}</p>
            </CardContent>
          </Card>

          <Card className="card-horizon">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-horizon-accent mb-1">משוייכים</p>
              <p className="text-2xl font-bold text-green-400">
                {customers.length - stats.unassigned}
              </p>
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
              <UserCog className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-horizon-accent mb-1">מנהלי כספים</p>
              <p className="text-2xl font-bold text-horizon-text">{financialManagers.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* סינון וחיפוש */}
      <Card className="card-horizon mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* חיפוש */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-horizon-accent" />
              <Input
                placeholder="חפש לקוח..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-horizon-card border-horizon text-horizon-text pr-10"
              />
            </div>

            {/* סינון לפי מנהל */}
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="כל המנהלים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המנהלים</SelectItem>
                <SelectItem value="unassigned">ללא שיוך</SelectItem>
                {financialManagers.map((manager) => (
                  <SelectItem key={manager.email} value={manager.email}>
                    {manager.full_name || manager.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* סינון לפי קבוצה */}
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="כל הקבוצות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקבוצות</SelectItem>
                <SelectItem value="A">קבוצה A</SelectItem>
                <SelectItem value="B">קבוצה B</SelectItem>
                <SelectItem value="C">קבוצה C</SelectItem>
              </SelectContent>
            </Select>

            {/* שיוך מרובה */}
            <Button
              onClick={handleBulkAssign}
              disabled={selectedCustomers.length === 0 || !bulkAssignManager || isSaving}
              className="btn-horizon-primary"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 ml-2" />
              )}
              שייך נבחרים ({selectedCustomers.length})
            </Button>
          </div>

          {/* שורת שיוך מרובה */}
          {selectedCustomers.length > 0 && (
            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <Label className="text-horizon-text mb-2 block">בחר מנהל לשיוך מרובה:</Label>
              <Select value={bulkAssignManager} onValueChange={setBulkAssignManager}>
                <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="בחר מנהל כספים..." />
                </SelectTrigger>
                <SelectContent>
                  {financialManagers.map((manager) => (
                    <SelectItem key={manager.email} value={manager.email}>
                      {manager.full_name || manager.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* טבלת לקוחות */}
      <Card className="card-horizon flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle className="text-horizon-text">
            ניהול שיוכים ({filteredCustomers.length} לקוחות)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <Table dir="rtl">
            <TableHeader className="sticky top-0 bg-horizon-card z-10">
              <TableRow>
                <TableHead className="text-right w-12">
                  <Checkbox
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCustomers(filteredCustomers.map(c => c.id));
                      } else {
                        setSelectedCustomers([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="text-right">שם עסק</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">קבוצה</TableHead>
                <TableHead className="text-right">מנהל כספים נוכחי</TableHead>
                <TableHead className="text-right">שיוך חדש</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const currentManager = financialManagers.find(
                  m => m.email === customer.assigned_financial_manager_email
                );

                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => toggleCustomerSelection(customer.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {customer.business_name || 'ללא שם'}
                    </TableCell>
                    <TableCell className="text-right text-horizon-accent">
                      {customer.email}
                    </TableCell>
                    <TableCell className="text-right">
                      {customer.customer_group ? (
                        <Badge className={
                          customer.customer_group === 'A' ? 'bg-[#32acc1] text-white' :
                          customer.customer_group === 'B' ? 'bg-[#fc9f67] text-white' :
                          'bg-gray-500 text-white'
                        }>
                          קבוצה {customer.customer_group}
                        </Badge>
                      ) : (
                        <span className="text-horizon-accent text-sm">לא משויך</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {currentManager ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-horizon-text">
                            {currentManager.full_name || currentManager.email}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-400" />
                          <span className="text-horizon-accent text-sm">ללא שיוך</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={customer.assigned_financial_manager_email || 'unassigned'}
                        onValueChange={(value) => {
                          const finalValue = value === 'unassigned' ? null : value;
                          onAssignmentChange(customer.id, finalValue);
                        }}
                      >
                        <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text w-64">
                          <SelectValue placeholder="בחר מנהל..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">
                            <span className="text-orange-400">הסר שיוך</span>
                          </SelectItem>
                          {financialManagers.map((manager) => (
                            <SelectItem key={manager.email} value={manager.email}>
                              <div className="flex items-center gap-2">
                                <UserCog className="w-4 h-4 text-horizon-primary" />
                                {manager.full_name || manager.email}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
              <p className="text-horizon-accent">לא נמצאו לקוחות תואמים</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* סטטיסטיקות מנהלים בתחתית */}
      <Card className="card-horizon mt-4">
        <CardHeader>
          <CardTitle className="text-horizon-text text-sm">פילוח לקוחות לפי מנהל</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(stats.managerStats).map(([email, data]) => (
              <div key={email} className="bg-horizon-card/30 p-3 rounded-lg border border-horizon">
                <p className="text-sm font-medium text-horizon-text truncate">
                  {data.name}
                </p>
                <p className="text-lg font-bold text-horizon-primary">
                  {data.count} לקוחות
                </p>
              </div>
            ))}
            {stats.unassigned > 0 && (
              <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/30">
                <p className="text-sm font-medium text-orange-400">ללא שיוך</p>
                <p className="text-lg font-bold text-orange-400">
                  {stats.unassigned} לקוחות
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}