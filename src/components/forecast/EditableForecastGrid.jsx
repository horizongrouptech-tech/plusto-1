
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
    Edit, 
    Save, 
    X, 
    Plus, 
    Trash2, 
    Search,
    Filter
} from "lucide-react";



import { toast } from "sonner";
import { ManualForecastRow, ManualForecastVersion, User } from '@/api/entities';

export default function EditableForecastGrid({ forecast, sheets, selectedSheet, onSheetChange, rows, onDataChange }) {
    const [editingRowId, setEditingRowId] = useState(null);
    const [editedData, setEditedData] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [filteredRows, setFilteredRows] = useState([]);
    const [isAddingRow, setIsAddingRow] = useState(false);
    const [newRowData, setNewRowData] = useState({});
    const rowsPerPage = 50;

    const filterRows = useCallback(() => {
        let filtered = [...rows];

        if (searchTerm) {
            filtered = filtered.filter(row =>
                row.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(row => row.category === categoryFilter);
        }

        setFilteredRows(filtered);
    }, [rows, searchTerm, categoryFilter]); // Dependencies for useCallback

    useEffect(() => {
        filterRows();
    }, [filterRows]); // Dependency for useEffect

    const categories = [...new Set(rows.map(r => r.category).filter(Boolean))];

    const paginatedRows = filteredRows.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

    const handleEdit = (row) => {
        setEditingRowId(row.id);
        setEditedData({ ...row });
    };

    const handleSave = async (rowId) => {
        try {
            const user = await User.me();
            
            // עדכון השורה
            await ManualForecastRow.update(rowId, editedData);
            
            // יצירת גרסה חדשה
            const existingVersions = await ManualForecastVersion.filter(
                { forecast_id: forecast.id },
                '-version_number',
                1
            );
            const nextVersion = existingVersions.length > 0 
                ? existingVersions[0].version_number + 1 
                : 1;

            await ManualForecastVersion.create({
                forecast_id: forecast.id,
                version_number: nextVersion,
                change_summary: `עדכון שורה ${rowId}`,
                changed_by: user.email,
                snapshot_data: { 
                    row_id: rowId,
                    before: rows.find(r => r.id === rowId),
                    after: editedData
                }
            });

            setEditingRowId(null);
            setEditedData({});
            onDataChange();
            toast.success('השורה עודכנה בהצלחה');
        } catch (error) {
            console.error("Error saving row:", error);
            toast.error('שגיאה בשמירת השורה');
        }
    };

    const handleCancel = () => {
        setEditingRowId(null);
        setEditedData({});
    };

    const handleDelete = async (rowId) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק שורה זו?')) return;

        try {
            const user = await User.me();
            const deletedRow = rows.find(r => r.id === rowId);
            
            await ManualForecastRow.delete(rowId);

            // יצירת גרסה
            const existingVersions = await ManualForecastVersion.filter(
                { forecast_id: forecast.id },
                '-version_number',
                1
            );
            const nextVersion = existingVersions.length > 0 
                ? existingVersions[0].version_number + 1 
                : 1;

            await ManualForecastVersion.create({
                forecast_id: forecast.id,
                version_number: nextVersion,
                change_summary: `מחיקת שורה ${rowId}`,
                changed_by: user.email,
                snapshot_data: { 
                    action: 'delete',
                    deleted_row: deletedRow
                }
            });

            onDataChange();
            toast.success('השורה נמחקה בהצלחה');
        } catch (error) {
            console.error("Error deleting row:", error);
            toast.error('שגיאה במחיקת השורה');
        }
    };

    const handleAddRow = () => {
        setIsAddingRow(true);
        setNewRowData({
            forecast_id: forecast.id,
            sheet_id: selectedSheet.id,
            row_index: rows.length,
            period_month: '',
            category: '',
            subcategory: '',
            revenue: 0,
            expenses: 0,
            profit: 0,
            currency: 'ILS',
            notes: ''
        });
    };

    const handleSaveNewRow = async () => {
        try {
            const user = await User.me();
            
            // חישוב רווח אוטומטי
            const calculatedProfit = (newRowData.revenue || 0) - (newRowData.expenses || 0);
            const finalRowData = {
                ...newRowData,
                profit: calculatedProfit
            };

            const createdRow = await ManualForecastRow.create(finalRowData);

            // יצירת גרסה
            const existingVersions = await ManualForecastVersion.filter(
                { forecast_id: forecast.id },
                '-version_number',
                1
            );
            const nextVersion = existingVersions.length > 0 
                ? existingVersions[0].version_number + 1 
                : 1;

            await ManualForecastVersion.create({
                forecast_id: forecast.id,
                version_number: nextVersion,
                change_summary: 'הוספת שורה חדשה',
                changed_by: user.email,
                snapshot_data: { 
                    action: 'create',
                    new_row: createdRow
                }
            });

            setIsAddingRow(false);
            setNewRowData({});
            onDataChange();
            toast.success('השורה נוספה בהצלחה');
        } catch (error) {
            console.error("Error adding row:", error);
            toast.error('שגיאה בהוספת השורה');
        }
    };

    const handleCancelNewRow = () => {
        setIsAddingRow(false);
        setNewRowData({});
    };

    const formatCurrency = (value) => {
        if (!value) return '₪0';
        return `₪${Number(value).toLocaleString('he-IL')}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('he-IL', { year: 'numeric', month: 'short' });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="space-y-4">
            {/* כלי סינון וחיפוש */}
            <Card className="card-horizon">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <div className="flex gap-3 items-center flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-horizon-accent w-4 h-4" />
                                <Input
                                    placeholder="חפש לפי קטגוריה..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pr-10 bg-horizon-card border-horizon text-horizon-text"
                                />
                            </div>

                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-48 bg-horizon-card border-horizon text-horizon-text">
                                    <Filter className="w-4 h-4 ml-2" />
                                    <SelectValue placeholder="כל הקטגוריות" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">כל הקטגוריות</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {sheets.length > 1 && (
                                <Select value={selectedSheet?.id} onValueChange={(val) => {
                                    const sheet = sheets.find(s => s.id === val);
                                    onSheetChange(sheet);
                                }}>
                                    <SelectTrigger className="w-48 bg-horizon-card border-horizon text-horizon-text">
                                        <SelectValue placeholder="בחר גיליון" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sheets.map(sheet => (
                                            <SelectItem key={sheet.id} value={sheet.id}>
                                                {sheet.sheet_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-horizon-accent border-horizon">
                                {filteredRows.length} שורות
                            </Badge>
                            <Button
                                onClick={handleAddRow}
                                disabled={isAddingRow}
                                className="btn-horizon-primary"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 ml-2" />
                                הוסף שורה
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* טבלת נתונים */}
            <Card className="card-horizon">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-horizon-card border-b border-horizon">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-horizon-accent">תקופה</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-horizon-accent">קטגוריה</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-horizon-accent">תת-קטגוריה</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-horizon-accent">הכנסות</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-horizon-accent">הוצאות</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-horizon-accent">רווח</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-horizon-accent">הערות</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-horizon-accent">פעולות</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* שורה חדשה בהוספה */}
                                {isAddingRow && (
                                    <tr className="bg-horizon-primary/10 border-b border-horizon">
                                        <td className="px-4 py-2">
                                            <Input
                                                type="month"
                                                value={newRowData.period_month?.substring(0, 7) || ''}
                                                onChange={(e) => setNewRowData({
                                                    ...newRowData,
                                                    period_month: e.target.value + '-01'
                                                })}
                                                className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                value={newRowData.category || ''}
                                                onChange={(e) => setNewRowData({
                                                    ...newRowData,
                                                    category: e.target.value
                                                })}
                                                className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                placeholder="קטגוריה"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                value={newRowData.subcategory || ''}
                                                onChange={(e) => setNewRowData({
                                                    ...newRowData,
                                                    subcategory: e.target.value
                                                })}
                                                className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                placeholder="תת-קטגוריה"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                type="number"
                                                value={newRowData.revenue || 0}
                                                onChange={(e) => setNewRowData({
                                                    ...newRowData,
                                                    revenue: parseFloat(e.target.value) || 0
                                                })}
                                                className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                type="number"
                                                value={newRowData.expenses || 0}
                                                onChange={(e) => setNewRowData({
                                                    ...newRowData,
                                                    expenses: parseFloat(e.target.value) || 0
                                                })}
                                                className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="text-horizon-accent text-sm">
                                                {formatCurrency((newRowData.revenue || 0) - (newRowData.expenses || 0))}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                value={newRowData.notes || ''}
                                                onChange={(e) => setNewRowData({
                                                    ...newRowData,
                                                    notes: e.target.value
                                                })}
                                                className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                placeholder="הערות"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    size="icon"
                                                    onClick={handleSaveNewRow}
                                                    className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                                >
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    onClick={handleCancelNewRow}
                                                    variant="outline"
                                                    className="h-8 w-8 border-horizon"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {/* שורות קיימות */}
                                {paginatedRows.map(row => (
                                    <tr key={row.id} className="border-b border-horizon hover:bg-horizon-card/50 transition-colors">
                                        {editingRowId === row.id ? (
                                            // מצב עריכה
                                            <>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="month"
                                                        value={editedData.period_month?.substring(0, 7) || ''}
                                                        onChange={(e) => setEditedData({
                                                            ...editedData,
                                                            period_month: e.target.value + '-01'
                                                        })}
                                                        className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        value={editedData.category || ''}
                                                        onChange={(e) => setEditedData({
                                                            ...editedData,
                                                            category: e.target.value
                                                        })}
                                                        className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        value={editedData.subcategory || ''}
                                                        onChange={(e) => setEditedData({
                                                            ...editedData,
                                                            subcategory: e.target.value
                                                        })}
                                                        className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        value={editedData.revenue || 0}
                                                        onChange={(e) => setEditedData({
                                                            ...editedData,
                                                            revenue: parseFloat(e.target.value) || 0
                                                        })}
                                                        className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        value={editedData.expenses || 0}
                                                        onChange={(e) => setEditedData({
                                                            ...editedData,
                                                            expenses: parseFloat(e.target.value) || 0
                                                        })}
                                                        className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className="text-horizon-accent text-sm">
                                                        {formatCurrency((editedData.revenue || 0) - (editedData.expenses || 0))}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        value={editedData.notes || ''}
                                                        onChange={(e) => setEditedData({
                                                            ...editedData,
                                                            notes: e.target.value
                                                        })}
                                                        className="bg-horizon-card border-horizon text-horizon-text text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex gap-2 justify-center">
                                                        <Button
                                                            size="icon"
                                                            onClick={() => handleSave(row.id)}
                                                            className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            onClick={handleCancel}
                                                            variant="outline"
                                                            className="h-8 w-8 border-horizon"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            // מצב תצוגה
                                            <>
                                                <td className="px-4 py-3 text-sm text-horizon-text">
                                                    {formatDate(row.period_month)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-horizon-text">
                                                    {row.category || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-horizon-text">
                                                    {row.subcategory || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-green-400 font-medium">
                                                    {formatCurrency(row.revenue)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-red-400 font-medium">
                                                    {formatCurrency(row.expenses)}
                                                </td>
                                                <td className={`px-4 py-3 text-sm font-bold ${
                                                    (row.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                                }`}>
                                                    {formatCurrency(row.profit)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-horizon-accent">
                                                    {row.notes || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2 justify-center">
                                                        <Button
                                                            size="icon"
                                                            onClick={() => handleEdit(row)}
                                                            variant="ghost"
                                                            className="h-8 w-8 text-horizon-primary hover:bg-horizon-primary/20"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            onClick={() => handleDelete(row.id)}
                                                            variant="ghost"
                                                            className="h-8 w-8 text-red-400 hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* פגינציה */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center px-4 py-3 border-t border-horizon">
                            <div className="text-sm text-horizon-accent">
                                עמוד {currentPage} מתוך {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                    size="sm"
                                    className="border-horizon"
                                >
                                    הקודם
                                </Button>
                                <Button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                    size="sm"
                                    className="border-horizon"
                                >
                                    הבא
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
