import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { formatCurrency } from './manual/utils/numberFormatter';
import ProjectForecastWizard from './ProjectForecastWizard';
import { toast } from "sonner";

export default function ProjectForecastManager({ customer }) {
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['projectForecasts', customer.email],
    queryFn: () => base44.entities.ProjectForecast.filter({ customer_email: customer.email }, '-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectForecast.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectForecasts']);
      toast.success('תחזית הפרויקט נמחקה בהצלחה');
    }
  });

  const handleEdit = (forecast) => {
    setSelectedForecast(forecast);
    setIsEditing(true);
  };

  const handleDelete = (id) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את תחזית הפרויקט?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = () => {
    queryClient.invalidateQueries(['projectForecasts']);
    setIsEditing(false);
    setSelectedForecast(null);
  };

  if (isEditing) {
    return (
      <ProjectForecastWizard
        customer={customer}
        forecast={selectedForecast}
        onSave={handleSave}
        onCancel={() => {
          setIsEditing(false);
          setSelectedForecast(null);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-horizon-primary" />
          <p className="text-horizon-accent">טוען תחזיות פרויקטים...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Package className="w-6 h-6 text-horizon-primary" />
              תחזיות פרויקטים
            </CardTitle>
            <Button
              onClick={() => {
                setSelectedForecast(null);
                setIsEditing(true);
              }}
              className="btn-horizon-primary"
            >
              <Plus className="w-4 h-4 ml-2" />
              יצירת תחזית פרויקט
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {forecasts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-horizon-accent mb-4" />
              <h3 className="text-lg font-medium text-horizon-text mb-2">אין תחזיות פרויקטים</h3>
              <p className="text-sm text-horizon-accent mb-6">
                צור תחזית פרויקט חדשה לתמחור מדויק של פרויקטי בנייה וקבלנות
              </p>
              <Button
                onClick={() => {
                  setSelectedForecast(null);
                  setIsEditing(true);
                }}
                className="btn-horizon-primary"
              >
                <Plus className="w-4 h-4 ml-2" />
                יצירת תחזית ראשונה
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {forecasts.map((forecast) => (
                <Card key={forecast.id} className="bg-horizon-card border-horizon hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-horizon-text">
                            {forecast.project_name}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {forecast.forecast_year}
                          </Badge>
                          {forecast.status === 'draft' && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                              טיוטה
                            </Badge>
                          )}
                        </div>
                        
                        {forecast.project_description && (
                          <p className="text-sm text-horizon-accent mb-4 line-clamp-2">
                            {forecast.project_description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-xs text-horizon-accent">מוצרים</div>
                            <div className="text-sm font-medium text-horizon-text">
                              {forecast.products?.length || 0} פריטים
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-horizon-accent">עובדים</div>
                            <div className="text-sm font-medium text-horizon-text">
                              {forecast.labor_costs?.num_workers || 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-horizon-accent">רווח</div>
                            <div className="text-sm font-medium text-green-600">
                              {forecast.desired_margin_percentage}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-horizon-accent">מחיר סופי</div>
                            <div className="text-lg font-bold text-horizon-primary">
                              {formatCurrency(forecast.calculated?.final_price || 0)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mr-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(forecast)}
                          className="text-horizon-primary hover:bg-horizon-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(forecast.id)}
                          className="text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}