'use client';

import { useSession } from 'next-auth/react';
import { Role, hasPermission, canAccess } from '@/types/auth';

export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const isLoading = status === 'loading';
  const isAuthenticated = !!user;

  const userRole = user?.role || Role.GUEST;

  const hasRolePermission = (action: string, resource: string) => {
    return hasPermission(userRole, action, resource);
  };

  const hasMinimumRole = (requiredRole: Role) => {
    return canAccess(userRole, requiredRole);
  };

  const isAdmin = userRole === Role.ADMIN;
  const isUser = userRole === Role.USER;
  const isGuest = userRole === Role.GUEST;

  return {
    user,
    isLoading,
    isAuthenticated,
    userRole,
    hasRolePermission,
    hasMinimumRole,
    isAdmin,
    isUser,
    isGuest,
  };
}
