import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const UsersContext = createContext(null);

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within UsersProvider');
  }
  return context;
};

export const UsersProvider = ({ children }) => {
  // טעינת המשתמש הנוכחי
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 1
  });

  const isAdmin = currentUser?.role === 'admin';
  const isFinancialManager = currentUser?.user_type === 'financial_manager';

  // טעינת כל המשתמשים (מותאם לפי הרשאות)
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allSystemUsers', currentUser?.email, isAdmin, isFinancialManager],
    queryFn: async () => {
      if (!currentUser) return [];

      try {
        if (isAdmin) {
          // אדמין - טוען את כולם מ-User entity
          const users = await base44.entities.User.list();
          return users.filter((u) => u.email && u.full_name);
        } else if (isFinancialManager) {
          // מנהל כספים - טוען דרך OnboardingRequest
          const allOnboardings = await base44.entities.OnboardingRequest.list();
          const myOnboardings = allOnboardings.filter(o => 
            o.assigned_financial_manager_email === currentUser.email ||
            o.additional_assigned_financial_manager_emails?.includes(currentUser.email)
          );
          
          // ממיר ל-user objects
          const usersFromOnboarding = myOnboardings.map(o => ({
            id: o.id,
            email: o.email,
            full_name: o.full_name || o.business_name,
            business_name: o.business_name,
            user_type: 'regular',
            customer_group: o.customer_group,
            business_type: o.business_type
          }));

          return usersFromOnboarding;
        }
        
        return [];
      } catch (error) {
        console.error('Error loading users:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 דקות - cache ארוך
    gcTime: 15 * 60 * 1000,
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // טעינת מנהלי כספים (רק לאדמינים)
  const { data: financialManagers = [] } = useQuery({
    queryKey: ['financialManagers'],
    queryFn: async () => {
      try {
        const managers = await base44.entities.User.filter({
          role: 'user',
          user_type: 'financial_manager'
        });
        return managers;
      } catch (error) {
        console.error('Error loading financial managers:', error);
        return [];
      }
    },
    enabled: isAdmin,
    staleTime: 10 * 60 * 1000,
    retry: 1
  });

  const value = {
    currentUser,
    allUsers,
    financialManagers,
    isLoadingUsers,
    isAdmin,
    isFinancialManager
  };

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
};