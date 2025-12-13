import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Users } from "lucide-react";
import { Supplier } from "@/entities/Supplier";
import { Lead } from "@/entities/Lead";
import { LeadCommission } from "@/entities/LeadCommission";
import AddSupplierModal from "../shared/AddSupplierModal";
import EditSupplierModal from '../shared/EditSupplierModal';
import AssignSupplierUserModal from './AssignSupplierUserModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatCurrency = (value) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(value || 0);

export default function SupplierPartnershipManager({ currentUser }) {
    const [suppliers, setSuppliers] = useState([]);
    const [leads, setLeads] = useState([]);
    const [commissions, setCommissions] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [assigningUserSupplier, setAssigningUserSupplier] = useState(null);
    const [activeTab, setActiveTab] = useState("suppliers");


    const loadData = async () => {
        setIsLoading(true);
        try {
            const [allSuppliers, allLeads, allCommissions] = await Promise.all([
                Supplier.filter({ is_active: true }),
                Lead.list(),
                LeadCommission.list()
            ]);

            const leadsBySupplier = allLeads.reduce((acc, lead) => {
                acc[lead.supplier_id] = acc[lead.supplier_id] || [];
                acc[lead.supplier_id].push(lead);
                return acc;
            }, {});

            const suppliersWithLeadData = allSuppliers.map(supplier => {
                const supplierLeads = leadsBySupplier[supplier.id] || [];
                const contactedLeads = supplierLeads.filter(l => l.status !== 'new').length;
                return {
                    ...supplier,
                    leadsCount: supplierLeads.length,
                    responseRate: supplierLeads.length > 0 ? (contactedLeads / supplierLeads.length) * 100 : 0
                };
            });

            setSuppliers(suppliersWithLeadData);
            setLeads(allLeads);
            setCommissions(allCommissions);
        } catch (error) {
            console.error("Error loading suppliers and leads:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ... (keep handleTogglePartner, handleDeleteSupplier)

    const handleTogglePartner = async (supplier) => {
        try {
            await Supplier.update(supplier.id, {
                is_partner_supplier: !supplier.is_partner_supplier,
            });
            loadData();
        } catch (error) {
            console.error("Error toggling partner status:", error);
        }
    };

    const handleDeleteSupplier = async (supplierId) => {
        if (confirm('האם אתה בטוח? פעולה זו תסמן את הספק כלא פעיל.')) {
            try {
                await Supplier.update(supplierId, { is_active: false });
                loadData();
            } catch (error) {
                console.error("Error deactivating supplier:", error);
            }
        }
    };

    const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredCommissions = commissions.filter(c => c.supplier_id.toLowerCase().includes(searchTerm.toLowerCase()));


    if (isLoading) {
        return <div className="text-center p-8">טוען נתונים...</div>;
    }

    return (
        <Card className="card-horizon">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-horizon-text">ניהול ספקים ושותפים</CardTitle>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4 ml-2" /> הוסף ספק
                    </Button>
                </div>
                 <div className="relative mt-4">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                    <Input
                        placeholder="חיפוש..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 bg-horizon-card border-horizon text-horizon-text"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
                    <TabsList className="grid w-full grid-cols-2 bg-horizon-card">
                        <TabsTrigger value="suppliers">ניהול ספקים</TabsTrigger>
                        <TabsTrigger value="commissions">ניהול עמלות</TabsTrigger>
                    </TabsList>
                    <TabsContent value="suppliers">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-horizon-secondary">
                                    <TableHead>שם הספק</TableHead>
                                    <TableHead>קטגוריה</TableHead>
                                    <TableHead>טלפון</TableHead>
                                    <TableHead>לידים שהתקבלו</TableHead>
                                    <TableHead>שיעור תגובה</TableHead>
                                    <TableHead>ספק שותף</TableHead>
                                    <TableHead>שיוך משתמש</TableHead>
                                    <TableHead>פעולות</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSuppliers.map((supplier) => (
                                    <TableRow key={supplier.id} className="border-horizon-secondary">
                                        <TableCell>{supplier.name}</TableCell>
                                        <TableCell><Badge variant="outline">{supplier.category}</Badge></TableCell>
                                        <TableCell>{supplier.phone}</TableCell>
                                        <TableCell>{supplier.leadsCount || 0}</TableCell>
                                        <TableCell>{(supplier.responseRate || 0).toFixed(1)}%</TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={supplier.is_partner_supplier}
                                                onCheckedChange={() => handleTogglePartner(supplier)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => setAssigningUserSupplier(supplier)}>
                                                <Users className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                        <TableCell className="flex gap-2">
                                            <Button variant="outline" size="icon" onClick={() => setEditingSupplier(supplier)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteSupplier(supplier.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="commissions">
                         <Table>
                            <TableHeader>
                                <TableRow className="border-horizon-secondary">
                                    <TableHead>תאריך עסקה</TableHead>
                                    <TableHead>ספק</TableHead>
                                    <TableHead>לקוח</TableHead>
                                    <TableHead>מנהל משויך</TableHead>
                                    <TableHead>סכום עמלה</TableHead>
                                    <TableHead>סטטוס</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCommissions.map((commission) => (
                                    <TableRow key={commission.id} className="border-horizon-secondary">
                                        <TableCell>{new Date(commission.transaction_date).toLocaleDateString('he-IL')}</TableCell>
                                        <TableCell>{suppliers.find(s => s.id === commission.supplier_id)?.name || 'לא ידוע'}</TableCell>
                                        <TableCell>{commission.customer_email}</TableCell>
                                        <TableCell>{commission.assigned_manager_email}</TableCell>
                                        <TableCell>{formatCurrency(commission.commission_amount)}</TableCell>
                                        <TableCell>
                                            <Badge variant={commission.status === 'paid' ? 'success' : 'secondary'}>
                                                {commission.status === 'pending' ? 'ממתין' : 'שולם'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>

            {showAddModal && <AddSupplierModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSupplierAdded={loadData} currentUser={currentUser} />}
            {editingSupplier && <EditSupplierModal isOpen={!!editingSupplier} onClose={() => setEditingSupplier(null)} onSupplierUpdated={loadData} supplier={editingSupplier} />}
            {assigningUserSupplier && <AssignSupplierUserModal isOpen={!!assigningUserSupplier} onClose={() => setAssigningUserSupplier(null)} supplier={assigningUserSupplier} />}
        </Card>
    );
}