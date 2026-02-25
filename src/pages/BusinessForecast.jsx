import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import UnifiedForecastManager from '@/components/forecast/UnifiedForecastManager';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function BusinessForecast() {
  const { user: currentUser, isLoadingAuth: isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="טוען נתוני משתמש..." />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-horizon-dark flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-horizon-text mb-4">שגיאה בטעינת המשתמש</h2>
          <p className="text-horizon-accent">נא להתחבר מחדש למערכת</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-6">
      <div className="max-w-7xl mx-auto">
        <UnifiedForecastManager customer={currentUser} />
      </div>
    </div>
  );
}