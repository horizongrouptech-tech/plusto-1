import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import DailyTasksDashboard from '@/components/dashboard/DailyTasksDashboard';

export default function TaskManagement() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <DailyTasksDashboard currentUser={user} isAdmin={isAdmin} />
    </div>
  );
}
