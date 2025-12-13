import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Pagination from './Pagination';
import { formatCurrency } from '../utils/currencyFormatter';
import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown, PackagePlus, BarChart3, ListChecks } from 'lucide-react';

export default function InventoryReportViewer({ reportData, isOpen, onClose }) {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    if (!isOpen || !reportData) {
        return null;
    }

    const { 
        summary, 
        key_insights = [], 
        actionable_recommendations = [], 
        problematic_products = {}, 
        extracted_products = [] 
    } = reportData;

    const paginatedProducts = extracted_products.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const InsightCard = ({ title, icon: Icon, items }) => (
        <Card className="card-horizon">
            <CardHeader>
                <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                    <Icon className="w-5 h-5 text-horizon-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {items && items.length > 0 ? (
                    <ul className="space-y-2 text-sm text-horizon-accent list-disc pr-5">
                        {items.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                ) : (
                    <p className="text-horizon-accent text-sm">אין נתונים להצגה.</p>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[95vh] flex flex-col bg-horizon-dark border-horizon text-white" dir="rtl">
                <DialogHeader className="pr-6">
                    <DialogTitle className="text-right text-2xl text-horizon-text">ניתוח דוח מלאי</DialogTitle>
                    <DialogDescription className="text-right text-horizon-accent">
                        תובנות ונתונים שחולצו מדוח המלאי שהועלה.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    {/* Insights Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                        {summary?.total_inventory_value && (
                             <Card className="bg-horizon-card/50">
                                <CardContent className="p-4 text-center">
                                    <p className="text-sm text-horizon-accent">שווי מלאי כולל</p>
                                    <p className="text-2xl font-bold text-horizon-primary">{formatCurrency(summary.total_inventory_value)}</p>
                                </CardContent>
                            </Card>
                        )}
                        {summary?.total_products_count && (
                             <Card className="bg-horizon-card/50">
                                <CardContent className="p-4 text-center">
                                    <p className="text-sm text-horizon-accent">סה"כ מוצרים</p>
                                    <p className="text-2xl font-bold text-horizon-text">{summary.total_products_count}</p>
                                </CardContent>
                            </Card>
                        )}
                        {summary?.unique_categories_count && (
                            <Card className="bg-horizon-card/50">
                                <CardContent className="p-4 text-center">
                                    <p className="text-sm text-horizon-accent">קטגוריות</p>
                                    <p className="text-2xl font-bold text-horizon-text">{summary.unique_categories_count}</p>
                                </CardContent>
                            </Card>
                        )}
                        {summary?.average_profit_margin && (
                            <Card className="bg-horizon-card/50">
                                <CardContent className="p-4 text-center">
                                    <p className="text-sm text-horizon-accent">רווחיות ממוצעת</p>
                                    <p className="text-2xl font-bold text-green-400">{summary.average_profit_margin.toFixed(1)}%</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <InsightCard title="תובנות מפתח" icon={Lightbulb} items={key_insights} />
                        <InsightCard title="המלצות לפעולה" icon={ListChecks} items={actionable_recommendations} />
                    </div>
                    
                    {/* Problematic Products Section */}
                    <Card className="card-horizon">
                         <CardHeader>
                            <CardTitle className="text-lg text-horizon-text flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                מוצרים הדורשים תשומת לב
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <InsightCard title="מלאי נמוך" icon={TrendingDown} items={problematic_products.low_stock} />
                           <InsightCard title="מלאי עודף" icon={TrendingUp} items={problematic_products.overstock} />
                           <InsightCard title="מלאי מת" icon={PackagePlus} items={problematic_products.dead_stock} />
                           <InsightCard title="רווחיות שלילית" icon={BarChart3} items={problematic_products.negative_margin} />
                        </CardContent>
                    </Card>

                    {/* Data Table */}
                    <Card className="card-horizon">
                        <CardHeader>
                            <CardTitle className="text-xl text-horizon-text">פירוט המלאי</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-horizon-accent uppercase bg-horizon-card">
                                        <tr>
                                            <th className="px-6 py-3">ברקוד</th>
                                            <th className="px-6 py-3">שם מוצר</th>
                                            <th className="px-6 py-3">ספק</th>
                                            <th className="px-6 py-3">קטגוריה</th>
                                            <th className="px-6 py-3">מחיר עלות</th>
                                            <th className="px-6 py-3">מחיר מכירה</th>
                                            <th className="px-6 py-3">כמות במלאי</th>
                                            <th className="px-6 py-3">ערך מלאי</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedProducts.map((p, index) => (
                                            <tr key={index} className="border-b border-horizon hover:bg-horizon-card/50">
                                                <td className="px-6 py-4">{p.barcode || '-'}</td>
                                                <td className="px-6 py-4 font-medium text-horizon-text">{p.product_name}</td>
                                                <td className="px-6 py-4">{p.supplier || '-'}</td>
                                                <td className="px-6 py-4">{p.category || '-'}</td>
                                                <td className="px-6 py-4">{formatCurrency(p.cost_price)}</td>
                                                <td className="px-6 py-4">{formatCurrency(p.selling_price)}</td>
                                                <td className="px-6 py-4">{p.inventory || '0'}</td>
                                                <td className="px-6 py-4 font-semibold">{formatCurrency(p.inventory_value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {extracted_products.length > ITEMS_PER_PAGE && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={extracted_products.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}