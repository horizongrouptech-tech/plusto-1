import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * InitialSetup — דף זה כבר לא בשימוש.
 * מפנה אוטומטית ל-PendingApproval או Dashboard.
 */
export default function InitialSetup() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return null;

  // מאושר → Dashboard, לא מאושר → PendingApproval
  if (user?.is_approved_by_admin) {
    return <Navigate to="/Dashboard" replace />;
  }
  return <Navigate to="/PendingApproval" replace />;
}