import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  DollarSign, Plus, Calendar, Truck, Edit3, Trash2, Loader2,
  CreditCard, AlertCircle, Clock, CheckCircle, TrendingUp,
  Package, Calculator
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

// תנאי תשלום נפוצים
const PAYMENT_TERMS = [
  { value: 'immediate', label: 'מזומן', days: 0 },
  { value: 'eom', label: 'שוטף (סוף חודש)', days: 30 },
  { value: 'eom_15', label: 'שוטף + 15', days: 45 },
  { value: 'eom_30', label: 'שוטף + 30', days: 60 },
  { value: 'eom_45', label: 'שוטף + 45', days: 75 },
  { value: 'eom_60', label: 'שוטף + 60', days: 90 },
  { value: 'net_30', label: 'נטו 30', days: 30 },
  { value: 'net_60', label: 'נטו 60', days: 60 },
  { value: 'custom', label: 'מותאם אישית', days: null }
];

export default function SupplierPaymentsManager({ supplier, customer, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('payments');
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    due_date: '',
    invoice_number: '',
    notes: '',
    status: 'pending'
  });
  const [orderForm, setOrderForm] = useState({
    amount: '',
    order_date: new Date().toISOString().split('T')[0],
    description: '',
    expected_delivery: '',
    notes: ''
  });

  // טעינת תשלומי ספק
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['supplierPayments', supplier?.id, customer?.email],
    queryFn: async () => {
      if (base44.entities.SupplierPayment) {
        return await base44.entities.SupplierPayment.filter({
          supplier_id: supplier.id,
          customer_email: customer.email
        }, 'due_date');
      }
      
      // fallback
      const goals = await base44.entities.CustomerGoal.filter({
        customer_email: customer.email,
        task_type: 'supplier_payment',
        notes: { $contains: supplier.id }
      });
      
      return goals.map(g => ({
        id: g.id,
        amount: parseFloat(g.description) || 0,
        due_date: g.end_date,
        invoice_number: g.success_metrics,
        status: g.status === 'done' ? 'paid' : 'pending',
        notes: g.notes
      }));
    },
    enabled: isOpen && !!supplier?.id && !!customer?.email
  });

  // טעינת הזמנות ספק
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['supplierOrders', supplier?.id, customer?.email],
    queryFn: async () => {
      if (base44.entities.SupplierOrder) {
        return await base44.entities.SupplierOrder.filter({
          supplier_id: supplier.id,
          customer_email: customer.email
        }, '-order_date');
      }
      
      // fallback
      const goals = await base44.entities.CustomerGoal.filter({
        customer_email: customer.email,
        task_type: 'supplier_order',
        notes: { $contains: supplier.id }
      });
      
      return goals.map(g => ({
        id: g.id,
        amount: parseFloat(g.description) || 0,
        order_date: g.start_date,
        description: g.name,
        expected_delivery: g.end_date,
        status: g.status,
        notes: g.notes
      }));
    },
    enabled: isOpen && !!supplier?.id && !!customer?.email
  });

  // חישוב חוב פתוח
  const openDebt = useMemo(() => {
    return payments
      .filter(p => p.status !== 'paid')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [payments]);

  // חישוב תשלומים צפויים לחודש הקרוב
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const nextMonth = addDays(today, 30);
    
    return payments.filter(p => {
      if (p.status === 'paid') return false;
      const dueDate = new Date(p.due_date);
      return dueDate >= today && dueDate <= nextMonth;
    });
  }, [payments]);

  // חישוב תאריך תשלום לפי תנאי תשלום
  const calculateDueDate = (orderDate, paymentTerms) => {
    const term = PAYMENT_TERMS.find(t => t.value === paymentTerms);
    if (!term || term.days === null) return null;
    return format(addDays(new Date(orderDate), term.days), 'yyyy-MM-dd');
  };

  // יצירת תשלום חדש
  const handleCreatePayment = async () => {
    if (!paymentForm.amount || !paymentForm.due_date) {
      alert('נא למלא סכום ותאריך תשלום');
      return;
    }

    setIsCreating(true);
    try {
      if (base44.entities.SupplierPayment) {
        await base44.entities.SupplierPayment.create({
          supplier_id: supplier.id,
          customer_email: customer.email,
          ...paymentForm,
          amount: parseFloat(paymentForm.amount)
        });
      } else {
        // fallback
        await base44.entities.CustomerGoal.create({
          customer_email: customer.email,
          name: `תשלום לספק - ${supplier.name}`,
          task_type: 'supplier_payment',
          description: paymentForm.amount.toString(),
          end_date: paymentForm.due_date,
          success_metrics: paymentForm.invoice_number,
          notes: `${supplier.id}|${paymentForm.notes}`,
          status: 'open',
          is_active: true
        });
      }
      
      queryClient.invalidateQueries(['supplierPayments', supplier.id, customer.email]);
      setShowNewPaymentModal(false);
      setPaymentForm({ amount: '', due_date: '', invoice_number: '', notes: '', status: 'pending' });
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('שגיאה ביצירת תשלום');
    } finally {
      setIsCreating(false);
    }
  };

  // יצירת הזמנה חדשה
  const handleCreateOrder = async () => {
    if (!orderForm.amount || !orderForm.description) {
      alert('נא למלא סכום ותיאור הזמנה');
      return;
    }

    setIsCreating(true);
    try {
      // חישוב תאריך תשלום לפי תנאי ספק
      const dueDate = calculateDueDate(orderForm.order_date, supplier.payment_terms || 'eom_30');
      
      if (base44.entities.SupplierOrder) {
        await base44.entities.SupplierOrder.create({
          supplier_id: supplier.id,
          customer_email: customer.email,
          ...orderForm,
          amount: parseFloat(orderForm.amount),
          status: 'pending'
        });
      } else {
        // fallback
        await base44.entities.CustomerGoal.create({
          customer_email: customer.email,
          name: orderForm.description,
          task_type: 'supplier_order',
          description: orderForm.amount.toString(),
          start_date: orderForm.order_date,
          end_date: orderForm.expected_delivery || dueDate,
          notes: `${supplier.id}|${orderForm.notes}`,
          status: 'open',
          is_active: true
        });
      }
      
      // יצירת תשלום אוטומטית אם יש תאריך
      if (dueDate) {
        if (base44.entities.SupplierPayment) {
          await base44.entities.SupplierPayment.create({
            supplier_id: supplier.id,
            customer_email: customer.email,
            amount: parseFloat(orderForm.amount),
            due_date: dueDate,
            notes: `הזמנה: ${orderForm.description}`,
            status: 'pending'
          });
        }
      }
      
      queryClient.invalidateQueries(['supplierOrders', supplier.id, customer.email]);
      queryClient.invalidateQueries(['supplierPayments', supplier.id, customer.email]);
      setShowNewOrderModal(false);
      setOrderForm({ amount: '', order_date: new Date().toISOString().split('T')[0], description: '', expected_delivery: '', notes: '' });
    } catch (error) {
      console.error('Error creating order:', error);
      alert('שגיאה ביצירת הזמנה');
    } finally {
      setIsCreating(false);
    }
  };

  // עדכון סטטוס תשלום
  const handleMarkAsPaid = async (payment) => {
    try {
      if (base44.entities.SupplierPayment) {
        await base44.entities.SupplierPayment.update(payment.id, { 
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        });
      } else {
        await base44.entities.CustomerGoal.update(payment.id, { status: 'done' });
      }
      queryClient.invalidateQueries(['supplierPayments', supplier.id, customer.email]);
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('שגיאה בעדכון התשלום');
    }
  };

  const getPaymentStatusBadge = (payment) => {
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);
    
    if (payment.status === 'paid') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">שולם</Badge>;
    }
    if (daysUntilDue < 0) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">באיחור</Badge>;
    }
    if (daysUntilDue <= 7) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">קרוב</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">ממתין</Badge>;
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-horizon-text flex items-center gap-2">
            <Truck className="w-5 h-5 text-horizon-primary" />
            ניהול תשלומים והזמנות - {supplier.name}
          </DialogTitle>
        </DialogHeader>

        {/* כרטיסי סיכום */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="card-horizon bg-gradient-to-l from-red-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">חוב פתוח</p>
                  <p className="text-2xl font-bold text-red-400">₪{openDebt.toLocaleString()}</p>
                </div>
                <CreditCard className="w-8 h-8 text-red-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-horizon bg-gradient-to-l from-yellow-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">תשלומים ב-30 יום</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    ₪{upcomingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString()}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-horizon bg-gradient-to-l from-blue-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-horizon-accent">תנאי תשלום</p>
                  <p className="text-lg font-bold text-blue-400">
                    {PAYMENT_TERMS.find(t => t.value === supplier.payment_terms)?.label || 'שוטף + 30'}
                  </p>
                </div>
                <Calculator className="w-8 h-8 text-blue-400/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* טאבים */}
        <div className="flex gap-2 border-b border-horizon pb-2">
          <Button
            variant={activeTab === 'payments' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('payments')}
            className={activeTab === 'payments' ? 'bg-horizon-primary text-white' : 'text-horizon-accent'}
          >
            <DollarSign className="w-4 h-4 ml-2" />
            תשלומים ({payments.length})
          </Button>
          <Button
            variant={activeTab === 'orders' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('orders')}
            className={activeTab === 'orders' ? 'bg-horizon-primary text-white' : 'text-horizon-accent'}
          >
            <Package className="w-4 h-4 ml-2" />
            הזמנות ({orders.length})
          </Button>
        </div>

        {/* תוכן */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowNewPaymentModal(true)} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                תשלום חדש
              </Button>
            </div>

            {isLoadingPayments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-horizon-accent">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>אין תשלומים רשומים</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <Card key={payment.id} className="bg-horizon-card border-horizon">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-horizon-text">
                            ₪{parseFloat(payment.amount).toLocaleString()}
                          </div>
                          {getPaymentStatusBadge(payment)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-horizon-accent">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(payment.due_date), 'dd/MM/yyyy')}
                          </span>
                          {payment.invoice_number && (
                            <span>חשבונית: {payment.invoice_number}</span>
                          )}
                          {payment.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPaid(payment)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 ml-1" />
                              סמן כשולם
                            </Button>
                          )}
                        </div>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-horizon-accent mt-2">{payment.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowNewOrderModal(true)} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                הזמנה חדשה
              </Button>
            </div>

            {isLoadingOrders ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-horizon-accent">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>אין הזמנות רשומות</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <Card key={order.id} className="bg-horizon-card border-horizon">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-horizon-text">{order.description}</h4>
                          <p className="text-2xl font-bold text-horizon-primary mt-1">
                            ₪{parseFloat(order.amount).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-sm text-horizon-accent text-left">
                          <p className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            הזמנה: {format(new Date(order.order_date), 'dd/MM/yyyy')}
                          </p>
                          {order.expected_delivery && (
                            <p className="flex items-center gap-1 mt-1">
                              <Truck className="w-4 h-4" />
                              אספקה: {format(new Date(order.expected_delivery), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* מודל תשלום חדש */}
        <Dialog open={showNewPaymentModal} onOpenChange={setShowNewPaymentModal}>
          <DialogContent className="bg-horizon-dark border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-horizon-text">תשלום חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">סכום *</label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0"
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">תאריך תשלום *</label>
                <Input
                  type="date"
                  value={paymentForm.due_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">מספר חשבונית</label>
                <Input
                  value={paymentForm.invoice_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, invoice_number: e.target.value })}
                  placeholder="אופציונלי"
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">הערות</label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewPaymentModal(false)} className="border-horizon text-horizon-text">
                ביטול
              </Button>
              <Button onClick={handleCreatePayment} disabled={isCreating} className="btn-horizon-primary">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'צור תשלום'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* מודל הזמנה חדשה */}
        <Dialog open={showNewOrderModal} onOpenChange={setShowNewOrderModal}>
          <DialogContent className="bg-horizon-dark border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-horizon-text">הזמנה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">תיאור ההזמנה *</label>
                <Input
                  value={orderForm.description}
                  onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                  placeholder="לדוגמה: סחורה חודשית"
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">סכום *</label>
                <Input
                  type="number"
                  value={orderForm.amount}
                  onChange={(e) => setOrderForm({ ...orderForm, amount: e.target.value })}
                  placeholder="0"
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-horizon-accent text-sm mb-2 block">תאריך הזמנה</label>
                  <Input
                    type="date"
                    value={orderForm.order_date}
                    onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>
                <div>
                  <label className="text-horizon-accent text-sm mb-2 block">תאריך אספקה צפוי</label>
                  <Input
                    type="date"
                    value={orderForm.expected_delivery}
                    onChange={(e) => setOrderForm({ ...orderForm, expected_delivery: e.target.value })}
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>
              </div>
              <div>
                <label className="text-horizon-accent text-sm mb-2 block">הערות</label>
                <Textarea
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  rows={2}
                />
              </div>
              <div className="bg-horizon-card/50 rounded-lg p-3">
                <p className="text-sm text-horizon-accent">
                  💡 תאריך התשלום יחושב אוטומטית לפי תנאי הספק: {' '}
                  <strong className="text-horizon-text">
                    {PAYMENT_TERMS.find(t => t.value === supplier.payment_terms)?.label || 'שוטף + 30'}
                  </strong>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewOrderModal(false)} className="border-horizon text-horizon-text">
                ביטול
              </Button>
              <Button onClick={handleCreateOrder} disabled={isCreating} className="btn-horizon-primary">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'צור הזמנה'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
