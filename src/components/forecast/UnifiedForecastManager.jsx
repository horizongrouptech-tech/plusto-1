import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, Bot, Edit3, Star, Calendar, Loader2, Filter, Trash2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

import ForecastTypeSelectionModal from './ForecastTypeSelectionModal';
import BusinessForecastManager from './BusinessForecastManager';
import ManualForecastManager from './ManualForecastManager';
import ProjectForecastManager from './ProjectForecastManager';
import DuplicateForecastModal from './DuplicateForecastModal';

export default function UnifiedForecastManager({ customer }) {
  const [showTypeSelectionModal, setShowTypeSelectionModal] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [forecastType, setForecastType] = useState(null); // 'automatic' or 'manual'
  const [initialForecastData, setInitialForecastData] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [forecastToDuplicate, setForecastToDuplicate] = useState(null);
  
  // סינון
  const [filterType, setFilterType] = useState('all'); // 'all', 'automatic', 'manual'
  const [filterYear, setFilterYear] = useState('all');

  const queryClient = useQueryClient();

  // טעינת תחזיות אוטומטיות
  const { data: automaticForecasts = [], isLoading: isLoadingAutomatic } = useQuery({
    queryKey: ['businessForecasts', customer.email],
    queryFn: () => base44.entities.BusinessForecast.filter({ customer_email: customer.email }, '-created_date'),
    enabled: !!customer?.email
  });

  // טעינת תחזיות ידניות
  const { data: manualForecasts = [], isLoading: isLoadingManual } = useQuery({
    queryKey: ['manualForecasts', customer.email],
    queryFn: () => base44.entities.ManualForecast.filter({ customer_email: customer.email }, '-created_date'),
    enabled: !!customer?.email
  });

  // טעינת תחזיות פרויקטים
  const { data: projectForecasts = [], isLoading: isLoadingProject } = useQuery({
    queryKey: ['projectForecasts', customer.email],
    queryFn: () => base44.entities.ProjectForecast.filter({ customer_email: customer.email }, '-created_date'),
    enabled: !!customer?.email
  });

  // איחוד התחזיות לרשימה אחת
  const allForecasts = [
    ...automaticForecasts.map(f => ({ ...f, type: 'automatic', source: 'AI' })),
    ...manualForecasts.map(f => ({ ...f, type: 'manual', source: 'ידני' })),
    ...projectForecasts.map(f => ({ ...f, type: 'project', source: 'פרויקט' }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // סינון התחזיות
  const filteredForecasts = allForecasts.filter(forecast => {
    const typeMatch = filterType === 'all' || forecast.type === filterType;
    const yearMatch = filterYear === 'all' || forecast.forecast_year?.toString() === filterYear;
    return typeMatch && yearMatch;
  });

  // שנים ייחודיות לסינון
  const uniqueYears = [...new Set(allForecasts.map(f => f.forecast_year).filter(Boolean))].sort((a, b) => b - a);

  const isLoading = isLoadingAutomatic || isLoadingManual || isLoadingProject;

  // פונקציה לבחירת תחזית קיימת
  const handleSelectForecast = (forecast) => {
    setSelectedForecast(forecast);
    setForecastType(forecast.type);
    setInitialForecastData(null); // אין צורך ב-initialData כשבוחרים תחזית קיימת
  };

  // פונקציה לחזרה לרשימה
  const handleBackToList = () => {
    setSelectedForecast(null);
    setForecastType(null);
    setInitialForecastData(null);
    
    // רענון הנתונים
    queryClient.invalidateQueries(['businessForecasts', customer.email]);
    queryClient.invalidateQueries(['manualForecasts', customer.email]);
  };

  // פונקציה למחיקת תחזית
  const handleDeleteForecast = async (forecast) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את התחזית "${forecast.forecast_name}"?`)) {
      return;
    }

    try {
    if (forecast.type === 'automatic') {
      await base44.entities.BusinessForecast.delete(forecast.id);
    } else if (forecast.type === 'manual') {
      await base44.entities.ManualForecast.delete(forecast.id);
    } else if (forecast.type === 'project') {
      await base44.entities.ProjectForecast.delete(forecast.id);
    }

    // רענון הנתונים
    queryClient.invalidateQueries(['businessForecasts', customer.email]);
    queryClient.invalidateQueries(['manualForecasts', customer.email]);
    queryClient.invalidateQueries(['projectForecasts', customer.email]);
      
      alert('התחזית נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting forecast:', error);
      alert('שגיאה במחיקת התחזית');
    }
  };

  // פונקציה חדשה - טיפול בשכפול תחזית
  const handleDuplicateForecast = (forecast) => {
    setForecastToDuplicate(forecast);
    setShowDuplicateModal(true);
  };

  const handleDuplicateSuccess = (newForecast) => {
    // רענון נתונים
    queryClient.invalidateQueries(['businessForecasts', customer.email]);
    queryClient.invalidateQueries(['manualForecasts', customer.email]);
    
    // סגור את מודאל השכפול
    setShowDuplicateModal(false);
    setForecastToDuplicate(null);
    
    // עבור לעריכת התחזית החדשה
    let duplicatedForecastWithType;
    if ('is_system_generated' in newForecast && newForecast.is_system_generated === true) {
        duplicatedForecastWithType = { ...newForecast, type: 'automatic', source: 'AI' };
    } else {
        duplicatedForecastWithType = { ...newForecast, type: 'manual', source: 'ידני' };
    }
    handleSelectForecast(duplicatedForecastWithType);
  };

  // פונקציה לבחירת תחזית אוטומטית חדשה
  const handleSelectAutomatic = (forecastData) => {
    setInitialForecastData(forecastData);
    setForecastType('automatic');
    setSelectedForecast(null);
    setShowTypeSelectionModal(false);
  };

  // פונקציה לבחירת תחזית ידנית חדשה
  const handleSelectManual = (forecastData) => {
    setInitialForecastData(forecastData);
    setForecastType('manual');
    setSelectedForecast(null);
    setShowTypeSelectionModal(false);
  };

  // פונקציה לבחירת תחזית פרויקט חדשה
  const handleSelectProject = (forecastData) => {
    setInitialForecastData(forecastData);
    setForecastType('project');
    setSelectedForecast(null);
    setShowTypeSelectionModal(false);
  };

  // אם נבחרה תחזית או נבחר סוג תחזית חדש, הצג את הממשק הספציפי
  if (forecastType === 'automatic') {
    return (
      <BusinessForecastManager
        customer={customer}
        selectedForecastId={selectedForecast?.id}
        initialForecastData={initialForecastData}
        onBack={handleBackToList}
      />
    );
  }

  if (forecastType === 'manual') {
    return (
      <ManualForecastManager
        customer={customer}
        preSelectedForecastId={selectedForecast?.id}
        initialForecastData={initialForecastData}
        onBack={handleBackToList}
      />
    );
  }

  if (forecastType === 'project') {
    return (
      <ProjectForecastManager
        customer={customer}
        onBack={handleBackToList}
      />
    );
  }

  // תצוגת הרשימה המאוחדת
  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת וכפתור יצירה */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl text-horizon-text flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-horizon-primary" />
                תחזיות עסקיות
              </CardTitle>
              <p className="text-horizon-accent mt-2">
                נהל את כל התחזיות העסקיות שלך - אוטומטיות וידניות
              </p>
            </div>
            <Button 
              onClick={() => setShowTypeSelectionModal(true)}
              className="btn-horizon-primary"
            >
              <Plus className="w-5 h-5 ml-2" />
              צור תחזית חדשה
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* סינונים */}
      <Card className="card-horizon">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-horizon-accent" />
              <span className="text-sm text-horizon-accent">סינון:</span>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px] bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="סוג תחזית" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="automatic">אוטומטיות (AI)</SelectItem>
                <SelectItem value="manual">ידניות</SelectItem>
                <SelectItem value="project">פרויקטים</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[150px] bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="שנה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל השנים</SelectItem>
                {uniqueYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterType !== 'all' || filterYear !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterType('all');
                  setFilterYear('all');
                }}
                className="text-horizon-accent hover:text-horizon-text"
              >
                נקה סינונים
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* רשימת התחזיות */}
      {isLoading ? (
        <Card className="card-horizon">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-horizon-primary" />
            <p className="text-horizon-accent">טוען תחזיות...</p>
          </CardContent>
        </Card>
      ) : filteredForecasts.length === 0 ? (
        <Card className="card-horizon">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
            <h3 className="text-xl font-semibold text-horizon-text mb-2">
              {allForecasts.length === 0 ? 'אין תחזיות עדיין' : 'לא נמצאו תחזיות מתאימות'}
            </h3>
            <p className="text-horizon-accent mb-6">
              {allForecasts.length === 0 
                ? 'צור את התחזית העסקית הראשונה שלך' 
                : 'נסה לשנות את הסינונים או להוסיף תחזית חדשה'}
            </p>
            <Button 
              onClick={() => setShowTypeSelectionModal(true)}
              className="btn-horizon-primary"
            >
              <Plus className="w-4 h-4 ml-2" />
              צור תחזית ראשונה
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForecasts.map((forecast) => (
            <Card 
              key={`${forecast.type}-${forecast.id}`}
              className="card-horizon cursor-pointer hover:border-horizon-primary/50 transition-all"
              onClick={() => handleSelectForecast(forecast)}
            >
              <CardContent className="p-6">
                {/* כותרת ותגיות */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-horizon-text mb-2 flex items-center gap-2">
                      {forecast.forecast_name}
                      {forecast.rating && (
                        <div className="flex items-center gap-1">
                          {[...Array(forecast.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge 
                        className={
                          forecast.type === 'automatic' 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : forecast.type === 'manual'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        }
                      >
                        {forecast.type === 'automatic' ? (
                          <><Bot className="w-3 h-3 ml-1" /> AI</>
                        ) : forecast.type === 'manual' ? (
                          <><Edit3 className="w-3 h-3 ml-1" /> ידני</>
                        ) : (
                          <>🏗️ פרויקט</>
                        )}
                      </Badge>
                      {forecast.forecast_year && (
                        <Badge variant="outline" className="border-horizon-accent text-horizon-accent flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {forecast.forecast_year}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* פרטים נוספים */}
                <div className="space-y-2 text-sm text-horizon-accent">
                  {forecast.type === 'manual' && forecast.start_month && forecast.end_month && (
                    <div className="flex justify-between">
                      <span>תקופה:</span>
                      <span className="text-horizon-text">
                        חודש {forecast.start_month} - {forecast.end_month}
                      </span>
                    </div>
                  )}
                  {forecast.profit_loss_summary?.net_profit !== undefined && (
                    <div className="flex justify-between">
                      <span>רווח נקי שנתי:</span>
                      <span className="text-green-400 font-semibold">
                        ₪{Math.round(forecast.profit_loss_summary.net_profit).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {forecast.summary?.net_profit !== undefined && (
                    <div className="flex justify-between">
                      <span>רווח נקי:</span>
                      <span className="text-green-400 font-semibold">
                        ₪{Math.round(forecast.summary.net_profit).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-horizon">
                    <span>נוצרה:</span>
                    <span className="text-horizon-text">
                      {format(new Date(forecast.created_date), 'dd/MM/yyyy', { locale: he })}
                    </span>
                  </div>
                </div>

                {/* כפתורי פעולה */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-horizon">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectForecast(forecast);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-horizon-primary text-horizon-primary"
                  >
                    <Edit3 className="w-4 h-4 ml-1" />
                    ערוך
                  </Button>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateForecast(forecast);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Copy className="w-4 h-4 ml-1" />
                    שכפל
                  </Button>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteForecast(forecast);
                    }}
                    variant="ghost"
                    size="sm"
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

      {/* מודאל בחירת סוג תחזית */}
      <ForecastTypeSelectionModal
        isOpen={showTypeSelectionModal}
        onClose={() => setShowTypeSelectionModal(false)}
        onSelectAutomatic={handleSelectAutomatic}
        onSelectManual={handleSelectManual}
        onSelectProject={handleSelectProject}
        customer={customer}
      />

      {/* מודאל שכפול תחזית */}
      {showDuplicateModal && forecastToDuplicate && (
        <DuplicateForecastModal
          isOpen={showDuplicateModal}
          onClose={() => {
            setShowDuplicateModal(false);
            setForecastToDuplicate(null);
          }}
          sourceForecast={forecastToDuplicate}
          customer={customer}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </div>
  );
}