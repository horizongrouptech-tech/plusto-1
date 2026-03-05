import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

/**
 * ממפה את השדות הישנים (role + user_type) ל-role אחיד חדש.
 * משמש לתאימות לאחור עם פרופילים שלא עברו migration.
 */
function mapLegacyRole(u) {
  if (!u) return null;
  // role חדש כבר מוגדר — להשתמש בו
  if (u.role && !['user'].includes(u.role)) return u.role;
  // fallback מ-user_type
  if (u.role === 'admin') return 'admin';
  if (u.user_type === 'financial_manager') return 'financial_manager';
  if (u.user_type === 'supplier_user') return 'supplier_user';
  if (u.user_type === 'regular') return 'client';
  return 'client';
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION immediately, so no need for a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // NOTE: Supabase v2 awaits this callback — do NOT await loadUserProfile here.
      // Awaiting would block signInWithPassword from resolving (deadlock).
      if (session?.user) {
        loadUserProfile(session.user.id); // fire-and-forget; has its own try-catch-finally
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    // Safety net: if onAuthStateChange never fires (edge case), unblock after 8s
    const safetyTimer = setTimeout(() => setIsLoadingAuth(false), 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUser(data);
        setIsAuthenticated(true);
      } else {
        console.error('Error loading profile:', error);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/Welcome';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/Welcome';
  };

  const checkAppState = () => ({ isAuthenticated });

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await loadUserProfile(session.user.id);
  };

  // Role helpers — computed מ-user object
  const userRole = useMemo(() => mapLegacyRole(user), [user]);
  const isAdmin = useMemo(() => ['admin', 'super_admin'].includes(userRole), [userRole]);
  // כל משתמש שלא אושר ע"י admin — חוץ מ-admin/super_admin שלא צריכים אישור
  const isPendingApproval = useMemo(() => {
    if (!user) return false;
    if (['admin', 'super_admin'].includes(userRole)) return false;
    return !user.is_approved_by_admin;
  }, [userRole, user?.is_approved_by_admin]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      userRole,
      isAdmin,
      isPendingApproval,
      logout,
      navigateToLogin,
      checkAppState,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
