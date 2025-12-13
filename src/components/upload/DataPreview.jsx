
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, X, Edit3, Save, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress"; // Import Progress

export default function DataPreview({ data, filename, onSave, onCancel, isProcessing, saveProgress }) {
  const [editedData, setEditedData] = useState(data.map(item => ({
    ...item,
    // Removed derived field calculations for margin_percentage and monthly_revenue as they are no longer displayed.
  })));
  const [editingIndex, setEditingIndex] = useState(-1);

  const handleEditField = (index, field, value) => {
    const newData = [...editedData];
    newData[index] = { ...newData[index], [field]: value };

    // Removed derived field recalculation logic as these fields are no longer displayed.
    // The original logic for `cost_price`, `selling_price`, `monthly_sales` input types (parseFloat, parseInt)
    // is preserved in the JSX onChange handlers.

    setEditedData(newData);
  };

  const validateData = () => {
    return editedData.every(item =>
      item.name &&
      (item.cost_price > 0 || item.selling_price > 0)
    );
  };

  return (
    <Card className="card-horizon">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl text-horizon-text">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            תצוגה מקדימה - {filename}
          </CardTitle>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            {editedData.length} מוצרים נמצאו
          </Badge>
        </div>
        <p className="text-horizon-accent">
          בדקו את הנתונים ועדכנו במידת הצורך לפני השמירה
        </p>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto max-h-[50vh] rounded-lg">
          <Table>
            <TableHeader className="bg-horizon-card sticky top-0">
              <TableRow className="border-b-horizon">
                <TableHead className="text-right text-horizon-text">שם מוצר</TableHead>
                <TableHead className="text-right text-horizon-text">עלות</TableHead>
                <TableHead className="text-right text-horizon-text">מחיר</TableHead>
                <TableHead className="text-right text-horizon-text">מכירות</TableHead>
                <TableHead className="text-right text-horizon-text">מלאי</TableHead>
                <TableHead className="text-right text-horizon-text">קטגוריה</TableHead>
                <TableHead className="text-right text-horizon-text">ספק</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedData.slice(0, 100).map((item, index) => ( // Show only first 100 rows for performance
                <TableRow key={index} className="border-b-horizon hover:bg-horizon-card/50">
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={item.name || ''}
                        onChange={(e) => handleEditField(index, 'name', e.target.value)}
                        className="w-full bg-horizon-dark border-horizon text-horizon-text"
                      />
                    ) : (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.cost_price || ''}
                        onChange={(e) => handleEditField(index, 'cost_price', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-horizon-dark border-horizon text-horizon-text"
                      />
                    ) : (
                      <span>₪{item.cost_price?.toLocaleString()}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.selling_price || ''}
                        onChange={(e) => handleEditField(index, 'selling_price', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-horizon-dark border-horizon text-horizon-text"
                      />
                    ) : (
                      <span>₪{item.selling_price?.toLocaleString()}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        min="0"
                        value={item.monthly_sales || ''}
                        onChange={(e) => handleEditField(index, 'monthly_sales', parseInt(e.target.value) || 0)}
                        className="w-20 bg-horizon-dark border-horizon text-horizon-text"
                      />
                    ) : (
                      <span>{item.monthly_sales}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        min="0"
                        value={item.inventory || ''}
                        onChange={(e) => handleEditField(index, 'inventory', parseInt(e.target.value) || 0)}
                        className="w-20 bg-horizon-dark border-horizon text-horizon-text"
                      />
                    ) : (
                      <span>{item.inventory}</span>
                    )}
                  </TableCell>
                   <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={item.category || ''}
                        onChange={(e) => handleEditField(index, 'category', e.target.value)}
                        className="w-28 bg-horizon-dark border-horizon text-horizon-text"
                      />
                    ) : (
                      <span>{item.category}</span>
                    )}
                  </TableCell>
                   <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={item.supplier || ''}
                        onChange={(e) => handleEditField(index, 'supplier', e.target.value)}
                        className="w-28 bg-horizon-dark border-horizon text-horizon-text"
                      />
                    ) : (
                      <span>{item.supplier}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingIndex(editingIndex === index ? -1 : index)}
                    >
                      {editingIndex === index ? (
                        <Save className="w-4 h-4 text-green-500" />
                      ) : (
                        <Edit3 className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {editedData.length > 100 && (
          <p className="text-center text-sm text-horizon-accent mt-4">
            מציג 100 מתוך {editedData.length} מוצרים. כל המוצרים יישמרו.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pt-6">
        {isProcessing && saveProgress !== null && (
          <div className="w-full text-center">
            <Progress value={saveProgress} className="w-full h-3 bg-horizon-card" />
            <p className="text-sm mt-2 text-horizon-accent">
              שומר מוצרים... {Math.round(saveProgress)}%
            </p>
          </div>
        )}
        <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex items-center gap-2 border-horizon text-horizon-accent hover:bg-horizon-card"
            >
              <X className="w-4 h-4" />
              ביטול
            </Button>

            <Button
              onClick={() => onSave(editedData)}
              disabled={isProcessing || !validateData()}
              className="btn-horizon-primary flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isProcessing ? 'שומר...' : `שמור ${editedData.length} מוצרים`}
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
