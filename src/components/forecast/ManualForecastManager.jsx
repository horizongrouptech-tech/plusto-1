import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Edit, Trash2, Star, ArrowRight, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ManualForecastWizard from "./manual/ManualForecastWizard";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

export default function ManualForecastManager({ 
  customer,
  preSelectedForecastId,
  initialForecastData,
  onBack
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const queryClient = useQueryClient();

  const { data: manualForecasts = [], isLoading } = useQuery({
    queryKey: ['manualForecasts', customer.email],
    queryFn: () => base44.entities.ManualForecast.filter({ customer_email: customer.email }, '-created_date')
  });

  // טיפול בתחזית שנבחרה מהרשימה המאוחדת
  useEffect(() => {
    if (preSelectedForecastId && manualForecasts.length > 0) {
      const forecast = manualForecasts.find(f => f.id === preSelectedForecastId);
      if (forecast) {
        setSelectedForecast(forecast);
      }
    }
  }, [preSelectedForecastId, manualForecasts]);

  // טיפול ביצירת תחזית חדשה עם נתונים ראשוניים
  useEffect(() => {
    if (initialForecastData && !preSelectedForecastId) {
      setIsCreating(true);
    }
  }, [initialForecastData, preSelectedForecastId]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ManualForecast.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['manualForecasts']);
      toast.success('התחזית נמחקה בהצלחה');
    }
  });

  const handleDelete = async (id) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את התחזית?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveComplete = () => {
    setIsCreating(false);
    setSelectedForecast(null);
    queryClient.invalidateQueries(['manualForecasts']);
    
    // אם יש onBack, נחזור לרשימה המאוחדת
    if (onBack) {
      onBack();
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setSelectedForecast(null);
    
    // אם יש onBack, נחזור לרשימה המאוחדת
    if (onBack) {
      onBack();
    }
  };

  const handleExportPDF = async (forecastId) => {
    try {
      const response = await base44.functions.invoke('exportForecastToPdf', {
        forecast_id: forecastId,
        forecast_type: 'manual'
      });
      
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `תחזית_ידנית_${forecastId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('שגיאה בייצוא PDF');
    }
  };

  if (isCreating || selectedForecast) {
    return (
      <ManualForecastWizard
        forecast={selectedForecast}
        customer={customer}
        initialForecastData={initialForecastData}
        onSave={handleSaveComplete}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button 
                  onClick={onBack}
                  variant="outline"
                  className="border-horizon text-horizon-accent"
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                  חזור לרשימה
                </Button>
              )}
              <div>
                <CardTitle className="text-xl text-horizon-text flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-horizon-primary" />
                  תחזיות ידניות מפורטות
                </CardTitle>
                <p className="text-horizon-accent mt-2">
                  צור ונהל תחזיות ידניות מפורטות עבור העסק שלך
                </p>
              </div>
            </div>
            <Button onClick={() => setIsCreating(true)} className="btn-horizon-primary">
              <Plus className="w-5 h-5 ml-2" />
              צור תחזית ידנית חדשה
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card className="card-horizon">
          <CardContent className="p-8 text-center">
            <p className="text-horizon-accent">טוען תחזיות...</p>
          </CardContent>
        </Card>
      ) : manualForecasts.length === 0 ? (
        <Card className="card-horizon">
          <CardContent className="p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
            <h3 className="text-xl font-semibold text-horizon-text mb-2">
              אין תחזיות ידניות
            </h3>
            <p className="text-horizon-accent mb-6">
              התחל בבניית תחזית ידנית מפורטת עבור העסק שלך
            </p>
            <Button onClick={() => setIsCreating(true)} className="btn-horizon-primary">
              <Plus className="w-4 h-4 ml-2" />
              צור תחזית ראשונה
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manualForecasts.map((forecast) => (
            <Card key={forecast.id} className="card-horizon">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-horizon-text text-right flex items-center gap-2">
                      {forecast.forecast_name}
                      {forecast.rating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: forecast.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </CardTitle>
                    <p className="text-sm text-horizon-accent mt-1">
                      שנה: {forecast.forecast_year} | 
                      חודש {forecast.start_month} - {forecast.end_month}
                    </p>
                    <p className="text-xs text-horizon-accent mt-1">
                      נוצרה: {format(new Date(forecast.created_date), 'dd/MM/yyyy', { locale: he })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedForecast(forecast)}
                    variant="outline"
                    className="flex-1 border-horizon-primary text-horizon-primary"
                  >
                    <Edit className="w-4 h-4 ml-2" />
                    ערוך
                  </Button>
                  <Button
                    onClick={() => handleExportPDF(forecast.id)}
                    variant="outline"
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(forecast.id)}
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}