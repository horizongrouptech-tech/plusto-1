import React, { useState, useEffect, useCallback } from 'react';
import { Catalog } from '@/entities/Catalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Eye, PlusCircle, AlertTriangle } from 'lucide-react';
import { deleteEntireCatalog } from '@/functions/deleteEntireCatalog';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

import { toast } from "sonner";
export default function CatalogManager({ customerId }) {
    const [catalogs, setCatalogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const [deletingCatalogId, setDeletingCatalogId] = useState(null);
    const [deletionProgress, setDeletionProgress] = useState({ processed: 0, total: 0, message: '' });

    const loadCatalogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const customerCatalogs = await Catalog.filter({ created_by: customerId }, '-created_date');
            setCatalogs(customerCatalogs);
        } catch (err) {
            console.error("Error loading catalogs:", err);
            setError("Failed to load catalogs for this customer.");
        } finally {
            setIsLoading(false);
        }
    }, [customerId]);

    useEffect(() => {
        loadCatalogs();
    }, [loadCatalogs]);

    const handleViewCatalog = (catalogId) => {
        navigate(createPageUrl('ProductCatalog', { catalogId }));
    };

    const handleDeleteCatalog = async (catalog) => {
        if (!confirm(`האם אתה בטוח שברצונך למחוק את הקטלוג "${catalog.catalog_name}" וכל המוצרים שבו? לא ניתן לשחזר פעולה זו.`)) {
            return;
        }

        setDeletingCatalogId(catalog.id);
        const totalProducts = catalog.product_count || 0;
        setDeletionProgress({ processed: 0, total: totalProducts, message: `מתחיל מחיקה של ${totalProducts} מוצרים...` });
        
        let isFinished = false;
        let processedCount = 0;
        const customer_email = catalog.created_by;

        if (totalProducts === 0) {
            isFinished = false; 
        }

        while (!isFinished) {
            try {
                const { data } = await deleteEntireCatalog({ customer_email, catalog_id: catalog.id });
                
                if (data.success) {
                    processedCount += data.deleted_count;
                    setDeletionProgress(prev => ({ ...prev, processed: processedCount, message: `מוחק... (${processedCount} / ${prev.total})` }));
                    isFinished = data.is_finished;

                    if (isFinished) {
                        break;
                    }

                } else {
                    throw new Error(data.error || 'A batch deletion failed.');
                }
            } catch (err) {
                console.error("Error during iterative catalog deletion:", err);
                toast.error(`שגיאה במהלך המחיקה: ${err.message}. אנא נסה שנית.`);
                isFinished = true; // עצירת הלולאה במקרה של שגיאה
            }
        }
        
        if (deletionProgress.processed < totalProducts && !isFinished) {
             toast.error(`המחיקה הופסקה עקב שגיאה. ${deletionProgress.processed} מוצרים נמחקו. ייתכן שהקטלוג נמחק חלקית.`);
        } else {
            toast.success(`הקטלוג "${catalog.catalog_name}" נמחק בהצלחה.`);
        }
        
        setDeletingCatalogId(null);
        loadCatalogs(); 
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ready': return <Badge variant="default" className="bg-green-600">מוכן</Badge>;
            case 'generating': return <Badge variant="secondary" className="bg-blue-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/>בתהליך יצירה</Badge>;
            case 'failed': return <Badge variant="destructive">נכשל</Badge>;
            case 'draft':
            default: return <Badge variant="outline">טיוטה</Badge>;
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-horizon-primary" /></div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-400"><AlertTriangle className="mx-auto w-8 h-8 mb-2" />{error}</div>;
    }

    return (
        <Card className="card-horizon mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>ניהול קטלוגים</CardTitle>
                <Button onClick={() => navigate(createPageUrl('ProductCatalog'))}><PlusCircle className="w-4 h-4 mr-2" /> קטלוג חדש</Button>
            </CardHeader>
            <CardContent>
                {catalogs.length === 0 ? (
                    <div className="text-center text-horizon-accent py-8">
                        <p>לא נמצאו קטלוגים עבור לקוח זה.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">שם קטלוג</TableHead>
                                    <TableHead className="text-right">סטטוס</TableHead>
                                    <TableHead className="text-right">מוצרים</TableHead>
                                    <TableHead className="text-right">נוצר בתאריך</TableHead>
                                    <TableHead className="text-right">שיטת יצירה</TableHead>
                                    <TableHead className="text-right">פעולות</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {catalogs.map((catalog) => (
                                    <TableRow key={catalog.id}>
                                        <TableCell className="font-medium">{catalog.catalog_name}</TableCell>
                                        <TableCell>{getStatusBadge(catalog.status)}</TableCell>
                                        <TableCell>{catalog.product_count || 0}</TableCell>
                                        <TableCell>{format(new Date(catalog.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell>{catalog.creation_method}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleViewCatalog(catalog.id)}><Eye className="w-4 h-4 mr-2" /> צפה</Button>
                                                {deletingCatalogId === catalog.id ? (
                                                    <div className="flex items-center gap-2 w-32">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <div className="w-full">
                                                            <p className="text-xs text-center mb-1">{`${deletionProgress.processed} / ${deletionProgress.total}`}</p>
                                                            <Progress value={(deletionProgress.total > 0 ? (deletionProgress.processed / deletionProgress.total) : 0) * 100} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteCatalog(catalog)}
                                                        disabled={deletingCatalogId !== null}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        מחק
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}