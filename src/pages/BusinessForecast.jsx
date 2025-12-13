import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import UnifiedForecastManager from '@/components/forecast/UnifiedForecastManager';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function BusinessForecast() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

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